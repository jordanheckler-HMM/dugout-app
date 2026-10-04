import { Player } from "@/types/player";
import { primaryPositionsOf, secondaryPositionsOf } from "@/lib/positions";
import { usePlayerSeasonStats } from "@/hooks/usePlayerSeasonStats";
import { heroStat, showStatsFor } from "@/lib/showStats";
import { Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { PlayerDossier } from "./show/PlayerDossier";

function RosterCard({
  player,
  selected,
  onSelect,
  onEdit,
}: {
  player: Player;
  selected: boolean;
  onSelect: () => void;
  onEdit: () => void;
}) {
  const { stats } = usePlayerSeasonStats(player.id);
  const primaries = primaryPositionsOf(player);
  const secondaries = secondaryPositionsOf(player);
  const hero = heroStat(showStatsFor(player, stats));
  return (
    <article className={cn("roster-card", selected && "is-selected")} data-player-id={player.id}>
      <button type="button" className="text-left w-full" onClick={onSelect}>
        <div className="flex items-start justify-between gap-2">
          <span className="jersey">{player.number ?? "—"}</span>
          <span className="show-badge">{player.status}</span>
        </div>
        <h3 className="show-card-name">{player.name}</h3>
        <p className="mt-1 flex flex-wrap gap-1">
          {primaries.map((position) => <span key={position} className="fit-badge fit-primary">{position}</span>)}
          {secondaries.map((position) => <span key={position} className="fit-badge fit-secondary">{position}</span>)}
        </p>
        <p className="text-[12px] mt-2">Bats {player.bats} · Throws {player.throws}</p>
        <p className="text-[13px] mt-2 font-semibold">
          {hero ? `${hero.label} ${hero.value}` : "—"}
        </p>
        {player.notes ? <p className="text-[12px] mt-1 line-clamp-2">{player.notes}</p> : null}
      </button>
      <button type="button" className="text-button mt-2" onClick={onEdit} aria-label={`Edit ${player.name}`}>Edit</button>
    </article>
  );
}

export function RosterView({
  players,
  selectedId,
  onSelect,
  onEdit,
  onAdd,
}: {
  players: Player[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onEdit: (player: Player) => void;
  onAdd: () => void;
}) {
  const active = players.filter((player) => player.status !== "archived");
  const selected = active.find((player) => player.id === selectedId) ?? null;
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
    <div className="h-full overflow-auto px-3 pb-3">
      <div className="flex items-end justify-between mb-3 gap-3">
        <div>
          <h2 className="show-section-title">Squad</h2>
          <p className="show-section-note">The roster you have entered, with the positions and stats you keep.</p>
        </div>
        <button type="button" className="primary-button" onClick={onAdd}>Add player</button>
      </div>
      <PlayerDossier player={selected} />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 mt-3">
        {active.map((player) => (
          <RosterCard
            key={player.id}
            player={player}
            selected={player.id === selectedId}
            onSelect={() => onSelect(player.id)}
            onEdit={() => onEdit(player)}
          />
        ))}
      </div>
    </div>
  );
}
