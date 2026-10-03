import { Player } from "@/types/player";
import { primaryPositionsOf, secondaryPositionsOf } from "@/lib/positions";
import { usePlayerSeasonStats } from "@/hooks/usePlayerSeasonStats";
import { Users } from "lucide-react";

function RosterCard({ player, onSelect, onEdit }: { player: Player; onSelect: () => void; onEdit: () => void }) {
  const { stats } = usePlayerSeasonStats(player.id);
  const primaries = primaryPositionsOf(player);
  const secondaries = secondaryPositionsOf(player);
  const avg = stats?.hitting.avg;
  const era = stats?.pitching.era;
  return (
    <article className="roster-card" data-player-id={player.id}>
      <button type="button" className="text-left w-full" onClick={onSelect}>
        <div className="flex items-start justify-between gap-2">
          <span className="jersey">{player.number ?? "—"}</span>
          <span className="text-[11px] uppercase tracking-wide text-muted-foreground">{player.status}</span>
        </div>
        <h3 className="text-[16px] font-semibold mt-2">{player.name}</h3>
        <p className="mt-1 flex flex-wrap gap-1">
          {primaries.map((position) => <span key={position} className="fit-badge fit-primary">{position}</span>)}
          {secondaries.map((position) => <span key={position} className="fit-badge fit-secondary">{position}</span>)}
        </p>
        <p className="text-[12px] text-muted-foreground mt-2">Bats {player.bats} · Throws {player.throws}</p>
        <p className="text-[12px] mt-2">
          {avg !== undefined ? `AVG ${avg.toFixed(3).replace(/^0/, "")}` : era !== undefined ? `ERA ${era.toFixed(2)}` : "No stats entered yet"}
        </p>
        {player.notes ? <p className="text-[12px] text-muted-foreground mt-1 line-clamp-2">{player.notes}</p> : null}
      </button>
      <button type="button" className="text-button mt-2" onClick={onEdit} aria-label={`Edit ${player.name}`}>Edit</button>
    </article>
  );
}

export function RosterView({
  players,
  onSelect,
  onEdit,
  onAdd,
}: {
  players: Player[];
  onSelect: (id: string) => void;
  onEdit: (player: Player) => void;
  onAdd: () => void;
}) {
  const active = players.filter((player) => player.status !== "archived");
  if (active.length === 0) {
    return (
      <div className="empty-stage">
        <Users />
        <h2>No players yet</h2>
        <p>Add the squad you coach. Everything stays on this device.</p>
        <button type="button" className="primary-button" onClick={onAdd}>Add player</button>
      </div>
    );
  }
  return (
    <div className="h-full overflow-auto p-4">
      <div className="flex items-end justify-between mb-3">
        <div>
          <h2 className="text-[18px] font-semibold">Squad</h2>
          <p className="text-[13px] text-muted-foreground">The roster you have entered, with the positions and stats you keep.</p>
        </div>
        <button type="button" className="primary-button" onClick={onAdd}>Add player</button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {active.map((player) => (
          <RosterCard key={player.id} player={player} onSelect={() => onSelect(player.id)} onEdit={() => onEdit(player)} />
        ))}
      </div>
    </div>
  );
}
