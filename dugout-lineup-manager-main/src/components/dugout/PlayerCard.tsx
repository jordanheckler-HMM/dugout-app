import { Player } from '@/types/player';
import { GripVertical, MoreVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePlayerSeasonStats } from '@/hooks/usePlayerSeasonStats';

interface PlayerCardProps {
  player: Player;
  compact?: boolean;
  isDragging?: boolean;
  isActive?: boolean;
  onEdit?: () => void;
  onDragStart?: () => void;
}

function formatStat(key: string, value: number): string {
  if (['avg', 'obp', 'slg', 'ops'].includes(key)) {
    return value.toFixed(3).replace(/^0/, '');
  }
  if (['era', 'whip', 'fpct'].includes(key)) {
    return value.toFixed(2);
  }
  return value.toString();
}

function getStatLabel(key: string): string {
  const labels: Record<string, string> = {
    avg: 'AVG',
    obp: 'OBP',
    slg: 'SLG',
    ops: 'OPS',
    hr: 'HR',
    rbi: 'RBI',
    sb: 'SB',
    era: 'ERA',
    whip: 'WHIP',
    k: 'K',
    fpct: 'FLD%'
  };
  return labels[key] || key.toUpperCase();
}

export function PlayerCard({ player, compact, isDragging, isActive, onEdit, onDragStart }: PlayerCardProps) {
  // Fetch real season stats from backend
  const { stats: seasonStats, loading: statsLoading } = usePlayerSeasonStats(player.id);
  
  // Determine which stats to display
  const displayStats: [string, number][] = [];
  
  if (seasonStats && !statsLoading) {
    // Show hitting stats if player has at bats
    if (seasonStats.hitting.ab && seasonStats.hitting.ab > 0) {
      if (seasonStats.hitting.avg !== undefined) displayStats.push(['avg', seasonStats.hitting.avg]);
      if (seasonStats.hitting.hr !== undefined) displayStats.push(['hr', seasonStats.hitting.hr]);
      if (seasonStats.hitting.rbi !== undefined) displayStats.push(['rbi', seasonStats.hitting.rbi]);
      if (seasonStats.hitting.ops !== undefined && !compact) displayStats.push(['ops', seasonStats.hitting.ops]);
    }
    
    // Show pitching stats if player has innings pitched
    if (seasonStats.pitching.ip && seasonStats.pitching.ip > 0) {
      if (seasonStats.pitching.era !== undefined) displayStats.push(['era', seasonStats.pitching.era]);
      if (seasonStats.pitching.k !== undefined) displayStats.push(['k', seasonStats.pitching.k]);
      if (seasonStats.pitching.whip !== undefined && !compact) displayStats.push(['whip', seasonStats.pitching.whip]);
    }
  }
  
  // Limit displayed stats based on compact mode
  const finalStats = displayStats.slice(0, compact ? 2 : 4);

  const statusColors = {
    active: 'bg-field/15 text-field-dark',
    inactive: 'bg-muted text-muted-foreground',
    archived: 'bg-muted/50 text-muted-foreground/60'
  };

  return (
    <div
      className={cn(
        'group relative bg-card rounded-lg border p-3 transition-all duration-150',
        'hover:shadow-card cursor-grab active:cursor-grabbing',
        isDragging && 'shadow-card-hover opacity-90 scale-[1.02]',
        player.status === 'archived' && 'opacity-60',
        isActive ? 'border-l-4 border-l-primary bg-muted/20' : 'border-border'
      )}
      draggable
      onDragStart={onDragStart}
    >
      {/* Drag handle */}
      <div className="absolute left-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-50 transition-opacity">
        <GripVertical className="w-4 h-4 text-muted-foreground" />
      </div>

      <div className="flex items-start gap-3 pl-3">
        {/* Number badge */}
        {player.number && (
          <div className="flex-shrink-0 w-8 h-8 rounded bg-primary text-primary-foreground text-sm font-semibold flex items-center justify-center">
            {player.number}
          </div>
        )}

        <div className="flex-1 min-w-0">
          {/* Name and status */}
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-foreground truncate">{player.name}</span>
            {player.status !== 'active' && (
              <span className={cn('text-[10px] px-1.5 py-0.5 rounded uppercase tracking-wide', statusColors[player.status])}>
                {player.status}
              </span>
            )}
          </div>

          {/* Positions and handedness */}
          <div className="flex items-center gap-2 mb-2">
            <div className="flex gap-1">
              {/* Primary position with green badge */}
              <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-green-500 text-white">
                {player.primaryPosition}
              </span>
              {/* Secondary positions with yellow badges */}
              {player.secondaryPositions?.map(pos => (
                <span key={pos} className="px-1.5 py-0.5 rounded text-xs font-medium bg-yellow-500 text-white">
                  {pos}
                </span>
              ))}
            </div>
            <span className="text-xs text-muted-foreground">
              B: {player.bats} / T: {player.throws}
            </span>
          </div>

          {/* Stats */}
          {!compact && finalStats.length > 0 && (
            <div className="flex gap-3 text-xs">
              {finalStats.map(([key, value]) => (
                <div key={key} className="flex items-center gap-1">
                  <span className="text-foreground/70">{getStatLabel(key)}</span>
                  <span className="font-semibold text-foreground">
                    {formatStat(key, value)}
                  </span>
                </div>
              ))}
            </div>
          )}
          
          {!compact && statsLoading && (
            <div className="text-xs text-muted-foreground">
              Loading stats...
            </div>
          )}
        </div>

        {/* Edit button */}
        {onEdit && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-muted transition-all"
          >
            <MoreVertical className="w-4 h-4 text-muted-foreground" />
          </button>
        )}
      </div>
    </div>
  );
}
