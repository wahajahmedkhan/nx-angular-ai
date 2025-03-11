import { Component, Input, ChangeDetectorRef, OnChanges, SimpleChanges } from '@angular/core';
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
  templateUrl: './message.component.html',
  styleUrls: ['./message.component.scss']
})
export class MessageComponent implements OnChanges {
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