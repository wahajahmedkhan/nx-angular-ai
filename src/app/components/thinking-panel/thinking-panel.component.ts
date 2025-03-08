import { Component, OnInit, OnDestroy, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { ChatService } from '../../services/chat.service';
import { AgentReasoningStep } from '../../models/interfaces';

@Component({
  selector: 'app-thinking-panel',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="h-full flex flex-col bg-[var(--techwave-some-r-bg-color)]">
      <div class="p-4 border-b border-[var(--techwave-border-color)]">
        <h2 class="text-lg font-medium text-[var(--techwave-heading-color)]">Reasoning Process</h2>
        <p class="text-sm text-[var(--techwave-body-color)]">
          Watch how the AI processes your question
        </p>
      </div>
      
      <div class="flex-1 overflow-y-auto scrollbar-thin p-4">
        <div *ngIf="reasoningSteps.length === 0" class="text-center py-8 text-[var(--techwave-body-color)] text-sm">
          <p>No reasoning steps yet</p>
          <p class="mt-2">Ask a question to see how the AI processes it</p>
        </div>
        
        <div *ngIf="reasoningSteps.length > 0" class="space-y-4">
          <div 
            *ngFor="let step of reasoningSteps; let i = index" 
            class="bg-[var(--techwave-card-bg-color)] rounded-lg p-4 border border-[var(--techwave-border-color)]"
            [class.animate-pulse]="i === reasoningSteps.length - 1 && !isComplete"
          >
            <div class="flex flex-col gap-3">
              <!-- Agent Name with Badge -->
              <div class="flex items-center">
                <div class="h-8 w-8 rounded-full bg-gradient-to-r from-amber-300 to-amber-500 dark:from-amber-700 dark:to-amber-900 text-amber-900 dark:text-amber-100 flex items-center justify-center text-xs font-semibold mr-3">
                  {{ i + 1 }}
                </div>
                <h3 class="text-md font-medium text-[var(--techwave-heading-color)]">{{ step.agentName }}</h3>
              </div>
              
              <!-- Instructions if available -->
              <div *ngIf="step.instructions" class="ml-2">
                <h4 class="text-xs uppercase tracking-wider text-[var(--techwave-body-color)] font-semibold mb-2">INSTRUCTIONS:</h4>
                <div class="text-sm text-[var(--techwave-heading-color)] bg-[var(--techwave-some-a-bg-color)] p-3 rounded border border-[var(--techwave-border-color)] whitespace-pre-line">
                  {{ step.instructions }}
                </div>
              </div>
              
              <!-- Messages if available -->
              <div *ngIf="step.messages && step.messages.length > 0" class="ml-2">
                <h4 class="text-xs uppercase tracking-wider text-[var(--techwave-body-color)] font-semibold mb-2">REASONING:</h4>
                <div class="space-y-3">
                  <div 
                    *ngFor="let message of step.messages" 
                    class="text-sm text-[var(--techwave-heading-color)] bg-[var(--techwave-some-a-bg-color)] p-3 rounded border border-[var(--techwave-border-color)] whitespace-pre-line"
                  >
                    {{ message }}
                  </div>
                </div>
              </div>
              
              <!-- Next agent if available -->
              <div *ngIf="step.next" class="ml-2 mt-1">
                <div class="flex items-center">
                  <span class="text-xs uppercase tracking-wider text-[var(--techwave-body-color)] font-semibold mr-2">NEXT:</span>
                  <span class="text-sm font-medium text-[var(--techwave-heading-color)] bg-[var(--techwave-some-a-bg-color)] px-2 py-1 rounded">{{ step.next }}</span>
                </div>
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
      height: 100%;
    }
    
    /* Ensure pre-line whitespace is preserved */
    .whitespace-pre-line {
      white-space: pre-line;
    }
  `]
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