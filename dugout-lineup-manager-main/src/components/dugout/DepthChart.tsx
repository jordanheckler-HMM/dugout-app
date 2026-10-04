import { useDroppable } from "@dnd-kit/core";
import { Player, Position } from "@/types/player";
import { ALL_POSITIONS, primaryPositionsOf, secondaryPositionsOf } from "@/lib/positions";
import { cn } from "@/lib/utils";

function Column({
  position,
  players,
  selectedId,
  onSelect,
}: {
  position: Position;
  players: Player[];
  selectedId: string | null;
  onSelect?: (playerId: string) => void;
}) {
  const drop = useDroppable({ id: `depth:${position}`, data: { type: "depth", position } });
  const starters = players.filter((player) => primaryPositionsOf(player).includes(position));
  const depth = players.filter((player) => secondaryPositionsOf(player).includes(position));
  const rows = [
    ...starters.map((player) => ({ player, role: "Primary" as const })),
    ...depth.map((player) => ({ player, role: "Secondary" as const })),
  ];
  return (
    <section
      ref={drop.setNodeRef}
      data-drop-id={`depth:${position}`}
      className={cn("depth-column", drop.isOver && "drag-over")}
    >
      <header>
        <h4 className="show-section-title show-section-title-sm">{position}</h4>
      </header>
      {rows.length === 0 ? <p className="empty-copy">Nobody lists {position} yet.</p> : null}
      <ul className="show-rows">
        {rows.map(({ player, role }, index) => (
          <li key={player.id}>
            <button
              type="button"
              className={cn("show-row depth-row", selectedId === player.id && "is-selected")}
              onClick={() => onSelect?.(player.id)}
            >
              <span className="show-player">
                <span className="show-order">{index + 1}.</span>
                <span className="show-name">{player.name}</span>
                <span className={cn("fit-badge show-role", role === "Primary" ? "fit-primary" : "fit-secondary")}>{role === "Primary" ? position : "2nd"}</span>
              </span>
              <span>{player.bats}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function DepthChart({
  players,
  selectedId = null,
  onSelect,
}: {
  players: Player[];
  selectedId?: string | null;
  onSelect?: (playerId: string) => void;
}) {
  const active = players.filter((player) => player.status === "active");
  const positionPlayers = ALL_POSITIONS.filter((position) => position !== "P");
  return (
    <div className="h-full overflow-auto px-3 pb-3">
      <h2 className="show-section-title mb-2">Depth chart</h2>
      <p className="show-section-note mb-3">
        Drop a player on a column to add that spot as another primary. One primary is enough.
      </p>
      {active.length === 0 ? <p className="empty-copy">Add active players before building a depth chart.</p> : null}
      <div className="show-panels depth-panels">
        <section className="show-panel" aria-label="Pitchers">
          <header className="show-panel-head">
            <h3 className="show-section-title">Pitchers</h3>
          </header>
          <Column position="P" players={active} selectedId={selectedId} onSelect={onSelect} />
        </section>
        <section className="show-panel" aria-label="Position players">
          <header className="show-panel-head">
            <h3 className="show-section-title">Position players</h3>
          </header>
          <div className="depth-grid">
            {positionPlayers.map((position) => (
              <Column key={position} position={position} players={active} selectedId={selectedId} onSelect={onSelect} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
