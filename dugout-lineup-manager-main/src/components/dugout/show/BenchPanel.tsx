import { useDroppable } from "@dnd-kit/core";
import { FieldPosition, LineupSlot, Player } from "@/types/player";
import { primaryPositionsOf } from "@/lib/positions";
import { cn } from "@/lib/utils";

export function BenchPanel({
  players,
  lineup,
  fieldPositions,
  selectedId,
  onSelect,
}: {
  players: Player[];
  lineup: LineupSlot[];
  fieldPositions: FieldPosition[];
  selectedId: string | null;
  onSelect: (playerId: string) => void;
}) {
  const bench = useDroppable({ id: "bench", data: { type: "bench" } });
  const placed = new Set(
    [...lineup.map((slot) => slot.playerId), ...fieldPositions.map((spot) => spot.playerId)].filter(
      (id): id is string => Boolean(id),
    ),
  );
  const rows = players.filter((player) => player.status === "active" && !placed.has(player.id));

  return (
    <section
      ref={bench.setNodeRef}
      data-drop-id="bench"
      className={cn("show-panel", bench.isOver && "drag-over")}
      aria-label="Bench"
    >
      <header className="show-panel-head">
        <h3 className="show-section-title">Bench</h3>
      </header>
      <div className="show-cols" aria-hidden="true">
        <span>Player</span>
        <span>Pos</span>
        <span>Bats</span>
        <span>Hand</span>
      </div>
      <div className="show-rows">
        {rows.length === 0 ? (
          <p className="empty-copy px-3 py-3">Drop a player here to take them out of the lineup and off the field.</p>
        ) : (
          rows.map((player, index) => {
            const position = primaryPositionsOf(player)[0] ?? "—";
            return (
              <button
                key={player.id}
                type="button"
                className={cn("show-row", selectedId === player.id && "is-selected")}
                onClick={() => onSelect(player.id)}
              >
                <span className="show-player">
                  <span className="show-order">{index + 1}.</span>
                  <span className="show-name">{player.name}</span>
                  <span className="fit-badge fit-primary show-role">{position}</span>
                </span>
                <span>{position}</span>
                <span>{player.bats}</span>
                <span>{player.throws}</span>
              </button>
            );
          })
        )}
      </div>
    </section>
  );
}
