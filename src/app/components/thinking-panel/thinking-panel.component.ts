import { Component, OnInit, OnDestroy, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { ChatService } from '../../services/chat.service';
import { AgentReasoningStep } from '../../models/interfaces';

@Component({
  selector: 'app-thinking-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './thinking-panel.component.html',
  styleUrls: ['./thinking-panel.component.scss']
})
export class ThinkingPanelComponent implements OnInit, OnDestroy {
  reasoningSteps: AgentReasoningStep[] = [];
  isComplete = false;
  private subscription = new Subscription();
  private currentChatId: string | null = null;
  
  constructor(private chatService: ChatService) {
    // Use effect to react to changes in the current chat
    effect(() => {
      const currentChat = this.chatService.currentChat();
      // If the chat ID changed, update the reasoning steps
      if (currentChat && currentChat.id !== this.currentChatId) {
        this.currentChatId = currentChat.id;
        
        // Load reasoning steps from the current chat if available
        if (currentChat.reasoningSteps && currentChat.reasoningSteps.length > 0) {
          this.reasoningSteps = [...currentChat.reasoningSteps];
          this.isComplete = true;
        } else {
          this.reasoningSteps = [];
          this.isComplete = false;
        }
      } else if (!currentChat) {
        this.currentChatId = null;
        this.reasoningSteps = [];
        this.isComplete = false;
      }
    });
  }
  
  ngOnInit(): void {
    // Load any existing reasoning steps from the current chat
    const currentChat = this.chatService.currentChat();
    if (currentChat && currentChat.reasoningSteps && currentChat.reasoningSteps.length > 0) {
      this.reasoningSteps = [...currentChat.reasoningSteps];
      this.isComplete = true;
    }
    
    // Subscribe to thinking steps
    this.subscription.add(
      this.chatService.thinking$.subscribe(step => {
        if (step) {
          // Add the step to the local array
          this.reasoningSteps.push(step);
          
          // Update the active chat with the latest reasoning steps
          const currentChat = this.chatService.currentChat();
          if (currentChat) {
            // Update the active chat in the chat service
            this.chatService.updateReasoningSteps(this.reasoningSteps);
          }
        }
      })
    );
    
    // Clear thinking steps when a new message stream starts
    this.subscription.add(
      this.chatService.messageChunks$.subscribe(chunk => {
        if (chunk.type === 'start') {
          this.reasoningSteps = [];
          this.isComplete = false;
          
          // Clear reasoning steps in the active chat as well
          this.chatService.updateReasoningSteps([]);
        } else if (chunk.type === 'end') {
          this.isComplete = true;
        }
      })
    );
  }
  
  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
}