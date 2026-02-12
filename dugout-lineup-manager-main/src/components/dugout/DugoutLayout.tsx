import { useState, useCallback, useEffect, useRef } from 'react';
import { Position } from '@/types/player';
import { usePlayers } from '@/hooks/usePlayers';
import { useGameConfig } from '@/hooks/useGameConfig';
import { PlayersSidebar } from './PlayersSidebar';
import { GameCanvas } from './GameCanvas';
import { PlayerRankingsPanel } from './PlayerRankingsPanel';
import { LyraPanel } from './LyraPanel';
import { toast } from 'sonner';
import { useAIStore } from '@/store/aiStore';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import type { ImperativePanelHandle } from 'react-resizable-panels';
import { PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen, Sparkles, TrendingUp } from 'lucide-react';

export function DugoutLayout() {
  const {
    players,
    addPlayer,
    updatePlayer,
    removePlayer
  } = usePlayers();

  const {
    useDH,
    toggleDH,
    lineup,
    assignToLineup,
    removeFromLineup,
    reorderLineup,
    fieldPositions,
    assignToField,
    removeFromField,
    benchPlayerIds,
    addToBench,
    savedConfigs,
    currentConfigName,
    saveConfiguration,
    loadConfiguration,
    deleteConfiguration,
    clearLineup,
    clearField,
    isDirty,
    syncError
  } = useGameConfig(players);

  const [draggingPlayerId, setDraggingPlayerId] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<'rankings' | 'lyra'>('rankings');
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);

  const leftPanelRef = useRef<ImperativePanelHandle>(null);
  const rightPanelRef = useRef<ImperativePanelHandle>(null);

  const { uiTheme } = useAIStore();

  // Warn on page unload if there are unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = ''; // Chrome requires returnValue to be set
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // Show toast when sync errors occur
  useEffect(() => {
    if (syncError) {
      toast.error(syncError);
    }
  }, [syncError]);

  const handleDragPlayer = (playerId: string) => {
    setDraggingPlayerId(playerId);
  };

  const handleDragEnd = () => {
    setDraggingPlayerId(null);
  };

  const handleAssignToLineup = useCallback((playerId: string, order: number, position: Position | null) => {
    assignToLineup(playerId, order, position, players);
  }, [assignToLineup, players]);

  const toggleLeftPanel = () => {
    if (leftPanelCollapsed) {
      leftPanelRef.current?.expand();
    } else {
      leftPanelRef.current?.collapse();
    }
  };

  const toggleRightPanel = () => {
    if (rightPanelCollapsed) {
      rightPanelRef.current?.expand();
    } else {
      rightPanelRef.current?.collapse();
    }
  };

  return (
    <div
      className={cn("h-screen flex overflow-hidden", uiTheme === 'glass' && "glass-panel")}
      onDragEnd={handleDragEnd}
    >
      <ResizablePanelGroup direction="horizontal">
        <ResizablePanel
          ref={leftPanelRef}
          defaultSize={24}
          minSize={16}
          maxSize={34}
          collapsible
          collapsedSize={4}
          onCollapse={() => setLeftPanelCollapsed(true)}
          onExpand={() => setLeftPanelCollapsed(false)}
          className="border-r border-sidebar-border"
        >
          {leftPanelCollapsed ? (
            <div className="h-full bg-sidebar text-sidebar-foreground flex flex-col items-center justify-between py-2">
              <span className="text-[10px] uppercase tracking-[0.2em] text-sidebar-foreground/60 [writing-mode:vertical-rl] [transform:rotate(180deg)]">
                Players
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleLeftPanel}
                aria-label="Expand players panel"
                className="h-7 w-7 text-sidebar-foreground/80 hover:text-sidebar-foreground"
              >
                <PanelLeftOpen className="w-3.5 h-3.5" />
              </Button>
            </div>
          ) : (
            <div className="relative h-full">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleLeftPanel}
                aria-label="Collapse players panel"
                className="absolute right-1 top-1 z-20 h-6 w-6 bg-sidebar/70 text-sidebar-foreground/70 hover:text-sidebar-foreground"
                title="Collapse players panel"
              >
                <PanelLeftClose className="w-3.5 h-3.5" />
              </Button>
              <PlayersSidebar
                players={players}
                lineup={lineup}
                fieldPositions={fieldPositions}
                onAddPlayer={addPlayer}
                onUpdatePlayer={updatePlayer}
                onRemovePlayer={removePlayer}
                onDragPlayer={handleDragPlayer}
              />
            </div>
          )}
        </ResizablePanel>

        <ResizableHandle className="bg-border/70 hover:bg-border" />

        <ResizablePanel defaultSize={52} minSize={34} className="min-w-0">
          <GameCanvas
            lineup={lineup}
            fieldPositions={fieldPositions}
            players={players}
            useDH={useDH}
            benchPlayerIds={benchPlayerIds}
            savedConfigs={savedConfigs}
            currentConfigName={currentConfigName}
            onToggleDH={toggleDH}
            onAssignToLineup={handleAssignToLineup}
            onRemoveFromLineup={removeFromLineup}
            onReorderLineup={reorderLineup}
            onAssignToField={assignToField}
            onRemoveFromField={removeFromField}
            onAddToBench={addToBench}
            onSaveConfig={saveConfiguration}
            onLoadConfig={loadConfiguration}
            onDeleteConfig={deleteConfiguration}
            onClearLineup={clearLineup}
            onClearField={clearField}
            draggingPlayerId={draggingPlayerId}
            onDragPlayer={handleDragPlayer}
          />
        </ResizablePanel>

        <ResizableHandle className="bg-border/70 hover:bg-border" />

        <ResizablePanel
          ref={rightPanelRef}
          defaultSize={24}
          minSize={18}
          maxSize={36}
          collapsible
          collapsedSize={4}
          onCollapse={() => setRightPanelCollapsed(true)}
          onExpand={() => setRightPanelCollapsed(false)}
          className="border-l border-lyra-border"
        >
          {rightPanelCollapsed ? (
            <div className="h-full bg-lyra text-lyra-foreground flex flex-col items-center justify-between py-2">
              <button
                type="button"
                onClick={() => setActivePanel('rankings')}
                aria-label="Show rankings panel"
                aria-pressed={activePanel === 'rankings'}
                className={cn(
                  "h-7 w-7 rounded border border-lyra-border flex items-center justify-center focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                  activePanel === 'rankings' ? "text-gold border-gold/40" : "text-lyra-foreground/55"
                )}
                title="Rankings panel"
              >
                <TrendingUp className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setActivePanel('lyra')}
                aria-label="Show AI Coach panel"
                aria-pressed={activePanel === 'lyra'}
                className={cn(
                  "h-7 w-7 rounded border border-lyra-border flex items-center justify-center focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                  activePanel === 'lyra' ? "text-gold border-gold/40" : "text-lyra-foreground/55"
                )}
                title="AI Coach panel"
              >
                <Sparkles className="w-3.5 h-3.5" />
              </button>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleRightPanel}
                aria-label="Expand right panel"
                className="h-7 w-7 text-lyra-foreground/80 hover:text-lyra-foreground"
              >
                <PanelRightOpen className="w-3.5 h-3.5" />
              </Button>
            </div>
          ) : (
            <div className="h-full flex flex-col">
              <div className="flex border-b border-lyra-border bg-lyra h-9">
                <button
                  type="button"
                  onClick={() => setActivePanel('rankings')}
                  aria-pressed={activePanel === 'rankings'}
                  className={cn(
                    "flex-1 px-2 py-1.5 text-xs font-medium transition-colors flex items-center justify-center gap-1.5 border-b focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                    activePanel === 'rankings'
                      ? 'bg-lyra-muted/60 text-gold border-gold/60'
                      : 'text-lyra-foreground/65 border-transparent hover:text-lyra-foreground hover:bg-lyra-muted/40'
                  )}
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  Rankings
                </button>
                <button
                  type="button"
                  onClick={() => setActivePanel('lyra')}
                  aria-pressed={activePanel === 'lyra'}
                  className={cn(
                    "flex-1 px-2 py-1.5 text-xs font-medium transition-colors flex items-center justify-center gap-1.5 border-b focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                    activePanel === 'lyra'
                      ? 'bg-lyra-muted/60 text-gold border-gold/60'
                      : 'text-lyra-foreground/65 border-transparent hover:text-lyra-foreground hover:bg-lyra-muted/40'
                  )}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  AI Coach
                </button>
                <button
                  type="button"
                  onClick={toggleRightPanel}
                  aria-label="Collapse right panel"
                  className="px-1.5 text-lyra-foreground/60 hover:text-lyra-foreground border-l border-lyra-border focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  title="Collapse right panel"
                >
                  <PanelRightClose className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex-1 min-h-0">
                {activePanel === 'rankings' ? (
                  <PlayerRankingsPanel players={players} />
                ) : (
                  <LyraPanel
                    players={players}
                    lineup={lineup}
                    fieldPositions={fieldPositions}
                  />
                )}
              </div>
            </div>
          )}
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
