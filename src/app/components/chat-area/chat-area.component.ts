import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked, ChangeDetectorRef, effect, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ChatService } from '../../services/chat.service';
import { ThemeService } from '../../services/theme.service';
import { MessageComponent } from '../message/message.component';
import { Message } from '../../models/interfaces';

@Component({
  selector: 'app-chat-area',
  standalone: true,
  imports: [CommonModule, FormsModule, MessageComponent],
  templateUrl: './chat-area.component.html',
  styleUrls: ['./chat-area.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ChatAreaComponent implements OnInit, AfterViewChecked, OnDestroy {
  currentChat: { messages: Message[], title: string } | null = null;
  newMessage = '';
  shouldScrollToBottom = false;
  isLoading = false;
  private subscription = new Subscription();
  
  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;
  
  constructor(
    private chatService: ChatService,
    private cdr: ChangeDetectorRef,
    public themeService: ThemeService
  ) {
    // Use effect to react to changes in the current chat
    effect(() => {
      this.currentChat = this.chatService.currentChat();
      if (this.currentChat) {
        this.shouldScrollToBottom = true;
      }
      this.cdr.markForCheck();
    });
  }
  
  ngOnInit(): void {
    // Subscribe to message chunks to trigger scroll on new content and update loading state
    this.subscription.add(
      this.chatService.messageChunks$.subscribe(chunk => {
        console.log('Received message chunk:', chunk.type, chunk);
        
        if (chunk.type === 'start') {
          console.log('Setting isLoading to true');
          this.isLoading = true;
        } else if (chunk.type === 'end' || chunk.type === 'error') {
          console.log('Stream ended or error occurred, setting isLoading to false');
          this.isLoading = false;
          
          // Force update of current chat to ensure message is marked as complete
          const currentChat = this.chatService.currentChat();
          if (currentChat) {
            this.currentChat = { ...currentChat };
          }
          
          // Scroll to bottom when stream ends
          this.shouldScrollToBottom = true;
          
          // Force change detection to ensure UI updates
          this.cdr.markForCheck();
        } else if (chunk.type === 'content') {
          this.shouldScrollToBottom = true;
          this.cdr.markForCheck();
        } else if (chunk.type === 'agentReasoning') {
          // Handle agent reasoning events
          console.log('Received agent reasoning:', chunk.content);
          this.shouldScrollToBottom = true;
          this.cdr.markForCheck();
        } else if (chunk.type === 'nextAgent') {
          // Handle next agent events
          console.log('Received next agent:', chunk.content);
          this.shouldScrollToBottom = true;
          this.cdr.markForCheck();
        }
      })
    );
    
    // Add a safety check to ensure loading state is reset if something goes wrong
    // Create an interval and store its ID
    const intervalId = setInterval(() => {
      if (this.isLoading) {
        const lastMessageTime = this.getLastMessageTime();
        const currentTime = new Date().getTime();
        
        // If the last message was more than 30 seconds ago and we're still loading,
        // assume something went wrong and reset the loading state
        if (lastMessageTime && (currentTime - lastMessageTime) > 30000) {
          console.log('Loading state appears to be stuck, resetting...');
          this.isLoading = false;
          this.cdr.markForCheck();
        }
      }
    }, 10000);
    
    // Add the clearInterval function to the subscription for cleanup
    this.subscription.add(() => {
      clearInterval(intervalId);
    });
  }
  
  // Helper method to get the timestamp of the last message
  private getLastMessageTime(): number | null {
    if (!this.currentChat?.messages || this.currentChat.messages.length === 0) {
      return null;
    }
    
    const lastMessage = this.currentChat.messages[this.currentChat.messages.length - 1];
    return lastMessage.timestamp ? new Date(lastMessage.timestamp).getTime() : null;
  }
  
  ngOnDestroy(): void {
    // Clear all subscriptions
    this.subscription.unsubscribe();
    
    // Ensure loading state is reset when component is destroyed
    if (this.isLoading) {
      console.log('Component being destroyed while loading, resetting loading state');
      this.isLoading = false;
      
      // If there's an active chat, update it to ensure any in-progress messages are marked as complete
      if (this.currentChat && this.currentChat.messages && this.currentChat.messages.length > 0) {
        const lastMessage = this.currentChat.messages[this.currentChat.messages.length - 1];
        if (lastMessage && !lastMessage.isComplete) {
          console.log('Marking incomplete message as complete on component destroy');
          // We can't directly call updateMessage since it's private
          // Instead, send a new message to trigger the end of the current one
          this.sendMessage('');
        }
      }
    }
  }
  
  scrollToBottom(): void {
    try {
      this.messagesContainer.nativeElement.scrollTop = this.messagesContainer.nativeElement.scrollHeight;
    } catch (err) {
      console.error('Error scrolling to bottom:', err);
    }
  }
  
  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }
  
  isLastMessage(message: Message): boolean {
    return message === this.currentChat?.messages[this.currentChat.messages.length - 1];
  }
  
  onEnterKey(event: Event): void {
    // Cast the event to KeyboardEvent to access keyboard-specific properties
    const keyboardEvent = event as KeyboardEvent;
    
    if (keyboardEvent.shiftKey) return;
    event.preventDefault();
    if (this.newMessage.trim()) {
      this.sendMessage(this.newMessage);
      this.newMessage = '';
    }
  }
  
  sendMessage(message: string): void {
    if (!message.trim()) return;
    this.chatService.sendMessage(message);
    this.shouldScrollToBottom = true;
  }
}
