"use client";

// Singleton instance for Essentia
let essentiaInstance: any = null;
let essentiaPromise: Promise<any> | null = null;

/**
 * Get or initialize the shared Essentia instance
 * This ensures Essentia is only downloaded and initialized once
 */
export async function getEssentiaInstance(): Promise<any> {
    // If already initialized, return it
    if (essentiaInstance) {
        return essentiaInstance;
    }

    // If initialization is in progress, wait for it
    if (essentiaPromise) {
        return essentiaPromise;
    }

    // Start initialization
    essentiaPromise = (async () => {
        // Dynamically import essentia.js for browser use
        //@ts-ignore
        const EssentiaModule = await import('essentia.js/dist/essentia-wasm.web.js');
        //@ts-ignore
        const EssentiaClass = await import('essentia.js/dist/essentia.js-core.es.js');

        // Initialize Essentia with the WASM backend
        //@ts-ignore
        const EssentiaWASM = await EssentiaModule.default({
            locateFile: (file: string) => {
                return `/essentia-wasm.web.wasm`;
            }
        });
        //@ts-ignore
        essentiaInstance = new EssentiaClass.default(EssentiaWASM);

        return essentiaInstance;
    })();

    return essentiaPromise;
}

/**
 * Clean up the Essentia instance
 * Call this when you're completely done with audio processing
 */
export function cleanupEssentia(): void {
    if (essentiaInstance) {
        essentiaInstance.shutdown();
        essentiaInstance.delete();
        essentiaInstance = null;
        essentiaPromise = null;
    }
}
