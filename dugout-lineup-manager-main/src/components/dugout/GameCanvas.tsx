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
      <div className="flex items-center justify-between p-4 border-b border-border">
        {/* View toggle */}
        <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
          <button
            onClick={() => setViewMode('lineup')}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
              viewMode === 'lineup'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <List className="w-4 h-4" />
            Lineup
          </button>
          <button
            onClick={() => setViewMode('field')}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
              viewMode === 'field'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Map className="w-4 h-4" />
            Field
          </button>
        </div>

        {/* DH toggle */}
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/games')}
            className="gap-2"
          >
            <Calendar className="w-4 h-4" />
            Games & Stats
          </Button>
          
          <div className="flex items-center gap-2">
            <Switch
              id="dh-toggle"
              checked={useDH}
              onCheckedChange={onToggleDH}
            />
            <Label htmlFor="dh-toggle" className="text-sm font-medium cursor-pointer">
              Use DH
            </Label>
          </div>

          {/* Config actions */}
          <div className="flex items-center gap-1 ml-4">
            <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
              <DialogTrigger asChild>
                <button className="p-2 rounded-md hover:bg-muted transition-colors" title="Save configuration">
                  <Save className="w-4 h-4 text-muted-foreground" />
                </button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[360px]">
                <DialogHeader>
                  <DialogTitle>Save Configuration</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <Input
                    value={configName}
                    onChange={e => setConfigName(e.target.value)}
                    placeholder="e.g., Game 1, Vs Lefty, Small Ball"
                  />
                  <button
                    onClick={handleSave}
                    disabled={!configName.trim()}
                    className="w-full py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    Save
                  </button>
                </div>
              </DialogContent>
            </Dialog>

            {savedConfigs.length > 0 && (
              <Dialog>
                <DialogTrigger asChild>
                  <button className="p-2 rounded-md hover:bg-muted transition-colors" title="Load configuration">
                    <FolderOpen className="w-4 h-4 text-muted-foreground" />
                  </button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[360px]">
                  <DialogHeader>
                    <DialogTitle>Load Configuration</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-2 pt-4">
                    {savedConfigs.map(config => (
                      <div
                        key={config.id}
                        className="flex items-center gap-2 w-full"
                      >
                        <button
                          onClick={() => onLoadConfig(config.id)}
                          className="flex-1 text-left px-3 py-2 rounded-lg hover:bg-muted transition-colors"
                        >
                          <span className="font-medium">{config.name}</span>
                          <span className="text-xs text-muted-foreground ml-2">
                            {config.useDH ? 'DH' : 'No DH'}
                          </span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteConfig(config.id);
                          }}
                          className="p-2 rounded-md hover:bg-destructive/10 text-destructive transition-colors"
                          title="Delete configuration"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </DialogContent>
              </Dialog>
            )}

            <button
              onClick={viewMode === 'lineup' ? onClearLineup : onClearField}
              className="p-2 rounded-md hover:bg-muted transition-colors"
              title={`Clear ${viewMode}`}
            >
              <RotateCcw className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-lg mx-auto">
          {viewMode === 'lineup' ? (
            <LineupCard
              lineup={lineup}
              players={players}
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
        <div className="px-4 py-2 border-t border-border bg-muted/30">
          <span className="text-xs text-muted-foreground">
            Configuration: <span className="font-medium text-foreground">{currentConfigName}</span>
          </span>
        </div>
      )}
    </div>
  );
}
