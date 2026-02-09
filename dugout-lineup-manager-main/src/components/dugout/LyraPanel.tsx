import { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, AlertCircle, Settings as SettingsIcon, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Player, LineupSlot, FieldPosition } from '@/types/player';
import { lyraApi, settingsApi } from '@/api/client';
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
  const { provider, preferredModel } = useAIStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userContent = input.trim();
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: userContent,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);
    setError(null);

    // Prepare context message for the AI
    // We send context as a hidden system/user message or part of the first message
    // Since streamChat takes ChatMessage[], we construct the conversation history locally
    // but we need to inject the game state context.

    // Convert frontend data to backend format for context string
    const backendPlayers = players.map(p => ({
      id: p.id,
      ...mapFrontendPlayerToBackend(p)
    }));
    const backendLineup = mapFrontendLineupToBackend(lineup);
    const backendField = mapFrontendFieldToBackend(fieldPositions);

    const contextPrompt = `
Context Data:
Lineup: ${JSON.stringify(backendLineup)}
Field Positions: ${JSON.stringify(backendField)}
Players: ${JSON.stringify(backendPlayers.map(p => ({
      name: p.name,
      primary: p.primary_position,
      bats: p.bats
    })))}

User Question: ${userContent}
    `.trim();

    const conversationHistory: ChatMessage[] = [
      { role: 'system', content: "You are Lyra, an advanced baseball coaching assistant in the Dugout app. Analyze the provided lineup and field positions. Be concise, strategic, and helpful." },
      ...messages.map(m => ({
        role: m.role === 'lyra' ? 'assistant' : 'user',
        content: m.content
      }) as ChatMessage),
      { role: 'user', content: contextPrompt }
    ];

    try {
      let currentResponseContent = "";
      const responseId = (Date.now() + 1).toString();

      // Create a placeholder message for streaming
      setMessages(prev => [...prev, {
        id: responseId,
        role: 'lyra',
        content: '',
        timestamp: new Date()
      }]);

      await lyraApi.streamChat(
        conversationHistory,
        preferredModel,
        (chunk) => {
          currentResponseContent += chunk;
          setMessages(prev => prev.map(m =>
            m.id === responseId
              ? { ...m, content: currentResponseContent }
              : m
          ));
        },
        () => setIsTyping(false),
        (err) => {
          console.error("Stream error:", err);
          setError("Connection interrupted.");
          setIsTyping(false);
        }
      );
    } catch (err) {
      console.error('Failed to start stream:', err);
      setError('Failed to connect to Lyra.');
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
      <div className="p-4 border-b border-lyra-border flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-4 h-4 text-gold" />
            <h2 className="text-lg font-semibold">Lyra</h2>
            <span className="text-[10px] bg-lyra-border/50 px-1.5 py-0.5 rounded text-lyra-foreground/60">
              {provider}
            </span>
          </div>
          <p className="text-xs text-lyra-foreground/60">
            Ask for perspective. You make the decisions.
          </p>
        </div>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className={cn(
            "p-2 rounded-md transition-colors hover:bg-lyra-muted",
            showSettings && "bg-lyra-muted text-gold"
          )}
        >
          <SettingsIcon className="w-5 h-5" />
        </button>
      </div>

      {error && (
        <div className="px-4 py-2 bg-destructive/10 border-b border-destructive/20 text-destructive text-xs flex items-center gap-2">
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
          <div className="p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="space-y-4">
                <p className="text-sm text-lyra-foreground/50 text-center py-4">
                  Ask me about your lineup, positioning, or strategy considerations.
                </p>
                <div className="space-y-2">
                  <p className="text-xs text-lyra-foreground/40 uppercase tracking-wide">
                    Try asking:
                  </p>
                  {examplePrompts.map((prompt, i) => (
                    <button
                      key={i}
                      onClick={() => handleExampleClick(prompt)}
                      className="block w-full text-left px-3 py-2 rounded-lg text-sm text-lyra-foreground/70 bg-lyra-muted/30 hover:bg-lyra-muted/50 transition-colors"
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
                    message.role === 'user' ? 'ml-4' : 'mr-4'
                  )}
                >
                  <div
                    className={cn(
                      'rounded-lg px-3 py-2.5 text-sm shadow-sm',
                      message.role === 'user'
                        ? 'bg-lyra-muted text-lyra-foreground ml-auto max-w-[85%] border border-lyra-border'
                        : 'bg-card/95 text-card-foreground border border-border/70 mr-auto max-w-[92%]'
                    )}
                  >
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        p: ({ children }) => <p className="mb-1 last:mb-0 leading-relaxed">{children}</p>,
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
                        ul: ({ children }) => <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>,
                        ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 space-y-1">{children}</ol>,
                        h1: ({ children }) => <h1 className="text-sm font-bold mt-2 mb-1">{children}</h1>,
                        h2: ({ children }) => <h2 className="text-sm font-bold mt-2 mb-1">{children}</h2>,
                        h3: ({ children }) => <h3 className="text-sm font-bold mt-2 mb-1">{children}</h3>,
                        blockquote: ({ children }) => <blockquote className="border-l-2 border-primary/40 pl-2 italic my-2">{children}</blockquote>,
                        code: ({ children }) => <code className="bg-muted rounded px-1 py-0.5 text-xs font-mono text-foreground">{children}</code>,
                      }}
                    >
                      {message.content}
                    </ReactMarkdown>
                  </div>
                  <p className="text-[10px] text-lyra-foreground/40 mt-1 px-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              ))
            )}
            <div ref={scrollRef} />

            {isTyping && (
              <div className="flex items-center gap-1 px-3 py-2 text-lyra-foreground/50">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span className="text-xs">Thinking...</span>
              </div>
            )}
          </div>
        </ScrollArea>
      )}

      {/* Input */}
      <div className="p-3 border-t border-lyra-border">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your lineup or strategy..."
            rows={2}
            className="flex-1 resize-none rounded-lg bg-lyra-muted/50 border border-lyra-border px-3 py-2 text-sm text-lyra-foreground placeholder:text-lyra-foreground/40 focus:outline-none focus:ring-1 focus:ring-gold/50"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
            className="p-2.5 rounded-lg bg-gold/90 text-gold-foreground hover:bg-gold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
