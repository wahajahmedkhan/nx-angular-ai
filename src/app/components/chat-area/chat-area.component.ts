import { Component, OnInit, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatService } from '../../services/chat.service';
import { ThemeService } from '../../services/theme.service';
import { MessageComponent } from '../message/message.component';
import { ButtonComponent } from '../../shared/ui/button/button.component';
import { TextareaComponent } from '../../shared/ui/textarea/textarea.component';
import { Message } from '../../models/interfaces';

@Component({
  selector: 'app-chat-area',
  standalone: true,
  imports: [CommonModule, FormsModule, MessageComponent, ButtonComponent, TextareaComponent],
  template: `
    <div class="h-full flex flex-col bg-light-background dark:bg-dark-background">
      <div class="p-3 md:p-4 border-b border-light-border dark:border-dark-border flex items-center justify-between">
        <h2 class="text-lg font-medium text-light-text dark:text-dark-text truncate max-w-[70%]">
          {{ currentChatTitle }}
        </h2>
        <app-button variant="ghost" size="sm" (onClick)="onThemeToggle()" class="ml-auto">
          <span *ngIf="themeService.isDarkMode()">🌞</span>
          <span *ngIf="!themeService.isDarkMode()">🌙</span>
        </app-button>
      </div>
      
      <div #messagesContainer class="flex-1 overflow-y-auto scrollbar-thin">
        <div *ngIf="!currentChat || currentChat.messages.length === 0" class="flex flex-col items-center justify-center h-full px-4 text-center">
          <div class="py-8 px-4 rounded-lg bg-light-card dark:bg-dark-card max-w-md">
            <h3 class="text-xl font-semibold text-light-text dark:text-dark-text mb-2">Welcome to AI Chat</h3>
            <p class="text-gray-600 dark:text-gray-400">
              Start a conversation with the AI assistant. 
              Type a message below to begin.
            </p>
          </div>
        </div>
        
        <app-message
          *ngFor="let message of currentChat?.messages"
          [message]="message"
        ></app-message>
      </div>
      
      <div class="p-3 md:p-4 border-t border-light-border dark:border-dark-border">
        <div class="max-w-3xl mx-auto">
          <form (submit)="onSendMessage()" class="flex items-end gap-2">
            <div class="flex-1">
              <app-textarea
                [(ngModel)]="newMessage"
                name="message"
                [placeholder]="'Type a message...'"
                [rows]="1"
                [maxHeight]="'120px'"
                [autoResize]="true"
              ></app-textarea>
            </div>
            <app-button
              type="submit"
              [disabled]="!newMessage.trim()"
              variant="primary"
            >
              Send
            </app-button>
          </form>
          
          <div class="text-xs text-gray-500 mt-2 text-center">
            Press Enter to send, Shift+Enter for a new line
          </div>
        </div>
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
export class ChatAreaComponent implements OnInit, AfterViewChecked {
  currentChat: { messages: Message[], title: string } | null = null;
  newMessage = '';
  shouldScrollToBottom = false;
  
  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;
  
  constructor(
    private chatService: ChatService,
    public themeService: ThemeService
  ) {}
  
  ngOnInit(): void {
    // Watch the current chat signal
    this.currentChat = this.chatService.currentChat();
    
    // Subscribe to message chunks to trigger scroll on new content
    this.chatService.messageChunks$.subscribe(chunk => {
      if (chunk.type === 'content') {
        this.shouldScrollToBottom = true;
      }
    });
  }
  
  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }
  
  get currentChatTitle(): string {
    return this.currentChat?.title || 'New Chat';
  }
  
  onSendMessage(): void {
    if (!this.newMessage.trim()) return;
    
    this.chatService.sendMessage(this.newMessage);
    this.newMessage = '';
    this.shouldScrollToBottom = true;
  }
  
  onThemeToggle(): void {
    // Use theme service to toggle theme
    this.themeService.toggleTheme();
  }
  
  private scrollToBottom(): void {
    try {
      const container = this.messagesContainer.nativeElement;
      container.scrollTop = container.scrollHeight;
    } catch (err) {
      console.error('Error scrolling to bottom:', err);
    }
  }
}