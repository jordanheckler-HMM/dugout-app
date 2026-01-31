export type AIProvider = 'ollama' | 'openai' | 'anthropic';

export interface AIConfig {
    provider: AIProvider;
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
