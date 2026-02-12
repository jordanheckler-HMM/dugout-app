import { useState } from 'react';
import { LineupSlot, FieldPosition, Player, Position, GameConfiguration } from '@/types/player';
import { LineupCard } from './LineupCard';
import { FieldDiagram } from './FieldDiagram';
import { List, Map, Save, FolderOpen, RotateCcw, Calendar, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';

type ViewMode = 'lineup' | 'field';

interface GameCanvasProps {
  lineup: LineupSlot[];
  fieldPositions: FieldPosition[];
  players: Player[];
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
  onSaveConfig: (name: string) => void;
  onLoadConfig: (configId: string) => void;
  onDeleteConfig: (configId: string) => void;
  onClearLineup: () => void;
  onClearField: () => void;
  draggingPlayerId: string | null;
  onDragPlayer: (playerId: string) => void;
}

export function GameCanvas({
  lineup,
  fieldPositions,
  players,
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
  const [configName, setConfigName] = useState('');

  const handleSave = () => {
    if (configName.trim()) {
      onSaveConfig(configName.trim());
      setConfigName('');
      setSaveDialogOpen(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-background paper-texture">
      {/* Top controls */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
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
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/games')}
            className="gap-1.5"
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
          <div className="flex items-center gap-0.5 ml-2 pl-2 border-l border-border">
            <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
              <DialogTrigger asChild>
                <button
                  type="button"
                  aria-label="Save configuration"
                  className="p-1.5 rounded-md hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  title="Save configuration"
                >
                  <Save className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[320px]">
                <DialogHeader>
                  <DialogTitle className="text-sm">Save Configuration</DialogTitle>
                </DialogHeader>
                <div className="space-y-3 pt-2">
                  <Input
                    value={configName}
                    onChange={e => setConfigName(e.target.value)}
                    placeholder="e.g., Game 1, Vs Lefty, Small Ball"
                  />
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={!configName.trim()}
                    className="w-full py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    Save
                  </button>
                </div>
              </DialogContent>
            </Dialog>

            {savedConfigs.length > 0 && (
              <Dialog>
                <DialogTrigger asChild>
                  <button
                    type="button"
                    aria-label="Load configuration"
                    className="p-1.5 rounded-md hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    title="Load configuration"
                  >
                    <FolderOpen className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[320px]">
                  <DialogHeader>
                    <DialogTitle className="text-sm">Load Configuration</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-1.5 pt-2">
                    {savedConfigs.map(config => (
                      <div
                        key={config.id}
                        className="flex items-center gap-2 w-full"
                      >
                        <button
                          type="button"
                          onClick={() => onLoadConfig(config.id)}
                          className="flex-1 text-left px-2.5 py-1.5 rounded border border-transparent hover:border-border hover:bg-muted/40 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        >
                          <span className="text-xs font-medium">{config.name}</span>
                          <span className="text-[10px] text-muted-foreground ml-1.5">
                            {config.useDH ? 'DH' : 'No DH'}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteConfig(config.id);
                          }}
                          aria-label={`Delete ${config.name} configuration`}
                          className="p-1.5 rounded-md hover:bg-destructive/10 text-destructive transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          title="Delete configuration"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </DialogContent>
              </Dialog>
            )}

            <button
              type="button"
              onClick={async () => {
                // Clear both lineup and field regardless of view mode
                await onClearLineup();
                await onClearField();
              }}
              aria-label="Clear lineup and field"
              className="p-1.5 rounded-md hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              title="Clear lineup & field"
            >
              <RotateCcw className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto px-3 py-2.5">
        <div className="max-w-[560px] mx-auto">
          {viewMode === 'lineup' ? (
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
            />
          ) : (
            <FieldDiagram
              fieldPositions={fieldPositions}
              players={players}
              onAssign={onAssignToField}
              onRemove={onRemoveFromField}
              draggingPlayerId={draggingPlayerId}
              onDragPlayer={onDragPlayer}
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
