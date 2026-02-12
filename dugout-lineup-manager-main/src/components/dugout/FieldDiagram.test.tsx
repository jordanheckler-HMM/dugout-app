// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { FieldPosition, Player } from "@/types/player";
import { FieldDiagram } from "./FieldDiagram";

afterEach(() => {
  cleanup();
});

function makePlayer(overrides: Partial<Player>): Player {
  return {
    id: "player-1",
    name: "Alex Rivera",
    number: 9,
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

describe("FieldDiagram", () => {
  it("provides a labeled remove button for assigned field players", () => {
    const players: Player[] = [makePlayer({ id: "player-1", name: "Alex Rivera" })];
    const fieldPositions: FieldPosition[] = [
      { position: "SS", playerId: "player-1", x: 40, y: 42 },
      { position: "CF", playerId: null, x: 50, y: 18 },
    ];
    const onRemove = vi.fn();

    render(
      <FieldDiagram
        fieldPositions={fieldPositions}
        players={players}
        onAssign={vi.fn()}
        onRemove={onRemove}
        draggingPlayerId={null}
        onDragPlayer={vi.fn()}
      />,
    );

    const removeButton = screen.getByRole("button", { name: "Remove Alex Rivera from SS" });
    expect(removeButton.getAttribute("type")).toBe("button");

    fireEvent.click(removeButton);
    expect(onRemove).toHaveBeenCalledWith("SS");
  });
});
