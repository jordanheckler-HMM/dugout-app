import { useDroppable } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { LineupSlot, FieldPosition, Player, Position } from "@/types/player";
import { cn } from "@/lib/utils";
import { fitAtPosition } from "@/lib/chemistry";
import { X } from "lucide-react";
import { usePlayerSeasonStats } from "@/hooks/usePlayerSeasonStats";

interface LineupCardProps {
  lineup: LineupSlot[];
  players: Player[];
  fieldPositions: FieldPosition[];
  useDH: boolean;
  onRemove: (order: number) => void;
  onSelect: (playerId: string) => void;
}

function PlayerStatsDisplay({ playerId }: { playerId: string }) {
  const { stats, loading } = usePlayerSeasonStats(playerId);
  if (loading || !stats) return <span className="text-[11px] text-muted-foreground">No stats yet</span>;
  if (stats.hitting.ab && stats.hitting.ab > 0) {
    return (
      <span className="text-[11px] text-muted-foreground">
        {stats.hitting.avg !== undefined ? `AVG ${stats.hitting.avg.toFixed(3).replace(/^0/, "")}` : "Hitting"}
        {stats.hitting.hr !== undefined ? ` · HR ${stats.hitting.hr}` : ""}
        {stats.hitting.rbi !== undefined ? ` · RBI ${stats.hitting.rbi}` : ""}
      </span>
    );
  }
  if (stats.pitching.ip && stats.pitching.ip > 0) {
    return (
      <span className="text-[11px] text-muted-foreground">
        {stats.pitching.era !== undefined ? `ERA ${stats.pitching.era.toFixed(2)}` : "Pitching"}
        {stats.pitching.k !== undefined ? ` · K ${stats.pitching.k}` : ""}
      </span>
    );
  }
  return <span className="text-[11px] text-muted-foreground">No stats yet</span>;
}

function fitClass(fit: string) {
  if (fit === "primary") return "fit-primary";
  if (fit === "secondary") return "fit-secondary";
  if (fit === "dh-neutral") return "fit-dh";
  if (fit === "out-of-position") return "fit-out";
  return "fit-empty";
}

function LineupRow({
  slot,
  player,
  useDH,
  onRemove,
  onSelect,
}: {
  slot: LineupSlot;
  player: Player | null;
  useDH: boolean;
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
      className={cn("lineup-slot flex items-center gap-2 py-2 pl-3", player ? "pr-8" : "pr-3", sortable.isOver && "drag-over", !player && "lineup-slot-empty")}
      data-drop-id={`lineup:${slot.order}`}
      {...sortable.attributes}
    >
      <div className="order-badge">{slot.order}</div>
      <button
        type="button"
        className="flex-1 min-w-0 text-left"
        {...sortable.listeners}
        onClick={() => player && onSelect(player.id)}
      >
        {player ? (
          <span className="flex flex-col min-w-0">
            <span className="flex items-center gap-2 min-w-0">
              {player.number !== undefined && <span className="shrink-0 text-[11px] text-muted-foreground">#{player.number}</span>}
              <span className="min-w-0 flex-1 truncate text-[13px] font-semibold">{player.name}</span>
              {slot.position && <span className={cn("fit-badge shrink-0", fitClass(fit))}>{slot.position}</span>}
              <span className="min-w-0 truncate text-[11px] text-muted-foreground">B {player.bats} / T {player.throws}</span>
            </span>
            <PlayerStatsDisplay playerId={player.id} />
          </span>
        ) : (
          <span className="text-[13px] text-muted-foreground">
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

export function LineupCard({ lineup, players, fieldPositions, useDH, onRemove, onSelect }: LineupCardProps) {
  const bench = useDroppable({ id: "bench", data: { type: "bench" } });
  const pitcher = useDH ? fieldPositions.find((spot) => spot.position === "P") : undefined;
  const pitcherPlayer = pitcher?.playerId ? players.find((player) => player.id === pitcher.playerId) : undefined;

  return (
    <section className="surface-card flex flex-col min-h-0 h-full">
      <header className="px-3 py-2.5 border-b border-border flex items-center justify-between">
        <div>
          <h2 className="text-[14px] font-semibold">Batting order</h2>
          <p className="text-[12px] text-muted-foreground">
            {useDH ? "Nine batters. The pitcher does not hit." : "Nine batters, including the pitcher."}
          </p>
        </div>
      </header>
      <SortableContext items={lineup.map((slot) => `lineup:${slot.order}`)} strategy={verticalListSortingStrategy}>
        <div className="flex-1 overflow-auto">
          {lineup.map((slot) => (
            <LineupRow
              key={slot.order}
              slot={slot}
              player={slot.playerId ? players.find((player) => player.id === slot.playerId) ?? null : null}
              useDH={useDH}
              onRemove={onRemove}
              onSelect={onSelect}
            />
          ))}
        </div>
      </SortableContext>
      {useDH && (
        <div className="px-3 py-2 border-t border-border text-[12px]">
          <span className="section-label">On the mound</span>
          <p className="mt-1">{pitcherPlayer ? `${pitcherPlayer.name} is pitching and does not bat.` : "No pitcher assigned."}</p>
        </div>
      )}
      <div
        ref={bench.setNodeRef}
        data-drop-id="bench"
        className={cn("border-t border-border px-3 py-2", bench.isOver && "bg-accent/40")}
      >
        <p className="section-label">Bench</p>
        <p className="text-[12px] text-muted-foreground mt-1">Drop a player here to take them out of the lineup and off the field.</p>
      </div>
    </section>
  );
}
