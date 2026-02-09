import { useState, useEffect, useCallback } from 'react';
import { Settings, Save, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { useAIStore } from '@/store/aiStore';
import { healthApi, settingsApi } from '@/api/client';
import { cn } from '@/lib/utils';
import { AIProvider } from '@/types/ai';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select';

export function AISettingsPanel() {
    const {
        provider, ollamaUrl, preferredModel, openaiKey, anthropicKey, uiTheme,
        updateSettings, setTheme
    } = useAIStore();

    const [localProvider, setLocalProvider] = useState<AIProvider>(provider);
    const [localOllamaUrl, setLocalOllamaUrl] = useState(ollamaUrl);
    const [localModel, setLocalModel] = useState(preferredModel);
    const [localOpenaiKey, setLocalOpenaiKey] = useState(openaiKey || '');
    const [localAnthropicKey, setLocalAnthropicKey] = useState(anthropicKey || '');
    const [localTheme, setLocalTheme] = useState<'solid' | 'glass'>(uiTheme);

    const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [availableOllamaModels, setAvailableOllamaModels] = useState<string[]>([]);
    const [modelsLoading, setModelsLoading] = useState(false);
    const [modelsError, setModelsError] = useState<string | null>(null);

    // Sync local state when store changes
    useEffect(() => {
        setLocalProvider(provider);
        setLocalOllamaUrl(ollamaUrl);
        setLocalModel(preferredModel);
        setLocalOpenaiKey(openaiKey || '');
        setLocalAnthropicKey(anthropicKey || '');
        setLocalTheme(uiTheme);
    }, [provider, ollamaUrl, preferredModel, openaiKey, anthropicKey, uiTheme]);

    const loadOllamaModels = useCallback(async (url: string) => {
        const trimmedUrl = url.trim();
        if (!trimmedUrl) {
            setAvailableOllamaModels([]);
            setModelsError('Enter an Ollama URL first.');
            return;
        }

        setModelsLoading(true);
        setModelsError(null);
        try {
            const response = await settingsApi.getOllamaModels(trimmedUrl);
            setAvailableOllamaModels(response.models);

            if (!response.connected) {
                setModelsError(response.error || 'Could not connect to Ollama.');
                return;
            }

            if (response.models.length === 0) {
                setModelsError('No models found at this Ollama URL.');
                return;
            }

            setLocalModel((currentModel) => (
                response.models.includes(currentModel) ? currentModel : response.models[0]
            ));
        } catch (err) {
            console.warn('Primary Ollama models endpoint unavailable, trying health fallback:', err);

            try {
                const health = await healthApi.check();
                const fallbackModels = health.ollama_models || [];
                setAvailableOllamaModels(fallbackModels);

                if (!health.ollama_connected) {
                    setModelsError('Could not connect to Ollama.');
                    return;
                }

                if (fallbackModels.length === 0) {
                    setModelsError('No models found in Ollama.');
                    return;
                }

                setLocalModel((currentModel) => (
                    fallbackModels.includes(currentModel) ? currentModel : fallbackModels[0]
                ));
                setModelsError(null);
            } catch (fallbackErr) {
                console.error('Failed to load Ollama models:', fallbackErr);
                setAvailableOllamaModels([]);
                setModelsError('Failed to load Ollama models.');
            }
        } finally {
            setModelsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (localProvider !== 'ollama') {
            return;
        }

        const timeoutId = setTimeout(() => {
            void loadOllamaModels(localOllamaUrl);
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [localProvider, localOllamaUrl, loadOllamaModels]);

    const handleSave = async () => {
        setStatus('saving');
        setErrorMessage(null);
        try {
            // Update store (frontend persistence)
            updateSettings({
                provider: localProvider,
                ollamaUrl: localOllamaUrl,
                preferredModel: localModel,
                openaiKey: localOpenaiKey,
                anthropicKey: localAnthropicKey
            });
            setTheme(localTheme);

            // Update backend (API config)
            await settingsApi.updateAISettings({
                provider: localProvider,
                ollamaUrl: localOllamaUrl,
                preferredModel: localModel,
                openaiKey: localOpenaiKey,
                anthropicKey: localAnthropicKey
            });

            setStatus('saved');
            setTimeout(() => setStatus('idle'), 2000);
        } catch (err) {
            console.error('Failed to save settings:', err);
            setStatus('error');
            setErrorMessage('Failed to save settings to backend');
        }
    };

    return (
        <div className="p-4 space-y-6 bg-card text-card-foreground rounded-lg border shadow-sm">
            <div className="flex items-center gap-2 border-b pb-3">
                <Settings className="w-5 h-5 text-muted-foreground" />
                <h2 className="text-lg font-semibold">AI Settings</h2>
            </div>

            {/* Provider Selection */}
            <div className="space-y-3">
                <label className="text-sm font-medium">AI Provider</label>
                <div className="grid grid-cols-3 gap-2">
                    {(['ollama', 'openai', 'anthropic'] as AIProvider[]).map((p) => (
                        <button
                            key={p}
                            onClick={() => setLocalProvider(p)}
                            className={cn(
                                "px-3 py-2 text-sm font-medium rounded-md border transition-all",
                                localProvider === p
                                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                                    : "bg-background text-muted-foreground hover:bg-muted/50"
                            )}
                        >
                            {p.charAt(0).toUpperCase() + p.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Provider Details */}
            <div className="space-y-4 pt-2">
                {localProvider === 'ollama' && (
                    <div className="space-y-3 animate-fade-in">
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">Ollama URL</label>
                            <input
                                type="text"
                                value={localOllamaUrl}
                                onChange={(e) => setLocalOllamaUrl(e.target.value)}
                                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                placeholder="http://localhost:11434"
                            />
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Make sure Ollama is running (`ollama serve`).
                        </p>
                    </div>
                )}

                {localProvider === 'openai' && (
                    <div className="space-y-3 animate-fade-in">
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">OpenAI API Key</label>
                            <input
                                type="password"
                                value={localOpenaiKey}
                                onChange={(e) => setLocalOpenaiKey(e.target.value)}
                                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                placeholder="sk-..."
                            />
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Stored locally. Used for direct API calls.
                        </p>
                    </div>
                )}

                {localProvider === 'anthropic' && (
                    <div className="space-y-3 animate-fade-in">
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">Anthropic API Key</label>
                            <input
                                type="password"
                                value={localAnthropicKey}
                                onChange={(e) => setLocalAnthropicKey(e.target.value)}
                                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                placeholder="sk-ant-..."
                            />
                        </div>
                    </div>
                )}

                {localProvider === 'ollama' ? (
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-medium">Preferred Model</label>
                            <button
                                type="button"
                                onClick={() => void loadOllamaModels(localOllamaUrl)}
                                disabled={modelsLoading}
                                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-60"
                            >
                                <RefreshCw className={cn("w-3 h-3", modelsLoading && "animate-spin")} />
                                Refresh
                            </button>
                        </div>
                        {availableOllamaModels.length > 0 ? (
                            <Select
                                value={availableOllamaModels.includes(localModel) ? localModel : undefined}
                                onValueChange={setLocalModel}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select an Ollama model" />
                                </SelectTrigger>
                                <SelectContent>
                                    {availableOllamaModels.map((modelName) => (
                                        <SelectItem key={modelName} value={modelName}>
                                            {modelName}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        ) : (
                            <input
                                type="text"
                                value={localModel}
                                onChange={(e) => setLocalModel(e.target.value)}
                                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                placeholder="lyra-coach:latest"
                            />
                        )}
                        <p className="text-xs text-muted-foreground">
                            Select from installed Ollama models, or type one manually.
                        </p>
                        {modelsError && (
                            <p className="text-xs text-destructive">{modelsError}</p>
                        )}
                    </div>
                ) : (
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium">Preferred Model</label>
                        <input
                            type="text"
                            value={localModel}
                            onChange={(e) => setLocalModel(e.target.value)}
                            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            placeholder={localProvider === 'openai' ? 'gpt-4o' : 'claude-3-5-sonnet'}
                        />
                        <p className="text-xs text-muted-foreground">
                            Enter the model ID (e.g., gpt-4o, claude-3-sonnet).
                        </p>
                    </div>
                )}
            </div>

            {/* Theme Customization */}
            <div className="space-y-3 pt-2 border-t">
                <label className="text-sm font-medium">UI Theme</label>
                <div className="grid grid-cols-2 gap-2">
                    <button
                        onClick={() => setLocalTheme('solid')}
                        className={cn(
                            "px-3 py-2 text-sm font-medium rounded-md border transition-all",
                            localTheme === 'solid'
                                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                                : "bg-background text-muted-foreground hover:bg-muted/50"
                        )}
                    >
                        Solid
                    </button>
                    <button
                        onClick={() => setLocalTheme('glass')}
                        className={cn(
                            "px-3 py-2 text-sm font-medium rounded-md border transition-all",
                            localTheme === 'glass'
                                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                                : "bg-background text-muted-foreground hover:bg-muted/50"
                        )}
                    >
                        Glass
                    </button>
                </div>
                <p className="text-xs text-muted-foreground">
                    Glass theme applies a frosted glass effect to UI elements.
                </p>
            </div>

            {/* Actions */}
            <div className="pt-4 border-t flex flex-col gap-3">
                {errorMessage && (
                    <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-2 rounded">
                        <AlertCircle className="w-4 h-4" />
                        <span>{errorMessage}</span>
                    </div>
                )}

                <button
                    onClick={handleSave}
                    disabled={status === 'saving'}
                    className={cn(
                        "flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors",
                        status === 'saved'
                            ? "bg-green-600 text-white hover:bg-green-700"
                            : "bg-primary text-primary-foreground hover:bg-primary/90",
                        status === 'saving' && "opacity-70 cursor-wait"
                    )}
                >
                    {status === 'saving' ? (
                        <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            Saving...
                        </>
                    ) : status === 'saved' ? (
                        <>
                            <CheckCircle className="w-4 h-4" />
                            Saved
                        </>
                    ) : (
                        <>
                            <Save className="w-4 h-4" />
                            Save Configuration
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
