import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { ChatService } from '../../services/chat.service';
import { SourceDocument } from '../../models/chat.interfaces';

// Interface for enhanced document with properties
interface EnhancedDocument {
  original: SourceDocument;
  title: string;
  shortTitle: string;
  displayLabel: string;
}

// Extended SourceDocument with additional properties
interface ExtendedSourceDocument {
  pageContent: string;
  metadata: Record<string, unknown>;
  title: string;
  author: string;
  source: string;
  producer?: string;
  creationDate?: string;
  lineRange: string | null;
  formattedMetadata?: Record<string, unknown>;
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
  selectedDocumentSource = '';
  selectedDocumentProducer = '';
  selectedDocumentCreationDate = '';
  selectedDocumentMetadata: string | null = null;
  selectedDocumentLineRange: string | null = null;
  hasMetadata = false;
  hasLineRange = false;
  
  // For template usage
  metadataKeys: string[] = [];
  
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
    
    // Extract metadata
    const title = this.getFullTitle(doc);
    const author = this.getAuthor(doc);
    const source = this.getSource(doc);
    const producer = this.getProducer(doc);
    const creationDate = this.getCreationDate(doc);
    const lineRange = this.getLineRange(doc);
    const formattedMetadata = this.extractFormattedMetadata(doc);
    
    // Update metadata keys for template
    this.metadataKeys = Object.keys(formattedMetadata);
    
    // Create extended document with additional properties
    this.selectedDocument = {
      pageContent: doc.pageContent,
      metadata: doc.metadata || {},
      title: title,
      author: author,
      source: source,
      producer: producer || '',  // Ensure it's a string
      creationDate: creationDate || '',  // Ensure it's a string
      lineRange: lineRange,
      formattedMetadata: formattedMetadata
    };
    
    // Set selected document properties for display
    this.selectedDocumentTitle = title;
    this.selectedDocumentAuthor = author;
    this.selectedDocumentSource = source;
    this.selectedDocumentProducer = producer || '';
    this.selectedDocumentCreationDate = creationDate || '';
    
    const metadataDisplay = this.getMetadataDisplay(doc);
    this.selectedDocumentMetadata = metadataDisplay;
    this.hasMetadata = !!metadataDisplay;
    
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
    this.sourceDocumentsWithProps = this.sourceDocuments.map(doc => {
      const title = this.getFullTitle(doc);
      const shortTitle = this.getShortTitle(doc);
      const author = this.getAuthor(doc);
      const source = this.getSource(doc);
      
      // Create a more descriptive label for the button
      let displayLabel = 'Source';
      
      // Try to use source first (like "Routledge Research...")
      if (source && source !== 'Unknown Source') {
        const words = source.split(' ');
        displayLabel = words.length > 2 ? words.slice(0, 2).join(' ') : source;
      } 
      // If no good source, try using author
      else if (author && author !== 'Unknown Author') {
        displayLabel = author.split(' ')[0]; // Use first name/word of author
      }
      // If no good author, use title
      else if (title && title !== 'Source Document') {
        const words = title.split(' ');
        displayLabel = words.length > 2 ? words.slice(0, 2).join(' ') : title;
      }
      
      // Ensure the label isn't too long
      if (displayLabel.length > 20) {
        displayLabel = displayLabel.substring(0, 18) + '...';
      }
      
      return {
        original: doc,
        title,
        shortTitle,
        displayLabel
      };
    });
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
    // First try to get author from PDF metadata if available
    if (doc.metadata?.pdf?.info?.Author) {
      return doc.metadata.pdf.info.Author as string;
    }
    
    // Fallback to first key-value pair
    const keys = Object.keys(doc.metadata || {});
    if (keys.length > 0) {
      const titleKey = keys[0];
      if (doc.metadata && doc.metadata[titleKey] && typeof doc.metadata[titleKey] === 'string') {
        return doc.metadata[titleKey] as string;
      }
    }
    
    return 'Unknown Author';
  }
  
  private getSource(doc: SourceDocument): string {
    // Get the source from metadata
    if (doc.metadata?.source && typeof doc.metadata.source === 'string') {
      return doc.metadata.source;
    }
    return 'Unknown Source';
  }
  
  private getProducer(doc: SourceDocument): string | undefined {
    // Get the producer from PDF metadata if available
    if (doc.metadata?.pdf?.info?.Producer) {
      return doc.metadata.pdf.info.Producer as string;
    }
    return undefined;
  }
  
  private getCreationDate(doc: SourceDocument): string | undefined {
    // Get the creation date from PDF metadata if available
    if (doc.metadata?.pdf?.info?.CreationDate) {
      return doc.metadata.pdf.info.CreationDate as string;
    }
    return undefined;
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
  
  private extractFormattedMetadata(doc: SourceDocument): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    
    // Extract PDF metadata if available
    if (doc.metadata?.pdf?.info) {
      const info = doc.metadata.pdf.info;
      
      // Add basic info
      if (info.Title) result['Title'] = info.Title;
      if (info.Author) result['Author'] = info.Author;
      if (info.Producer) result['Producer'] = info.Producer;
      if (info.CreationDate) {
        result['Creation Date'] = this.formatPdfDate(info.CreationDate as string);
      }
      if (info.ModDate) {
        result['Modified Date'] = this.formatPdfDate(info.ModDate as string);
      }
      
      // Add other PDF info
      if (info.PDFFormatVersion) result['PDF Version'] = info.PDFFormatVersion;
    }
    
    // Add source information
    if (doc.metadata?.source) {
      result['Source'] = doc.metadata.source;
    }
    
    return result;
  }
  
  private formatPdfDate(dateStr: string): string {
    // PDF dates are often in format: D:YYYYMMDDHHmmSS+HH'mm'
    if (dateStr.startsWith('D:')) {
      try {
        // Extract components
        const year = dateStr.substring(2, 6);
        const month = dateStr.substring(6, 8);
        const day = dateStr.substring(8, 10);
        const hour = dateStr.substring(10, 12);
        const minute = dateStr.substring(12, 14);
        
        return `${year}-${month}-${day} ${hour}:${minute}`;
      } catch {
        // Ignore error and return original string
        return dateStr;
      }
    }
    return dateStr;
  }
}
