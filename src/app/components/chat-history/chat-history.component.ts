import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatService } from '../../services/chat.service';
import { ThemeService } from '../../services/theme.service';
import { Chat } from '../../models/interfaces';
import { ButtonComponent } from '../../shared/ui/button/button.component';
import { Subscription } from 'rxjs';
import { MessageRole } from '../../models/enums';

// Extend the Chat interface to include the firstUserMessage property
interface ExtendedChat extends Chat {
  firstUserMessage?: string | null;
}

@Component({
  selector: 'app-chat-history',
  standalone: true,
  imports: [CommonModule, ButtonComponent],
  templateUrl: './chat-history.component.html',
  styleUrls: ['./chat-history.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ChatHistoryComponent implements OnInit, OnDestroy {
  chatHistory: ExtendedChat[] = [];
  currentChatId: string | null = null;
  private subscription = new Subscription();
  
  constructor(
    private chatService: ChatService,
    public themeService: ThemeService,
    private cdr: ChangeDetectorRef
  ) {}
  
  ngOnInit(): void {
    // Get the initial list of chats
    this.refreshChatHistory();
    
    // Subscribe to chat history changes
    this.subscription.add(
      this.chatService.messageChunks$.subscribe(() => {
        // Refresh chat history whenever a new message chunk arrives
        this.refreshChatHistory();
      })
    );
  }
  
  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
  
  refreshChatHistory(): void {
    const rawChatHistory = this.chatService.chatHistory();
    
    // Process each chat to add the firstUserMessage property
    this.chatHistory = rawChatHistory.map(chat => {
      const firstUserMessage = this.getFirstUserMessage(chat);
      return {
        ...chat,
        firstUserMessage
      };
    });
    
    const currentChat = this.chatService.currentChat();
    this.currentChatId = currentChat ? currentChat.id : null;
    this.cdr.markForCheck();
  }
  
  onNewChat(): void {
    console.log('Creating new chat');
    this.chatService.createNewChat();
    // Force refresh to ensure UI updates immediately
    setTimeout(() => {
      this.refreshChatHistory();
    }, 0);
  }
  
  onSelectChat(chatId: string): void {
    if (chatId !== this.currentChatId) {
      console.log('Selecting chat:', chatId);
      this.chatService.setActiveChat(chatId);
      this.refreshChatHistory();
    }
  }
  
  onClearChat(): void {
    console.log('Clearing current chat');
    this.chatService.clearCurrentChat();
    // Force refresh to ensure UI updates immediately
    setTimeout(() => {
      this.refreshChatHistory();
    }, 0);
  }
  
  onDeleteChat(): void {
    if (this.currentChatId) {
      console.log('Deleting chat:', this.currentChatId);
      this.chatService.deleteChat(this.currentChatId);
      // Force refresh to ensure UI updates immediately
      setTimeout(() => {
        this.refreshChatHistory();
      }, 0);
    }
  }
  
  /**
   * Get the first user message from a chat
   * @private This is now a private method used only internally
   */
  private getFirstUserMessage(chat: Chat): string | null {
    const userMessage = chat.messages.find(message => message.role === MessageRole.User);
    return userMessage ? userMessage.content : null;
  }
}