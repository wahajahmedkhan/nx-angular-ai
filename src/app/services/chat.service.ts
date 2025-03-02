import { Injectable, signal, computed } from '@angular/core';
import { BehaviorSubject, Observable, Subject, delay, of } from 'rxjs';
import { Chat, Message, MessageChunk } from '../models/interfaces';
import { ChunkType, MessageRole } from '../models/enums';
import { v4 as uuidv4 } from 'uuid'; // Note: We'll need to add this package

@Injectable({
  providedIn: 'root',
})
export class ChatService {
  private chats = signal<Chat[]>([]);
  private activeChat = signal<Chat | null>(null);
  private messageChunksSubject = new Subject<MessageChunk>();
  private thinkingSubject = new BehaviorSubject<string>('');
  
  // Observable for message chunks (for streaming responses)
  public messageChunks$ = this.messageChunksSubject.asObservable();
  
  // Observable for thinking steps
  public thinking$ = this.thinkingSubject.asObservable();
  
  // Computed values
  public currentChat = computed(() => this.activeChat());
  public chatHistory = computed(() => this.chats());
  
  constructor() {
    this.loadChatsFromStorage();
    
    // If there are no chats, create a default one
    if (this.chats().length === 0) {
      this.createNewChat();
    } else {
      // Set the most recent chat as active
      this.setActiveChat(this.chats()[0].id);
    }
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
    
    // Save to storage
    this.saveChatsToStorage();
  }
  
  /**
   * Set the active chat by ID
   */
  setActiveChat(chatId: string): void {
    const chat = this.chats().find(c => c.id === chatId);
    if (chat) {
      this.activeChat.set(chat);
    }
  }
  
  /**
   * Send a message and get a response
   */
  sendMessage(content: string): void {
    if (!content.trim() || !this.activeChat()) return;
    
    // Create user message
    const userMessage: Message = {
      id: uuidv4(),
      role: MessageRole.User,
      content,
      timestamp: new Date(),
      isComplete: true
    };
    
    // Add user message to chat
    this.addMessageToChat(userMessage);
    
    // Create assistant message (initially empty)
    const assistantMessageId = uuidv4();
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: MessageRole.Assistant,
      content: '',
      timestamp: new Date(),
      isComplete: false
    };
    
    // Add assistant message to chat
    this.addMessageToChat(assistantMessage);
    
    // Simulate AI thinking - we'd replace this with actual API calls
    this.simulateThinking();
    
    // Simulate streaming response - we'd replace this with actual API calls
    this.simulateStreamingResponse(assistantMessageId);
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
    
    // Save to storage
    this.saveChatsToStorage();
  }
  
  /**
   * Update a message in the current chat
   */
  private updateMessage(messageId: string, content: string, isComplete: boolean = false): void {
    if (!this.activeChat()) return;
    
    this.activeChat.update(chat => {
      if (!chat) return null;
      
      const updatedMessages = chat.messages.map(msg => {
        if (msg.id === messageId) {
          return { ...msg, content, isComplete };
        }
        return msg;
      });
      
      return {
        ...chat,
        messages: updatedMessages,
        updatedAt: new Date()
      };
    });
    
    // Update in chats list
    this.updateChatInList();
    
    // Save to storage
    this.saveChatsToStorage();
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
          return current;
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
      this.activeChat.set(firstChat || null);
      
      // If no chats left, create a new one
      if (!firstChat) {
        this.createNewChat();
      }
    }
    
    // Save to storage
    this.saveChatsToStorage();
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
        updatedAt: new Date()
      };
    });
    
    // Update in chats list
    this.updateChatInList();
    
    // Save to storage
    this.saveChatsToStorage();
  }
  
  // SIMULATION METHODS (replace with actual API calls in production)
  
  /**
   * Simulate thinking steps
   */
  private simulateThinking(): void {
    const steps = [
      'Analyzing input...',
      'Searching knowledge base...',
      'Evaluating information...',
      'Generating response...',
      'Formatting results...'
    ];
    
    steps.forEach((step, index) => {
      setTimeout(() => {
        this.thinkingSubject.next(step);
        
        // Send thinking as a message chunk
        this.messageChunksSubject.next({
          type: ChunkType.Thinking,
          content: step
        });
      }, index * 1000);
    });
  }
  
  /**
   * Simulate streaming response
   */
  private simulateStreamingResponse(messageId: string): void {
    // Send start chunk
    setTimeout(() => {
      this.messageChunksSubject.next({
        type: ChunkType.Start,
        messageId
      });
    }, 2000);
    
    // Example response chunks
    const responseChunks = [
      "Based on your question, ",
      "I've analyzed the information and ",
      "here's what I found: ",
      "The AI chat application you're building ",
      "should have three main components - ",
      "a central chat area, ",
      "a thinking panel on the left, ",
      "and a history panel on the right. ",
      "This follows modern design patterns ",
      "seen in applications like Claude, ChatGPT, and others. ",
      "The UI should be responsive and support both light and dark themes. ",
      "Is there any specific feature you'd like me to elaborate on?"
    ];
    
    let fullResponse = '';
    
    // Send content chunks with delays
    responseChunks.forEach((chunk, index) => {
      setTimeout(() => {
        fullResponse += chunk;
        
        // Send chunk
        this.messageChunksSubject.next({
          type: ChunkType.Content,
          content: chunk,
          messageId
        });
        
        // Update message in chat
        this.updateMessage(messageId, fullResponse);
      }, 3000 + (index * 300));
    });
    
    // Send end chunk
    setTimeout(() => {
      this.messageChunksSubject.next({
        type: ChunkType.End,
        messageId
      });
      
      // Mark message as complete
      this.updateMessage(messageId, fullResponse, true);
    }, 3000 + (responseChunks.length * 300) + 500);
  }
}