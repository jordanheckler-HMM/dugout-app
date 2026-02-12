// @vitest-environment jsdom

import { cleanup, render, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { getGameByIdMock, getPlayersMock, getStatsByGameMock, navigateMock, routeState } = vi.hoisted(() => ({
  getGameByIdMock: vi.fn(),
  getPlayersMock: vi.fn(),
  getStatsByGameMock: vi.fn(),
  navigateMock: vi.fn(),
  routeState: { gameId: "game-1" },
}));

vi.mock("@/api/client", () => ({
  gamesApi: {
    getById: getGameByIdMock,
  },
  playersApi: {
    getAll: getPlayersMock,
  },
  gameStatsApi: {
    getByGame: getStatsByGameMock,
    bulkUpdate: vi.fn(),
  },
}));

vi.mock("react-helmet-async", () => ({
  Helmet: ({ children }: { children?: ReactNode }) => <>{children}</>,
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useParams: () => ({ gameId: routeState.gameId }),
    useNavigate: () => navigateMock,
  };
});

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import GameStats from "./GameStats";

describe("GameStats", () => {
  beforeEach(() => {
    routeState.gameId = "game-1";
    getGameByIdMock.mockReset();
    getPlayersMock.mockReset();
    getStatsByGameMock.mockReset();
    navigateMock.mockReset();

    getGameByIdMock.mockImplementation(async (id: string) => ({
      id,
      date: "2025-06-01",
      opponent: id === "game-1" ? "Sharks" : "Eagles",
      home_away: "home",
      source: "manual",
      status: "scheduled",
      result: undefined,
      score_us: undefined,
      score_them: undefined,
      notes: "",
      created_at: "2025-06-01T12:00:00.000Z",
    }));
    getPlayersMock.mockResolvedValue([
      {
        id: "player-1",
        name: "Taylor Swift",
        number: 9,
        primary_position: "SS",
        secondary_positions: [],
        bats: "R",
        throws: "R",
      },
    ]);
    getStatsByGameMock.mockResolvedValue([]);
  });

  afterEach(() => {
    cleanup();
  });

  it("loads game and stats data for the current route param", async () => {
    render(<GameStats />);

    await waitFor(() => {
      expect(getGameByIdMock).toHaveBeenCalledWith("game-1");
      expect(getPlayersMock).toHaveBeenCalledTimes(1);
      expect(getStatsByGameMock).toHaveBeenCalledWith("game-1");
    });
  });

  it("reloads data when the route gameId changes", async () => {
    const { rerender } = render(<GameStats />);

    await waitFor(() => {
      expect(getGameByIdMock).toHaveBeenCalledWith("game-1");
    });

    routeState.gameId = "game-2";
    rerender(<GameStats />);

    await waitFor(() => {
      expect(getGameByIdMock).toHaveBeenLastCalledWith("game-2");
      expect(getStatsByGameMock).toHaveBeenLastCalledWith("game-2");
    });
  });
});
