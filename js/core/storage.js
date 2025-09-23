// Storage manager for persistent game data
import { STORAGE_KEYS, DEFAULT_GAME_STATE } from './constants.js';
import { deepClone } from './utils.js';

class StorageManager {
    constructor() {
        this.isSupported = this.checkStorageSupport();
        this.gameState = this.loadGameState();
    }

    /**
     * Check if localStorage is available
     */
    checkStorageSupport() {
        try {
            const test = 'blockquest_test';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch (e) {
            console.warn('localStorage not available, using session storage');
            return false;
        }
    }

    /**
     * Save data to storage
     */
    saveData(key, data) {
        try {
            const storage = this.isSupported ? localStorage : sessionStorage;
            storage.setItem(key, JSON.stringify(data));
            return true;
        } catch (e) {
            console.error('Failed to save data:', e);
            return false;
        }
    }

    /**
     * Load data from storage
     */
    loadData(key, defaultValue = null) {
        try {
            const storage = this.isSupported ? localStorage : sessionStorage;
            const data = storage.getItem(key);
            return data ? JSON.parse(data) : defaultValue;
        } catch (e) {
            console.error('Failed to load data:', e);
            return defaultValue;
        }
    }

    /**
     * Generic get method for any key
     */
    get(key, defaultValue = null) {
        return this.loadData(key, defaultValue);
    }

    /**
     * Generic set method for any key
     */
    set(key, value) {
        return this.saveData(key, value);
    }

    /**
     * Load complete game state
     */
    loadGameState() {
        const savedState = this.loadData(STORAGE_KEYS.SETTINGS, {});
        const progress = this.loadData(STORAGE_KEYS.PROGRESS, {});
        const statistics = this.loadData(STORAGE_KEYS.STATISTICS, {});
        const powerUps = this.loadData(STORAGE_KEYS.POWER_UPS, {});
        const highScores = this.loadData(STORAGE_KEYS.HIGH_SCORES, {});

        // Merge with defaults
        return {
            ...deepClone(DEFAULT_GAME_STATE),
            ...savedState,
            progress: { ...DEFAULT_GAME_STATE.progress, ...progress },
            statistics: { ...DEFAULT_GAME_STATE.statistics, ...statistics },
            powerUps: { ...DEFAULT_GAME_STATE.powerUps, ...powerUps },
            highScores: {
                normal: { easy: 0, hard: 0 },
                daily: { easy: 0, hard: 0 },
                endless: { easy: 0, hard: 0 },
                ...highScores
            }
        };
    }

    /**
     * Save complete game state
     */
    saveGameState() {
        const { progress, statistics, powerUps, highScores, ...settings } = this.gameState;
        
        this.saveData(STORAGE_KEYS.SETTINGS, settings);
        this.saveData(STORAGE_KEYS.PROGRESS, progress);
        this.saveData(STORAGE_KEYS.STATISTICS, statistics);
        this.saveData(STORAGE_KEYS.POWER_UPS, powerUps);
        this.saveData(STORAGE_KEYS.HIGH_SCORES, highScores);
    }

    /**
     * Get current theme
     */
    getTheme() {
        return this.gameState.theme || 'vibrant';
    }

    /**
     * Set current theme
     */
    setTheme(theme) {
        this.gameState.theme = theme;
        this.saveGameState();
    }

    /**
     * Get audio enabled state
     */
    isAudioEnabled() {
        return this.gameState.audioEnabled !== false;
    }

    /**
     * Set audio enabled state
     */
    setAudioEnabled(enabled) {
        this.gameState.audioEnabled = enabled;
        this.saveGameState();
    }

    /**
     * Get current difficulty
     */
    getDifficulty() {
        return this.gameState.difficulty || 'easy';
    }

    /**
     * Set current difficulty
     */
    setDifficulty(difficulty) {
        this.gameState.difficulty = difficulty;
        this.saveGameState();
    }

    /**
     * Get current game mode
     */
    getCurrentMode() {
        return this.gameState.currentMode || 'normal';
    }

    /**
     * Set current game mode
     */
    setCurrentMode(mode) {
        this.gameState.currentMode = mode;
        this.saveGameState();
    }

    /**
     * Get coin count
     */
    getCoins() {
        return this.gameState.coins || 0;
    }

    /**
     * Add coins
     */
    addCoins(amount) {
        this.gameState.coins = (this.gameState.coins || 0) + amount;
        this.saveGameState();
    }

    /**
     * Spend coins
     */
    spendCoins(amount) {
        if (this.getCoins() >= amount) {
            this.gameState.coins -= amount;
            this.saveGameState();
            return true;
        }
        return false;
    }

    /**
     * Get power-up count
     */
    getPowerUpCount(powerUpType) {
        return this.gameState.powerUps[powerUpType] || 0;
    }

    /**
     * Add power-up
     */
    addPowerUp(powerUpType, count = 1) {
        this.gameState.powerUps[powerUpType] = (this.gameState.powerUps[powerUpType] || 0) + count;
        this.saveGameState();
    }

    /**
     * Use power-up
     */
    usePowerUp(powerUpType) {
        if (this.getPowerUpCount(powerUpType) > 0) {
            this.gameState.powerUps[powerUpType]--;
            this.saveGameState();
            return true;
        }
        return false;
    }

    /**
     * Get high score for mode and difficulty
     */
    getHighScore(mode, difficulty) {
        return this.gameState.highScores?.[mode]?.[difficulty] || 0;
    }

    /**
     * Set high score if better than current
     */
    setHighScore(mode, difficulty, score) {
        if (!this.gameState.highScores) {
            this.gameState.highScores = {};
        }
        if (!this.gameState.highScores[mode]) {
            this.gameState.highScores[mode] = {};
        }

        const currentHigh = this.gameState.highScores[mode][difficulty] || 0;
        if (score > currentHigh) {
            this.gameState.highScores[mode][difficulty] = score;
            this.saveGameState();
            return true;
        }
        return false;
    }

    /**
     * Update statistics
     */
    updateStatistics(updates) {
        this.gameState.statistics = { ...this.gameState.statistics, ...updates };
        this.gameState.statistics.lastPlayed = Date.now();
        this.saveGameState();
    }

    /**
     * Update mode-specific statistics
     */
    updateModeStats(mode, stats) {
        if (!this.gameState.statistics.modeStats) {
            this.gameState.statistics.modeStats = {};
        }
        
        if (!this.gameState.statistics.modeStats[mode]) {
            this.gameState.statistics.modeStats[mode] = {
                gamesPlayed: 0,
                averageScore: 0,
                bestScore: 0,
                totalScore: 0,
                totalTime: 0,
                highestCombo: 0,
                linesCleared: 0,
                shapesUsed: 0,
                perfectClears: 0
            };
        }

        const modeData = this.gameState.statistics.modeStats[mode];
        
        // Update basic stats
        modeData.gamesPlayed += 1;
        modeData.totalScore += stats.score || 0;
        modeData.totalTime += stats.playTime || 0;
        modeData.linesCleared += stats.linesCleared || 0;
        modeData.shapesUsed += stats.shapesUsed || 0;
        
        // Update best records
        if (stats.score > modeData.bestScore) {
            modeData.bestScore = stats.score;
        }
        
        if (stats.maxCombo > modeData.highestCombo) {
            modeData.highestCombo = stats.maxCombo;
        }
        
        if (stats.perfectClear) {
            modeData.perfectClears += 1;
        }
        
        // Calculate new average score
        modeData.averageScore = Math.round(modeData.totalScore / modeData.gamesPlayed);
        
        // Mode-specific stats
        if (mode === 'endless') {
            modeData.highestLevel = Math.max(modeData.highestLevel || 0, stats.level || 0);
            modeData.longestSurvival = Math.max(modeData.longestSurvival || 0, stats.playTime || 0);
        }
        
        if (mode === 'daily') {
            if (stats.completed) {
                modeData.streakDays = (modeData.streakDays || 0) + 1;
                modeData.completionRate = ((modeData.completedDays || 0) + 1) / modeData.gamesPlayed;
            } else {
                modeData.streakDays = 0;
            }
        }

        this.gameState.statistics.lastPlayed = Date.now();
        this.saveGameState();
    }

    /**
     * Get statistics
     */
    getStatistics() {
        return this.gameState.statistics;
    }

    /**
     * Get mode-specific statistics
     */
    getModeStats(mode) {
        return this.gameState.statistics.modeStats?.[mode] || {};
    }

    /**
     * Check if adventure chapter is unlocked
     */
    isChapterUnlocked(chapterName) {
        return this.gameState.progress?.adventure?.[chapterName]?.unlocked || false;
    }

    /**
     * Unlock adventure chapter
     */
    unlockChapter(chapterName) {
        if (!this.gameState.progress.adventure) {
            this.gameState.progress.adventure = {};
        }
        if (!this.gameState.progress.adventure[chapterName]) {
            this.gameState.progress.adventure[chapterName] = {};
        }
        this.gameState.progress.adventure[chapterName].unlocked = true;
        this.saveGameState();
    }

    /**
     * Mark adventure chapter as completed
     */
    completeChapter(chapterName) {
        if (!this.gameState.progress.adventure) {
            this.gameState.progress.adventure = {};
        }
        if (!this.gameState.progress.adventure[chapterName]) {
            this.gameState.progress.adventure[chapterName] = {};
        }
        this.gameState.progress.adventure[chapterName].completed = true;
        this.saveGameState();
    }

    /**
     * Check if puzzle is completed
     */
    isPuzzleCompleted(puzzleId) {
        return this.gameState.progress?.puzzles?.[puzzleId] || false;
    }

    /**
     * Mark puzzle as completed
     */
    completePuzzle(puzzleId) {
        if (!this.gameState.progress.puzzles) {
            this.gameState.progress.puzzles = {};
        }
        this.gameState.progress.puzzles[puzzleId] = true;
        this.saveGameState();
    }

    /**
     * Get purchased power-ups
     */
    getPowerUps() {
        return this.gameState.powerUps || {};
    }

    /**
     * Check if user owns a power-up
     */
    hasPowerUp(powerUpId) {
        return this.gameState.powerUps?.[powerUpId] || false;
    }

    /**
     * Purchase a power-up
     */
    purchasePowerUp(powerUpId, cost) {
        // Check if user has enough coins
        const currentCoins = this.getCoins();
        if (currentCoins < cost) {
            return false;
        }

        // Deduct coins and add power-up
        this.setCoins(currentCoins - cost);
        if (!this.gameState.powerUps) {
            this.gameState.powerUps = {};
        }
        this.gameState.powerUps[powerUpId] = true;
        this.saveGameState();
        return true;
    }

    /**
     * Get current coins
     */
    getCoins() {
        return this.gameState.coins || 0;
    }

    /**
     * Set coins amount
     */
    setCoins(amount) {
        this.gameState.coins = Math.max(0, amount);
        this.saveGameState();
    }

    /**
     * Add coins
     */
    addCoins(amount) {
        this.setCoins(this.getCoins() + amount);
    }

    /**
     * Reset all data (for testing or user request)
     */
    resetAllData() {
        try {
            const storage = this.isSupported ? localStorage : sessionStorage;
            Object.values(STORAGE_KEYS).forEach(key => {
                storage.removeItem(key);
            });
            this.gameState = deepClone(DEFAULT_GAME_STATE);
            return true;
        } catch (e) {
            console.error('Failed to reset data:', e);
            return false;
        }
    }

    /**
     * Get all game state (for debugging)
     */
    getFullState() {
        return deepClone(this.gameState);
    }
}

// Create and export singleton instance
export const storage = new StorageManager();