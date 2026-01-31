import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AIConfig } from '@/types/ai';

interface AIState extends AIConfig {
    uiTheme: 'solid' | 'glass';
    setProvider: (provider: AIConfig['provider']) => void;
    updateSettings: (settings: Partial<AIConfig>) => void;
    setTheme: (theme: 'solid' | 'glass') => void;
}

export const useAIStore = create<AIState>()(
    persist(
        (set) => ({
            provider: 'ollama',
            ollamaUrl: 'http://localhost:11434',
            preferredModel: 'lyra-coach:latest',
            openaiKey: '',
            anthropicKey: '',
            uiTheme: 'solid',

            setProvider: (provider) => set({ provider }),
            updateSettings: (settings) => set((state) => ({ ...state, ...settings })),
            setTheme: (theme) => set({ uiTheme: theme }),
        }),
        {
            name: 'dugout-ai-settings',
        }
    )
);
