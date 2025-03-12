import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ThemeService } from './services/theme.service';

@Component({
  standalone: true,
  imports: [RouterModule, CommonModule],
  selector: 'app-root',
  template: `<router-outlet />`,
  styles: [`:host { display: block; height: 100vh; }`]
})
export class AppComponent {
  title = 'AI Chat';
  
  constructor(private themeService: ThemeService) {
    // Initialize theme service
  }
}
