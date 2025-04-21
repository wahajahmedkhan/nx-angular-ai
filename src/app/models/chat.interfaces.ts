import { MessageRole, ChunkType } from './enums';

// Basic Chat and Message interfaces
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

// FlowWise API Request/Response Interfaces
export interface FlowWiseRequest {
  question: string;
  chatId?: string; // Use chatId for maintaining conversation context
  sessionId?: string; // Alternative to chatId, but chatId is preferred
  streaming?: boolean; // Enable streaming responses
  overrideConfig?: {
    sessionId?: string; // Not used directly, prefer chatId at the top level
    vars?: Record<string, unknown>; // Optional variables
  };
}

export interface FlowWiseResponse {
  text: string;
  question: string;
  chatId: string;
  chatMessageId: string;
  sessionId: string;
  agentReasoning: AgentReasoningStep[];
}

// Tool and Agent Interfaces
export interface ToolInput {
  input?: string;
  [key: string]: unknown;
}

export interface ToolOutput {
  [key: string]: unknown;
}

export interface Tool {
  tool: string;
  toolInput: ToolInput;
  toolOutput: ToolOutput | string;
}

export interface SourceDocument {
  id: string; // Required in both interfaces
  pageContent: string;
  metadata: {
    source: string;
    blobType: string;
    pdf?: {
      version: string;
      info: {
        PDFFormatVersion: string;
        IsAcroFormPresent: boolean;
        IsXFAPresent: boolean;
        Title?: string;
        Author?: string;
        Producer?: string;
        CreationDate?: string;
        ModDate?: string;
      };
      metadata?: {
        _metadata?: {
          "xmp:createdate"?: string;
          "xmp:modifydate"?: string;
          "xmp:metadatadate"?: string;
          "pdf:producer"?: string;
          "dc:format"?: string;
          "xmpmm:documentid"?: string;
          "xmpmm:instanceid"?: string;
        };
      };
      totalPages: number;
    };
    loc?: {
      lines: {
        from: number;
        to: number;
      };
    };
    [key: string]: unknown;
  };
}

export interface Artifact {
  [key: string]: unknown;
}

export interface State {
  next?: string;
  instructions?: string;
  team_members?: string;
  [key: string]: unknown;
}

export interface AgentData {
  agentName: string;
  messages: string[];
  next?: string;
  instructions?: string;
  usedTools: Tool[];
  sourceDocuments: SourceDocument[];
  artifacts: Artifact[];
  state: State;
  nodeId: string;
  thought?: string;
  action?: string;
  observation?: string;
}

// Streaming Event Interfaces
export interface StartEvent {
  event: "start";
  data: AgentData[];
}

export interface AgentReasoningEvent {
  event: "agentReasoning";
  data: AgentData[];
}

export interface NextAgentEvent {
  event: "nextAgent";
  data: string;
}

export interface TokenEvent {
  event: "token";
  data: string;
}

export interface EndEvent {
  event: "end";
  data?: unknown;
}

export interface ErrorEvent {
  event: "error";
  data: string;
}

export interface MetadataEvent {
  event: "metadata";
  data: {
    chatId?: string;
    sessionId?: string;
    messageId?: string;
    question?: string;
    memoryType?: string;
    [key: string]: unknown;
  };
}

export interface SourceDocumentsEvent {
  event: "sourceDocuments";
  data: SourceDocument[];
}

export type EventType = 
  | StartEvent 
  | AgentReasoningEvent 
  | NextAgentEvent 
  | TokenEvent 
  | EndEvent 
  | ErrorEvent 
  | MetadataEvent 
  | SourceDocumentsEvent;

export type FlowWiseStreamEvent = EventType;

export type AgentReasoningStep = Omit<AgentData, 'state' | 'usedTools' | 'sourceDocuments' | 'artifacts' | 'nodeId'> & {
  agentName: string;
  messages: string[];
  next?: string;
  instructions?: string;
  state?: State;
  usedTools?: Tool[];
  sourceDocuments?: SourceDocument[];
  artifacts?: Artifact[];
  nodeId?: string;
  thought?: string;
  action?: string;
  observation?: string;
};

export interface ConversationItem {
  [key: number]: EventType;
}
