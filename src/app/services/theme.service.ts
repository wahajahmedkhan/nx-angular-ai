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
    } else {
      document.documentElement.classList.remove('dark');
    }
  }
}