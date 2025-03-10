import { Route } from '@angular/router';
import { SignInComponent } from './components/auth/sign-in/sign-in.component';
import { SignUpComponent } from './components/auth/sign-up/sign-up.component';
import { ChatLayoutComponent } from './components/chat-layout/chat-layout.component';

export const appRoutes: Route[] = [

  { 
    path: '', 
    redirectTo: 'sign-in', 
    pathMatch: 'full'

   }, 

  { 
    path: 'sign-in', 
    component: SignInComponent 
  },

  { 
    path: 'sign-up', 
    component: SignUpComponent 
  },

  { 
    path: '**', 
    redirectTo: 'sign-in' 
  }, 
  
  {
    path: '',
    component: ChatLayoutComponent,
    children: [
      {
        path: 'chat-layout',
        component: ChatLayoutComponent
      },
            
    ]
  },
  // {
  //   path: '',
  //   component: ChatLayoutComponent
  // },
  // {
  //   path: '**',
  //   redirectTo: ''
  // }
];
