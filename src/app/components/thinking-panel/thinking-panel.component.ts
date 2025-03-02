import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { ChatService } from '../../services/chat.service';

@Component({
  selector: 'app-thinking-panel',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="h-full flex flex-col bg-light-surface dark:bg-dark-surface border-r border-light-border dark:border-dark-border">
      <div class="p-4 border-b border-light-border dark:border-dark-border">
        <h2 class="text-lg font-medium text-light-text dark:text-dark-text">Thinking</h2>
        <p class="text-sm text-gray-500 dark:text-gray-400">
          Watch the AI assistant's thought process
        </p>
      </div>
      
      <div class="flex-1 overflow-y-auto scrollbar-thin p-4">
        <div *ngIf="thinkingSteps.length === 0" class="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
          <p>No thinking steps yet</p>
          <p class="mt-2">Ask a question to see how the AI responds</p>
        </div>
        
        <div *ngIf="thinkingSteps.length > 0" class="space-y-3">
          <div 
            *ngFor="let step of thinkingSteps; let i = index" 
            class="bg-light-card dark:bg-dark-card rounded-lg p-3 border border-light-border dark:border-dark-border"
            [class.animate-pulse]="i === thinkingSteps.length - 1"
          >
            <div class="flex items-center">
              <div class="h-5 w-5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 flex items-center justify-center text-xs font-semibold mr-2">
                {{ i + 1 }}
              </div>
              <p class="text-sm text-light-text dark:text-dark-text">{{ step }}</p>
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
  `]
})
export class ThinkingPanelComponent implements OnInit, OnDestroy {
  thinkingSteps: string[] = [];
  private subscription = new Subscription();
  
  constructor(private chatService: ChatService) {}
  
  ngOnInit(): void {
    // Subscribe to thinking steps
    this.subscription.add(
      this.chatService.thinking$.subscribe(step => {
        if (step) {
          this.thinkingSteps.push(step);
        }
      })
    );
    
    // Clear thinking steps when a new message stream starts
    this.subscription.add(
      this.chatService.messageChunks$.subscribe(chunk => {
        if (chunk.type === 'start') {
          this.thinkingSteps = [];
        }
      })
    );
  }
  
  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
}