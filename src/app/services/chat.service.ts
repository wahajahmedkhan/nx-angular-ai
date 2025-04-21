import { Injectable, signal, computed, effect } from '@angular/core';
import { BehaviorSubject, Subject, catchError, lastValueFrom } from 'rxjs';
import { 
  Chat, 
  Message, 
  MessageChunk, 
  FlowWiseRequest, 
  FlowWiseResponse,
  FlowWiseStreamEvent,
  AgentReasoningStep,
  SourceDocument
} from '../models/chat.interfaces';
import { ChunkType, MessageRole } from '../models/enums';
import { v4 as uuidv4 } from 'uuid';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { environment } from '../../environment';

@Injectable({
  providedIn: 'root',
})
export class ChatService {
  private chats = signal<Chat[]>([]);
  private activeChat = signal<Chat | null>(null);
  private messageChunksSubject = new Subject<MessageChunk>();
  private thinkingSubject = new BehaviorSubject<AgentReasoningStep | null>(null);
  private sourceDocumentsSubject = new BehaviorSubject<SourceDocument[]>([]);
  
  // UI state signals
  private isProcessing = signal<boolean>(false);
  private currentEvent = signal<string | null>(null);
  
  // Buffer for collecting source document events
  private sourceDocumentBuffer = '';
  private isCollectingSourceDocuments = false;
  
  // API endpoint
  private readonly FLOWWISE_API_URL = environment.FLOWWISE_API_URL;
  
  // Observable for message chunks (for streaming responses)
  public messageChunks$ = this.messageChunksSubject.asObservable();
  
  // Observable for thinking steps
  public thinking$ = this.thinkingSubject.asObservable();
  
  // Observable for source documents
  public sourceDocuments$ = this.sourceDocumentsSubject.asObservable();
  
  // Computed values
  public currentChat = computed(() => this.activeChat());
  public chatHistory = computed(() => this.chats());
  
  // UI state computed values
  public isAiThinking = computed(() => this.isProcessing());
  public shouldDisableInput = computed(() => this.isProcessing());
  public currentEventType = computed(() => this.currentEvent());
  
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
      reasoningSteps: [], // Initialize reasoning steps
      sourceDocuments: [] // Initialize source documents
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
      payload.chatId = chat.flowChatId;
      console.log('Using existing flowChatId:', chat.flowChatId);
      
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
  private streamFlowWiseResponse(requestPayload: FlowWiseRequest, messageId: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      try {
        console.log('Starting FlowWise API stream with payload:', requestPayload);
        
        // Set processing state to true
        this.isProcessing.set(true);
        
        // Prepare the request
        fetch(this.FLOWWISE_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestPayload)
        }).then(async (response) => {
          if (!response.ok) {
            const errorText = await response.text();
            console.error('FlowWise API error:', response.status, errorText);
            
            // Update the message with error
            this.updateMessage(
              messageId, 
              `Error: ${response.status} - ${errorText || 'Unknown error'}`, 
              true
            );
            
            // Set processing state to false
            this.isProcessing.set(false);
            
            reject(new Error(`API error: ${response.status}`));
            return;
          }
          
          if (!response.body) {
            console.error('No response body received');
            
            // Update the message with error
            this.updateMessage(messageId, 'Error: No response received', true);
            
            // Set processing state to false
            this.isProcessing.set(false);
            
            reject(new Error('No response body'));
            return;
          }
          
          // Get the reader from the response body
          const reader = response.body.getReader();
          
          // Buffer for collecting JSON data
          let buffer = '';
          
          // Process the stream
          const processStream = async () => {
            try {
              while (true) {
                const { done, value } = await reader.read();
                
                if (done) {
                  console.log('Stream complete');
                  
                  // Process any remaining data in the buffer
                  if (buffer.trim()) {
                    try {
                      const event = JSON.parse(buffer);
                      this.processStreamEvent(event, messageId);
                    } catch (_e) {
                      // Try to fix and parse the JSON
                      const fixedJson = this.attemptToFixMalformedJson(buffer);
                      if (fixedJson) {
                        try {
                          const event = JSON.parse(fixedJson);
                          this.processStreamEvent(event, messageId);
                        } catch (_e2) {
                          console.error('Failed to parse fixed JSON at stream end');
                        }
                      }
                    }
                  }
                  
                  // Set processing state to false if not already done by an 'end' event
                  this.isProcessing.set(false);
                  
                  // Send end chunk if not already sent
                  this.messageChunksSubject.next({
                    type: ChunkType.End,
                    messageId
                  });
                  
                  // Mark message as complete if not already done
                  const message = this.getMessageById(messageId);
                  if (message && !message.isComplete) {
                    this.updateMessage(messageId, message.content, true);
                  }
                  
                  break;
                }
                
                // Convert the chunk to a string
                const chunk = new TextDecoder().decode(value);
                buffer += chunk;
                
                // Try to parse complete JSON objects from the buffer
                let startIndex = 0;
                
                while (startIndex < buffer.length) {
                  try {
                    // Find the start of a JSON object
                    const jsonStart = buffer.indexOf('{', startIndex);
                    if (jsonStart === -1) break;
                    
                    // Find the matching end of the JSON object
                    let openBraces = 1;
                    let jsonEnd = jsonStart + 1;
                    
                    while (openBraces > 0 && jsonEnd < buffer.length) {
                      if (buffer[jsonEnd] === '{') openBraces++;
                      else if (buffer[jsonEnd] === '}') openBraces--;
                      jsonEnd++;
                    }
                    
                    // If we found a complete JSON object
                    if (openBraces === 0) {
                      const jsonStr = buffer.substring(jsonStart, jsonEnd);
                      
                      try {
                        // Parse the JSON
                        const event = JSON.parse(jsonStr);
                        
                        // Process the event
                        this.processStreamEvent(event, messageId);
                        
                        // Remove the processed JSON from the buffer
                        buffer = buffer.substring(jsonEnd);
                        startIndex = 0;
                      } catch (_e3) {
                        // If parsing fails, try to fix the JSON
                        const fixedJson = this.attemptToFixMalformedJson(jsonStr);
                        if (fixedJson) {
                          try {
                            const event = JSON.parse(fixedJson);
                            this.processStreamEvent(event, messageId);
                            
                            // Remove the processed JSON from the buffer
                            buffer = buffer.substring(jsonEnd);
                            startIndex = 0;
                          } catch (_e4) {
                            // If fixing fails, move on to the next potential JSON object
                            startIndex = jsonStart + 1;
                          }
                        } else {
                          // If fixing fails, move on to the next potential JSON object
                          startIndex = jsonStart + 1;
                        }
                      }
                    } else {
                      // If we didn't find a complete JSON object, break and wait for more data
                      break;
                    }
                  } catch (_e5) {
                    // If any other error occurs, move the start index forward
                    startIndex++;
                  }
                }
              }
            } catch (streamError) {
              console.error('Stream processing error:', streamError);
              
              // Set processing state to false
              this.isProcessing.set(false);
              
              // Send error chunk
              this.messageChunksSubject.next({
                type: ChunkType.Error,
                content: `Stream error: ${streamError instanceof Error ? streamError.message : 'Unknown error'}`,
                messageId
              });
              
              // Update the message with error
              this.updateMessage(messageId, `Error: ${streamError instanceof Error ? streamError.message : 'Unknown error'}`, true);
              
              reject(streamError);
            }
          };
          
          // Start processing the stream
          processStream().then(() => {
            // Resolve the promise when done
            resolve();
          }).catch((err) => {
            reject(err);
          });
        }).catch((err) => {
          console.error('Stream setup error:', err);
          
          // Set processing state to false
          this.isProcessing.set(false);
          
          // Send error chunk
          this.messageChunksSubject.next({
            type: ChunkType.Error,
            content: `Error: ${err instanceof Error ? err.message : 'Unknown error'}`,
            messageId
          });
          
          // Update the message with error
          this.updateMessage(
            messageId, 
            `Error: ${err instanceof Error ? err.message : 'Unknown error'}`, 
            true
          );
          
          reject(err);
        });
      } catch (err) {
        console.error('Stream setup error:', err);
        
        // Set processing state to false
        this.isProcessing.set(false);
        
        // Send error chunk
        this.messageChunksSubject.next({
          type: ChunkType.Error,
          content: `Error: ${err instanceof Error ? err.message : 'Unknown error'}`,
          messageId
        });
        
        // Update the message with error
        this.updateMessage(
          messageId, 
          `Error: ${err instanceof Error ? err.message : 'Unknown error'}`, 
          true
        );
        
        reject(err);
      }
    });
  }
  
  /**
   * Process a stream event from the FlowWise API
   */
  private processStreamEvent(event: FlowWiseStreamEvent, messageId: string): void {
    // Update the current event signal
    this.currentEvent.set(event.event);
    
    let errorMessage: string | null = null;
    let metadata: Record<string, unknown> | undefined;
    let sourceDocuments: SourceDocument[] = [];
    let reasoningStep: AgentReasoningStep | undefined;
    
    // Process the event based on its type
    switch (event.event) {
      case 'start':
        console.log('Stream started');
        // Set processing state to true
        this.isProcessing.set(true);
        
        // Send start chunk
        this.messageChunksSubject.next({
          type: ChunkType.Start,
          messageId
        });
        break;
        
      case 'token':
        {
          // Process token event (text content)
          const tokenMessage = typeof event.data === 'string' ? event.data : '';
          
          if (tokenMessage) {
            // Send token as a message chunk
            this.messageChunksSubject.next({
              type: ChunkType.Content,
              content: tokenMessage,
              messageId
            });
            
            // Update message in chat (append token)
            this.updateMessage(messageId, tokenMessage, false, true);
          }
        }
        break;
        
      case 'end':
        console.log('Stream ended');
        // Set processing state to false
        this.isProcessing.set(false);
        
        // Send end chunk
        this.messageChunksSubject.next({
          type: ChunkType.End,
          messageId
        });
        
        // Mark message as complete
        {
          const existingMessage = this.getMessageById(messageId);
          if (existingMessage) {
            this.updateMessage(messageId, existingMessage.content, true);
          }
        }
        break;
        
      case 'error':
        console.log('Stream error event:', event.data);
        // Set processing state to false
        this.isProcessing.set(false);
        
        // Create error message
        errorMessage = typeof event.data === 'string' 
          ? `Error: ${event.data}` 
          : 'An error occurred during processing';
        
        // Send error chunk
        this.messageChunksSubject.next({
          type: ChunkType.Error,
          content: errorMessage,
          messageId
        });
        
        // Mark message as complete with error content
        this.updateMessage(messageId, errorMessage, true);
        break;
        
      case 'metadata':
        console.log('Received metadata:', event.data);
        
        // Extract chatId and sessionId if available
        if (event.data && typeof event.data === 'object') {
          metadata = event.data;
          
          // Store chatId and sessionId for future requests
          if (metadata['chatId'] && typeof metadata['chatId'] === 'string') {
            this.storeChatId(metadata['chatId']);
          }
          
          if (metadata['sessionId'] && typeof metadata['sessionId'] === 'string') {
            this.storeSessionId(metadata['sessionId']);
          }
        }
        break;
        
      case 'sourceDocuments':
        console.log('Received source documents:', event.data);
        
        // Process source documents
        sourceDocuments = Array.isArray(event.data) ? event.data : [];
        
        // Ensure each document has an ID
        sourceDocuments = sourceDocuments.map(doc => ({
          ...doc,
          id: doc.id || uuidv4()
        }));
        
        // Store source documents in the active chat
        this.activeChat.update(chat => {
          if (!chat) return null;
          return {
            ...chat,
            sourceDocuments
          };
        });
        
        // Update chats list and save to storage
        this.updateChatInList();
        this.saveChatsToStorage();
        
        // Update the subject for components to react
        // This will not cause an infinite loop since we removed the updateSourceDocuments call in the component
        this.sourceDocumentsSubject.next(sourceDocuments);
        
        {
          // Send source documents as a message chunk
          const docsContent = this.formatSourceDocuments(sourceDocuments);
          if (docsContent) {
            this.messageChunksSubject.next({
              type: ChunkType.SourceDocuments,
              content: docsContent,
              messageId
            });
          }
        }
        break;
        
      case 'agentReasoning':
        console.log('Received agent reasoning:', event.data);
        
        // Process agent reasoning - handle both single object and array formats
        if (event.data) {
          if (Array.isArray(event.data)) {
            // If it's an array, get the last item as the most recent step
            if (event.data.length > 0) {
              // Get the most recent reasoning step (last item in the array)
              reasoningStep = event.data[event.data.length - 1];
              this.thinkingSubject.next(reasoningStep);
            }
            // Store all steps in the chat
            this.updateReasoningSteps(event.data);
          } else if (typeof event.data === 'object') {
            // If it's a single object, process it directly
            reasoningStep = event.data;
            this.thinkingSubject.next(reasoningStep);
            // Store it as a single-item array
            this.updateReasoningSteps([reasoningStep]);
          }
        }
        break;
        
      case 'nextAgent':
        console.log('Switching to next agent:', event.data);
        break;
        
      default:
        // Handle unknown event types safely
        if (typeof event === 'object' && event !== null) {
          // Use type assertion with Record<string, unknown> for safe property access
          const eventObj = event as Record<string, unknown>;
          const eventType = eventObj['event'];
          const eventData = eventObj['data'];
          console.log(`Unhandled event type: ${eventType}`, eventData);
        } else {
          console.log('Received unknown event format:', event);
        }
        break;
    }
  }
  
  /**
   * Get a message by its ID from the active chat
   */
  private getMessageById(messageId: string): Message | undefined {
    const chat = this.activeChat();
    if (!chat) return undefined;
    
    return chat.messages.find(message => message.id === messageId);
  }
  
  /**
   * Store the chat ID in the active chat
   */
  private storeChatId(chatId: string): void {
    this.activeChat.update(chat => {
      if (!chat) return null;
      return {
        ...chat,
        flowChatId: chatId
      };
    });
    
    // Update chats list and save to storage
    this.updateChatInList();
    this.saveChatsToStorage();
    
    console.log('Stored chat ID:', chatId);
  }
  
  /**
   * Store the session ID in the active chat
   */
  private storeSessionId(sessionId: string): void {
    this.activeChat.update(chat => {
      if (!chat) return null;
      return {
        ...chat,
        sessionId
      };
    });
    
    // Update chats list and save to storage
    this.updateChatInList();
    this.saveChatsToStorage();
    
    console.log('Stored session ID:', sessionId);
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
  private updateMessage(messageId: string, content: string, isComplete = false, append = false): void {
    console.log(`Updating message ${messageId}, isComplete: ${isComplete}`);
    
    this.activeChat.update(chat => {
      if (!chat) return null;
      
      const updatedMessages = chat.messages.map(message => {
        if (message.id === messageId) {
          // Create a new message object to ensure change detection
          if (append) {
            return {
              ...message,
              content: message.content + content,
              isComplete
            };
          } else {
            return {
              ...message,
              content,
              isComplete
            };
          }
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
          })),
          // Ensure reasoningSteps is initialized and properly structured
          reasoningSteps: Array.isArray(chat.reasoningSteps) ? 
            chat.reasoningSteps.map(step => ({
              agentName: step.agentName || 'Unknown Agent',
              messages: Array.isArray(step.messages) ? [...step.messages] : [],
              next: step.next,
              instructions: step.instructions,
              usedTools: step.usedTools,
              sourceDocuments: step.sourceDocuments,
              artifacts: step.artifacts,
              nodeId: step.nodeId,
              thought: step.thought,
              action: step.action,
              observation: step.observation
            })) : [],
          // Ensure sourceDocuments is initialized
          sourceDocuments: Array.isArray(chat.sourceDocuments) ? chat.sourceDocuments : []
        }));
        
        this.chats.set(parsedChats);
        console.log('Loaded chats from storage:', parsedChats);
      } catch (error) {
        console.error('Failed to parse stored chats:', error);
      }
    }
  }
  
  /**
   * Delete a chat by ID
   */
  deleteChat(chatId: string): void {
    console.log('Deleting chat:', chatId);
    
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
    
    // Notify subscribers about the chat deletion
    this.messageChunksSubject.next({
      type: ChunkType.End, 
      content: `Chat deleted`,
      messageId: 'system-notification'
    });
    
    // Save changes to storage
    this.saveChatsToStorage();
  }
  
  /**
   * Clear all messages from current chat
   */
  clearCurrentChat(): void {
    if (!this.activeChat()) return;
    
    console.log('Clearing current chat');
    
    this.activeChat.update(chat => {
      if (!chat) return null;
      
      return {
        ...chat,
        messages: [],
        title: 'New Chat',
        updatedAt: new Date(),
        flowChatId: undefined, // Clear FlowWise chatId to start a new conversation
        reasoningSteps: [], // Clear reasoning steps
        sourceDocuments: [] // Clear source documents
      };
    });
    
    // Update in chats list
    this.updateChatInList();
    
    // Notify subscribers about the chat clearing
    this.messageChunksSubject.next({
      type: ChunkType.End, 
      content: `Chat cleared`,
      messageId: 'system-notification'
    });
    
    // Clear thinking and source documents
    this.thinkingSubject.next(null);
    this.sourceDocumentsSubject.next([]);
    
    // Save changes to storage
    this.saveChatsToStorage();
  }
  
  /**
   * Format source documents into readable text
   */
  private formatSourceDocuments(documents: SourceDocument[]): string {
    if (!documents || documents.length === 0) {
      return '';
    }
    
    let content = '## Source Documents\n\n';
    
    documents.forEach((doc, index) => {
      content += `### Document ${index + 1}\n\n`;
      content += `${doc.pageContent}\n\n`;
      
      if (doc.metadata) {
        if (doc.metadata['source']) {
          content += `*Source:* ${doc.metadata['source']}\n`;
        }
        
        if (doc.metadata['title']) {
          content += `*Title:* ${doc.metadata['title']}\n`;
        }
      }
      
      content += '\n---\n\n';
    });
    
    return content;
  }
  
  /**
   * Attempt to fix malformed JSON that might be truncated or have other issues
   */
  private attemptToFixMalformedJson(jsonData: string): string | null {
    try {
      // First, try to parse it as-is (it might be valid JSON already)
      try {
        JSON.parse(jsonData);
        return jsonData; // It's already valid JSON
      } catch {
        // If it's not valid, continue with fixing attempts
        console.log('JSON is not valid, attempting to fix');
      }
      
      // Check if it's an empty string or not JSON at all
      if (!jsonData.trim() || (!jsonData.includes('{') && !jsonData.includes('['))) {
        return null;
      }
      
      // Specific fixes for common event types
      
      // Fix for token events (most common)
      if (jsonData.includes('"event":"token"')) {
        const tokenMatch = /"event":"token".*?"data":"([^"]*)/;
        const match = jsonData.match(tokenMatch);
        
        if (match) {
          // Try to construct a valid token event
          const fixedJson = `{"event":"token","data":"${match[1]}"}`;
          try {
            JSON.parse(fixedJson);
            console.log('Fixed token event JSON');
            return fixedJson;
          } catch {
            // Continue to other fixing methods
          }
        }
      }
      
      // Fix for start events
      if (jsonData.includes('"event":"start"')) {
        // Simple fix for start event with no data
        const fixedJson = '{"event":"start","data":[]}';
        try {
          JSON.parse(fixedJson);
          console.log('Fixed start event JSON');
          return fixedJson;
        } catch {
          // Continue to other fixing methods
        }
      }
      
      // Fix for end events
      if (jsonData.includes('"event":"end"')) {
        // Simple fix for end event with no data
        const fixedJson = '{"event":"end"}';
        try {
          JSON.parse(fixedJson);
          console.log('Fixed end event JSON');
          return fixedJson;
        } catch {
          // Continue to other fixing methods
        }
      }
      
      // More complex fixes for events with nested objects
      
      // Fix for metadata events
      if (jsonData.includes('"event":"metadata"')) {
        const metadataMatch = /"event":"metadata".*?"data":(\{[^}]*)/;
        const match = jsonData.match(metadataMatch);
        
        if (match) {
          // Try to complete the metadata object
          let dataObj = match[1];
          if (!dataObj.endsWith('}')) {
            dataObj += '}';
          }
          
          const fixedJson = `{"event":"metadata","data":${dataObj}}`;
          try {
            JSON.parse(fixedJson);
            console.log('Fixed metadata event JSON');
            return fixedJson;
          } catch {
            // If that didn't work, try a simpler approach
            const simpleFixedJson = '{"event":"metadata","data":{}}';
            try {
              JSON.parse(simpleFixedJson);
              console.log('Fixed metadata event with empty data');
              return simpleFixedJson;
            } catch {
              // Continue to other fixing methods
            }
          }
        }
      }
      
      // Fix for sourceDocuments events
      if (jsonData.includes('"event":"sourceDocuments"')) {
        // Simple fix for sourceDocuments with empty array
        const fixedJson = '{"event":"sourceDocuments","data":[]}';
        try {
          JSON.parse(fixedJson);
          console.log('Fixed sourceDocuments event with empty data');
          return fixedJson;
        } catch {
          // Continue to other fixing methods
        }
      }
      
      // Fix for agentReasoning events
      if (jsonData.includes('"event":"agentReasoning"')) {
        // Try to extract the data object if it exists
        const reasoningMatch = /"event":"agentReasoning".*?"data":(\[|\{)/;
        const match = jsonData.match(reasoningMatch);
        
        if (match) {
          // Check if it's an array or object
          if (match[1] === '[') {
            // It's an array, provide empty array
            const fixedJson = '{"event":"agentReasoning","data":[]}';
            try {
              JSON.parse(fixedJson);
              console.log('Fixed agentReasoning event with empty array');
              return fixedJson;
            } catch {
              // Continue to other fixing methods
            }
          } else {
            // It's an object, provide empty object
            const fixedJson = '{"event":"agentReasoning","data":{}}';
            try {
              JSON.parse(fixedJson);
              console.log('Fixed agentReasoning event with empty object');
              return fixedJson;
            } catch {
              // Continue to other fixing methods
            }
          }
        }
      }
      
      // General approach for any JSON: try to find where the valid JSON ends
      console.log('Attempting general JSON fix approach');
      let validJson = '';
      let openBraces = 0;
      let openBrackets = 0;
      let inQuotes = false;
      let escapeNext = false;
      
      for (let i = 0; i < jsonData.length; i++) {
        const char = jsonData[i];
        validJson += char;
        
        if (escapeNext) {
          escapeNext = false;
          continue;
        }
        
        if (char === '\\') {
          escapeNext = true;
          continue;
        }
        
        if (char === '"' && !escapeNext) {
          inQuotes = !inQuotes;
          continue;
        }
        
        if (!inQuotes) {
          if (char === '{') {
            openBraces++;
          } else if (char === '}') {
            openBraces--;
          } else if (char === '[') {
            openBrackets++;
          } else if (char === ']') {
            openBrackets--;
          }
          
          // If all braces and brackets are closed, we have valid JSON
          if (openBraces === 0 && openBrackets === 0 && validJson.trim().length > 1) {
            try {
              JSON.parse(validJson);
              console.log('Successfully fixed JSON using general approach');
              return validJson;
            } catch {
              // Continue searching
            }
          }
        }
      }
      
      // If we get here and the JSON is still not valid, try one more approach:
      // Check if we have a complete event structure but missing the closing brace
      if (jsonData.includes('"event"') && jsonData.includes('"data"')) {
        // Try adding a closing brace
        const withClosingBrace = jsonData + '}';
        try {
          JSON.parse(withClosingBrace);
          console.log('Fixed JSON by adding closing brace');
          return withClosingBrace;
        } catch {
          // That didn't work, continue
        }
      }
      
      // If we couldn't fix it, return null
      console.error('Failed to fix malformed JSON');
      return null;
    } catch {
      console.error('Error while trying to fix JSON:');
      return null;
    }
  }
  
  /**
   * Update reasoning steps in the active chat
   */
  public updateReasoningSteps(steps: AgentReasoningStep[]): void {
    if (!steps || steps.length === 0) return;
    
    // Process each step to ensure it doesn't have any circular references or complex objects
    const cleanedSteps = steps.map(step => ({
      agentName: step.agentName || 'Unknown Agent',
      messages: Array.isArray(step.messages) ? [...step.messages] : [],
      next: step.next,
      instructions: step.instructions,
      usedTools: step.usedTools ? JSON.parse(JSON.stringify(step.usedTools)) : undefined,
      sourceDocuments: step.sourceDocuments ? JSON.parse(JSON.stringify(step.sourceDocuments)) : undefined,
      artifacts: step.artifacts ? JSON.parse(JSON.stringify(step.artifacts)) : undefined,
      nodeId: step.nodeId,
      thought: step.thought,
      action: step.action,
      observation: step.observation
    }));
    
    // Update the active chat
    this.activeChat.update(chat => {
      if (!chat) return null;
      return {
        ...chat,
        reasoningSteps: cleanedSteps
      };
    });
    
    // Update chats list to persist the reasoning steps
    this.updateChatInList();
    
    // Immediately save to storage to ensure persistence
    this.saveChatsToStorage();
    
    console.log('Updated reasoning steps in active chat:', cleanedSteps.length);
  }
  
  /**
   * Update source documents in the active chat and persist to storage
   */
  public updateSourceDocuments(documents: SourceDocument[]): void {
    if (!documents || documents.length === 0) return;
    
    console.log('Updating source documents in active chat:', documents.length);
    
    // Process documents to ensure they don't have circular references
    const cleanedDocuments = documents.map(doc => ({
      id: doc.id || uuidv4(), // Ensure each document has an ID
      pageContent: doc.pageContent,
      metadata: doc.metadata ? JSON.parse(JSON.stringify(doc.metadata)) : {
        source: 'Unknown Source',
        blobType: 'text/plain'
      }
    }));
    
    // Update the active chat
    this.activeChat.update(chat => {
      if (!chat) return null;
      return {
        ...chat,
        sourceDocuments: cleanedDocuments
      };
    });
    
    // Update chats list to persist the source documents
    this.updateChatInList();
    
    // Immediately save to storage to ensure persistence
    this.saveChatsToStorage();
    
    // Update the subject for components to react
    this.sourceDocumentsSubject.next(cleanedDocuments);
  }
}