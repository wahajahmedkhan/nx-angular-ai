# Chat Storage API Specification

## Overview

This document outlines the API endpoints required for storing and retrieving chat data for the Angular AI Chat application. The current implementation stores chat data in the browser's local storage, but we need to transition to server-side storage to enable cross-device access and persistence.

## Authentication

All endpoints should require authentication. The application currently uses the authentication endpoint at:
```
http://akudeb.itserver.biz:3003/api/auth
```

Each request should include an `Authorization` header with a valid JWT token:
```
Authorization: Bearer <jwt_token>
```

## Data Models

### Chat Object

```typescript
interface Chat {
  id: string;                     // Unique identifier for the chat (UUID)
  title: string;                  // Display title for the chat
  messages: Message[];            // Array of messages in the chat
  createdAt: string;              // ISO date string of creation time
  updatedAt: string;              // ISO date string of last update time
  flowChatId?: string;            // FlowWise chatId for session continuity
  sessionId?: string;             // FlowWise sessionId for PostgreSQL agent memory
  reasoningSteps?: AgentReasoningStep[]; // AI reasoning steps (optional)
  sourceDocuments?: SourceDocument[]; // Reference documents used by AI (optional)
  userId: string;                 // ID of the user who owns this chat
}
```

### Message Object

```typescript
interface Message {
  id: string;                     // Unique identifier for the message (UUID)
  role: "user" | "assistant";     // Who sent the message
  content: string;                // Text content of the message
  timestamp: string;              // ISO date string of when message was sent
  isComplete: boolean;            // Whether the message is complete (for streaming)
  thinking?: string;              // Optional thinking/reasoning text
}
```

### AgentReasoningStep Object

```typescript
interface AgentReasoningStep {
  agentName: string;              // Name of the AI agent
  messages: string[];             // Messages processed by the agent
  next?: string;                  // Next step information
  instructions?: string;          // Instructions for the agent
  usedTools?: any[];              // Tools used by the agent
  sourceDocuments?: any[];        // Source documents referenced
  artifacts?: any[];              // Any artifacts produced
  nodeId?: string;                // Node ID in the flow
  thought?: string;               // Agent's thought process
  action?: string;                // Action taken by the agent
  observation?: string;           // Agent's observation
}
```

### SourceDocument Object

```typescript
interface SourceDocument {
  id: string;                     // Document identifier
  pageContent: string;            // Content of the document
  metadata: {                     // Metadata about the document
    source: string;               // Source of the document
    blobType: string;             // Type of blob
    pdf?: {                       // PDF-specific metadata if applicable
      // PDF metadata fields
    };
    loc?: {                       // Location information
      lines: {
        from: number;
        to: number;
      };
    };
    [key: string]: any;           // Additional metadata
  };
}
```

## API Endpoints

### 1. Get All Chats

Retrieves all chats for the authenticated user. This endpoint returns only chat metadata without full message content to optimize performance.

**Endpoint:** `GET /api/chats`

**Response:**
```json
{
  "success": true,
  "chats": [
    {
      "id": "uuid-1",
      "title": "Chat about AI",
      "createdAt": "2025-04-20T12:00:00Z",
      "updatedAt": "2025-04-20T12:30:00Z",
      "flowChatId": "flow-123",
      "sessionId": "session-456",
      "messageCount": 10,
      "lastMessage": {
        "content": "Artificial Intelligence is...",
        "timestamp": "2025-04-20T12:01:00Z",
        "role": "assistant"
      }
    },
    {
      "id": "uuid-2",
      "title": "Machine Learning Discussion",
      "createdAt": "2025-04-19T15:20:00Z",
      "updatedAt": "2025-04-19T16:45:00Z",
      "flowChatId": "flow-789",
      "sessionId": "session-012",
      "messageCount": 25,
      "lastMessage": {
        "content": "That explains neural networks well, thank you!",
        "timestamp": "2025-04-19T16:45:00Z",
        "role": "user"
      }
    }
    // Additional chats...
  ]
}
```

### 2. Get Chat by ID

Retrieves a specific chat by its ID.

**Endpoint:** `GET /api/chats/{chatId}`

**Response:**
```json
{
  "success": true,
  "chat": {
    "id": "uuid-1",
    "title": "Chat about AI",
    "createdAt": "2025-04-20T12:00:00Z",
    "updatedAt": "2025-04-20T12:30:00Z",
    "flowChatId": "flow-123",
    "sessionId": "session-456",
    "messages": [
      // Messages array
    ],
    "reasoningSteps": [
      // Reasoning steps array (if available)
    ],
    "sourceDocuments": [
      // Source documents array (if available)
    ]
  }
}
```

### 3. Create New Chat

Creates a new chat.

**Endpoint:** `POST /api/chats`

**Request Body:**
```json
{
  "title": "New Chat",
  "messages": [],
  "flowChatId": "optional-flow-id",
  "sessionId": "optional-session-id"
}
```

**Response:**
```json
{
  "success": true,
  "chat": {
    "id": "newly-generated-uuid",
    "title": "New Chat",
    "createdAt": "2025-04-22T02:30:00Z",
    "updatedAt": "2025-04-22T02:30:00Z",
    "flowChatId": "optional-flow-id",
    "sessionId": "optional-session-id",
    "messages": []
  }
}
```

### 4. Update Chat

Updates an existing chat. This endpoint should handle both adding new messages and updating chat metadata.

**Endpoint:** `PUT /api/chats/{chatId}`

**Request Body:**
```json
{
  "title": "Updated Chat Title",
  "messages": [
    // Updated messages array
  ],
  "flowChatId": "flow-123",
  "sessionId": "session-456",
  "reasoningSteps": [
    // Updated reasoning steps array
  ],
  "sourceDocuments": [
    // Updated source documents array
  ]
}
```

**Response:**
```json
{
  "success": true,
  "chat": {
    "id": "uuid-1",
    "title": "Updated Chat Title",
    "createdAt": "2025-04-20T12:00:00Z",
    "updatedAt": "2025-04-22T02:35:00Z",
    "flowChatId": "flow-123",
    "sessionId": "session-456",
    "messages": [
      // Updated messages array
    ],
    "reasoningSteps": [
      // Updated reasoning steps array
    ],
    "sourceDocuments": [
      // Updated source documents array
    ]
  }
}
```

### 5. Delete Chat

Deletes a chat by its ID.

**Endpoint:** `DELETE /api/chats/{chatId}`

**Response:**
```json
{
  "success": true,
  "message": "Chat deleted successfully"
}
```

### 6. Add Message to Chat

Adds a new message to an existing chat.

**Endpoint:** `POST /api/chats/{chatId}/messages`

**Request Body:**
```json
{
  "role": "user",
  "content": "How does machine learning work?",
  "timestamp": "2025-04-22T02:40:00Z"
}
```

**Response:**
```json
{
  "success": true,
  "message": {
    "id": "newly-generated-message-uuid",
    "role": "user",
    "content": "How does machine learning work?",
    "timestamp": "2025-04-22T02:40:00Z",
    "isComplete": true
  },
  "chat": {
    "id": "uuid-1",
    "updatedAt": "2025-04-22T02:40:00Z"
    // Other chat fields...
  }
}
```

## Error Handling

All endpoints should return appropriate HTTP status codes:

- 200: Success
- 400: Bad Request (invalid input)
- 401: Unauthorized (invalid or missing authentication)
- 403: Forbidden (authenticated but not authorized)
- 404: Not Found (chat or resource not found)
- 500: Server Error

Error responses should follow this format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message"
  }
}
```

## Implementation Notes for Frontend Integration

### Changes Required in ChatService

1. Replace the local storage functions (`saveChatsToStorage`, `loadChatsFromStorage`) with API calls.
2. Update the `createNewChat` method to call the Create Chat API.
3. Update the `deleteChat` method to call the Delete Chat API.
4. Update the `updateChatInList` method to call the Update Chat API.
5. Add debouncing for frequent updates to avoid excessive API calls.

### Example Implementation for Saving Chat

```typescript
// Current local storage implementation
private saveChatsToStorage(): void {
  localStorage.setItem('chats', JSON.stringify(this.chats()));
}

// New API-based implementation
private saveChat(chat: Chat): Observable<Chat> {
  return this.http.put<ApiResponse<Chat>>(`${this.API_URL}/chats/${chat.id}`, chat)
    .pipe(
      map(response => response.chat),
      catchError(error => {
        console.error('Error saving chat:', error);
        // Implement retry or fallback logic
        return throwError(() => error);
      })
    );
}
```

### Handling Chat Synchronization

- Implement optimistic updates for better UX (update UI immediately, then sync with server)
- Add offline support with background synchronization when connection is restored
- Consider using a queue for pending changes that need to be synced

## Data Size Considerations

Some chats may contain large amounts of data, especially those with many source documents or reasoning steps. Consider:

1. Pagination for retrieving messages (especially for long conversations)
2. Compression for large data transfers
3. Lazy loading of source documents and reasoning steps

## Security Considerations

1. Ensure all endpoints require authentication
2. Implement rate limiting to prevent abuse
3. Validate user ownership of chats before allowing modifications
4. Sanitize all user input to prevent injection attacks
5. Consider encryption for sensitive chat content

## Migration Plan

1. Implement the new API endpoints on the backend
2. Update the ChatService to use the new endpoints while maintaining local storage as fallback
3. Add a migration function to upload existing local chats to the server
4. Once all chats are migrated, remove the local storage fallback
