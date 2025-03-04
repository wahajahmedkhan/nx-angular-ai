import { Injectable, signal, computed, effect } from '@angular/core';
import { BehaviorSubject, Observable, Subject, catchError, lastValueFrom, of } from 'rxjs';
import { 
  Chat, 
  Message, 
  MessageChunk, 
  FlowWiseRequest, 
  FlowWiseResponse, 
  AgentReasoningStep,
  FlowWiseStreamEvent,
  FlowWiseMetadata
} from '../models/interfaces';
import { ChunkType, MessageRole } from '../models/enums';
import { v4 as uuidv4 } from 'uuid';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';

@Injectable({
  providedIn: 'root',
})
export class ChatService {
  private chats = signal<Chat[]>([]);
  private activeChat = signal<Chat | null>(null);
  private messageChunksSubject = new Subject<MessageChunk>();
  private thinkingSubject = new BehaviorSubject<AgentReasoningStep | null>(null);
  
  // API endpoint
  private readonly FLOWWISE_API_URL = 'http://135.181.181.121:3000/api/v1/prediction/a180e12e-d360-47fd-9fbd-443dcc3a5d1d';
  
  // Observable for message chunks (for streaming responses)
  public messageChunks$ = this.messageChunksSubject.asObservable();
  
  // Observable for thinking steps
  public thinking$ = this.thinkingSubject.asObservable();
  
  // Computed values
  public currentChat = computed(() => this.activeChat());
  public chatHistory = computed(() => this.chats());
  
  constructor(private http: HttpClient) {
    this.loadChatsFromStorage();
    
    // If there are no chats, create a default one
    if (this.chats().length === 0) {
      this.createNewChat();
    } else {
      // Set the most recent chat as active
      this.setActiveChat(this.chats()[0].id);
    }
    
    // Set up an effect to save chats whenever they change
    effect(() => {
      // This will run whenever chats() or activeChat() changes
      const currentChats = this.chats();
      if (currentChats.length > 0) {
        this.saveChatsToStorage();
      }
    });
  }
  
  /**
   * Create a new chat session
   */
  createNewChat(): void {
    const newChat: Chat = {
      id: uuidv4(),
      title: 'New Chat',
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    // Add to chat list
    this.chats.update(chats => [newChat, ...chats]);
    
    // Set as active chat
    this.activeChat.set(newChat);
  }
  
  /**
   * Set the active chat by ID
   */
  setActiveChat(chatId: string): void {
    const chat = this.chats().find(c => c.id === chatId);
    if (chat) {
      this.activeChat.set({...chat}); // Create a new object reference to ensure reactivity
    }
  }
  
  /**
   * Send a message to the FlowWise API
   */
  public sendMessage(content: string): void {
    console.log('Sending message:', content);
    
    if (!content.trim()) return;
    
    // Get current chat
    const chat = this.activeChat();
    
    if (!chat) {
      console.error('No active chat found');
      return;
    }
    
    // Create a new message ID
    const messageId = uuidv4();
    
    // Add user message to chat
    this.addMessageToChat({
      id: uuidv4(),
      role: MessageRole.User,
      content,
      timestamp: new Date()
    });
    
    // Add assistant message (initially empty)
    this.addMessageToChat({
      id: messageId,
      role: MessageRole.Assistant,
      content: '',
      timestamp: new Date(),
      isComplete: false
    });
    
    // Prepare request payload
    const payload: FlowWiseRequest = {
      question: content,
      streaming: true // Enable streaming
    };
    
    // Always include chatId and sessionId if available for conversation continuity
    if (chat.flowChatId) {
      // Use chatId directly in the payload
      payload.chatId = chat.flowChatId;
      console.log('Using existing flowChatId as chatId:', chat.flowChatId);
      
      // Log the number of messages in the current chat for context
      console.log(`Current chat has ${chat.messages.length} messages (including this new one)`);
    } else {
      console.log('Starting new conversation (no flowChatId)');
    }
    
    // Include sessionId if available (for PostgreSQL agent memory)
    if (chat.sessionId) {
      payload.sessionId = chat.sessionId;
      console.log('Using existing sessionId:', chat.sessionId);
    }
    
    // Stream the response
    console.log('Starting streaming request with payload:', JSON.stringify(payload));
    this.streamFlowWiseResponse(payload, messageId);
  }
  
  /**
   * Stream response from FlowWise API using fetch and EventSource
   */
  private async streamFlowWiseResponse(requestPayload: FlowWiseRequest, messageId: string): Promise<void> {
    try {
      console.log('Streaming request payload:', requestPayload);
      const response = await fetch(this.FLOWWISE_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestPayload),
      });
      
      if (!response.ok || !response.body) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      console.log('Got streaming response, processing...');
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = '';
      let sourceDocuments: any[] = [];
      let hasEnded = false;
      let receivedMetadata = false;
      let hasReceivedContent = false;
      
      // Capture requestPayload in this scope for use in event processing
      const originalRequestPayload = { ...requestPayload };
      
      // Process the stream
      const processStream = async () => {
        let done = false;
        
        while (!done) {
          try {
            const { value, done: doneReading } = await reader.read();
            done = doneReading;
            
            if (done) break;
            
            // Decode the chunk and split by lines
            const chunk = decoder.decode(value, { stream: true });
            console.log('Received chunk:', chunk);
            
            // Parse the chunk - Flowise format is message:\ndata:{...}
            const messages = chunk.split('message:');
            
            for (const message of messages) {
              if (!message.trim()) continue;
              
              // Extract data part
              const dataMatch = message.match(/data:(.*?)(?=\n\n|$)/s);
              if (dataMatch && dataMatch[1]) {
                try {
                  // Try to parse the JSON data
                  const jsonData = dataMatch[1].trim();
                  
                  // Check if the JSON is potentially malformed (e.g., truncated)
                  let eventData;
                  try {
                    eventData = JSON.parse(jsonData);
                  } catch (parseError) {
                    console.warn('JSON parse error, attempting to fix malformed JSON:', parseError);
                    
                    // Try to fix common JSON issues
                    // 1. Check for unterminated strings (most common issue)
                    const fixedJson = this.attemptToFixMalformedJson(jsonData);
                    
                    if (fixedJson) {
                      console.log('Attempting to parse fixed JSON');
                      eventData = JSON.parse(fixedJson);
                    } else {
                      // If we can't fix it, rethrow the original error
                      throw parseError;
                    }
                  }
                  
                  console.log('Parsed event:', eventData);
                  
                  // Check if this is a metadata event
                  if (eventData.event === 'metadata') {
                    receivedMetadata = true;
                  }
                  
                  // Process based on event type
                  if (eventData.event === 'token' && typeof eventData.data === 'string') {
                    // This is the actual content
                    accumulatedText = eventData.data; // Replace with full text instead of appending
                    hasReceivedContent = true;
                    
                    // Update the message content
                    this.updateMessage(messageId, accumulatedText);
                    
                    // Send content chunk
                    this.messageChunksSubject.next({
                      type: ChunkType.Content,
                      content: eventData.data,
                      messageId
                    });
                  } 
                  else if (eventData.event === 'start') {
                    // Stream started
                    this.messageChunksSubject.next({
                      type: ChunkType.Start,
                      messageId
                    });
                  }
                  else if (eventData.event === 'end') {
                    // Stream ended
                    hasEnded = true;
                    console.log('Stream ended, marking message as complete');
                    
                    // If we haven't received any content but the stream ended, 
                    // this might be an empty response (like for "what was my last question?")
                    if (!hasReceivedContent && eventData.data === '[DONE]') {
                      console.log('Empty response detected, adding placeholder text');
                      let placeholderText = 'I understand your question, but I don\'t have a specific response for that.';
                      
                      // Special handling for "what was my last question" queries
                      if (originalRequestPayload.question.toLowerCase().includes('what was my last question')) {
                        // Get the actual last question from chat history
                        const currentChat = this.activeChat();
                        if (currentChat && currentChat.messages.length > 2) {
                          // Find the last user message that isn't the current "what was my last question" query
                          const userMessages = currentChat.messages.filter(msg => 
                            msg.role === MessageRole.User && 
                            !msg.content.toLowerCase().includes('what was my last question')
                          );
                          
                          if (userMessages.length > 0) {
                            const lastQuestion = userMessages[userMessages.length - 1].content;
                            placeholderText = `Your last question was: "${lastQuestion}"`;
                            console.log('Found last question:', lastQuestion);
                          } else {
                            placeholderText = "I don't see any previous questions in our conversation history.";
                          }
                        } else {
                          placeholderText = "I don't see any previous questions in our conversation history.";
                        }
                      }
                      
                      accumulatedText = placeholderText;
                      this.updateMessage(messageId, placeholderText);
                      
                      // Send content chunk for the placeholder
                      this.messageChunksSubject.next({
                        type: ChunkType.Content,
                        content: placeholderText,
                        messageId
                      });
                    }
                    
                    // Mark message as complete with final content
                    this.updateMessage(messageId, accumulatedText, true);
                    
                    // Send end event
                    this.messageChunksSubject.next({
                      type: ChunkType.End,
                      messageId
                    });
                    
                    // Check if this is a [DONE] event
                    if (eventData.data === '[DONE]') {
                      console.log('Received [DONE] event, ensuring loading state is reset');
                      
                      // Send an extra end event after a short delay to ensure UI is updated
                      setTimeout(() => {
                        this.messageChunksSubject.next({
                          type: ChunkType.End,
                          messageId
                        });
                      }, 500);
                    }
                  }
                  else if (eventData.event === 'error') {
                    console.error('Stream error:', eventData.data);
                    
                    // Extract the specific error message
                    let errorMessage = 'An error occurred while processing your request.';
                    
                    if (typeof eventData.data === 'string') {
                      // Check for specific error types
                      if (eventData.data.includes('ENOTFOUND')) {
                        errorMessage = 'Unable to connect to the AI service. The server appears to be offline or unreachable. Please try again later.';
                      } else if (eventData.data.includes('timeout')) {
                        errorMessage = 'The request to the AI service timed out. Please try again later.';
                      } else {
                        // Use the original error but make it more user-friendly
                        errorMessage = `AI service error: ${eventData.data.replace(/Error:?\s*/g, '')}`;
                      }
                    }
                    
                    this.messageChunksSubject.next({
                      type: ChunkType.Error,
                      messageId,
                      content: errorMessage
                    });
                    
                    // Mark message as complete with error content
                    this.updateMessage(messageId, errorMessage, true);
                  }
                  else if (eventData.event === 'metadata' && typeof eventData.data === 'object' && eventData.data !== null) {
                    // Store chatId for session continuity if it exists
                    const metadata = eventData.data as FlowWiseMetadata;
                    console.log('Received metadata event:', metadata);
                    
                    // Log the question that was asked to verify context
                    if (metadata.question) {
                      console.log('Question in metadata:', metadata.question);
                    }
                    
                    // Log memory type if available
                    if (metadata.memoryType) {
                      console.log('Memory type:', metadata.memoryType);
                    }
                    
                    // Check if both chatId and sessionId are provided
                    if (metadata.chatId && metadata.sessionId) {
                      console.log('Received both chatId and sessionId from server:', {
                        chatId: metadata.chatId,
                        sessionId: metadata.sessionId
                      });
                      
                      // Log if there's a mismatch between sent chatId and received chatId
                      if (originalRequestPayload.chatId && metadata.chatId !== originalRequestPayload.chatId) {
                        console.warn('ChatId mismatch detected!', {
                          sent: originalRequestPayload.chatId,
                          received: metadata.chatId
                        });
                      }
                      
                      this.activeChat.update(chat => {
                        if (!chat) return null;
                        return {
                          ...chat,
                          flowChatId: metadata.chatId,
                          sessionId: metadata.sessionId
                        };
                      });
                      
                      // Update chats list
                      this.updateChatInList();
                      
                      // Log that we've stored both IDs for future use
                      console.log('Stored chatId and sessionId for future requests:', {
                        chatId: metadata.chatId,
                        sessionId: metadata.sessionId
                      });
                    } 
                    // If only chatId is provided
                    else if (metadata.chatId) {
                      console.log('Received only chatId from server:', metadata.chatId);
                      
                      this.activeChat.update(chat => {
                        if (!chat) return null;
                        return {
                          ...chat,
                          flowChatId: metadata.chatId
                        };
                      });
                      
                      // Update chats list
                      this.updateChatInList();
                      
                      // Log that we've stored the chatId for future use
                      console.log('Stored chatId for future requests:', metadata.chatId);
                    } else {
                      console.warn('No chatId found in metadata event:', metadata);
                    }
                  }
                  else if (eventData.event === 'sourceDocuments' && Array.isArray(eventData.data)) {
                    // Store source documents
                    sourceDocuments = eventData.data;
                    
                    // Send source documents as a message chunk
                    this.messageChunksSubject.next({
                      type: ChunkType.SourceDocuments,
                      content: JSON.stringify(sourceDocuments),
                      messageId
                    });
                    
                    // Add source documents to the message
                    if (accumulatedText && sourceDocuments.length > 0) {
                      const sourceContent = this.formatSourceDocuments(sourceDocuments);
                      const updatedContent = accumulatedText + '\n\n' + sourceContent;
                      this.updateMessage(messageId, updatedContent);
                      accumulatedText = updatedContent;
                    }
                  }
                  else if (eventData.event === 'agentReasoning' && Array.isArray(eventData.data)) {
                    // Process agent reasoning for thinking panel
                    const reasoningSteps = eventData.data as AgentReasoningStep[];
                    if (reasoningSteps.length > 0) {
                      // Process each reasoning step
                      reasoningSteps.forEach((step, index) => {
                        setTimeout(() => {
                          this.thinkingSubject.next(step);
                          
                          // Also send thinking as a message chunk
                          const thinkingContent = this.formatThinkingStep(step);
                          this.messageChunksSubject.next({
                            type: ChunkType.AgentReasoning,
                            content: thinkingContent,
                            messageId
                          });
                        }, index * 800); // Spread them out a bit for visual effect
                      });
                    }
                  }
                  else if (eventData.event === 'nextAgent' && typeof eventData.data === 'string') {
                    // Handle nextAgent event - this indicates which agent is processing next
                    console.log('Next agent:', eventData.data);
                    
                    // Send nextAgent as a message chunk
                    this.messageChunksSubject.next({
                      type: ChunkType.NextAgent,
                      content: eventData.data,
                      messageId
                    });
                    
                    // Optionally update the thinking panel with the next agent
                    this.thinkingSubject.next({
                      agentName: eventData.data,
                      messages: [`Processing with ${eventData.data}...`],
                      nodeId: 'nextAgent'
                    });
                  }
                } catch (error) {
                  console.error('Error processing stream event:', error, dataMatch[1]);
                  
                  // Try to recover by continuing with the next message
                  // Don't let a single parsing error stop the entire stream processing
                  
                  // If we have accumulated text, update the message with what we have so far
                  if (accumulatedText) {
                    this.updateMessage(messageId, accumulatedText);
                  }
                  
                  // If this is a critical error that prevents further processing, send an error message
                  if (hasEnded === false) {
                    this.messageChunksSubject.next({
                      type: ChunkType.Error,
                      messageId,
                      content: 'Error processing response. Please try again.'
                    });
                  }
                }
              }
            }
          } catch (error) {
            console.error('Error processing stream chunk:', error);
            // Handle chunk processing errors
            this.messageChunksSubject.next({
              type: ChunkType.Error,
              messageId,
              content: 'Error processing response from AI service. Please try again.'
            });
            
            this.updateMessage(
              messageId,
              'Error processing response from AI service. Please try again.',
              true
            );
            
            break; // Exit the loop on error
          }
        }
        
        // If we didn't get an end event but the stream is done, send an end event
        if (!hasEnded) {
          console.log('Stream completed without end event, marking message as complete');
          
          // Check for empty response case
          if (!hasReceivedContent) {
            console.log('No content received in the stream, adding placeholder text');
            const placeholderText = 'I received your question but don\'t have a specific response.';
            accumulatedText = placeholderText;
            
            // Send content chunk for the placeholder
            this.messageChunksSubject.next({
              type: ChunkType.Content,
              content: placeholderText,
              messageId
            });
          }
          
          // Mark message as complete
          this.updateMessage(messageId, accumulatedText, true);
          
          // Send end event
          this.messageChunksSubject.next({
            type: ChunkType.End,
            messageId
          });
        }
        
        // Check if we received metadata
        if (!receivedMetadata) {
          console.log('Stream completed without metadata event, sending error');
          this.messageChunksSubject.next({
            type: ChunkType.Error,
            messageId,
            content: 'Failed to receive metadata from AI service. Please try again.'
          });
        } else {
          // Check if we have a chatId stored for this chat
          const currentChat = this.activeChat();
          if (currentChat && !currentChat.flowChatId) {
            console.warn('No chatId was stored from metadata. Conversation context may not be maintained.');
            
            // Generate a fallback chatId if needed
            const fallbackChatId = uuidv4();
            console.log('Generated fallback chatId:', fallbackChatId);
            
            // Store the fallback chatId
            this.activeChat.update(chat => {
              if (!chat) return null;
              return {
                ...chat,
                flowChatId: fallbackChatId
              };
            });
            
            // Update chats list
            this.updateChatInList();
          }
        }
      };
      
      await processStream();
    } catch (error) {
      console.error('Error in streamFlowWiseResponse:', error);
      
      // Create a user-friendly error message
      let errorMessage = 'Unable to connect to the AI service.';
      
      if (error instanceof Error) {
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
          errorMessage = 'Network error: Unable to connect to the AI service. Please check your internet connection and try again.';
        } else if (error.message.includes('timeout')) {
          errorMessage = 'The request to the AI service timed out. Please try again later.';
        } else if (error.message.includes('HTTP error')) {
          errorMessage = `The AI service returned an error (${error.message}). Please try again later.`;
        }
      }
      
      // Send error event
      this.messageChunksSubject.next({
        type: ChunkType.Error,
        messageId,
        content: errorMessage
      });
      
      // Update the message with the error
      this.updateMessage(messageId, errorMessage, true);
    } finally {
      // Always ensure we send an end event to properly reset UI state
      // This is a safety measure in case the error handling above fails
      setTimeout(() => {
        console.log('Final safety check: ensuring end event was sent');
        this.messageChunksSubject.next({
          type: ChunkType.End,
          messageId
        });
      }, 1000);
    }
  }
  
  /**
   * Process a stream event from FlowWise
   */
  private processStreamEvent(event: FlowWiseStreamEvent, messageId: string, currentText: string): void {
    switch (event.event) {
      case 'start':
        // Stream started
        this.messageChunksSubject.next({
          type: ChunkType.Start,
          messageId
        });
        break;
        
      case 'token':
        // Already handled in streamFlowWiseResponse
        break;
        
      case 'error':
        console.error('Stream error:', event.data);
        this.messageChunksSubject.next({
          type: ChunkType.Error,
          messageId,
          content: typeof event.data === 'string' ? event.data : 'An error occurred'
        });
        break;
        
      case 'end':
        // Stream ended
        this.messageChunksSubject.next({
          type: ChunkType.End,
          messageId
        });
        break;
        
      case 'sourceDocuments':
        // Handle source documents if needed
        console.log('Source documents:', event.data);
        break;
        
      case 'usedTools':
        // Handle used tools if needed
        console.log('Used tools:', event.data);
        break;
    }
  }
  
  /**
   * Call the FlowWise API (non-streaming, kept for backward compatibility)
   */
  private async callFlowWiseApi(requestPayload: FlowWiseRequest): Promise<FlowWiseResponse> {
    try {
      return await lastValueFrom(
        this.http.post<FlowWiseResponse>(
          this.FLOWWISE_API_URL,
          requestPayload
        ).pipe(
          catchError((error: HttpErrorResponse) => {
            console.error('API error:', error);
            throw new Error(error.message);
          })
        )
      );
    } catch (error) {
      console.error('Error in API call:', error);
      throw error;
    }
  }
  
  /**
   * Process FlowWise API response (non-streaming, kept for backward compatibility)
   */
  private processFlowWiseResponse(response: FlowWiseResponse, messageId: string): void {
    // Store chatId and sessionId for session continuity
    this.activeChat.update(chat => {
      if (!chat) return null;
      return {
        ...chat,
        flowChatId: response.chatId,
        sessionId: response.sessionId
      };
    });
    
    // Update chats list
    this.updateChatInList();
    
    // Process agent reasoning for thinking panel
    if (response.agentReasoning && response.agentReasoning.length > 0) {
      // Clear previous thinking steps
      this.thinkingSubject.next(null);
      
      // Process each reasoning step
      response.agentReasoning.forEach((step, index) => {
        setTimeout(() => {
          this.thinkingSubject.next(step);
          
          // Also send thinking as a message chunk
          const thinkingContent = this.formatThinkingStep(step);
          this.messageChunksSubject.next({
            type: ChunkType.Thinking,
            content: thinkingContent
          });
        }, index * 800); // Spread them out a bit for visual effect
      });
    }
    
    // Update the message with the response text
    this.simulateTypingEffect(messageId, response.text);
  }
  
  /**
   * Format a thinking step into readable text
   */
  private formatThinkingStep(step: AgentReasoningStep): string {
    if (!step) return '';
    
    let output = '';
    
    // Add agent name if available
    if (step.agentName) {
      output += `**Agent: ${step.agentName}**\n\n`;
    }
    
    // Add messages
    if (Array.isArray(step.messages) && step.messages.length > 0) {
      output += step.messages.join('\n\n');
    }
    
    // Add thought process if available
    if (step.thought) {
      output += `\n\n**Thought Process:**\n${step.thought}`;
    }
    
    // Add action if available
    if (step.action) {
      output += `\n\n**Action:**\n${step.action}`;
    }
    
    // Add observation if available
    if (step.observation) {
      output += `\n\n**Observation:**\n${step.observation}`;
    }
    
    return output;
  }
  
  /**
   * Simulate a typing effect for the response
   */
  private simulateTypingEffect(messageId: string, fullText: string): void {
    // Break the text into chunks to simulate typing
    const chunkSize = 5; // Characters per chunk
    const chunks: string[] = [];
    
    for (let i = 0; i < fullText.length; i += chunkSize) {
      chunks.push(fullText.slice(i, i + chunkSize));
    }
    
    let accumulatedText = '';
    
    // Send content chunks with delays
    chunks.forEach((chunk, index) => {
      setTimeout(() => {
        accumulatedText += chunk;
        
        // Send chunk
        this.messageChunksSubject.next({
          type: ChunkType.Content,
          content: chunk,
          messageId
        });
        
        // Update message in chat
        this.updateMessage(messageId, accumulatedText);
      }, index * 30); // Faster typing speed
    });
    
    // Send end chunk
    setTimeout(() => {
      this.messageChunksSubject.next({
        type: ChunkType.End,
        messageId
      });
      
      // Mark message as complete
      this.updateMessage(messageId, fullText, true);
    }, (chunks.length * 30) + 100);
  }
  
  /**
   * Add a message to the current active chat
   */
  private addMessageToChat(message: Message): void {
    if (!this.activeChat()) return;
    
    this.activeChat.update(chat => {
      if (!chat) return null;
      
      // Update chat with new message
      const updatedChat: Chat = {
        ...chat,
        messages: [...chat.messages, message],
        updatedAt: new Date()
      };
      
      // If this is the first message, set a title based on content
      if (chat.messages.length === 0 && message.role === MessageRole.User) {
        updatedChat.title = this.generateChatTitle(message.content);
      }
      
      return updatedChat;
    });
    
    // Update in chats list
    this.updateChatInList();
  }
  
  /**
   * Update a message's content and completion status
   */
  private updateMessage(messageId: string, content: string, isComplete = false): void {
    console.log(`Updating message ${messageId}, isComplete: ${isComplete}`);
    
    this.activeChat.update(chat => {
      if (!chat) return null;
      
      const updatedMessages = chat.messages.map(message => {
        if (message.id === messageId) {
          // Create a new message object to ensure change detection
          return {
            ...message,
            content,
            isComplete
          };
        }
        return message;
      });
      
      // Return a new chat object to ensure change detection
      return {
        ...chat,
        messages: updatedMessages,
        updatedAt: new Date() // Update the timestamp
      };
    });
    
    // Update chats list
    this.updateChatInList();
  }
  
  /**
   * Update the current chat in the chats list
   */
  private updateChatInList(): void {
    const current = this.activeChat();
    if (!current) return;
    
    this.chats.update(chats => {
      return chats.map(chat => {
        if (chat.id === current.id) {
          return {...current}; // Create a new object reference to ensure reactivity
        }
        return chat;
      });
    });
  }
  
  /**
   * Generate a title for a new chat based on the first message
   */
  private generateChatTitle(content: string): string {
    // Truncate and clean up the content to create a title
    const maxLength = 30;
    if (content.length <= maxLength) {
      return content;
    }
    
    return content.substring(0, maxLength) + '...';
  }
  
  /**
   * Save chats to local storage
   */
  private saveChatsToStorage(): void {
    localStorage.setItem('ai-chat-data', JSON.stringify(this.chats()));
  }
  
  /**
   * Load chats from local storage
   */
  private loadChatsFromStorage(): void {
    const storedChats = localStorage.getItem('ai-chat-data');
    if (storedChats) {
      try {
        const chatData = JSON.parse(storedChats) as Chat[];
        
        // Convert string dates back to Date objects
        const parsedChats = chatData.map(chat => ({
          ...chat,
          createdAt: new Date(chat.createdAt),
          updatedAt: new Date(chat.updatedAt),
          messages: chat.messages.map(msg => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          }))
        }));
        
        this.chats.set(parsedChats);
      } catch (error) {
        console.error('Failed to parse stored chats:', error);
      }
    }
  }
  
  /**
   * Delete a chat by ID
   */
  deleteChat(chatId: string): void {
    // Remove from chats list
    this.chats.update(chats => chats.filter(chat => chat.id !== chatId));
    
    // If active chat was deleted, set a new active chat
    if (this.activeChat()?.id === chatId) {
      const firstChat = this.chats()[0];
      this.activeChat.set(firstChat ? {...firstChat} : null); // Create a new object reference
      
      // If no chats left, create a new one
      if (!firstChat) {
        this.createNewChat();
      }
    }
  }
  
  /**
   * Clear all messages from current chat
   */
  clearCurrentChat(): void {
    if (!this.activeChat()) return;
    
    this.activeChat.update(chat => {
      if (!chat) return null;
      
      return {
        ...chat,
        messages: [],
        title: 'New Chat',
        updatedAt: new Date(),
        flowChatId: undefined // Clear FlowWise chatId to start a new conversation
      };
    });
    
    // Update in chats list
    this.updateChatInList();
  }
  
  /**
   * Format source documents into readable text
   */
  private formatSourceDocuments(documents: any[]): string {
    if (!documents || documents.length === 0) {
      return '';
    }
    
    let content = '### Sources\n\n';
    
    documents.forEach((doc, index) => {
      content += `**Source ${index + 1}**\n`;
      
      if (doc.metadata) {
        if (doc.metadata.source) {
          content += `*Source:* ${doc.metadata.source}\n`;
        }
        if (doc.metadata.title) {
          content += `*Title:* ${doc.metadata.title}\n`;
        }
      }
      
      if (doc.pageContent) {
        content += `\n${doc.pageContent}\n\n`;
      }
    });
    
    return content;
  }
  
  /**
   * Attempt to fix malformed JSON that might be truncated or have other issues
   */
  private attemptToFixMalformedJson(jsonData: string): string | null {
    try {
      // First, try to parse it as is - maybe it's actually valid
      JSON.parse(jsonData);
      return jsonData; // If we get here, it's valid
    } catch (error) {
      console.warn('Attempting to fix malformed JSON:', jsonData);
      
      // Common issues to fix:
      let fixedJson = jsonData;
      
      // 1. Check if it ends with a comma (common in truncated arrays)
      if (fixedJson.endsWith(',')) {
        fixedJson = fixedJson + ']';
      }
      
      // 2. Count opening and closing brackets/braces
      const openBraces = (fixedJson.match(/\{/g) || []).length;
      const closeBraces = (fixedJson.match(/\}/g) || []).length;
      const openBrackets = (fixedJson.match(/\[/g) || []).length;
      const closeBrackets = (fixedJson.match(/\]/g) || []).length;
      
      // Add missing closing braces/brackets
      if (openBraces > closeBraces) {
        const missing = openBraces - closeBraces;
        fixedJson += '}'.repeat(missing);
      }
      
      if (openBrackets > closeBrackets) {
        const missing = openBrackets - closeBrackets;
        fixedJson += ']'.repeat(missing);
      }
      
      // 3. Check for unterminated strings (odd number of quotes)
      const quotes = (fixedJson.match(/"/g) || []).length;
      if (quotes % 2 !== 0) {
        fixedJson += '"';
      }
      
      // Try to parse the fixed JSON
      try {
        JSON.parse(fixedJson);
        console.log('Successfully fixed JSON:', fixedJson);
        return fixedJson;
      } catch (e) {
        console.error('Failed to fix JSON:', e);
        return null;
      }
    }
  }
}