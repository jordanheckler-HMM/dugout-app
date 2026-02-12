// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/usePlayerSeasonStats", () => ({
  usePlayerSeasonStats: () => ({
    stats: null,
    loading: false,
    error: null,
  }),
}));

import type { Player } from "@/types/player";
import { PlayerCard } from "./PlayerCard";

afterEach(() => {
  cleanup();
});

function makePlayer(overrides: Partial<Player>): Player {
  return {
    id: "player-1",
    name: "Test Player",
    number: 7,
    primaryPosition: "SS",
    secondaryPositions: [],
    positions: ["SS"],
    bats: "R",
    throws: "R",
    status: "active",
    stats: {},
    ...overrides,
  };
}

describe("PlayerCard", () => {
  it("exposes an accessible edit button label and invokes onEdit", () => {
    const onEdit = vi.fn();
    render(
      <PlayerCard
        player={makePlayer({ name: "Alex Rivera" })}
        onEdit={onEdit}
      />,
    );

    const editButton = screen.getByRole("button", { name: "Edit Alex Rivera" });
    expect(editButton.getAttribute("type")).toBe("button");

    fireEvent.click(editButton);
    expect(onEdit).toHaveBeenCalledTimes(1);
  });
});
