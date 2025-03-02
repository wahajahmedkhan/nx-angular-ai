import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Message } from '../../models/interfaces';
import { MessageRole } from '../../models/enums';

@Component({
  selector: 'app-message',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="py-5 px-5 sm:px-8 w-full" [ngClass]="messageClasses">
      <div class="flex items-start max-w-3xl mx-auto">
        <div 
          class="flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center mr-4 mt-1"
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
          <div class="flex items-center mb-2">
            <span class="text-sm font-semibold text-[var(--techwave-heading-color)]">
              {{ roleName }}
            </span>
            <span class="text-xs text-[var(--techwave-body-color)] ml-3">
              {{ message.timestamp | date:'short' }}
            </span>
          </div>
          
          <div 
            class="prose prose-sm max-w-none text-[var(--techwave-body-color)]"
            [innerHTML]="formattedContent"
          ></div>
          
          <div *ngIf="!message.isComplete" class="mt-3">
            <div class="inline-block relative h-5 w-16">
              <div class="absolute inset-0 flex items-center justify-start">
                <div class="h-2 w-2 bg-[var(--techwave-main-color1)] rounded-full animate-bounce"></div>
                <div class="h-2 w-2 bg-[var(--techwave-main-color1)] rounded-full animate-bounce ml-1" style="animation-delay: 0.2s"></div>
                <div class="h-2 w-2 bg-[var(--techwave-main-color1)] rounded-full animate-bounce ml-1" style="animation-delay: 0.4s"></div>
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
      ? 'border-[var(--techwave-border-color)]'
      : 'bg-[var(--techwave-some-r-bg-color)] border-[var(--techwave-border-color)]';
      
    return `${baseClass} ${roleSpecificClass}`;
  }
  
  get avatarClasses(): string {
    switch (this.message.role) {
      case MessageRole.User:
        return 'bg-[var(--techwave-main-color)] text-white';
      case MessageRole.Assistant:
        return 'bg-[var(--techwave-some-a-bg-color)] text-[var(--techwave-heading-color)] border border-[var(--techwave-border-color)]';
      case MessageRole.System:
        return 'bg-[var(--techwave-some-r-bg-color)] text-[var(--techwave-heading-color)]';
      case MessageRole.Thinking:
        return 'bg-[var(--techwave-main-color2)] text-white';
      default:
        return 'bg-[var(--techwave-some-r-bg-color)] text-[var(--techwave-heading-color)]';
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