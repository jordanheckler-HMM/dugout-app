import { useState, useEffect } from 'react';
import { Player, Position, Handedness, PlayerStatus } from '@/types/player';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Trash2, Plus, X } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { primaryPositionsOf, secondaryPositionsOf, withPositionLists } from '@/lib/positions';

interface PlayerEditDrawerProps {
  player: Player | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<Player>) => void;
  onRemove?: () => void;
  allPlayers?: Player[]; // For duplicate jersey number check
}

const allPositions: Position[] = ['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH'];
const handednessOptions: { value: Handedness; label: string }[] = [
  { value: 'L', label: 'Left' },
  { value: 'R', label: 'Right' },
  { value: 'S', label: 'Switch' }
];
const statusOptions: { value: PlayerStatus; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'archived', label: 'Archived' }
];

export function PlayerEditDrawer({ player, isOpen, onClose, onSave, onRemove, allPlayers = [] }: PlayerEditDrawerProps) {
  const [name, setName] = useState('');
  const [number, setNumber] = useState<number | undefined>();
  const [primaryPositions, setPrimaryPositions] = useState<Position[]>(['SS']);
  const [secondaryPositions, setSecondaryPositions] = useState<Position[]>([]);
  const [notes, setNotes] = useState('');
  const [bats, setBats] = useState<Handedness>('R');
  const [throws_, setThrows] = useState<Handedness>('R');
  const [status, setStatus] = useState<PlayerStatus>('active');
  
  // Validation errors
  const [nameError, setNameError] = useState<string | null>(null);
  const [numberError, setNumberError] = useState<string | null>(null);

  useEffect(() => {
    if (player) {
      const primaries = primaryPositionsOf(player);
      setName(player.name);
      setNumber(player.number);
      setPrimaryPositions(primaries.length > 0 ? primaries : ['SS']);
      setSecondaryPositions(secondaryPositionsOf(player));
      setNotes(player.notes ?? '');
      setBats(player.bats);
      setThrows(player.throws);
      setStatus(player.status);
    } else {
      setName('');
      setNumber(undefined);
      setPrimaryPositions(['SS']);
      setSecondaryPositions([]);
      setNotes('');
      setBats('R');
      setThrows('R');
      setStatus('active');
    }
    // Reset validation errors when player changes
    setNameError(null);
    setNumberError(null);
  }, [player, isOpen]);

  // Validate name
  const validateName = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      setNameError('Name is required');
      return false;
    }
    if (trimmed.length < 2) {
      setNameError('Name must be at least 2 characters');
      return false;
    }
    if (trimmed.length > 50) {
      setNameError('Name must be 50 characters or less');
      return false;
    }
    setNameError(null);
    return true;
  };

  // Validate number
  const validateNumber = (value: number | undefined) => {
    // Empty/undefined is valid (optional field)
    if (value === undefined || value === null || (typeof value === 'number' && isNaN(value))) {
      setNumberError(null);
      return true;
    }
    if (value < 1 || value > 99) {
      setNumberError('Jersey number must be between 1 and 99');
      return false;
    }
    // Check for duplicates
    const duplicate = allPlayers.find(p => 
      p.number === value && p.id !== player?.id
    );
    if (duplicate) {
      setNumberError(`Number ${value} is already used by ${duplicate.name}`);
      return false;
    }
    setNumberError(null);
    return true;
  };

  const handleNameChange = (value: string) => {
    setName(value);
    validateName(value);
  };

  const handleNumberChange = (value: string) => {
    // Handle empty string as undefined, not NaN
    const num = value.trim() === '' ? undefined : parseInt(value);
    setNumber(num);
    validateNumber(num);
  };

  const taken = new Set<Position>([...primaryPositions, ...secondaryPositions]);
  const firstOpen = allPositions.find((position) => !taken.has(position));

  const setPrimaryAt = (index: number, value: Position) => {
    setPrimaryPositions((current) => {
      const next = [...current];
      next[index] = value;
      return next.filter((position, itemIndex) => next.indexOf(position) === itemIndex);
    });
    setSecondaryPositions((current) => current.filter((position) => position !== value));
  };

  const setSecondaryAt = (index: number, value: Position) => {
    setSecondaryPositions((current) => {
      const next = [...current];
      next[index] = value;
      return next.filter((position) => !primaryPositions.includes(position))
        .filter((position, itemIndex, list) => list.indexOf(position) === itemIndex);
    });
  };

  const handleSave = () => {
    const isNameValid = validateName(name);
    const isNumberValid = validateNumber(number);
    if (!isNameValid || !isNumberValid || primaryPositions.length === 0) return;

    const draft: Player = {
      id: player?.id ?? 'draft',
      name: name.trim(),
      number,
      primaryPosition: primaryPositions[0],
      primaryPositions,
      secondaryPositions,
      positions: [...primaryPositions, ...secondaryPositions],
      bats,
      throws: throws_,
      status,
      notes,
      stats: player?.stats ?? {},
    };
    const saved = withPositionLists(draft);
    onSave({
      name: saved.name,
      number: saved.number,
      primaryPosition: saved.primaryPosition,
      primaryPositions: saved.primaryPositions,
      secondaryPositions: saved.secondaryPositions,
      positions: saved.positions,
      bats: saved.bats,
      throws: saved.throws,
      status: saved.status,
      notes: saved.notes,
      stats: saved.stats,
    });
  };

  // Determine if form is valid
  const isFormValid = () => {
    return (
      name.trim().length >= 2 &&
      name.trim().length <= 50 &&
      primaryPositions.length > 0 &&
      !nameError &&
      !numberError
    );
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-[360px] bg-card flex flex-col">
        <SheetHeader>
          <SheetTitle className="text-foreground">
            {player ? 'Edit Player' : 'Add Player'}
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto mt-6 pr-2">
          <div className="space-y-5">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={e => handleNameChange(e.target.value)}
              placeholder="Player name"
              className={cn(
                "bg-background",
                nameError && "border-destructive focus-visible:ring-destructive"
              )}
            />
            {nameError && (
              <p className="text-xs text-destructive">{nameError}</p>
            )}
          </div>

          {/* Number */}
          <div className="space-y-2">
            <Label htmlFor="number">Jersey Number (Optional)</Label>
            <Input
              id="number"
              type="number"
              min="1"
              max="99"
              value={number ?? ''}
              onChange={e => handleNumberChange(e.target.value)}
              placeholder="1-99"
              className={cn(
                "bg-background w-24",
                numberError && "border-destructive focus-visible:ring-destructive"
              )}
            />
            {numberError && (
              <p className="text-xs text-destructive">{numberError}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="primary-position">Primary position</Label>
            {primaryPositions.map((position, index) => (
              <div key={`primary-${index}`} className="flex items-center gap-2">
                <Select value={position} onValueChange={(value) => setPrimaryAt(index, value as Position)}>
                  <SelectTrigger id={index === 0 ? 'primary-position' : `primary-position-${index}`} className="bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {allPositions.filter((option) => option === position || (!primaryPositions.includes(option) && !secondaryPositions.includes(option))).map((option) => (
                      <SelectItem key={option} value={option}>{option}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {index > 0 && (
                  <button type="button" className="icon-button" aria-label={`Remove extra primary ${position}`} onClick={() => setPrimaryPositions((current) => current.filter((_, itemIndex) => itemIndex !== index))}>
                    <X />
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              className="text-button"
              disabled={!firstOpen}
              onClick={() => firstOpen && setPrimaryPositions((current) => [...current, firstOpen])}
            >
              <Plus className="inline w-3.5 h-3.5" /> Add another primary
            </button>
          </div>

          <div className="space-y-2">
            <Label>Secondary position</Label>
            {secondaryPositions.length === 0 ? (
              <p className="empty-copy">No secondary position. One is optional.</p>
            ) : secondaryPositions.map((position, index) => (
              <div key={`secondary-${index}`} className="flex items-center gap-2">
                <Select value={position} onValueChange={(value) => setSecondaryAt(index, value as Position)}>
                  <SelectTrigger id={index === 0 ? 'secondary-position' : `secondary-position-${index}`} className="bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {allPositions.filter((option) => option === position || (!primaryPositions.includes(option) && !secondaryPositions.includes(option))).map((option) => (
                      <SelectItem key={option} value={option}>{option}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <button type="button" className="icon-button" aria-label={`Remove secondary ${position}`} onClick={() => setSecondaryPositions((current) => current.filter((_, itemIndex) => itemIndex !== index))}>
                  <X />
                </button>
              </div>
            ))}
            <button
              type="button"
              className="text-button"
              disabled={!firstOpen}
              onClick={() => firstOpen && setSecondaryPositions((current) => [...current, firstOpen])}
            >
              <Plus className="inline w-3.5 h-3.5" /> {secondaryPositions.length === 0 ? 'Add a secondary' : 'Add another secondary'}
            </button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Optional note from the coach" className="bg-background min-h-20" />
          </div>

          {/* Bats */}
          <div className="space-y-2">
            <Label>Bats</Label>
            <div className="flex gap-2">
              {handednessOptions.map(opt => (
                <button
                  type="button"
                  key={opt.value}
                  onClick={() => setBats(opt.value)}
                  aria-label={`Bats ${opt.label}`}
                  aria-pressed={bats === opt.value}
                  className={cn(
                    'flex-1 py-2 rounded text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1',
                    bats === opt.value
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Throws */}
          <div className="space-y-2">
            <Label>Throws</Label>
            <div className="flex gap-2">
              {handednessOptions.filter(o => o.value !== 'S').map(opt => (
                <button
                  type="button"
                  key={opt.value}
                  onClick={() => setThrows(opt.value)}
                  aria-label={`Throws ${opt.label}`}
                  aria-pressed={throws_ === opt.value}
                  className={cn(
                    'flex-1 py-2 rounded text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1',
                    throws_ === opt.value
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label>Status</Label>
            <div className="flex gap-2">
              {statusOptions.map(opt => (
                <button
                  type="button"
                  key={opt.value}
                  onClick={() => setStatus(opt.value)}
                  aria-pressed={status === opt.value}
                  className={cn(
                    'flex-1 py-2 rounded text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1',
                    status === opt.value
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-4 pt-4 border-t flex gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={!isFormValid()}
            className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {player ? 'Save Changes' : 'Add Player'}
          </button>
          {onRemove && (
            <button
              type="button"
              onClick={onRemove}
              aria-label={`Remove ${player?.name ?? 'player'}`}
              className="p-2.5 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
