import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThinkingPanelComponent } from '../thinking-panel/thinking-panel.component';
import { ChatAreaComponent } from '../chat-area/chat-area.component';
import { ChatHistoryComponent } from '../chat-history/chat-history.component';

@Component({
  selector: 'app-chat-layout',
  standalone: true,
  imports: [CommonModule, ThinkingPanelComponent, ChatAreaComponent, ChatHistoryComponent],
  template: `
    <div class="flex h-full overflow-hidden">
      <!-- Left Sidebar - Thinking -->
      <div class="w-64 hidden lg:block border-r border-light-border dark:border-dark-border">
        <app-thinking-panel></app-thinking-panel>
      </div>
      
      <!-- Main Chat Area - Wider on medium screens, full on mobile -->
      <div class="flex-1 flex flex-col">
        <!-- Mobile Header for top navigation -->
        <div class="flex items-center justify-between p-2 border-b border-light-border dark:border-dark-border lg:hidden">
          <h2 class="text-lg font-medium text-light-text dark:text-dark-text px-2">AI Chat</h2>
          <div class="flex gap-2">
            <button 
              class="px-3 py-1 text-sm rounded-md bg-light-surface dark:bg-dark-surface text-light-text dark:text-dark-text border border-light-border dark:border-dark-border"
              (click)="toggleMobileView('thinking')"
            >
              💭 Thinking
            </button>
            <button 
              class="px-3 py-1 text-sm rounded-md bg-light-surface dark:bg-dark-surface text-light-text dark:text-dark-text border border-light-border dark:border-dark-border"
              (click)="toggleMobileView('history')"
            >
              📜 History
            </button>
          </div>
        </div>
        
        <!-- Main content area -->
        <div class="flex-1 overflow-hidden">
          <app-chat-area></app-chat-area>
        </div>
      </div>
      
      <!-- Right Sidebar - History -->
      <div class="w-64 hidden lg:block border-l border-light-border dark:border-dark-border">
        <app-chat-history></app-chat-history>
      </div>
      
      <!-- Mobile View Overlays with slide-in animation -->
      <div 
        *ngIf="mobileView === 'thinking'" 
        class="fixed inset-0 z-50 lg:hidden bg-black bg-opacity-40"
      >
        <div class="absolute left-0 top-0 h-full w-5/6 max-w-sm bg-light-background dark:bg-dark-background transform transition-transform duration-300 ease-in-out">
          <div class="flex justify-between items-center p-3 border-b border-light-border dark:border-dark-border">
            <h2 class="text-lg font-medium text-light-text dark:text-dark-text">Thinking Process</h2>
            <button 
              class="p-2 rounded-full hover:bg-light-card dark:hover:bg-dark-card"
              (click)="closeMobileView()"
            >
              ✕
            </button>
          </div>
          <div class="h-[calc(100%-60px)] overflow-auto">
            <app-thinking-panel></app-thinking-panel>
          </div>
        </div>
      </div>
      
      <div 
        *ngIf="mobileView === 'history'" 
        class="fixed inset-0 z-50 lg:hidden bg-black bg-opacity-40"
      >
        <div class="absolute right-0 top-0 h-full w-5/6 max-w-sm bg-light-background dark:bg-dark-background transform transition-transform duration-300 ease-in-out">
          <div class="flex justify-between items-center p-3 border-b border-light-border dark:border-dark-border">
            <h2 class="text-lg font-medium text-light-text dark:text-dark-text">Chat History</h2>
            <button 
              class="p-2 rounded-full hover:bg-light-card dark:hover:bg-dark-card"
              (click)="closeMobileView()"
            >
              ✕
            </button>
          </div>
          <div class="h-[calc(100%-60px)] overflow-auto">
            <app-chat-history></app-chat-history>
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
export class ChatLayoutComponent {
  mobileView: 'chat' | 'thinking' | 'history' = 'chat';
  
  toggleMobileView(view: 'thinking' | 'history'): void {
    this.mobileView = view;
  }
  
  closeMobileView(): void {
    this.mobileView = 'chat';
  }
}