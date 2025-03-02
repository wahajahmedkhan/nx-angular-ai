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