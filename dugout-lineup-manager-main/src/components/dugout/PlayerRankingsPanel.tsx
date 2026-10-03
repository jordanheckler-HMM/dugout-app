/**
 * Player Rankings Panel
 * 
 * Displays top performers by batting average and pitching ERA,
 * along with team summary statistics. Replaces the AI chat UI
 * with actionable performance data.
 */

import React, { useEffect, useMemo } from 'react';
import { TrendingUp, Target, Users } from 'lucide-react';
import { Player } from '@/types/player';
import { usePlayerSeasonStats } from '@/hooks/usePlayerSeasonStats';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface PlayerRankingsPanelProps {
  players: Player[];
}

interface PlayerWithStats {
  player: Player;
  avg?: number;
  era?: number;
  gamesPlayed: number;
  hits?: number;
  atBats?: number;
  earnedRuns?: number;
  inningsPitched?: number;
}

// Component to fetch stats for a single player
function PlayerStatsWrapper({ player, onStatsLoaded }: { 
  player: Player; 
  onStatsLoaded: (playerId: string, stats: PlayerWithStats | 'error' | null) => void;
}) {
  const { stats, loading, error } = usePlayerSeasonStats(player.id);

  useEffect(() => {
    if (loading) return;
    if (stats) {
      onStatsLoaded(player.id, {
        player,
        avg: stats.hitting.avg,
        era: stats.pitching.era,
        gamesPlayed: stats.gamesPlayed,
        hits: stats.hitting.h,
        atBats: stats.hitting.ab,
        earnedRuns: stats.pitching.er,
        inningsPitched: stats.pitching.ip,
      });
    } else {
      onStatsLoaded(player.id, error ? 'error' : null);
    }
  }, [stats, loading, error, player, onStatsLoaded]);

  return null;
}

function useAllPlayerStats(players: Player[]) {
  const [playerStats, setPlayerStats] = React.useState<Map<string, PlayerWithStats | 'error' | null>>(new Map());

  const handleStatsLoaded = React.useCallback((playerId: string, stats: PlayerWithStats | 'error' | null) => {
    setPlayerStats(prev => {
      if (prev.has(playerId) && prev.get(playerId) === stats) return prev;
      const next = new Map(prev);
      next.set(playerId, stats);
      return next;
    });
  }, []);

  return useMemo(() => {
    const allStats = players
      .map(player => playerStats.get(player.id))
      .filter((value): value is PlayerWithStats => Boolean(value && value !== 'error'));

    // Top hitters by AVG (minimum 3 at-bats)
    const topHitters = allStats
      .filter(p => (p.atBats ?? 0) >= 3 && p.avg !== undefined)
      .sort((a, b) => (b.avg ?? 0) - (a.avg ?? 0))
      .slice(0, 3);

    // Top pitchers by ERA (minimum 1 inning pitched)
    const topPitchers = allStats
      .filter(p => (p.inningsPitched ?? 0) >= 1 && p.era !== undefined)
      .sort((a, b) => (a.era ?? 999) - (b.era ?? 999))
      .slice(0, 3);

    // Team stats
    const teamHitters = allStats.filter(p => (p.atBats ?? 0) > 0);
    const teamPitchers = allStats.filter(p => (p.inningsPitched ?? 0) > 0);

    const totalAtBats = teamHitters.reduce((sum, p) => sum + (p.atBats ?? 0), 0);
    const totalHits = teamHitters.reduce((sum, p) => sum + (p.hits ?? 0), 0);
    const totalEarnedRuns = teamPitchers.reduce((sum, p) => sum + (p.earnedRuns ?? 0), 0);
    // Baseball IP decimals count outs: 4.2 means four innings and two outs.
    const totalInnings = teamPitchers.reduce((sum, p) => {
      const ip = p.inningsPitched ?? 0;
      return sum + Math.trunc(ip) + Math.round((ip % 1) * 10) / 3;
    }, 0);
    const teamAvg = totalAtBats > 0 ? totalHits / totalAtBats : null;
    const teamEra = totalInnings > 0 ? totalEarnedRuns * 9 / totalInnings : null;

    return {
      topHitters,
      topPitchers,
      teamAvg,
      teamEra,
      totalPlayers: allStats.filter(p => p.gamesPlayed > 0).length,
      isLoading: players.some(player => !playerStats.has(player.id)),
      hasError: players.some(player => playerStats.get(player.id) === 'error'),
      handleStatsLoaded,
      players,
    };
  }, [playerStats, handleStatsLoaded, players]);
}

function StatBadge({ label, value, isGood }: { label: string; value: string; isGood?: boolean }) {
  return (
    <div className={cn(
      "px-1.5 py-0.5 rounded border text-[10px] font-medium",
      isGood === true && "bg-green-500/20 text-green-400",
      isGood === false && "bg-amber-500/20 text-amber-400",
      isGood === undefined && "bg-lyra-muted/50 text-lyra-foreground/70"
    )}>
      {label}: {value}
    </div>
  );
}

export function PlayerRankingsPanel({ players }: PlayerRankingsPanelProps) {
  const { topHitters, topPitchers, teamAvg, teamEra, totalPlayers, isLoading, hasError, handleStatsLoaded, players: playersList } = useAllPlayerStats(players);

  return (
    <div className="h-full flex flex-col bg-lyra text-lyra-foreground">
      {/* Hidden stats loaders */}
      {playersList.map(player => (
        <PlayerStatsWrapper 
          key={player.id}
          player={player}
          onStatsLoaded={handleStatsLoaded}
        />
      ))}
      {/* Header */}
      <div className="px-3 py-2 border-b border-lyra-border">
        <div className="flex items-center gap-1.5 mb-0.5">
          <TrendingUp className="w-3.5 h-3.5 text-gold" />
          <h2 className="text-sm font-semibold tracking-tight">Top Performers</h2>
        </div>
        <p className="text-[10px] text-lyra-foreground/60">
          Season leaders and team statistics
        </p>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-4">
          {hasError && (
            <p role="alert" className="rounded-md border border-amber-400/40 bg-amber-400/10 p-2 text-xs leading-relaxed text-lyra-foreground">
              Some season stats could not load. Team totals may be incomplete.
            </p>
          )}
          {players.length === 0 && (
            <p className="rounded-md border border-lyra-border p-3 text-xs leading-relaxed text-lyra-foreground/80">
              Add players to see season leaders here.
            </p>
          )}
          
          {/* Top Hitters Section */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-gold" />
              <h3 className="text-[10px] font-semibold uppercase tracking-[0.12em] text-lyra-foreground/80">
                Hitting Leaders
              </h3>
            </div>
            
            {topHitters.length > 0 ? (
              <div className="space-y-2">
                {topHitters.map((p, idx) => (
                  <div
                    key={p.player.id}
                    className="bg-lyra-muted/20 rounded-md p-2 border border-lyra-border/50"
                  >
                    <div className="flex items-start justify-between mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-base font-bold text-gold">
                          {idx + 1}
                        </span>
                        <div>
                          <div className="font-medium text-xs">
                            {p.player.name}
                          </div>
                          <div className="text-[10px] text-lyra-foreground/50">
                            #{p.player.number || '—'} • {p.player.primaryPosition}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-gold">
                          {(p.avg ?? 0).toFixed(3).replace(/^0/, '')}
                        </div>
                        <div className="text-[10px] text-lyra-foreground/50">
                          AVG
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <StatBadge 
                        label="H" 
                        value={p.hits?.toString() || '0'} 
                      />
                      <StatBadge 
                        label="AB" 
                        value={p.atBats?.toString() || '0'} 
                      />
                      <StatBadge 
                        label="G" 
                        value={p.gamesPlayed.toString()} 
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-lyra-foreground/40 text-center py-3">
                {isLoading ? 'Loading hitting stats…' : 'No hitting stats yet'}
              </p>
            )}
          </div>

          {/* Top Pitchers Section */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-gold" />
              <h3 className="text-[10px] font-semibold uppercase tracking-[0.12em] text-lyra-foreground/80">
                Pitching Leaders
              </h3>
            </div>
            
            {topPitchers.length > 0 ? (
              <div className="space-y-2">
                {topPitchers.map((p, idx) => (
                  <div
                    key={p.player.id}
                    className="bg-lyra-muted/20 rounded-md p-2 border border-lyra-border/50"
                  >
                    <div className="flex items-start justify-between mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-base font-bold text-gold">
                          {idx + 1}
                        </span>
                        <div>
                          <div className="font-medium text-xs">
                            {p.player.name}
                          </div>
                          <div className="text-[10px] text-lyra-foreground/50">
                            #{p.player.number || '—'} • {p.player.primaryPosition}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-gold">
                          {p.era?.toFixed(2) || '0.00'}
                        </div>
                        <div className="text-[10px] text-lyra-foreground/50">
                          ERA
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <StatBadge 
                        label="IP" 
                        value={p.inningsPitched?.toFixed(1) || '0.0'} 
                      />
                      <StatBadge 
                        label="ER" 
                        value={p.earnedRuns?.toString() || '0'} 
                      />
                      <StatBadge 
                        label="G" 
                        value={p.gamesPlayed.toString()} 
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-lyra-foreground/40 text-center py-3">
                {isLoading ? 'Loading pitching stats…' : 'No pitching stats yet'}
              </p>
            )}
          </div>

          {/* Team Stats Section */}
          <div className="space-y-2 pt-2 border-t border-lyra-border">
            <div className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-gold" />
              <h3 className="text-[10px] font-semibold uppercase tracking-[0.12em] text-lyra-foreground/80">
                Team Summary
              </h3>
            </div>
            
            <div className="bg-lyra-muted/20 rounded-md p-2.5 border border-lyra-border/50">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="text-[10px] text-lyra-foreground/50 mb-0.5">
                    Team AVG
                  </div>
                  <div className="text-base font-semibold text-lyra-foreground">
                    {teamAvg === null ? '—' : teamAvg.toFixed(3).replace(/^0/, '')}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-lyra-foreground/50 mb-0.5">
                    Team ERA
                  </div>
                  <div className="text-base font-semibold text-lyra-foreground">
                    {teamEra === null ? '—' : teamEra.toFixed(2)}
                  </div>
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-lyra-border/30">
                <div className="text-[10px] text-lyra-foreground/50">
                  {totalPlayers} {totalPlayers === 1 ? 'player' : 'players'} with stats
                </div>
              </div>
            </div>
          </div>

        </div>
      </ScrollArea>
    </div>
  );
}
