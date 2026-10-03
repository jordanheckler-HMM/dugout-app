/**
 * Type Mappers between Frontend and Backend
 * 
 * The frontend and backend have slightly different data structures.
 * These mappers handle the conversion between the two.
 * 
 * CHANGES: Created new file to map between frontend types and backend API types
 */

import { Player, LineupSlot, FieldPosition, Position } from '@/types/player';
import { primaryPositionsOf, secondaryPositionsOf } from '@/lib/positions';
import {
  BackendPlayer,
  BackendLineupSlot,
  BackendFieldPosition,
} from './client';

// ==================== Player Mapping ====================

/**
 * Convert backend player to frontend player
 * Backend now includes status, stats are frontend-only
 */
export function mapBackendPlayerToFrontend(
  backendPlayer: BackendPlayer,
  existingPlayer?: Player
): Player {
  const primaryPositions = (
    backendPlayer.primary_positions?.length
      ? backendPlayer.primary_positions
      : [backendPlayer.primary_position]
  ).filter(Boolean) as Position[];
  const primaryPosition = primaryPositions[0];
  const secondaryPositions = secondaryPositionsOf({
    primaryPosition,
    primaryPositions,
    secondaryPositions: (backendPlayer.secondary_positions || []) as Position[],
  });
  
  return {
    id: backendPlayer.id,
    name: backendPlayer.name,
    number: backendPlayer.number,
    primaryPosition,
    primaryPositions,
    secondaryPositions,
    positions: [...primaryPositions, ...secondaryPositions],
    bats: backendPlayer.bats as 'L' | 'R' | 'S',
    throws: backendPlayer.throws as 'L' | 'R',
    status: (backendPlayer.status as 'active' | 'inactive' | 'archived') || existingPlayer?.status || 'active',
    notes: backendPlayer.notes ?? existingPlayer?.notes ?? '',
    stats: existingPlayer?.stats || {},
  };
}

/**
 * Convert frontend player to backend player (for create/update)
 */
export function mapFrontendPlayerToBackend(
  player: Omit<Player, 'id'> | Player
): Omit<BackendPlayer, 'id'> {
  const primaryPositions = primaryPositionsOf(player);
  const result: Omit<BackendPlayer, 'id'> = {
    name: player.name,
    primary_position: primaryPositions[0] ?? player.primaryPosition,
    primary_positions: primaryPositions,
    secondary_positions: secondaryPositionsOf(player),
    bats: player.bats,
    throws: player.throws,
    status: player.status,
    notes: player.notes ?? '',
  };
  
  // Only include number if it's defined (don't send 0 or undefined)
  if (player.number !== undefined && player.number !== null) {
    result.number = player.number;
  }
  
  return result;
}

// ==================== Lineup Mapping ====================

/**
 * Convert backend lineup slots to frontend lineup slots
 */
export function mapBackendLineupToFrontend(
  backendLineup: BackendLineupSlot[]
): LineupSlot[] {
  return backendLineup.map(slot => ({
    order: slot.slot_number,
    playerId: slot.player_id,
    position: null, // Frontend tracks position separately in field positions
  }));
}

/**
 * Convert frontend lineup slots to backend lineup slots
 */
export function mapFrontendLineupToBackend(
  frontendLineup: LineupSlot[]
): BackendLineupSlot[] {
  return frontendLineup.map(slot => ({
    slot_number: slot.order,
    player_id: slot.playerId,
  }));
}

// ==================== Field Position Mapping ====================

/**
 * Convert backend field positions to frontend field positions
 * Frontend has x/y coordinates for visualization, backend doesn't
 */
export function mapBackendFieldToFrontend(
  backendField: BackendFieldPosition[],
  existingField?: FieldPosition[]
): FieldPosition[] {
  // Default coordinates for each position
  const defaultCoordinates: Record<string, { x: number; y: number }> = {
    P: { x: 50, y: 60 },
    C: { x: 50, y: 85 },
    '1B': { x: 72, y: 52 },
    '2B': { x: 60, y: 42 },
    SS: { x: 40, y: 42 },
    '3B': { x: 28, y: 52 },
    LF: { x: 22, y: 25 },
    CF: { x: 50, y: 18 },
    RF: { x: 78, y: 25 },
    DH: { x: 20, y: 85 },
  };

  return backendField.map(fieldPos => {
    // Try to preserve existing coordinates
    const existing = existingField?.find(
      f => f.position === fieldPos.position
    );
    const coords =
      existing || defaultCoordinates[fieldPos.position] || { x: 50, y: 50 };

    return {
      position: fieldPos.position as Position,
      playerId: fieldPos.player_id,
      x: coords.x,
      y: coords.y,
    };
  });
}

/**
 * Convert frontend field positions to backend field positions
 */
export function mapFrontendFieldToBackend(
  frontendField: FieldPosition[]
): BackendFieldPosition[] {
  return frontendField.map(fieldPos => ({
    position: fieldPos.position,
    player_id: fieldPos.playerId,
  }));
}
