/**
 * CHANGES: Updated to call real backend Lyra API instead of mock responses
 * - Now receives lineup, field positions, and players as props
 * - Sends actual context to POST /lyra/analyze
 * - Displays real AI coaching perspective
 * - Added error handling for API failures
 */

import { useState } from 'react';
import { Send, Sparkles, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Player, LineupSlot, FieldPosition } from '@/types/player';
import { lyraApi } from '@/api/client';
import { mapFrontendPlayerToBackend, mapFrontendLineupToBackend, mapFrontendFieldToBackend } from '@/api/mappers';

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
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);
    setError(null);

    try {
      // Convert frontend data to backend format
      // Keep ID attached during mapping to prevent mismatch
      const backendPlayers = players.map(p => ({
        id: p.id,
        ...mapFrontendPlayerToBackend(p)
      }));
      const backendLineup = mapFrontendLineupToBackend(lineup);
      const backendField = mapFrontendFieldToBackend(fieldPositions);

      // Call real Lyra API
      const response = await lyraApi.analyze({
        lineup: backendLineup,
        field_positions: backendField,
        players: backendPlayers,
        question: input.trim()
      });

      const lyraMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'lyra',
        content: response.analysis,
        timestamp: new Date(response.timestamp)
      };

      setMessages(prev => [...prev, lyraMessage]);
    } catch (err) {
      console.error('Failed to get Lyra response:', err);
      setError(
        err instanceof Error 
          ? err.message 
          : 'Failed to connect to Lyra. Make sure the backend is running.'
      );
      
      // Add error message to chat
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'lyra',
        content: '⚠️ I\'m having trouble connecting right now. Make sure the backend is running with Ollama and the lyra-coach model.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
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
      <div className="p-4 border-b border-lyra-border">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-4 h-4 text-gold" />
          <h2 className="text-lg font-semibold">Lyra</h2>
        </div>
        <p className="text-xs text-lyra-foreground/60">
          Ask for perspective. You make the decisions.
        </p>
        {error && (
          <div className="mt-2 flex items-start gap-2 text-xs text-red-400 bg-red-950/20 rounded p-2">
            <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Messages */}
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
                  'animate-fade-in',
                  message.role === 'user' ? 'ml-4' : 'mr-4'
                )}
              >
                <div
                  className={cn(
                    'rounded-lg px-3 py-2.5 text-sm',
                    message.role === 'user'
                      ? 'bg-lyra-muted text-lyra-foreground ml-auto max-w-[85%]'
                      : 'bg-lyra-border/50 text-lyra-foreground'
                  )}
                >
                  {message.content}
                </div>
                <p className="text-[10px] text-lyra-foreground/40 mt-1 px-1">
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            ))
          )}

          {isTyping && (
            <div className="flex items-center gap-1 px-3 py-2 text-lyra-foreground/50">
              <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
              <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" style={{ animationDelay: '0.2s' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" style={{ animationDelay: '0.4s' }} />
            </div>
          )}
        </div>
      </ScrollArea>

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
