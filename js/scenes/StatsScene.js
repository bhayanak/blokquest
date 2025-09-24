/**
 * Enhanced Statistics Scene with Achievements and Comprehensive Records
 */
import { achievementSystem, ACHIEVEMENTS, TIER_COLORS } from '../systems/AchievementSystem.js';
import { themeManager } from '../core/themes.js';

export default class StatsScene extends Phaser.Scene {
    constructor() {
        super({ key: 'StatsScene' });
        this.currentTab = 'achievements'; // achievements, records
        this.scrollOffset = 0;
        this.maxScroll = 0;
    }

    create() {
        const { width, height } = this.cameras.main;
        this.centerX = width / 2;
        this.centerY = height / 2;

        // Create background
        this.createBackground();
        
        // Create header
        this.createHeader();
        
        // Create tab system
        this.createTabSystem();
        
        // Create content area
        this.createContentArea();
        
        // Create navigation
        this.createNavigation();
        
        // Show initial content
        this.showAchievements();
        
        // Setup scrolling
        this.setupScrolling();
    }

    createBackground() {
        const theme = themeManager.getCurrentTheme();
        
        // Dark overlay background
        const overlay = this.add.rectangle(
            this.centerX, 
            this.centerY, 
            this.cameras.main.width, 
            this.cameras.main.height, 
            0x000000
        );
        overlay.setAlpha(0.7);
        
        // Main panel background - larger size for better content display
        const panelWidth = Math.min(550, this.cameras.main.width - 40); // Wider panel
        const panelHeight = Math.min(750, this.cameras.main.height - 40); // Much taller panel
        
        const panelBg = this.add.graphics();
        panelBg.fillGradientStyle(
            parseInt(theme.gridBackground.replace('#', ''), 16),
            parseInt(theme.background.replace('#', ''), 16),
            parseInt(theme.background.replace('#', ''), 16),
            parseInt(theme.gridBackground.replace('#', ''), 16),
            0.95
        );
        panelBg.fillRoundedRect(this.centerX - panelWidth / 2, this.centerY - panelHeight / 2, panelWidth, panelHeight, 15);
        panelBg.lineStyle(3, parseInt(theme.primary.replace('#', ''), 16), 1);
        panelBg.strokeRoundedRect(this.centerX - panelWidth / 2, this.centerY - panelHeight / 2, panelWidth, panelHeight, 15);
    }

    createHeader() {
        const theme = themeManager.getCurrentTheme();
        
        // Main title with theme colors - reduced font size
        this.headerTitle = this.add.text(this.centerX, 60, '📊 STATISTICS & ACHIEVEMENTS', {
            fontSize: '20px',
            fontFamily: 'Arial',
            color: theme.accent,
            fontStyle: 'bold'
        }).setOrigin(0.5);

        // Subtitle
        this.headerSubtitle = this.add.text(this.centerX, 90, 'Track your progress and unlock rewards', {
            fontSize: '14px',
            fontFamily: 'Arial',
            color: theme.textSecondary
        }).setOrigin(0.5);
    }

    createTabSystem() {
        const tabY = 120; // Moved up to give more space for content
        const tabWidth = 160; // Reduced from 200 to prevent clipping
        
        // Achievements tab
        this.achievementsTab = this.createTab('🏆 Achievements', this.centerX - 90, tabY, tabWidth, 'achievements');
        
        // Records tab
        this.recordsTab = this.createTab('📈 Records', this.centerX + 90, tabY, tabWidth, 'records');
        
        // Update tab appearance
        this.updateTabAppearance();
    }

    createTab(text, x, y, width, tabId) {
        const theme = themeManager.getCurrentTheme();
        const tab = this.add.container(x, y);
        
        // Tab background with theme
        const bg = this.add.rectangle(0, 0, width, 40, parseInt(theme.ui.buttonBackground.replace('#', ''), 16), 0.8);
        bg.setStrokeStyle(2, parseInt(theme.ui.borderColor.replace('#', ''), 16));
        
        // Tab text with theme
        const label = this.add.text(0, 0, text, {
            fontSize: '14px',
            fontFamily: 'Arial',
            color: theme.text
        }).setOrigin(0.5);
        
        tab.add([bg, label]);
        tab.setSize(width, 40);
        tab.setInteractive();
        
        tab.on('pointerdown', () => {
            this.currentTab = tabId;
            this.updateTabAppearance();
            this.showContent();
        });
        
        tab.on('pointerover', () => {
            if (this.currentTab !== tabId) {
                bg.setFillStyle(parseInt(theme.ui.buttonHover.replace('#', ''), 16));
            }
        });
        
        tab.on('pointerout', () => {
            if (this.currentTab !== tabId) {
                bg.setFillStyle(parseInt(theme.ui.buttonBackground.replace('#', ''), 16));
            }
        });
        
        // Store references
        tab.bg = bg;
        tab.label = label;
        tab.tabId = tabId;
        
        return tab;
    }

    updateTabAppearance() {
        const theme = themeManager.getCurrentTheme();
        
        // Update achievements tab
        if (this.currentTab === 'achievements') {
            this.achievementsTab.bg.setFillStyle(parseInt(theme.primary.replace('#', ''), 16));
            this.achievementsTab.bg.setStrokeStyle(2, parseInt(theme.accent.replace('#', ''), 16));
            this.achievementsTab.label.setColor(theme.text);
        } else {
            this.achievementsTab.bg.setFillStyle(parseInt(theme.ui.buttonBackground.replace('#', ''), 16));
            this.achievementsTab.bg.setStrokeStyle(2, parseInt(theme.ui.borderColor.replace('#', ''), 16));
            this.achievementsTab.label.setColor(theme.textSecondary);
        }
        
        // Update records tab
        if (this.currentTab === 'records') {
            this.recordsTab.bg.setFillStyle(parseInt(theme.secondary.replace('#', ''), 16));
            this.recordsTab.bg.setStrokeStyle(2, parseInt(theme.accent.replace('#', ''), 16));
            this.recordsTab.label.setColor(theme.text);
        } else {
            this.recordsTab.bg.setFillStyle(parseInt(theme.ui.buttonBackground.replace('#', ''), 16));
            this.recordsTab.bg.setStrokeStyle(2, parseInt(theme.ui.borderColor.replace('#', ''), 16));
            this.recordsTab.label.setColor(theme.textSecondary);
        }
    }

    createContentArea() {
        // Content container for scrolling
        this.contentContainer = this.add.container(0, 0);
        
        // Create mask for scrolling area - wider margins to prevent clipping
        const maskRect = this.add.rectangle(this.centerX, this.centerY + 50, this.cameras.main.width - 80, this.cameras.main.height - 300, 0x000000);
        maskRect.setVisible(false);
        this.contentMask = maskRect.createGeometryMask();
        this.contentContainer.setMask(this.contentMask);
    }

    createNavigation() {
        const theme = themeManager.getCurrentTheme();
        
        // Back button with theme - much smaller size
        const backButton = this.add.text(30, 20, '← Back', {
            fontSize: '12px',
            fontFamily: 'Arial',
            color: theme.accent,
            backgroundColor: theme.ui.buttonBackground,
            padding: { x: 8, y: 4 }
        }).setInteractive();

        backButton.on('pointerdown', () => {
            this.scene.start('MenuScene');
        });

        backButton.on('pointerover', () => {
            backButton.setScale(1.1);
        });

        backButton.on('pointerout', () => {
            backButton.setScale(1.0);
        });

        // Scroll indicators with theme - better positioning and visibility
        this.scrollUpIndicator = this.add.text(this.cameras.main.width - 30, 220, '▲', {
            fontSize: '24px',
            color: theme.text,
            fontStyle: 'bold'
        }).setOrigin(0.5).setAlpha(0).setDepth(1000);

        this.scrollDownIndicator = this.add.text(this.cameras.main.width - 30, this.cameras.main.height - 140, '▼', {
            fontSize: '24px',
            color: theme.text,
            fontStyle: 'bold'
        }).setOrigin(0.5).setAlpha(0).setDepth(1000);
    }

    showContent() {
        // Clear existing content
        this.clearContent();
        
        if (this.currentTab === 'achievements') {
            this.showAchievements();
        } else {
            this.showRecords();
        }
        
        this.scrollOffset = 0;
        this.updateScrollIndicators();
    }

    clearContent() {
        this.contentContainer.removeAll(true);
    }

    showAchievements() {
        const achievements = achievementSystem.getAchievementDisplayData();
        
        // Check if player has any progress on achievements
        const hasProgress = achievements.some(achievement => achievement.progress > 0);
        if (!hasProgress) {
            console.log('🏆 Achievement Info: Start playing BlockQuest to unlock achievements and earn rewards!');
        } else {
            console.log('🏆 Achievements loaded with progress');
        }
        
        const startY = 260; // Much more space to prevent clipping of first card
        const achievementHeight = 110; // Taller cards for better text layout
        
        achievements.forEach((achievement, index) => {
            const y = startY + (index * achievementHeight);
            this.createAchievementCard(achievement, y);
        });
        
        // Calculate maxScroll properly - content height minus visible area
        const totalContentHeight = startY + (achievements.length * achievementHeight) + 100; // Extra padding at bottom
        const visibleAreaHeight = this.cameras.main.height - 180; // Account for header and footer
        this.maxScroll = Math.max(0, totalContentHeight - visibleAreaHeight);
    }

    createAchievementCard(achievement, y) {
        const cardContainer = this.add.container(this.centerX, y);
        
        // Card background - larger and better proportioned
        const cardWidth = Math.min(480, this.cameras.main.width - 100); // Wider cards
        const cardBg = this.add.rectangle(0, 0, cardWidth, 100, 0x1a1a2e, 0.9); // Taller cards (100px)
        cardBg.setStrokeStyle(2, achievement.currentTier ? TIER_COLORS[achievement.currentTier.level] : TIER_COLORS.locked);
        
        // Achievement icon - better vertical alignment
        const iconSize = achievement.currentTier ? 32 : 24;
        const iconColor = achievement.currentTier ? '#FFFFFF' : '#666666';
        const iconX = -(cardWidth/2) + 40; // Safe left margin
        const icon = this.add.text(iconX, -20, achievement.currentTier ? achievement.currentTier.icon : '🔒', {
            fontSize: `${iconSize}px`,
            color: iconColor
        }).setOrigin(0.5);
        
        // Achievement name and tier - better vertical alignment with less top margin
        const tierName = achievement.currentTier ? achievement.currentTier.name : 'Locked';
        const textX = iconX + 60; // Good distance from icon
        const name = this.add.text(textX, -30, `${achievement.name}`, {
            fontSize: '16px',
            fontFamily: 'Arial',
            color: achievement.currentTier ? TIER_COLORS[achievement.currentTier.level] : TIER_COLORS.locked,
            fontStyle: 'bold'
        });
        
        const tier = this.add.text(textX, -10, tierName, {
            fontSize: '12px',
            fontFamily: 'Arial',
            color: '#CCCCCC'
        });
        
        // Description - positioned with better spacing
        const description = this.add.text(textX, 8, achievement.description, {
            fontSize: '10px',
            fontFamily: 'Arial',
            color: '#AAAAAA',
            wordWrap: { width: cardWidth - 140 } // More space for text
        });
        
        // Progress bar - positioned in bottom area with better spacing
        let progressPercent = 0;
        let progressText = '';
        
        if (achievement.nextTier) {
            progressPercent = Math.min(1, achievement.progress / achievement.nextTier.requirement);
            progressText = `${achievement.progress.toLocaleString()} / ${achievement.nextTier.requirement.toLocaleString()}`;
        } else if (achievement.isCompleted) {
            progressPercent = 1;
            progressText = 'COMPLETED';
        } else {
            progressText = 'LOCKED';
        }
        
        // Progress bar - better aligned in bottom area of card
        const progressBarX = 0; // Center of card for better alignment
        const progressBarY = 35; // Bottom area with more space
        const progressWidth = Math.min(200, cardWidth - 80); // Responsive width within card bounds
        const progressBg = this.add.rectangle(progressBarX, progressBarY, progressWidth, 8, 0x333333);
        
        // Progress bar fill - simplified calculation for better alignment
        const fillWidth = progressWidth * progressPercent;
        const fillX = progressBarX - (progressWidth/2) + (fillWidth/2);
        const progressFill = this.add.rectangle(fillX, progressBarY, fillWidth, 8, 
            achievement.currentTier ? TIER_COLORS[achievement.currentTier.level] : TIER_COLORS.bronze);
        
        // Progress text - centered below progress bar within card bounds
        const progressTextObj = this.add.text(progressBarX, progressBarY + 15, progressText, {
            fontSize: '8px',
            fontFamily: 'Arial',
            color: '#CCCCCC',
            wordWrap: { width: progressWidth } // Prevent text overflow
        }).setOrigin(0.5);
        
        // Next tier info - positioned in top right area with better alignment
        if (achievement.nextTier && !achievement.isCompleted) {
            const nextTierX = (cardWidth/2) - 90; // Right side of card
            const nextTierText = this.add.text(nextTierX, -25, `Next: ${achievement.nextTier.name}`, {
                fontSize: '10px',
                fontFamily: 'Arial',
                color: TIER_COLORS[achievement.nextTier.level]
            }).setOrigin(0.5);
            
            const rewardText = this.add.text(nextTierX, -10, `Reward: ${achievement.nextTier.reward} coins`, {
                fontSize: '9px',
                fontFamily: 'Arial',
                color: '#FFD700'
            }).setOrigin(0.5);
            
            cardContainer.add([nextTierText, rewardText]);
        }
        
        // Total rewards earned
        if (achievement.totalRewards > 0) {
            const totalRewards = this.add.text(200, -20, `💰 ${achievement.totalRewards}`, {
                fontSize: '12px',
                fontFamily: 'Arial',
                color: '#FFD700'
            }).setOrigin(0.5);
            cardContainer.add(totalRewards);
        }
        
        cardContainer.add([cardBg, icon, name, tier, description, progressBg, progressFill, progressTextObj]);
        this.contentContainer.add(cardContainer);
        
        // Hover effect
        cardContainer.setInteractive(new Phaser.Geom.Rectangle(-cardBg.width/2, -cardBg.height/2, cardBg.width, cardBg.height), Phaser.Geom.Rectangle.Contains);
        
        cardContainer.on('pointerover', () => {
            cardBg.setStrokeStyle(3, achievement.currentTier ? TIER_COLORS[achievement.currentTier.level] : TIER_COLORS.locked);
            cardContainer.setScale(1.02);
        });
        
        cardContainer.on('pointerout', () => {
            cardBg.setStrokeStyle(2, achievement.currentTier ? TIER_COLORS[achievement.currentTier.level] : TIER_COLORS.locked);
            cardContainer.setScale(1.0);
        });
    }

    showRecords() {
        // Check if we have game data and provide helpful info
        if (achievementSystem.records.overall.totalGamesPlayed === 0) {
            console.log('📊 Stats Info: No games played yet. Play some BlockQuest games to see your statistics and achievements!');
        } else {
            console.log('📊 Stats loaded:', achievementSystem.records.overall.totalGamesPlayed, 'games played');
        }
        
        const records = achievementSystem.getRecordsDisplayData();
        const startY = 260; // Match achievements start position for consistency  
        let currentY = startY;
        
        // Show each category with better spacing
        Object.keys(records).forEach((category, categoryIndex) => {
            currentY = this.createRecordsCategory(category, records[category], currentY);
            currentY += 40; // More space between categories to prevent overlapping
        });
        
        // Calculate maxScroll properly for records - ensure we can scroll to see all content
        const totalContentHeight = currentY + 100; // Add padding at bottom
        const visibleAreaHeight = this.cameras.main.height - 180; // Account for header and footer
        this.maxScroll = Math.max(0, totalContentHeight - visibleAreaHeight);
    }

    createRecordsCategory(categoryName, categoryData, startY) {
        const categoryContainer = this.add.container(this.centerX, startY);
        
        // Category header - wider margins to prevent clipping
        const headerBg = this.add.rectangle(0, 0, this.cameras.main.width - 100, 40, 0x2a2a4a, 0.9);
        headerBg.setStrokeStyle(2, 0x4CAF50);
        
        const categoryIcons = {
            overall: '🌟',
            normal: '🎯',
            endless: '♾️',
            daily: '📅'
        };
        
        const headerText = this.add.text(0, 0, `${categoryIcons[categoryName] || '📊'} ${categoryName.toUpperCase()} RECORDS`, {
            fontSize: '16px',
            fontFamily: 'Arial',
            color: '#FFD700',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        
        categoryContainer.add([headerBg, headerText]);
        this.contentContainer.add(categoryContainer);
        
        let currentY = startY + 50;
        
        // Create records in two columns with better spacing to prevent overlapping
        const records = Object.entries(categoryData);
        const recordsPerColumn = Math.ceil(records.length / 2);
        const maxColumnWidth = Math.min(200, (this.cameras.main.width - 140) / 2); // Smaller width to prevent overlap
        const columnSpacing = Math.min(120, (this.cameras.main.width - 180) / 4); // Better spacing
        
        records.forEach(([key, value], index) => {
            const isLeftColumn = index < recordsPerColumn;
            const columnX = isLeftColumn ? this.centerX - columnSpacing - 40 : this.centerX + columnSpacing + 40; // More separation
            const rowY = currentY + ((index % recordsPerColumn) * 30); // More vertical spacing
            
            const recordContainer = this.add.container(columnX, rowY);
            
            // Record background - smaller to prevent overlap
            const recordBg = this.add.rectangle(0, 0, maxColumnWidth, 24, 0x1a1a2e, 0.7);
            
            // Record label - better positioning
            const label = this.add.text(-maxColumnWidth/2 + 8, 0, key, {
                fontSize: '10px',
                fontFamily: 'Arial',
                color: '#CCCCCC'
            }).setOrigin(0, 0.5);
            
            // Record value - better positioning
            const valueText = this.add.text(maxColumnWidth/2 - 8, 0, value, {
                fontSize: '10px',
                fontFamily: 'Arial',
                color: '#FFFFFF',
                fontStyle: 'bold'
            }).setOrigin(1, 0.5);
            
            recordContainer.add([recordBg, label, valueText]);
            this.contentContainer.add(recordContainer);
        });
        
        return currentY + (recordsPerColumn * 30) + 25; // More space after each category
    }

    setupScrolling() {
        // Mouse wheel scrolling - balanced speed for smooth control
        this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY) => {
            this.scroll(deltaY > 0 ? 20 : -20); // Reduced for smoother scrolling
        });
        
        // Touch scrolling - balanced sensitivity 
        let startY = 0;
        let isDragging = false;
        
        this.input.on('pointerdown', (pointer) => {
            if (pointer.y > 180 && pointer.y < this.cameras.main.height - 100) {
                startY = pointer.y;
                isDragging = true;
            }
        });
        
        this.input.on('pointermove', (pointer) => {
            if (isDragging) {
                const deltaY = startY - pointer.y;
                this.scroll(deltaY * 0.8); // Reduced sensitivity for smoother touch scrolling
                startY = pointer.y;
            }
        });
        
        this.input.on('pointerup', () => {
            isDragging = false;
        });
        
        // Keyboard scrolling for better accessibility
        this.input.keyboard.on('keydown-UP', () => {
            this.scroll(-25);
        });
        
        this.input.keyboard.on('keydown-DOWN', () => {
            this.scroll(25);
        });
    }

    scroll(amount) {
        this.scrollOffset = Phaser.Math.Clamp(this.scrollOffset + amount, 0, this.maxScroll);
        this.contentContainer.y = -this.scrollOffset;
        this.updateScrollIndicators();
    }

    updateScrollIndicators() {
        // Show/hide scroll indicators with better visibility
        const canScrollUp = this.scrollOffset > 5; // Small buffer to avoid flickering
        const canScrollDown = this.scrollOffset < (this.maxScroll - 5);
        
        this.scrollUpIndicator.setAlpha(canScrollUp ? 0.8 : 0.3);
        this.scrollDownIndicator.setAlpha(canScrollDown ? 0.8 : 0.3);
        
        // Add pulsing effect to active indicators
        if (canScrollUp) {
            this.tweens.add({
                targets: this.scrollUpIndicator,
                alpha: 1,
                duration: 500,
                yoyo: true,
                repeat: -1
            });
        }
        
        if (canScrollDown) {
            this.tweens.add({
                targets: this.scrollDownIndicator,
                alpha: 1,
                duration: 500,
                yoyo: true,
                repeat: -1
            });
        }
    }
}