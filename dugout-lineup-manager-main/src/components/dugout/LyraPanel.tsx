import { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, AlertCircle, Settings as SettingsIcon, Loader2, Square, Trash2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Player, LineupSlot, FieldPosition } from '@/types/player';
import { healthApi, lyraApi, settingsApi, gamesApi } from '@/api/client';
import { mapFrontendPlayerToBackend, mapFrontendLineupToBackend, mapFrontendFieldToBackend } from '@/api/mappers';
import { useAIStore } from '@/store/aiStore';
import { AISettingsPanel } from './AISettingsPanel';
import { ChatMessage } from '@/types/ai';

interface Message {
  id: string;
  role: 'user' | 'lyra';
  content: string;
  timestamp: Date;
}

interface LyraPanelProps {
  lineup: LineupSlot[];
  fieldPositions: FieldPosition[];
  players: Player[];
}

const examplePrompts = [
  "What stands out in this lineup?",
  "What tradeoffs am I making here?",
  "Any concerns with this field setup?",
  "What should I consider here?"
];

export function LyraPanel({ lineup, fieldPositions, players }: LyraPanelProps) {
  const {
    mode,
    provider,
    cloudProvider,
    ollamaUrl,
    preferredModel,
    openaiKey,
    anthropicKey,
    updateSettings,
  } = useAIStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const activeResponseIdRef = useRef<string | null>(null);
  const stoppedByUserRef = useRef(false);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping]);

  // Abort active generation when component unmounts
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const buildScheduleContext = async (): Promise<string | null> => {
    try {
      const games = await gamesApi.getAll();

      const completedGames = games
        .filter((game) => {
          if (game.status) {
            return game.status === 'completed';
          }
          return Boolean(game.result) || (game.score_us !== undefined && game.score_them !== undefined);
        })
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 5)
        .map((game) => ({
          date: game.date,
          opponent: game.opponent,
          home_away: game.home_away,
          result: game.result,
          score_us: game.score_us,
          score_them: game.score_them,
          source: game.source || 'manual',
        }));

      const scheduledGames = games
        .filter((game) => {
          if (game.status) {
            return game.status === 'scheduled';
          }
          return !game.result && !(game.score_us !== undefined && game.score_them !== undefined);
        })
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(0, 5)
        .map((game) => ({
          date: game.date,
          opponent: game.opponent,
          home_away: game.home_away,
          source: game.source || 'manual',
        }));

      return [
        'Schedule context (recent and upcoming):',
        `Recent Completed Games: ${JSON.stringify(completedGames)}`,
        `Upcoming Scheduled Games: ${JSON.stringify(scheduledGames)}`,
      ].join('\n');
    } catch (error) {
      console.warn('Failed to load schedule context for Lyra chat:', error);
      return null;
    }
  };

  const buildConversationHistory = async (chatMessages: Message[]): Promise<ChatMessage[]> => {
    const backendPlayers = players.map(player => ({
      id: player.id,
      ...mapFrontendPlayerToBackend(player),
    }));
    const backendLineup = mapFrontendLineupToBackend(lineup);
    const backendField = mapFrontendFieldToBackend(fieldPositions);
    const scheduleContext = await buildScheduleContext();

    const teamContextParts = [
      'Current team context (use this for all analysis):',
      `Lineup: ${JSON.stringify(backendLineup)}`,
      `Field Positions: ${JSON.stringify(backendField)}`,
      `Players: ${JSON.stringify(backendPlayers)}`,
    ];

    if (scheduleContext) {
      teamContextParts.push(scheduleContext);
    }

    const teamContext = teamContextParts.join('\n');

    return [
      {
        role: 'system',
        content: 'You are Lyra, an advanced baseball coaching assistant in the Dugout app. Be concise, strategic, and practical. Explain tradeoffs and keep recommendations coach-controlled.',
      },
      { role: 'system', content: teamContext },
      ...chatMessages.map((message) => ({
        role: message.role === 'lyra' ? 'assistant' : 'user',
        content: message.content,
      }) as ChatMessage),
    ];
  };

  const handleStopGeneration = () => {
    if (!isTyping) {
      return;
    }

    const activeResponseId = activeResponseIdRef.current;
    stoppedByUserRef.current = true;
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    activeResponseIdRef.current = null;
    setIsTyping(false);

    if (activeResponseId) {
      setMessages((previous) => previous.filter(
        (message) => !(message.id === activeResponseId && message.content.trim() === '')
      ));
    }
  };

  const handleClearChat = () => {
    if (isTyping) {
      handleStopGeneration();
    }
    setMessages([]);
    setError(null);
  };

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;

    stoppedByUserRef.current = false;
    const userContent = input.trim();
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: userContent,
      timestamp: new Date()
    };
    const nextMessages = [...messages, userMessage];

    setMessages(nextMessages);
    setInput('');
    setIsTyping(true);
    setError(null);

    const conversationHistory = await buildConversationHistory(nextMessages);
    let modelToUse = preferredModel;

    // Ensure local Ollama mode always uses an installed model.
    if (mode === 'local' && provider === 'ollama') {
      try {
        const health = await healthApi.check();
        if (!health.ollama_connected) {
          setError('Ollama is not connected. Start Ollama and try again.');
          setIsTyping(false);
          return;
        }

        const installedModels = health.ollama_models || [];
        if (installedModels.length === 0) {
          setError('No Ollama models installed. Install a model and try again.');
          setIsTyping(false);
          return;
        }

        if (!installedModels.includes(modelToUse)) {
          const fallbackModel = installedModels.includes('lyra-coach:latest')
            ? 'lyra-coach:latest'
            : installedModels[0];

          modelToUse = fallbackModel;
          updateSettings({
            mode: 'local',
            provider: 'ollama',
            preferredModel: fallbackModel,
          });

          void settingsApi.updateAISettings({
            mode: 'local',
            provider: 'ollama',
            cloudProvider,
            ollamaUrl,
            preferredModel: fallbackModel,
            openaiKey,
            anthropicKey,
          }).catch((syncError) => {
            console.warn('Failed to persist fallback AI model to backend:', syncError);
          });
        }
      } catch (healthError) {
        console.warn('Health check failed before streaming chat:', healthError);
      }
    }

    try {
      let currentResponseContent = "";
      const responseId = (Date.now() + 1).toString();
      const abortController = new AbortController();
      abortControllerRef.current = abortController;
      activeResponseIdRef.current = responseId;

      // Create a placeholder message for streaming
      setMessages(prev => [...prev, {
        id: responseId,
        role: 'lyra',
        content: '',
        timestamp: new Date()
      }]);

      await lyraApi.streamChat(
        conversationHistory,
        modelToUse,
        (chunk) => {
          if (activeResponseIdRef.current !== responseId) {
            return;
          }
          currentResponseContent += chunk;
          setMessages(prev => prev.map(m =>
            m.id === responseId
              ? { ...m, content: currentResponseContent }
              : m
          ));
        },
        () => {
          const stoppedByUser = stoppedByUserRef.current;
          stoppedByUserRef.current = false;

          abortControllerRef.current = null;
          activeResponseIdRef.current = null;
          setIsTyping(false);

          if (!stoppedByUser && currentResponseContent.trim().length === 0) {
            setMessages((previous) =>
              previous.filter((message) => message.id !== responseId)
            );
            setError(`No response from model "${modelToUse}". Check AI settings or pick another model.`);
          }
        },
        (err) => {
          console.error("Stream error:", err);
          setError("Connection interrupted.");
          stoppedByUserRef.current = false;
          abortControllerRef.current = null;
          activeResponseIdRef.current = null;
          setIsTyping(false);
        },
        abortController.signal
      );
    } catch (err) {
      console.error('Failed to start stream:', err);
      setError('Failed to connect to Lyra.');
      stoppedByUserRef.current = false;
      abortControllerRef.current = null;
      activeResponseIdRef.current = null;
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleExampleClick = (prompt: string) => {
    setInput(prompt);
  };

  return (
    <div className="h-full flex flex-col bg-lyra text-lyra-foreground">
      {/* Header */}
      <div className="px-3 py-2 border-b border-lyra-border flex items-center justify-between">
        <div>
          <div className="flex items-center gap-1.5 mb-0.5">
            <Sparkles className="w-3.5 h-3.5 text-gold" />
            <h2 className="text-sm font-semibold tracking-tight">Lyra</h2>
            <div className="flex gap-1 items-center">
              <span className={cn(
                "text-[9px] px-1.5 py-0.5 rounded-full border uppercase tracking-wider font-bold",
                mode === 'local'
                  ? "bg-green-500/10 text-green-500 border-green-500/20"
                  : "bg-blue-500/10 text-blue-500 border-blue-500/20"
              )}>
                {mode}
              </span>
              <span className="text-[10px] bg-lyra-border/30 px-1.5 py-0.5 rounded text-lyra-foreground/70">
                {provider}
              </span>
            </div>
          </div>
          <p className="text-[10px] text-lyra-foreground/60">
            Ask for perspective. You make the decisions.
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleClearChat}
            disabled={messages.length === 0 && !isTyping}
            aria-label="Clear chat"
            className="p-1.5 rounded-md transition-colors hover:bg-lyra-muted disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            title="Clear chat"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setShowSettings(!showSettings)}
            aria-label={showSettings ? "Hide AI settings" : "Show AI settings"}
            aria-pressed={showSettings}
            className={cn(
              "p-1.5 rounded-md transition-colors hover:bg-lyra-muted focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
              showSettings && "bg-lyra-muted text-gold"
            )}
            title="AI settings"
          >
            <SettingsIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {error && (
        <div className="px-3 py-1.5 bg-destructive/10 border-b border-destructive/20 text-destructive text-[10px] flex items-center gap-1.5">
          <AlertCircle className="w-3 h-3" />
          {error}
        </div>
      )}

      {showSettings ? (
        <ScrollArea className="flex-1 bg-background/50">
          <AISettingsPanel />
        </ScrollArea>
      ) : (
        <ScrollArea className="flex-1">
          <div className="p-3 space-y-2.5">
            {messages.length === 0 ? (
              <div className="space-y-2">
                <p className="text-xs text-lyra-foreground/50 text-center py-2">
                  Ask me about your lineup, positioning, or strategy considerations.
                </p>
                <div className="space-y-1.5">
                  <p className="text-[10px] text-lyra-foreground/40 uppercase tracking-[0.12em]">
                    Try asking:
                  </p>
                  {examplePrompts.map((prompt, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleExampleClick(prompt)}
                      className="block w-full text-left px-2.5 py-1.5 rounded border border-lyra-border text-xs text-lyra-foreground/70 bg-lyra-muted/20 hover:bg-lyra-muted/40 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      "{prompt}"
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map(message => (
                <div
                  key={message.id}
                  className={cn(
                    'animate-fade-in group',
                    message.role === 'user' ? 'ml-2' : 'mr-2'
                  )}
                >
                  <div
                    className={cn(
                      'rounded-md px-2.5 py-1.5 text-xs leading-snug border',
                      message.role === 'user'
                        ? 'bg-lyra-muted/60 text-lyra-foreground ml-auto max-w-[86%] border-lyra-border'
                        : 'bg-card/95 text-card-foreground mr-auto max-w-[92%] border-border/70'
                    )}
                  >
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        p: ({ children }) => <p className="mb-1 last:mb-0 leading-snug">{children}</p>,
                        a: ({ href, children }) => {
                          const safeHref = href && (href.startsWith('https://') || href.startsWith('http://'))
                            ? href
                            : undefined;
                          if (!safeHref) {
                            return <span className="text-primary">{children}</span>;
                          }
                          return (
                            <a href={safeHref} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{children}</a>
                          );
                        },
                        ul: ({ children }) => <ul className="list-disc pl-3.5 mb-1.5 space-y-0.5">{children}</ul>,
                        ol: ({ children }) => <ol className="list-decimal pl-3.5 mb-1.5 space-y-0.5">{children}</ol>,
                        h1: ({ children }) => <h1 className="text-xs font-semibold mt-1.5 mb-0.5">{children}</h1>,
                        h2: ({ children }) => <h2 className="text-xs font-semibold mt-1.5 mb-0.5">{children}</h2>,
                        h3: ({ children }) => <h3 className="text-xs font-semibold mt-1.5 mb-0.5">{children}</h3>,
                        blockquote: ({ children }) => <blockquote className="border-l border-primary/40 pl-2 italic my-1.5">{children}</blockquote>,
                        code: ({ children }) => <code className="bg-muted rounded px-1 py-0.5 text-[11px] font-mono text-foreground">{children}</code>,
                      }}
                    >
                      {message.content}
                    </ReactMarkdown>
                  </div>
                  <p className="text-[10px] text-lyra-foreground/40 mt-0.5 px-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              ))
            )}
            <div ref={scrollRef} />

            {isTyping && (
              <div className="flex items-center gap-1 px-2.5 py-1 text-lyra-foreground/50">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span className="text-[10px]">Thinking...</span>
              </div>
            )}
          </div>
        </ScrollArea>
      )}

      {/* Input */}
      <div className="p-2 border-t border-lyra-border">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            aria-label="Lyra message input"
            placeholder="Ask about your lineup or strategy..."
            rows={2}
            className="flex-1 resize-none rounded-md bg-lyra-muted/30 border border-lyra-border px-2.5 py-1.5 text-xs text-lyra-foreground placeholder:text-lyra-foreground/40 focus:outline-none focus:ring-1 focus:ring-gold/50"
          />
          {isTyping ? (
            <button
              type="button"
              onClick={handleStopGeneration}
              aria-label="Stop generation"
              className="p-2 rounded-md border border-destructive/40 bg-destructive/20 text-destructive hover:bg-destructive/30 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              title="Stop generation"
            >
              <Square className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSend}
              disabled={!input.trim()}
              aria-label="Send message"
              className="p-2 rounded-md border border-gold/30 bg-gold/90 text-gold-foreground hover:bg-gold transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              title="Send message"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
