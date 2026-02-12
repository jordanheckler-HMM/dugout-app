import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AIConfig } from '@/types/ai';
import { ecosystemService, ModelEntry } from '@/services/EcosystemService';

interface AIState extends AIConfig {
    uiTheme: 'solid' | 'glass';
    ecosystemInitialized: boolean;
    availableModels: ModelEntry[];
    setProvider: (provider: AIConfig['provider']) => void;
    setMode: (mode: AIConfig['mode']) => void;
    setCloudProvider: (provider: AIConfig['cloudProvider']) => void;
    updateSettings: (settings: Partial<AIConfig>) => void;
    setTheme: (theme: 'solid' | 'glass') => void;
    initializeEcosystem: () => Promise<void>;
    syncModelsFromEcosystem: () => Promise<void>;
}

export const useAIStore = create<AIState>()(
    persist(
        (set, get) => ({
            mode: 'local',
            provider: 'ollama',
            cloudProvider: 'openai',
            ollamaUrl: 'http://localhost:11434',
            preferredModel: 'lyra-coach:latest',
            openaiKey: '',
            anthropicKey: '',
            uiTheme: 'solid',
            ecosystemInitialized: false,
            availableModels: [],

            setProvider: (provider) => set({ provider }),
            setMode: (mode) => set((state) => {
                const newProvider = mode === 'local' ? 'ollama' : state.cloudProvider;
                return { mode, provider: newProvider };
            }),
            setCloudProvider: (cloudProvider) => set((state) => {
                const newProvider = state.mode === 'cloud' ? cloudProvider : state.provider;
                return { cloudProvider, provider: newProvider };
            }),
            updateSettings: (settings) => set((state) => {
                const newState = { ...state, ...settings };
                // If mode changed, ensure provider matches
                if (settings.mode) {
                    newState.provider = settings.mode === 'local' ? 'ollama' : newState.cloudProvider;
                }
                return newState;
            }),
            setTheme: (theme) => set({ uiTheme: theme }),

            /**
             * Initialize the ecosystem directory structure
             */
            initializeEcosystem: async () => {
                console.log('[AIStore] Initializing ecosystem...');
                try {
                    const success = await ecosystemService.initialize();
                    if (success) {
                        console.log('[AIStore] Ecosystem initialized successfully');
                        set({ ecosystemInitialized: true });

                        // Sync models after initialization
                        await get().syncModelsFromEcosystem();

                        // Sync theme from global config
                        const globalConfig = await ecosystemService.getGlobalConfig();
                        if (globalConfig?.preferences?.theme) {
                            // Map ecosystem theme to UI theme
                            const theme = globalConfig.preferences.theme === 'dark' ? 'solid' :
                                (globalConfig.preferences.theme === 'light' ? 'solid' : 'solid');
                            set({ uiTheme: theme });
                        }
                    }
                } catch (e) {
                    console.warn('[AIStore] Failed to initialize ecosystem:', e);
                }
            },

            /**
             * Sync models from ecosystem registry
             */
            syncModelsFromEcosystem: async () => {
                console.log('[AIStore] Syncing models from ecosystem...');
                try {
                    const registryExists = await ecosystemService.registryExists();

                    if (!registryExists) {
                        console.log('[AIStore] Ecosystem registry not found, using defaults');
                        return;
                    }

                    const registry = await ecosystemService.getModelRegistry();

                    if (registry?.models && registry.models.length > 0) {
                        console.log(`[AIStore] Found ${registry.models.length} models in ecosystem registry`);
                        set({ availableModels: registry.models });

                        // If the current preferredModel doesn't exist in registry, 
                        // try to set a sensible default
                        const currentPreferred = get().preferredModel;
                        const preferredExists = registry.models.some(m => m.id === currentPreferred);

                        if (!preferredExists) {
                            // Find primary coach model first, then fall back to chat
                            const coachModel = registry.models.find(m =>
                                m.roles.some(r => r.role === 'coach' && r.primary)
                            );
                            const chatModel = registry.models.find(m =>
                                m.roles.some(r => r.role === 'chat' && r.primary)
                            );
                            const defaultModel = coachModel || chatModel || registry.models[0];

                            if (defaultModel) {
                                console.log(`[AIStore] Setting default model to ${defaultModel.id}`);
                                set({ preferredModel: defaultModel.id });
                            }
                        }
                    }
                } catch (e) {
                    console.warn('[AIStore] Failed to sync models from ecosystem:', e);
                }
            },
        }),
        {
            name: 'dugout-ai-settings',
            // Don't persist ecosystem-specific runtime state
            partialize: (state) => ({
                mode: state.mode,
                provider: state.provider,
                cloudProvider: state.cloudProvider,
                ollamaUrl: state.ollamaUrl,
                preferredModel: state.preferredModel,
                openaiKey: state.openaiKey,
                anthropicKey: state.anthropicKey,
                uiTheme: state.uiTheme,
            }),
        }
    )
);
