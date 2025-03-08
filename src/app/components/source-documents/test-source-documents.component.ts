import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SourceDocumentsComponent } from './source-documents.component';
import { SourceDocument } from '../../models/interfaces';

@Component({
  selector: 'app-test-source-documents',
  standalone: true,
  imports: [CommonModule, SourceDocumentsComponent],
  template: `
    <div class="p-4">
      <h2 class="text-xl font-bold mb-4">Source Document Test</h2>
      
      <div class="mb-4">
        <button 
          (click)="testDocument1()"
          class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 mr-2"
        >
          Test Document 1
        </button>
        <button 
          (click)="testDocument2()"
          class="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 mr-2"
        >
          Test Document 2
        </button>
        <button 
          (click)="testDocument3()"
          class="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
        >
          Test Document 3
        </button>
      </div>
      
      <div class="bg-gray-100 dark:bg-gray-800 p-4 rounded">
        <h3 class="font-semibold mb-2">Current Test Document:</h3>
        <pre class="whitespace-pre-wrap text-sm">{{ currentDocumentJson }}</pre>
      </div>
      
      <div class="mt-4">
        <h3 class="font-semibold mb-2">Source Documents Component:</h3>
        <app-source-documents></app-source-documents>
      </div>
    </div>
  `
})
export class TestSourceDocumentsComponent {
  currentDocument: SourceDocument | null = null;
  
  get currentDocumentJson(): string {
    return this.currentDocument ? JSON.stringify(this.currentDocument, null, 2) : 'No document selected';
  }
  
  // Test with standard metadata format (first key is title, first value is author)
  testDocument1(): void {
    this.currentDocument = {
      pageContent: "This is a sample document content about artificial intelligence.",
      metadata: {
        "Human Psychology (fitrah) from Islamic Perspective": "Ali Muhamad Bhat",
        "loc.lines.from": 42,
        "loc.lines.to": 57
      }
    };
    
    // Simulate the sourceDocuments$ observable
    this.simulateSourceDocuments([this.currentDocument]);
  }
  
  // Test with nested loc structure
  testDocument2(): void {
    this.currentDocument = {
      pageContent: "This document discusses machine learning algorithms and their applications.",
      metadata: {
        "Machine Learning Fundamentals": "Jane Smith",
        "loc": {
          "lines": {
            "from": 120,
            "to": 145
          }
        }
      }
    };
    
    // Simulate the sourceDocuments$ observable
    this.simulateSourceDocuments([this.currentDocument]);
  }
  
  // Test with different metadata structure
  testDocument3(): void {
    this.currentDocument = {
      pageContent: "Exploring the history of quantum computing and its future implications.",
      metadata: {
        "Quantum Computing: Past and Future": "Robert Johnson",
        "source": "Scientific Journal of Computing",
        "page": 78,
        "loc.lines.from": 230,
        "loc.lines.to": 252
      }
    };
    
    // Simulate the sourceDocuments$ observable
    this.simulateSourceDocuments([this.currentDocument]);
  }
  
  // Simulate the sourceDocuments$ observable from ChatService
  private simulateSourceDocuments(documents: SourceDocument[]): void {
    // Access the window object to set a global variable for testing
    (window as any).testSourceDocuments = documents;
    
    // Log to console for manual testing
    console.log('Test source documents:', documents);
    
    // Dispatch a custom event that the SourceDocumentsComponent can listen to
    const event = new CustomEvent('test-source-documents', { detail: documents });
    window.dispatchEvent(event);
    
    // Alert the user to check the console and use the browser dev tools
    alert('Source documents set for testing. Check the browser console and use the browser dev tools to inspect the component.');
  }
}
