import { useState, useCallback, useEffect, useRef } from 'react';
import { Position } from '@/types/player';
import { usePlayers } from '@/hooks/usePlayers';
import { useGameConfig } from '@/hooks/useGameConfig';
import { PlayersSidebar } from './PlayersSidebar';
import { GameCanvas } from './GameCanvas';
import { PlayerRankingsPanel } from './PlayerRankingsPanel';
import { Button } from '@/components/ui/button';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import type { ImperativePanelHandle } from 'react-resizable-panels';
import { AlertTriangle, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen, TrendingUp, Users } from 'lucide-react';

export function DugoutLayout() {
  const {
    players,
    loading: playersLoading,
    error: playersError,
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
    loading: gameLoading,
    loadError,
    syncError
  } = useGameConfig(players);

  const [draggingPlayerId, setDraggingPlayerId] = useState<string | null>(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);

  const leftPanelRef = useRef<ImperativePanelHandle>(null);
  const rightPanelRef = useRef<ImperativePanelHandle>(null);
  const compactLayoutRef = useRef<boolean | null>(null);

  useEffect(() => {
    if (playersLoading || gameLoading || playersError || loadError) return;

    const updatePanelsForWindow = () => {
      const compact = window.innerWidth < 1120;
      if (compactLayoutRef.current === compact) return;
      compactLayoutRef.current = compact;
      if (compact) {
        leftPanelRef.current?.collapse();
        rightPanelRef.current?.collapse();
      } else {
        leftPanelRef.current?.expand();
        rightPanelRef.current?.expand();
      }
    };

    updatePanelsForWindow();
    window.addEventListener('resize', updatePanelsForWindow);
    return () => window.removeEventListener('resize', updatePanelsForWindow);
  }, [playersLoading, gameLoading, playersError, loadError]);

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

  const handleDragPlayer = (playerId: string) => {
    setDraggingPlayerId(playerId);
    setSelectedPlayerId(null);
  };

  const handleDragEnd = () => {
    setDraggingPlayerId(null);
  };

  const handleAssignToLineup = useCallback((playerId: string, order: number, position: Position | null) => {
    assignToLineup(playerId, order, position, players);
    setSelectedPlayerId(null);
  }, [assignToLineup, players]);

  const handleAssignToField = useCallback((playerId: string, position: Position) => {
    assignToField(playerId, position);
    setSelectedPlayerId(null);
  }, [assignToField]);

  const selectedPlayer = players.find(player => player.id === selectedPlayerId) ?? null;

  if (playersError || loadError) {
    return (
      <div className="flex h-screen items-center justify-center bg-background px-5">
        <div role="alert" className="w-full max-w-md rounded-lg border border-destructive/30 bg-card p-6 text-center shadow-sm">
          <AlertTriangle className="mx-auto h-8 w-8 text-destructive" aria-hidden="true" />
          <h1 className="mt-3 text-lg font-semibold">Dugout data is unavailable</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Dugout could not load your roster and game setup. Try again, then restart Dugout if this continues.
          </p>
          <Button className="mt-5" onClick={() => window.location.reload()}>Try again</Button>
        </div>
      </div>
    );
  }

  if (playersLoading || gameLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background px-5" role="status">
        <div className="text-center">
          <Users className="mx-auto h-8 w-8 animate-pulse text-primary/70" aria-hidden="true" />
          <p className="mt-3 text-sm font-medium">Loading Dugout…</p>
        </div>
      </div>
    );
  }

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
      className="h-screen flex flex-col overflow-hidden bg-background"
      onDragEnd={handleDragEnd}
    >
      {syncError && (
        <div role="alert" className="flex items-center gap-2 border-b border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-foreground">
          <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
          <span className="min-w-0 flex-1">{syncError} Your last change was restored.</span>
          <button type="button" onClick={() => window.location.reload()} className="rounded px-2 py-1 font-semibold hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Reload</button>
        </div>
      )}
      <ResizablePanelGroup direction="horizontal" className="min-h-0 flex-1">
        <ResizablePanel
          ref={leftPanelRef}
          defaultSize={24}
          minSize={16}
          maxSize={34}
          collapsible
          collapsedSize={8}
          onCollapse={() => setLeftPanelCollapsed(true)}
          onExpand={() => setLeftPanelCollapsed(false)}
          className="border-r border-sidebar-border"
        >
          {leftPanelCollapsed ? (
            <div className="h-full bg-sidebar text-sidebar-foreground flex flex-col items-center justify-between py-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleLeftPanel}
                aria-label="Expand players panel"
                className="h-9 w-9 text-sidebar-foreground/80 hover:text-sidebar-foreground"
              >
                <PanelLeftOpen className="w-3.5 h-3.5" />
              </Button>
              <span className="text-[10px] uppercase tracking-[0.16em] text-sidebar-foreground/70 [writing-mode:vertical-rl] [transform:rotate(180deg)]">
                Players
              </span>
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
                selectedPlayerId={selectedPlayerId}
                onSelectPlayer={(playerId) => setSelectedPlayerId(current => current === playerId ? null : playerId)}
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
            selectedPlayer={selectedPlayer}
            onClearSelectedPlayer={() => setSelectedPlayerId(null)}
            onOpenPlayers={() => leftPanelRef.current?.expand()}
            playersPanelCollapsed={leftPanelCollapsed}
            useDH={useDH}
            benchPlayerIds={benchPlayerIds}
            savedConfigs={savedConfigs}
            currentConfigName={currentConfigName}
            onToggleDH={toggleDH}
            onAssignToLineup={handleAssignToLineup}
            onRemoveFromLineup={removeFromLineup}
            onReorderLineup={reorderLineup}
            onAssignToField={handleAssignToField}
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
          collapsedSize={8}
          onCollapse={() => setRightPanelCollapsed(true)}
          onExpand={() => setRightPanelCollapsed(false)}
          className="border-l border-lyra-border"
        >
          {rightPanelCollapsed ? (
            <div className="h-full bg-card text-card-foreground flex flex-col items-center justify-between py-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleRightPanel}
                aria-label="Expand right panel"
                className="h-9 w-9 text-muted-foreground hover:text-foreground"
              >
                <PanelRightOpen className="w-3.5 h-3.5" />
              </Button>
              <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground [writing-mode:vertical-rl]">
                Season stats
              </span>
            </div>
          ) : (
            <div className="h-full flex flex-col">
              <div className="flex border-b border-border bg-card h-10 items-center px-3 gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold">Season leaders</span>
                <button
                  type="button"
                  onClick={toggleRightPanel}
                  aria-label="Collapse right panel"
                  className="ml-auto rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  title="Collapse right panel"
                >
                  <PanelRightClose className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex-1 min-h-0">
                <PlayerRankingsPanel players={players} />
              </div>
            </div>
          )}
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
