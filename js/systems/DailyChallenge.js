/**
 * Daily Challenge System
 * Provides seeded random generation for daily challenges
 */

import { getTodaysSeed } from '../core/utils.js';

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
 * Daily Challenge Manager Class
 * Handles daily challenge state and progression
 */
export class DailyChallenge {
    constructor() {
        this.seed = getTodaysSeed();
        this.dateString = getTodaysDateString();
        this.isCompleted = isDailyCompleted();
        this.stats = getTodaysChallengeStats();
    }
    
    /**
     * Start a new daily challenge
     * @returns {Object} Challenge configuration
     */
    startChallenge() {
        return {
            seed: this.seed,
            date: this.dateString,
            isCompleted: this.isCompleted,
            previousStats: this.stats
        };
    }
    
    /**
     * Complete the daily challenge
     * @param {number} score - Final score
     * @param {Object} gameStats - Game statistics
     */
    completeChallenge(score, gameStats) {
        markDailyCompleted(score, gameStats);
        this.isCompleted = true;
        this.stats = getTodaysChallengeStats();
    }
    
    /**
     * Get challenge summary for UI display
     */
    getSummary() {
        return {
            date: this.dateString,
            seed: this.seed,
            isCompleted: this.isCompleted,
            currentStreak: getDailyStreak(),
            totalCompleted: getTotalDailiesCompleted(),
            bestScore: getBestDailyScore(),
            todaysStats: this.stats
        };
    }
    
    /**
     * Check if player can replay (always false for daily)
     */
    canReplay() {
        return false; // Daily challenges can only be played once per day
    }
    
    /**
     * Get challenge rewards based on completion
     */
    getRewards() {
        if (!this.isCompleted) return null;
        
        const baseReward = 50; // Base coins for completion
        const streakBonus = Math.min(getDailyStreak() * 10, 200); // Max 200 bonus
        
        return {
            coins: baseReward + streakBonus,
            streakBonus: streakBonus,
            title: getDailyStreak() >= 7 ? 'Week Warrior!' : 
                   getDailyStreak() >= 3 ? 'Streak Master!' : 'Daily Champion!'
        };
    }
}