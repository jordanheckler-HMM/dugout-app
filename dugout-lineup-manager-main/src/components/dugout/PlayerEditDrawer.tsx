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
  SelectLabel,
  SelectSeparator,
  SelectGroup,
} from '@/components/ui/select';
import { Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  const [primaryPosition, setPrimaryPosition] = useState<Position>('SS');
  const [secondaryPositions, setSecondaryPositions] = useState<Position[]>([]);
  const [bats, setBats] = useState<Handedness>('R');
  const [throws_, setThrows] = useState<Handedness>('R');
  const [status, setStatus] = useState<PlayerStatus>('active');
  
  // Validation errors
  const [nameError, setNameError] = useState<string | null>(null);
  const [numberError, setNumberError] = useState<string | null>(null);

  useEffect(() => {
    if (player) {
      setName(player.name);
      setNumber(player.number);
      setPrimaryPosition(player.primaryPosition);
      setSecondaryPositions(player.secondaryPositions || []);
      setBats(player.bats);
      setThrows(player.throws);
      setStatus(player.status);
    } else {
      setName('');
      setNumber(undefined);
      setPrimaryPosition('SS');
      setSecondaryPositions([]);
      setBats('R');
      setThrows('R');
      setStatus('active');
    }
    // Reset validation errors when player changes
    setNameError(null);
    setNumberError(null);
  }, [player]);

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

  const toggleSecondaryPosition = (pos: Position) => {
    setSecondaryPositions(prev =>
      prev.includes(pos)
        ? prev.filter(p => p !== pos)
        : [...prev, pos]
    );
  };

  const handleSave = () => {
    // Validate all fields before saving
    const isNameValid = validateName(name);
    const isNumberValid = validateNumber(number);
    
    if (!isNameValid || !isNumberValid || !primaryPosition) {
      return;
    }
    
    onSave({
      name: name.trim(),
      number,
      primaryPosition,
      secondaryPositions,
      positions: [primaryPosition, ...secondaryPositions], // Combined for backward compatibility
      bats,
      throws: throws_,
      status,
      stats: player?.stats ?? {}
    });
  };

  // Determine if form is valid
  const isFormValid = () => {
    return (
      name.trim().length >= 2 &&
      name.trim().length <= 50 &&
      primaryPosition &&
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

          {/* Primary Position */}
          <div className="space-y-2">
            <Label htmlFor="primary-position">Primary Position</Label>
            <Select value={primaryPosition} onValueChange={(value) => setPrimaryPosition(value as Position)}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Select primary position" />
              </SelectTrigger>
              <SelectContent position="item-aligned">
                <SelectGroup>
                  <SelectLabel>Battery</SelectLabel>
                  <SelectItem value="P">P</SelectItem>
                  <SelectItem value="C">C</SelectItem>
                </SelectGroup>
                
                <SelectSeparator />
                
                <SelectGroup>
                  <SelectLabel>Infield</SelectLabel>
                  <SelectItem value="1B">1B</SelectItem>
                  <SelectItem value="2B">2B</SelectItem>
                  <SelectItem value="3B">3B</SelectItem>
                  <SelectItem value="SS">SS</SelectItem>
                </SelectGroup>
                
                <SelectSeparator />
                
                <SelectGroup>
                  <SelectLabel>Outfield</SelectLabel>
                  <SelectItem value="LF">LF</SelectItem>
                  <SelectItem value="CF">CF</SelectItem>
                  <SelectItem value="RF">RF</SelectItem>
                </SelectGroup>
                
                <SelectSeparator />
                
                <SelectItem value="DH">DH</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Secondary Positions */}
          <div className="space-y-2">
            <Label>Secondary Positions (Optional)</Label>
            <div className="flex flex-wrap gap-1.5">
              {allPositions
                .filter(pos => pos !== primaryPosition)
                .map(pos => (
                  <button
                    key={pos}
                    onClick={() => toggleSecondaryPosition(pos)}
                    className={cn(
                      'px-2.5 py-1.5 rounded text-xs font-medium transition-colors',
                      secondaryPositions.includes(pos)
                        ? 'bg-yellow-500 text-white hover:bg-yellow-600'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    )}
                  >
                    {pos}
                  </button>
                ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Primary = Green, Secondary = Yellow, Others = Red when on field
            </p>
          </div>

          {/* Bats */}
          <div className="space-y-2">
            <Label>Bats</Label>
            <div className="flex gap-2">
              {handednessOptions.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setBats(opt.value)}
                  className={cn(
                    'flex-1 py-2 rounded text-sm font-medium transition-colors',
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
                  key={opt.value}
                  onClick={() => setThrows(opt.value)}
                  className={cn(
                    'flex-1 py-2 rounded text-sm font-medium transition-colors',
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
                  key={opt.value}
                  onClick={() => setStatus(opt.value)}
                  className={cn(
                    'flex-1 py-2 rounded text-sm font-medium transition-colors',
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
            onClick={handleSave}
            disabled={!isFormValid()}
            className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {player ? 'Save Changes' : 'Add Player'}
          </button>
          {onRemove && (
            <button
              onClick={onRemove}
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
