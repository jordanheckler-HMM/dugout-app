import { Player, SeasonStats } from "@/types/player";
import { primaryPositionsOf } from "@/lib/positions";

export interface ShowStat {
  label: string;
  value: string;
  /** Width of a mini bar, only for rate stats already stored between 0 and 1. */
  bar?: number;
}

const PITCHING_LABELS = new Set(["IP", "SO", "ERA", "WHIP"]);

export function splitName(name: string): { first: string; last: string } {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first: "", last: "" };
  if (parts.length === 1) return { first: "", last: parts[0] };
  return { first: parts.slice(0, -1).join(" "), last: parts[parts.length - 1] };
}

function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function average(value: number): string {
  return value.toFixed(3).replace(/^0/, "");
}

function fromSeason(season: SeasonStats | null): ShowStat[] {
  if (!season) return [];
  const rows: ShowStat[] = [];
  const hitting = season.hitting;
  const pitching = season.pitching;
  if (pitching?.ip && pitching.ip > 0) {
    rows.push({ label: "IP", value: String(pitching.ip) });
    rows.push({ label: "SO", value: pitching.k !== undefined ? String(pitching.k) : "—" });
    rows.push({ label: "ERA", value: pitching.era !== undefined ? pitching.era.toFixed(2) : "—" });
    if (pitching.whip !== undefined) rows.push({ label: "WHIP", value: pitching.whip.toFixed(2) });
  }
  if (hitting?.ab && hitting.ab > 0) {
    rows.push(hitting.avg !== undefined
      ? { label: "AVG", value: average(hitting.avg), bar: clamp01(hitting.avg) }
      : { label: "AVG", value: "—" });
    rows.push({ label: "HR", value: hitting.hr !== undefined ? String(hitting.hr) : "—" });
    rows.push({ label: "RBI", value: hitting.rbi !== undefined ? String(hitting.rbi) : "—" });
    if (hitting.obp !== undefined) rows.push({ label: "OBP", value: average(hitting.obp), bar: clamp01(hitting.obp) });
    if (hitting.slg !== undefined) rows.push({ label: "SLG", value: average(hitting.slg), bar: clamp01(hitting.slg) });
  }
  return rows;
}

function fromProfile(player: Player): ShowStat[] {
  const stats = player.stats ?? {};
  const rows: ShowStat[] = [];
  if (stats.k !== undefined) rows.push({ label: "SO", value: String(stats.k) });
  if (stats.era !== undefined) rows.push({ label: "ERA", value: stats.era.toFixed(2) });
  if (stats.whip !== undefined) rows.push({ label: "WHIP", value: stats.whip.toFixed(2) });
  if (stats.avg !== undefined) rows.push({ label: "AVG", value: average(stats.avg), bar: clamp01(stats.avg) });
  if (stats.hr !== undefined) rows.push({ label: "HR", value: String(stats.hr) });
  if (stats.rbi !== undefined) rows.push({ label: "RBI", value: String(stats.rbi) });
  if (stats.obp !== undefined) rows.push({ label: "OBP", value: average(stats.obp), bar: clamp01(stats.obp) });
  if (stats.slg !== undefined) rows.push({ label: "SLG", value: average(stats.slg), bar: clamp01(stats.slg) });
  return rows;
}

function placeholders(player: Player): ShowStat[] {
  if (primaryPositionsOf(player).includes("P")) {
    return [
      { label: "IP", value: "—" },
      { label: "SO", value: "—" },
      { label: "ERA", value: "—" },
    ];
  }
  return [
    { label: "AVG", value: "—" },
    { label: "HR", value: "—" },
    { label: "RBI", value: "—" },
  ];
}

export function showStatsFor(player: Player, season: SeasonStats | null): ShowStat[] {
  const seasonRows = fromSeason(season);
  const rows = seasonRows.length > 0 ? seasonRows : fromProfile(player);
  if (rows.length === 0) return placeholders(player);
  const pitchingFirst = primaryPositionsOf(player)[0] === "P";
  const ordered = pitchingFirst
    ? [...rows.filter((row) => PITCHING_LABELS.has(row.label)), ...rows.filter((row) => !PITCHING_LABELS.has(row.label))]
    : [...rows.filter((row) => !PITCHING_LABELS.has(row.label)), ...rows.filter((row) => PITCHING_LABELS.has(row.label))];
  return ordered.slice(0, 5);
}

export function heroStat(stats: ShowStat[]): ShowStat | null {
  return stats.find((stat) => stat.label === "AVG" || stat.label === "ERA") ?? stats[0] ?? null;
}
