import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThinkingPanelComponent } from '../thinking-panel/thinking-panel.component';
import { ChatAreaComponent } from '../chat-area/chat-area.component';
import { ChatHistoryComponent } from '../chat-history/chat-history.component';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-chat-layout',
  standalone: true,
  imports: [CommonModule, ThinkingPanelComponent, ChatAreaComponent, ChatHistoryComponent],
  template: `
    <div class="flex flex-col h-full overflow-hidden">
      <!-- Navbar -->
      <nav class="bg-[var(--techwave-header-bg-color)] border-b border-[var(--techwave-border-color)] p-3 flex justify-between items-center">
        <div class="flex items-center">
          <h1 class="text-xl font-semibold text-[var(--techwave-heading-color)]">AI Chat</h1>
        </div>
        <div class="flex items-center gap-4">
          <span class="text-[var(--techwave-text-color)]">{{ userEmail }}</span>
          <button 
            class="px-4 py-2 rounded-md bg-red-500 hover:bg-red-600 text-white transition-colors"
            (click)="logout()"
          >
            Logout
          </button>
        </div>
      </nav>

      <div class="flex flex-1 overflow-hidden">
        <!-- Left Sidebar - Thinking -->
        <div class="w-[25%] hidden lg:block border-r border-[var(--techwave-border-color)] bg-[var(--techwave-some-r-bg-color)]">
          <app-thinking-panel></app-thinking-panel>
        </div>
        
        <!-- Main Chat Area - Wider on medium screens, full on mobile -->
        <div class="flex-1 flex flex-col bg-[var(--techwave-site-bg-color)]">
          <!-- Mobile Header for top navigation -->
          <div class="flex items-center justify-between p-3 border-b border-[var(--techwave-border-color)] bg-[var(--techwave-header-bg-color)] lg:hidden">
            <h2 class="text-lg font-medium text-[var(--techwave-heading-color)] px-2">AI Chat</h2>
            <div class="flex gap-3">
              <button 
                class="px-4 py-2 text-sm rounded-full bg-[var(--techwave-some-a-bg-color)] text-[var(--techwave-heading-color)] border border-[var(--techwave-border-color)]"
                (click)="toggleMobileView('thinking')"
              >
                💭 Thinking
              </button>
              <button 
                class="px-4 py-2 text-sm rounded-full bg-[var(--techwave-some-a-bg-color)] text-[var(--techwave-heading-color)] border border-[var(--techwave-border-color)]"
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
        <div class="w-72 hidden lg:block border-l border-[var(--techwave-border-color)] bg-[var(--techwave-some-r-bg-color)]">
          <app-chat-history></app-chat-history>
        </div>
        
        <!-- Mobile View Overlays with slide-in animation -->
        <div 
          *ngIf="mobileView === 'thinking'" 
          class="fixed inset-0 z-50 lg:hidden bg-black bg-opacity-50"
        >
          <div class="absolute left-0 top-0 h-full w-[80%] max-w-md bg-[var(--techwave-some-r-bg-color)] transform transition-transform duration-300 ease-in-out shadow-xl">
            <div class="flex justify-between items-center p-4 border-b border-[var(--techwave-border-color)]">
              <h2 class="text-lg font-medium text-[var(--techwave-heading-color)]">Thinking Process</h2>
              <button 
                class="p-2 rounded-full text-[var(--techwave-heading-color)] hover:bg-[var(--techwave-some-a-bg-color)]"
                (click)="closeMobileView()"
              >
                ✕
              </button>
            </div>
            <div class="h-[calc(100%-65px)] overflow-auto">
              <app-thinking-panel></app-thinking-panel>
            </div>
          </div>
        </div>
        
        <div 
          *ngIf="mobileView === 'history'" 
          class="fixed inset-0 z-50 lg:hidden bg-black bg-opacity-50"
        >
          <div class="absolute right-0 top-0 h-full w-5/6 max-w-sm bg-[var(--techwave-some-r-bg-color)] transform transition-transform duration-300 ease-in-out shadow-xl">
            <div class="flex justify-between items-center p-4 border-b border-[var(--techwave-border-color)]">
              <h2 class="text-lg font-medium text-[var(--techwave-heading-color)]">Previous Chats</h2>
              <button 
                class="p-2 rounded-full text-[var(--techwave-heading-color)] hover:bg-[var(--techwave-some-a-bg-color)]"
                (click)="closeMobileView()"
              >
                ✕
              </button>
            </div>
            <div class="h-[calc(100%-65px)] overflow-auto">
              <app-chat-history></app-chat-history>
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
export class ChatLayoutComponent {
  mobileView: 'chat' | 'thinking' | 'history' = 'chat';
  userEmail: string | null = null;
  
  constructor(private authService: AuthService) {
    this.userEmail = this.authService.getUserEmail();
  }
  
  toggleMobileView(view: 'thinking' | 'history'): void {
    this.mobileView = this.mobileView === view ? 'chat' : view;
  }
  
  closeMobileView(): void {
    this.mobileView = 'chat';
  }
  
  logout(): void {
    this.authService.logout();
  }
}