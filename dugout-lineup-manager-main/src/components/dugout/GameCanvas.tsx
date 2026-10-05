import { useState } from 'react';
import { LineupSlot, FieldPosition, Player, Position, GameConfiguration } from '@/types/player';
import { LineupCard } from './LineupCard';
import { FieldDiagram } from './FieldDiagram';
import { List, Map, Save, FolderOpen, RotateCcw, Calendar, Trash2, Users, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog';

type ViewMode = 'lineup' | 'field';

interface GameCanvasProps {
  lineup: LineupSlot[];
  fieldPositions: FieldPosition[];
  players: Player[];
  selectedPlayer: Player | null;
  onClearSelectedPlayer: () => void;
  onOpenPlayers: () => void;
  playersPanelCollapsed: boolean;
  useDH: boolean;
  benchPlayerIds: string[];
  savedConfigs: GameConfiguration[];
  currentConfigName: string;
  onToggleDH: () => void;
  onAssignToLineup: (playerId: string, order: number, position: Position | null) => void;
  onRemoveFromLineup: (order: number) => void;
  onReorderLineup: (fromOrder: number, toOrder: number) => void;
  onAssignToField: (playerId: string, position: Position) => void;
  onRemoveFromField: (position: Position) => void;
  onAddToBench: (playerId: string) => void;
  onSaveConfig: (name: string) => Promise<unknown> | void;
  onLoadConfig: (configId: string) => Promise<void> | void;
  onDeleteConfig: (configId: string) => Promise<void> | void;
  onClearLineup: () => Promise<void> | void;
  onClearField: () => Promise<void> | void;
  draggingPlayerId: string | null;
  onDragPlayer: (playerId: string) => void;
}

export function GameCanvas({
  lineup,
  fieldPositions,
  players,
  selectedPlayer,
  onClearSelectedPlayer,
  onOpenPlayers,
  playersPanelCollapsed,
  useDH,
  benchPlayerIds,
  savedConfigs,
  currentConfigName,
  onToggleDH,
  onAssignToLineup,
  onRemoveFromLineup,
  onReorderLineup,
  onAssignToField,
  onRemoveFromField,
  onAddToBench,
  onSaveConfig,
  onLoadConfig,
  onDeleteConfig,
  onClearLineup,
  onClearField,
  draggingPlayerId,
  onDragPlayer
}: GameCanvasProps) {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<ViewMode>('lineup');
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [loadDialogOpen, setLoadDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [configName, setConfigName] = useState('');

  const handleSave = async () => {
    if (configName.trim() && !isSaving) {
      setIsSaving(true);
      try {
        await onSaveConfig(configName.trim());
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Could not save configuration');
        return;
      } finally {
        setIsSaving(false);
      }
      setConfigName('');
      setSaveDialogOpen(false);
    }
  };

  const handleLoad = async (configId: string) => {
    try {
      await onLoadConfig(configId);
      setLoadDialogOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not load configuration');
    }
  };

  const handleDelete = async (configId: string) => {
    try {
      await onDeleteConfig(configId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not delete configuration');
    }
  };

  const hasAssignments = lineup.some(slot => slot.playerId) || fieldPositions.some(position => position.playerId) || benchPlayerIds.length > 0;

  return (
    <div className="h-full flex flex-col bg-background paper-texture">
      {/* Top controls */}
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 px-3 py-2 border-b border-border">
        {/* View toggle */}
        <div className="flex items-center gap-1 p-0.5 bg-muted/60 rounded-md border border-border">
          <button
            type="button"
            onClick={() => setViewMode('lineup')}
            aria-pressed={viewMode === 'lineup'}
            className={cn(
              'flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium transition-colors border focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
              viewMode === 'lineup'
                ? 'bg-card text-foreground border-border'
                : 'text-muted-foreground border-transparent hover:text-foreground hover:border-border/60'
            )}
          >
            <List className="w-3.5 h-3.5" />
            Lineup
          </button>
          <button
            type="button"
            onClick={() => setViewMode('field')}
            aria-pressed={viewMode === 'field'}
            className={cn(
              'flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium transition-colors border focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
              viewMode === 'field'
                ? 'bg-card text-foreground border-border'
                : 'text-muted-foreground border-transparent hover:text-foreground hover:border-border/60'
            )}
          >
            <Map className="w-3.5 h-3.5" />
            Field
          </button>
        </div>

        {/* DH toggle */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/games')}
            className="gap-1.5 px-2 text-xs"
          >
            <Calendar className="w-3.5 h-3.5" />
            Schedule & Stats
          </Button>

          <div className="flex items-center gap-1.5">
            <Switch
              id="dh-toggle"
              checked={useDH}
              onCheckedChange={onToggleDH}
            />
            <Label htmlFor="dh-toggle" className="text-xs font-medium cursor-pointer">
              Use DH
            </Label>
          </div>

          {/* Config actions */}
          <div className="flex items-center gap-0.5 border-l border-border pl-2">
            <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
              <DialogTrigger asChild>
                <button
                  type="button"
                  aria-label="Save configuration"
                  className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  title="Save configuration"
                >
                  <Save className="h-4 w-4 text-muted-foreground" />
                </button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[320px]">
                <DialogHeader>
                  <DialogTitle className="text-sm">Save Configuration</DialogTitle>
                  <DialogDescription className="text-xs">Name this lineup and field setup so you can load it later.</DialogDescription>
                </DialogHeader>
                <div className="space-y-3 pt-2">
                  <Input
                    aria-label="Configuration name"
                    value={configName}
                    onChange={e => setConfigName(e.target.value)}
                    placeholder="e.g., Game 1, Vs Lefty, Small Ball"
                    onKeyDown={e => { if (e.key === 'Enter') void handleSave(); }}
                  />
                  <button
                    type="button"
                    onClick={() => void handleSave()}
                    disabled={!configName.trim() || isSaving}
                    className="w-full py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    {isSaving ? 'Saving…' : 'Save'}
                  </button>
                </div>
              </DialogContent>
            </Dialog>

            {savedConfigs.length > 0 && (
              <Dialog open={loadDialogOpen} onOpenChange={setLoadDialogOpen}>
                <DialogTrigger asChild>
                  <button
                    type="button"
                    aria-label="Load configuration"
                    className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    title="Load configuration"
                  >
                    <FolderOpen className="h-4 w-4 text-muted-foreground" />
                  </button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[320px]">
                  <DialogHeader>
                    <DialogTitle className="text-sm">Load Configuration</DialogTitle>
                    <DialogDescription className="text-xs">Loading a saved configuration replaces the current lineup and field. Save this setup first if you need it later.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-1.5 pt-2">
                    {savedConfigs.map(config => (
                      <div
                        key={config.id}
                        className="flex items-center gap-2 w-full"
                      >
                        <button
                          type="button"
                          onClick={() => void handleLoad(config.id)}
                          className="flex-1 text-left px-2.5 py-1.5 rounded border border-transparent hover:border-border hover:bg-muted/40 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        >
                          <span className="text-xs font-medium">{config.name}</span>
                          <span className="text-[10px] text-muted-foreground ml-1.5">
                            {config.useDH ? 'DH' : 'No DH'}
                          </span>
                        </button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <button
                              type="button"
                              aria-label={`Delete ${config.name} configuration`}
                              className="rounded-md p-2 text-destructive transition-colors hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              title="Delete configuration"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete “{config.name}”?</AlertDialogTitle>
                              <AlertDialogDescription>This saved configuration will be removed. Your current lineup and field stay in place.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Keep configuration</AlertDialogCancel>
                              <AlertDialogAction onClick={() => void handleDelete(config.id)}>Delete configuration</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    ))}
                  </div>
                </DialogContent>
              </Dialog>
            )}

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button
                  type="button"
                  disabled={!hasAssignments}
                  aria-label="Clear lineup and field"
                  className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted transition-colors disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  title="Clear lineup & field"
                >
                  <RotateCcw className="h-4 w-4 text-muted-foreground" />
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear this lineup and field?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This removes every player from the current batting order and field. Saved configurations remain available.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep lineup</AlertDialogCancel>
                  <AlertDialogAction onClick={async () => { await onClearLineup(); await onClearField(); }}>
                    Clear lineup and field
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto px-3 py-2.5">
        <div className="max-w-[560px] mx-auto">
          {selectedPlayer && (
            <div className="mb-3 flex items-center gap-2 rounded-md border border-primary/30 bg-primary/5 px-3 py-2" role="status">
              <span className="min-w-0 flex-1 text-xs leading-relaxed">
                <strong>{selectedPlayer.name}</strong> selected. Choose a batting spot or field position to place them.
              </span>
              <button type="button" onClick={onClearSelectedPlayer} aria-label="Cancel player placement" className="rounded p-1 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
          {players.length === 0 ? (
            <div className="rounded-lg border border-border bg-card px-6 py-10 text-center">
              <Users className="mx-auto mb-3 h-8 w-8 text-primary/60" aria-hidden="true" />
              <h2 className="text-lg font-semibold">Start a lineup</h2>
              <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">
                Add a player from the Players panel, then place them in the batting order and on the field.
              </p>
              {playersPanelCollapsed && <Button className="mt-5" onClick={onOpenPlayers}>Open players</Button>}
            </div>
          ) : viewMode === 'lineup' ? (
            <LineupCard
              lineup={lineup}
              players={players}
              fieldPositions={fieldPositions}
              useDH={useDH}
              benchPlayerIds={benchPlayerIds}
              onAssign={onAssignToLineup}
              onRemove={onRemoveFromLineup}
              onReorder={onReorderLineup}
              onAddToBench={onAddToBench}
              draggingPlayerId={draggingPlayerId}
              onDragPlayer={onDragPlayer}
              selectedPlayerId={selectedPlayer?.id ?? null}
            />
          ) : (
            <FieldDiagram
              fieldPositions={fieldPositions}
              players={players}
              onAssign={onAssignToField}
              onRemove={onRemoveFromField}
              draggingPlayerId={draggingPlayerId}
              onDragPlayer={onDragPlayer}
              selectedPlayerId={selectedPlayer?.id ?? null}
            />
          )}
        </div>
      </div>

      {/* Current config indicator */}
      {currentConfigName && (
        <div className="px-3 py-1 border-t border-border bg-muted/20">
          <span className="text-[10px] text-muted-foreground uppercase tracking-[0.08em]">
            Configuration: <span className="font-medium normal-case tracking-normal text-foreground">{currentConfigName}</span>
          </span>
        </div>
      )}
    </div>
  );
}
