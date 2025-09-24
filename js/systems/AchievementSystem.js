/**
 * Comprehensive Achievement and Records System
 * Features progressive tiers, rewards, and detailed tracking
 */

// Achievement Definitions with Progressive Tiers
export const ACHIEVEMENTS = {
    // Lines Cleared Achievements
    lineMaster: {
        id: 'lineMaster',
        name: 'Line Master',
        description: 'Clear lines to prove your puzzle mastery',
        icon: '🏆',
        category: 'lines',
        tiers: [
            { level: 'bronze', requirement: 100, reward: 100, name: 'Line Apprentice', icon: '🥉' },
            { level: 'silver', requirement: 500, reward: 250, name: 'Line Expert', icon: '🥈' },
            { level: 'gold', requirement: 1000, reward: 500, name: 'Line Master', icon: '🥇' },
            { level: 'diamond', requirement: 2000, reward: 1000, name: 'Line Legend', icon: '💎' }
        ]
    },

    // Games Played Achievements
    dedicated: {
        id: 'dedicated',
        name: 'Dedicated Player',
        description: 'Show your commitment by playing regularly',
        icon: '🎮',
        category: 'games',
        tiers: [
            { level: 'bronze', requirement: 10, reward: 50, name: 'Casual Player', icon: '🥉' },
            { level: 'silver', requirement: 50, reward: 150, name: 'Regular Player', icon: '🥈' },
            { level: 'gold', requirement: 100, reward: 300, name: 'Dedicated Player', icon: '🥇' },
            { level: 'diamond', requirement: 250, reward: 750, name: 'Game Addict', icon: '💎' }
        ]
    },

    // High Score Achievements
    scoreHunter: {
        id: 'scoreHunter',
        name: 'Score Hunter',
        description: 'Achieve impressive high scores',
        icon: '🎯',
        category: 'score',
        tiers: [
            { level: 'bronze', requirement: 10000, reward: 200, name: 'Score Seeker', icon: '🥉' },
            { level: 'silver', requirement: 25000, reward: 400, name: 'Score Chaser', icon: '🥈' },
            { level: 'gold', requirement: 50000, reward: 800, name: 'Score Hunter', icon: '🥇' },
            { level: 'diamond', requirement: 100000, reward: 1500, name: 'Score Master', icon: '💎' }
        ]
    },

    // Combo Achievements
    comboKing: {
        id: 'comboKing',
        name: 'Combo King',
        description: 'Master the art of consecutive line clears',
        icon: '🔥',
        category: 'combo',
        tiers: [
            { level: 'bronze', requirement: 5, reward: 75, name: 'Combo Starter', icon: '🥉' },
            { level: 'silver', requirement: 10, reward: 175, name: 'Combo Builder', icon: '🥈' },
            { level: 'gold', requirement: 15, reward: 350, name: 'Combo Master', icon: '🥇' },
            { level: 'diamond', requirement: 25, reward: 700, name: 'Combo King', icon: '💎' }
        ]
    },

    // Shapes Placed Achievements
    architect: {
        id: 'architect',
        name: 'Puzzle Architect',
        description: 'Place shapes with precision and strategy',
        icon: '🏗️',
        category: 'shapes',
        tiers: [
            { level: 'bronze', requirement: 500, reward: 80, name: 'Shape Novice', icon: '🥉' },
            { level: 'silver', requirement: 2000, reward: 200, name: 'Shape Builder', icon: '🥈' },
            { level: 'gold', requirement: 5000, reward: 400, name: 'Puzzle Architect', icon: '🥇' },
            { level: 'diamond', requirement: 10000, reward: 800, name: 'Master Builder', icon: '💎' }
        ]
    },

    // Daily Challenge Achievements
    dailyChampion: {
        id: 'dailyChampion',
        name: 'Daily Champion',
        description: 'Complete daily challenges consistently',
        icon: '📅',
        category: 'daily',
        tiers: [
            { level: 'bronze', requirement: 7, reward: 150, name: 'Week Warrior', icon: '🥉' },
            { level: 'silver', requirement: 30, reward: 400, name: 'Monthly Master', icon: '🥈' },
            { level: 'gold', requirement: 100, reward: 800, name: 'Daily Champion', icon: '🥇' },
            { level: 'diamond', requirement: 365, reward: 2000, name: 'Eternal Guardian', icon: '💎' }
        ]
    },

    // Play Time Achievements
    timeSpent: {
        id: 'timeSpent',
        name: 'Time Investment',
        description: 'Dedication measured in hours played',
        icon: '⏰',
        category: 'time',
        tiers: [
            { level: 'bronze', requirement: 3600000, reward: 100, name: 'Hour Player', icon: '🥉' }, // 1 hour
            { level: 'silver', requirement: 18000000, reward: 300, name: 'Marathon Player', icon: '🥈' }, // 5 hours
            { level: 'gold', requirement: 36000000, reward: 600, name: 'Time Master', icon: '🥇' }, // 10 hours
            { level: 'diamond', requirement: 72000000, reward: 1200, name: 'Time Lord', icon: '💎' } // 20 hours
        ]
    },

    // Perfectionist Achievements
    perfectionist: {
        id: 'perfectionist',
        name: 'Perfectionist',
        description: 'Complete games with exceptional performance',
        icon: '✨',
        category: 'perfect',
        tiers: [
            { level: 'bronze', requirement: 5, reward: 200, name: 'Good Performance', icon: '🥉' },
            { level: 'silver', requirement: 15, reward: 500, name: 'Great Performance', icon: '🥈' },
            { level: 'gold', requirement: 50, reward: 1000, name: 'Perfect Performance', icon: '🥇' },
            { level: 'diamond', requirement: 100, reward: 2000, name: 'Flawless Master', icon: '💎' }
        ]
    }
};

// Tier Colors for UI
export const TIER_COLORS = {
    locked: '#666666',
    bronze: '#CD7F32',
    silver: '#C0C0C0',
    gold: '#FFD700',
    diamond: '#B9F2FF'
};

// Achievement System Class
export class AchievementSystem {
    constructor() {
        this.achievements = this.loadAchievements();
        this.records = this.loadRecords();
    }

    /**
     * Load achievements from storage
     */
    loadAchievements() {
        const stored = localStorage.getItem('blockquest_achievements');
        if (stored) {
            return JSON.parse(stored);
        }
        
        // Initialize fresh achievements
        const fresh = {};
        Object.keys(ACHIEVEMENTS).forEach(key => {
            fresh[key] = {
                unlockedTier: null,
                progress: 0,
                totalRewardsEarned: 0
            };
        });
        return fresh;
    }

    /**
     * Load comprehensive records from storage
     */
    loadRecords() {
        const stored = localStorage.getItem('blockquest_records');
        if (stored) {
            return JSON.parse(stored);
        }

        // Initialize comprehensive records structure
        return {
            overall: {
                totalGamesPlayed: 0,
                totalLinesCleared: 0,
                totalShapesPlaced: 0,
                totalPlayTime: 0,
                totalCoinsEarned: 0,
                maxComboEver: 0,
                perfectGames: 0,
                dailyChallengesCompleted: 0
            },
            normal: {
                highScore: 0,
                averageScore: 0,
                totalScore: 0,
                gamesPlayed: 0,
                bestCombo: 0,
                totalLinesCleared: 0,
                longestSession: 0
            },
            endless: {
                highScore: 0,
                averageScore: 0,
                totalScore: 0,
                gamesPlayed: 0,
                bestCombo: 0,
                totalLinesCleared: 0,
                longestSession: 0
            },
            daily: {
                challengesCompleted: 0,
                currentStreak: 0,
                longestStreak: 0,
                totalScore: 0,
                averageScore: 0,
                mondayWins: 0,
                tuesdayWins: 0,
                wednesdayWins: 0,
                thursdayWins: 0,
                fridayWins: 0,
                saturdayWins: 0,
                sundayWins: 0
            }
        };
    }

    /**
     * Save achievements to storage
     */
    saveAchievements() {
        localStorage.setItem('blockquest_achievements', JSON.stringify(this.achievements));
    }

    /**
     * Save records to storage
     */
    saveRecords() {
        localStorage.setItem('blockquest_records', JSON.stringify(this.records));
    }

    /**
     * Update records based on game completion
     */
    updateRecords(gameMode, gameStats) {
        console.log('=== ACHIEVEMENT SYSTEM DEBUG ===');
        console.log('updateRecords called with gameMode:', gameMode, 'gameStats:', gameStats);
        
        const mode = gameMode.toLowerCase();
        
        // Update overall records
        this.records.overall.totalGamesPlayed++;
        this.records.overall.totalLinesCleared += gameStats.linesCleared || 0;
        this.records.overall.totalShapesPlaced += gameStats.shapesPlaced || 0;
        this.records.overall.totalPlayTime += gameStats.playTime || 0;
        this.records.overall.totalCoinsEarned += gameStats.coinsEarned || 0;
        this.records.overall.maxComboEver = Math.max(this.records.overall.maxComboEver, gameStats.maxCombo || 0);

        // Check for perfect game
        if (this.isPerfectGame(gameStats)) {
            this.records.overall.perfectGames++;
        }

        // Update mode-specific records
        if (this.records[mode]) {
            const modeRecords = this.records[mode];
            modeRecords.gamesPlayed++;
            modeRecords.totalScore += gameStats.score || 0;
            modeRecords.highScore = Math.max(modeRecords.highScore, gameStats.score || 0);
            modeRecords.averageScore = Math.floor(modeRecords.totalScore / modeRecords.gamesPlayed);
            modeRecords.bestCombo = Math.max(modeRecords.bestCombo, gameStats.maxCombo || 0);
            modeRecords.totalLinesCleared += gameStats.linesCleared || 0;
            modeRecords.longestSession = Math.max(modeRecords.longestSession, gameStats.playTime || 0);
        }

        // Update daily challenge records
        if (mode === 'daily') {
            this.records.daily.challengesCompleted++;
            this.records.overall.dailyChallengesCompleted++;
            
            // Update daily streak logic would go here
            const today = new Date().getDay();
            const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
            const dayKey = dayNames[today] + 'Wins';
            this.records.daily[dayKey]++;
        }

        this.saveRecords();
        
        console.log('✅ Records after update:', this.records);
        console.log('💾 Saved to localStorage successfully:', localStorage.getItem('blockquest_records') ? 'YES' : 'NO');
        console.log('🎯 Total games played now:', this.records.overall.totalGamesPlayed);
        console.log('📊 Total lines cleared now:', this.records.overall.totalLinesCleared);
        
        // Check for achievement progress
        this.updateAchievementProgress();
    }

    /**
     * Determine if a game was "perfect" based on performance metrics
     */
    isPerfectGame(gameStats) {
        // Define criteria for perfect game (can be adjusted)
        return (gameStats.score || 0) >= 15000 && 
               (gameStats.maxCombo || 0) >= 8 && 
               (gameStats.linesCleared || 0) >= 20;
    }

    /**
     * Update achievement progress and check for unlocks
     */
    updateAchievementProgress() {
        const newUnlocks = [];

        Object.keys(ACHIEVEMENTS).forEach(achievementId => {
            const achievement = ACHIEVEMENTS[achievementId];
            const progress = this.achievements[achievementId];
            
            // Calculate current progress based on category
            let currentValue = this.getCurrentProgressValue(achievement.category);
            progress.progress = currentValue;

            // Check for tier unlocks
            for (const tier of achievement.tiers) {
                if (currentValue >= tier.requirement && (!progress.unlockedTier || this.getTierLevel(progress.unlockedTier) < this.getTierLevel(tier.level))) {
                    progress.unlockedTier = tier.level;
                    progress.totalRewardsEarned += tier.reward;
                    
                    newUnlocks.push({
                        achievement: achievement,
                        tier: tier,
                        coins: tier.reward
                    });
                }
            }
        });

        this.saveAchievements();
        return newUnlocks;
    }

    /**
     * Get current progress value for achievement category
     */
    getCurrentProgressValue(category) {
        switch (category) {
            case 'lines':
                return this.records.overall.totalLinesCleared;
            case 'games':
                return this.records.overall.totalGamesPlayed;
            case 'score':
                return Math.max(this.records.normal.highScore, this.records.endless.highScore);
            case 'combo':
                return this.records.overall.maxComboEver;
            case 'shapes':
                return this.records.overall.totalShapesPlaced;
            case 'daily':
                return this.records.overall.dailyChallengesCompleted;
            case 'time':
                return this.records.overall.totalPlayTime;
            case 'perfect':
                return this.records.overall.perfectGames;
            default:
                return 0;
        }
    }

    /**
     * Get tier level as number for comparison
     */
    getTierLevel(tier) {
        const levels = { bronze: 1, silver: 2, gold: 3, diamond: 4 };
        return levels[tier] || 0;
    }

    /**
     * Get achievement display data for UI
     */
    getAchievementDisplayData() {
        return Object.keys(ACHIEVEMENTS).map(achievementId => {
            const achievement = ACHIEVEMENTS[achievementId];
            const progress = this.achievements[achievementId];
            
            // Find current and next tier
            let currentTier = null;
            let nextTier = null;
            
            for (const tier of achievement.tiers) {
                if (progress.unlockedTier === tier.level) {
                    currentTier = tier;
                }
                if (!nextTier && progress.progress < tier.requirement) {
                    nextTier = tier;
                }
            }

            // If no next tier, player has completed all tiers
            if (!nextTier && currentTier) {
                nextTier = currentTier; // Show completed state
            }

            return {
                id: achievementId,
                name: achievement.name,
                description: achievement.description,
                icon: achievement.icon,
                category: achievement.category,
                progress: progress.progress,
                currentTier: currentTier,
                nextTier: nextTier,
                isCompleted: currentTier && currentTier.level === 'diamond',
                totalRewards: progress.totalRewardsEarned
            };
        });
    }

    /**
     * Get comprehensive records for display
     */
    getRecordsDisplayData() {
        return {
            overall: {
                'Games Played': this.records.overall.totalGamesPlayed.toLocaleString(),
                'Lines Cleared': this.records.overall.totalLinesCleared.toLocaleString(),
                'Shapes Placed': this.records.overall.totalShapesPlaced.toLocaleString(),
                'Total Play Time': this.formatTime(this.records.overall.totalPlayTime),
                'Coins Earned': this.records.overall.totalCoinsEarned.toLocaleString(),
                'Best Combo Ever': this.records.overall.maxComboEver + 'x',
                'Perfect Games': this.records.overall.perfectGames.toLocaleString(),
                'Daily Challenges': this.records.overall.dailyChallengesCompleted.toLocaleString()
            },
            normal: {
                'High Score': this.records.normal.highScore.toLocaleString(),
                'Average Score': this.records.normal.averageScore.toLocaleString(),
                'Games Played': this.records.normal.gamesPlayed.toLocaleString(),
                'Best Combo': this.records.normal.bestCombo + 'x',
                'Lines Cleared': this.records.normal.totalLinesCleared.toLocaleString(),
                'Longest Session': this.formatTime(this.records.normal.longestSession)
            },
            endless: {
                'High Score': this.records.endless.highScore.toLocaleString(),
                'Average Score': this.records.endless.averageScore.toLocaleString(),
                'Games Played': this.records.endless.gamesPlayed.toLocaleString(),
                'Best Combo': this.records.endless.bestCombo + 'x',
                'Lines Cleared': this.records.endless.totalLinesCleared.toLocaleString(),
                'Longest Session': this.formatTime(this.records.endless.longestSession)
            },
            daily: {
                'Challenges Completed': this.records.daily.challengesCompleted.toLocaleString(),
                'Current Streak': this.records.daily.currentStreak.toLocaleString(),
                'Longest Streak': this.records.daily.longestStreak.toLocaleString(),
                'Average Score': this.records.daily.averageScore.toLocaleString(),
                'Monday Wins': this.records.daily.mondayWins.toLocaleString(),
                'Tuesday Wins': this.records.daily.tuesdayWins.toLocaleString(),
                'Wednesday Wins': this.records.daily.wednesdayWins.toLocaleString(),
                'Thursday Wins': this.records.daily.thursdayWins.toLocaleString(),
                'Friday Wins': this.records.daily.fridayWins.toLocaleString(),
                'Saturday Wins': this.records.daily.saturdayWins.toLocaleString(),
                'Sunday Wins': this.records.daily.sundayWins.toLocaleString()
            }
        };
    }

    /**
     * Format time duration
     */
    formatTime(milliseconds) {
        const hours = Math.floor(milliseconds / 3600000);
        const minutes = Math.floor((milliseconds % 3600000) / 60000);
        const seconds = Math.floor((milliseconds % 60000) / 1000);
        
        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds}s`;
        } else {
            return `${seconds}s`;
        }
    }
}

// Export singleton instance
export const achievementSystem = new AchievementSystem();