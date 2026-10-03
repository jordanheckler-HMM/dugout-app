import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Game, Player } from "@/types/player";
import { ChemistryReport } from "@/lib/chemistry";
import { gamesApi } from "@/api/client";
import { usePlayerSeasonStats } from "@/hooks/usePlayerSeasonStats";
import { primaryPositionsOf, secondaryPositionsOf, DEFENSIVE_POSITIONS } from "@/lib/positions";
import { AlignmentState } from "@/lib/alignment";

function SelectedPlayer({ player }: { player: Player | null }) {
  const { stats, loading } = usePlayerSeasonStats(player?.id);
  if (!player) {
    return (
      <section className="surface-card p-3">
        <p className="section-label">Selected player</p>
        <p className="empty-copy">Select a player to see the stats you have entered.</p>
      </section>
    );
  }
  const hitting = stats?.hitting;
  const pitching = stats?.pitching;
  const hasHitting = Boolean(hitting?.ab);
  const hasPitching = Boolean(pitching?.ip);
  return (
    <section className="surface-card p-3">
      <p className="section-label">Selected player</p>
      <h3 className="text-[15px] font-semibold mt-1">{player.name}</h3>
      <p className="text-[12px] text-muted-foreground">
        {primaryPositionsOf(player).join(" / ")} · Bats {player.bats} · Throws {player.throws}
      </p>
      {player.notes ? <p className="text-[12px] mt-2">{player.notes}</p> : null}
      {loading ? <p className="empty-copy">Loading stats…</p> : null}
      {!loading && !hasHitting && !hasPitching ? <p className="empty-copy">No stats entered for this player yet.</p> : null}
      {hasHitting && (
        <div className="stat-grid">
          <span>AVG {hitting?.avg?.toFixed(3).replace(/^0/, "") ?? "—"}</span>
          <span>HR {hitting?.hr ?? 0}</span>
          <span>RBI {hitting?.rbi ?? 0}</span>
          <span>OPS {hitting?.ops?.toFixed(3).replace(/^0/, "") ?? "—"}</span>
        </div>
      )}
      {hasPitching && (
        <div className="stat-grid">
          <span>ERA {pitching?.era?.toFixed(2) ?? "—"}</span>
          <span>K {pitching?.k ?? 0}</span>
          <span>WHIP {pitching?.whip?.toFixed(2) ?? "—"}</span>
          <span>IP {pitching?.ip ?? 0}</span>
        </div>
      )}
    </section>
  );
}

export function InsightColumn({
  players,
  alignment,
  report,
  selectedPlayer,
}: {
  players: Player[];
  alignment: AlignmentState;
  report: ChemistryReport;
  selectedPlayer: Player | null;
}) {
  const [games, setGames] = useState<Game[] | null>(null);
  const [gamesError, setGamesError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    gamesApi.getAll()
      .then((rows) => {
        if (cancelled) return;
        setGames(rows.map((game) => ({
          id: game.id,
          date: game.date,
          opponent: game.opponent,
          homeAway: game.home_away as "home" | "away",
          source: game.source === "schedule" ? "schedule" : "manual",
          status: game.status === "completed" ? "completed" : "scheduled",
          result: game.result as Game["result"],
          scoreUs: game.score_us,
          scoreThem: game.score_them,
        })));
      })
      .catch(() => {
        if (!cancelled) setGamesError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [alignment.lineup, alignment.fieldPositions]);

  const batters = alignment.lineup
    .map((slot) => players.find((player) => player.id === slot.playerId))
    .filter((player): player is Player => Boolean(player));
  const hands = { L: 0, R: 0, S: 0 };
  batters.forEach((player) => {
    hands[player.bats] += 1;
  });
  const active = players.filter((player) => player.status === "active");
  const completed = (games ?? []).filter((game) => game.status === "completed");
  const wins = completed.filter((game) => game.result === "W").length;
  const losses = completed.filter((game) => game.result === "L").length;
  const ties = completed.filter((game) => game.result === "T").length;
  const recent = [...(games ?? [])].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 4);

  return (
    <div className="h-full overflow-auto p-3 pr-10 space-y-3 bg-muted/30">
      <section className="surface-card p-3">
        <p className="section-label">Team</p>
        <h3 className="text-[15px] font-semibold mt-1">{active.length} active players</h3>
        <p className="text-[12px] text-muted-foreground">
          {batters.length}/9 in the order · {alignment.useDH ? "DH on" : "Pitcher hits"}
        </p>
        <p className="text-[13px] mt-2">
          {completed.length === 0 ? "No results yet" : `Record ${wins}-${losses}${ties ? `-${ties}` : ""}`}
        </p>
      </section>

      <section className="surface-card p-3">
        <p className="section-label">Chemistry breakdown</p>
        <ul className="mt-2 space-y-1 text-[12px]">
          <li className="flex justify-between"><span>Primary fits</span><strong>{report.breakdown.primary}</strong></li>
          <li className="flex justify-between"><span>Secondary fits</span><strong>{report.breakdown.secondary}</strong></li>
          <li className="flex justify-between"><span>DH, unlabeled</span><strong>{report.breakdown.dhNeutral}</strong></li>
          <li className="flex justify-between"><span>Open spots</span><strong>{report.breakdown.unassigned}</strong></li>
          <li className="flex justify-between"><span>Out of position</span><strong>{report.breakdown.outOfPosition}</strong></li>
        </ul>
        <p className="section-label mt-3">Best available lineup</p>
        {report.bestAssignment.every((slot) => !slot.playerId) ? (
          <p className="empty-copy">Add active players to compare the current alignment with the best one on the roster.</p>
        ) : (
          <ul className="mt-1 space-y-1 text-[12px]">
            {report.bestAssignment.map((slot) => {
              const name = players.find((player) => player.id === slot.playerId)?.name;
              return (
                <li key={slot.position} className="flex justify-between gap-2">
                  <span>{slot.position}</span>
                  <span className="truncate">{name ?? "Open"}</span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="surface-card p-3">
        <p className="section-label">Handedness</p>
        {batters.length === 0 ? <p className="empty-copy">Add batters to see the left, right, and switch balance.</p> : (
          <div className="mt-2 space-y-1.5">
            {(["L", "R", "S"] as const).map((hand) => (
              <div key={hand} className="flex items-center gap-2 text-[12px]">
                <span className="w-4">{hand}</span>
                <div className="meter-track flex-1">
                  <div className="meter-fill meter-mid" style={{ width: `${batters.length ? (hands[hand] / batters.length) * 100 : 0}%` }} />
                </div>
                <span className="w-4 text-right">{hands[hand]}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="surface-card p-3">
        <p className="section-label">Coverage</p>
        {active.length === 0 ? <p className="empty-copy">Add players to see who can cover each spot.</p> : (
          <ul className="mt-2 grid grid-cols-2 gap-1 text-[12px]">
            {DEFENSIVE_POSITIONS.map((position) => {
              const starters = active.filter((player) => primaryPositionsOf(player).includes(position)).length;
              const depth = active.filter((player) => secondaryPositionsOf(player).includes(position)).length;
              return (
                <li key={position} className="flex justify-between rounded-md bg-muted/50 px-2 py-1">
                  <span>{position}</span>
                  <span>{starters}{depth ? ` +${depth}` : ""}</span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <SelectedPlayer player={selectedPlayer} />

      <section className="surface-card p-3">
        <p className="section-label">Quick actions</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Link className="text-button" to="/lineup">Lineup card</Link>
          <Link className="text-button" to="/diamond">Diamond</Link>
          <Link className="text-button" to="/depth">Depth chart</Link>
          <Link className="text-button" to="/games">Schedule</Link>
        </div>
      </section>

      <section className="surface-card p-3">
        <p className="section-label">Recent games</p>
        {gamesError ? <p className="empty-copy">Games could not be loaded.</p> : null}
        {games && games.length === 0 ? <p className="empty-copy">No games scheduled yet.</p> : null}
        {games === null && !gamesError ? <p className="empty-copy">Loading games…</p> : null}
        <ul className="mt-2 space-y-1.5">
          {recent.map((game) => (
            <li key={game.id} className="text-[12px] flex justify-between gap-2">
              <span className="truncate">{game.date.slice(5)} vs {game.opponent}</span>
              <span className="text-muted-foreground">
                {game.status === "completed" && game.scoreUs !== undefined ? `${game.result ?? ""} ${game.scoreUs}-${game.scoreThem}` : "Scheduled"}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
