import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-button',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './button.component.html',
  styleUrls: ['./button.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ButtonComponent {
  @Input() variant: 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger' = 'primary';
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
  @Input() disabled = false;
  @Input() type: 'button' | 'submit' | 'reset' = 'button';
  @Input() fullWidth = false;

  @Output() clicked = new EventEmitter<MouseEvent>();
  @Output() buttonClick = new EventEmitter<MouseEvent>();

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