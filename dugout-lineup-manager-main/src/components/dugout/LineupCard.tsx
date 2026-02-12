import { LineupSlot, Player, Position, FieldPosition } from '@/types/player';
import { cn } from '@/lib/utils';
import { User, X } from 'lucide-react';
import { usePlayerSeasonStats } from '@/hooks/usePlayerSeasonStats';

interface LineupCardProps {
  lineup: LineupSlot[];
  players: Player[];
  fieldPositions: FieldPosition[];
  useDH: boolean;
  benchPlayerIds: string[];
  onAssign: (playerId: string, order: number, position: Position | null) => void;
  onRemove: (order: number) => void;
  onReorder: (fromOrder: number, toOrder: number) => void;
  onAddToBench: (playerId: string) => void;
  draggingPlayerId: string | null;
  onDragPlayer: (playerId: string) => void;
}

// Helper component to display player stats in lineup
function PlayerStatsDisplay({ playerId }: { playerId: string }) {
  const { stats, loading } = usePlayerSeasonStats(playerId);

  if (loading || !stats) return null;

  // Show key batting stats
  if (stats.hitting.ab && stats.hitting.ab > 0) {
    return (
      <div className="flex gap-2 text-[10px] text-muted-foreground">
        {stats.hitting.avg !== undefined && (
          <span>AVG: {stats.hitting.avg.toFixed(3).replace(/^0/, '')}</span>
        )}
        {stats.hitting.hr !== undefined && (
          <span>HR: {stats.hitting.hr}</span>
        )}
        {stats.hitting.rbi !== undefined && (
          <span>RBI: {stats.hitting.rbi}</span>
        )}
      </div>
    );
  }

  // Show key pitching stats
  if (stats.pitching.ip && stats.pitching.ip > 0) {
    return (
      <div className="flex gap-2 text-[10px] text-muted-foreground">
        {stats.pitching.era !== undefined && (
          <span>ERA: {stats.pitching.era.toFixed(2)}</span>
        )}
        {stats.pitching.k !== undefined && (
          <span>K: {stats.pitching.k}</span>
        )}
      </div>
    );
  }

  return null;
}

export function LineupCard({
  lineup,
  players,
  fieldPositions,
  useDH,
  benchPlayerIds,
  onAssign,
  onRemove,
  onReorder,
  onAddToBench,
  draggingPlayerId,
  onDragPlayer
}: LineupCardProps) {
  const getPlayer = (id: string | null) =>
    id ? players.find(p => p.id === id) : null;

  const handleDrop = (e: React.DragEvent, order: number) => {
    e.preventDefault();
    // Try to get player ID from state first, then from dataTransfer as fallback
    const playerId = draggingPlayerId || e.dataTransfer.getData('text/plain');
    if (playerId) {
      onAssign(playerId, order, null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const benchPlayers = benchPlayerIds
    .map(id => players.find(p => p.id === id))
    .filter(Boolean) as Player[];

  return (
    <div className="bg-card rounded-md border border-border overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2 bg-muted/40 border-b border-border">
        <h3 className="text-xs font-semibold uppercase tracking-[0.08em] text-foreground/80">Batting Order</h3>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          {useDH ? 'Designated Hitter active' : 'Pitcher bats'}
        </p>
      </div>

      {/* Lineup slots */}
      <div className="divide-y divide-border">
        {lineup.map(slot => {
          const player = getPlayer(slot.playerId);
          const isPitcherSlot = !useDH && slot.order === 9;

          return (
            <div
              key={slot.order}
              className={cn(
                'lineup-slot flex items-center gap-2 px-3 py-2',
                !player && 'lineup-slot-empty',
                draggingPlayerId && 'drag-over'
              )}
              onDrop={e => handleDrop(e, slot.order)}
              onDragOver={handleDragOver}
            >
              {/* Order number */}
              <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-semibold text-muted-foreground">
                {slot.order}
              </div>

              {/* Player info */}
              <div className="flex-1 min-w-0">
                {player ? (
                  <div
                    className="cursor-move"
                    draggable={true}
                    onDragStart={(e) => {
                      e.dataTransfer.effectAllowed = 'move';
                      e.dataTransfer.setData('text/plain', player.id);
                      onDragPlayer(player.id);
                    }}
                  >
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <div className="flex items-center gap-1.5">
                        {player.number && (
                          <span className="text-[10px] font-medium text-muted-foreground">
                            #{player.number}
                          </span>
                        )}
                        <span className="text-xs font-medium text-foreground">{player.name}</span>
                      </div>
                      <div className="flex gap-0.5">
                        {/* Show only the current field position */}
                        {(() => {
                          const fieldPos = fieldPositions.find(fp => fp.playerId === player.id);
                          if (fieldPos) {
                            return (
                              <span key={fieldPos.position} className="position-badge text-[10px]">
                                {fieldPos.position}
                              </span>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    </div>
                    {/* Stats row */}
                    <PlayerStatsDisplay playerId={player.id} />
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground/50 italic">
                    {isPitcherSlot ? 'Pitcher' : 'Drag player here'}
                  </span>
                )}
              </div>

              {/* Actions */}
              {player && (
                <button
                  onClick={() => onRemove(slot.order)}
                  className="p-0.5 rounded hover:bg-muted transition-colors"
                >
                  <X className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Bench section */}
      <div className="border-t border-border">
        <div className="px-3 py-1.5 bg-muted/40">
          <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.1em]">
            Bench
          </h4>
        </div>
        <div
          className={cn(
            'min-h-[44px] p-2',
            draggingPlayerId && 'bg-accent/30'
          )}
          onDrop={e => {
            e.preventDefault();
            const playerId = draggingPlayerId || e.dataTransfer.getData('text/plain');
            if (playerId) {
              onAddToBench(playerId);
            }
          }}
          onDragOver={handleDragOver}
        >
          {benchPlayers.length === 0 ? (
            <p className="text-[10px] text-muted-foreground/50 text-center py-1 italic">
              Drag players here for bench
            </p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {benchPlayers.map(player => (
                <div
                  key={player.id}
                  className="flex items-center gap-1 px-1.5 py-0.5 bg-muted rounded text-xs"
                >
                  <User className="w-3 h-3 text-muted-foreground" />
                  <span>{player.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
