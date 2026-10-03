import { useEffect, useState } from "react";
import { Player } from "@/types/player";
import { BackendGame, BackendGameStats, gameStatsApi, gamesApi } from "@/api/client";
import { usePlayerSeasonStats } from "@/hooks/usePlayerSeasonStats";
import { primaryPositionsOf, secondaryPositionsOf } from "@/lib/positions";
import { showStatsFor, splitName } from "@/lib/showStats";
import { cn } from "@/lib/utils";

type Tab = "attributes" | "stats" | "games";

function cell(value: number | undefined, digits?: number) {
  if (value === undefined) return "—";
  if (digits === 3) return value.toFixed(3).replace(/^0/, "");
  if (digits === 2) return value.toFixed(2);
  return String(value);
}

export function PlayerDossier({ player }: { player: Player | null }) {
  const [tab, setTab] = useState<Tab>("attributes");
  const { stats, loading } = usePlayerSeasonStats(player?.id);
  const [games, setGames] = useState<BackendGame[] | null>(null);
  const [lines, setLines] = useState<BackendGameStats[] | null>(null);
  const [gamesError, setGamesError] = useState(false);
  const playerId = player?.id;

  useEffect(() => {
    if (!playerId) return;
    let cancelled = false;
    setGames(null);
    setLines(null);
    setGamesError(false);
    Promise.all([gamesApi.getAll(), gameStatsApi.getByPlayer(playerId)])
      .then(([nextGames, nextLines]) => {
        if (cancelled) return;
        setGames(nextGames);
        setLines(nextLines);
      })
      .catch(() => {
        if (!cancelled) setGamesError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [playerId]);

  if (!player) {
    return (
      <section className="show-dossier" aria-label="Player card">
        <p className="empty-copy">Select a player to open the card.</p>
      </section>
    );
  }

  const name = splitName(player.name);
  const summary = showStatsFor(player, stats);
  const bars = summary.filter((stat) => stat.bar !== undefined && stat.value !== "—");
  const hitting = stats?.hitting;
  const pitching = stats?.pitching;
  const fielding = stats?.fielding;
  const hasHitting = Boolean(hitting?.ab);
  const hasPitching = Boolean(pitching?.ip);
  const recent = [...(games ?? [])]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 8)
    .map((game) => ({ game, line: lines?.find((row) => row.game_id === game.id) }));

  return (
    <section className="show-dossier" aria-label="Player card">
      <div className="show-portrait" aria-label={player.number !== undefined ? `Jersey ${player.number}` : "No photo on file"}>
        <span className="show-portrait-num">{player.number ?? "—"}</span>
        <span className="show-portrait-name">{name.last}</span>
      </div>
      <div className="min-w-0">
        <dl className="show-bio">
          <div><dt>Pos</dt><dd>{primaryPositionsOf(player).join(" / ") || "—"}</dd></div>
          <div><dt>Also</dt><dd>{secondaryPositionsOf(player).join(" / ") || "—"}</dd></div>
          <div><dt>Bats</dt><dd>{player.bats}</dd></div>
          <div><dt>Throws</dt><dd>{player.throws}</dd></div>
          <div><dt>Status</dt><dd>{player.status}</dd></div>
          <div><dt>No.</dt><dd>{player.number ?? "—"}</dd></div>
        </dl>
        {player.notes ? <p className="show-notes">{player.notes}</p> : null}
        <div className="show-tabs" role="tablist" aria-label="Player card sections">
          {([
            ["attributes", "Attributes"],
            ["stats", "Stats"],
            ["games", "Recent games"],
          ] as const).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              className={cn("show-tab", tab === id && "is-selected")}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </div>
        {tab === "attributes" && (
          <div role="tabpanel">
            {loading ? <p className="empty-copy">Loading stats…</p> : null}
            {bars.length === 0 ? <p className="empty-copy">No rated stats on file.</p> : (
              <ul className="show-bars show-bars-wide">
                {bars.map((stat) => (
                  <li key={stat.label}>
                    <span>{stat.label}</span>
                    <span className={stat.bar !== undefined && stat.bar >= 0.3 ? "show-bar" : "show-bar is-gold"}>
                      <i style={{ width: `${(stat.bar ?? 0) * 100}%` }} />
                    </span>
                    <span>{stat.value}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        {tab === "stats" && (
          <div role="tabpanel" className="show-table-wrap">
            {loading ? <p className="empty-copy">Loading stats…</p> : null}
            {!loading && !hasHitting && !hasPitching ? <p className="empty-copy">No stats entered for this player yet.</p> : null}
            {hasHitting && (
              <table className="show-table">
                <caption>Hitting</caption>
                <thead>
                  <tr><th>AB</th><th>H</th><th>HR</th><th>RBI</th><th>AVG</th><th>OBP</th><th>SLG</th><th>OPS</th></tr>
                </thead>
                <tbody>
                  <tr>
                    <td>{cell(hitting?.ab)}</td>
                    <td>{cell(hitting?.h)}</td>
                    <td>{cell(hitting?.hr)}</td>
                    <td>{cell(hitting?.rbi)}</td>
                    <td>{cell(hitting?.avg, 3)}</td>
                    <td>{cell(hitting?.obp, 3)}</td>
                    <td>{cell(hitting?.slg, 3)}</td>
                    <td>{cell(hitting?.ops, 3)}</td>
                  </tr>
                </tbody>
              </table>
            )}
            {hasPitching && (
              <table className="show-table">
                <caption>Pitching</caption>
                <thead>
                  <tr><th>IP</th><th>SO</th><th>ERA</th><th>WHIP</th><th>BB</th></tr>
                </thead>
                <tbody>
                  <tr>
                    <td>{cell(pitching?.ip)}</td>
                    <td>{cell(pitching?.k)}</td>
                    <td>{cell(pitching?.era, 2)}</td>
                    <td>{cell(pitching?.whip, 2)}</td>
                    <td>{cell(pitching?.bb)}</td>
                  </tr>
                </tbody>
              </table>
            )}
            {(fielding?.po || fielding?.a || fielding?.e) ? (
              <table className="show-table">
                <caption>Fielding</caption>
                <thead>
                  <tr><th>PO</th><th>A</th><th>E</th><th>FLD%</th></tr>
                </thead>
                <tbody>
                  <tr>
                    <td>{cell(fielding?.po)}</td>
                    <td>{cell(fielding?.a)}</td>
                    <td>{cell(fielding?.e)}</td>
                    <td>{cell(fielding?.fpct, 3)}</td>
                  </tr>
                </tbody>
              </table>
            ) : null}
          </div>
        )}
        {tab === "games" && (
          <div role="tabpanel" className="show-table-wrap">
            {gamesError ? <p className="empty-copy">Games could not be loaded.</p> : null}
            {games === null && !gamesError ? <p className="empty-copy">Loading games…</p> : null}
            {games && games.length === 0 ? <p className="empty-copy">No games scheduled yet.</p> : null}
            {recent.length > 0 && (
              <table className="show-table">
                <caption>Recent games</caption>
                <thead>
                  <tr><th>Date</th><th>Opp</th><th>Result</th><th>Line</th></tr>
                </thead>
                <tbody>
                  {recent.map(({ game, line }) => (
                    <tr key={game.id}>
                      <td>{game.date.slice(5)}</td>
                      <td>{game.opponent}</td>
                      <td>
                        {game.status === "completed" && game.score_us !== undefined
                          ? `${game.result ?? ""} ${game.score_us}-${game.score_them ?? "—"}`
                          : "Scheduled"}
                      </td>
                      <td>{lineText(line)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function lineText(line: BackendGameStats | undefined) {
  if (!line) return "—";
  if (line.ab) return `${line.h ?? 0}-${line.ab}, HR ${line.hr ?? 0}`;
  if (line.ip) return `${line.ip} IP, SO ${line.k ?? 0}`;
  return "—";
}
