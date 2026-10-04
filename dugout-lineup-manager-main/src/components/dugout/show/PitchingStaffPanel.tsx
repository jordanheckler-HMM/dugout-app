import { FieldPosition, Player } from "@/types/player";
import { primaryPositionsOf, secondaryPositionsOf } from "@/lib/positions";
import { cn } from "@/lib/utils";

export function PitchingStaffPanel({
  players,
  fieldPositions,
  selectedId,
  onSelect,
}: {
  players: Player[];
  fieldPositions: FieldPosition[];
  selectedId: string | null;
  onSelect: (playerId: string) => void;
}) {
  const starterId = fieldPositions.find((spot) => spot.position === "P")?.playerId;
  const pitchers = players.filter((player) => player.status === "active"
    && (primaryPositionsOf(player).includes("P") || secondaryPositionsOf(player).includes("P")));
  const starter = players.find((player) => player.id === starterId && player.status === "active");
  const bullpen = pitchers.filter((player) => player.id !== starter?.id);

  const rows = (list: Player[], role: string) => list.map((player) => (
    <button
      key={player.id}
      type="button"
      className={cn("show-row", selectedId === player.id && "is-selected")}
      onClick={() => onSelect(player.id)}
    >
      <span className="show-player">
        <span className="show-name">{player.name}</span>
        <span className="fit-badge fit-primary show-role">{role}</span>
      </span>
      <span>{role === "SP" ? "P" : secondaryPositionsOf(player).includes("P") ? "P" : primaryPositionsOf(player)[0]}</span>
      <span>{player.throws}</span>
      <span>{player.stats.era !== undefined ? `ERA ${player.stats.era.toFixed(2)}` : "—"}</span>
    </button>
  ));

  return (
    <section className="show-panel pitching-panel" aria-label="Pitching staff">
      <header className="show-panel-head"><h3 className="show-section-title">Pitching staff</h3></header>
      <div className="show-cols pitching-cols" aria-hidden="true">
        <span>Pitcher</span><span>Pos</span><span>Hand</span><span>Stat</span>
      </div>
      <div className="show-rows pitching-rows">
        <p className="show-group-label">Starting rotation</p>
        {starter ? rows([starter], "SP") : <p className="empty-copy px-3 py-2">Assign a pitcher to the mound.</p>}
        <p className="show-group-label">Bullpen</p>
        {bullpen.length ? rows(bullpen, "RP") : <p className="empty-copy px-3 py-2">No other pitchers listed.</p>}
      </div>
    </section>
  );
}
