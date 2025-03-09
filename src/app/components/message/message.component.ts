import { Component, Input, ChangeDetectorRef, OnChanges, SimpleChanges, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Message } from '../../models/interfaces';
import { MessageRole } from '../../models/enums';
import { marked } from 'marked';
import { SourceDocumentsComponent } from '../source-documents/source-documents.component';
import { ChatService } from '../../services/chat.service';

@Component({
  selector: 'app-message',
  standalone: true,
  imports: [CommonModule, DatePipe, SourceDocumentsComponent],
  template: `
    <div [ngClass]="messageClasses" class="py-5 px-5 sm:px-8 w-full">
      <div class="flex items-start max-w-3xl mx-auto">
        <div 
          class="flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center mr-4 mt-1"
          [ngClass]="avatarClasses"
        >
          <span [ngSwitch]="message.role">
            <span *ngSwitchCase="'user'" class="text-sm font-semibold">U</span>
            <span *ngSwitchCase="'assistant'" class="text-sm font-semibold">A</span>
            <span *ngSwitchDefault class="text-sm font-semibold">S</span>
          </span>
        </div>
        
        <div class="flex-1 space-y-2">
          <div class="flex items-center">
            <span class="font-medium text-[var(--techwave-heading-color)]">{{ roleName }}</span>
            <span class="text-xs text-[var(--techwave-muted-color)] ml-2">
              {{ message.timestamp | date:'short' }}
            </span>
          </div>
          
          <!-- For user messages or completed AI messages -->
          <div 
            *ngIf="message.role === 'user' || (message.isComplete && !isErrorMessage && !hasAgentReasoning && !hasNextAgent)" 
            class="prose prose-sm max-w-none text-[var(--techwave-body-color)]"
            [innerHTML]="renderedContent"
          ></div>
          
          <!-- Source Documents (only shown for completed AI messages) -->
          <app-source-documents *ngIf="message.role === 'assistant' && message.isComplete && !isErrorMessage"></app-source-documents>
          
          <!-- For error messages -->
          <div 
            *ngIf="message.role === 'assistant' && isErrorMessage" 
            class="prose prose-sm max-w-none bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4 text-red-700 dark:text-red-300"
          >
            <div class="flex items-start">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
              </svg>
              <div>
                <p class="font-medium mb-1">Connection Error</p>
                <p class="text-sm" [innerHTML]="renderedContent"></p>
              </div>
            </div>
          </div>
          
          <!-- For AI messages that are still streaming -->
          <div *ngIf="message.role === 'assistant' && !message.isComplete && !isErrorMessage && !hasAgentReasoning && !hasNextAgent">
            <div 
              class="prose prose-sm max-w-none text-[var(--techwave-body-color)]"
              [innerHTML]="renderedContent"
            ></div>
            
            <!-- Typing animation -->
            <div *ngIf="isLastMessage" class="typing-animation mt-1">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
          
          <!-- For agent reasoning messages -->
          <div *ngIf="hasAgentReasoning" class="prose prose-sm max-w-none bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-md p-4 text-indigo-700 dark:text-indigo-300">
            <div class="flex items-start">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd" />
              </svg>
              <div>
                <p class="font-medium mb-1">Agent Reasoning</p>
                <div class="text-sm" [innerHTML]="renderedContent"></div>
              </div>
            </div>
          </div>
          
          <!-- For next agent messages -->
          <div *ngIf="hasNextAgent" class="prose prose-sm max-w-none bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-md p-4 text-purple-700 dark:text-purple-300">
            <div class="flex items-start">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd" />
              </svg>
              <div>
                <p class="font-medium mb-1">Next Agent</p>
                <div class="text-sm" [innerHTML]="renderedContent"></div>
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
    }
    
    /* Animation delay utilities */
    .animation-delay-200 {
      animation-delay: 200ms;
    }
    
    .animation-delay-400 {
      animation-delay: 400ms;
    }
    
    /* Ensure code blocks look good */
    :host ::ng-deep pre {
      background-color: var(--techwave-code-bg-color);
      border-radius: 0.375rem;
      padding: 1rem;
      overflow-x: auto;
    }
    
    :host ::ng-deep code {
      font-family: monospace;
      background-color: var(--techwave-code-bg-color);
      padding: 0.125rem 0.25rem;
      border-radius: 0.25rem;
    }
    
    :host ::ng-deep pre code {
      padding: 0;
      background-color: transparent;
    }
    
    /* Enhanced table styling */
    :host ::ng-deep table {
      width: 100%;
      border-collapse: collapse;
      margin: 1rem 0;
      overflow-x: auto;
      display: block;
    }
    
    :host ::ng-deep table th {
      background-color: var(--techwave-table-header-bg-color, var(--techwave-code-bg-color));
      color: var(--techwave-table-header-text-color, var(--techwave-heading-color));
      font-weight: 600;
      text-align: left;
      padding: 0.75rem 1rem;
      border: 1px solid var(--techwave-table-border-color, var(--techwave-border-color));
    }
    
    :host ::ng-deep table td {
      padding: 0.75rem 1rem;
      border: 1px solid var(--techwave-table-border-color, var(--techwave-border-color));
      vertical-align: top;
    }
    
    :host ::ng-deep table tr:nth-child(even) {
      background-color: var(--techwave-table-row-alt-bg-color, rgba(0, 0, 0, 0.03));
    }
    
    :host ::ng-deep table tr:hover {
      background-color: var(--techwave-table-row-hover-bg-color, rgba(0, 0, 0, 0.05));
    }
    
    .typing-animation {
      display: flex;
      justify-content: space-between;
      width: 60px;
    }
    
    .typing-animation span {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background-color: var(--techwave-body-color);
      animation: typing 1.5s infinite;
    }
    
    .typing-animation span:nth-child(2) {
      animation-delay: 200ms;
    }
    
    .typing-animation span:nth-child(3) {
      animation-delay: 400ms;
    }
    
    @keyframes typing {
      0% {
        opacity: 0.2;
      }
      50% {
        opacity: 1;
      }
      100% {
        opacity: 0.2;
      }
    }
  `]
})
export class MessageComponent implements OnInit, OnChanges {
  @Input() message!: Message;
  @Input() isLastMessage = false;
  
  // Property to store cached content
  private _cachedContent: SafeHtml | null = null;
  private _lastContent = '';
  
  constructor(
    private sanitizer: DomSanitizer,
    private cdr: ChangeDetectorRef,
    private chatService: ChatService
  ) {
    // Configure marked for streaming content
    marked.setOptions({
      gfm: true,
      breaks: true
    });
  }
  
  ngOnInit(): void {
    // Initialize component - no specific initialization needed at this time
    console.log('Message component initialized');
  }
  
  ngOnChanges(changes: SimpleChanges): void {
    // Check if message content has changed
    if (changes['message'] && 
        this.message && 
        this._lastContent !== this.message.content) {
      console.log('Message content changed:', this.message.content);
      console.log('Message isComplete:', this.message.isComplete);
      this._lastContent = this.message.content;
      this._cachedContent = null; // Reset cache to force re-render
      this.cdr.detectChanges(); // Trigger change detection
    }
    
    // Also check if isComplete has changed
    if (changes['message'] && 
        this.message && 
        changes['message'].previousValue && 
        changes['message'].previousValue.isComplete !== this.message.isComplete) {
      console.log('Message isComplete changed:', this.message.isComplete);
      this.cdr.detectChanges(); // Trigger change detection
    }
  }
  
  get messageClasses(): string {
    const baseClasses = '';
    
    switch (this.message.role) {
      case MessageRole.User:
        return `${baseClasses} bg-[var(--techwave-user-msg-bg-color)]`;
      case MessageRole.Assistant:
        return `${baseClasses} bg-[var(--techwave-assistant-msg-bg-color)]`;
      default:
        return `${baseClasses} bg-[var(--techwave-system-msg-bg-color)]`;
    }
  }
  
  get avatarClasses(): string {
    const baseClasses = 'text-white';
    
    // Special case for error messages
    if (this.message.role === MessageRole.Assistant && this.isErrorMessage) {
      return `${baseClasses} bg-red-600`;
    }
    
    switch (this.message.role) {
      case MessageRole.User:
        return `${baseClasses} bg-blue-600`;
      case MessageRole.Assistant:
        return `${baseClasses} bg-purple-600`;
      default:
        return `${baseClasses} bg-gray-600`;
    }
  }
  
  get roleName(): string {
    // Special case for error messages
    if (this.message.role === MessageRole.Assistant && this.isErrorMessage) {
      return 'Error';
    }
    
    switch (this.message.role) {
      case MessageRole.User:
        return 'You';
      case MessageRole.Assistant:
        return 'Assistant';
      case MessageRole.System:
        return 'System';
      case MessageRole.Thinking:
        return 'Thinking';
      default:
        return 'Unknown';
    }
  }
  
  get isErrorMessage(): boolean {
    if (!this.message.content) return false;
    
    return (
      this.message.role === MessageRole.Assistant &&
      (
        this.message.content.includes('Unable to connect to the AI service') ||
        this.message.content.includes('Error:') ||
        this.message.content.includes('ENOTFOUND') ||
        this.message.content.includes('Network error') ||
        this.message.content.includes('timed out') ||
        this.message.content.includes('AI service error')
      )
    );
  }
  
  get hasAgentReasoning(): boolean {
    if (!this.message.content) return false;
    
    return (
      this.message.role === MessageRole.Assistant &&
      (
        this.message.content.includes('**Agent:') ||
        this.message.content.includes('**Thought Process:**') ||
        this.message.content.includes('**Action:**') ||
        this.message.content.includes('**Observation:**')
      )
    );
  }
  
  get hasNextAgent(): boolean {
    if (!this.message.content) return false;
    
    return (
      this.message.role === MessageRole.Assistant &&
      this.message.content.includes('Processing with')
    );
  }
  
  get renderedContent(): SafeHtml {
    // If content is empty, return empty string
    if (!this.message.content || this.message.content.trim() === '') {
      return this.sanitizer.bypassSecurityTrustHtml('');
    }
    
    // Use cached content if available
    if (this._cachedContent) {
      return this._cachedContent;
    }
    
    // Process the content with marked
    let html = '';
    try {
      // Configure marked for tables and other GFM features
      marked.setOptions({
        gfm: true,
        breaks: true
      });
      
      html = marked.parse(this.message.content) as string;
      
      // Apply syntax highlighting to code blocks
      html = html.replace(/<pre><code class="language-(\w+)">([\s\S]*?)<\/code><\/pre>/g, (match, language, code) => {
        try {
          // Basic syntax highlighting without using highlight.js API
          return `<pre><code class="language-${language} hljs">${code}</code></pre>`;
        } catch {
          return match; // If highlighting fails, return the original match
        }
      });
      
      // Enhance table rendering with responsive wrapper and additional classes
      html = html.replace(
        /<table>/g, 
        '<div class="table-responsive"><table class="table-auto">'
      ).replace(
        /<\/table>/g, 
        '</table></div>'
      );
      
      // Cache the result
      this._cachedContent = this.sanitizer.bypassSecurityTrustHtml(html);
      return this._cachedContent;
    } catch (error) {
      console.error('Error parsing markdown:', error);
      return this.sanitizer.bypassSecurityTrustHtml(`<p>${this.message.content}</p>`);
    }
  }
}