import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { Router } from '@angular/router';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  result: boolean;
  data?: string; // token
  message?: string;
  token?: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
}

export interface RegisterResponse {
  result: boolean;
  data?: string; // token
  message?: string;
  token?: string;
  id?: string; // user id for successful registration
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://135.181.181.121:3003/api/auth';
  
  constructor(private http: HttpClient, private router: Router) {}
  
  login(email: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, { email, password })
      .pipe(
        tap(response => {
          if (response.token) {
            // Store token in localStorage
            localStorage.setItem('token', response.token);
            
            // Store user email for future reference
            localStorage.setItem('loginUser', email);
          }
        })
      );
  }
  
  register(email: string, password: string): Observable<RegisterResponse> {
    return this.http.post<RegisterResponse>(`${this.apiUrl}/register`, { email, password })
      .pipe(
        tap(response => {
          if (response.id) {
            // Store user email for future reference
            localStorage.setItem('registeredEmail', email);
          }
        })
      );
  }
  
  logout(): void {
    // Remove user data from local storage
    localStorage.removeItem('token');
    localStorage.removeItem('loginUser');
    
    // Navigate to login page
    this.router.navigate(['/sign-in']);
  }
  
  isLoggedIn(): boolean {
    return !!localStorage.getItem('token');
  }
  
  getToken(): string | null {
    return localStorage.getItem('token');
  }
  
  getUserEmail(): string | null {
    return localStorage.getItem('loginUser');
  }
  
  getRegisteredEmail(): string | null {
    return localStorage.getItem('registeredEmail');
  }
}
