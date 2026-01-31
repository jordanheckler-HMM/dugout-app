import { LineupSlot, Player, Position } from '@/types/player';
import { cn } from '@/lib/utils';
import { User, X } from 'lucide-react';
import { usePlayerSeasonStats } from '@/hooks/usePlayerSeasonStats';

interface LineupCardProps {
  lineup: LineupSlot[];
  players: Player[];
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
    if (draggingPlayerId) {
      onAssign(draggingPlayerId, order, null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const benchPlayers = benchPlayerIds
    .map(id => players.find(p => p.id === id))
    .filter(Boolean) as Player[];

  return (
    <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-primary text-primary-foreground">
        <h3 className="font-semibold">Batting Order</h3>
        <p className="text-xs text-primary-foreground/70 mt-0.5">
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
                'lineup-slot flex items-center gap-3 px-4 py-3',
                !player && 'lineup-slot-empty',
                draggingPlayerId && 'drag-over'
              )}
              onDrop={e => handleDrop(e, slot.order)}
              onDragOver={handleDragOver}
            >
              {/* Order number */}
              <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-sm font-semibold text-muted-foreground">
                {slot.order}
              </div>

              {/* Player info */}
              <div className="flex-1 min-w-0">
                {player ? (
                  <div 
                    className="cursor-move"
                    draggable
                    onDragStart={() => onDragPlayer(player.id)}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div className="flex items-center gap-2">
                        {player.number && (
                          <span className="text-xs font-medium text-muted-foreground">
                            #{player.number}
                          </span>
                        )}
                        <span className="font-medium text-foreground">{player.name}</span>
                      </div>
                      <div className="flex gap-1">
                        {player.positions.slice(0, 2).map(pos => (
                          <span key={pos} className="position-badge text-[10px]">
                            {pos}
                          </span>
                        ))}
                      </div>
                    </div>
                    {/* Stats row */}
                    <PlayerStatsDisplay playerId={player.id} />
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground/50 italic">
                    {isPitcherSlot ? 'Pitcher' : 'Drag player here'}
                  </span>
                )}
              </div>

              {/* Actions */}
              {player && (
                <button
                  onClick={() => onRemove(slot.order)}
                  className="p-1 rounded hover:bg-muted transition-colors"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Bench section */}
      <div className="border-t border-border">
        <div className="px-4 py-2 bg-muted/50">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Bench
          </h4>
        </div>
        <div
          className={cn(
            'min-h-[60px] p-3',
            draggingPlayerId && 'bg-accent/30'
          )}
          onDrop={e => {
            e.preventDefault();
            if (draggingPlayerId) {
              onAddToBench(draggingPlayerId);
            }
          }}
          onDragOver={handleDragOver}
        >
          {benchPlayers.length === 0 ? (
            <p className="text-xs text-muted-foreground/50 text-center py-2 italic">
              Drag players here for bench
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {benchPlayers.map(player => (
                <div
                  key={player.id}
                  className="flex items-center gap-1.5 px-2 py-1 bg-muted rounded text-sm"
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
