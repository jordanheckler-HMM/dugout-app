import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { gamesApi, BackendGame } from '@/api/client';
import { Game } from '@/types/player';
import { Plus, Calendar as CalendarIcon, Trophy, Home, Plane, Trash2, Edit, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar as YearCalendar } from '@/components/ui/calendar';
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

function backendToFrontend(backendGame: BackendGame): Game {
  return {
    id: backendGame.id,
    date: backendGame.date,
    opponent: backendGame.opponent,
    homeAway: backendGame.home_away as 'home' | 'away',
    source: backendGame.source === 'schedule' ? 'schedule' : 'manual',
    status: backendGame.status === 'completed' ? 'completed' : 'scheduled',
    result: backendGame.result as 'W' | 'L' | 'T' | undefined,
    scoreUs: backendGame.score_us,
    scoreThem: backendGame.score_them,
    notes: backendGame.notes,
    createdAt: backendGame.created_at,
  };
}

function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isoDateToLocalDate(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00`);
}

const Games = () => {
  const navigate = useNavigate();
  const currentYear = new Date().getFullYear();

  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingGame, setEditingGame] = useState<Game | null>(null);
  const [gameToDelete, setGameToDelete] = useState<Game | null>(null);
  const [scheduleYear, setScheduleYear] = useState(currentYear);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date | undefined>(undefined);

  const [formDate, setFormDate] = useState('');
  const [formOpponent, setFormOpponent] = useState('');
  const [formHomeAway, setFormHomeAway] = useState<'home' | 'away'>('home');
  const [formGameType, setFormGameType] = useState<'schedule' | 'manual'>('manual');
  const [formResult, setFormResult] = useState<'W' | 'L' | 'T' | ''>('');
  const [formScoreUs, setFormScoreUs] = useState('');
  const [formScoreThem, setFormScoreThem] = useState('');
  const [formNotes, setFormNotes] = useState('');

  const [dateError, setDateError] = useState<string | null>(null);
  const [opponentError, setOpponentError] = useState<string | null>(null);
  const [scoreUsError, setScoreUsError] = useState<string | null>(null);
  const [scoreThemError, setScoreThemError] = useState<string | null>(null);

  useEffect(() => {
    loadGames();
  }, []);

  useEffect(() => {
    if (editingGame) {
      setFormDate(editingGame.date);
      setFormOpponent(editingGame.opponent);
      setFormHomeAway(editingGame.homeAway);
      setFormGameType(editingGame.source);
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
      setGames(backendGames.map(backendToFrontend));
    } catch (error) {
      console.error('Failed to load games:', error);
      toast.error('Failed to load games');
    } finally {
      setLoading(false);
    }
  };

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
      if (field === 'us') {
        setScoreUsError(null);
      } else {
        setScoreThemError(null);
      }
      return true;
    }

    const num = parseInt(value, 10);
    if (isNaN(num) || num < 0) {
      const error = 'Score must be 0 or greater';
      if (field === 'us') {
        setScoreUsError(error);
      } else {
        setScoreThemError(error);
      }
      return false;
    }
    if (field === 'us') {
      setScoreUsError(null);
    } else {
      setScoreThemError(null);
    }
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
    const isDateValid = validateDate(formDate);
    const isOpponentValid = validateOpponent(formOpponent);
    const isScoreUsValid = validateScore(formScoreUs, 'us');
    const isScoreThemValid = validateScore(formScoreThem, 'them');

    if (!isDateValid || !isOpponentValid || !isScoreUsValid || !isScoreThemValid) {
      return;
    }

    try {
      const payload = {
        date: formDate,
        opponent: formOpponent.trim(),
        home_away: formHomeAway,
        source: formGameType,
        result: formResult || undefined,
        score_us: formScoreUs ? parseInt(formScoreUs, 10) : undefined,
        score_them: formScoreThem ? parseInt(formScoreThem, 10) : undefined,
        notes: formNotes || undefined,
      };

      if (editingGame) {
        await gamesApi.update(editingGame.id, payload);
        toast.success('Game updated successfully');
      } else {
        await gamesApi.create(payload);
        toast.success('Game created successfully');
      }

      resetForm();
      setIsAddDialogOpen(false);
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
    setFormGameType('manual');
    setFormResult('');
    setFormScoreUs('');
    setFormScoreThem('');
    setFormNotes('');
    setEditingGame(null);
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

  const gamesByDate = games.reduce<Record<string, Game[]>>((acc, game) => {
    if (!acc[game.date]) {
      acc[game.date] = [];
    }
    acc[game.date].push(game);
    return acc;
  }, {});

  const uniqueGameYears = Array.from(
    new Set(
      games
        .map((game) => isoDateToLocalDate(game.date).getFullYear())
        .filter((year) => !isNaN(year))
    )
  );

  const minYear = uniqueGameYears.length > 0
    ? Math.min(currentYear, ...uniqueGameYears)
    : currentYear;
  const maxYear = uniqueGameYears.length > 0
    ? Math.max(currentYear, ...uniqueGameYears)
    : currentYear;

  const yearOptions: number[] = [];
  for (let year = minYear - 1; year <= maxYear + 1; year += 1) {
    yearOptions.push(year);
  }

  const scheduledDates: Date[] = [];
  const completedDates: Date[] = [];
  const mixedDates: Date[] = [];

  Object.entries(gamesByDate).forEach(([dateKey, gamesOnDate]) => {
    const dayDate = isoDateToLocalDate(dateKey);
    if (dayDate.getFullYear() !== scheduleYear) {
      return;
    }

    const hasScheduled = gamesOnDate.some((game) => game.status === 'scheduled');
    const hasCompleted = gamesOnDate.some((game) => game.status === 'completed');

    if (hasScheduled && hasCompleted) {
      mixedDates.push(dayDate);
    } else if (hasCompleted) {
      completedDates.push(dayDate);
    } else if (hasScheduled) {
      scheduledDates.push(dayDate);
    }
  });

  const selectedDateKey = selectedCalendarDate ? toIsoDate(selectedCalendarDate) : null;
  const selectedDateGames = selectedDateKey
    ? (gamesByDate[selectedDateKey] || []).sort((a, b) => a.opponent.localeCompare(b.opponent))
    : [];

  const scheduledCountForYear = games.filter(
    (game) => isoDateToLocalDate(game.date).getFullYear() === scheduleYear && game.status === 'scheduled'
  ).length;
  const completedCountForYear = games.filter(
    (game) => isoDateToLocalDate(game.date).getFullYear() === scheduleYear && game.status === 'completed'
  ).length;

  const renderGameCard = (game: Game) => {
    return (
      <div
        key={game.id}
        className="bg-card border border-border rounded-md p-2.5 hover:bg-muted/20 transition-colors cursor-pointer group relative"
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              onClick={(e) => e.stopPropagation()}
              className="absolute top-1.5 right-1.5 p-1.5 rounded-md hover:bg-muted text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreVertical className="w-3.5 h-3.5" />
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

        <div onClick={() => handleGameClick(game.id)}>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-xs text-muted-foreground">
                  {formatDate(game.date)}
                </span>

                {game.homeAway === 'home' ? (
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Home className="w-3 h-3" />
                    Home
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Plane className="w-3 h-3" />
                    Away
                  </div>
                )}

                <span
                  className={cn(
                    'text-[10px] px-1.5 py-0.5 rounded border',
                    game.source === 'schedule'
                      ? 'bg-blue-500/10 text-blue-600 border-blue-500/30'
                      : 'bg-amber-500/10 text-amber-700 border-amber-500/30'
                  )}
                >
                  {game.source === 'schedule' ? 'Schedule' : 'Extra'}
                </span>
              </div>

              <h3 className="text-sm font-semibold text-foreground mb-0.5">
                vs {game.opponent}
              </h3>

              {game.notes && (
                <p className="text-xs text-muted-foreground">
                  {game.notes}
                </p>
              )}
            </div>

            <div className="text-right pr-7">
              {game.status === 'completed' ? (
                <>
                  {game.result && (
                    <div className="flex items-center justify-end gap-1.5 mb-1">
                      <Trophy
                        className={cn(
                          'w-4 h-4',
                          game.result === 'W'
                            ? 'text-green-500'
                            : game.result === 'L'
                              ? 'text-red-500'
                              : 'text-yellow-500'
                        )}
                      />
                      <span
                        className={cn(
                          'text-sm font-bold',
                          game.result === 'W'
                            ? 'text-green-500'
                            : game.result === 'L'
                              ? 'text-red-500'
                              : 'text-yellow-500'
                        )}
                      >
                        {game.result}
                      </span>
                    </div>
                  )}

                  {game.scoreUs !== undefined && game.scoreThem !== undefined ? (
                    <div className="text-lg font-semibold text-foreground">
                      {game.scoreUs} - {game.scoreThem}
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground">
                      Completed
                    </div>
                  )}
                </>
              ) : (
                <div className="text-xs text-muted-foreground">
                  Scheduled
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <Helmet>
        <title>Games - Dugout</title>
      </Helmet>

      <div className="h-screen flex flex-col bg-background">
        <div className="border-b border-border px-4 py-2.5">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-base font-semibold text-foreground tracking-tight">Games</h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Manage schedule and enter stats
              </p>
            </div>

            <div className="flex items-center gap-2">
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
                <DialogContent className="sm:max-w-[420px]">
                  <DialogHeader>
                    <DialogTitle className="text-sm">{editingGame ? 'Edit Game' : 'Add New Game'}</DialogTitle>
                  </DialogHeader>

                  <div className="space-y-3 py-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="gameType">Game Type</Label>
                      <Select value={formGameType} onValueChange={(v) => setFormGameType(v as 'schedule' | 'manual')}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="schedule">Schedule</SelectItem>
                          <SelectItem value="manual">Extra</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="date">Date *</Label>
                      <Input
                        id="date"
                        type="date"
                        value={formDate}
                        onChange={(e) => handleDateChange(e.target.value)}
                        className={cn(dateError && 'border-destructive focus-visible:ring-destructive')}
                      />
                      {dateError && (
                        <p className="text-xs text-destructive">{dateError}</p>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="opponent">Opponent *</Label>
                      <Input
                        id="opponent"
                        value={formOpponent}
                        onChange={(e) => handleOpponentChange(e.target.value)}
                        placeholder="Team name"
                        className={cn(opponentError && 'border-destructive focus-visible:ring-destructive')}
                      />
                      {opponentError && (
                        <p className="text-xs text-destructive">{opponentError}</p>
                      )}
                    </div>

                    <div className="space-y-1.5">
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

                    <div className="grid grid-cols-3 gap-2">
                      <div className="space-y-1.5">
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

                      <div className="space-y-1.5">
                        <Label htmlFor="scoreUs">Our Score</Label>
                        <Input
                          id="scoreUs"
                          type="number"
                          min="0"
                          value={formScoreUs}
                          onChange={(e) => handleScoreUsChange(e.target.value)}
                          placeholder="0"
                          className={cn(scoreUsError && 'border-destructive focus-visible:ring-destructive')}
                        />
                        {scoreUsError && (
                          <p className="text-xs text-destructive">{scoreUsError}</p>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="scoreThem">Their Score</Label>
                        <Input
                          id="scoreThem"
                          type="number"
                          min="0"
                          value={formScoreThem}
                          onChange={(e) => handleScoreThemChange(e.target.value)}
                          placeholder="0"
                          className={cn(scoreThemError && 'border-destructive focus-visible:ring-destructive')}
                        />
                        {scoreThemError && (
                          <p className="text-xs text-destructive">{scoreThemError}</p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1.5">
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

                  <div className="flex justify-end gap-1.5">
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

        <div className="flex-1 overflow-y-auto p-3">
          {loading ? (
            <div className="text-center py-10 text-xs text-muted-foreground">
              Loading games...
            </div>
          ) : games.length === 0 ? (
            <div className="text-center py-10">
              <CalendarIcon className="w-8 h-8 mx-auto text-muted-foreground mb-3" />
              <h3 className="text-sm font-medium text-foreground mb-1">
                No games yet
              </h3>
              <p className="text-xs text-muted-foreground mb-3">
                Add your first scheduled game or extra game
              </p>
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Game
              </Button>
            </div>
          ) : (
            <div className="max-w-6xl mx-auto space-y-4">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-foreground">Yearly Schedule</h2>
                  <p className="text-xs text-muted-foreground">
                    {scheduledCountForYear} scheduled • {completedCountForYear} completed
                  </p>
                </div>
                <div className="w-[140px]">
                  <Select
                    value={String(scheduleYear)}
                    onValueChange={(value) => {
                      setScheduleYear(parseInt(value, 10));
                      setSelectedCalendarDate(undefined);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {yearOptions.map((year) => (
                        <SelectItem key={year} value={String(year)}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-blue-500/80" />
                  Scheduled
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
                  Completed
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-violet-500/80" />
                  Mixed
                </div>
              </div>

              <div className="border border-border rounded-md bg-card p-3">
                <YearCalendar
                  mode="single"
                  month={new Date(scheduleYear, 0, 1)}
                  numberOfMonths={12}
                  disableNavigation
                  showOutsideDays={false}
                  selected={selectedCalendarDate}
                  onSelect={(date) => setSelectedCalendarDate(date)}
                  modifiers={{
                    scheduled: scheduledDates,
                    completed: completedDates,
                    mixed: mixedDates,
                  }}
                  modifiersClassNames={{
                    scheduled: 'bg-blue-500/10 text-blue-600 font-semibold',
                    completed: 'bg-emerald-500/10 text-emerald-600 font-semibold',
                    mixed: 'bg-violet-500/15 text-violet-700 font-semibold',
                  }}
                  classNames={{
                    months: 'grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3',
                    month: 'space-y-2 rounded-md border border-border bg-background p-2',
                    caption_label: 'text-xs font-semibold',
                  }}
                />
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-foreground">
                  {selectedCalendarDate
                    ? `Games on ${formatDate(toIsoDate(selectedCalendarDate))}`
                    : 'Select a date to view games'}
                </h3>
                {selectedCalendarDate ? (
                  selectedDateGames.length === 0 ? (
                    <div className="text-xs text-muted-foreground border border-dashed border-border rounded-md px-3 py-2">
                      No games on this date.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {selectedDateGames.map((game) => renderGameCard(game))}
                    </div>
                  )
                ) : (
                  <div className="text-xs text-muted-foreground border border-dashed border-border rounded-md px-3 py-2">
                    Click a highlighted day in the calendar.
                  </div>
                )}
              </div>
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
