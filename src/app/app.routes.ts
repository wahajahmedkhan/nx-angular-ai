import { Route } from '@angular/router';
import { SignInComponent } from './components/auth/sign-in/sign-in.component';
import { SignUpComponent } from './components/auth/sign-up/sign-up.component';
import { ChatLayoutComponent } from './components/chat-layout/chat-layout.component';
import { authGuard, publicGuard } from './guards/auth.guard';

export const appRoutes: Route[] = [
  { 
    path: '', 
    redirectTo: 'sign-in', 
    pathMatch: 'full'
  }, 
  { 
    path: 'sign-in', 
    component: SignInComponent,
    canActivate: [publicGuard]
  },
  { 
    path: 'sign-up', 
    component: SignUpComponent,
    canActivate: [publicGuard]
  },
  { 
    path: 'chat-layout', 
    component: ChatLayoutComponent,
    canActivate: [authGuard]
  },
  { 
    path: '**', 
    redirectTo: 'sign-in' 
  }
];
