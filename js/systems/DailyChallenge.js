/**
 * Daily Challenge System - 7 Different Challenge Types
 * Each day of the week has a unique challenge type
 */

import { getTodaysSeed } from '../core/utils.js';

// Challenge types for each day of the week
export const CHALLENGE_TYPES = {
    MONDAY: 'timeAttack',      // 3-minute sprint
    TUESDAY: 'shapeMaster',    // Limited shape types
    WEDNESDAY: 'mysteryGrid',  // Face reveal puzzles
    THURSDAY: 'cascade',       // Chain reaction focus
    FRIDAY: 'speedRun',        // Increasing tempo
    SATURDAY: 'zenMode',       // Pattern beauty focus
    SUNDAY: 'bossBattle'       // RPG-style combat
};

// Challenge configurations
export const CHALLENGE_CONFIGS = {
    timeAttack: {
        name: 'Time Attack',
        description: '3-minute sprint! Score as much as possible!',
        icon: '⏱️',
        color: '#FF4444',
        duration: 180000, // 3 minutes in milliseconds
        bonusMultiplier: 2.0,
        specialRules: 'Time pressure increases score multipliers'
    },
    shapeMaster: {
        name: 'Shape Master',
        description: 'Limited shape types - master them all!',
        icon: '🔷',
        color: '#4444FF',
        allowedShapes: 3, // Only 3 different shape types
        bonusMultiplier: 1.5,
        specialRules: 'Perfect placement bonuses doubled'
    },
    mysteryGrid: {
        name: 'Mystery Grid',
        description: 'Reveal the hidden face as you clear lines!',
        icon: '🎭',
        color: '#FF44FF',
        mysteryImage: true,
        bonusMultiplier: 2.5,
        specialRules: 'Bonus for correctly guessing the face'
    },
    cascade: {
        name: 'Cascade Challenge',
        description: 'Create epic chain reactions!',
        icon: '⚡',
        color: '#FFFF44',
        cascadeBonus: 3.0,
        bonusMultiplier: 2.0,
        specialRules: 'Chain clears multiply exponentially'
    },
    speedRun: {
        name: 'Speed Run',
        description: 'Tempo increases - keep up the pace!',
        icon: '🚀',
        color: '#44FFFF',
        speedIncrease: true,
        bonusMultiplier: 1.8,
        specialRules: 'Speed bonuses for quick placements'
    },
    zenMode: {
        name: 'Zen Mode',
        description: 'Focus on beautiful patterns and harmony',
        icon: '☯️',
        color: '#44FF44',
        patternBonus: true,
        bonusMultiplier: 1.3,
        specialRules: 'Symmetry and patterns give huge bonuses'
    },
    bossBattle: {
        name: 'Boss Battle',
        description: 'Defeat the weekly boss with special patterns!',
        icon: '👹',
        color: '#8B0000',
        bossHealth: 1000,
        bossWeakness: [], // Will be set dynamically
        bonusMultiplier: 3.0,
        specialRules: 'Hit boss weak points for massive damage'
    }
};

/**
 * Generate a seed for a specific date
 * @param {Date} date - The date to generate seed for
 * @returns {number} Seed for the specified date
 */
export function getSeedForDate(date) {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    
    const dateString = `${year}${month.toString().padStart(2, '0')}${day.toString().padStart(2, '0')}`;
    return parseInt(dateString);
}

/**
 * Get today's challenge type based on day of week
 * @returns {string} Challenge type key
 */
export function getTodaysChallengeType() {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    const challengeMap = {
        0: CHALLENGE_TYPES.SUNDAY,    // Sunday - Boss Battle
        1: CHALLENGE_TYPES.MONDAY,    // Monday - Time Attack
        2: CHALLENGE_TYPES.TUESDAY,   // Tuesday - Shape Master
        3: CHALLENGE_TYPES.WEDNESDAY, // Wednesday - Mystery Grid
        4: CHALLENGE_TYPES.THURSDAY,  // Thursday - Cascade
        5: CHALLENGE_TYPES.FRIDAY,    // Friday - Speed Run
        6: CHALLENGE_TYPES.SATURDAY   // Saturday - Zen Mode
    };
    
    return challengeMap[dayOfWeek];
}

/**
 * Get today's challenge configuration
 * @returns {Object} Challenge configuration object
 */
export function getTodaysChallengeConfig() {
    const challengeType = getTodaysChallengeType();
    return {
        type: challengeType,
        ...CHALLENGE_CONFIGS[challengeType],
        dayOfWeek: new Date().toLocaleDateString('en-US', { weekday: 'long' }),
        date: getTodaysDateString()
    };
}

/**
 * Get today's date string for display
 * @returns {string} Formatted date string
 */
export function getTodaysDateString() {
    const today = new Date();
    return today.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

/**
 * Check if a daily challenge has been completed today
 * @returns {boolean} True if today's challenge is completed
 */
export function isDailyCompleted() {
    const today = getTodaysSeed().toString();
    const completedChallenges = JSON.parse(localStorage.getItem('dailyChallenges') || '{}');
    return completedChallenges[today] === true;
}

/**
 * Mark today's daily challenge as completed
 * @param {number} score - Final score achieved
 * @param {Object} stats - Game statistics
 */
export function markDailyCompleted(score, stats = {}) {
    const today = getTodaysSeed().toString();
    const completedChallenges = JSON.parse(localStorage.getItem('dailyChallenges') || '{}');
    
    // Store completion with score and stats
    completedChallenges[today] = {
        completed: true,
        score: score,
        completedAt: Date.now(),
        stats: {
            linesCleared: stats.linesCleared || 0,
            shapesPlaced: stats.shapesPlaced || 0,
            maxCombo: stats.maxCombo || 0,
            playTime: stats.playTime || 0,
            coinsEarned: stats.coinsEarned || 0
        }
    };
    
    localStorage.setItem('dailyChallenges', JSON.stringify(completedChallenges));
}

/**
 * Get today's daily challenge stats if completed
 * @returns {Object|null} Challenge stats or null if not completed
 */
export function getTodaysChallengeStats() {
    const today = getTodaysSeed().toString();
    const completedChallenges = JSON.parse(localStorage.getItem('dailyChallenges') || '{}');
    return completedChallenges[today] || null;
}

/**
 * Get daily challenge completion streak
 * @returns {number} Current streak of consecutive daily completions
 */
export function getDailyStreak() {
    const completedChallenges = JSON.parse(localStorage.getItem('dailyChallenges') || '{}');
    let streak = 0;
    const today = new Date();
    
    // Check backwards from today until we find a missing day
    for (let i = 0; i < 365; i++) { // Max streak of 1 year
        const checkDate = new Date(today);
        checkDate.setDate(today.getDate() - i);
        const seedString = getSeedForDate(checkDate).toString();
        
        if (completedChallenges[seedString]?.completed) {
            streak++;
        } else {
            break;
        }
    }
    
    return streak;
}

/**
 * Get total daily challenges completed
 * @returns {number} Total number of daily challenges completed
 */
export function getTotalDailiesCompleted() {
    const completedChallenges = JSON.parse(localStorage.getItem('dailyChallenges') || '{}');
    return Object.keys(completedChallenges).filter(key => 
        completedChallenges[key]?.completed === true
    ).length;
}

/**
 * Get best daily challenge score
 * @returns {number} Highest score achieved in daily challenges
 */
export function getBestDailyScore() {
    const completedChallenges = JSON.parse(localStorage.getItem('dailyChallenges') || '{}');
    let bestScore = 0;
    
    Object.values(completedChallenges).forEach(challenge => {
        if (challenge?.score > bestScore) {
            bestScore = challenge.score;
        }
    });
    
    return bestScore;
}

/**
 * Daily Challenge Manager Class - Enhanced with 7 Challenge Types
 * Handles daily challenge state and progression
 */
export class DailyChallenge {
    constructor() {
        this.seed = getTodaysSeed();
        this.dateString = getTodaysDateString();
        this.challengeType = getTodaysChallengeType();
        this.config = getTodaysChallengeConfig();
        this.isCompleted = isDailyCompleted();
        this.stats = getTodaysChallengeStats();
        
        // Challenge-specific state
        this.startTime = null;
        this.timeRemaining = null;
        this.bossHealth = null;
        this.mysteryImage = null;
        this.cascadeMultiplier = 1;
        this.speedLevel = 1;
        this.patternScore = 0;
        
        this.initializeChallengeSpecifics();
    }
    
    /**
     * Initialize challenge-specific settings
     */
    initializeChallengeSpecifics() {
        switch (this.challengeType) {
            case CHALLENGE_TYPES.MONDAY: // Time Attack
                this.timeRemaining = this.config.duration;
                break;
                
            case CHALLENGE_TYPES.TUESDAY: // Shape Master
                this.allowedShapeTypes = this.generateLimitedShapeTypes();
                break;
                
            case CHALLENGE_TYPES.WEDNESDAY: // Mystery Grid
                this.mysteryImage = this.generateMysteryImage();
                this.revealedPixels = new Set();
                break;
                
            case CHALLENGE_TYPES.THURSDAY: // Cascade
                this.cascadeMultiplier = 1;
                this.cascadeStreak = 0;
                break;
                
            case CHALLENGE_TYPES.FRIDAY: // Speed Run
                this.speedLevel = 1;
                this.lastPlacementTime = 0;
                break;
                
            case CHALLENGE_TYPES.SATURDAY: // Zen Mode
                this.patternScore = 0;
                this.symmetryBonus = 0;
                break;
                
            case CHALLENGE_TYPES.SUNDAY: // Boss Battle
                this.bossHealth = this.config.bossHealth;
                this.bossWeakness = this.generateBossWeakness();
                this.bossAttackTimer = 0;
                break;
        }
    }
    
    /**
     * Generate limited shape types for Shape Master challenge
     */
    generateLimitedShapeTypes() {
        const allTypes = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
        const shuffled = allTypes.sort(() => 0.5 - Math.random());
        return shuffled.slice(0, this.config.allowedShapes);
    }
    
    /**
     * Generate mystery image for Wednesday challenge
     */
    generateMysteryImage() {
        const celebrities = [
            { name: 'Einstein', pattern: this.generateEinsteinPattern() },
            { name: 'Mona Lisa', pattern: this.generateMonaLisaPattern() },
            { name: 'Mario', pattern: this.generateMarioPattern() },
            { name: 'Pikachu', pattern: this.generatePikachuPattern() }
        ];
        
        const randomIndex = this.seed % celebrities.length;
        return celebrities[randomIndex];
    }
    
    /**
     * Generate boss weakness patterns for Sunday challenge
     */
    generateBossWeakness() {
        const patterns = [
            { name: 'Cross', pattern: [[0,1,0],[1,1,1],[0,1,0]] },
            { name: 'L-Shape', pattern: [[1,0],[1,0],[1,1]] },
            { name: 'T-Shape', pattern: [[1,1,1],[0,1,0]] },
            { name: 'Square', pattern: [[1,1],[1,1]] }
        ];
        
        const weekNumber = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000));
        return patterns[weekNumber % patterns.length];
    }
    
    /**
     * Start a new daily challenge
     * @returns {Object} Challenge configuration
     */
    startChallenge() {
        this.startTime = Date.now();
        
        return {
            seed: this.seed,
            date: this.dateString,
            type: this.challengeType,
            config: this.config,
            isCompleted: this.isCompleted,
            previousStats: this.stats,
            challengeState: this.getChallengeState()
        };
    }
    
    /**
     * Get current challenge state
     */
    getChallengeState() {
        return {
            timeRemaining: this.timeRemaining,
            bossHealth: this.bossHealth,
            mysteryImage: this.mysteryImage,
            cascadeMultiplier: this.cascadeMultiplier,
            speedLevel: this.speedLevel,
            patternScore: this.patternScore,
            allowedShapeTypes: this.allowedShapeTypes,
            bossWeakness: this.bossWeakness
        };
    }
    
    /**
     * Update challenge progress
     */
    updateChallenge(gameState) {
        switch (this.challengeType) {
            case CHALLENGE_TYPES.MONDAY: // Time Attack
                this.updateTimeAttack();
                break;
                
            case CHALLENGE_TYPES.THURSDAY: // Cascade
                this.updateCascade(gameState.linesCleared);
                break;
                
            case CHALLENGE_TYPES.FRIDAY: // Speed Run
                this.updateSpeedRun();
                break;
                
            case CHALLENGE_TYPES.SATURDAY: // Zen Mode
                this.updateZenMode(gameState.gridState);
                break;
                
            case CHALLENGE_TYPES.SUNDAY: // Boss Battle
                this.updateBossBattle(gameState.shapePlaced);
                break;
        }
    }
    
    /**
     * Update Time Attack challenge
     */
    updateTimeAttack() {
        if (this.startTime) {
            const elapsed = Date.now() - this.startTime;
            this.timeRemaining = Math.max(0, this.config.duration - elapsed);
        }
    }
    
    /**
     * Update Cascade challenge
     */
    updateCascade(linesCleared) {
        if (linesCleared > 0) {
            this.cascadeStreak++;
            this.cascadeMultiplier = Math.min(10, 1 + (this.cascadeStreak * 0.5));
        } else {
            this.cascadeStreak = 0;
            this.cascadeMultiplier = 1;
        }
    }
    
    /**
     * Update Speed Run challenge
     */
    updateSpeedRun() {
        const now = Date.now();
        if (this.lastPlacementTime > 0) {
            const timeDiff = now - this.lastPlacementTime;
            if (timeDiff < 2000) { // Quick placement bonus
                this.speedLevel = Math.min(5, this.speedLevel + 0.1);
            }
        }
        this.lastPlacementTime = now;
    }
    
    /**
     * Update Zen Mode challenge
     */
    updateZenMode(gridState) {
        // Calculate symmetry and pattern bonuses
        this.patternScore += this.calculatePatternBeauty(gridState);
    }
    
    /**
     * Update Boss Battle challenge
     */
    updateBossBattle(shapePlaced) {
        if (shapePlaced && this.matchesBossWeakness(shapePlaced)) {
            const damage = 100;
            this.bossHealth = Math.max(0, this.bossHealth - damage);
            return { damage, weaknessHit: true };
        }
        return { damage: 0, weaknessHit: false };
    }
    
    /**
     * Check if shape matches boss weakness
     */
    matchesBossWeakness(shape) {
        // Compare shape pattern with boss weakness pattern
        return JSON.stringify(shape.pattern) === JSON.stringify(this.bossWeakness.pattern);
    }
    
    /**
     * Calculate pattern beauty score for Zen Mode
     */
    calculatePatternBeauty(gridState) {
        // Simplified beauty calculation based on symmetry and patterns
        let beauty = 0;
        
        // Check for horizontal symmetry
        if (this.hasHorizontalSymmetry(gridState)) beauty += 50;
        
        // Check for vertical symmetry  
        if (this.hasVerticalSymmetry(gridState)) beauty += 50;
        
        // Check for diagonal patterns
        if (this.hasDiagonalPattern(gridState)) beauty += 30;
        
        return beauty;
    }
    
    /**
     * Check for horizontal symmetry
     */
    hasHorizontalSymmetry(grid) {
        const rows = grid.length;
        const cols = grid[0].length;
        
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols / 2; col++) {
                if (grid[row][col] !== grid[row][cols - 1 - col]) {
                    return false;
                }
            }
        }
        return true;
    }
    
    /**
     * Check for vertical symmetry
     */
    hasVerticalSymmetry(grid) {
        const rows = grid.length;
        const cols = grid[0].length;
        
        for (let row = 0; row < rows / 2; row++) {
            for (let col = 0; col < cols; col++) {
                if (grid[row][col] !== grid[rows - 1 - row][col]) {
                    return false;
                }
            }
        }
        return true;
    }
    
    /**
     * Check for diagonal patterns
     */
    hasDiagonalPattern(grid) {
        // Simplified diagonal pattern detection
        const rows = grid.length;
        const cols = grid[0].length;
        let diagonalCount = 0;
        
        // Check main diagonal
        for (let i = 0; i < Math.min(rows, cols); i++) {
            if (grid[i][i] > 0) diagonalCount++;
        }
        
        return diagonalCount >= Math.min(rows, cols) * 0.6; // 60% of diagonal filled
    }
    
    /**
     * Get challenge-specific score multiplier
     */
    getScoreMultiplier() {
        switch (this.challengeType) {
            case CHALLENGE_TYPES.MONDAY: // Time Attack
                const urgencyMultiplier = this.timeRemaining < 30000 ? 2.0 : 1.0;
                return this.config.bonusMultiplier * urgencyMultiplier;
                
            case CHALLENGE_TYPES.THURSDAY: // Cascade
                return this.config.bonusMultiplier * this.cascadeMultiplier;
                
            case CHALLENGE_TYPES.FRIDAY: // Speed Run
                return this.config.bonusMultiplier * this.speedLevel;
                
            case CHALLENGE_TYPES.SATURDAY: // Zen Mode
                const beautyMultiplier = 1 + (this.patternScore / 1000);
                return this.config.bonusMultiplier * beautyMultiplier;
                
            default:
                return this.config.bonusMultiplier;
        }
    }
    
    /**
     * Check if challenge is failed/completed
     */
    isChallengeFailed() {
        switch (this.challengeType) {
            case CHALLENGE_TYPES.MONDAY: // Time Attack
                return this.timeRemaining <= 0;
                
            case CHALLENGE_TYPES.SUNDAY: // Boss Battle
                return false; // Boss battles don't fail, just end when boss is defeated
                
            default:
                return false; // Other challenges use normal game over conditions
        }
    }
    
    /**
     * Complete the daily challenge
     * @param {number} score - Final score
     * @param {Object} gameStats - Game statistics
     */
    completeChallenge(score, gameStats) {
        const enhancedStats = {
            ...gameStats,
            challengeType: this.challengeType,
            challengeSpecific: this.getChallengeSpecificStats()
        };
        
        markDailyCompleted(score, enhancedStats);
        this.isCompleted = true;
        this.stats = getTodaysChallengeStats();
    }
    
    /**
     * Get challenge-specific statistics
     */
    getChallengeSpecificStats() {
        switch (this.challengeType) {
            case CHALLENGE_TYPES.MONDAY:
                return { timeRemaining: this.timeRemaining };
            case CHALLENGE_TYPES.THURSDAY:
                return { maxCascadeMultiplier: this.cascadeMultiplier };
            case CHALLENGE_TYPES.FRIDAY:
                return { maxSpeedLevel: this.speedLevel };
            case CHALLENGE_TYPES.SATURDAY:
                return { patternScore: this.patternScore };
            case CHALLENGE_TYPES.SUNDAY:
                return { bossDefeated: this.bossHealth <= 0, finalBossHealth: this.bossHealth };
            default:
                return {};
        }
    }
    
    /**
     * Get challenge summary for UI display
     */
    getSummary() {
        return {
            date: this.dateString,
            seed: this.seed,
            type: this.challengeType,
            config: this.config,
            isCompleted: this.isCompleted,
            currentStreak: getDailyStreak(),
            totalCompleted: getTotalDailiesCompleted(),
            bestScore: getBestDailyScore(),
            todaysStats: this.stats,
            challengeState: this.getChallengeState()
        };
    }
    
    /**
     * Check if player can replay (always false for daily)
     */
    canReplay() {
        return false; // Daily challenges can only be played once per day
    }
    
    /**
     * Get challenge rewards based on completion and type
     */
    getRewards() {
        if (!this.isCompleted) return null;
        
        const baseReward = 100; // Increased base reward
        const typeBonus = Math.floor(this.config.bonusMultiplier * 50); // Type-specific bonus
        const streakBonus = Math.min(getDailyStreak() * 20, 500); // Max 500 bonus
        const perfectBonus = this.getPerfectChallengeBonus();
        
        return {
            coins: baseReward + typeBonus + streakBonus + perfectBonus,
            typeBonus: typeBonus,
            streakBonus: streakBonus,
            perfectBonus: perfectBonus,
            title: this.getChallengeTitle(),
            special: this.getSpecialReward()
        };
    }
    
    /**
     * Get perfect challenge bonus
     */
    getPerfectChallengeBonus() {
        const challengeStats = this.getChallengeSpecificStats();
        
        switch (this.challengeType) {
            case CHALLENGE_TYPES.MONDAY:
                return challengeStats.timeRemaining > 60000 ? 200 : 0; // >1 minute left
            case CHALLENGE_TYPES.SUNDAY:
                return challengeStats.bossDefeated ? 300 : 0;
            case CHALLENGE_TYPES.SATURDAY:
                return challengeStats.patternScore > 500 ? 250 : 0;
            default:
                return 0;
        }
    }
    
    /**
     * Get challenge completion title
     */
    getChallengeTitle() {
        const streak = getDailyStreak();
        const type = this.config.name;
        
        if (streak >= 30) return `${type} Legend!`;
        if (streak >= 14) return `${type} Master!`;
        if (streak >= 7) return `${type} Champion!`;
        if (streak >= 3) return `${type} Warrior!`;
        return `${type} Complete!`;
    }
    
    /**
     * Get special reward for challenge type
     */
    getSpecialReward() {
        if (getDailyStreak() >= 7) {
            return {
                type: 'streak_milestone',
                name: '7-Day Streak Reward',
                description: 'Unlocked special effects!',
                effect: 'particle_trail'
            };
        }
        return null;
    }
    
    // Placeholder pattern generators for mystery images
    generateEinsteinPattern() { return [[1,1,1],[1,0,1],[1,1,1]]; }
    generateMonaLisaPattern() { return [[0,1,0],[1,1,1],[1,0,1]]; }
    generateMarioPattern() { return [[1,1,1],[0,1,0],[1,1,1]]; }
    generatePikachuPattern() { return [[1,0,1],[0,1,0],[1,1,1]]; }
}