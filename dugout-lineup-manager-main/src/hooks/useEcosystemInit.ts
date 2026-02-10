import { useEffect, useRef } from 'react';
import { useAIStore } from '@/store/aiStore';

/**
 * Hook to initialize the ecosystem directory structure on app startup.
 * Should be called once at the app root level.
 */
export function useEcosystemInit() {
    const initializeEcosystem = useAIStore((state) => state.initializeEcosystem);
    const ecosystemInitialized = useAIStore((state) => state.ecosystemInitialized);
    const hasInitialized = useRef(false);

    useEffect(() => {
        // Only run once
        if (hasInitialized.current) return;
        hasInitialized.current = true;

        console.log('[useEcosystemInit] Initializing ecosystem on app startup...');
        initializeEcosystem().catch((e) => {
            console.error('[useEcosystemInit] Failed to initialize ecosystem:', e);
        });
    }, [initializeEcosystem]);

    return { ecosystemInitialized };
}
