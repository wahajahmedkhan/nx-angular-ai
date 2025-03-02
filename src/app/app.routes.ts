import { Route } from '@angular/router';
import { ChatLayoutComponent } from './components/chat-layout/chat-layout.component';

export const appRoutes: Route[] = [
  {
    path: '',
    component: ChatLayoutComponent
  },
  {
    path: '**',
    redirectTo: ''
  }
];
