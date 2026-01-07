import { useState } from 'react';
import { Player, PlayerStatus, LineupSlot, FieldPosition } from '@/types/player';
import { PlayerCard } from './PlayerCard';
import { PlayerEditDrawer } from './PlayerEditDrawer';
import { Plus, Users, UserX, Archive } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

interface PlayersSidebarProps {
  players: Player[];
  lineup: LineupSlot[];
  fieldPositions: FieldPosition[];
  onAddPlayer: (player: Omit<Player, 'id'>) => void;
  onUpdatePlayer: (id: string, updates: Partial<Player>) => void;
  onRemovePlayer: (id: string) => void;
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
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Players</h2>
          <button
            onClick={() => setIsAddingPlayer(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add
          </button>
        </div>

        {/* Status filters */}
        <div className="flex gap-1">
          {filterButtons.map(btn => (
            <button
              key={btn.value}
              onClick={() => setStatusFilter(btn.value)}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium transition-colors',
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
        <div className="p-3 space-y-4">
          {filteredPlayers.length === 0 ? (
            <div className="text-center py-8 text-sidebar-foreground/50">
              <p className="text-sm">No {statusFilter} players</p>
            </div>
          ) : (
            groupOrder.map(groupName => {
              const groupPlayers = groupedPlayers[groupName];
              if (!groupPlayers || groupPlayers.length === 0) return null;
              
              return (
                <div key={groupName}>
                  {/* Group Header */}
                  <div className="sticky top-0 bg-sidebar z-10 px-2 py-1.5 mb-2">
                    <h3 className="text-xs font-semibold text-sidebar-foreground/60 uppercase tracking-wide">
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
                          draggable
                          onDragStart={() => onDragPlayer(player.id)}
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
        onSave={(data) => {
          if (editingPlayer) {
            onUpdatePlayer(editingPlayer.id, data);
          } else {
            onAddPlayer(data as Omit<Player, 'id'>);
          }
          setEditingPlayer(null);
          setIsAddingPlayer(false);
        }}
        onRemove={editingPlayer ? () => {
          onRemovePlayer(editingPlayer.id);
          setEditingPlayer(null);
        } : undefined}
      />
    </div>
  );
}
