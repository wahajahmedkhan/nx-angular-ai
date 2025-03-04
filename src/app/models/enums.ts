export enum MessageRole {
  User = 'user',
  Assistant = 'assistant',
  System = 'system',
  Thinking = 'thinking'
}

export enum ThemeMode {
  Light = 'light',
  Dark = 'dark',
  System = 'system'
}

export enum ChunkType {
  Start = 'start',
  Content = 'content',
  End = 'end',
  Error = 'error',
  Thinking = 'thinking',
  SourceDocuments = 'sourceDocuments',
  AgentReasoning = 'agentReasoning',
  NextAgent = 'nextAgent'
}

export enum ChatViewType {
  CurrentChat = 'current-chat',
  ThinkingPanel = 'thinking-panel',
  ChatHistory = 'chat-history'
}