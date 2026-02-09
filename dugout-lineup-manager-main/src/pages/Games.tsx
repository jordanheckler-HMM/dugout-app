import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { gamesApi, BackendGame } from '@/api/client';
import { Game } from '@/types/player';
import { Plus, Calendar, Trophy, Home, Plane, Trash2, Edit, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// Convert backend game to frontend format
function backendToFrontend(backendGame: BackendGame): Game {
  return {
    id: backendGame.id,
    date: backendGame.date,
    opponent: backendGame.opponent,
    homeAway: backendGame.home_away as 'home' | 'away',
    result: backendGame.result as 'W' | 'L' | 'T' | undefined,
    scoreUs: backendGame.score_us,
    scoreThem: backendGame.score_them,
    notes: backendGame.notes,
    createdAt: backendGame.created_at,
  };
}

const Games = () => {
  const navigate = useNavigate();
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingGame, setEditingGame] = useState<Game | null>(null);
  const [gameToDelete, setGameToDelete] = useState<Game | null>(null);
  
  // Form state
  const [formDate, setFormDate] = useState('');
  const [formOpponent, setFormOpponent] = useState('');
  const [formHomeAway, setFormHomeAway] = useState<'home' | 'away'>('home');
  const [formResult, setFormResult] = useState<'W' | 'L' | 'T' | ''>('');
  const [formScoreUs, setFormScoreUs] = useState('');
  const [formScoreThem, setFormScoreThem] = useState('');
  const [formNotes, setFormNotes] = useState('');
  
  // Validation errors
  const [dateError, setDateError] = useState<string | null>(null);
  const [opponentError, setOpponentError] = useState<string | null>(null);
  const [scoreUsError, setScoreUsError] = useState<string | null>(null);
  const [scoreThemError, setScoreThemError] = useState<string | null>(null);

  // Load games
  useEffect(() => {
    loadGames();
  }, []);

  // Pre-fill form when editing a game
  useEffect(() => {
    if (editingGame) {
      setFormDate(editingGame.date);
      setFormOpponent(editingGame.opponent);
      setFormHomeAway(editingGame.homeAway);
      setFormResult(editingGame.result || '');
      setFormScoreUs(editingGame.scoreUs?.toString() || '');
      setFormScoreThem(editingGame.scoreThem?.toString() || '');
      setFormNotes(editingGame.notes || '');
      setIsAddDialogOpen(true);
    }
  }, [editingGame]);

  const loadGames = async () => {
    try {
      setLoading(true);
      const backendGames = await gamesApi.getAll();
      const frontendGames = backendGames.map(backendToFrontend);
      setGames(frontendGames);
    } catch (error) {
      console.error('Failed to load games:', error);
      toast.error('Failed to load games');
    } finally {
      setLoading(false);
    }
  };

  // Validation functions
  const validateDate = (value: string) => {
    if (!value) {
      setDateError('Date is required');
      return false;
    }
    const selectedDate = new Date(value);
    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
    
    if (selectedDate > oneYearFromNow) {
      setDateError('Date cannot be more than 1 year in the future');
      return false;
    }
    setDateError(null);
    return true;
  };

  const validateOpponent = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      setOpponentError('Opponent name is required');
      return false;
    }
    if (trimmed.length > 100) {
      setOpponentError('Opponent name must be 100 characters or less');
      return false;
    }
    setOpponentError(null);
    return true;
  };

  const validateScore = (value: string, field: 'us' | 'them') => {
    if (!value) {
      if (field === 'us') setScoreUsError(null);
      else setScoreThemError(null);
      return true;
    }
    const num = parseInt(value);
    if (isNaN(num) || num < 0) {
      const error = 'Score must be 0 or greater';
      if (field === 'us') setScoreUsError(error);
      else setScoreThemError(error);
      return false;
    }
    if (field === 'us') setScoreUsError(null);
    else setScoreThemError(null);
    return true;
  };

  const handleDateChange = (value: string) => {
    setFormDate(value);
    validateDate(value);
  };

  const handleOpponentChange = (value: string) => {
    setFormOpponent(value);
    validateOpponent(value);
  };

  const handleScoreUsChange = (value: string) => {
    setFormScoreUs(value);
    validateScore(value, 'us');
  };

  const handleScoreThemChange = (value: string) => {
    setFormScoreThem(value);
    validateScore(value, 'them');
  };

  const isFormValid = () => {
    return (
      formDate &&
      formOpponent.trim() &&
      !dateError &&
      !opponentError &&
      !scoreUsError &&
      !scoreThemError
    );
  };

  const handleAddGame = async () => {
    // Validate all fields
    const isDateValid = validateDate(formDate);
    const isOpponentValid = validateOpponent(formOpponent);
    const isScoreUsValid = validateScore(formScoreUs, 'us');
    const isScoreThemValid = validateScore(formScoreThem, 'them');

    if (!isDateValid || !isOpponentValid || !isScoreUsValid || !isScoreThemValid) {
      return;
    }

    try {
      if (editingGame) {
        // Update existing game
        await gamesApi.update(editingGame.id, {
          date: formDate,
          opponent: formOpponent.trim(),
          home_away: formHomeAway,
          result: formResult || undefined,
          score_us: formScoreUs ? parseInt(formScoreUs) : undefined,
          score_them: formScoreThem ? parseInt(formScoreThem) : undefined,
          notes: formNotes || undefined,
        });
        toast.success('Game updated successfully');
      } else {
        // Create new game
        await gamesApi.create({
          date: formDate,
          opponent: formOpponent.trim(),
          home_away: formHomeAway,
          result: formResult || undefined,
          score_us: formScoreUs ? parseInt(formScoreUs) : undefined,
          score_them: formScoreThem ? parseInt(formScoreThem) : undefined,
          notes: formNotes || undefined,
        });
        toast.success('Game created successfully');
      }

      // Reset form
      resetForm();
      setIsAddDialogOpen(false);

      // Reload games
      loadGames();
    } catch (error) {
      console.error('Failed to save game:', error);
      toast.error('Failed to save game');
    }
  };

  const handleDeleteGame = async () => {
    if (!gameToDelete) {
      return;
    }

    try {
      await gamesApi.delete(gameToDelete.id);
      toast.success('Game deleted successfully');
      loadGames();
    } catch (error) {
      console.error('Failed to delete game:', error);
      toast.error('Failed to delete game');
    } finally {
      setGameToDelete(null);
    }
  };

  const handleEditGame = (game: Game) => {
    setEditingGame(game);
  };

  const resetForm = () => {
    setFormDate('');
    setFormOpponent('');
    setFormHomeAway('home');
    setFormResult('');
    setFormScoreUs('');
    setFormScoreThem('');
    setFormNotes('');
    setEditingGame(null);
    // Clear validation errors
    setDateError(null);
    setOpponentError(null);
    setScoreUsError(null);
    setScoreThemError(null);
  };

  const handleDialogOpenChange = (open: boolean) => {
    setIsAddDialogOpen(open);
    if (!open) {
      resetForm();
    }
  };

  const handleGameClick = (gameId: string) => {
    navigate(`/games/${gameId}/stats`);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <>
      <Helmet>
        <title>Games - Dugout</title>
      </Helmet>
      
      <div className="h-screen flex flex-col bg-background">
        {/* Header */}
        <div className="border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Games</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Track games and enter stats
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => navigate('/')}
              >
                Back to Lineup
              </Button>
              
              <Dialog open={isAddDialogOpen} onOpenChange={handleDialogOpenChange}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Game
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingGame ? 'Edit Game' : 'Add New Game'}</DialogTitle>
                  </DialogHeader>
                  
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="date">Date *</Label>
                      <Input
                        id="date"
                        type="date"
                        value={formDate}
                        onChange={(e) => handleDateChange(e.target.value)}
                        className={cn(dateError && "border-destructive focus-visible:ring-destructive")}
                      />
                      {dateError && (
                        <p className="text-xs text-destructive">{dateError}</p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="opponent">Opponent *</Label>
                      <Input
                        id="opponent"
                        value={formOpponent}
                        onChange={(e) => handleOpponentChange(e.target.value)}
                        placeholder="Team name"
                        className={cn(opponentError && "border-destructive focus-visible:ring-destructive")}
                      />
                      {opponentError && (
                        <p className="text-xs text-destructive">{opponentError}</p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="homeAway">Home/Away</Label>
                      <Select value={formHomeAway} onValueChange={(v) => setFormHomeAway(v as 'home' | 'away')}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="home">Home</SelectItem>
                          <SelectItem value="away">Away</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="result">Result</Label>
                        <Select value={formResult || undefined} onValueChange={(v) => setFormResult(v as 'W' | 'L' | 'T' | '')}>
                          <SelectTrigger>
                            <SelectValue placeholder="TBD" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="W">Win</SelectItem>
                            <SelectItem value="L">Loss</SelectItem>
                            <SelectItem value="T">Tie</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="scoreUs">Our Score</Label>
                        <Input
                          id="scoreUs"
                          type="number"
                          min="0"
                          value={formScoreUs}
                          onChange={(e) => handleScoreUsChange(e.target.value)}
                          placeholder="0"
                          className={cn(scoreUsError && "border-destructive focus-visible:ring-destructive")}
                        />
                        {scoreUsError && (
                          <p className="text-xs text-destructive">{scoreUsError}</p>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="scoreThem">Their Score</Label>
                        <Input
                          id="scoreThem"
                          type="number"
                          min="0"
                          value={formScoreThem}
                          onChange={(e) => handleScoreThemChange(e.target.value)}
                          placeholder="0"
                          className={cn(scoreThemError && "border-destructive focus-visible:ring-destructive")}
                        />
                        {scoreThemError && (
                          <p className="text-xs text-destructive">{scoreThemError}</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="notes">Notes</Label>
                      <Textarea
                        id="notes"
                        value={formNotes}
                        onChange={(e) => setFormNotes(e.target.value)}
                        placeholder="Game notes..."
                        rows={3}
                      />
                    </div>
                  </div>
                  
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleAddGame} disabled={!isFormValid()}>
                      {editingGame ? 'Save Changes' : 'Add Game'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>

        {/* Games list */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">
              Loading games...
            </div>
          ) : games.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                No games yet
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Add your first game to start tracking stats
              </p>
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Game
              </Button>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto space-y-3">
              {games.map((game) => (
                <div
                  key={game.id}
                  className="bg-card border border-border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer group relative"
                >
                  {/* Actions menu button */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        onClick={(e) => e.stopPropagation()}
                        className="absolute top-2 right-2 p-2 rounded-md hover:bg-muted text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onSelect={() => {
                          handleEditGame(game);
                        }}
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Edit Game
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          setGameToDelete(game);
                        }}
                        onSelect={() => {
                          setGameToDelete(game);
                        }}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete Game
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* Main content - clickable to enter stats */}
                  <div onClick={() => handleGameClick(game.id)}>
                    <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-sm text-muted-foreground">
                          {formatDate(game.date)}
                        </span>
                        
                        {game.homeAway === 'home' ? (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Home className="w-3 h-3" />
                            Home
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Plane className="w-3 h-3" />
                            Away
                          </div>
                        )}
                      </div>
                      
                      <h3 className="text-lg font-semibold text-foreground mb-1">
                        vs {game.opponent}
                      </h3>
                      
                      {game.notes && (
                        <p className="text-sm text-muted-foreground">
                          {game.notes}
                        </p>
                      )}
                    </div>
                    
                    <div className="text-right pr-10">
                      {game.result && (
                        <div className="flex items-center justify-end gap-2 mb-2">
                          <Trophy
                            className={`w-5 h-5 ${
                              game.result === 'W'
                                ? 'text-green-500'
                                : game.result === 'L'
                                ? 'text-red-500'
                                : 'text-yellow-500'
                            }`}
                          />
                          <span
                            className={`text-lg font-bold ${
                              game.result === 'W'
                                ? 'text-green-500'
                                : game.result === 'L'
                                ? 'text-red-500'
                                : 'text-yellow-500'
                            }`}
                          >
                            {game.result}
                          </span>
                        </div>
                      )}
                      
                      {game.scoreUs !== undefined && game.scoreThem !== undefined && (
                        <div className="text-2xl font-bold text-foreground">
                          {game.scoreUs} - {game.scoreThem}
                        </div>
                      )}
                    </div>
                  </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <AlertDialog open={!!gameToDelete} onOpenChange={(open) => !open && setGameToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete game?</AlertDialogTitle>
            <AlertDialogDescription>
              {gameToDelete
                ? `Delete game vs ${gameToDelete.opponent}? This will also delete all stats for this game.`
                : 'Delete this game?'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteGame}
            >
              Delete Game
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default Games;
