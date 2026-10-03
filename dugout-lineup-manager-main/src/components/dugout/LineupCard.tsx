import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { LineupSlot, FieldPosition, Player } from "@/types/player";
import { cn } from "@/lib/utils";
import { fitAtPosition } from "@/lib/chemistry";
import { X } from "lucide-react";
import { usePlayerSeasonStats } from "@/hooks/usePlayerSeasonStats";
import { heroStat, showStatsFor } from "@/lib/showStats";

interface LineupCardProps {
  lineup: LineupSlot[];
  players: Player[];
  fieldPositions: FieldPosition[];
  useDH: boolean;
  selectedId?: string | null;
  onRemove: (order: number) => void;
  onSelect: (playerId: string) => void;
}

function fitClass(fit: string) {
  if (fit === "primary") return "fit-primary";
  if (fit === "secondary") return "fit-secondary";
  if (fit === "dh-neutral") return "fit-dh";
  if (fit === "out-of-position") return "fit-out";
  return "fit-empty";
}

function StatCell({ player }: { player: Player }) {
  const { stats } = usePlayerSeasonStats(player.id);
  const hero = heroStat(showStatsFor(player, stats));
  if (!hero) return <span>—</span>;
  return <span>{hero.value === "—" ? "—" : `${hero.label} ${hero.value}`}</span>;
}

function LineupRow({
  slot,
  player,
  useDH,
  selected,
  onRemove,
  onSelect,
}: {
  slot: LineupSlot;
  player: Player | null;
  useDH: boolean;
  selected: boolean;
  onRemove: (order: number) => void;
  onSelect: (playerId: string) => void;
}) {
  const sortable = useSortable({
    id: `lineup:${slot.order}`,
    data: { type: "lineup", order: slot.order, playerId: slot.playerId },
  });
  const fit = player && slot.position ? fitAtPosition(player, slot.position) : "unassigned";
  const isPitcherSlot = !useDH && slot.order === 9 && !player;

  return (
    <div
      ref={sortable.setNodeRef}
      style={{ transform: CSS.Transform.toString(sortable.transform), transition: sortable.transition }}
      className={cn("lineup-slot", sortable.isOver && "drag-over", !player && "lineup-slot-empty")}
      data-drop-id={`lineup:${slot.order}`}
    >
      <button
        type="button"
        className={cn("show-row", selected && "is-selected", !player && "show-row-empty")}
        {...sortable.attributes}
        {...sortable.listeners}
        onClick={() => player && onSelect(player.id)}
      >
        {player ? (
          <>
            <span className="show-player">
              <span className="show-order">{slot.order}.</span>
              <span className="show-name">{player.name}</span>
              {slot.position && <span className={cn("fit-badge show-role", fitClass(fit))}>{slot.position}</span>}
            </span>
            <span>{slot.position ?? "—"}</span>
            <span>{player.bats}</span>
            <StatCell player={player} />
          </>
        ) : (
          <span className="show-empty-msg">
            {isPitcherSlot ? "Pitcher bats here" : "Drop a player into this spot"}
          </span>
        )}
      </button>
      {player && (
        <button
          type="button"
          aria-label={`Remove ${player.name} from lineup`}
          className="icon-button lineup-remove"
          onClick={() => onRemove(slot.order)}
        >
          <X />
        </button>
      )}
    </div>
  );
}

export function LineupCard({
  lineup,
  players,
  fieldPositions,
  useDH,
  selectedId = null,
  onRemove,
  onSelect,
}: LineupCardProps) {
  const pitcher = useDH ? fieldPositions.find((spot) => spot.position === "P") : undefined;
  const pitcherPlayer = pitcher?.playerId ? players.find((player) => player.id === pitcher.playerId) : undefined;

  return (
    <section className="show-panel flex flex-col min-h-0 h-full">
      <header className="show-panel-head">
        <h2 className="show-section-title">Batting order</h2>
        <p className="show-section-note">
          {useDH ? "Nine batters. The pitcher does not hit." : "Nine batters, including the pitcher."}
        </p>
      </header>
      <div className="show-cols" aria-hidden="true">
        <span>Player</span>
        <span>Pos</span>
        <span>Bats</span>
        <span>Stat</span>
      </div>
      <SortableContext items={lineup.map((slot) => `lineup:${slot.order}`)} strategy={verticalListSortingStrategy}>
        <div className="flex-1 overflow-auto show-rows">
          {lineup.map((slot) => (
            <LineupRow
              key={slot.order}
              slot={slot}
              player={slot.playerId ? players.find((player) => player.id === slot.playerId) ?? null : null}
              useDH={useDH}
              selected={Boolean(slot.playerId && slot.playerId === selectedId)}
              onRemove={onRemove}
              onSelect={onSelect}
            />
          ))}
        </div>
      </SortableContext>
      {useDH && (
        <div className="px-3 py-2 border-t border-[hsl(45_35%_40%/0.35)] text-[12px]">
          <span className="section-label">On the mound</span>
          <p className="mt-1">{pitcherPlayer ? `${pitcherPlayer.name} is pitching and does not bat.` : "No pitcher assigned."}</p>
        </div>
      )}
    </section>
  );
}
