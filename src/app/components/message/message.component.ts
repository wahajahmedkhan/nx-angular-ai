import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Message } from '../../models/interfaces';
import { MessageRole } from '../../models/enums';

@Component({
  selector: 'app-message',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="py-4 px-4 sm:px-6 w-full" [ngClass]="messageClasses">
      <div class="flex items-start max-w-4xl mx-auto">
        <div 
          class="flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center mr-3 mt-1"
          [ngClass]="avatarClasses"
        >
          <span [ngSwitch]="message.role">
            <span *ngSwitchCase="'user'" class="text-sm font-semibold">U</span>
            <span *ngSwitchCase="'assistant'" class="text-sm font-semibold">A</span>
            <span *ngSwitchCase="'system'" class="text-sm font-semibold">S</span>
            <span *ngSwitchDefault class="text-sm font-semibold">?</span>
          </span>
        </div>
        
        <div class="flex-1 overflow-hidden">
          <div class="flex items-center mb-1">
            <span class="text-sm font-semibold text-light-text dark:text-dark-text">
              {{ roleName }}
            </span>
            <span class="text-xs text-gray-500 ml-2">
              {{ message.timestamp | date:'short' }}
            </span>
          </div>
          
          <div 
            class="prose prose-sm dark:prose-invert max-w-none text-light-text dark:text-dark-text"
            [innerHTML]="formattedContent"
          ></div>
          
          <div *ngIf="!message.isComplete" class="mt-2">
            <div class="inline-block relative h-5 w-16">
              <div class="absolute inset-0 flex items-center justify-start">
                <div class="h-2 w-2 bg-light-text dark:bg-dark-text rounded-full animate-bounce"></div>
                <div class="h-2 w-2 bg-light-text dark:bg-dark-text rounded-full animate-bounce ml-1" style="animation-delay: 0.2s"></div>
                <div class="h-2 w-2 bg-light-text dark:bg-dark-text rounded-full animate-bounce ml-1" style="animation-delay: 0.4s"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }
    
    .prose {
      white-space: pre-line;
    }
  `]
})
export class MessageComponent {
  @Input() message!: Message;
  
  get messageClasses(): string {
    const baseClass = 'group border-b';
    const roleSpecificClass = this.message.role === MessageRole.User 
      ? 'border-light-border dark:border-dark-border'
      : 'bg-light-card dark:bg-dark-card border-light-border dark:border-dark-border';
      
    return `${baseClass} ${roleSpecificClass}`;
  }
  
  get avatarClasses(): string {
    switch (this.message.role) {
      case MessageRole.User:
        return 'bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-200';
      case MessageRole.Assistant:
        return 'bg-light-card dark:bg-dark-card text-light-text dark:text-dark-text border border-light-border dark:border-dark-border';
      case MessageRole.System:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
      case MessageRole.Thinking:
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  }
  
  get roleName(): string {
    switch (this.message.role) {
      case MessageRole.User:
        return 'You';
      case MessageRole.Assistant:
        return 'AI Assistant';
      case MessageRole.System:
        return 'System';
      case MessageRole.Thinking:
        return 'Thinking';
      default:
        return 'Unknown';
    }
  }
  
  get formattedContent(): string {
    // Here we would typically use a markdown parser or sanitize content
    // For this example we'll just handle basic formatting
    return this.message.content
      .replace(/\n/g, '<br>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>');
  }
}