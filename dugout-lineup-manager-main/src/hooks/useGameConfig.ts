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

export function useGameConfig(players?: Player[]) {
  const [useDH, setUseDH] = useState(true);
  const [lineup, setLineup] = useState<LineupSlot[]>(createEmptyLineup(true));
  const [fieldPositions, setFieldPositions] = useState<FieldPosition[]>(createFieldPositions(true));
  const [benchPlayerIds, setBenchPlayerIds] = useState<string[]>([]);
  const [savedConfigs, setSavedConfigs] = useState<GameConfiguration[]>([]);
  const [currentConfigName, setCurrentConfigName] = useState('Untitled');
  const [loading, setLoading] = useState(true);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [lastDHPlayerId, setLastDHPlayerId] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  // Helper to handle API sync with rollback
  const syncWithRollback = async (
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
  };

  // Load lineup and field positions from backend on mount
  useEffect(() => {
    const loadGameState = async () => {
      try {
        setLoading(true);
        
        // Load lineup
        const backendLineup = await lineupApi.get();
        const frontendLineup = mapBackendLineupToFrontend(backendLineup);
        setLineup(frontendLineup);

        // Load field positions
        const backendField = await fieldApi.get();
        let frontendField = mapBackendFieldToFrontend(backendField, createFieldPositions(useDH));
        
        // If useDH is true but DH position is missing, add it
        if (useDH && !frontendField.some(fp => fp.position === 'DH')) {
          frontendField = [
            ...frontendField,
            { position: 'DH' as Position, playerId: null, x: 20, y: 85 }
          ];
        }
        
        setFieldPositions(frontendField);

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

  const toggleDH = useCallback(async () => {
    const newUseDH = !useDH;
    
    // If turning OFF DH
    if (!newUseDH) {
      // Find the DH player and the pitcher
      const dhPosition = fieldPositions.find(fp => fp.position === 'DH');
      const dhPlayerId = dhPosition?.playerId;
      const pitcherPosition = fieldPositions.find(fp => fp.position === 'P');
      const pitcherPlayerId = pitcherPosition?.playerId;
      
      // Save the DH player for when DH is turned back on
      if (dhPlayerId) {
        setLastDHPlayerId(dhPlayerId);
      }
      
      // Remove DH position from field
      const newFieldPositions = fieldPositions.filter(fp => fp.position !== 'DH');
      setFieldPositions(newFieldPositions);
      
      // Update lineup: Replace DH with pitcher (if there is one)
      if (dhPlayerId) {
        const newLineup = lineup.map(slot => {
          if (slot.playerId === dhPlayerId) {
            // Replace DH with pitcher in this lineup spot
            return { 
              ...slot, 
              playerId: pitcherPlayerId || null, 
              position: pitcherPlayerId ? 'P' : null 
            };
          }
          return slot;
        });
        setLineup(newLineup);
        
        // Sync to backend
        try {
          const backendLineup = mapFrontendLineupToBackend(newLineup);
          await lineupApi.update(backendLineup);
        } catch (err) {
          console.error('Failed to sync lineup:', err);
        }
      }
      
      // Sync field to backend
      try {
        const backendField = mapFrontendFieldToBackend(newFieldPositions);
        await fieldApi.update(backendField);
      } catch (err) {
        console.error('Failed to sync field:', err);
      }
    } 
    // If turning ON DH
    else {
      // Add DH position to field, restoring previous DH player if available
      const newFieldPositions = [
        ...fieldPositions,
        { position: 'DH' as Position, playerId: lastDHPlayerId, x: 20, y: 85 }
      ];
      setFieldPositions(newFieldPositions);
      
      // If we're restoring a DH player, also add them to lineup if not already there
      if (lastDHPlayerId) {
        const isInLineup = lineup.some(slot => slot.playerId === lastDHPlayerId);
        if (!isInLineup) {
          const emptySlot = lineup.find(slot => !slot.playerId);
          if (emptySlot) {
            const newLineup = lineup.map(slot =>
              slot.order === emptySlot.order
                ? { ...slot, playerId: lastDHPlayerId, position: 'DH' as Position }
                : slot
            );
            setLineup(newLineup);
            
            try {
              const backendLineup = mapFrontendLineupToBackend(newLineup);
              await lineupApi.update(backendLineup);
            } catch (err) {
              console.error('Failed to sync lineup:', err);
            }
          }
        }
      }
      
      // Sync field to backend
      try {
        const backendField = mapFrontendFieldToBackend(newFieldPositions);
        await fieldApi.update(backendField);
      } catch (err) {
        console.error('Failed to sync field:', err);
      }
    }
    
    setUseDH(newUseDH);
  }, [useDH, fieldPositions, lineup, lastDHPlayerId]);

  const assignToLineup = useCallback(async (playerId: string, order: number, position: Position | null, players: Player[]) => {
    // Save previous state for rollback
    const previousLineup = [...lineup];
    const previousFieldPositions = [...fieldPositions];
    
    // Find where the dragged player currently is
    const currentSlot = lineup.find(slot => slot.playerId === playerId);
    // Find the target slot
    const targetSlot = lineup.find(slot => slot.order === order);
    
    const newLineup = lineup.map(slot => {
      // If this is the target slot, put the dragged player here
      if (slot.order === order) {
        return { ...slot, playerId, position };
      }
      // If this is where the dragged player came from, put the target slot's player here (swap)
      if (currentSlot && slot.order === currentSlot.order && targetSlot) {
        return { 
          ...slot, 
          playerId: targetSlot.playerId, 
          position: targetSlot.position 
        };
      }
      // For all other slots, leave them unchanged
      return slot;
    });
    
    setLineup(newLineup);
    setIsDirty(true);
    
    // AUTO-SYNC: Also add player to field if not already there
    let newFieldPositions = fieldPositions;
    const isOnField = fieldPositions.some(fp => fp.playerId === playerId);
    if (!isOnField) {
      const player = players.find(p => p.id === playerId);
      if (player) {
        // Try to place at primary position
        let targetFieldPosition = fieldPositions.find(
          fp => fp.position === player.primaryPosition && !fp.playerId
        );
        
        // If primary is taken, try secondary positions
        if (!targetFieldPosition && player.secondaryPositions) {
          for (const secPos of player.secondaryPositions) {
            targetFieldPosition = fieldPositions.find(
              fp => fp.position === secPos && !fp.playerId
            );
            if (targetFieldPosition) break;
          }
        }
        
        // If no preferred position available, find any empty spot (preferring standard positions over DH)
        if (!targetFieldPosition) {
          // First try to find an empty standard defensive position
          targetFieldPosition = fieldPositions.find(fp => fp.position !== 'DH' && !fp.playerId);
          // If all standard positions are full, then use DH
          if (!targetFieldPosition) {
            targetFieldPosition = fieldPositions.find(fp => !fp.playerId);
          }
        }
        
        // Assign to field
        if (targetFieldPosition) {
          newFieldPositions = fieldPositions.map(fp =>
            fp.position === targetFieldPosition!.position
              ? { ...fp, playerId }
              : fp
          );
          setFieldPositions(newFieldPositions);
        }
      }
    }
    
    // Sync to backend with rollback on error
    await syncWithRollback(
      async () => {
        const backendLineup = mapFrontendLineupToBackend(newLineup);
        await lineupApi.update(backendLineup);
        
        if (newFieldPositions !== fieldPositions) {
          const backendField = mapFrontendFieldToBackend(newFieldPositions);
          await fieldApi.update(backendField);
        }
      },
      () => {
        setLineup(previousLineup);
        setFieldPositions(previousFieldPositions);
      },
      'Failed to save lineup changes'
    );
    
    // Remove from bench if present
    setBenchPlayerIds(prev => prev.filter(id => id !== playerId));
  }, [lineup, fieldPositions, syncWithRollback]);

  const removeFromLineup = useCallback(async (order: number) => {
    // Save previous state for rollback
    const previousLineup = [...lineup];
    const previousFieldPositions = [...fieldPositions];
    
    // Find the player being removed
    const slotToRemove = lineup.find(slot => slot.order === order);
    const playerIdToRemove = slotToRemove?.playerId;
    
    const newLineup = lineup.map(slot =>
      slot.order === order ? { ...slot, playerId: null, position: null } : slot
    );
    
    setLineup(newLineup);
    setIsDirty(true);
    
    // AUTO-SYNC: Also remove player from field
    let newFieldPositions = fieldPositions;
    if (playerIdToRemove) {
      newFieldPositions = fieldPositions.map(fp =>
        fp.playerId === playerIdToRemove ? { ...fp, playerId: null } : fp
      );
      setFieldPositions(newFieldPositions);
    }
    
    // Sync to backend with rollback on error
    await syncWithRollback(
      async () => {
        const backendLineup = mapFrontendLineupToBackend(newLineup);
        await lineupApi.update(backendLineup);
        
        if (playerIdToRemove) {
          const backendField = mapFrontendFieldToBackend(newFieldPositions);
          await fieldApi.update(backendField);
        }
      },
      () => {
        setLineup(previousLineup);
        setFieldPositions(previousFieldPositions);
      },
      'Failed to remove player from lineup'
    );
  }, [lineup, fieldPositions, syncWithRollback]);

  const reorderLineup = useCallback(async (fromOrder: number, toOrder: number) => {
    // Save previous state for rollback
    const previousLineup = [...lineup];
    
    const newLineup = [...lineup];
    const fromSlot = newLineup.find(s => s.order === fromOrder);
    const toSlot = newLineup.find(s => s.order === toOrder);
    
    if (fromSlot && toSlot) {
      const tempPlayerId = fromSlot.playerId;
      const tempPosition = fromSlot.position;
      fromSlot.playerId = toSlot.playerId;
      fromSlot.position = toSlot.position;
      toSlot.playerId = tempPlayerId;
      toSlot.position = tempPosition;
    }
    
    setLineup(newLineup);
    setIsDirty(true);
    
    // Sync to backend with rollback on error
    await syncWithRollback(
      async () => {
        const backendLineup = mapFrontendLineupToBackend(newLineup);
        await lineupApi.update(backendLineup);
      },
      () => {
        setLineup(previousLineup);
      },
      'Failed to reorder lineup'
    );
  }, [lineup, syncWithRollback]);

  const assignToField = useCallback(async (playerId: string, position: Position) => {
    // Save previous state for rollback
    const previousLineup = [...lineup];
    const previousFieldPositions = [...fieldPositions];
    
    // Find where the dragged player currently is
    const currentPosition = fieldPositions.find(fp => fp.playerId === playerId);
    // Find the target position
    const targetPosition = fieldPositions.find(fp => fp.position === position);
    
    const newFieldPositions = fieldPositions.map(fp => {
      // If this is the target position, put the dragged player here
      if (fp.position === position) {
        return { ...fp, playerId };
      }
      // If this is where the dragged player came from, put the target position's player here (swap)
      if (currentPosition && fp.position === currentPosition.position && targetPosition) {
        return { 
          ...fp, 
          playerId: targetPosition.playerId 
        };
      }
      // For all other positions, leave them unchanged
      return fp;
    });
    
    setFieldPositions(newFieldPositions);
    setIsDirty(true);
    
    // AUTO-SYNC: Also add player to lineup if not already there
    let newLineup = lineup;
    const isInLineup = lineup.some(slot => slot.playerId === playerId);
    if (!isInLineup) {
      // Find first empty lineup slot
      const emptySlot = lineup.find(slot => !slot.playerId);
      if (emptySlot) {
        newLineup = lineup.map(slot =>
          slot.order === emptySlot.order
            ? { ...slot, playerId, position: null }
            : slot
        );
        setLineup(newLineup);
      }
    }
    
    // Sync to backend with rollback on error
    await syncWithRollback(
      async () => {
        const backendField = mapFrontendFieldToBackend(newFieldPositions);
        await fieldApi.update(backendField);
        
        if (newLineup !== lineup) {
          const backendLineup = mapFrontendLineupToBackend(newLineup);
          await lineupApi.update(backendLineup);
        }
      },
      () => {
        setFieldPositions(previousFieldPositions);
        setLineup(previousLineup);
      },
      'Failed to assign player to field'
    );
  }, [fieldPositions, lineup, syncWithRollback]);

  const removeFromField = useCallback(async (position: Position) => {
    // Save previous state for rollback
    const previousLineup = [...lineup];
    const previousFieldPositions = [...fieldPositions];
    
    // Find the player being removed
    const positionToRemove = fieldPositions.find(fp => fp.position === position);
    const playerIdToRemove = positionToRemove?.playerId;
    
    const newFieldPositions = fieldPositions.map(fp =>
      fp.position === position ? { ...fp, playerId: null } : fp
    );
    
    setFieldPositions(newFieldPositions);
    setIsDirty(true);
    
    // AUTO-SYNC: Also remove player from lineup
    let newLineup = lineup;
    if (playerIdToRemove) {
      newLineup = lineup.map(slot =>
        slot.playerId === playerIdToRemove ? { ...slot, playerId: null, position: null } : slot
      );
      setLineup(newLineup);
    }
    
    // Sync to backend with rollback on error
    await syncWithRollback(
      async () => {
        const backendField = mapFrontendFieldToBackend(newFieldPositions);
        await fieldApi.update(backendField);
        
        if (playerIdToRemove) {
          const backendLineup = mapFrontendLineupToBackend(newLineup);
          await lineupApi.update(backendLineup);
        }
      },
      () => {
        setFieldPositions(previousFieldPositions);
        setLineup(previousLineup);
      },
      'Failed to remove player from field'
    );
  }, [fieldPositions, lineup, syncWithRollback]);

  const addToBench = useCallback((playerId: string) => {
    // Remove from lineup first
    setLineup(prev =>
      prev.map(slot =>
        slot.playerId === playerId ? { ...slot, playerId: null, position: null } : slot
      )
    );
    setBenchPlayerIds(prev =>
      prev.includes(playerId) ? prev : [...prev, playerId]
    );
  }, []);

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
      
      const frontendLineup = mapBackendLineupToFrontend(backendConfig.lineup);
      const frontendField = mapBackendFieldToFrontend(
        backendConfig.field_positions, 
        createFieldPositions(savedUseDH)
      );
      
      setLineup(frontendLineup);
      setFieldPositions(frontendField);
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
    // Save previous state for rollback
    const previousLineup = [...lineup];
    const previousBenchPlayerIds = [...benchPlayerIds];
    
    const emptyLineup = createEmptyLineup(useDH);
    setLineup(emptyLineup);
    setBenchPlayerIds([]);
    setIsDirty(true);
    
    // Sync to backend with rollback on error
    await syncWithRollback(
      async () => {
        const backendLineup = mapFrontendLineupToBackend(emptyLineup);
        await lineupApi.update(backendLineup);
      },
      () => {
        setLineup(previousLineup);
        setBenchPlayerIds(previousBenchPlayerIds);
      },
      'Failed to clear lineup'
    );
  }, [useDH, lineup, benchPlayerIds, syncWithRollback]);

  const clearField = useCallback(async () => {
    // Save previous state for rollback
    const previousFieldPositions = [...fieldPositions];
    
    const emptyFieldPositions = createFieldPositions(useDH);
    setFieldPositions(emptyFieldPositions);
    setIsDirty(true);
    
    // Sync to backend with rollback on error
    await syncWithRollback(
      async () => {
        const backendField = mapFrontendFieldToBackend(emptyFieldPositions);
        await fieldApi.update(backendField);
      },
      () => {
        setFieldPositions(previousFieldPositions);
      },
      'Failed to clear field'
    );
  }, [useDH, fieldPositions, syncWithRollback]);

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
