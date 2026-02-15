import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { gamesApi, gameStatsApi, playersApi, BackendGame, BackendGameStats, BackendPlayer } from '@/api/client';
import { Game, Player, Position } from '@/types/player';
import { ArrowLeft, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';

function backendPlayerToFrontend(bp: BackendPlayer): Player {
  const primaryPosition = bp.primary_position as Position;
  const secondaryPositions = (bp.secondary_positions || []).filter(Boolean) as Position[];

  return {
    id: bp.id,
    name: bp.name,
    number: bp.number,
    primaryPosition,
    secondaryPositions,
    positions: [primaryPosition, ...secondaryPositions],
    bats: bp.bats as Player['bats'],
    throws: bp.throws as Player['throws'],
    status: 'active',
    stats: {},
  };
}

function backendGameToFrontend(backendGame: BackendGame): Game {
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

interface PlayerStats {
  player_id: string;
  // Hitting
  ab: number;
  r: number;
  h: number;
  doubles: number;
  triples: number;
  hr: number;
  rbi: number;
  bb: number;
  so: number;
  sb: number;
  cs: number;
  // Pitching
  ip: number;
  h_allowed: number;
  r_allowed: number;
  er: number;
  bb_allowed: number;
  k: number;
  pitches: number;
}

const GameStats = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  
  const [game, setGame] = useState<Game | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [stats, setStats] = useState<Record<string, PlayerStats>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!gameId) return;
    
    try {
      setLoading(true);
      setLoadError(null);
      
      // Load game
      const backendGame = await gamesApi.getById(gameId);
      setGame(backendGameToFrontend(backendGame));
      
      // Load players
      const backendPlayers = await playersApi.getAll();
      const frontendPlayers = backendPlayers
        .map(backendPlayerToFrontend)
        .filter(p => p.status === 'active');
      setPlayers(frontendPlayers);
      
      // Load existing stats for this game
      const existingStats = await gameStatsApi.getByGame(gameId);
      const statsMap: Record<string, PlayerStats> = {};
      
      // Initialize all players with zero stats
      frontendPlayers.forEach(player => {
        statsMap[player.id] = {
          player_id: player.id,
          ab: 0, r: 0, h: 0, doubles: 0, triples: 0, hr: 0, rbi: 0, bb: 0, so: 0, sb: 0, cs: 0,
          ip: 0, h_allowed: 0, r_allowed: 0, er: 0, bb_allowed: 0, k: 0, pitches: 0,
        };
      });
      
      // Fill in existing stats
      existingStats.forEach(stat => {
        if (statsMap[stat.player_id]) {
          statsMap[stat.player_id] = {
            player_id: stat.player_id,
            ab: stat.ab || 0,
            r: stat.r || 0,
            h: stat.h || 0,
            doubles: stat.doubles || 0,
            triples: stat.triples || 0,
            hr: stat.hr || 0,
            rbi: stat.rbi || 0,
            bb: stat.bb || 0,
            so: stat.so || 0,
            sb: stat.sb || 0,
            cs: stat.cs || 0,
            ip: stat.ip || 0,
            h_allowed: stat.h_allowed || 0,
            r_allowed: stat.r_allowed || 0,
            er: stat.er || 0,
            bb_allowed: stat.bb_allowed || 0,
            k: stat.k || 0,
            pitches: stat.pitches || 0,
          };
        }
      });
      
      setStats(statsMap);
    } catch (error) {
      console.error('Failed to load data:', error);
      const errorMessage = 'Failed to load game data. Please try again.';
      setLoadError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [gameId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Warn on page unload if there are unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  const updateStat = (playerId: string, field: keyof Omit<PlayerStats, 'player_id'>, value: string) => {
    const numValue = parseFloat(value) || 0;
    setStats(prev => ({
      ...prev,
      [playerId]: {
        ...prev[playerId],
        [field]: numValue,
      },
    }));
    setIsDirty(true);
  };

  // Helper to update innings pitched using baseball notation (full innings + outs)
  const updateInningsPitched = (playerId: string, fullInnings: number, outs: number) => {
    // Convert to baseball notation: full_innings.outs (e.g., 1 inning + 2 outs = 1.2)
    const ipValue = fullInnings + (outs / 10);
    setStats(prev => ({
      ...prev,
      [playerId]: {
        ...prev[playerId],
        ip: ipValue,
      },
    }));
    setIsDirty(true);
  };

  // Helper to parse baseball IP notation into full innings and outs
  const parseInningsPitched = (ip: number): { fullInnings: number; outs: number } => {
    const fullInnings = Math.floor(ip);
    const outs = Math.round((ip - fullInnings) * 10);
    return { fullInnings, outs };
  };

  const handleSave = async () => {
    if (!gameId) return;
    
    try {
      setSaving(true);
      
      // Convert stats to API format
      const statsArray = Object.values(stats).map(stat => ({
        player_id: stat.player_id,
        ab: stat.ab,
        r: stat.r,
        h: stat.h,
        doubles: stat.doubles,
        triples: stat.triples,
        hr: stat.hr,
        rbi: stat.rbi,
        bb: stat.bb,
        so: stat.so,
        sb: stat.sb,
        cs: stat.cs,
        ip: stat.ip,
        h_allowed: stat.h_allowed,
        r_allowed: stat.r_allowed,
        er: stat.er,
        bb_allowed: stat.bb_allowed,
        k: stat.k,
        pitches: stat.pitches,
      }));
      
      await gameStatsApi.bulkUpdate(gameId, statsArray);
      setIsDirty(false);
      toast.success('Stats saved successfully!');
      navigate('/games');
    } catch (error) {
      console.error('Failed to save stats:', error);
      toast.error('Failed to save stats. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <div role={loadError ? 'alert' : undefined} className="text-muted-foreground">
            {loadError || 'Game not found'}
          </div>
          {loadError ? (
            <Button type="button" variant="outline" size="sm" onClick={loadData}>
              Retry
            </Button>
          ) : null}
        </div>
      </div>
    );
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <>
      <Helmet>
        <title>Game Stats - {game.opponent} - Dugout</title>
      </Helmet>
      
      <div className="h-screen flex flex-col bg-background">
        {/* Header */}
        <div className="border-b border-border px-4 py-2.5">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2.5 mb-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/games')}
                  className="gap-1.5"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back
                </Button>
                <h1 className="text-base font-semibold text-foreground tracking-tight">
                  vs {game.opponent}
                </h1>
              </div>
              <p className="text-xs text-muted-foreground">
                {formatDate(game.date)} • {game.homeAway === 'home' ? 'Home' : 'Away'}
              </p>
            </div>
            
            <Button onClick={handleSave} disabled={saving} className="gap-1.5">
              <Save className="w-3.5 h-3.5" />
              {saving ? 'Saving...' : 'Save Stats'}
            </Button>
          </div>
        </div>
        {loadError ? (
          <div className="border-b border-border bg-destructive/10 px-4 py-2">
            <p role="alert" className="text-xs text-destructive">
              {loadError}
            </p>
          </div>
        ) : null}

        {/* Stats entry */}
        <div className="flex-1 overflow-y-auto p-3">
          <div className="max-w-6xl mx-auto space-y-2.5">
            {players.map(player => (
              <Card key={player.id} className="p-2.5">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h3 className="text-sm font-semibold">
                      {player.number && `#${player.number} `}{player.name}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {player.positions.join(', ')} • Bats: {player.bats} / Throws: {player.throws}
                    </p>
                  </div>
                </div>

                <Tabs defaultValue="hitting" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 mb-2">
                    <TabsTrigger value="hitting">Hitting</TabsTrigger>
                    <TabsTrigger value="pitching">Pitching</TabsTrigger>
                  </TabsList>

                  <TabsContent value="hitting" className="space-y-2">
                    <div className="grid grid-cols-4 gap-2">
                      <div>
                        <Label htmlFor={`${player.id}-ab`} className="text-xs">AB</Label>
                        <Input
                          id={`${player.id}-ab`}
                          type="number"
                          min="0"
                          value={stats[player.id]?.ab || 0}
                          onChange={(e) => updateStat(player.id, 'ab', e.target.value)}
                          className="h-7"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`${player.id}-r`} className="text-xs">R</Label>
                        <Input
                          id={`${player.id}-r`}
                          type="number"
                          min="0"
                          value={stats[player.id]?.r || 0}
                          onChange={(e) => updateStat(player.id, 'r', e.target.value)}
                          className="h-7"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`${player.id}-h`} className="text-xs">H</Label>
                        <Input
                          id={`${player.id}-h`}
                          type="number"
                          min="0"
                          value={stats[player.id]?.h || 0}
                          onChange={(e) => updateStat(player.id, 'h', e.target.value)}
                          className="h-7"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`${player.id}-2b`} className="text-xs">2B</Label>
                        <Input
                          id={`${player.id}-2b`}
                          type="number"
                          min="0"
                          value={stats[player.id]?.doubles || 0}
                          onChange={(e) => updateStat(player.id, 'doubles', e.target.value)}
                          className="h-7"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`${player.id}-3b`} className="text-xs">3B</Label>
                        <Input
                          id={`${player.id}-3b`}
                          type="number"
                          min="0"
                          value={stats[player.id]?.triples || 0}
                          onChange={(e) => updateStat(player.id, 'triples', e.target.value)}
                          className="h-7"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`${player.id}-hr`} className="text-xs">HR</Label>
                        <Input
                          id={`${player.id}-hr`}
                          type="number"
                          min="0"
                          value={stats[player.id]?.hr || 0}
                          onChange={(e) => updateStat(player.id, 'hr', e.target.value)}
                          className="h-7"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`${player.id}-rbi`} className="text-xs">RBI</Label>
                        <Input
                          id={`${player.id}-rbi`}
                          type="number"
                          min="0"
                          value={stats[player.id]?.rbi || 0}
                          onChange={(e) => updateStat(player.id, 'rbi', e.target.value)}
                          className="h-7"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`${player.id}-bb`} className="text-xs">BB</Label>
                        <Input
                          id={`${player.id}-bb`}
                          type="number"
                          min="0"
                          value={stats[player.id]?.bb || 0}
                          onChange={(e) => updateStat(player.id, 'bb', e.target.value)}
                          className="h-7"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`${player.id}-so`} className="text-xs">SO</Label>
                        <Input
                          id={`${player.id}-so`}
                          type="number"
                          min="0"
                          value={stats[player.id]?.so || 0}
                          onChange={(e) => updateStat(player.id, 'so', e.target.value)}
                          className="h-7"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`${player.id}-sb`} className="text-xs">SB</Label>
                        <Input
                          id={`${player.id}-sb`}
                          type="number"
                          min="0"
                          value={stats[player.id]?.sb || 0}
                          onChange={(e) => updateStat(player.id, 'sb', e.target.value)}
                          className="h-7"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`${player.id}-cs`} className="text-xs">CS</Label>
                        <Input
                          id={`${player.id}-cs`}
                          type="number"
                          min="0"
                          value={stats[player.id]?.cs || 0}
                          onChange={(e) => updateStat(player.id, 'cs', e.target.value)}
                          className="h-7"
                        />
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="pitching" className="space-y-2">
                    <div className="grid grid-cols-4 gap-2">
                      <div className="col-span-2">
                        <Label className="text-xs">IP (Innings + Outs)</Label>
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <Input
                              id={`${player.id}-ip-innings`}
                              type="number"
                              min="0"
                              placeholder="Innings"
                              value={parseInningsPitched(stats[player.id]?.ip || 0).fullInnings}
                              onChange={(e) => {
                                const fullInnings = parseInt(e.target.value) || 0;
                                const { outs } = parseInningsPitched(stats[player.id]?.ip || 0);
                                updateInningsPitched(player.id, fullInnings, outs);
                              }}
                              className="h-7"
                            />
                          </div>
                          <div className="w-20">
                            <select
                              id={`${player.id}-ip-outs`}
                              value={parseInningsPitched(stats[player.id]?.ip || 0).outs}
                              onChange={(e) => {
                                const outs = parseInt(e.target.value);
                                const { fullInnings } = parseInningsPitched(stats[player.id]?.ip || 0);
                                updateInningsPitched(player.id, fullInnings, outs);
                              }}
                              className="h-7 w-full rounded-md border border-input bg-background px-2 text-xs"
                            >
                              <option value="0">0 outs</option>
                              <option value="1">1 out</option>
                              <option value="2">2 outs</option>
                            </select>
                          </div>
                        </div>
                      </div>
                      <div>
                        <Label htmlFor={`${player.id}-h-allowed`} className="text-xs">H</Label>
                        <Input
                          id={`${player.id}-h-allowed`}
                          type="number"
                          min="0"
                          value={stats[player.id]?.h_allowed || 0}
                          onChange={(e) => updateStat(player.id, 'h_allowed', e.target.value)}
                          className="h-7"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`${player.id}-r-allowed`} className="text-xs">R</Label>
                        <Input
                          id={`${player.id}-r-allowed`}
                          type="number"
                          min="0"
                          value={stats[player.id]?.r_allowed || 0}
                          onChange={(e) => updateStat(player.id, 'r_allowed', e.target.value)}
                          className="h-7"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`${player.id}-er`} className="text-xs">ER</Label>
                        <Input
                          id={`${player.id}-er`}
                          type="number"
                          min="0"
                          value={stats[player.id]?.er || 0}
                          onChange={(e) => updateStat(player.id, 'er', e.target.value)}
                          className="h-7"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`${player.id}-bb-allowed`} className="text-xs">BB</Label>
                        <Input
                          id={`${player.id}-bb-allowed`}
                          type="number"
                          min="0"
                          value={stats[player.id]?.bb_allowed || 0}
                          onChange={(e) => updateStat(player.id, 'bb_allowed', e.target.value)}
                          className="h-7"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`${player.id}-k`} className="text-xs">K</Label>
                        <Input
                          id={`${player.id}-k`}
                          type="number"
                          min="0"
                          value={stats[player.id]?.k || 0}
                          onChange={(e) => updateStat(player.id, 'k', e.target.value)}
                          className="h-7"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`${player.id}-pitches`} className="text-xs">Pitches</Label>
                        <Input
                          id={`${player.id}-pitches`}
                          type="number"
                          min="0"
                          value={stats[player.id]?.pitches || 0}
                          onChange={(e) => updateStat(player.id, 'pitches', e.target.value)}
                          className="h-7"
                        />
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

export default GameStats;
