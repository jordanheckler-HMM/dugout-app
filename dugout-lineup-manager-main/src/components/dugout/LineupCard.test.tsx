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

import type { FieldPosition, LineupSlot, Player } from "@/types/player";
import { LineupCard } from "./LineupCard";

afterEach(() => {
  cleanup();
});

function makePlayer(overrides: Partial<Player>): Player {
  return {
    id: "player-1",
    name: "Test Player",
    number: 12,
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

describe("LineupCard", () => {
  const players: Player[] = [
    makePlayer({ id: "player-1", name: "First Player" }),
    makePlayer({ id: "player-2", name: "Second Player", number: 18, primaryPosition: "CF", positions: ["CF"] }),
  ];
  const lineup: LineupSlot[] = [
    { order: 1, playerId: "player-1", position: null },
    { order: 2, playerId: null, position: null },
  ];
  const fieldPositions: FieldPosition[] = [
    { position: "SS", playerId: "player-1", x: 40, y: 42 },
    { position: "CF", playerId: null, x: 50, y: 18 },
  ];

  it("highlights only the active slot during drag and clears highlight after drop", () => {
    const onAssign = vi.fn();
    const { container } = render(
      <LineupCard
        lineup={lineup}
        players={players}
        fieldPositions={fieldPositions}
        useDH
        benchPlayerIds={[]}
        onAssign={onAssign}
        onRemove={vi.fn()}
        onReorder={vi.fn()}
        onAddToBench={vi.fn()}
        draggingPlayerId="player-1"
        onDragPlayer={vi.fn()}
      />,
    );

    const slots = container.querySelectorAll(".lineup-slot");
    const firstSlot = slots[0] as HTMLElement;
    const secondSlot = slots[1] as HTMLElement;

    fireEvent.dragEnter(secondSlot);
    expect(secondSlot.className.includes("drag-over")).toBe(true);
    expect(firstSlot.className.includes("drag-over")).toBe(false);

    fireEvent.drop(secondSlot, { dataTransfer: { getData: () => "player-1" } });
    expect(onAssign).toHaveBeenCalledWith("player-1", 2, null);
    expect(secondSlot.className.includes("drag-over")).toBe(false);
  });

  it("moves drag highlight to bench and assigns to bench on drop", () => {
    const onAddToBench = vi.fn();
    const { container } = render(
      <LineupCard
        lineup={lineup}
        players={players}
        fieldPositions={fieldPositions}
        useDH
        benchPlayerIds={[]}
        onAssign={vi.fn()}
        onRemove={vi.fn()}
        onReorder={vi.fn()}
        onAddToBench={onAddToBench}
        draggingPlayerId="player-1"
        onDragPlayer={vi.fn()}
      />,
    );

    const secondSlot = container.querySelectorAll(".lineup-slot")[1] as HTMLElement;
    fireEvent.dragEnter(secondSlot);
    expect(secondSlot.className.includes("drag-over")).toBe(true);

    const benchText = screen.getByText(/Drag players here for bench/i);
    const benchDropZone = benchText.parentElement as HTMLElement;
    fireEvent.dragEnter(benchDropZone);

    expect(secondSlot.className.includes("drag-over")).toBe(false);
    expect(benchDropZone.className.includes("bg-accent/30")).toBe(true);

    fireEvent.drop(benchDropZone, { dataTransfer: { getData: () => "player-1" } });
    expect(onAddToBench).toHaveBeenCalledWith("player-1");
    expect(benchDropZone.className.includes("bg-accent/30")).toBe(false);
  });
});
