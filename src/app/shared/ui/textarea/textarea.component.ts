import { Component, Input, ElementRef, forwardRef, ViewChild, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-textarea',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './textarea.component.html',
  styleUrls: ['./textarea.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
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
  
  constructor(private cdr: ChangeDetectorRef) {}
  
  // ControlValueAccessor implementation
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private onChange = (_value: string): void => { /* no-op */ };
  private onTouched = (): void => { /* no-op */ };
  
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
    setTimeout(() => {
      this.autoResizeTextarea();
      this.cdr.markForCheck();
    });
  }
  
  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }
  
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }
  
  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
    this.cdr.markForCheck();
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
        this.cdr.markForCheck();
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