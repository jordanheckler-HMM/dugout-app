import { Download, X } from "lucide-react";
import { UpdateStatus } from "@/hooks/useAppUpdater";

interface UpdateBannerProps {
  status: UpdateStatus;
  onInstall: () => void;
  onDismiss: () => void;
  onRetry: () => void;
}

/**
 * Minimal update bubble beside the sidebar.
 * The icon installs on click or tap. Hover only reveals the label.
 */
export function UpdateBanner({ status, onInstall, onDismiss, onRetry }: UpdateBannerProps) {
  if (!status.available && !status.downloading && !status.error) return null;

  const version = status.version ? `v${status.version}` : null;

  return (
    <div className="corner-card update-bubble" role="status">
      {status.downloading ? (
        <div className="update-progress">
          {version && <p className="update-version">{version}</p>}
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
      ) : (
        <>
          {version && <p className="update-version">{version}</p>}
          {!version && status.error && <p className="update-version">{status.error}</p>}
          <button
            type="button"
            className="update-icon-button"
            aria-label={status.available ? "Update" : "Retry"}
            onClick={status.available ? onInstall : onRetry}
          >
            <Download />
            <span className="update-tooltip" role="tooltip">
              {status.available ? "Update" : "Retry"}
            </span>
          </button>
          <button type="button" className="corner-dismiss update-dismiss" aria-label="Dismiss" onClick={onDismiss}>
            <X />
          </button>
        </>
      )}
    </div>
  );
}
