import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { ChatService } from '../../services/chat.service';
import { SourceDocument } from '../../models/interfaces';

@Component({
  selector: 'app-source-documents',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="sourceDocuments.length > 0" class="mt-4">
      <div class="flex flex-wrap gap-2">
        <div 
          *ngFor="let doc of sourceDocuments" 
          class="relative inline-block"
        >
          <button
            (click)="openModal(doc)"
            (keydown.enter)="openModal(doc)"
            (keydown.space)="openModal(doc)"
            class="px-3 py-1.5 bg-amber-100 dark:bg-amber-900 text-amber-900 dark:text-amber-100 rounded-full text-sm font-medium hover:bg-amber-200 dark:hover:bg-amber-800 transition-colors"
            [title]="getFullTitle(doc)"
            tabindex="0"
            aria-label="View source document: {{ getFullTitle(doc) }}"
          >
            {{ getShortTitle(doc) }}
          </button>
        </div>
      </div>
      
      <!-- Modal -->
      <div 
        *ngIf="selectedDocument" 
        class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
        (click)="closeModal($event)"
        (keydown.escape)="closeModal()"
        tabindex="-1"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modalTitle"
      >
        <div 
          class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden"
          (click)="$event.stopPropagation()"
          role="document"
        >
          <div class="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <h3 id="modalTitle" class="text-lg font-semibold text-gray-900 dark:text-white">{{ getFullTitle(selectedDocument) }}</h3>
            <button 
              (click)="closeModal()"
              (keydown.enter)="closeModal()"
              class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              aria-label="Close modal"
              tabindex="0"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div class="p-4 overflow-y-auto max-h-[calc(80vh-8rem)]">
            <div class="mb-4">
              <h4 class="text-sm font-medium text-gray-500 dark:text-gray-400">Author</h4>
              <p class="text-gray-900 dark:text-white">{{ getAuthor(selectedDocument) }}</p>
            </div>
            <div class="mb-4" *ngIf="getMetadataDisplay(selectedDocument)">
              <h4 class="text-sm font-medium text-gray-500 dark:text-gray-400">Metadata</h4>
              <pre class="text-gray-900 dark:text-white text-sm bg-gray-100 dark:bg-gray-700 p-2 rounded">{{ getMetadataDisplay(selectedDocument) }}</pre>
            </div>
            <div class="mb-4">
              <h4 class="text-sm font-medium text-gray-500 dark:text-gray-400">Content</h4>
              <p class="text-gray-900 dark:text-white whitespace-pre-line">{{ selectedDocument.pageContent }}</p>
            </div>
            <div *ngIf="getLineRange(selectedDocument)">
              <h4 class="text-sm font-medium text-gray-500 dark:text-gray-400">Lines</h4>
              <p class="text-gray-900 dark:text-white">{{ getLineRange(selectedDocument) }}</p>
            </div>
          </div>
          <div class="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
            <button 
              (click)="closeModal()"
              (keydown.enter)="closeModal()"
              (keydown.space)="closeModal()"
              class="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              tabindex="0"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    /* Add any additional styles here */
  `]
})
export class SourceDocumentsComponent implements OnInit, OnDestroy {
  sourceDocuments: SourceDocument[] = [];
  selectedDocument: SourceDocument | null = null;
  private subscription = new Subscription();
  
  constructor(private chatService: ChatService) {}
  
  ngOnInit(): void {
    // Subscribe to source documents from the chat service
    this.subscription.add(
      this.chatService.sourceDocuments$.subscribe(docs => {
        if (docs && docs.length > 0) {
          console.log('Received source documents:', docs);
          this.sourceDocuments = docs;
        }
      })
    );
    
    // Load any existing source documents from the current chat
    const currentChat = this.chatService.currentChat();
    if (currentChat && currentChat.sourceDocuments && currentChat.sourceDocuments.length > 0) {
      console.log('Loaded source documents from current chat:', currentChat.sourceDocuments);
      this.sourceDocuments = [...currentChat.sourceDocuments];
    }
  }
  
  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
  
  openModal(doc: SourceDocument): void {
    console.log('Opening modal for document:', doc);
    this.selectedDocument = doc;
  }
  
  closeModal(event?: MouseEvent): void {
    this.selectedDocument = null;
  }
  
  getShortTitle(doc: SourceDocument): string {
    // Get the first key from metadata as the title
    const keys = Object.keys(doc.metadata || {});
    if (keys.length > 0) {
      const titleKey = keys[0];
      // Get the first few words of the title
      const words = titleKey.split(' ');
      return words.length > 3 ? words.slice(0, 3).join(' ') + '...' : titleKey;
    }
    
    return 'Source Document';
  }
  
  getFullTitle(doc: SourceDocument): string {
    // Get the first key from metadata as the title
    const keys = Object.keys(doc.metadata || {});
    if (keys.length > 0) {
      return keys[0];
    }
    
    return 'Source Document';
  }
  
  getAuthor(doc: SourceDocument): string {
    // Get the first key and its value from metadata as the author
    const keys = Object.keys(doc.metadata || {});
    if (keys.length > 0) {
      const titleKey = keys[0];
      if (doc.metadata && doc.metadata[titleKey]) {
        return doc.metadata[titleKey];
      }
    }
    
    return 'Unknown Author';
  }
  
  getLineRange(doc: SourceDocument): string | null {
    if (!doc.metadata) return null;
    
    // Handle nested loc structure
    if (doc.metadata['loc'] && 
        doc.metadata['loc']['lines'] && 
        doc.metadata['loc']['lines']['from'] !== undefined && 
        doc.metadata['loc']['lines']['to'] !== undefined) {
      const from = doc.metadata['loc']['lines']['from'];
      const to = doc.metadata['loc']['lines']['to'];
      
      return from === to ? `Line ${from}` : `Lines ${from} - ${to}`;
    } 
    // Handle flat loc structure
    else if (doc.metadata['loc.lines.from'] !== undefined && 
             doc.metadata['loc.lines.to'] !== undefined) {
      const from = doc.metadata['loc.lines.from'];
      const to = doc.metadata['loc.lines.to'];
      
      return from === to ? `Line ${from}` : `Lines ${from} - ${to}`;
    }
    
    return null;
  }
  
  getMetadataDisplay(doc: SourceDocument): string | null {
    if (!doc.metadata) return null;
    
    // Filter out the title and author (first key-value pair) and format the rest
    const keys = Object.keys(doc.metadata);
    if (keys.length <= 1) return null; // Only title/author, no additional metadata
    
    const metadataObj: Record<string, any> = {};
    
    // Skip the first key (title) and add the rest
    for (let i = 1; i < keys.length; i++) {
      const key = keys[i];
      // Skip loc.lines entries as they're displayed separately
      if (key !== 'loc.lines.from' && key !== 'loc.lines.to' && 
          !(key === 'loc' && doc.metadata[key] && doc.metadata[key]['lines'])) {
        metadataObj[key] = doc.metadata[key];
      }
    }
    
    // If no metadata left after filtering, return null
    if (Object.keys(metadataObj).length === 0) return null;
    
    return JSON.stringify(metadataObj, null, 2);
  }
}
