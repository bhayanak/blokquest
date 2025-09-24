// Main game entry point
import { GAME_CONFIG } from './core/constants.js';
import { storage } from './core/storage.js';
import { audioManager } from './core/audio.js';
import { themeManager } from './core/themes.js';
import { LoadingScene } from './scenes/LoadingScene.js';
import { MenuScene } from './scenes/MenuScene.js';
import { GameScene } from './scenes/GameScene.js';
import { PuzzleScene } from './scenes/PuzzleScene.js';
import { AdventureScene } from './scenes/AdventureScene.js';
import StatsScene from './scenes/StatsScene.js';
import { performanceManager } from './core/performance.js';
import { analyticsManager } from './core/analytics.js';

/**
 * BlockQuest Game Class
 */
class BlockQuestGame {
    constructor() {
        this.game = null;
        this.initialized = false;
        this.currentTheme = storage.getTheme();
    }

    /**
     * Initialize the game
     */
    init() {
        // Initialize theme system
        themeManager.init(this.currentTheme);
        
        // Configure Phaser game
        const config = {
            ...GAME_CONFIG,
            scene: [
                LoadingScene,
                MenuScene,
                GameScene,
                PuzzleScene,
                AdventureScene,
                StatsScene
            ],
            callbacks: {
                postBoot: () => {
                    this.onGameReady();
                }
            }
        };

        // Create Phaser game instance
        this.game = new Phaser.Game(config);
        this.initialized = true;

        // Handle resize
        window.addEventListener('resize', () => {
            this.handleResize();
        });

        // Handle visibility change
        document.addEventListener('visibilitychange', () => {
            this.handleVisibilityChange();
        });

        // Setup performance monitoring (debug mode)
        this.setupPerformanceMonitoring();

        console.log('BlockQuest initialized');
    }

    /**
     * Called when game is ready
     */
    onGameReady() {
        // Start analytics session
        analyticsManager.startSession();
        
        // Hide loading screen
        const loading = document.getElementById('loading');
        if (loading) {
            loading.classList.add('hidden');
        }

        // Start with menu scene
        this.game.scene.start('MenuScene');
    }

    /**
     * Handle window resize
     */
    handleResize() {
        if (this.game && this.game.scale) {
            this.game.scale.resize(window.innerWidth, window.innerHeight);
        }
    }

    /**
     * Handle visibility change (pause/resume)
     */
    handleVisibilityChange() {
        if (!this.game) return;

        if (document.visibilityState === 'hidden') {
            // Pause game when tab is hidden
            this.game.scene.pause();
            audioManager.stopAll();
            // End analytics session when tab is hidden
            analyticsManager.endSession();
        } else {
            // Resume when tab becomes visible
            this.game.scene.resume();
            // Restart analytics session when tab becomes visible
            analyticsManager.startSession();
        }
    }

    /**
     * Change theme
     */
    changeTheme(themeName) {
        if (themeManager.setTheme(themeName)) {
            storage.setTheme(themeName);
            this.currentTheme = themeName;
            
            // Notify all scenes about theme change
            this.game.scene.getScenes(true).forEach(scene => {
                if (scene.updateTheme) {
                    scene.updateTheme();
                }
            });
            
            return true;
        }
        return false;
    }

    /**
     * Toggle audio
     */
    toggleAudio() {
        return audioManager.toggle();
    }

    /**
     * Get game statistics
     */
    getStatistics() {
        return storage.getStatistics();
    }

    /**
     * Reset all game data
     */
    resetAllData() {
        const success = storage.resetAllData();
        if (success) {
            // Restart the game
            location.reload();
        }
        return success;
    }

    /**
     * Start specific game mode
     */
    startGameMode(mode, difficulty = 'easy') {
        const sceneConfig = {
            mode,
            difficulty
        };

        switch (mode) {
            case 'normal':
            case 'daily':
            case 'endless':
                this.game.scene.start('GameScene', sceneConfig);
                break;
            case 'puzzle':
                this.game.scene.start('PuzzleScene', sceneConfig);
                break;
            case 'adventure':
                this.game.scene.start('AdventureScene', sceneConfig);
                break;
            default:
                console.warn('Unknown game mode:', mode);
                break;
        }
    }

    /**
     * Return to main menu
     */
    returnToMenu() {
        this.game.scene.start('MenuScene');
    }

    /**
     * Get current game instance
     */
    getGame() {
        return this.game;
    }

    /**
     * Check if game is initialized
     */
    isInitialized() {
        return this.initialized;
    }

    /**
     * Setup performance monitoring
     */
    setupPerformanceMonitoring() {
        this.performanceStats = {
            fps: 0,
            memory: 0,
            showDebug: false
        };

        // Toggle debug info with F12 key
        document.addEventListener('keydown', (event) => {
            if (event.key === 'F12') {
                event.preventDefault();
                this.togglePerformanceDebug();
            }
        });

        // Update performance stats
        this.updatePerformanceStats();
    }

    /**
     * Toggle performance debug display
     */
    togglePerformanceDebug() {
        this.performanceStats.showDebug = !this.performanceStats.showDebug;

        if (this.performanceStats.showDebug) {
            this.createPerformanceDisplay();
        } else {
            this.removePerformanceDisplay();
        }
    }

    /**
     * Create performance display overlay
     */
    createPerformanceDisplay() {
        if (document.getElementById('performance-debug')) return;

        const debugDiv = document.createElement('div');
        debugDiv.id = 'performance-debug';
        debugDiv.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            background: rgba(0,0,0,0.8);
            color: white;
            padding: 10px;
            font-family: monospace;
            font-size: 12px;
            border-radius: 5px;
            z-index: 10000;
            pointer-events: none;
        `;
        document.body.appendChild(debugDiv);
    }

    /**
     * Remove performance display
     */
    removePerformanceDisplay() {
        const debugDiv = document.getElementById('performance-debug');
        if (debugDiv) {
            debugDiv.remove();
        }
    }

    /**
     * Update performance statistics
     */
    updatePerformanceStats() {
        if (this.game && this.game.loop) {
            this.performanceStats.fps = Math.round(this.game.loop.actualFps);
        }

        // Memory usage (if available)
        if (performance.memory) {
            this.performanceStats.memory = Math.round(performance.memory.usedJSHeapSize / 1024 / 1024);
        }

        // Update debug display
        if (this.performanceStats.showDebug) {
            const debugDiv = document.getElementById('performance-debug');
            if (debugDiv) {
                debugDiv.innerHTML = `
                    FPS: ${this.performanceStats.fps}<br>
                    Memory: ${this.performanceStats.memory} MB<br>
                    Theme: ${themeManager.getCurrentTheme().name}<br>
                    Audio: ${audioManager.isEnabled() ? 'ON' : 'OFF'}
                `;
            }
        }

        // Schedule next update
        setTimeout(() => this.updatePerformanceStats(), 1000);
    }

    /**
     * Destroy game instance
     */
    destroy() {
        if (this.game) {
            this.game.destroy(true);
            this.game = null;
            this.initialized = false;
        }
    }
}

// Create global game instance
const blockQuest = new BlockQuestGame();

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        blockQuest.init();
    });
} else {
    blockQuest.init();
}

// Export for global access
window.BlockQuest = blockQuest;

// Development helpers
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    window.gameDebug = {
        storage,
        audioManager,
        themeManager,
        resetData: () => blockQuest.resetAllData(),
        getStats: () => blockQuest.getStatistics(),
        changeTheme: (theme) => blockQuest.changeTheme(theme)
    };
    console.log('Debug tools available on window.gameDebug');
}

export default blockQuest;