export type AIProvider = 'ollama' | 'openai' | 'anthropic';
export type AIMode = 'local' | 'cloud';

export interface AIConfig {
    mode: AIMode;
    provider: AIProvider; // Represents the active provider
    cloudProvider: 'openai' | 'anthropic'; // Remembers selection for cloud mode
    ollamaUrl: string;
    preferredModel: string;
    // Keys are optional in frontend state
    openaiKey?: string;
    anthropicKey?: string;
}

export interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}
