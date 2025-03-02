import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatService } from '../../services/chat.service';
import { ThemeService } from '../../services/theme.service';
import { Chat } from '../../models/interfaces';
import { ButtonComponent } from '../../shared/ui/button/button.component';

@Component({
  selector: 'app-chat-history',
  standalone: true,
  imports: [CommonModule, ButtonComponent],
  template: `
    <div class="h-full flex flex-col bg-light-surface dark:bg-dark-surface border-l border-light-border dark:border-dark-border">
      <div class="p-4 border-b border-light-border dark:border-dark-border">
        <h2 class="text-lg font-medium text-light-text dark:text-dark-text">Chat History</h2>
        <p class="text-sm text-gray-500 dark:text-gray-400">
          Previous conversations
        </p>
      </div>
      
      <div class="p-4 border-b border-light-border dark:border-dark-border">
        <app-button variant="primary" [fullWidth]="true" (onClick)="onNewChat()">
          New Chat
        </app-button>
      </div>
      
      <div class="flex-1 overflow-y-auto scrollbar-thin">
        <div *ngIf="chatHistory.length === 0" class="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
          <p>No chat history</p>
          <p class="mt-2">Start a new conversation</p>
        </div>
        
        <div *ngIf="chatHistory.length > 0" class="space-y-1 p-2">
          <button
            *ngFor="let chat of chatHistory"
            class="w-full text-left py-2 px-3 rounded-lg hover:bg-light-card dark:hover:bg-dark-card text-sm transition-colors"
            [class.bg-light-card]="currentChatId === chat.id && !themeService.isDarkMode()"
            [class.bg-dark-card]="currentChatId === chat.id && themeService.isDarkMode()"
            [class.text-primary-600]="currentChatId === chat.id"
            [class.font-medium]="currentChatId === chat.id"
            (click)="onSelectChat(chat.id)"
          >
            <div class="flex items-center justify-between">
              <span class="truncate max-w-[180px]">{{ chat.title }}</span>
              <span class="text-xs text-gray-500">{{ chat.messages.length }}</span>
            </div>
            <div class="text-xs text-gray-500 mt-1">
              {{ chat.updatedAt | date:'short' }}
            </div>
          </button>
        </div>
      </div>
      
      <div class="p-3 border-t border-light-border dark:border-dark-border">
        <app-button 
          variant="outline" 
          size="sm" 
          [fullWidth]="true"
          [disabled]="chatHistory.length === 0"
          (onClick)="onClearChat()"
        >
          Clear Current Chat
        </app-button>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      height: 100%;
    }
  `]
})
export class ChatHistoryComponent implements OnInit {
  chatHistory: Chat[] = [];
  currentChatId: string | null = null;
  
  constructor(
    private chatService: ChatService,
    public themeService: ThemeService
  ) {}
  
  ngOnInit(): void {
    // Get the initial list of chats
    this.refreshChatHistory();
  }
  
  refreshChatHistory(): void {
    this.chatHistory = this.chatService.chatHistory();
    const currentChat = this.chatService.currentChat();
    this.currentChatId = currentChat ? currentChat.id : null;
  }
  
  onNewChat(): void {
    this.chatService.createNewChat();
    this.refreshChatHistory();
  }
  
  onSelectChat(chatId: string): void {
    this.chatService.setActiveChat(chatId);
    this.refreshChatHistory();
  }
  
  onClearChat(): void {
    this.chatService.clearCurrentChat();
    this.refreshChatHistory();
  }
}