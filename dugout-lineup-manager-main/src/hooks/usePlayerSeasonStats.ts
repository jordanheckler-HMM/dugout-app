import { useState, useEffect } from 'react';
import { gameStatsApi, BackendSeasonStats } from '@/api/client';
import { SeasonStats } from '@/types/player';

function backendToFrontend(backend: BackendSeasonStats): SeasonStats {
  return {
    playerId: backend.player_id,
    gamesPlayed: backend.games_played,
    hitting: backend.hitting,
    pitching: backend.pitching,
    fielding: backend.fielding,
  };
}

export function usePlayerSeasonStats(playerId: string | undefined) {
  const [stats, setStats] = useState<SeasonStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!playerId) {
      setStats(null);
      return;
    }

    const fetchStats = async () => {
      try {
        setLoading(true);
        setError(null);
        const backendStats = await gameStatsApi.getSeasonStats(playerId);
        setStats(backendToFrontend(backendStats));
      } catch (err) {
        console.error('Failed to fetch season stats:', err);
        setError('Failed to load stats');
        setStats(null);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [playerId]);

  return { stats, loading, error };
}

