import { useDroppable } from "@dnd-kit/core";
import { FieldPosition, Player, Position } from "@/types/player";
import { cn } from "@/lib/utils";
import { fitAtPosition } from "@/lib/chemistry";
import { X } from "lucide-react";

interface FieldDiagramProps {
  fieldPositions: FieldPosition[];
  players: Player[];
  useDH: boolean;
  onRemove: (position: Position) => void;
  onSelect: (playerId: string) => void;
}

function Spot({
  spot,
  player,
  onRemove,
  onSelect,
}: {
  spot: FieldPosition;
  player: Player | null;
  onRemove: (position: Position) => void;
  onSelect: (playerId: string) => void;
}) {
  const drop = useDroppable({
    id: `field:${spot.position}`,
    data: { type: "field", position: spot.position, playerId: spot.playerId },
  });
  const fit = fitAtPosition(player, spot.position);
  return (
    <div
      ref={drop.setNodeRef}
      data-drop-id={`field:${spot.position}`}
      className="absolute -translate-x-1/2 -translate-y-1/2 p-1"
      style={{ left: `${spot.x}%`, top: `${spot.y}%` }}
    >
      {player ? (
        <div className="field-player">
          <button type="button" className="field-player-hit" onClick={() => onSelect(player.id)}>
            <span className={cn("field-token", `fit-${fit === "out-of-position" ? "out" : fit === "dh-neutral" ? "dh" : fit}`)}>
              {player.number ?? player.name.slice(0, 1)}
            </span>
            <span className="field-name">{player.name.split(" ").slice(-1)[0]}</span>
          </button>
          <button
            type="button"
            className="icon-button field-remove"
            aria-label={`Remove ${player.name} from ${spot.position}`}
            onClick={() => onRemove(spot.position)}
          >
            <X />
          </button>
        </div>
      ) : (
        <div className={cn("field-empty", drop.isOver && "field-empty-over")}>{spot.position}</div>
      )}
    </div>
  );
}

export function FieldDiagram({ fieldPositions, players, useDH, onRemove, onSelect }: FieldDiagramProps) {
  const defensive = fieldPositions.filter((spot) => spot.position !== "DH");
  const dh = fieldPositions.find((spot) => spot.position === "DH");

  return (
    <div className="h-full flex flex-col gap-3 min-h-0">
      <div className="flex items-center justify-center gap-3 text-[12px]">
        <span className="inline-flex items-center gap-1.5"><i className="fit-dot fit-primary" /> Primary</span>
        <span className="inline-flex items-center gap-1.5"><i className="fit-dot fit-secondary" /> Secondary</span>
        <span className="inline-flex items-center gap-1.5"><i className="fit-dot fit-out" /> Out of position</span>
        {useDH && <span className="inline-flex items-center gap-1.5"><i className="fit-dot fit-dh" /> DH</span>}
      </div>
      <p className="text-center text-[12px] text-muted-foreground">
        {useDH ? "Nine batters plus a DH. The pitcher does not hit." : "No DH. The pitcher is in the batting order."}
      </p>
      <div className="relative flex-1 min-h-[280px]">
        <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full">
          <path d="M8 58 Q8 8 50 6 Q92 8 92 58 L72 78 L50 98 L28 78 Z" className="field-grass" />
          <path d="M28 78 L50 56 L72 78 L50 98 Z" className="field-dirt" />
          <path d="M50 98 L72 78 L50 56 L28 78 Z" fill="none" className="field-chalk" />
          <line x1="50" y1="98" x2="8" y2="58" className="field-chalk" />
          <line x1="50" y1="98" x2="92" y2="58" className="field-chalk" />
          <circle cx="50" cy="70" r="3.2" className="field-mound" />
          <rect x="48.6" y="96.2" width="2.8" height="2.8" fill="white" transform="rotate(45 50 97.6)" />
          <rect x="70.6" y="76.6" width="2.8" height="2.8" fill="white" transform="rotate(45 72 78)" />
          <rect x="48.6" y="54.6" width="2.8" height="2.8" fill="white" transform="rotate(45 50 56)" />
          <rect x="26.6" y="76.6" width="2.8" height="2.8" fill="white" transform="rotate(45 28 78)" />
        </svg>
        {defensive.map((spot) => (
          <Spot
            key={spot.position}
            spot={spot}
            player={spot.playerId ? players.find((player) => player.id === spot.playerId) ?? null : null}
            onRemove={onRemove}
            onSelect={onSelect}
          />
        ))}
      </div>
      {useDH && dh && (
        <div className="surface-card px-3 py-2 flex items-center gap-3">
          <div className="relative h-14 w-24 shrink-0">
            <Spot
              spot={{ ...dh, x: 28, y: 50 }}
              player={dh.playerId ? players.find((player) => player.id === dh.playerId) ?? null : null}
              onRemove={onRemove}
              onSelect={onSelect}
            />
          </div>
          <div>
            <p className="section-label">Designated hitter</p>
            <p className="text-[12px] text-muted-foreground mt-1">Hits for the pitcher. The pitcher stays on the mound and out of the order.</p>
          </div>
        </div>
      )}
    </div>
  );
}
