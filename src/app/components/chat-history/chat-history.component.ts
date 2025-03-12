import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatService } from '../../services/chat.service';
import { ThemeService } from '../../services/theme.service';
import { Chat } from '../../models/interfaces';
import { ButtonComponent } from '../../shared/ui/button/button.component';
import { Subscription } from 'rxjs';
import { MessageRole } from '../../models/enums';

@Component({
  selector: 'app-chat-history',
  standalone: true,
  imports: [CommonModule, ButtonComponent],
  templateUrl: './chat-history.component.html',
  styleUrls: ['./chat-history.component.scss']
})
export class ChatHistoryComponent implements OnInit, OnDestroy {
  chatHistory: Chat[] = [];
  currentChatId: string | null = null;
  private subscription = new Subscription();
  
  constructor(
    private chatService: ChatService,
    public themeService: ThemeService
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
    this.chatHistory = this.chatService.chatHistory();
    const currentChat = this.chatService.currentChat();
    this.currentChatId = currentChat ? currentChat.id : null;
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
   */
  getFirstUserMessage(chat: Chat): string | null {
    const userMessage = chat.messages.find(message => message.role === MessageRole.User);
    return userMessage ? userMessage.content : null;
  }
}