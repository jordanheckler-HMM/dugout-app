import { Player } from "@/types/player";
import { usePlayerSeasonStats } from "@/hooks/usePlayerSeasonStats";
import { primaryPositionsOf } from "@/lib/positions";
import { heroStat, ShowStat, showStatsFor, splitName } from "@/lib/showStats";

function Overview({ stats }: { stats: ShowStat[] }) {
  const hero = heroStat(stats);
  const bars = stats.filter((stat) => stat.bar !== undefined && stat.value !== "—");
  return (
    <aside className="show-overview" aria-label="Overview">
      <p className="show-section-title">Overview</p>
      <p className="show-hero">{hero?.value ?? "—"}</p>
      <p className="show-hero-label">{hero?.label ?? "Stat"}</p>
      {bars.length > 0 && (
        <ul className="show-bars">
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
    </aside>
  );
}

export function ShowHeader({ player }: { player: Player | null }) {
  const { stats: season } = usePlayerSeasonStats(player?.id);
  const summary = player ? showStatsFor(player, season) : [];
  const name = player ? splitName(player.name) : { first: "Dugout", last: "Roster" };
  const positions = player ? primaryPositionsOf(player) : [];

  return (
    <header className="show-header">
      <div className="show-identity">
        {name.first ? <p className="show-firstname">{name.first}</p> : <p className="show-firstname">Player</p>}
        <h2 className="show-lastname">{name.last || "Roster"}</h2>
        <div className="show-badges">
          {player ? (
            <>
              {positions.map((position) => (
                <span key={position} className="show-badge">{position}</span>
              ))}
              <span className="show-badge">Bats {player.bats}</span>
              <span className="show-badge">Throws {player.throws}</span>
              <span className="show-badge">#{player.number ?? "—"}</span>
            </>
          ) : (
            <span className="show-badge">No player selected</span>
          )}
        </div>
        {summary.length > 0 && (
          <dl className="show-statline">
            {summary.map((stat) => (
              <div key={stat.label}>
                <dt>{stat.label}</dt>
                <dd>{stat.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
      <Overview stats={summary} />
    </header>
  );
}
