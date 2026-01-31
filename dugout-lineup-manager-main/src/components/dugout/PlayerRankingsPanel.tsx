/**
 * Player Rankings Panel
 * 
 * Displays top performers by batting average and pitching ERA,
 * along with team summary statistics. Replaces the AI chat UI
 * with actionable performance data.
 */

import React, { useMemo } from 'react';
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
  onStatsLoaded: (playerId: string, stats: PlayerWithStats | null) => void;
}) {
  const { stats } = usePlayerSeasonStats(player.id);

  useMemo(() => {
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
      onStatsLoaded(player.id, null);
    }
  }, [stats, player, onStatsLoaded]);

  return null;
}

function useAllPlayerStats(players: Player[]) {
  const [playerStats, setPlayerStats] = React.useState<Map<string, PlayerWithStats>>(new Map());

  const handleStatsLoaded = React.useCallback((playerId: string, stats: PlayerWithStats | null) => {
    setPlayerStats(prev => {
      const next = new Map(prev);
      if (stats) {
        next.set(playerId, stats);
      } else {
        next.delete(playerId);
      }
      return next;
    });
  }, []);

  return useMemo(() => {
    const allStats = Array.from(playerStats.values());

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

    const teamAvg = teamHitters.length > 0
      ? teamHitters.reduce((sum, p) => sum + (p.avg ?? 0), 0) / teamHitters.length
      : 0;

    const teamEra = teamPitchers.length > 0
      ? teamPitchers.reduce((sum, p) => sum + (p.era ?? 0), 0) / teamPitchers.length
      : 0;

    return {
      topHitters,
      topPitchers,
      teamAvg,
      teamEra,
      totalPlayers: allStats.length,
      handleStatsLoaded,
      players,
    };
  }, [playerStats, handleStatsLoaded, players]);
}

function StatBadge({ label, value, isGood }: { label: string; value: string; isGood?: boolean }) {
  return (
    <div className={cn(
      "px-2 py-1 rounded text-xs font-medium",
      isGood === true && "bg-green-500/20 text-green-400",
      isGood === false && "bg-amber-500/20 text-amber-400",
      isGood === undefined && "bg-lyra-muted/50 text-lyra-foreground/70"
    )}>
      {label}: {value}
    </div>
  );
}

export function PlayerRankingsPanel({ players }: PlayerRankingsPanelProps) {
  const { topHitters, topPitchers, teamAvg, teamEra, totalPlayers, handleStatsLoaded, players: playersList } = useAllPlayerStats(players);

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
      <div className="p-4 border-b border-lyra-border">
        <div className="flex items-center gap-2 mb-1">
          <TrendingUp className="w-4 h-4 text-gold" />
          <h2 className="text-lg font-semibold">Top Performers</h2>
        </div>
        <p className="text-xs text-lyra-foreground/60">
          Season leaders and team statistics
        </p>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          
          {/* Top Hitters Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-gold" />
              <h3 className="text-sm font-semibold uppercase tracking-wide text-lyra-foreground/80">
                Hitting Leaders
              </h3>
            </div>
            
            {topHitters.length > 0 ? (
              <div className="space-y-2">
                {topHitters.map((p, idx) => (
                  <div
                    key={p.player.id}
                    className="bg-lyra-muted/30 rounded-lg p-3 border border-lyra-border/50"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-gold">
                          {idx + 1}
                        </span>
                        <div>
                          <div className="font-medium text-sm">
                            {p.player.name}
                          </div>
                          <div className="text-xs text-lyra-foreground/50">
                            #{p.player.number || '—'} • {p.player.primaryPosition}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-gold">
                          {p.avg?.toFixed(3) || '.000'}
                        </div>
                        <div className="text-xs text-lyra-foreground/50">
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
              <p className="text-sm text-lyra-foreground/40 text-center py-4">
                No hitting stats available yet
              </p>
            )}
          </div>

          {/* Top Pitchers Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-gold" />
              <h3 className="text-sm font-semibold uppercase tracking-wide text-lyra-foreground/80">
                Pitching Leaders
              </h3>
            </div>
            
            {topPitchers.length > 0 ? (
              <div className="space-y-2">
                {topPitchers.map((p, idx) => (
                  <div
                    key={p.player.id}
                    className="bg-lyra-muted/30 rounded-lg p-3 border border-lyra-border/50"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-gold">
                          {idx + 1}
                        </span>
                        <div>
                          <div className="font-medium text-sm">
                            {p.player.name}
                          </div>
                          <div className="text-xs text-lyra-foreground/50">
                            #{p.player.number || '—'} • {p.player.primaryPosition}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-gold">
                          {p.era?.toFixed(2) || '0.00'}
                        </div>
                        <div className="text-xs text-lyra-foreground/50">
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
              <p className="text-sm text-lyra-foreground/40 text-center py-4">
                No pitching stats available yet
              </p>
            )}
          </div>

          {/* Team Stats Section */}
          <div className="space-y-3 pt-2 border-t border-lyra-border">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-gold" />
              <h3 className="text-sm font-semibold uppercase tracking-wide text-lyra-foreground/80">
                Team Summary
              </h3>
            </div>
            
            <div className="bg-lyra-muted/30 rounded-lg p-4 border border-lyra-border/50">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-lyra-foreground/50 mb-1">
                    Team AVG
                  </div>
                  <div className="text-xl font-bold text-lyra-foreground">
                    {teamAvg > 0 ? teamAvg.toFixed(3) : '.000'}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-lyra-foreground/50 mb-1">
                    Team ERA
                  </div>
                  <div className="text-xl font-bold text-lyra-foreground">
                    {teamEra > 0 ? teamEra.toFixed(2) : '0.00'}
                  </div>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-lyra-border/30">
                <div className="text-xs text-lyra-foreground/50">
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
