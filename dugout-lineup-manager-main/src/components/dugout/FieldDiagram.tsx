import { FieldPosition, Player, Position } from '@/types/player';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

type PositionFit = 'primary' | 'secondary' | 'out-of-position';

interface FieldDiagramProps {
  fieldPositions: FieldPosition[];
  players: Player[];
  onAssign: (playerId: string, position: Position) => void;
  onRemove: (position: Position) => void;
  draggingPlayerId: string | null;
  onDragPlayer: (playerId: string) => void;
}

function getPositionFit(player: Player, currentPosition: Position): PositionFit {
  if (player.primaryPosition === currentPosition) {
    return 'primary';
  }
  if (player.secondaryPositions?.includes(currentPosition)) {
    return 'secondary';
  }
  return 'out-of-position';
}

function getPositionFitStyles(fit: PositionFit): string {
  switch (fit) {
    case 'primary':
      return 'bg-green-500 ring-2 ring-green-400';  // Perfect fit - green
    case 'secondary':
      return 'bg-yellow-500 ring-2 ring-yellow-400'; // Okay fit - yellow
    case 'out-of-position':
      return 'bg-red-500 ring-2 ring-red-400';       // Bad fit - red
  }
}

export function FieldDiagram({
  fieldPositions,
  players,
  onAssign,
  onRemove,
  draggingPlayerId,
  onDragPlayer
}: FieldDiagramProps) {
  const getPlayer = (id: string | null) =>
    id ? players.find(p => p.id === id) : null;

  const handleDrop = (e: React.DragEvent, position: Position) => {
    e.preventDefault();
    const playerId = draggingPlayerId || e.dataTransfer.getData('text/plain');
    if (playerId) {
      onAssign(playerId, position);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  return (
    <div className="space-y-2.5">
      {/* Position Chemistry Legend */}
      <div className="flex items-center justify-center gap-4 p-2 bg-muted/20 rounded-md border border-border">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded-full bg-green-500 ring-1 ring-green-400" />
          <span className="text-[10px] font-medium">Primary</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded-full bg-yellow-500 ring-1 ring-yellow-400" />
          <span className="text-[10px] font-medium">Secondary</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded-full bg-red-500 ring-1 ring-red-400" />
          <span className="text-[10px] font-medium">Out of Position</span>
        </div>
      </div>

      {/* Field Diagram */}
      <div className="relative w-full aspect-square max-w-[500px] mx-auto">
        {/* Field SVG */}
        <svg
          viewBox="0 0 100 100"
          className="absolute inset-0 w-full h-full"
        >
          {/* Outfield grass */}
          <path
            d="M 5 50 Q 5 5 50 5 Q 95 5 95 50 L 75 70 L 50 95 L 25 70 Z"
            fill="hsl(var(--field))"
            className="opacity-80"
          />

          {/* Infield dirt */}
          <path
            d="M 25 70 L 50 45 L 75 70 L 50 95 Z"
            fill="hsl(var(--dirt))"
            className="opacity-90"
          />

          {/* Base paths */}
          <path
            d="M 50 95 L 75 70 L 50 45 L 25 70 Z"
            fill="none"
            stroke="hsl(var(--dirt-light))"
            strokeWidth="0.8"
          />

          {/* Pitcher's mound */}
          <circle
            cx="50"
            cy="65"
            r="3"
            fill="hsl(var(--dirt-light))"
          />

          {/* Bases */}
          <rect x="48.5" y="93.5" width="3" height="3" fill="white" transform="rotate(45 50 95)" />
          <rect x="73.5" y="68.5" width="3" height="3" fill="white" transform="rotate(45 75 70)" />
          <rect x="48.5" y="43.5" width="3" height="3" fill="white" transform="rotate(45 50 45)" />
          <rect x="23.5" y="68.5" width="3" height="3" fill="white" transform="rotate(45 25 70)" />

          {/* Foul lines */}
          <line x1="50" y1="95" x2="5" y2="50" stroke="white" strokeWidth="0.5" opacity="0.7" />
          <line x1="50" y1="95" x2="95" y2="50" stroke="white" strokeWidth="0.5" opacity="0.7" />
        </svg>

        {/* Position markers */}
        {fieldPositions.map(fp => {
          const player = getPlayer(fp.playerId);

          return (
            <div
              key={fp.position}
              className="absolute transform -translate-x-1/2 -translate-y-1/2"
              style={{
                left: `${fp.x}%`,
                top: `${fp.y}%`
              }}
              onDrop={e => handleDrop(e, fp.position)}
              onDragOver={handleDragOver}
            >
              <div
                className={cn(
                  'relative group',
                  draggingPlayerId && 'animate-pulse-soft'
                )}
              >
                {player ? (
                  <div
                    className="flex flex-col items-center cursor-move"
                    draggable={true}
                      onDragStart={(e) => {
                        e.dataTransfer.effectAllowed = 'move';
                        e.dataTransfer.setData('text/plain', player.id);
                        onDragPlayer(player.id);
                      }}
                    >
                    <div className="relative">
                      <div className={cn(
                        'w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold border border-black/20 text-white transition-all',
                        getPositionFitStyles(getPositionFit(player, fp.position))
                      )}>
                        {player.number || player.name.charAt(0)}
                      </div>

                      {/* Out of position warning badge */}
                      {getPositionFit(player, fp.position) === 'out-of-position' && (
                        <div className="absolute -top-1 -left-1 w-3.5 h-3.5 rounded-full bg-red-600 border border-white flex items-center justify-center animate-pulse">
                          <span className="text-[10px] font-bold text-white">!</span>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => onRemove(fp.position)}
                        aria-label={`Remove ${player.name} from ${fp.position}`}
                        className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity z-10 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                    <span className="mt-0.5 px-1.5 py-0.5 bg-card/90 rounded border border-border text-[10px] font-medium">
                      {player.name.split(' ').pop()}
                    </span>
                  </div>
                ) : (
                  <div
                    className={cn(
                      'w-8 h-8 rounded-full border border-dashed flex items-center justify-center text-[10px] font-semibold transition-colors',
                      draggingPlayerId
                        ? 'border-primary bg-primary/20 text-primary'
                        : 'border-primary/40 bg-card/80 text-muted-foreground'
                    )}
                  >
                    {fp.position}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
