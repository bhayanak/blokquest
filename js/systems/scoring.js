// Scoring system for calculating points and managing coins
import { SCORING, DIFFICULTY, GAME_MODES } from '../core/constants.js';
import { calculateScore } from '../core/utils.js';
import { storage } from '../core/storage.js';
import { audioManager } from '../core/audio.js';

/**
 * Scoring manager class
 */
export class ScoringManager {
    constructor(gameMode = GAME_MODES.NORMAL, difficulty = DIFFICULTY.EASY) {
        this.gameMode = gameMode;
        this.difficulty = difficulty;
        this.currentScore = 0;
        this.totalLinesCleared = 0;
        this.combo = 0;
        this.maxCombo = 0;
        this.scoreHistory = [];
        this.multiplier = this.getBaseMultiplier();
    }

    /**
     * Get base multiplier for current difficulty and mode
     */
    getBaseMultiplier() {
        let multiplier = SCORING.DIFFICULTY_MULTIPLIERS[this.difficulty] || 1.0;
        
        // Mode-specific multipliers
        switch (this.gameMode) {
            case GAME_MODES.ENDLESS:
                multiplier *= 1.1; // 10% bonus for endless mode
                break;
            case GAME_MODES.DAILY:
                multiplier *= 1.2; // 20% bonus for daily challenges
                break;
            case GAME_MODES.ADVENTURE:
                multiplier *= 0.9; // Slightly lower for adventure mode
                break;
            default:
                break;
        }
        
        return multiplier;
    }

    /**
     * Calculate score for completed lines
     */
    calculateLineScore(completedRows, completedCols) {
        const totalLines = completedRows.length + completedCols.length;
        if (totalLines === 0) return 0;

        let baseScore = totalLines * SCORING.BASE_LINE_SCORE;

        // Combo multiplier
        let comboMultiplier = 1.0;
        if (this.combo > 0) {
            comboMultiplier = 1.0 + (this.combo * 0.1); // 10% per combo level
        }

        // Multiple line bonus
        if (totalLines > 1) {
            baseScore *= (1 + (totalLines - 1) * 0.3); // 30% per additional line
        }

        // Special bonuses for clearing both rows and columns simultaneously
        if (completedRows.length > 0 && completedCols.length > 0) {
            baseScore *= 1.5; // 50% bonus for cross clear
        }

        // Apply all multipliers
        const finalScore = Math.floor(
            baseScore * 
            this.multiplier * 
            comboMultiplier
        );

        return finalScore;
    }

    /**
     * Process completed lines and update score
     */
    processCompletedLines(completedRows, completedCols) {
        const totalLines = completedRows.length + completedCols.length;
        if (totalLines === 0) {
            this.combo = 0; // Reset combo if no lines cleared
            return { score: 0, coins: 0, combo: this.combo };
        }

        // Calculate score
        const lineScore = this.calculateLineScore(completedRows, completedCols);
        
        // Update combo
        this.combo += 1;
        this.maxCombo = Math.max(this.maxCombo, this.combo);

        // Update totals
        this.currentScore += lineScore;
        this.totalLinesCleared += totalLines;

        // Calculate coins earned
        const coinsEarned = this.calculateCoinsEarned(lineScore);

        // Store in history
        this.scoreHistory.push({
            timestamp: Date.now(),
            score: lineScore,
            lines: totalLines,
            combo: this.combo,
            rows: completedRows.length,
            cols: completedCols.length
        });

        // Play sound effect
        audioManager.playClear();

        return {
            score: lineScore,
            totalScore: this.currentScore,
            coins: coinsEarned,
            combo: this.combo,
            lines: totalLines
        };
    }

    /**
     * Calculate coins earned from score
     */
    calculateCoinsEarned(score) {
        let coins = Math.floor(score * SCORING.COINS_PER_SCORE);
        
        // Bonus coins for high combos
        if (this.combo >= 3) {
            coins += Math.floor(this.combo * 2);
        }
        
        // Mode-specific coin bonuses
        switch (this.gameMode) {
            case GAME_MODES.DAILY:
                coins = Math.floor(coins * 1.5); // 50% more coins in daily mode
                break;
            case GAME_MODES.ENDLESS:
                coins = Math.floor(coins * 0.8); // 20% fewer coins in endless (since they can buy power-ups with score)
                break;
        }

        return coins;
    }

    /**
     * Award coins and update storage
     */
    awardCoins(amount) {
        if (amount > 0) {
            storage.addCoins(amount);
        }
    }

    /**
     * Get current score
     */
    getCurrentScore() {
        return this.currentScore;
    }

    /**
     * Get total lines cleared
     */
    getTotalLinesCleared() {
        return this.totalLinesCleared;
    }

    /**
     * Get current combo
     */
    getCurrentCombo() {
        return this.combo;
    }

    /**
     * Get max combo achieved
     */
    getMaxCombo() {
        return this.maxCombo;
    }

    /**
     * Reset combo (called when no valid moves or shape placed without clearing lines)
     */
    resetCombo() {
        this.combo = 0;
    }

    /**
     * Get scoring statistics
     */
    getStatistics() {
        return {
            currentScore: this.currentScore,
            totalLinesCleared: this.totalLinesCleared,
            combo: this.combo,
            maxCombo: this.maxCombo,
            scoreHistory: [...this.scoreHistory],
            averageScorePerLine: this.totalLinesCleared > 0 ? 
                Math.floor(this.currentScore / this.totalLinesCleared) : 0
        };
    }

    /**
     * Check if current score is a new high score
     */
    checkHighScore() {
        const currentHigh = storage.getHighScore(this.gameMode, this.difficulty);
        return this.currentScore > currentHigh;
    }

    /**
     * Save high score if applicable
     */
    saveHighScore() {
        const isNewHigh = storage.setHighScore(this.gameMode, this.difficulty, this.currentScore);
        if (isNewHigh) {
            // Update statistics
            storage.updateStatistics({
                totalGames: storage.getStatistics().totalGames + 1,
                linesCleared: storage.getStatistics().linesCleared + this.totalLinesCleared
            });
        }
        return isNewHigh;
    }

    /**
     * Calculate bonus score for special achievements
     */
    calculateBonusScore(achievementType) {
        let bonus = 0;
        
        switch (achievementType) {
            case 'PERFECT_CLEAR': // Clear entire grid
                bonus = 5000 * this.multiplier;
                break;
            case 'MEGA_COMBO': // Combo of 5 or more
                bonus = 1000 * this.combo * this.multiplier;
                break;
            case 'SPEED_BONUS': // Quick successive moves
                bonus = 500 * this.multiplier;
                break;
            case 'EFFICIENCY': // High score with few moves
                bonus = 300 * this.multiplier;
                break;
        }
        
        return Math.floor(bonus);
    }

    /**
     * Award bonus score
     */
    awardBonus(achievementType, customAmount = null) {
        const bonus = customAmount || this.calculateBonusScore(achievementType);
        this.currentScore += bonus;
        
        // Also award bonus coins
        const bonusCoins = this.calculateCoinsEarned(bonus);
        this.awardCoins(bonusCoins);
        
        return { score: bonus, coins: bonusCoins };
    }

    /**
     * Set game mode (updates multiplier)
     */
    setGameMode(mode) {
        this.gameMode = mode;
        this.multiplier = this.getBaseMultiplier();
    }

    /**
     * Set difficulty (updates multiplier)
     */
    setDifficulty(difficulty) {
        this.difficulty = difficulty;
        this.multiplier = this.getBaseMultiplier();
    }

    /**
     * Reset scoring state for new game
     */
    reset() {
        this.currentScore = 0;
        this.totalLinesCleared = 0;
        this.combo = 0;
        this.maxCombo = 0;
        this.scoreHistory = [];
    }

    /**
     * Get score display text with formatting
     */
    getScoreDisplayText(score = null) {
        const displayScore = score !== null ? score : this.currentScore;
        return displayScore.toLocaleString();
    }

    /**
     * Get detailed score breakdown for end game screen
     */
    getScoreBreakdown() {
        const stats = this.getStatistics();
        const breakdown = {
            baseScore: stats.currentScore,
            linesCleared: stats.totalLinesCleared,
            maxCombo: stats.maxCombo,
            difficulty: this.difficulty,
            mode: this.gameMode,
            multiplier: this.multiplier
        };

        // Calculate component scores
        if (stats.scoreHistory.length > 0) {
            breakdown.lineClearScore = stats.scoreHistory.reduce((sum, entry) => sum + entry.score, 0);
            breakdown.comboBonus = stats.scoreHistory.reduce((sum, entry) => {
                return sum + (entry.combo > 1 ? entry.score * 0.1 * (entry.combo - 1) : 0);
            }, 0);
        }

        return breakdown;
    }

    /**
     * Export scoring data for save/load
     */
    exportData() {
        return {
            gameMode: this.gameMode,
            difficulty: this.difficulty,
            currentScore: this.currentScore,
            totalLinesCleared: this.totalLinesCleared,
            combo: this.combo,
            maxCombo: this.maxCombo,
            scoreHistory: [...this.scoreHistory],
            multiplier: this.multiplier
        };
    }

    /**
     * Import scoring data from save
     */
    importData(data) {
        this.gameMode = data.gameMode || GAME_MODES.NORMAL;
        this.difficulty = data.difficulty || DIFFICULTY.EASY;
        this.currentScore = data.currentScore || 0;
        this.totalLinesCleared = data.totalLinesCleared || 0;
        this.combo = data.combo || 0;
        this.maxCombo = data.maxCombo || 0;
        this.scoreHistory = data.scoreHistory || [];
        this.multiplier = data.multiplier || this.getBaseMultiplier();
    }

    /**
     * Set the current score (used for undo functionality)
     */
    setScore(score) {
        this.currentScore = score;
    }

    /**
     * Add score (used for power-ups and bonuses)
     */
    addScore(score) {
        this.currentScore += score;
    }
}