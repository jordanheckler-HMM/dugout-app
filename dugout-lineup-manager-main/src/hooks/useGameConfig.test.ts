// @vitest-environment jsdom

import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { lineupGetMock, fieldGetMock, configGetAllMock } = vi.hoisted(() => ({
  lineupGetMock: vi.fn(),
  fieldGetMock: vi.fn(),
  configGetAllMock: vi.fn(),
}));

vi.mock("@/api/client", () => ({
  lineupApi: {
    get: lineupGetMock,
    update: vi.fn(),
  },
  fieldApi: {
    get: fieldGetMock,
    update: vi.fn(),
  },
  configurationApi: {
    getAll: configGetAllMock,
    create: vi.fn(),
    getById: vi.fn(),
    delete: vi.fn(),
  },
}));

import { useGameConfig } from "./useGameConfig";

describe("useGameConfig", () => {
  beforeEach(() => {
    lineupGetMock.mockReset();
    fieldGetMock.mockReset();
    configGetAllMock.mockReset();

    lineupGetMock.mockResolvedValue(
      Array.from({ length: 9 }, (_, index) => ({
        slot_number: index + 1,
        player_id: null,
      })),
    );
    fieldGetMock.mockResolvedValue([
      { position: "P", player_id: null },
      { position: "C", player_id: null },
      { position: "1B", player_id: null },
      { position: "2B", player_id: null },
      { position: "SS", player_id: null },
      { position: "3B", player_id: null },
      { position: "LF", player_id: null },
      { position: "CF", player_id: null },
      { position: "RF", player_id: null },
    ]);
    configGetAllMock.mockResolvedValue([]);
  });

  it("keeps no-DH mode when the saved field has no DH slot", async () => {
    const { result } = renderHook(() => useGameConfig());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.useDH).toBe(false);
    expect(result.current.fieldPositions.some((slot) => slot.position === "DH")).toBe(false);
    expect(result.current.lineup).toHaveLength(9);
  });

  it("keeps DH mode when the saved field includes a DH slot", async () => {
    fieldGetMock.mockResolvedValue([
      { position: "P", player_id: null },
      { position: "C", player_id: null },
      { position: "1B", player_id: null },
      { position: "2B", player_id: null },
      { position: "SS", player_id: null },
      { position: "3B", player_id: null },
      { position: "LF", player_id: null },
      { position: "CF", player_id: null },
      { position: "RF", player_id: null },
      { position: "DH", player_id: "dh-1" },
    ]);
    lineupGetMock.mockResolvedValue(
      Array.from({ length: 9 }, (_, index) => ({
        slot_number: index + 1,
        player_id: index === 0 ? "dh-1" : null,
      })),
    );

    const { result } = renderHook(() => useGameConfig());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.useDH).toBe(true);
    expect(result.current.fieldPositions.find((slot) => slot.position === "DH")?.playerId).toBe("dh-1");
    expect(result.current.lineup[0].playerId).toBe("dh-1");
    expect(result.current.lineup[0].position).toBe("DH");
  });
});
