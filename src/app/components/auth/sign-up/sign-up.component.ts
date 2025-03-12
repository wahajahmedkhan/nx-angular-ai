import { Component, inject, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-sign-up',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './sign-up.component.html',
  styleUrls: ['./sign-up.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SignUpComponent {
  registerData = {
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
    if (!emailRegex.test(this.registerData.email)) {
      this.errorMessage = 'Please enter a valid email address';
      this.cdr.markForCheck();
      return;
    }
    
    // Validate password length
    if (this.registerData.password.length < 6) {
      this.errorMessage = 'Password must be at least 6 characters long';
      this.cdr.markForCheck();
      return;
    }
    
    // Set loading state
    this.isLoading = true;
    this.cdr.markForCheck();
    
    // Call register service
    this.authService.register(this.registerData.email, this.registerData.password)
      .subscribe({
        next: (response) => {
          console.log('API Response:', response);
          this.isLoading = false;
          
          if (response.id) {
            this.successMessage = 'Registration successful! Redirecting to login...';
            
            // Navigate to sign-in after successful registration
            setTimeout(() => {
              this.router.navigate(['/sign-in']);
            }, 2000); // Small delay for better UX
          } else {
            this.errorMessage = response.message || 'Registration failed';
          }
          this.cdr.markForCheck();
        },
        error: (error) => {
          this.isLoading = false;
          console.error('Registration error:', error);
          
          if (error.status === 0) {
            this.errorMessage = 'Cannot connect to the server. Please check your internet connection.';
          } else if (error.status === 500) {
            this.errorMessage = 'Internal server error. Please try again later.';
          } else if (error.error && error.error.message) {
            this.errorMessage = error.error.message;
          } else if (error.message) {
            this.errorMessage = error.message;
          } else {
            this.errorMessage = 'Registration failed. Please try again.';
          }
          this.cdr.markForCheck();
        }
      });
  }
}
