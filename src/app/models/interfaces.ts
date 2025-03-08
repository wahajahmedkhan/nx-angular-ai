import { MessageRole, ChunkType } from './enums';

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  isComplete?: boolean;
  thinking?: string;
}

export interface Chat {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
  flowChatId?: string; // Store FlowWise chatId for session continuity
  sessionId?: string; // Store FlowWise sessionId for PostgreSQL agent memory
  reasoningSteps?: AgentReasoningStep[];
  sourceDocuments?: SourceDocument[];
}

export interface MessageChunk {
  type: ChunkType;
  content?: string;
  messageId?: string;
}

export interface UserSettings {
  theme: 'light' | 'dark' | 'system';
  fontSize: 'small' | 'medium' | 'large';
  showThinking: boolean;
}

// FlowWise API Interfaces
export interface FlowWiseRequest {
  question: string;
  chatId?: string; // Use chatId for maintaining conversation context
  sessionId?: string; // Alternative to chatId, but chatId is preferred
  streaming?: boolean; // Enable streaming responses
  overrideConfig?: {
    sessionId?: string; // Not used directly, prefer chatId at the top level
    vars?: Record<string, any>; // Optional variables
  };
}

export interface AgentReasoningStep {
  agentName: string;
  messages: string[];
  next?: string;
  instructions?: string;
  usedTools?: any[];
  sourceDocuments?: any[];
  artifacts?: any[];
  nodeId?: string;
  thought?: string;
  action?: string;
  observation?: string;
}

export interface FlowWiseResponse {
  text: string;
  question: string;
  chatId: string;
  chatMessageId: string;
  sessionId: string;
  agentReasoning: AgentReasoningStep[];
}

// Streaming event types
export interface FlowWiseStreamEvent {
  event: 'start' | 'token' | 'error' | 'end' | 'metadata' | 'sourceDocuments' | 'usedTools' | 'artifacts' | 'agentReasoning' | 'nextAgent';
  data?: string | any;
}

// Metadata event data structure
export interface FlowWiseMetadata {
  chatId: string;
  messageId: string;
  sessionId: string;
  question?: string;
  memoryType?: string;
}

export interface SourceDocument {
  pageContent: string;
  metadata: Record<string, any>;
  id: string;
}

export interface SourceDocumentEvent {
  event: 'sourceDocuments';
  data: SourceDocument[];
}