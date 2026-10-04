import { useMemo, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCorners,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { Player, Position } from "@/types/player";
import { usePlayers } from "@/hooks/usePlayers";
import { useGameConfig } from "@/hooks/useGameConfig";
import { PlayersSidebar } from "./PlayersSidebar";
import { LineupCard } from "./LineupCard";
import { FieldDiagram } from "./FieldDiagram";
import { RosterView } from "./RosterView";
import { DepthChart } from "./DepthChart";
import { ChemistryMeter } from "./ChemistryMeter";
import { InsightColumn } from "./InsightColumn";
import { Dock } from "@/components/shell/Dock";
import { PlayerEditDrawer } from "./PlayerEditDrawer";
import { ShowHeader } from "./show/ShowHeader";
import { BenchPanel } from "./show/BenchPanel";
import { HintBar } from "./show/HintBar";
import { PitchingStaffPanel } from "./show/PitchingStaffPanel";
import { rateChemistry } from "@/lib/chemistry";
import { placeInLineup, placeOnField, reorderLineup as previewReorder } from "@/lib/alignment";
import { primaryPositionsOf, secondaryPositionsOf, withPositionLists } from "@/lib/positions";
import { AlignmentState } from "@/lib/alignment";
import { PanelMemory, readPanels, writePanels } from "@/lib/panelState";
import { useEffect } from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FolderOpen, RotateCcw, Save, Trash2 } from "lucide-react";

function viewFromPath(pathname: string) {
  if (pathname.startsWith("/depth")) return "depth";
  if (pathname.startsWith("/lineup")) return "lineup";
  if (pathname.startsWith("/diamond")) return "diamond";
  return "squad";
}

export function DugoutLayout() {
  const location = useLocation();
  const view = viewFromPath(location.pathname);
  const { players, addPlayer, updatePlayer, removePlayer } = usePlayers();
  const game = useGameConfig(players);
  const [panels, setPanels] = useState<PanelMemory>(() => readPanels());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [preview, setPreview] = useState<AlignmentState | null>(null);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [adding, setAdding] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [loadOpen, setLoadOpen] = useState(false);
  const [configName, setConfigName] = useState("");

  const patchPanels = (patch: Partial<PanelMemory>) => {
    setPanels((current) => {
      const next = { ...current, ...patch };
      writePanels(next);
      return next;
    });
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      if (!(event.metaKey || event.ctrlKey) || event.key !== "\\") return;
      event.preventDefault();
      if (event.shiftKey) patchPanels({ insightsCollapsed: !readPanels().insightsCollapsed });
      else patchPanels({ playersCollapsed: !readPanels().playersCollapsed });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 160, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const alignment = useMemo<AlignmentState>(() => ({
    useDH: game.useDH,
    lineup: game.lineup,
    fieldPositions: game.fieldPositions,
  }), [game.useDH, game.lineup, game.fieldPositions]);

  const shown = preview ?? alignment;
  const report = useMemo(
    () => rateChemistry(shown.fieldPositions, players, shown.useDH),
    [shown.fieldPositions, shown.useDH, players],
  );

  const findPlayer = (id: string | null) => players.find((player) => player.id === id) ?? null;

  const playerIdFrom = (event: DragOverEvent | DragEndEvent) => {
    const data = event.active.data.current as { type?: string; playerId?: string; order?: number } | undefined;
    if (data?.playerId) return { data, playerId: data.playerId };
    const id = String(event.active.id);
    if (id.startsWith("player:")) return { data, playerId: id.slice(7) };
    return { data, playerId: null as string | null };
  };

  const previewDrop = (event: DragOverEvent): AlignmentState | null => {
    const overId = event.over ? String(event.over.id) : null;
    if (!overId) return null;
    const { data, playerId } = playerIdFrom(event);
    if (!playerId) return null;
    if (overId.startsWith("field:")) return placeOnField(alignment, playerId, overId.slice(6) as Position);
    if (overId.startsWith("lineup:")) {
      const order = Number(overId.slice(7));
      if (data?.type === "lineup" && data.order) return previewReorder(alignment, data.order, order);
      return placeInLineup(alignment, playerId, order, players);
    }
    return null;
  };

  const onDragStart = (event: DragStartEvent) => setActiveId(String(event.active.id));

  const onDragEnd = async (event: DragEndEvent) => {
    setActiveId(null);
    setPreview(null);
    const overId = event.over ? String(event.over.id) : null;
    if (!overId) return;
    const data = event.active.data.current as { type?: string; playerId?: string; order?: number } | undefined;
    const playerId = data?.playerId
      ?? (String(event.active.id).startsWith("player:") ? String(event.active.id).slice(7) : null);
    if (!playerId) return;

    if (overId.startsWith("lineup:")) {
      const order = Number(overId.slice("lineup:".length));
      if (data?.type === "lineup" && data.order) await game.reorderLineup(data.order, order);
      else await game.assignToLineup(playerId, order, null, players);
      return;
    }
    if (overId.startsWith("field:")) {
      await game.assignToField(playerId, overId.slice("field:".length) as Position);
      return;
    }
    if (overId === "bench") {
      await game.addToBench(playerId);
      return;
    }
    if (overId.startsWith("depth:")) {
      const position = overId.slice("depth:".length) as Position;
      const player = findPlayer(playerId);
      if (!player) return;
      const primaries = primaryPositionsOf(player).filter((item) => item !== position);
      const nextPrimaries = [position, ...primaries];
      const nextSecondaries = secondaryPositionsOf(player).filter((item) => item !== position);
      await updatePlayer(player.id, withPositionLists({
        ...player,
        primaryPosition: nextPrimaries[0],
        primaryPositions: nextPrimaries,
        secondaryPositions: nextSecondaries,
      }));
      toast.success(`${player.name} now lists ${position} as a primary`);
    }
  };

  const activePlayerId = activeId?.startsWith("player:")
    ? activeId.slice(7)
    : (game.lineup.find((slot) => `lineup:${slot.order}` === activeId)?.playerId ?? null);
  const activePlayer = findPlayer(activePlayerId);

  const showBoard = view === "lineup" || view === "diamond";
  const displayedPlayer = findPlayer(selectedId) ?? players.find((player) => player.status !== "archived") ?? null;
  const highlightId = displayedPlayer?.id ?? null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragOver={(event) => setPreview(previewDrop(event))}
      onDragEnd={(event) => void onDragEnd(event)}
      onDragCancel={() => {
        setActiveId(null);
        setPreview(null);
      }}
    >
      <div className="broadcast flex h-full min-h-0">
        <Dock
          title="Players"
          side="left"
          width={panels.playersWidth}
          collapsed={panels.playersCollapsed}
          min={220}
          max={420}
          onWidth={(playersWidth) => patchPanels({ playersWidth })}
          onToggle={() => patchPanels({ playersCollapsed: !panels.playersCollapsed })}
          toggleLabel={panels.playersCollapsed ? "Expand players panel" : "Collapse players panel"}
        >
          <PlayersSidebar
            players={players}
            lineup={game.lineup}
            fieldPositions={game.fieldPositions}
            onAddPlayer={addPlayer}
            onUpdatePlayer={updatePlayer}
            onRemovePlayer={removePlayer}
            onSelect={setSelectedId}
          />
        </Dock>

        <div className="broadcast-stage flex-1 min-w-0 min-h-0 flex flex-col">
          <ShowHeader player={displayedPlayer} />
          {view === "squad" && (
            <RosterView
              players={players}
              selectedId={highlightId}
              onSelect={setSelectedId}
              onEdit={setEditingPlayer}
              onAdd={() => setAdding(true)}
            />
          )}
          {view === "depth" && (
            <DepthChart players={players} selectedId={highlightId} onSelect={setSelectedId} />
          )}
          {showBoard && (
            <div className="flex flex-col flex-1 min-h-0 px-3 gap-3">
              <div className="show-toolbar flex flex-wrap items-center justify-between gap-3">
                <ChemistryMeter report={report} />
                <div className="show-tools flex flex-wrap items-center gap-2">
                  <Switch id="dh-mode" checked={game.useDH} onCheckedChange={() => void game.toggleDH()} />
                  <Label htmlFor="dh-mode" className="text-[12px]">DH {game.useDH ? "on" : "off"}</Label>
                  <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
                    <DialogTrigger asChild>
                      <Button type="button" size="sm" variant="outline" aria-label="Save configuration"><Save /> Save</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle>Save lineup</DialogTitle></DialogHeader>
                      <Input value={configName} onChange={(event) => setConfigName(event.target.value)} placeholder="Friday starter" />
                      <Button
                        type="button"
                        disabled={!configName.trim()}
                        onClick={() => {
                          void game.saveConfiguration(configName.trim());
                          setConfigName("");
                          setSaveOpen(false);
                        }}
                      >
                        Save
                      </Button>
                    </DialogContent>
                  </Dialog>
                  {game.savedConfigs.length > 0 && (
                    <Dialog open={loadOpen} onOpenChange={setLoadOpen}>
                      <DialogTrigger asChild>
                        <Button type="button" size="sm" variant="outline" aria-label="Load configuration"><FolderOpen /> Load</Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader><DialogTitle>Saved lineups</DialogTitle></DialogHeader>
                        <div className="space-y-2">
                          {game.savedConfigs.map((config) => (
                            <div key={config.id} className="flex items-center gap-2">
                              <button type="button" className="text-button flex-1 text-left" onClick={() => { setLoadOpen(false); void game.loadConfiguration(config.id); }}>
                                {config.name} · {config.useDH ? "DH" : "No DH"}
                              </button>
                              <button type="button" aria-label={`Delete ${config.name} configuration`} className="icon-button" onClick={() => void game.deleteConfiguration(config.id)}>
                                <Trash2 />
                              </button>
                            </div>
                          ))}
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                  <Button type="button" size="sm" variant="ghost" aria-label="Clear lineup and field" onClick={() => void game.clearLineup()}>
                    <RotateCcw /> Clear
                  </Button>
                </div>
              </div>
              <div className="show-panels flex-1 min-h-0">
                {view === "lineup" ? (
                  <>
                    <LineupCard
                      lineup={shown.lineup}
                      players={players}
                      fieldPositions={shown.fieldPositions}
                      useDH={shown.useDH}
                      selectedId={highlightId}
                      onRemove={(order) => void game.removeFromLineup(order)}
                      onSelect={setSelectedId}
                    />
                    <div className="show-side">
                      <BenchPanel
                        players={players}
                        lineup={shown.lineup}
                        fieldPositions={shown.fieldPositions}
                        selectedId={highlightId}
                        onSelect={setSelectedId}
                      />
                      <PitchingStaffPanel
                        players={players}
                        fieldPositions={shown.fieldPositions}
                        selectedId={highlightId}
                        onSelect={setSelectedId}
                      />
                      <div className="show-panel show-field-panel p-2 min-h-[200px] overflow-hidden">
                        <FieldDiagram
                          fieldPositions={shown.fieldPositions}
                          players={players}
                          useDH={shown.useDH}
                          selectedId={highlightId}
                          onRemove={(position) => void game.removeFromField(position)}
                          onSelect={setSelectedId}
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="show-panel show-field-panel p-3 min-h-[280px] overflow-hidden">
                      <FieldDiagram
                        fieldPositions={shown.fieldPositions}
                        players={players}
                        useDH={shown.useDH}
                        selectedId={highlightId}
                        onRemove={(position) => void game.removeFromField(position)}
                        onSelect={setSelectedId}
                      />
                    </div>
                    <div className="show-side">
                      <LineupCard
                        lineup={shown.lineup}
                        players={players}
                        fieldPositions={shown.fieldPositions}
                        useDH={shown.useDH}
                        selectedId={highlightId}
                        onRemove={(order) => void game.removeFromLineup(order)}
                        onSelect={setSelectedId}
                      />
                      <BenchPanel
                        players={players}
                        lineup={shown.lineup}
                        fieldPositions={shown.fieldPositions}
                        selectedId={highlightId}
                        onSelect={setSelectedId}
                      />
                      <PitchingStaffPanel
                        players={players}
                        fieldPositions={shown.fieldPositions}
                        selectedId={highlightId}
                        onSelect={setSelectedId}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
          <HintBar />
        </div>

        <Dock
          title="Board"
          side="right"
          width={panels.insightsWidth}
          collapsed={panels.insightsCollapsed}
          min={260}
          max={460}
          onWidth={(insightsWidth) => patchPanels({ insightsWidth })}
          onToggle={() => patchPanels({ insightsCollapsed: !panels.insightsCollapsed })}
          toggleLabel={panels.insightsCollapsed ? "Expand board panel" : "Collapse board panel"}
        >
          <InsightColumn
            players={players}
            alignment={alignment}
            report={report}
            selectedPlayer={displayedPlayer}
          />
        </Dock>
      </div>
      <Outlet />
      <DragOverlay dropAnimation={{ duration: 180, easing: "cubic-bezier(0.2, 0, 0, 1)" }}>
        {activePlayer ? (
          <div className="drag-chip">
            <strong>{activePlayer.number ? `#${activePlayer.number} ` : ""}{activePlayer.name}</strong>
            <span>{primaryPositionsOf(activePlayer).join(" / ")}</span>
          </div>
        ) : null}
      </DragOverlay>
      <PlayerEditDrawer
        player={editingPlayer}
        isOpen={adding || Boolean(editingPlayer)}
        allPlayers={players}
        onClose={() => {
          setAdding(false);
          setEditingPlayer(null);
        }}
        onSave={async (data) => {
          if (editingPlayer) await updatePlayer(editingPlayer.id, data);
          else await addPlayer(data as Omit<Player, "id">);
          setAdding(false);
          setEditingPlayer(null);
        }}
        onRemove={editingPlayer ? async () => {
          await removePlayer(editingPlayer.id);
          setEditingPlayer(null);
        } : undefined}
      />
    </DndContext>
  );
}
