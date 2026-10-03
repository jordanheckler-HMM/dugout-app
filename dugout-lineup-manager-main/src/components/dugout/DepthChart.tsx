import { useDroppable } from "@dnd-kit/core";
import { Player, Position } from "@/types/player";
import { ALL_POSITIONS, primaryPositionsOf, secondaryPositionsOf } from "@/lib/positions";
import { cn } from "@/lib/utils";

function Column({ position, players }: { position: Position; players: Player[] }) {
  const drop = useDroppable({ id: `depth:${position}`, data: { type: "depth", position } });
  const starters = players.filter((player) => primaryPositionsOf(player).includes(position));
  const depth = players.filter((player) => secondaryPositionsOf(player).includes(position));
  return (
    <section
      ref={drop.setNodeRef}
      data-drop-id={`depth:${position}`}
      className={cn("depth-column", drop.isOver && "drag-over")}
    >
      <header className="flex items-center justify-between">
        <h3 className="text-[13px] font-semibold">{position}</h3>
        <span className="text-[11px] text-muted-foreground">{starters.length}</span>
      </header>
      {starters.length === 0 && depth.length === 0 ? (
        <p className="empty-copy">Nobody lists {position} yet.</p>
      ) : null}
      <ul className="space-y-1.5 mt-2">
        {starters.map((player) => (
          <li key={player.id} className="depth-player">
            <strong>{player.name}</strong>
            <span>Primary · B {player.bats}</span>
          </li>
        ))}
        {depth.map((player) => (
          <li key={player.id} className="depth-player depth-player-secondary">
            <strong>{player.name}</strong>
            <span>Secondary</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function DepthChart({ players }: { players: Player[] }) {
  const active = players.filter((player) => player.status === "active");
  return (
    <div className="h-full overflow-auto p-4">
      <h2 className="text-[18px] font-semibold">Depth chart</h2>
      <p className="text-[13px] text-muted-foreground mb-3">
        Drop a player on a column to add that spot as another primary. One primary is enough.
      </p>
      {active.length === 0 ? <p className="empty-copy">Add active players before building a depth chart.</p> : null}
      <div className="grid gap-2 grid-cols-2 md:grid-cols-5">
        {ALL_POSITIONS.map((position) => (
          <Column key={position} position={position} players={active} />
        ))}
      </div>
    </div>
  );
}
