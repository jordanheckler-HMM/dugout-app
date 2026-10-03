import { X } from "lucide-react";
import { UpdateStatus } from "@/hooks/useAppUpdater";

interface UpdateBannerProps {
  status: UpdateStatus;
  onInstall: () => void;
  onDismiss: () => void;
  onRetry: () => void;
}

/**
 * Small update card anchored beside the sidebar.
 * One click still downloads, installs, and relaunches.
 */
export function UpdateBanner({ status, onInstall, onDismiss, onRetry }: UpdateBannerProps) {
  if (!status.available && !status.downloading && !status.error) return null;

  return (
    <div className="corner-card" role="status">
      <div className="corner-card-head">
        <span className="diamond-mark" aria-hidden />
        <strong>{status.downloading ? "Downloading" : status.available ? "Update available" : "Updater check failed"}</strong>
        {!status.downloading && (
          <button type="button" className="corner-dismiss" aria-label="Dismiss" onClick={onDismiss}>
            <X />
          </button>
        )}
      </div>

      {status.downloading ? (
        <div>
          <p className="corner-copy">Downloading update v{status.version}...</p>
          <div
            className="corner-meter"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={status.progress}
            aria-label="Download progress"
          >
            <div className="corner-meter-fill" style={{ width: `${status.progress}%` }} />
          </div>
        </div>
      ) : status.available ? (
        <div className="flex flex-col gap-3">
          <p className="corner-copy">Dugout v{status.version} is ready.</p>
          {status.error && <p className="corner-copy">{status.error}</p>}
          <button type="button" className="corner-action" onClick={onInstall}>
            Update
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="corner-copy">{status.error}</p>
          <button type="button" className="corner-action" onClick={onRetry}>
            Retry
          </button>
        </div>
      )}
    </div>
  );
}
