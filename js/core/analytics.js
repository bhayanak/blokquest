// Comprehensive analytics and statistics tracking system
import { storage } from './storage.js';
import { GAME_MODES } from './constants.js';

class AnalyticsManager {
    constructor() {
        this.sessionStartTime = null;
        this.currentGameStartTime = null;
        this.currentGameStats = {
            blocksPlaced: 0,
            shapesUsed: 0,
            linesCleared: 0,
            combos: 0,
            maxCombo: 0,
            moves: 0,
            score: 0
        };
        this.isTrackingSession = false;
        this.shapeUsageBuffer = {}; // Temporary buffer for current game
    }

    /**
     * Start a new session
     */
    startSession() {
        this.sessionStartTime = Date.now();
        this.isTrackingSession = true;
        
        // Update weekly/monthly progress tracking
        this.updateProgressPeriods();
        
        this.trackEvent('session_started');
    }

    /**
     * End current session
     */
    endSession() {
        if (!this.sessionStartTime || !this.isTrackingSession) return;
        
        const sessionDuration = Date.now() - this.sessionStartTime;
        this.updateSessionStats(sessionDuration);
        
        this.trackEvent('session_ended', { duration: sessionDuration });
        this.isTrackingSession = false;
    }

    /**
     * Start tracking a new game
     */
    startGame(mode = GAME_MODES.NORMAL, difficulty = 'normal') {
        this.currentGameStartTime = Date.now();
        this.currentGameStats = {
            blocksPlaced: 0,
            shapesUsed: 0,
            linesCleared: 0,
            combos: 0,
            maxCombo: 0,
            moves: 0,
            score: 0,
            mode: mode,
            difficulty: difficulty
        };
        this.shapeUsageBuffer = {};
        
        this.trackEvent('game_started', { mode, difficulty });
    }

    /**
     * End current game and save statistics
     */
    endGame(finalScore = 0, completed = false) {
        if (!this.currentGameStartTime) return;
        
        const gameDuration = Date.now() - this.currentGameStartTime;
        this.currentGameStats.score = finalScore;
        this.currentGameStats.duration = gameDuration;
        this.currentGameStats.completed = completed;
        
        this.updateGameStats(this.currentGameStats);
        
        this.trackEvent('game_ended', {
            score: finalScore,
            duration: gameDuration,
            completed: completed,
            mode: this.currentGameStats.mode
        });
        
        this.currentGameStartTime = null;
    }

    /**
     * Track block placement
     */
    trackBlockPlacement(shapeType, position, successful = true) {
        if (!this.isTrackingSession) return;
        
        this.currentGameStats.blocksPlaced++;
        this.currentGameStats.moves++;
        
        if (successful) {
            // Track shape usage
            if (!this.shapeUsageBuffer[shapeType]) {
                this.shapeUsageBuffer[shapeType] = 0;
            }
            this.shapeUsageBuffer[shapeType]++;
            this.currentGameStats.shapesUsed++;
        }
        
        this.trackEvent('block_placed', {
            shapeType,
            position,
            successful,
            moveNumber: this.currentGameStats.moves
        });
    }

    /**
     * Track line clear event
     */
    trackLineClear(linesCleared, combo = 0) {
        if (!this.isTrackingSession) return;
        
        this.currentGameStats.linesCleared += linesCleared;
        
        if (combo > 0) {
            this.currentGameStats.combos++;
            this.currentGameStats.maxCombo = Math.max(this.currentGameStats.maxCombo, combo);
        }
        
        this.trackEvent('lines_cleared', {
            linesCleared,
            combo,
            totalLinesThisGame: this.currentGameStats.linesCleared
        });
    }

    /**
     * Track power-up usage
     */
    trackPowerUpUsage(powerUpType, cost = 0) {
        const stats = storage.getStatistics();
        storage.updateStatistics({
            powerUpsUsed: stats.powerUpsUsed + 1,
            coinsSpent: stats.coinsSpent + cost
        });
        
        this.trackEvent('powerup_used', { type: powerUpType, cost });
    }

    /**
     * Track coins earned
     */
    trackCoinsEarned(amount, source = 'game_completion') {
        const stats = storage.getStatistics();
        storage.updateStatistics({
            coinsEarned: stats.coinsEarned + amount
        });
        
        this.trackEvent('coins_earned', { amount, source });
    }

    /**
     * Update session statistics
     */
    updateSessionStats(sessionDuration) {
        const stats = storage.getStatistics();
        const newTotalTime = stats.totalPlayTime + sessionDuration;
        const newSessionCount = stats.totalGames + 1;
        
        // Calculate average session time
        const newAverageSession = newSessionCount > 0 ? newTotalTime / newSessionCount : 0;
        
        // Update session records
        const updates = {
            totalPlayTime: newTotalTime,
            averageSessionTime: newAverageSession,
            longestSession: Math.max(stats.longestSession, sessionDuration),
            shortestSession: stats.shortestSession === 0 ? sessionDuration : Math.min(stats.shortestSession, sessionDuration),
            sessionsThisWeek: stats.sessionsThisWeek + 1,
            sessionsThisMonth: stats.sessionsThisMonth + 1
        };
        
        storage.updateStatistics(updates);
    }

    /**
     * Update game statistics after game ends
     */
    updateGameStats(gameStats) {
        const stats = storage.getStatistics();
        
        // Basic statistics updates
        const totalGames = stats.totalGames + 1;
        const newTotalScore = stats.totalScore + gameStats.score;
        const newAverageScore = totalGames > 0 ? newTotalScore / totalGames : 0;
        
        const updates = {
            totalGames: totalGames,
            totalScore: newTotalScore,
            averageScore: newAverageScore,
            linesCleared: stats.linesCleared + gameStats.linesCleared,
            totalBlocksPlaced: stats.totalBlocksPlaced + gameStats.blocksPlaced,
            totalShapesUsed: stats.totalShapesUsed + gameStats.shapesUsed,
            combosAchieved: stats.combosAchieved + gameStats.combos,
            maxComboChain: Math.max(stats.maxComboChain, gameStats.maxCombo),
            highScore: Math.max(stats.highScore, gameStats.score)
        };
        
        // Update average blocks per game
        updates.averageBlocksPerGame = totalGames > 0 ? updates.totalBlocksPlaced / totalGames : 0;
        
        // Update shape usage statistics
        const currentShapeUsage = stats.shapeUsageCount || {};
        Object.keys(this.shapeUsageBuffer).forEach(shapeType => {
            currentShapeUsage[shapeType] = (currentShapeUsage[shapeType] || 0) + this.shapeUsageBuffer[shapeType];
        });
        updates.shapeUsageCount = currentShapeUsage;
        
        // Find most and least used shapes
        const shapeEntries = Object.entries(currentShapeUsage);
        if (shapeEntries.length > 0) {
            const mostUsed = shapeEntries.reduce((a, b) => a[1] > b[1] ? a : b);
            const leastUsed = shapeEntries.reduce((a, b) => a[1] < b[1] ? a : b);
            updates.mostUsedShape = mostUsed[0];
            updates.leastUsedShape = leastUsed[0];
        }
        
        // Update mode-specific statistics
        this.updateModeSpecificStats(gameStats.mode, gameStats);
        
        // Update personal records
        this.updatePersonalRecords(gameStats);
        
        // Update performance metrics
        this.updatePerformanceMetrics(gameStats);
        
        // Check for achievement milestones
        this.checkMilestones(updates);
        
        storage.updateStatistics(updates);
    }

    /**
     * Update mode-specific statistics
     */
    updateModeSpecificStats(mode, gameStats) {
        const stats = storage.getStatistics();
        const modeStats = stats.modeStats || {};
        
        if (!modeStats[mode]) {
            modeStats[mode] = { gamesPlayed: 0, averageScore: 0, bestScore: 0, totalTime: 0 };
        }
        
        const currentMode = modeStats[mode];
        const newGamesPlayed = currentMode.gamesPlayed + 1;
        const newTotalScore = (currentMode.averageScore * currentMode.gamesPlayed) + gameStats.score;
        
        modeStats[mode] = {
            gamesPlayed: newGamesPlayed,
            averageScore: newGamesPlayed > 0 ? newTotalScore / newGamesPlayed : 0,
            bestScore: Math.max(currentMode.bestScore, gameStats.score),
            totalTime: currentMode.totalTime + gameStats.duration
        };
        
        storage.updateStatistics({ modeStats });
    }

    /**
     * Update personal records
     */
    updatePersonalRecords(gameStats) {
        const stats = storage.getStatistics();
        const records = stats.personalRecords || {};
        
        const updates = {
            personalRecords: {
                ...records,
                highestSingleScore: Math.max(records.highestSingleScore || 0, gameStats.score),
                mostLinesInOneGame: Math.max(records.mostLinesInOneGame || 0, gameStats.linesCleared),
                longestComboChain: Math.max(records.longestComboChain || 0, gameStats.maxCombo)
            }
        };
        
        // Track fastest completion for completed games
        if (gameStats.completed) {
            if (!records.fastestCompletion || gameStats.duration < records.fastestCompletion) {
                updates.personalRecords.fastestCompletion = gameStats.duration;
            }
        }
        
        storage.updateStatistics(updates);
    }

    /**
     * Update performance metrics
     */
    updatePerformanceMetrics(gameStats) {
        const stats = storage.getStatistics();
        const totalGames = stats.totalGames + 1;
        
        // Calculate gameplay efficiency (blocks per minute)
        const gameMinutes = gameStats.duration / (1000 * 60);
        const blocksPerMinute = gameMinutes > 0 ? gameStats.blocksPlaced / gameMinutes : 0;
        const newEfficiency = ((stats.gameplayEfficiency * stats.totalGames) + blocksPerMinute) / totalGames;
        
        // Calculate decision speed (average time between moves)
        const averageMoveTime = gameStats.moves > 0 ? gameStats.duration / gameStats.moves : 0;
        const newDecisionSpeed = ((stats.decisionSpeed * stats.totalGames) + averageMoveTime) / totalGames;
        
        storage.updateStatistics({
            gameplayEfficiency: newEfficiency,
            decisionSpeed: newDecisionSpeed
        });
    }

    /**
     * Check for achievement milestones
     */
    checkMilestones(updates) {
        const stats = storage.getStatistics();
        
        // First game completed
        if (!stats.firstGameCompleted && updates.totalGames === 1) {
            storage.updateStatistics({ firstGameCompleted: Date.now() });
        }
        
        // 100th game
        if (!stats.hundredthGameCompleted && updates.totalGames >= 100) {
            storage.updateStatistics({ hundredthGameCompleted: Date.now() });
        }
        
        // 1000th block placed
        if (!stats.thousandthBlockPlaced && updates.totalBlocksPlaced >= 1000) {
            storage.updateStatistics({ thousandthBlockPlaced: Date.now() });
        }
    }

    /**
     * Update progress periods (weekly/monthly)
     */
    updateProgressPeriods() {
        const stats = storage.getStatistics();
        const now = new Date();
        
        // Check if we need to reset weekly progress
        const weekStart = stats.weeklyProgress?.weekStart ? new Date(stats.weeklyProgress.weekStart) : null;
        const daysSinceWeekStart = weekStart ? Math.floor((now - weekStart) / (1000 * 60 * 60 * 24)) : 7;
        
        if (!weekStart || daysSinceWeekStart >= 7) {
            storage.updateStatistics({
                weeklyProgress: {
                    gamesPlayed: 0,
                    linesCleared: 0,
                    timeSpent: 0,
                    bestScore: 0,
                    weekStart: now.getTime()
                }
            });
        }
        
        // Check if we need to reset monthly progress
        const monthStart = stats.monthlyProgress?.monthStart ? new Date(stats.monthlyProgress.monthStart) : null;
        const monthsSinceStart = monthStart ? (now.getFullYear() - monthStart.getFullYear()) * 12 + (now.getMonth() - monthStart.getMonth()) : 1;
        
        if (!monthStart || monthsSinceStart >= 1) {
            storage.updateStatistics({
                monthlyProgress: {
                    gamesPlayed: 0,
                    linesCleared: 0,
                    timeSpent: 0,
                    bestScore: 0,
                    monthStart: now.getTime()
                }
            });
        }
    }

    /**
     * Get comprehensive analytics report
     */
    getAnalyticsReport() {
        const stats = storage.getStatistics();
        
        return {
            overview: {
                totalGames: stats.totalGames,
                totalPlayTime: this.formatDuration(stats.totalPlayTime),
                averageSessionTime: this.formatDuration(stats.averageSessionTime),
                highScore: stats.highScore,
                totalScore: stats.totalScore
            },
            performance: {
                averageScore: Math.round(stats.averageScore),
                gameplayEfficiency: Math.round(stats.gameplayEfficiency * 100) / 100,
                decisionSpeed: this.formatDuration(stats.decisionSpeed),
                accuracyRate: Math.round(stats.accuracyRate * 100),
                perfectClears: stats.perfectClears
            },
            patterns: {
                favoritePlayingTime: stats.favoritePlayingTime,
                mostUsedShape: stats.mostUsedShape,
                maxComboChain: stats.maxComboChain,
                totalCombos: stats.combosAchieved,
                difficultyPreference: stats.difficultyPreference
            },
            records: stats.personalRecords,
            modeBreakdown: stats.modeStats,
            progressTracking: {
                thisWeek: stats.weeklyProgress,
                thisMonth: stats.monthlyProgress
            }
        };
    }

    /**
     * Format duration in milliseconds to readable string
     */
    formatDuration(ms) {
        if (!ms || ms === 0) return '0m';
        
        const hours = Math.floor(ms / (1000 * 60 * 60));
        const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((ms % (1000 * 60)) / 1000);
        
        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds}s`;
        } else {
            return `${seconds}s`;
        }
    }

    /**
     * Generic event tracking for future analytics extensions
     */
    trackEvent(eventName, eventData = {}) {
        // This could be extended to send to external analytics services
        console.debug('Analytics Event:', eventName, eventData);
        
        // Store recent events for debugging (keep last 100)
        const recentEvents = storage.get('recentAnalyticsEvents', []);
        recentEvents.push({
            event: eventName,
            data: eventData,
            timestamp: Date.now()
        });
        
        // Keep only last 100 events
        if (recentEvents.length > 100) {
            recentEvents.splice(0, recentEvents.length - 100);
        }
        
        storage.set('recentAnalyticsEvents', recentEvents);
    }

    /**
     * Export analytics data for external analysis
     */
    exportAnalyticsData() {
        const stats = storage.getStatistics();
        const recentEvents = storage.get('recentAnalyticsEvents', []);
        
        return {
            statistics: stats,
            recentEvents: recentEvents,
            exportTimestamp: Date.now(),
            version: '1.0'
        };
    }
}

// Create and export singleton instance
export const analyticsManager = new AnalyticsManager();