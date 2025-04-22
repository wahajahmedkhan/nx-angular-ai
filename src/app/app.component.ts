import { Component, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ThemeService } from './services/theme.service';
import { VERSION } from '../version';

// Define interface for version info
interface AppVersionInfo {
  buildId: string;
  timestamp: string;
}

// Extend Window interface
declare global {
  interface Window {
    appVersion?: AppVersionInfo;
  }
}

@Component({
  standalone: true,
  imports: [RouterModule, CommonModule],
  selector: 'app-root',
  template: `<router-outlet />`,
  styles: [`:host { display: block; height: 100vh; }`],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent implements OnInit {
  title = 'AI Chat';
  
  constructor(private themeService: ThemeService) {
    // Initialize theme service
  }

  ngOnInit() {
    // Log version info for debugging cache issues
    console.log(`App Version: ${VERSION.buildId}`);
    console.log(`Build Time: ${VERSION.timestamp}`);
    
    // Add version to window object for runtime checks
    (window as any).appVersion = VERSION;
  }
}
