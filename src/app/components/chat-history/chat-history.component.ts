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
    <div class="h-full flex flex-col bg-[var(--techwave-some-r-bg-color)]">
      <div class="p-4 border-b border-[var(--techwave-border-color)]">
        <h2 class="text-lg font-medium text-[var(--techwave-heading-color)]">Chat History</h2>
        <p class="text-sm text-[var(--techwave-body-color)]">
          Previous conversations
        </p>
      </div>
      
      <div class="p-4 border-b border-[var(--techwave-border-color)]">
        <app-button variant="primary" [fullWidth]="true" (onClick)="onNewChat()">
          New Chat
        </app-button>
      </div>
      
      <div class="flex-1 overflow-y-auto scrollbar-thin">
        <div *ngIf="chatHistory.length === 0" class="text-center py-8 text-[var(--techwave-body-color)] text-sm">
          <p>No chat history</p>
          <p class="mt-2">Start a new conversation</p>
        </div>
        
        <div *ngIf="chatHistory.length > 0" class="space-y-2 p-3">
          <button
            *ngFor="let chat of chatHistory"
            class="w-full text-left py-3 px-4 rounded-lg hover:bg-[var(--techwave-some-a-bg-color)] text-sm transition-colors border border-transparent"
            [class.bg-[var(--techwave-some-a-bg-color)]="currentChatId === chat.id"
            [class.border-[var(--techwave-main-color)]="currentChatId === chat.id"
            [class.text-[var(--techwave-heading-color)]="currentChatId === chat.id"
            [class.font-medium]="currentChatId === chat.id"
            (click)="onSelectChat(chat.id)"
          >
            <div class="flex items-center justify-between">
              <span class="truncate max-w-[180px]">{{ chat.title }}</span>
              <span class="text-xs text-[var(--techwave-body-color)] bg-[var(--techwave-button-bg-color)] px-2 py-1 rounded-full">{{ chat.messages.length }}</span>
            </div>
            <div class="text-xs text-[var(--techwave-body-color)] mt-1">
              {{ chat.updatedAt | date:'short' }}
            </div>
          </button>
        </div>
      </div>
      
      <div class="p-4 border-t border-[var(--techwave-border-color)]">
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