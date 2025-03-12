import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThinkingPanelComponent } from '../thinking-panel/thinking-panel.component';
import { ChatAreaComponent } from '../chat-area/chat-area.component';
import { ChatHistoryComponent } from '../chat-history/chat-history.component';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-chat-layout',
  standalone: true,
  imports: [CommonModule, ThinkingPanelComponent, ChatAreaComponent, ChatHistoryComponent],
  templateUrl: './chat-layout.component.html',
  styleUrls: ['./chat-layout.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
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