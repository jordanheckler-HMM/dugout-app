import { useState } from 'react';
import { Player, PlayerStatus, LineupSlot, FieldPosition } from '@/types/player';
import { PlayerCard } from './PlayerCard';
import { PlayerEditDrawer } from './PlayerEditDrawer';
import { Plus, Users, UserX, Archive } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';

interface PlayersSidebarProps {
  players: Player[];
  lineup: LineupSlot[];
  fieldPositions: FieldPosition[];
  onAddPlayer: (player: Omit<Player, 'id'>) => Promise<unknown>;
  onUpdatePlayer: (id: string, updates: Partial<Player>) => Promise<void>;
  onRemovePlayer: (id: string) => Promise<void>;
  onDragPlayer: (playerId: string) => void;
}

type StatusFilter = 'all' | PlayerStatus;

export function PlayersSidebar({
  players,
  lineup,
  fieldPositions,
  onAddPlayer,
  onUpdatePlayer,
  onRemovePlayer,
  onDragPlayer
}: PlayersSidebarProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [isAddingPlayer, setIsAddingPlayer] = useState(false);

  // Helper to check if player is in lineup or on field
  const isPlayerActive = (playerId: string): boolean => {
    const inLineup = lineup.some(slot => slot.playerId === playerId);
    const onField = fieldPositions.some(pos => pos.playerId === playerId);
    return inLineup || onField;
  };

  // Position sort order (battery, infield, outfield, DH)
  const positionOrder: Record<string, number> = {
    'P': 1,
    'C': 2,
    '1B': 3,
    '2B': 4,
    '3B': 5,
    'SS': 6,
    'LF': 7,
    'CF': 8,
    'RF': 9,
    'DH': 10
  };

  // Position group mapping
  const getPositionGroup = (position: string): string => {
    if (position === 'P' || position === 'C') return 'Battery';
    if (['1B', '2B', '3B', 'SS'].includes(position)) return 'Infield';
    if (['LF', 'CF', 'RF'].includes(position)) return 'Outfield';
    if (position === 'DH') return 'Designated Hitter';
    return 'Other';
  };

  const filteredPlayers = players
    .filter(p => statusFilter === 'all' ? true : p.status === statusFilter)
    .sort((a, b) => {
      // Sort by primary position
      const aOrder = positionOrder[a.primaryPosition || ''] || 999;
      const bOrder = positionOrder[b.primaryPosition || ''] || 999;
      if (aOrder !== bOrder) return aOrder - bOrder;

      // If same position, sort alphabetically by name
      return a.name.localeCompare(b.name);
    });

  // Group players by position category
  const groupedPlayers: Record<string, Player[]> = {};
  filteredPlayers.forEach(player => {
    const group = getPositionGroup(player.primaryPosition || '');
    if (!groupedPlayers[group]) {
      groupedPlayers[group] = [];
    }
    groupedPlayers[group].push(player);
  });

  // Define group order for rendering
  const groupOrder = ['Battery', 'Infield', 'Outfield', 'Designated Hitter', 'Other'];

  const statusCounts = {
    active: players.filter(p => p.status === 'active').length,
    inactive: players.filter(p => p.status === 'inactive').length,
    archived: players.filter(p => p.status === 'archived').length
  };

  const filterButtons: { value: StatusFilter; label: string; icon: React.ReactNode }[] = [
    { value: 'active', label: 'Active', icon: <Users className="w-3.5 h-3.5" /> },
    { value: 'inactive', label: 'Inactive', icon: <UserX className="w-3.5 h-3.5" /> },
    { value: 'archived', label: 'Archived', icon: <Archive className="w-3.5 h-3.5" /> }
  ];

  return (
    <div className="h-full flex flex-col bg-sidebar text-sidebar-foreground">
      {/* Header */}
      <div className="px-3 py-2 border-b border-sidebar-border">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold tracking-tight">Players</h2>
          <button
            type="button"
            onClick={() => setIsAddingPlayer(true)}
            aria-label="Add player"
            className="mr-8 flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sidebar-ring focus-visible:ring-offset-1"
          >
            <Plus className="w-3.5 h-3.5" />
            Add
          </button>
        </div>

        {/* Status filters */}
        <div className="flex gap-1.5">
          {filterButtons.map(btn => (
            <button
              key={btn.value}
              type="button"
              onClick={() => setStatusFilter(btn.value)}
              aria-label={`Show ${btn.label.toLowerCase()} players`}
              aria-pressed={statusFilter === btn.value}
              className={cn(
                'flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sidebar-ring focus-visible:ring-offset-1',
                statusFilter === btn.value
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50'
              )}
            >
              {btn.icon}
              {btn.label}
              <span className="ml-1 opacity-60">
                {statusCounts[btn.value as PlayerStatus] ?? players.length}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Player list */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-3">
          {filteredPlayers.length === 0 ? (
            <div className="text-center py-6 text-sidebar-foreground/50">
              <p className="text-xs">No {statusFilter} players</p>
            </div>
          ) : (
            groupOrder.map(groupName => {
              const groupPlayers = groupedPlayers[groupName];
              if (!groupPlayers || groupPlayers.length === 0) return null;

              return (
                <div key={groupName}>
                  {/* Group Header */}
                  <div className="sticky top-0 bg-sidebar z-10 px-2 py-1 mb-1.5">
                    <h3 className="text-[10px] font-semibold text-sidebar-foreground/60 uppercase tracking-[0.12em]">
                      {groupName}
                    </h3>
                  </div>

                  {/* Players in this group */}
                  <div className="space-y-2">
                    {groupPlayers.map(player => {
                      const isActive = isPlayerActive(player.id);
                      return (
                        <div
                          key={player.id}
                          draggable={true}
                          onDragStart={(e) => {
                            e.dataTransfer.effectAllowed = 'move';
                            e.dataTransfer.setData('text/plain', player.id);
                            onDragPlayer(player.id);
                          }}
                        >
                          <PlayerCard
                            player={player}
                            isActive={isActive}
                            onEdit={() => setEditingPlayer(player)}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>

      {/* Edit drawer */}
      <PlayerEditDrawer
        player={editingPlayer}
        isOpen={!!editingPlayer || isAddingPlayer}
        allPlayers={players}
        onClose={() => {
          setEditingPlayer(null);
          setIsAddingPlayer(false);
        }}
        onSave={async (data) => {
          try {
            if (editingPlayer) {
              await onUpdatePlayer(editingPlayer.id, data);
              toast.success('Player updated');
            } else {
              await onAddPlayer(data as Omit<Player, 'id'>);
              toast.success('Player added');
            }
            setEditingPlayer(null);
            setIsAddingPlayer(false);
          } catch (error) {
            console.error('Failed to save player:', error);
            const message = error instanceof Error ? error.message : 'Failed to save player';
            toast.error(message);
          }
        }}
        onRemove={editingPlayer ? async () => {
          try {
            await onRemovePlayer(editingPlayer.id);
            toast.success('Player removed');
            setEditingPlayer(null);
          } catch (error) {
            console.error('Failed to remove player:', error);
            const message = error instanceof Error ? error.message : 'Failed to remove player';
            toast.error(message);
          }
        } : undefined}
      />
    </div>
  );
}
