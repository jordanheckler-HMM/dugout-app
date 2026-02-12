import { describe, expect, it } from "vitest";

import {
  mapBackendFieldToFrontend,
  mapBackendPlayerToFrontend,
  mapFrontendLineupToBackend,
  mapFrontendPlayerToBackend,
} from "./mappers";
import type { BackendPlayer } from "./client";
import type { FieldPosition, LineupSlot, Player } from "@/types/player";

describe("mapBackendPlayerToFrontend", () => {
  it("preserves existing frontend-only data when backend status is missing", () => {
    const backendPlayer: BackendPlayer = {
      id: "player-1",
      name: "Test Player",
      number: 9,
      primary_position: "SS",
      secondary_positions: ["2B", "3B"],
      bats: "R",
      throws: "R",
    };

    const existingPlayer: Player = {
      id: "player-1",
      name: "Old Name",
      number: 9,
      primaryPosition: "SS",
      secondaryPositions: ["2B"],
      positions: ["SS", "2B"],
      bats: "R",
      throws: "R",
      status: "inactive",
      stats: { avg: 0.333 },
    };

    const mapped = mapBackendPlayerToFrontend(backendPlayer, existingPlayer);

    expect(mapped.status).toBe("inactive");
    expect(mapped.stats).toEqual({ avg: 0.333 });
    expect(mapped.positions).toEqual(["SS", "2B", "3B"]);
  });
});

describe("mapFrontendPlayerToBackend", () => {
  it("omits undefined player number but keeps required backend fields", () => {
    const playerWithoutNumber = {
      id: "player-2",
      name: "No Number",
      primaryPosition: "CF" as const,
      secondaryPositions: ["LF"] as const,
      positions: ["CF", "LF"] as const,
      bats: "L" as const,
      throws: "R" as const,
      status: "active" as const,
      stats: {},
    };

    const mapped = mapFrontendPlayerToBackend(playerWithoutNumber);

    expect(mapped.number).toBeUndefined();
    expect(mapped.notes).toBe("");
    expect(mapped.primary_position).toBe("CF");
    expect(mapped.secondary_positions).toEqual(["LF"]);
  });
});

describe("lineup and field mapping", () => {
  it("maps lineup slots and preserves existing field coordinates", () => {
    const lineup: LineupSlot[] = [
      { order: 1, playerId: "player-1", position: "SS" },
      { order: 2, playerId: null, position: null },
    ];

    expect(mapFrontendLineupToBackend(lineup)).toEqual([
      { slot_number: 1, player_id: "player-1" },
      { slot_number: 2, player_id: null },
    ]);

    const existingField: FieldPosition[] = [
      { position: "P", playerId: "pitcher-1", x: 11, y: 22 },
    ];

    const mappedField = mapBackendFieldToFrontend(
      [
        { position: "P", player_id: "pitcher-2" },
        { position: "1B", player_id: null },
      ],
      existingField,
    );

    expect(mappedField).toEqual([
      { position: "P", playerId: "pitcher-2", x: 11, y: 22 },
      { position: "1B", playerId: null, x: 72, y: 52 },
    ]);
  });
});
