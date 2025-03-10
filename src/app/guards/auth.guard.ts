import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

// Guard for protected routes - only allows authenticated users
export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isLoggedIn()) {
    return true;
  }

  // Redirect to the login page
  return router.parseUrl('/sign-in');
};

// Guard for auth pages - prevents authenticated users from accessing login/signup
export const publicGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isLoggedIn()) {
    return true;
  }

  // Redirect to chat layout if already logged in
  return router.parseUrl('/chat-layout');
};
