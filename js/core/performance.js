// Performance utilities for optimization
export class PerformanceManager {
    constructor() {
        this.textureCache = new Map();
        this.soundCache = new Map();
        this.lastCleanup = Date.now();
        this.cleanupInterval = 30000; // 30 seconds
    }

    /**
     * Cache texture for reuse
     */
    cacheTexture(key, texture) {
        this.textureCache.set(key, {
            texture,
            lastUsed: Date.now(),
            useCount: 1
        });
    }

    /**
     * Get cached texture
     */
    getCachedTexture(key) {
        const cached = this.textureCache.get(key);
        if (cached) {
            cached.lastUsed = Date.now();
            cached.useCount++;
            return cached.texture;
        }
        return null;
    }

    /**
     * Clean up unused resources
     */
    cleanup() {
        const now = Date.now();
        if (now - this.lastCleanup < this.cleanupInterval) return;

        const cutoff = now - 60000; // Remove resources unused for 1 minute

        // Clean texture cache
        for (const [key, data] of this.textureCache) {
            if (data.lastUsed < cutoff && data.useCount < 5) {
                this.textureCache.delete(key);
            }
        }

        // Clean sound cache
        for (const [key, data] of this.soundCache) {
            if (data.lastUsed < cutoff) {
                this.soundCache.delete(key);
            }
        }

        this.lastCleanup = now;
        console.log(`Performance cleanup completed. Texture cache: ${this.textureCache.size}, Sound cache: ${this.soundCache.size}`);
    }

    /**
     * Get performance metrics
     */
    getMetrics() {
        return {
            texturesCached: this.textureCache.size,
            soundsCached: this.soundCache.size,
            memoryUsage: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1024 / 1024) : 'N/A'
        };
    }

    /**
     * Optimize scene for performance
     */
    optimizeScene(scene) {
        // Set appropriate depth sorting
        scene.children.sort((a, b) => a.depth - b.depth);

        // Enable batch drawing where possible
        scene.renderer.pipelines.list.forEach(pipeline => {
            if (pipeline.batch) {
                pipeline.batch.autoResize = true;
            }
        });

        // Schedule cleanup
        this.cleanup();
    }

    /**
     * Preload critical resources
     */
    preloadCritical(scene) {
        // Preload commonly used textures and sounds
        const criticalAssets = [
            'place.wav',
            'clear.wav',
            'gameover.wav'
        ];

        criticalAssets.forEach(asset => {
            if (scene.cache && scene.cache.audio.exists(asset)) {
                this.soundCache.set(asset, {
                    lastUsed: Date.now()
                });
            }
        });
    }
}

// Global performance manager instance
export const performanceManager = new PerformanceManager();