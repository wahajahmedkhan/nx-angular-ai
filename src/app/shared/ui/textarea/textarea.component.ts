import { Component, Input, ElementRef, forwardRef, ViewChild, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-textarea',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="w-full">
      <label 
        *ngIf="label" 
        [for]="id" 
        class="block text-sm font-medium mb-1 text-[var(--techwave-heading-color)]"
      >
        {{ label }}
      </label>
      
      <div class="relative">
        <textarea
          #textareaElement
          [id]="id"
          [rows]="rows"
          [placeholder]="placeholder"
          [disabled]="disabled"
          [(ngModel)]="value"
          (ngModelChange)="onInputChange($event)"
          (blur)="onBlur()"
          (keydown)="onKeyDown($event)"
          class="w-full py-3 px-4 rounded-full bg-[var(--techwave-some-r-bg-color)] border-2 border-[var(--techwave-border-color)] text-[var(--techwave-heading-color)] focus:outline-none focus:border-[var(--techwave-main-color)] transition-all duration-300 ease-in-out disabled:opacity-60 placeholder:text-[var(--techwave-body-color)] resize-none overflow-auto"
        ></textarea>
      </div>
      
      <p *ngIf="hint" class="mt-2 text-xs text-[var(--techwave-body-color)]">
        {{ hint }}
      </p>
    </div>
  `,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => TextareaComponent),
      multi: true
    }
  ]
})
export class TextareaComponent implements ControlValueAccessor, OnInit {
  @Input() label = '';
  @Input() placeholder = '';
  @Input() hint = '';
  @Input() rows = 1;
  @Input() id = `textarea-${Math.random().toString(36).substring(2, 9)}`;
  @Input() disabled = false;
  @Input() maxHeight = '200px';
  @Input() autoResize = true;
  
  @ViewChild('textareaElement') textareaRef!: ElementRef<HTMLTextAreaElement>;
  
  value = '';
  
  // ControlValueAccessor implementation
  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};
  
  ngOnInit(): void {
    if (this.autoResize) {
      // Set the initial maxHeight style
      setTimeout(() => {
        if (this.textareaRef?.nativeElement) {
          this.textareaRef.nativeElement.style.maxHeight = this.maxHeight;
        }
      });
    }
  }
  
  writeValue(value: string): void {
    this.value = value || '';
    
    // Resize on value change
    setTimeout(() => this.autoResizeTextarea());
  }
  
  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }
  
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }
  
  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }
  
  // Event handlers
  onInputChange(value: string): void {
    this.onChange(value);
    this.autoResizeTextarea();
  }
  
  onBlur(): void {
    this.onTouched();
  }
  
  onKeyDown(event: KeyboardEvent): void {
    // Handle shift+enter for new line
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      // Execute only if there's content to send
      if (this.value.trim()) {
        // We'll emit a custom event to parent component
        // This is just a placeholder, actual logic will be in the parent
        this.onChange(this.value);
        this.value = '';
        this.writeValue('');
      }
    }
  }
  
  private autoResizeTextarea(): void {
    if (!this.autoResize || !this.textareaRef?.nativeElement) return;
    
    const textarea = this.textareaRef.nativeElement;
    
    // Reset height temporarily to get the correct scrollHeight
    textarea.style.height = 'auto';
    
    // Set the new height based on content
    const scrollHeight = textarea.scrollHeight;
    textarea.style.height = scrollHeight + 'px';
  }
}