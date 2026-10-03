/**
 * CHANGES: Updated to sync lineup and field positions with backend API
 * - Lineup and field positions loaded from backend on mount
 * - Changes persisted to backend automatically
 * - Configurations now saved to and loaded from backend
 */

import { useState, useCallback, useEffect } from 'react';
import { LineupSlot, FieldPosition, Position, GameConfiguration, Player } from '@/types/player';
import { lineupApi, fieldApi, configurationApi } from '@/api/client';
import {
  mapBackendLineupToFrontend,
  mapFrontendLineupToBackend,
  mapBackendFieldToFrontend,
  mapFrontendFieldToBackend,
} from '@/api/mappers';
import {
  AlignmentState,
  clearAlignment,
  placeInLineup,
  placeOnField,
  reconcileLineupToField,
  removeFromField as dropFromField,
  removeFromLineup as dropFromLineup,
  reorderLineup as moveLineupOrder,
  sendToBench,
  setDhMode,
} from '@/lib/alignment';

const defaultFieldPositions: FieldPosition[] = [
  { position: 'P', playerId: null, x: 50, y: 60 },
  { position: 'C', playerId: null, x: 50, y: 85 },
  { position: '1B', playerId: null, x: 72, y: 52 },
  { position: '2B', playerId: null, x: 60, y: 42 },
  { position: 'SS', playerId: null, x: 40, y: 42 },
  { position: '3B', playerId: null, x: 28, y: 52 },
  { position: 'LF', playerId: null, x: 22, y: 25 },
  { position: 'CF', playerId: null, x: 50, y: 18 },
  { position: 'RF', playerId: null, x: 78, y: 25 }
];

const createFieldPositions = (useDH: boolean): FieldPosition[] => {
  const basePositions: FieldPosition[] = [
    { position: 'P', playerId: null, x: 50, y: 60 },
    { position: 'C', playerId: null, x: 50, y: 85 },
    { position: '1B', playerId: null, x: 72, y: 52 },
    { position: '2B', playerId: null, x: 60, y: 42 },
    { position: 'SS', playerId: null, x: 40, y: 42 },
    { position: '3B', playerId: null, x: 28, y: 52 },
    { position: 'LF', playerId: null, x: 22, y: 25 },
    { position: 'CF', playerId: null, x: 50, y: 18 },
    { position: 'RF', playerId: null, x: 78, y: 25 }
  ];

  // Add DH position when using DH (positioned near home plate, off to the side)
  if (useDH) {
    basePositions.push({ position: 'DH', playerId: null, x: 20, y: 85 });
  }

  return basePositions;
};

const createEmptyLineup = (useDH: boolean): LineupSlot[] => {
  const slots: LineupSlot[] = [];
  for (let i = 1; i <= 9; i++) {
    slots.push({ order: i, playerId: null, position: null });
  }
  return slots;
};

const initialUseDH = true;

export function useGameConfig(players?: Player[]) {
  const [useDH, setUseDH] = useState(initialUseDH);
  const [lineup, setLineup] = useState<LineupSlot[]>(createEmptyLineup(initialUseDH));
  const [fieldPositions, setFieldPositions] = useState<FieldPosition[]>(createFieldPositions(initialUseDH));
  const [benchPlayerIds, setBenchPlayerIds] = useState<string[]>([]);
  const [savedConfigs, setSavedConfigs] = useState<GameConfiguration[]>([]);
  const [currentConfigName, setCurrentConfigName] = useState('Untitled');
  const [loading, setLoading] = useState(true);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [lastDHPlayerId, setLastDHPlayerId] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  // Helper to handle API sync with rollback
  const syncWithRollback = useCallback(async (
    operation: () => Promise<void>,
    rollback: () => void,
    errorMessage: string
  ) => {
    try {
      await operation();
      setSyncError(null);
    } catch (err) {
      console.error(errorMessage, err);
      setSyncError(errorMessage);
      rollback();
      // Could also emit a toast notification here
    }
  }, []);

  // Load lineup and field positions from backend on mount
  useEffect(() => {
    const loadGameState = async () => {
      try {
        setLoading(true);
        
        // Load lineup
        const backendLineup = await lineupApi.get();
        const frontendLineup = mapBackendLineupToFrontend(backendLineup);

        // Load field positions
        const backendField = await fieldApi.get();
        const loadedUseDH = backendField.some(spot => spot.position === 'DH');
        const frontendField = mapBackendFieldToFrontend(backendField, createFieldPositions(loadedUseDH));
        const aligned = reconcileLineupToField({
          useDH: loadedUseDH,
          lineup: frontendLineup,
          fieldPositions: frontendField,
        });

        setUseDH(aligned.useDH);
        setLineup(aligned.lineup);
        setFieldPositions(aligned.fieldPositions);

        // Load saved configurations
        const configs = await configurationApi.getAll();
        // Convert backend configs to frontend format
        const frontendConfigs: GameConfiguration[] = configs.map(c => ({
          id: c.id,
          name: c.name,
          lineup: mapBackendLineupToFrontend(c.lineup),
          fieldPositions: mapBackendFieldToFrontend(
            c.field_positions, 
            createFieldPositions(c.use_dh ?? true)
          ),
          useDH: c.use_dh ?? true,
          createdAt: c.last_used_timestamp ? new Date(c.last_used_timestamp) : new Date(),
          updatedAt: c.last_used_timestamp ? new Date(c.last_used_timestamp) : new Date(),
        }));
        setSavedConfigs(frontendConfigs);
      } catch (err) {
        console.error('Failed to load game state:', err);
      } finally {
        setLoading(false);
      }
    };

    loadGameState();
  }, []);

  // Clean up invalid player IDs when players list changes
  useEffect(() => {
    if (!players || players.length === 0 || loading) return;

    const validPlayerIds = new Set(players.map(p => p.id));
    
    // Check if cleanup is needed
    const needsLineupCleanup = lineup.some(slot => 
      slot.playerId && !validPlayerIds.has(slot.playerId)
    );
    const needsFieldCleanup = fieldPositions.some(fp => 
      fp.playerId && !validPlayerIds.has(fp.playerId)
    );
    
    if (!needsLineupCleanup && !needsFieldCleanup) return;

    // Clean up lineup
    const cleanedLineup = lineup.map(slot => {
      if (slot.playerId && !validPlayerIds.has(slot.playerId)) {
        return { ...slot, playerId: null, position: null };
      }
      return slot;
    });

    // Clean up field positions
    const cleanedField = fieldPositions.map(fp => {
      if (fp.playerId && !validPlayerIds.has(fp.playerId)) {
        return { ...fp, playerId: null };
      }
      return fp;
    });

    // Update state and backend if changes were made
    if (needsLineupCleanup) {
      setLineup(cleanedLineup);
      lineupApi.update(mapFrontendLineupToBackend(cleanedLineup)).catch(err => 
        console.error('Failed to sync cleaned lineup:', err)
      );
    }

    if (needsFieldCleanup) {
      setFieldPositions(cleanedField);
      fieldApi.update(mapFrontendFieldToBackend(cleanedField)).catch(err => 
        console.error('Failed to sync cleaned field:', err)
      );
    }
  }, [players, loading, lineup, fieldPositions]);

  const commitAlignment = useCallback(async (next: AlignmentState, errorMessage: string) => {
    const previous: AlignmentState = { useDH, lineup, fieldPositions };
    setUseDH(next.useDH);
    setLineup(next.lineup);
    setFieldPositions(next.fieldPositions);
    setIsDirty(true);
    await syncWithRollback(
      async () => {
        await lineupApi.update(mapFrontendLineupToBackend(next.lineup));
        await fieldApi.update(mapFrontendFieldToBackend(next.fieldPositions));
      },
      () => {
        setUseDH(previous.useDH);
        setLineup(previous.lineup);
        setFieldPositions(previous.fieldPositions);
      },
      errorMessage,
    );
  }, [useDH, lineup, fieldPositions, syncWithRollback]);

  const currentAlignment = useCallback((): AlignmentState => ({
    useDH,
    lineup,
    fieldPositions,
  }), [useDH, lineup, fieldPositions]);

  const toggleDH = useCallback(async () => {
    const switched = setDhMode(currentAlignment(), !useDH, lastDHPlayerId);
    setLastDHPlayerId(switched.rememberedDh);
    await commitAlignment(switched.state, 'Failed to switch DH mode');
  }, [useDH, lastDHPlayerId, currentAlignment, commitAlignment]);

  const assignToLineup = useCallback(async (playerId: string, order: number, _position: Position | null, players: Player[]) => {
    const next = placeInLineup(currentAlignment(), playerId, order, players);
    setBenchPlayerIds(prev => prev.filter(id => id !== playerId));
    await commitAlignment(next, 'Failed to save lineup changes');
  }, [currentAlignment, commitAlignment]);

  const removeFromLineup = useCallback(async (order: number) => {
    const next = dropFromLineup(currentAlignment(), order);
    await commitAlignment(next, 'Failed to remove player from lineup');
  }, [currentAlignment, commitAlignment]);

  const reorderLineup = useCallback(async (fromOrder: number, toOrder: number) => {
    const next = moveLineupOrder(currentAlignment(), fromOrder, toOrder);
    await commitAlignment(next, 'Failed to reorder lineup');
  }, [currentAlignment, commitAlignment]);

  const assignToField = useCallback(async (playerId: string, position: Position) => {
    const next = placeOnField(currentAlignment(), playerId, position);
    setBenchPlayerIds(prev => prev.filter(id => id !== playerId));
    await commitAlignment(next, 'Failed to save field changes');
  }, [currentAlignment, commitAlignment]);

  const removeFromField = useCallback(async (position: Position) => {
    const next = dropFromField(currentAlignment(), position);
    await commitAlignment(next, 'Failed to remove player from field');
  }, [currentAlignment, commitAlignment]);

  const addToBench = useCallback(async (playerId: string) => {
    const next = sendToBench(currentAlignment(), playerId);
    setBenchPlayerIds(prev => prev.includes(playerId) ? prev : [...prev, playerId]);
    await commitAlignment(next, 'Failed to move player to the bench');
  }, [currentAlignment, commitAlignment]);

  const removeFromBench = useCallback((playerId: string) => {
    setBenchPlayerIds(prev => prev.filter(id => id !== playerId));
  }, []);

  const saveConfiguration = useCallback(async (name: string) => {
    try {
      // Save to backend
      const backendConfig = await configurationApi.create({
        name,
        lineup: mapFrontendLineupToBackend(lineup),
        field_positions: mapFrontendFieldToBackend(fieldPositions),
        use_dh: useDH,
        notes: '',
      });

      // Add to local state
      const config: GameConfiguration = {
        id: backendConfig.id,
        name: backendConfig.name,
        lineup: [...lineup],
        fieldPositions: [...fieldPositions],
        useDH,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      setSavedConfigs(prev => [...prev, config]);
      setCurrentConfigName(name);
      setIsDirty(false);
      return config;
    } catch (err) {
      console.error('Failed to save configuration:', err);
      throw err;
    }
  }, [lineup, fieldPositions, useDH]);

  const loadConfiguration = useCallback(async (configId: string) => {
    try {
      // Load from backend (this updates last_used_timestamp)
      const backendConfig = await configurationApi.getById(configId);
      
      // Restore the DH state from the saved configuration
      const savedUseDH = backendConfig.use_dh ?? true;
      setUseDH(savedUseDH);
      
      const aligned = reconcileLineupToField({
        useDH: savedUseDH,
        lineup: mapBackendLineupToFrontend(backendConfig.lineup),
        fieldPositions: mapBackendFieldToFrontend(
          backendConfig.field_positions,
          createFieldPositions(savedUseDH),
        ),
      });

      setUseDH(aligned.useDH);
      setLineup(aligned.lineup);
      setFieldPositions(aligned.fieldPositions);
      setCurrentConfigName(backendConfig.name);

      // Also sync these to the current lineup/field endpoints
      await lineupApi.update(backendConfig.lineup);
      await fieldApi.update(backendConfig.field_positions);
    } catch (err) {
      console.error('Failed to load configuration:', err);
      throw err;
    }
  }, []);

  const deleteConfiguration = useCallback(async (configId: string) => {
    try {
      // Delete from backend
      await configurationApi.delete(configId);
      
      // Remove from local state
      setSavedConfigs(prev => prev.filter(config => config.id !== configId));
    } catch (err) {
      console.error('Failed to delete configuration:', err);
      throw err;
    }
  }, []);

  const clearLineup = useCallback(async () => {
    setBenchPlayerIds([]);
    await commitAlignment(clearAlignment(currentAlignment()), 'Failed to clear lineup');
  }, [currentAlignment, commitAlignment]);

  const clearField = useCallback(async () => {
    setBenchPlayerIds([]);
    await commitAlignment(clearAlignment(currentAlignment()), 'Failed to clear field');
  }, [currentAlignment, commitAlignment]);

  return {
    useDH,
    toggleDH,
    lineup,
    assignToLineup,
    removeFromLineup,
    reorderLineup,
    fieldPositions,
    assignToField,
    removeFromField,
    benchPlayerIds,
    addToBench,
    removeFromBench,
    savedConfigs,
    currentConfigName,
    saveConfiguration,
    loadConfiguration,
    deleteConfiguration,
    clearLineup,
    clearField,
    loading,
    isDirty,
    syncError
  };
}
