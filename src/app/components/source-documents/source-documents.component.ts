import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { ChatService } from '../../services/chat.service';
import { SourceDocument } from '../../models/interfaces';

// Interface for enhanced document with properties
interface EnhancedDocument {
  original: SourceDocument;
  title: string;
  shortTitle: string;
}

// Extended SourceDocument with additional properties
interface ExtendedSourceDocument {
  pageContent: string;
  metadata: Record<string, unknown>;
  title: string;
  author: string;
  lineRange: string | null;
}

@Component({
  selector: 'app-source-documents',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './source-documents.component.html',
  styleUrls: ['./source-documents.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SourceDocumentsComponent implements OnInit, OnDestroy {
  sourceDocuments: SourceDocument[] = [];
  sourceDocumentsWithProps: EnhancedDocument[] = [];
  selectedDocument: ExtendedSourceDocument | null = null;
  
  // Selected document properties for modal view
  selectedDocumentTitle = '';
  selectedDocumentAuthor = '';
  selectedDocumentMetadata: string | null = null;
  selectedDocumentLineRange: string | null = null;
  hasMetadata = false;
  hasLineRange = false;
  
  private subscription = new Subscription();
  
  constructor(
    private chatService: ChatService,
    private cdr: ChangeDetectorRef
  ) {}
  
  ngOnInit(): void {
    // Subscribe to source documents from the chat service
    this.subscription.add(
      this.chatService.sourceDocuments$.subscribe(docs => {
        if (docs && docs.length > 0) {
          console.log('Received source documents:', docs);
          this.sourceDocuments = docs;
          this.prepareDocumentData();
          this.cdr.markForCheck();
        }
      })
    );
    
    // Load any existing source documents from the current chat
    const currentChat = this.chatService.currentChat();
    if (currentChat && currentChat.sourceDocuments && currentChat.sourceDocuments.length > 0) {
      console.log('Loaded source documents from current chat:', currentChat.sourceDocuments);
      this.sourceDocuments = [...currentChat.sourceDocuments];
      this.prepareDocumentData();
      this.cdr.markForCheck();
    }
  }
  
  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
  
  openModal(doc: SourceDocument): void {
    console.log('Opening modal for document:', doc);
    
    // Create extended document with additional properties
    this.selectedDocument = {
      pageContent: doc.pageContent,
      metadata: doc.metadata || {},
      title: this.getFullTitle(doc),
      author: this.getAuthor(doc),
      lineRange: this.getLineRange(doc)
    };
    
    // Set selected document properties for display
    this.selectedDocumentTitle = this.getFullTitle(doc);
    this.selectedDocumentAuthor = this.getAuthor(doc);
    
    const metadataDisplay = this.getMetadataDisplay(doc);
    this.selectedDocumentMetadata = metadataDisplay;
    this.hasMetadata = !!metadataDisplay;
    
    const lineRange = this.getLineRange(doc);
    this.selectedDocumentLineRange = lineRange;
    this.hasLineRange = !!lineRange;
    
    this.cdr.markForCheck();
  }
  
  closeModal(): void {
    this.selectedDocument = null;
    this.cdr.markForCheck();
  }
  
  // Method to prepare all document data at once to avoid calling methods in template
  private prepareDocumentData(): void {
    this.sourceDocumentsWithProps = this.sourceDocuments.map(doc => ({
      original: doc,
      title: this.getFullTitle(doc),
      shortTitle: this.getShortTitle(doc)
    }));
  }
  
  // Private helper methods
  private getShortTitle(doc: SourceDocument): string {
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
  
  private getFullTitle(doc: SourceDocument): string {
    // Get the first key from metadata as the title
    const keys = Object.keys(doc.metadata || {});
    if (keys.length > 0) {
      return keys[0];
    }
    
    return 'Source Document';
  }
  
  private getAuthor(doc: SourceDocument): string {
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
  
  private getLineRange(doc: SourceDocument): string | null {
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
  
  private getMetadataDisplay(doc: SourceDocument): string | null {
    if (!doc.metadata) return null;
    
    // Filter out the title and author (first key-value pair) and format the rest
    const keys = Object.keys(doc.metadata);
    if (keys.length <= 1) return null; // Only title/author, no additional metadata
    
    const metadataObj: Record<string, unknown> = {};
    
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
