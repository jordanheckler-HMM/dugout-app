import { UpdateStatus } from '@/hooks/useAppUpdater';

interface UpdateBannerProps {
    status: UpdateStatus;
    onInstall: () => void;
    onDismiss: () => void;
}

/**
 * A non-intrusive banner shown at the top of the app when an update is available.
 * Shows download progress when the user clicks "Update Now".
 */
export function UpdateBanner({ status, onInstall, onDismiss }: UpdateBannerProps) {
    // Don't show anything if no update is available
    if (!status.available && !status.downloading) return null;

    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                zIndex: 9999,
                background: 'linear-gradient(135deg, #1a5fb4 0%, #26a269 100%)',
                color: 'white',
                padding: '10px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '16px',
                fontSize: '14px',
                fontFamily: 'system-ui, -apple-system, sans-serif',
                boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                {/* Icon */}
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M10 2L10 14M10 14L6 10M10 14L14 10" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M3 15V16C3 16.5523 3.44772 17 4 17H16C16.5523 17 17 16.5523 17 16V15" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>

                {/* Message */}
                {status.downloading ? (
                    <div style={{ flex: 1 }}>
                        <span>Downloading update v{status.version}...</span>
                        <div
                            style={{
                                width: '100%',
                                maxWidth: '300px',
                                height: '4px',
                                background: 'rgba(255,255,255,0.3)',
                                borderRadius: '2px',
                                marginTop: '4px',
                                overflow: 'hidden',
                            }}
                        >
                            <div
                                style={{
                                    height: '100%',
                                    width: `${status.progress}%`,
                                    background: 'white',
                                    borderRadius: '2px',
                                    transition: 'width 0.3s ease',
                                }}
                            />
                        </div>
                    </div>
                ) : (
                    <span>
                        <strong>Dugout v{status.version}</strong> is available!
                        {status.notes && (
                            <span style={{ opacity: 0.85, marginLeft: '8px' }}>
                                — {status.notes.length > 80 ? status.notes.substring(0, 80) + '...' : status.notes}
                            </span>
                        )}
                    </span>
                )}
            </div>

            {/* Actions */}
            {!status.downloading && (
                <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                    <button
                        onClick={onInstall}
                        style={{
                            background: 'white',
                            color: '#1a5fb4',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '6px 16px',
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'opacity 0.2s',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.9')}
                        onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
                    >
                        Update Now
                    </button>
                    <button
                        onClick={onDismiss}
                        style={{
                            background: 'rgba(255,255,255,0.2)',
                            color: 'white',
                            border: '1px solid rgba(255,255,255,0.3)',
                            borderRadius: '6px',
                            padding: '6px 12px',
                            fontSize: '13px',
                            cursor: 'pointer',
                            transition: 'opacity 0.2s',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.8')}
                        onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
                    >
                        Later
                    </button>
                </div>
            )}

            {/* Error display */}
            {status.error && (
                <span style={{ color: '#ffa0a0', fontSize: '12px' }}>{status.error}</span>
            )}
        </div>
    );
}
