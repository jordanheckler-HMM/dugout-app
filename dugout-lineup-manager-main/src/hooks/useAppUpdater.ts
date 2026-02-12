import { useEffect, useState, useCallback, useRef } from 'react';
import { check, Update } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';

export interface UpdateStatus {
    checking: boolean;
    available: boolean;
    downloading: boolean;
    progress: number; // 0-100
    version?: string;
    notes?: string;
    error?: string;
}

/**
 * Hook to check for app updates on startup and provide update controls.
 * Uses the Tauri updater plugin to check GitHub Releases for new versions.
 */
export function useAppUpdater() {
    const [status, setStatus] = useState<UpdateStatus>({
        checking: false,
        available: false,
        downloading: false,
        progress: 0,
    });
    const updateRef = useRef<Update | null>(null);
    const hasChecked = useRef(false);

    /**
     * Check for available updates
     */
    const checkForUpdate = useCallback(async () => {
        try {
            setStatus((prev) => ({ ...prev, checking: true, error: undefined }));

            const update = await check();

            if (update) {
                updateRef.current = update;
                setStatus({
                    checking: false,
                    available: true,
                    downloading: false,
                    progress: 0,
                    version: update.version,
                    notes: update.body ?? undefined,
                });
                console.log(`[Updater] Update available: v${update.version}`);
            } else {
                setStatus({
                    checking: false,
                    available: false,
                    downloading: false,
                    progress: 0,
                });
                console.log('[Updater] No updates available');
            }
        } catch (err) {
            console.warn('[Updater] Failed to check for updates:', err);
            setStatus({
                checking: false,
                available: false,
                downloading: false,
                progress: 0,
                error: err instanceof Error ? err.message : 'Failed to check for updates',
            });
        }
    }, []);

    /**
     * Download and install the available update, then relaunch
     */
    const installUpdate = useCallback(async () => {
        const update = updateRef.current;
        if (!update) return;

        try {
            setStatus((prev) => ({ ...prev, downloading: true, progress: 0, error: undefined }));

            let downloaded = 0;
            let contentLength = 0;

            await update.downloadAndInstall((event) => {
                switch (event.event) {
                    case 'Started':
                        contentLength = event.data.contentLength ?? 0;
                        console.log(`[Updater] Downloading ${contentLength} bytes`);
                        break;
                    case 'Progress': {
                        downloaded += event.data.chunkLength;
                        const pct = contentLength > 0 ? Math.round((downloaded / contentLength) * 100) : 0;
                        setStatus((prev) => ({ ...prev, progress: pct }));
                        break;
                    }
                    case 'Finished':
                        setStatus((prev) => ({ ...prev, progress: 100 }));
                        console.log('[Updater] Download complete');
                        break;
                }
            });

            console.log('[Updater] Update installed, relaunching...');
            await relaunch();
        } catch (err) {
            console.error('[Updater] Failed to install update:', err);
            setStatus((prev) => ({
                ...prev,
                downloading: false,
                error: err instanceof Error ? err.message : 'Failed to install update',
            }));
        }
    }, []);

    /**
     * Dismiss the update notification
     */
    const dismissUpdate = useCallback(() => {
        setStatus({
            checking: false,
            available: false,
            downloading: false,
            progress: 0,
        });
        updateRef.current = null;
    }, []);

    // Auto-check on mount (once)
    useEffect(() => {
        if (hasChecked.current) return;
        hasChecked.current = true;

        // Slight delay so the app loads before we hit the network
        const timer = setTimeout(() => {
            checkForUpdate();
        }, 3000);

        return () => clearTimeout(timer);
    }, [checkForUpdate]);

    return {
        status,
        checkForUpdate,
        installUpdate,
        dismissUpdate,
    };
}
