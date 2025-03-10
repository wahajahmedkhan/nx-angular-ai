import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-button',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button
      [disabled]="disabled"
      [class]="buttonClasses"
      (click)="onClick.emit($event)"
      [type]="type"
      [ngClass]="{
        'danger-hover': variant === 'danger',
        'outline-hover': variant === 'outline',
        'primary-hover': variant === 'primary'
      }"
    >
      <ng-content></ng-content>
    </button>
  `,
  styles: [`
    :host {
      display: inline-block;
    }
    
    button {
      font-family: var(--techwave-heading-font-family);
      font-size: 14px;
      letter-spacing: .5px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.3s ease;
      border-radius: 20px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      position: relative;
      overflow: hidden;
      
      &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
      
      &:focus {
        outline: none;
      }
      
      &:hover {
        box-shadow: 0px 5px 15px var(--techwave-main-color1);
        opacity: 0.95;
      }
      
      &::before {
        right: 0;
        bottom: 0;
        top: 0;
        left: 0;
        position: absolute;
        color: var(--techwave-main-color1);
        content: '';
        opacity: .1;
        border-radius: 20px;
        box-shadow: 0px 5px 15px;
      }
      
      &::after {
        content: "";
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        border-radius: 20px;
        border: 2px solid transparent;
        background: linear-gradient(270deg, var(--techwave-main-color1), var(--techwave-main-color2), var(--techwave-main-color1), var(--techwave-main-color2));
        background-size: 300% 300%;
        animation: animatedgradient 4s ease alternate infinite;
        opacity: 0;
        transition: opacity 0.3s ease;
      }
      
      &:hover::after {
        opacity: 1;
      }
    }
    
    .primary-hover {
      &:hover {
        opacity: 0.7 !important;
      }
      
      &:hover::after {
        opacity: 0.5 !important;
      }
    }
    
    .outline-hover {
      &:hover {
        opacity: 0.7 !important;
      }
      
      &::before {
        opacity: .05 !important;
      }
      
      &:hover::after {
        opacity: 0.4 !important;
      }
    }
    
    .danger-hover {
      &:hover {
        box-shadow: 0px 5px 15px rgba(220, 38, 38, 0.6) !important;
        opacity: 0.7 !important;
      }
      
      &::before {
        color: rgba(220, 38, 38, 0.8) !important;
      }
      
      &:hover::after {
        background: linear-gradient(270deg, #dc2626, #ef4444, #dc2626, #ef4444) !important;
        opacity: 0.4 !important;
      }
    }
  `]
})
export class ButtonComponent {
  @Input() variant: 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger' = 'primary';
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
  @Input() disabled = false;
  @Input() type: 'button' | 'submit' | 'reset' = 'button';
  @Input() fullWidth = false;

  @Output() onClick = new EventEmitter<MouseEvent>();

  get buttonClasses(): string {
    const baseClasses = 'inline-flex items-center justify-center';
    const variantClasses = {
      primary: 'bg-primary-600 text-white',
      secondary: 'bg-[var(--techwave-some-r-bg-color)] text-[var(--techwave-heading-color)]',
      ghost: 'bg-transparent text-[var(--techwave-heading-color)]',
      outline: 'bg-transparent border-2 border-[var(--techwave-border-color)] text-[var(--techwave-heading-color)]',
      danger: 'bg-red-600 text-white'
    };

    const sizeClasses = {
      sm: 'px-3 py-1 h-8 text-xs',
      md: 'px-6 py-2 h-10 text-sm',
      lg: 'px-8 py-3 h-12 text-base'
    };

    const widthClass = this.fullWidth ? 'w-full' : '';

    return `${baseClasses} ${variantClasses[this.variant]} ${sizeClasses[this.size]} ${widthClass}`;
  }
}