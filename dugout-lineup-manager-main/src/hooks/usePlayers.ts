/**
 * CHANGES: Updated to fetch player data from backend API instead of using mock data
 * - Players now loaded from GET /players on mount
 * - Add/update/delete operations now persist to backend
 * - Added loading and error states
 */

import { useState, useCallback, useEffect } from 'react';
import { Player, PlayerStatus } from '@/types/player';
import { playersApi, BackendPlayer } from '@/api/client';
import { mapBackendPlayerToFrontend, mapFrontendPlayerToBackend } from '@/api/mappers';

export function usePlayers() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [operationLoading, setOperationLoading] = useState(false);

  // Load players from backend on mount
  useEffect(() => {
    const loadPlayers = async () => {
      try {
        setLoading(true);
        setError(null);
        const backendPlayers = await playersApi.getAll();
        const frontendPlayers = backendPlayers.map(bp => 
          mapBackendPlayerToFrontend(bp)
        );
        setPlayers(frontendPlayers);
      } catch (err) {
        console.error('Failed to load players:', err);
        setError(err instanceof Error ? err.message : 'Failed to load players');
      } finally {
        setLoading(false);
      }
    };

    loadPlayers();
  }, []);

  const addPlayer = useCallback(async (player: Omit<Player, 'id'>) => {
    try {
      setOperationLoading(true);
      const backendPlayerData = mapFrontendPlayerToBackend(player);
      const createdPlayer = await playersApi.create(backendPlayerData);
      const newPlayer = mapBackendPlayerToFrontend(createdPlayer);
      setPlayers(prev => [...prev, newPlayer]);
      return newPlayer;
    } catch (err) {
      console.error('Failed to add player:', err);
      throw err;
    } finally {
      setOperationLoading(false);
    }
  }, []);

  const updatePlayer = useCallback(async (id: string, updates: Partial<Player>) => {
    try {
      setOperationLoading(true);
      // Only send backend-relevant fields
      const backendUpdates: Partial<Omit<BackendPlayer, 'id'>> = {};
      if (updates.name !== undefined) backendUpdates.name = updates.name;
      if (updates.number !== undefined) backendUpdates.number = updates.number;
      if (updates.bats !== undefined) backendUpdates.bats = updates.bats;
      if (updates.throws !== undefined) backendUpdates.throws = updates.throws;
      if (updates.status !== undefined) backendUpdates.status = updates.status;
      if (updates.positions !== undefined) {
        const [primary, ...secondary] = updates.positions;
        backendUpdates.primary_position = primary;
        backendUpdates.secondary_positions = secondary;
      }

      const updatedBackendPlayer = await playersApi.update(id, backendUpdates);
      
      // Update local state with merged data (preserve stats)
      setPlayers(prev =>
        prev.map(p => {
          if (p.id === id) {
            return mapBackendPlayerToFrontend(updatedBackendPlayer, p);
          }
          return p;
        })
      );
    } catch (err) {
      console.error('Failed to update player:', err);
      throw err;
    } finally {
      setOperationLoading(false);
    }
  }, []);

  const removePlayer = useCallback(async (id: string) => {
    try {
      setOperationLoading(true);
      await playersApi.delete(id);
      setPlayers(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      console.error('Failed to remove player:', err);
      throw err;
    } finally {
      setOperationLoading(false);
    }
  }, []);

  const getPlayersByStatus = useCallback(
    (status: PlayerStatus) => players.filter(p => p.status === status),
    [players]
  );

  const getPlayerById = useCallback(
    (id: string) => players.find(p => p.id === id),
    [players]
  );

  return {
    players,
    loading,
    error,
    operationLoading,
    addPlayer,
    updatePlayer,
    removePlayer,
    getPlayersByStatus,
    getPlayerById
  };
}
