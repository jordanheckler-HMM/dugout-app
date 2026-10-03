import { ChemistryReport } from "@/lib/chemistry";

export function ChemistryMeter({ report }: { report: ChemistryReport }) {
  const tone = report.score >= 85 ? "meter-good" : report.score >= 65 ? "meter-mid" : "meter-low";
  return (
    <section className="chemistry-meter" aria-label="Lineup chemistry">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="section-label">Chemistry</p>
          <p className="text-[12px] text-muted-foreground">Live fit for this alignment</p>
        </div>
        <p className="chemistry-score" data-testid="chemistry-score">{report.score}</p>
      </div>
      <div className="meter-track" aria-hidden>
        <div className={`meter-fill ${tone}`} style={{ width: `${report.score}%` }} />
      </div>
      <div className="grid grid-cols-3 gap-2 text-[12px]">
        <div className="stat-pill">
          <span className="text-muted-foreground">Now</span>
          <strong>{report.score}</strong>
        </div>
        <div className="stat-pill">
          <span className="text-muted-foreground">All primary</span>
          <strong>{report.allPrimaryIdeal}</strong>
        </div>
        <div className="stat-pill">
          <span className="text-muted-foreground">Best available</span>
          <strong>{report.bestAvailable}</strong>
        </div>
      </div>
    </section>
  );
}
