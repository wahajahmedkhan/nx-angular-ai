import { Component, inject, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-sign-in',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './sign-in.component.html',
  styleUrls: ['./sign-in.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SignInComponent {
  loginData = {
    email: '',
    password: ''
  };
  
  isLoading = false;
  errorMessage = '';
  successMessage = '';
  router = inject(Router);
  
  constructor(
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}
  
  onSubmit() {
    // Reset messages
    this.errorMessage = '';
    this.successMessage = '';
    
    // Validate email
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(this.loginData.email)) {
      this.errorMessage = 'Please enter a valid email address';
      this.cdr.markForCheck();
      return;
    }
    
    // Validate password length
    if (this.loginData.password.length < 6) {
      this.errorMessage = 'Password must be at least 6 characters long';
      this.cdr.markForCheck();
      return;
    }
    
    // Set loading state
    this.isLoading = true;
    this.cdr.markForCheck();
    
    // Call login service
    this.authService.login(this.loginData.email, this.loginData.password)
      .subscribe({
        next: (response) => {
          console.log('API Response:', response);
          this.isLoading = false;
          
          if (response.token) {
            this.successMessage = 'Login successful! Redirecting...';
            
            // Navigate to chat-layout after successful login
            setTimeout(() => {
              this.router.navigate(['/chat-layout']);
            }, 1000); // Small delay for better UX
          } else {
            this.errorMessage = response.message || 'Login failed';
          }
          this.cdr.markForCheck();
        },
        error: (error) => {
          this.isLoading = false;
          if (error.status === 0) {
            this.errorMessage = 'Cannot connect to the server. Please check your internet connection.';
          } else if (error.error && error.error.message) {
            this.errorMessage = error.error.message;
          } else {
            this.errorMessage = 'Login failed. Please check your credentials and try again.';
          }
          console.error('Login error:', error);
          this.cdr.markForCheck();
        }
      });
  }
}
