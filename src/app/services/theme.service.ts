import { Injectable, signal, effect, computed } from '@angular/core';
import { ThemeMode } from '../models/enums';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly THEME_KEY = 'ai-chat-theme';
  private themeSignal = signal<ThemeMode>(this.getInitialTheme());
  
  public theme = computed(() => this.themeSignal());
  public isDarkMode = computed(() => {
    const currentTheme = this.themeSignal();
    
    if (currentTheme === ThemeMode.System) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    
    return currentTheme === ThemeMode.Dark;
  });
  
  constructor() {
    effect(() => {
      this.applyTheme(this.isDarkMode());
      localStorage.setItem(this.THEME_KEY, this.themeSignal());
    });
    
    // Listen for OS theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
      if (this.themeSignal() === ThemeMode.System) {
        this.applyTheme(e.matches);
      }
    });
  }
  
  setTheme(theme: ThemeMode): void {
    this.themeSignal.set(theme);
  }
  
  toggleTheme(): void {
    const currentTheme = this.themeSignal();
    if (currentTheme === ThemeMode.Dark) {
      this.themeSignal.set(ThemeMode.Light);
    } else if (currentTheme === ThemeMode.Light) {
      this.themeSignal.set(ThemeMode.Dark);
    } else {
      // If system, toggle based on current computed value
      this.themeSignal.set(this.isDarkMode() ? ThemeMode.Light : ThemeMode.Dark);
    }
  }
  
  private getInitialTheme(): ThemeMode {
    const savedTheme = localStorage.getItem(this.THEME_KEY) as ThemeMode | null;
    
    if (savedTheme && Object.values(ThemeMode).includes(savedTheme)) {
      return savedTheme;
    }
    
    return ThemeMode.System;
  }
  
  private applyTheme(isDark: boolean): void {
    if (isDark) {
      document.documentElement.classList.add('dark');
      this.setCSSVariables({
        // Dark mode variables
        '--techwave-bg-color': '#121212',
        '--techwave-card-bg-color': '#1e1e1e',
        '--techwave-heading-color': '#ffffff',
        '--techwave-body-color': '#e0e0e0',
        '--techwave-muted-color': '#a0a0a0',
        '--techwave-border-color': '#333333',
        '--techwave-primary-color': '#8b5cf6',
        '--techwave-primary-hover-color': '#7c3aed',
        '--techwave-user-msg-bg-color': '#1a1a2e',
        '--techwave-assistant-msg-bg-color': '#1e1e2e',
        '--techwave-system-msg-bg-color': '#2d2d2d',
        '--techwave-input-bg-color': '#2d2d2d',
        '--techwave-input-text-color': '#e0e0e0',
        '--techwave-placeholder-color': '#a0a0a0',
        '--techwave-code-bg-color': '#2d2d2d',
        // Table specific variables for dark mode
        '--techwave-table-header-bg-color': '#2d2d2d',
        '--techwave-table-header-text-color': '#ffffff',
        '--techwave-table-border-color': '#444444',
        '--techwave-table-row-alt-bg-color': '#1a1a1a',
        '--techwave-table-row-hover-bg-color': '#333333'
      });
    } else {
      document.documentElement.classList.remove('dark');
      this.setCSSVariables({
        // Light mode variables
        '--techwave-bg-color': '#f8f9fa',
        '--techwave-card-bg-color': '#ffffff',
        '--techwave-heading-color': '#111827',
        '--techwave-body-color': '#374151',
        '--techwave-muted-color': '#6b7280',
        '--techwave-border-color': '#e5e7eb',
        '--techwave-primary-color': '#8b5cf6',
        '--techwave-primary-hover-color': '#7c3aed',
        '--techwave-user-msg-bg-color': '#f3f4f6',
        '--techwave-assistant-msg-bg-color': '#f8f9fa',
        '--techwave-system-msg-bg-color': '#f3f4f6',
        '--techwave-input-bg-color': '#ffffff',
        '--techwave-input-text-color': '#374151',
        '--techwave-placeholder-color': '#9ca3af',
        '--techwave-code-bg-color': '#f3f4f6',
        // Table specific variables for light mode
        '--techwave-table-header-bg-color': '#f3f4f6',
        '--techwave-table-header-text-color': '#111827',
        '--techwave-table-border-color': '#e5e7eb',
        '--techwave-table-row-alt-bg-color': '#f9fafb',
        '--techwave-table-row-hover-bg-color': '#f3f4f6'
      });
    }
  }
  
  private setCSSVariables(variables: Record<string, string>): void {
    Object.entries(variables).forEach(([property, value]) => {
      document.documentElement.style.setProperty(property, value);
    });
  }
}