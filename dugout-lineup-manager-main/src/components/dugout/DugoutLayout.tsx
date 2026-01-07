import { useState, useCallback, useEffect } from 'react';
import { Position } from '@/types/player';
import { usePlayers } from '@/hooks/usePlayers';
import { useGameConfig } from '@/hooks/useGameConfig';
import { PlayersSidebar } from './PlayersSidebar';
import { GameCanvas } from './GameCanvas';
import { LyraPanel } from './LyraPanel';
import { toast } from 'sonner';

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

  return (
    <div
      className="h-screen flex overflow-hidden"
      onDragEnd={handleDragEnd}
    >
      {/* Left sidebar - Players */}
      <div className="w-80 flex-shrink-0 border-r border-sidebar-border">
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

      {/* Main canvas */}
      <div className="flex-1 min-w-0">
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
      </div>

      {/* Right panel - Lyra */}
      <div className="w-80 flex-shrink-0 border-l border-lyra-border">
        <LyraPanel 
          lineup={lineup}
          fieldPositions={fieldPositions}
          players={players}
        />
      </div>
    </div>
  );
}
