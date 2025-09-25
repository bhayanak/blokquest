// Main game scene for Normal, Daily, and Endless modes
import { GAME_MODES, DIFFICULTY, GRID, TRAY, UI, POWER_UPS, POWER_UP_INFO } from '../core/constants.js';
import { storage } from '../core/storage.js';
import { themeManager } from '../core/themes.js';
import { audioManager } from '../core/audio.js';
import { analyticsManager } from '../core/analytics.js';
import { GameGrid } from '../systems/grid.js';
import { ShapeGenerator } from '../systems/shapes.js';
import { ScoringManager } from '../systems/scoring.js';
import { PowerUpManager } from '../systems/powerups.js';
import { DailyChallenge, markDailyCompleted, isDailyCompleted } from '../systems/DailyChallenge.js';
import { achievementSystem } from '../systems/AchievementSystem.js';
import { hasValidMoves, getTodaysSeed, pixelToGrid } from '../core/utils.js';

export class GameScene extends Phaser.Scene {
    constructor(config = { key: 'GameScene' }) {
        super(config);
        this.gameMode = GAME_MODES.NORMAL;
        this.difficulty = DIFFICULTY.EASY;
        this.gameGrid = null;
        this.shapeGenerator = null;
        this.scoringManager = null;
        this.powerUpManager = null;
        this.dailyChallenge = null;
        this.trayShapes = [];
        this.gameState = 'playing'; // playing, paused, gameover
        this.ui = {};
        this.draggedShape = null;
        this.gameStartTime = 0;
        this.shapesPlacedCount = 0;
        this.initialCoins = 0;
        
        // Game history for undo functionality
        this.gameHistory = [];
        this.maxHistorySize = 5; // Keep last 5 moves
        
        // Power-up state variables
        this.dragSpeedMultiplier = 1.0;
        this.colorHighlights = [];
        this.nextShapes = null;
        this.smartHints = [];
        this.previousCoins = 0;
        
        // Endless mode variables
        this.endlessPressureLevel = 1;
        this.shapeGenerationDelay = 1000;
    }

    init(data) {
        this.gameMode = data.mode || GAME_MODES.NORMAL;
        this.difficulty = data.difficulty || DIFFICULTY.EASY;
        this.gameStartTime = Date.now();
    }

    preload() {
        // Audio assets are already loaded in MenuScene
    }

    create() {
        // Initialize analytics for this game
        analyticsManager.startGame(this.gameMode, this.difficulty);

        // Initialize systems
        this.initializeSystems();

        // Initialize game tracking
        this.gameStartTime = Date.now();
        this.shapesPlacedCount = 0;
        this.initialCoins = storage.getCoins();

        // Create UI
        this.createUI();

        // Create game grid
        this.gameGrid = new GameGrid(this);

        // Reset drag state to ensure clean start
        this.resetDragState();

        // Generate initial shapes
        this.generateTrayShapes();

        // Set up input handlers
        this.setupInputHandlers();

        // Set camera background first (fallback)
        const colors = themeManager.getPhaserColors();
        this.cameras.main.setBackgroundColor(colors.background);
        
        // Apply theme (includes gradient background)
        this.updateTheme();

        console.log(`Started ${this.gameMode} mode with ${this.difficulty} difficulty`);
    }

    /**
     * Update game state every frame
     */
    update() {
        // Update daily challenges
        if (this.gameMode === GAME_MODES.DAILY && this.dailyChallenge) {
            this.updateDailyChallenge();
        }
    }

    /**
     * Update daily challenge progress
     */
    updateDailyChallenge() {
        const challengeType = this.dailyChallenge.challengeType;
        
        // Update Time Attack timer
        if (challengeType === 'timeAttack') {
            this.dailyChallenge.updateTimeAttack();
            
            // Check if time is up
            if (this.dailyChallenge.timeRemaining <= 0) {
                this.gameOver();
                return;
            }
        }
        
        // Update challenge UI
        this.updateChallengeUI();
        
        // Handle mystery grid reveals for Wednesday challenges
        if (challengeType === 'mysteryGrid' && this.lastLinesCleared > 0) {
            this.handleMysteryGridReveal(this.lastLinesCleared);
            this.lastLinesCleared = 0; // Reset to prevent repeated calls
        }
    }

    /**
     * Initialize game systems
     */
    initializeSystems() {
        // Initialize daily challenge if needed
        if (this.gameMode === GAME_MODES.DAILY) {
            this.dailyChallenge = new DailyChallenge();
            const challengeConfig = this.dailyChallenge.startChallenge();
            
            // Configure shape generator based on challenge type
            if (challengeConfig.type === 'shapeMaster') {
                this.shapeGenerator = new ShapeGenerator(this.difficulty, true, challengeConfig.seed, {
                    allowedTypes: challengeConfig.challengeState.allowedShapeTypes
                });
            } else {
                this.shapeGenerator = new ShapeGenerator(this.difficulty, true, challengeConfig.seed);
            }
            
            // Initialize challenge-specific UI elements
            this.initializeChallengeUI(challengeConfig);
        } else {
            this.shapeGenerator = new ShapeGenerator(this.difficulty, false);
        }

        // Initialize scoring manager
        this.scoringManager = new ScoringManager(this.gameMode, this.difficulty);

        // Initialize power-up manager
        this.powerUpManager = new PowerUpManager(this.gameMode);
        this.powerUpManager.registerCallbacks({
            // Basic power-ups
            onClearRow: (rowIndex) => this.clearRow(rowIndex),
            onSwapTray: () => this.swapTray(),
            onExtraUndo: () => this.performUndo(),
            onClearRowActivated: () => this.activateClearRowMode(),
            
            // Advanced power-ups
            onTimeSlow: () => this.activateTimeWarp(),
            onBlockPreview: () => this.activateFutureSight(),
            onLineBlastActivated: () => this.activateLineBlastMode(),
            onColorMatch: () => this.activateColorRadar(),
            onPerfectFit: () => this.activateSmartPlacement(),
            onSecondChance: () => this.activatePhoenixRevival(),
            
            // General
            onPowerUpCancelled: () => this.deactivatePowerUpMode()
        });
    }

    /**
     * Create user interface
     */
    createUI() {
        const colors = themeManager.getPhaserColors();

        // Header section (2 rows)
        this.createHeader();

        // Power-up buttons
        this.createPowerUpButtons();

        // Removed back button and pause button to make more space for game
    }

    /**
     * Create simplified header with only essential info
     */
    createHeader() {
        const theme = themeManager.getCurrentTheme();
        const headerY = 25; // Higher up for more space

        // Single row: Score, Best, Coins, Audio - evenly distributed across the width
        const centerX = this.cameras.main.centerX;
        
        // Score - leftmost
        this.ui.scoreText = this.add.text(centerX - 140, headerY, 'Score: 0', {
            fontSize: '14px', fontFamily: 'Arial', color: theme.text, fontStyle: 'bold'
        }).setOrigin(0.5);

        // High Score - left center
        const highScore = storage.getHighScore(this.gameMode, this.difficulty);
        this.ui.highScoreText = this.add.text(centerX - 45, headerY, `Best: ${highScore}`, {
            fontSize: '12px', fontFamily: 'Arial', color: theme.textSecondary
        }).setOrigin(0.5);

        // Coins - right center with larger icon and highlighting
        this.ui.coinsText = this.add.text(centerX + 45, headerY, `💰 ${storage.getCoins()}`, {
            fontSize: '16px', fontFamily: 'Arial', color: theme.accent, fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 1
        }).setOrigin(0.5);

        // Audio button - rightmost
        this.ui.audioButton = this.createButton(centerX + 140, headerY - 5, 35, 18,
            audioManager.isEnabled() ? '🔊' : '🔇', () => this.toggleAudio());
    }

    /**
     * Create all 9 power-up buttons in compact layout with boundary boxes
     */
    createPowerUpButtons() {
        this.ui.powerUpButtons = [];
        
        // Get all power-ups and their info
        const allPowerUps = Object.values(POWER_UPS);
        const centerX = this.cameras.main.centerX;
        const theme = themeManager.getCurrentTheme();
        
        // Layout configuration - 5 in first row, 4 in second row
        const firstRowCount = 5;
        const secondRowCount = 4;
        const buttonSize = 32; // Slightly smaller buttons
        const spacing = 42; // Tighter spacing
        const startY = 520; // Moved down 20px more for better spacing
        const rowSpacing = 40;

        // Create boundary box for shape tray area
        const trayBoundary = this.add.rectangle(centerX, TRAY.START_Y + 30, 320, 80, 0x000000, 0);
        trayBoundary.setStrokeStyle(2, parseInt(theme.ui.borderColor.replace('#', ''), 16), 0.3);
        trayBoundary.setDepth(-1);

        // Create boundary box for power-ups area
        const powerUpBoundary = this.add.rectangle(centerX, startY + 20, 350, 100, 0x000000, 0);
        powerUpBoundary.setStrokeStyle(2, parseInt(theme.accent.replace('#', ''), 16), 0.3);
        powerUpBoundary.setDepth(-1);

        // First row - 5 power-ups
        const firstRowStartX = centerX - ((firstRowCount - 1) * spacing) / 2;
        for (let i = 0; i < firstRowCount && i < allPowerUps.length; i++) {
            const powerUpType = allPowerUps[i];
            const info = POWER_UP_INFO[powerUpType];
            const x = firstRowStartX + i * spacing;
            
            const button = this.createPowerUpButton(
                x, startY, buttonSize, buttonSize, info.icon, powerUpType
            );
            this.ui.powerUpButtons.push(button);
        }

        // Second row - 4 power-ups
        const secondRowStartX = centerX - ((secondRowCount - 1) * spacing) / 2;
        for (let i = firstRowCount; i < allPowerUps.length; i++) {
            const powerUpType = allPowerUps[i];
            const info = POWER_UP_INFO[powerUpType];
            const x = secondRowStartX + (i - firstRowCount) * spacing;
            
            const button = this.createPowerUpButton(
                x, startY + rowSpacing, buttonSize, buttonSize, info.icon, powerUpType
            );
            this.ui.powerUpButtons.push(button);
        }

        this.updatePowerUpButtons();
    }

    /**
     * Create a compact power-up button with icon and count
     */
    createPowerUpButton(x, y, width, height, icon, powerUpType) {
        const theme = themeManager.getCurrentTheme();

        const container = this.add.container(x, y);

        const button = this.add.rectangle(0, 0, width, height,
            parseInt(theme.ui.buttonBackground.replace('#', ''), 16));
        button.setStrokeStyle(2, parseInt(theme.ui.borderColor.replace('#', ''), 16));
        button.setInteractive({ useHandCursor: true });

        // Icon centered in button
        const iconText = this.add.text(0, -3, icon, {
            fontSize: '16px'
        }).setOrigin(0.5);

        // Count badge in bottom right corner
        const countText = this.add.text(12, 12, '0', {
            fontSize: '8px', fontFamily: 'Arial', color: theme.accent, fontStyle: 'bold'
        }).setOrigin(0.5);

        // Background circle for count
        const countBg = this.add.circle(12, 12, 6, parseInt(theme.ui.borderColor.replace('#', ''), 16));

        container.add([button, iconText, countBg, countText]);

        button.on('pointerdown', () => {
            this.usePowerUp(powerUpType);
        });

        // Add hover tooltip with power-up name
        button.on('pointerover', () => {
            const info = POWER_UP_INFO[powerUpType];
            if (info) {
                this.showPowerUpTooltip(x, y - 25, info.name);
            }
        });

        button.on('pointerout', () => {
            this.hidePowerUpTooltip();
        });

        container.powerUpType = powerUpType;
        container.button = button;
        container.text = iconText;
        container.count = countText;

        return container;
    }

    /**
     * Show power-up tooltip
     */
    showPowerUpTooltip(x, y, name) {
        this.hidePowerUpTooltip(); // Remove any existing tooltip
        
        const theme = themeManager.getCurrentTheme();
        this.powerUpTooltip = this.add.text(x, y, name, {
            fontSize: '10px',
            fontFamily: 'Arial',
            color: theme.text,
            backgroundColor: theme.ui.buttonBackground,
            padding: { x: 6, y: 3 }
        }).setOrigin(0.5);
        this.powerUpTooltip.setDepth(1000);
    }

    /**
     * Hide power-up tooltip
     */
    hidePowerUpTooltip() {
        if (this.powerUpTooltip) {
            this.powerUpTooltip.destroy();
            this.powerUpTooltip = null;
        }
    }

    /**
     * Initialize challenge-specific UI elements
     */
    initializeChallengeUI(challengeConfig) {
        const centerX = this.cameras.main.centerX;
        const theme = themeManager.getCurrentTheme();
        
        // Challenge header with type and description
        this.ui.challengeHeader = this.add.text(centerX, 5, 
            `${challengeConfig.config.icon} ${challengeConfig.config.name}`, {
            fontSize: '16px', 
            fontFamily: 'Arial Bold', 
            color: challengeConfig.config.color,
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5).setDepth(100);
        
        // Challenge-specific UI elements
        switch (challengeConfig.type) {
            case 'timeAttack':
                this.initializeTimeAttackUI();
                break;
            case 'shapeMaster':
                this.initializeShapeMasterUI(challengeConfig.challengeState.allowedShapeTypes);
                break;
            case 'mysteryGrid':
                this.initializeMysteryGridUI(challengeConfig.challengeState.mysteryImage);
                // Initialize milestone tracking
                this.mysteryMilestone25 = false;
                this.mysteryMilestone50 = false;
                this.mysteryMilestone75 = false;
                this.mysteryFullyRevealed = false;
                this.mysteryGuessShown = false;
                this.revealedPixelGraphics = [];
                break;
            case 'cascade':
                this.initializeCascadeUI();
                break;
            case 'speedRun':
                this.initializeSpeedRunUI();
                break;
            case 'zenMode':
                this.initializeZenModeUI();
                break;
            case 'bossBattle':
                this.initializeBossBattleUI(challengeConfig.challengeState.bossHealth, challengeConfig.challengeState.bossWeakness);
                break;
        }
    }

    /**
     * Initialize Time Attack UI (timer)
     */
    initializeTimeAttackUI() {
        const centerX = this.cameras.main.centerX;
        this.ui.timerText = this.add.text(centerX + 100, 25, '3:00', {
            fontSize: '18px',
            fontFamily: 'Arial Bold',
            color: '#FF4444',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5).setDepth(100);
    }

    /**
     * Initialize Shape Master UI (allowed shapes display)
     */
    initializeShapeMasterUI(allowedTypes) {
        const centerX = this.cameras.main.centerX;
        this.ui.allowedShapesText = this.add.text(centerX, 380, 
            `Allowed: ${allowedTypes.join(', ')}`, {
            fontSize: '12px',
            fontFamily: 'Arial',
            color: '#4444FF',
            backgroundColor: 'rgba(0,0,0,0.5)',
            padding: { x: 8, y: 4 }
        }).setOrigin(0.5).setDepth(100);
    }

    /**
     * Initialize Mystery Grid UI (face reveal area)
     */
    initializeMysteryGridUI(mysteryImage) {
        // Mystery images database with detailed pixel art patterns
        this.mysteryImages = {
            'crown': {
                name: 'Crown',
                pattern: [
                    '    ████    ',
                    '   █    █   ',
                    '  █  ██  █  ',
                    ' █   ██   █ ',
                    '█    ██    █',
                    '█████████████',
                    '█████████████'
                ],
                hints: ['👑 Worn by royalty', '✨ Symbol of power and authority', '🏰 Found in castles and palaces'],
                answers: ['crown', 'king crown', 'royal crown', 'golden crown', 'tiara']
            },
            'heart': {
                name: 'Heart',
                pattern: [
                    '  ██  ██  ',
                    ' ████████ ',
                    '███████████',
                    '███████████',
                    ' █████████ ',
                    '  ███████  ',
                    '   █████   ',
                    '    ███    ',
                    '     █     '
                ],
                hints: ['❤️ Symbol of love and affection', '💝 Common on Valentine\'s Day', '🫀 Organ that pumps blood'],
                answers: ['heart', 'love heart', 'valentine heart', 'love']
            },
            'star': {
                name: 'Star',
                pattern: [
                    '     █     ',
                    '    ███    ',
                    '   █████   ',
                    '  ███████  ',
                    '█████████████',
                    ' ███████████ ',
                    '  █████████  ',
                    '   ███ ███   ',
                    '  ███   ███  ',
                    ' ███     ███ ',
                    '███       ███'
                ],
                hints: ['⭐ Shines brightly in the night sky', '🌟 Five-pointed celestial object', '✨ "Twinkle twinkle little..."'],
                answers: ['star', 'five pointed star', 'night star', 'shooting star']
            },
            'house': {
                name: 'House',
                pattern: [
                    '     ∆     ',
                    '    ███    ',
                    '   █████   ',
                    '  ███████  ',
                    ' █████████ ',
                    '███████████',
                    '█  █████  █',
                    '█  █████  █',
                    '█  █████  █',
                    '█  █████  █',
                    '█  █████  █',
                    '███████████'
                ],
                hints: ['🏠 Where families live together', '🚪 Has rooms, doors and windows', '🏡 "Home sweet..."'],
                answers: ['house', 'home', 'building', 'cottage']
            },
            'butterfly': {
                name: 'Butterfly',
                pattern: [
                    '█  █    █  █',
                    '████    ████',
                    '██████████████',
                    '███████████████',
                    '██████████████',
                    '████    ████',
                    '█  █ ██ █  █',
                    '   █████   ',
                    '   █████   ',
                    '   █████   '
                ],
                hints: ['🦋 Beautiful flying insect', '🌸 Loves flowers and nectar', '🐛 Was once a caterpillar'],
                answers: ['butterfly', 'moth', 'flying insect']
            }
        };
        
        // Select random mystery image
        const imageKeys = Object.keys(this.mysteryImages);
        this.currentMysteryKey = imageKeys[Math.floor(Math.random() * imageKeys.length)];
        this.currentMystery = this.mysteryImages[this.currentMysteryKey];
        
        const centerX = this.cameras.main.centerX;
        
        // Create mystery reveal area (positioned over the main grid with transparency)
        const revealAreaX = centerX;
        const revealAreaY = GRID.START_Y + (GRID.ROWS * GRID.CELL_SIZE) / 2;
        
        this.ui.mysteryRevealArea = this.add.rectangle(
            revealAreaX, revealAreaY,
            160, 140,
            0x000066, 0.15  // Very transparent so game grid shows through
        ).setDepth(5);
        
        this.ui.mysteryRevealArea.setStrokeStyle(2, 0xFFD700, 0.8);
        
        // Mystery title (positioned at top right)
        this.ui.mysteryTitle = this.add.text(this.cameras.main.width - 120, 50, 
            '🔍 MYSTERY IMAGE', {
            fontSize: '13px',
            fontFamily: 'Arial',
            color: '#FFD700',
            backgroundColor: 'rgba(0,0,50,0.8)',
            padding: { x: 8, y: 4 },
            fontStyle: 'bold'
        }).setOrigin(0.5).setDepth(100);
        
        // Initialize tracking variables
        this.mysteryLinesCleared = 0;
        this.mysteryPixelsRevealed = 0;
        this.mysteryRevealed = false;
        this.mysteryGuessed = false;
        this.currentHintIndex = 0;
        this.revealedPixels = [];
        this.mysteryPixelGroup = this.add.group();
        
        // Calculate total pixels in pattern
        this.mysteryTotalPixels = this.currentMystery.pattern
            .join('')
            .replace(/ /g, '')
            .length;
        
        // Progress text (positioned at top right, away from grid)
        this.ui.mysteryProgress = this.add.text(this.cameras.main.width - 120, 100, 
            `Lines Cleared: 0/15\nReveal Progress: 0%`, {
            fontSize: '11px',
            fontFamily: 'Arial',
            color: '#FFD700',
            backgroundColor: 'rgba(0,0,50,0.8)',
            padding: { x: 8, y: 4 },
            align: 'center'
        }).setOrigin(0.5).setDepth(100);
        
        // Initial challenge hint
        this.ui.mysteryHint = this.add.text(centerX, 400, 
            '🎯 Clear 15 lines to reveal the mystery image!\n💡 Then guess what it is for bonus rewards!', {
            fontSize: '12px',
            fontFamily: 'Arial',
            color: '#FFD700',
            backgroundColor: 'rgba(0,0,50,0.9)',
            padding: { x: 12, y: 6 },
            align: 'center'
        }).setOrigin(0.5).setDepth(100);
        
        // Store reveal area coordinates for pixel placement
        this.mysteryRevealAreaX = revealAreaX - 80;
        this.mysteryRevealAreaY = revealAreaY - 70;
        
        // Schedule hint disappearance
        this.time.delayedCall(4000, () => {
            if (this.ui.mysteryHint) {
                this.ui.mysteryHint.destroy();
                this.ui.mysteryHint = null;
            }
        });
    }

    /**
     * Initialize Cascade UI (multiplier display)
     */
    initializeCascadeUI() {
        const centerX = this.cameras.main.centerX;
        this.ui.cascadeMultiplier = this.add.text(centerX, 380, 'Cascade: x1.0', {
            fontSize: '16px',
            fontFamily: 'Arial Bold',
            color: '#FFFF44',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5).setDepth(100);
    }

    /**
     * Initialize Speed Run UI (speed level display)
     */
    initializeSpeedRunUI() {
        const centerX = this.cameras.main.centerX;
        this.ui.speedLevel = this.add.text(centerX, 380, 'Speed: Level 1', {
            fontSize: '14px',
            fontFamily: 'Arial Bold',
            color: '#44FFFF',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5).setDepth(100);
    }

    /**
     * Initialize Zen Mode UI (pattern score display)
     */
    initializeZenModeUI() {
        const centerX = this.cameras.main.centerX;
        this.ui.patternScore = this.add.text(centerX, 380, 'Harmony: 0', {
            fontSize: '14px',
            fontFamily: 'Arial Bold',
            color: '#44FF44',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5).setDepth(100);
    }

    /**
     * Initialize Boss Battle UI (health bar and weakness display)
     */
    initializeBossBattleUI(bossHealth, bossWeakness) {
        const centerX = this.cameras.main.centerX;
        
        // Boss health bar
        this.ui.bossHealthBg = this.add.rectangle(centerX, 390, 200, 20, 0x440000).setDepth(100);
        this.ui.bossHealthBar = this.add.rectangle(centerX - 100, 390, 200, 16, 0xFF0000).setOrigin(0, 0.5).setDepth(101);
        
        this.ui.bossHealthText = this.add.text(centerX, 390, `Boss: ${bossHealth}`, {
            fontSize: '12px',
            fontFamily: 'Arial Bold',
            color: '#FFFFFF',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5).setDepth(102);
        
        // Boss weakness display
        this.ui.bossWeaknessText = this.add.text(centerX, 415, 
            `Weakness: ${bossWeakness.name}`, {
            fontSize: '10px',
            fontFamily: 'Arial',
            color: '#FFB000',
            backgroundColor: 'rgba(0,0,0,0.7)',
            padding: { x: 6, y: 2 }
        }).setOrigin(0.5).setDepth(100);
    }

    /**
     * Generate shapes for the tray
     */
    generateTrayShapes() {
        this.trayShapes = this.shapeGenerator.generateShapes(TRAY.SHAPES_COUNT);
        this.renderTrayShapes();
        
        // Update Future Sight display if active
        if (this.futureSightActive) {
            this.nextShapes = this.shapeGenerator.generateShapes(3);
            this.createFutureSightDisplay();
        }
    }

    /**
     * Render shapes in the tray with smaller preview size
     */
    renderTrayShapes() {
        // Clear existing tray graphics and their event listeners
        if (this.ui.trayGraphics) {
            this.ui.trayGraphics.forEach(graphic => {
                if (graphic && !graphic.destroyed) {
                    graphic.removeAllListeners(); // Clean up event listeners
                    graphic.destroy();
                }
            });
        }

        this.ui.trayGraphics = [];
        const colors = themeManager.getPhaserColors();

        this.trayShapes.forEach((shape, index) => {
            if (!shape) return;

            const trayX = TRAY.START_X + index * TRAY.SHAPE_SPACING;
            const trayY = TRAY.START_Y;

            const shapeGraphic = this.add.graphics();
            const blockColor = colors.blockColors[(shape.color - 1) % colors.blockColors.length];

            // Position the graphics container at the tray position
            shapeGraphic.x = trayX;
            shapeGraphic.y = trayY;

            shapeGraphic.fillStyle(blockColor);
            shapeGraphic.lineStyle(2, blockColor, 0.8);

            // Draw shape blocks smaller in tray (preview size)
            const previewSize = GRID.CELL_SIZE * 0.7; // 70% of grid size
            const previewSpacing = previewSize + 1;

            for (let y = 0; y < shape.height; y++) {
                for (let x = 0; x < shape.width; x++) {
                    if (shape.pattern[y][x] === 1) {
                        const blockX = x * previewSpacing;
                        const blockY = y * previewSpacing;

                        this.draw3DBlock(shapeGraphic, blockX, blockY, previewSize, blockColor);
                    }
                }
            }

            // Store shape properties before setting up interactions
            shapeGraphic.shapeIndex = index;
            shapeGraphic.shape = shape;
            shapeGraphic.originalScale = { width: previewSize, spacing: previewSpacing }; // Store original size

            // Set up interactive area and dragging (both done in setupShapeDragAndDrop)
            this.setupShapeDragAndDrop(shapeGraphic, shape.width * previewSpacing, shape.height * previewSpacing);

            this.ui.trayGraphics.push(shapeGraphic);
        });
    }

    /**
     * Set up drag and drop for shapes - Mobile optimized
     */
    setupShapeDragAndDrop(shapeGraphic, hitAreaWidth, hitAreaHeight) {
        // Set up interactive area with proper bounds
        const bounds = new Phaser.Geom.Rectangle(0, 0, hitAreaWidth || 50, hitAreaHeight || 50);
        shapeGraphic.setInteractive(bounds, Phaser.Geom.Rectangle.Contains);
        
        // Make shapes draggable using Phaser's built-in drag system
        this.input.setDraggable(shapeGraphic);

        // Store reference to prevent multiple drags
        shapeGraphic.on('dragstart', (pointer, dragX, dragY) => {
            if (this.gameState !== 'playing') {
                return;
            }

            // Force clean up any existing drag state first
            if (this.draggedShape && this.draggedShape !== shapeGraphic) {
                console.log('🎯 Cleaning up previous drag before starting new one');
                this.cancelDrag();
            }

            // Set this shape as the currently dragged shape
            this.draggedShape = shapeGraphic;
            shapeGraphic.setDepth(100);

            console.log('🎯 Drag started for shape:', shapeGraphic.shape.type, 'index:', shapeGraphic.shapeIndex);

            // Store drag offset for accurate placement
            this.dragOffset = {
                x: pointer.x - shapeGraphic.x,
                y: pointer.y - shapeGraphic.y
            };

            // Create drag preview
            this.startDragPreview(shapeGraphic, pointer);
        });

        shapeGraphic.on('drag', (pointer, dragX, dragY) => {
            if (this.draggedShape !== shapeGraphic || this.gameState !== 'playing') return;

            // Update drag preview
            this.updateDragPreview(pointer);
            
            // Haptic feedback for mobile devices
            if ('vibrate' in navigator) {
                navigator.vibrate(5);
            }
        });

        shapeGraphic.on('dragend', (pointer) => {
            if (this.draggedShape !== shapeGraphic) return;
            
            console.log('🎯 Drag ended for shape:', shapeGraphic.shape.type);
            
            // Complete the drag operation
            this.endDragPreview(pointer);
            
            // Clean up drag state completely
            this.draggedShape = null;
            this.dragOffset = null;
        });

        // Handle edge case where drag gets interrupted
        shapeGraphic.on('pointerout', () => {
            if (this.draggedShape === shapeGraphic) {
                console.log('🎯 Drag interrupted - cleaning up');
                this.cancelDrag();
            }
        });
    }

    /**
     * Start drag preview with mobile touch optimization and shape scaling
     */
    startDragPreview(shapeGraphic, pointer) {
        // Scale up the shape to full grid size when dragging (inline implementation)
        const colors = themeManager.getPhaserColors();
        const blockColor = colors.blockColors[(shapeGraphic.shape.color - 1) % colors.blockColors.length];
        
        // Clear and redraw at full grid size
        shapeGraphic.clear();
        shapeGraphic.fillStyle(blockColor);
        shapeGraphic.lineStyle(2, blockColor, 0.8);

        // Redraw at full grid size
        for (let y = 0; y < shapeGraphic.shape.height; y++) {
            for (let x = 0; x < shapeGraphic.shape.width; x++) {
                if (shapeGraphic.shape.pattern[y][x] === 1) {
                    const blockX = x * (GRID.CELL_SIZE + 2);
                    const blockY = y * (GRID.CELL_SIZE + 2);

                    this.draw3DBlock(shapeGraphic, blockX, blockY, GRID.CELL_SIZE, blockColor);
                }
            }
        }
        
        // Apply touch offset for better mobile experience (finger doesn't obscure shape)
        const touchOffset = this.dragOffset || { x: 0, y: 0 };
        const adjustedX = pointer.x - touchOffset.x;
        const adjustedY = pointer.y - touchOffset.y - 40; // Additional 40px offset above finger
        
        this.gameGrid.showPlacementPreview(shapeGraphic.shape, adjustedX, adjustedY);
        audioManager.playHover();
        
        // Haptic feedback on drag start
        if ('vibrate' in navigator) {
            navigator.vibrate(10); // Slightly stronger vibration for drag start
        }
    }

    /**
     * Update drag preview with enhanced mobile feedback
     */
    updateDragPreview(pointer) {
        if (!this.draggedShape) return;

        // Apply touch offset for better mobile experience
        const touchOffset = this.dragOffset || { x: 0, y: 0 };
        let adjustedX = pointer.x - touchOffset.x;
        let adjustedY = pointer.y - touchOffset.y - 40; // Keep shape above finger
        
        // Apply time warp smoothing for easier placement
        if (this.timeWarpActive && this.lastDragPosition) {
            const smoothFactor = this.dragSpeedMultiplier;
            adjustedX = this.lastDragPosition.x + (adjustedX - this.lastDragPosition.x) * smoothFactor;
            adjustedY = this.lastDragPosition.y + (adjustedY - this.lastDragPosition.y) * smoothFactor;
        }
        
        this.lastDragPosition = { x: adjustedX, y: adjustedY };
        
        // Show placement preview with enhanced visual feedback
        const canPlace = this.gameGrid.showPlacementPreview(this.draggedShape.shape, adjustedX, adjustedY);
        
        // Enhanced audio feedback based on placement validity
        if (canPlace) {
            audioManager.playHover();
        }
        
        // Show smart placement hints if active
        if (this.smartPlacementActive && this.enableSmartHints) {
            this.showSmartPlacementHints(this.draggedShape.shape);
        }
    }

    /**
     * End drag preview and attempt placement with enhanced mobile feedback
     */
    endDragPreview(pointer) {
        if (!this.draggedShape) return;

        const shape = this.draggedShape.shape;
        const shapeIndex = this.draggedShape.shapeIndex;

        // Apply touch offset for accurate placement
        const touchOffset = this.dragOffset || { x: 0, y: 0 };
        const adjustedX = pointer.x - touchOffset.x;
        const adjustedY = pointer.y - touchOffset.y - 40;

        // Save game state BEFORE placing the shape (for undo)
        this.saveGameState();

        if (this.gameGrid.tryPlaceShape(shape, adjustedX, adjustedY)) {
            // Shape was placed successfully
            this.shapesPlacedCount++;

            // Track analytics for successful placement
            const gridPos = pixelToGrid(pointer.x, pointer.y);
            analyticsManager.trackBlockPlacement(shape.type, gridPos, true);

            // Create visual effect for shape placement
            this.createShapePlaceEffect(shape, gridPos.col, gridPos.row);

            // Remove from tray and clean up immediately
            console.log('📦 Removing shape from tray slot:', shapeIndex);
            this.trayShapes[shapeIndex] = null;
            
            // Clean up drag state BEFORE destroying shape
            this.gameGrid.hidePlacementPreview();
            const shapeToDestroy = this.draggedShape;
            this.draggedShape = null;
            this.dragOffset = null;
            this.lastDragPosition = null;
            
            // Now safely destroy the shape
            shapeToDestroy.destroy();
            
            // Update Future Sight display if active (shapes consumed, predictions changed)
            if (this.futureSightActive) {
                this.nextShapes = this.shapeGenerator.generateShapes(3);
                this.createFutureSightDisplay();
            }

            // Play sound and haptic feedback for successful placement
            audioManager.playPlace();
            if ('vibrate' in navigator) {
                navigator.vibrate(25); // Stronger vibration for successful placement
            }

            // Check for completed lines
            this.checkCompletedLines();

            // Handle challenge-specific logic for shape placement
            if (this.gameMode === GAME_MODES.DAILY && this.dailyChallenge) {
                this.handleChallengeShapePlacement(shape);
            }

            // Refill tray when empty - improved mobile logic
            const emptySlots = this.trayShapes.filter(s => s === null).length;
            const totalSlots = this.trayShapes.length;
            
            if (emptySlots === totalSlots) {
                // All shapes used - generate new set
                console.log('🔄 All shapes used, generating new tray shapes');
                this.generateTrayShapes();
            }

            // Check for game over
            this.checkGameOver();
        } else {
            // Track failed placement attempt
            const gridPos = pixelToGrid(pointer.x, pointer.y);
            analyticsManager.trackBlockPlacement(shape.type, gridPos, false);
            
            // Scale shape back to preview size if placement failed (inline implementation)
            const colors = themeManager.getPhaserColors();
            const blockColor = colors.blockColors[(this.draggedShape.shape.color - 1) % colors.blockColors.length];
            
            // Clear and redraw at preview size
            this.draggedShape.clear();
            this.draggedShape.fillStyle(blockColor);
            this.draggedShape.lineStyle(2, blockColor, 0.8);

            // Redraw at preview size
            const previewSize = GRID.CELL_SIZE * 0.7;
            const previewSpacing = previewSize + 1;

            for (let y = 0; y < this.draggedShape.shape.height; y++) {
                for (let x = 0; x < this.draggedShape.shape.width; x++) {
                    if (this.draggedShape.shape.pattern[y][x] === 1) {
                        const blockX = x * previewSpacing;
                        const blockY = y * previewSpacing;

                        this.draw3DBlock(this.draggedShape, blockX, blockY, previewSize, blockColor);
                    }
                }
            }
        }

        // Clean up drag state completely only if shape wasn't placed successfully
        if (this.draggedShape) {
            this.gameGrid.hidePlacementPreview();
            this.draggedShape.setDepth(1);
            this.draggedShape = null;
            this.dragOffset = null;
            this.lastDragPosition = null;
        }
    }

    /**
     * Cancel drag operation - for mobile cleanup
     */
    cancelDrag() {
        if (!this.draggedShape) return;

        console.log('🎯 Canceling drag for shape:', this.draggedShape.shape?.type);

        // Scale shape back to preview size
        const colors = themeManager.getPhaserColors();
        const blockColor = colors.blockColors[(this.draggedShape.shape.color - 1) % colors.blockColors.length];
        
        this.draggedShape.clear();
        this.draggedShape.fillStyle(blockColor);
        this.draggedShape.lineStyle(2, blockColor, 0.8);

        const previewSize = GRID.CELL_SIZE * 0.7;
        const previewSpacing = previewSize + 1;

        for (let y = 0; y < this.draggedShape.shape.height; y++) {
            for (let x = 0; x < this.draggedShape.shape.width; x++) {
                if (this.draggedShape.shape.pattern[y][x] === 1) {
                    const blockX = x * previewSpacing;
                    const blockY = y * previewSpacing;
                    this.draw3DBlock(this.draggedShape, blockX, blockY, previewSize, blockColor);
                }
            }
        }

        // Clean up all drag state
        this.gameGrid.hidePlacementPreview();
        this.draggedShape.setDepth(1);
        this.draggedShape = null;
        this.dragOffset = null;
        this.lastDragPosition = null;
    }

    /**
     * Reset all drag state - called when needed to prevent conflicts
     */
    resetDragState() {
        console.log('🔄 Resetting all drag state');
        this.draggedShape = null;
        this.dragOffset = null;
        this.lastDragPosition = null;
        this.gameGrid.hidePlacementPreview();
    }

    /**
     * Scale shape to full grid size for dragging
     */
    scaleShapeToGridSize(shapeGraphic) {
        const colors = themeManager.getPhaserColors();
        const blockColor = colors.blockColors[(shapeGraphic.shape.color - 1) % colors.blockColors.length];
        
        // Clear current drawing
        shapeGraphic.clear();
        shapeGraphic.fillStyle(blockColor);
        shapeGraphic.lineStyle(2, blockColor, 0.8);

        // Redraw at full grid size
        for (let y = 0; y < shapeGraphic.shape.height; y++) {
            for (let x = 0; x < shapeGraphic.shape.width; x++) {
                if (shapeGraphic.shape.pattern[y][x] === 1) {
                    const blockX = x * (GRID.CELL_SIZE + 2);
                    const blockY = y * (GRID.CELL_SIZE + 2);

                    this.draw3DBlock(shapeGraphic, blockX, blockY, GRID.CELL_SIZE, blockColor);
                }
            }
        }
    }

    /**
     * Scale shape back to preview size
     */
    scaleShapeToPreviewSize(shapeGraphic) {
        const colors = themeManager.getPhaserColors();
        const blockColor = colors.blockColors[(shapeGraphic.shape.color - 1) % colors.blockColors.length];
        
        // Clear current drawing
        shapeGraphic.clear();
        shapeGraphic.fillStyle(blockColor);
        shapeGraphic.lineStyle(2, blockColor, 0.8);

        // Redraw at preview size
        const previewSize = GRID.CELL_SIZE * 0.7;
        const previewSpacing = previewSize + 1;

        for (let y = 0; y < shapeGraphic.shape.height; y++) {
            for (let x = 0; x < shapeGraphic.shape.width; x++) {
                if (shapeGraphic.shape.pattern[y][x] === 1) {
                    const blockX = x * previewSpacing;
                    const blockY = y * previewSpacing;

                    this.draw3DBlock(shapeGraphic, blockX, blockY, previewSize, blockColor);
                }
            }
        }
    }

    /**
     * Check for completed lines and process them
     */
    checkCompletedLines() {
        const { rows, cols } = this.gameGrid.findCompletedLines();

        if (rows.length > 0 || cols.length > 0) {
            // Store lines cleared for challenge logic
            this.lastLinesCleared = rows.length + cols.length;
            
            // Calculate base score
            const result = this.scoringManager.processCompletedLines(rows, cols);
            
            // Apply challenge-specific score multipliers
            if (this.gameMode === GAME_MODES.DAILY && this.dailyChallenge) {
                const challengeMultiplier = this.dailyChallenge.getScoreMultiplier();
                const bonusScore = Math.floor(result.score * (challengeMultiplier - 1));
                if (bonusScore > 0) {
                    this.scoringManager.addScore(bonusScore);
                    this.showFloatingScore(bonusScore, 'CHALLENGE BONUS');
                }
            }

            // Track analytics for line clears
            const totalLinesCleared = rows.length + cols.length;
            analyticsManager.trackLineClear(totalLinesCleared, result.combo);

            // Enhanced haptic feedback for line clearing
            if ('vibrate' in navigator) {
                const vibrationPattern = totalLinesCleared > 1 ? [50, 30, 50] : [50]; // Multi-clear gets multiple pulses
                navigator.vibrate(vibrationPattern);
            }

            // Award coins
            this.scoringManager.awardCoins(result.coins);

            // Track coin earnings
            if (result.coins > 0) {
                analyticsManager.trackCoinsEarned(result.coins, 'line_clear');
            }

            // Add particle effects for line clearing
            this.createLineClearParticles(rows, cols);

            // Clear lines with animation
            this.gameGrid.clearCompletedLines(rows, cols);

            // Update UI
            this.updateUI();

            // Show score popup
            this.showScorePopup(result.score, result.combo);
        } else {
            // Reset combo if no lines cleared
            this.scoringManager.resetCombo();
        }
    }

    /**
     * Check for game over condition
     */
    checkGameOver() {
        const validShapes = this.trayShapes.filter(s => s !== null);

        if (!hasValidMoves(this.gameGrid.grid, validShapes)) {
            // In endless mode, only auto-cleanup if grid is 80% full
            // Otherwise, it's a legitimate game over
            if (this.gameMode === GAME_MODES.ENDLESS) {
                const fillPercentage = this.getGridFillPercentage();
                if (fillPercentage >= 0.8) {
                    this.performEndlessCleanup();
                    return;
                } else {
                    // Grid isn't full enough for cleanup - legitimate game over
                    this.gameOver();
                    return;
                }
            }
            
            this.gameOver();
        }
        
        // In endless mode, also check for grid fullness (80% full triggers cleanup)
        if (this.gameMode === GAME_MODES.ENDLESS) {
            this.checkEndlessFullness();
        }
    }

    /**
     * Handle game over
     */
    gameOver() {
        // Check if Phoenix Revival is active
        if (this.phoenixRevivalActive && this.powerUpManager.usePhoenixRevival()) {
            this.phoenixRevivalActive = false;
            
            // Remove phoenix indicator
            if (this.phoenixIndicator) {
                this.phoenixIndicator.destroy();
                this.phoenixIndicator = null;
            }
            
            // Clear some blocks to give player a chance
            this.performPhoenixRevival();
            
            this.showMessage('Phoenix Revival! You rise from the ashes!', 3000);
            console.log('Phoenix Revival activated - game continues!');
            return; // Don't end the game
        }
        
        this.gameState = 'gameover';

        // Track analytics for game end
        const finalScore = this.scoringManager.currentScore;
        analyticsManager.endGame(finalScore, false); // false = not completed, game over

        // Play game over sound and haptic feedback
        audioManager.playGameOver();
        if ('vibrate' in navigator) {
            navigator.vibrate([100, 50, 100, 50, 200]); // Distinct pattern for game over
        }

        // Save high score
        const isNewHigh = this.scoringManager.saveHighScore();

        // Update mode-specific statistics
        const gameStats = this.getGameStatistics();
        storage.updateModeStats(this.gameMode, gameStats);

        // Update achievements and check for unlocks
        console.log('🎮 GAME OVER - Calling achievementSystem.updateRecords with:', this.gameMode, gameStats);
        const achievementUnlocks = achievementSystem.updateRecords(this.gameMode, gameStats);
        console.log('🏆 Achievement unlocks received:', achievementUnlocks);
        
        // Show game over screen
        this.showGameOverScreen(isNewHigh, achievementUnlocks);

        console.log('Game Over!');
    }

    /**
     * Perform Phoenix Revival - clear some blocks to give player a chance
     */
    performPhoenixRevival() {
        if (!this.gameGrid || !this.gameGrid.grid) return;
        
        const grid = this.gameGrid.grid;
        let cleared = 0;
        
        // Clear some random blocks to create space (about 20% of filled blocks)
        for (let row = 0; row < grid.length; row++) {
            for (let col = 0; col < grid[row].length; col++) {
                if (grid[row][col] > 0 && Math.random() < 0.2) {
                    grid[row][col] = 0;
                    cleared++;
                    
                    // Create phoenix fire effect at cleared positions
                    this.createPhoenixFireEffect(
                        GRID.START_X + col * (GRID.CELL_SIZE + GRID.MARGIN),
                        GRID.START_Y + row * (GRID.CELL_SIZE + GRID.MARGIN)
                    );
                }
            }
        }
        
        // Render the updated grid
        if (cleared > 0) {
            this.gameGrid.render();
            audioManager.playClear();
        }
        
        console.log(`Phoenix Revival cleared ${cleared} blocks`);
    }

    /**
     * Create phoenix fire effect at position
     */
    createPhoenixFireEffect(x, y) {
        const fire = this.add.text(x + GRID.CELL_SIZE / 2, y + GRID.CELL_SIZE / 2, '🔥', {
            fontSize: '20px'
        }).setOrigin(0.5);
        
        this.tweens.add({
            targets: fire,
            y: y - 30,
            alpha: 0,
            scale: 1.5,
            duration: 1000,
            ease: 'Power2',
            onComplete: () => fire.destroy()
        });
    }

    /**
     * Show smart placement hints for optimal positions
     */
    showSmartPlacementHints(shape) {
        // Clear previous hints
        if (this.smartHints) {
            this.smartHints.forEach(hint => hint.destroy());
        }
        this.smartHints = [];
        
        if (!this.gameGrid || !this.gameGrid.grid || !shape) return;
        
        const bestPositions = this.findOptimalPlacements(shape);
        
        bestPositions.slice(0, 3).forEach((pos, index) => {
            // Create hint for each block position of the shape
            for (let r = 0; r < shape.height; r++) {
                for (let c = 0; c < shape.width; c++) {
                    if (shape.pattern[r][c] === 1) {
                        const blockX = GRID.START_X + (pos.col + c) * (GRID.CELL_SIZE + GRID.MARGIN) + GRID.CELL_SIZE / 2;
                        const blockY = GRID.START_Y + (pos.row + r) * (GRID.CELL_SIZE + GRID.MARGIN) + GRID.CELL_SIZE / 2;
                        
                        const hint = this.add.rectangle(
                            blockX,
                            blockY,
                            GRID.CELL_SIZE,
                            GRID.CELL_SIZE,
                            0x00FF00, // Green hint
                            0.2 - index * 0.05 // More transparent for lower-ranked positions
                        );
                        hint.setStrokeStyle(2, 0x00FF00, 0.8 - index * 0.2); // Fade with rank
                        hint.setDepth(3);
                        
                        // Subtle pulsing
                        this.tweens.add({
                            targets: hint,
                            alpha: 0.4 - index * 0.1,
                            duration: 1000,
                            yoyo: true,
                            repeat: -1,
                            ease: 'Sine.easeInOut'
                        });
                        
                        this.smartHints.push(hint);
                    }
                }
            }
            
            // Add ranking indicator for the best position
            if (index === 0) {
                const rankText = this.add.text(
                    GRID.START_X + pos.col * (GRID.CELL_SIZE + GRID.MARGIN) + (shape.width * (GRID.CELL_SIZE + GRID.MARGIN)) / 2,
                    GRID.START_Y + pos.row * (GRID.CELL_SIZE + GRID.MARGIN) - 15,
                    '⭐ BEST',
                    {
                        fontSize: '10px',
                        fontFamily: 'Arial',
                        color: '#00FF00',
                        fontStyle: 'bold',
                        stroke: '#000000',
                        strokeThickness: 1
                    }
                ).setOrigin(0.5);
                rankText.setDepth(4);
                
                this.smartHints.push(rankText);
            }
        });
    }

    /**
     * Find optimal placements for a shape (simplified scoring)
     */
    findOptimalPlacements(shape) {
        const positions = [];
        const grid = this.gameGrid.grid;
        
        for (let row = 0; row <= GRID.ROWS - shape.height; row++) {
            for (let col = 0; col <= GRID.COLS - shape.width; col++) {
                if (this.gameGrid.canPlaceShape(shape, row, col)) {
                    const score = this.calculatePlacementScore(shape, col, row);
                    positions.push({ row, col, score });
                }
            }
        }
        
        return positions.sort((a, b) => b.score - a.score);
    }

    /**
     * Calculate placement score for smart hints
     */
    calculatePlacementScore(shape, col, row) {
        let score = 0;
        
        // Prefer positions that complete lines
        for (let r = row; r < row + shape.height; r++) {
            if (this.wouldCompleteLine(r, 'row')) score += 100;
        }
        for (let c = col; c < col + shape.width; c++) {
            if (this.wouldCompleteLine(c, 'col')) score += 100;
        }
        
        // Prefer positions near existing blocks
        score += this.countAdjacentBlocks(shape, col, row) * 10;
        
        // Prefer corners and edges
        if (row === 0 || row === GRID.ROWS - shape.height) score += 5;
        if (col === 0 || col === GRID.COLS - shape.width) score += 5;
        
        return score;
    }

    /**
     * Check if placing shape would complete a line
     */
    wouldCompleteLine(index, type) {
        const grid = this.gameGrid.grid;
        let count = 0;
        
        if (type === 'row') {
            for (let c = 0; c < GRID.COLS; c++) {
                if (grid[index][c] > 0) count++;
            }
            return count >= GRID.COLS - 1; // Almost complete
        } else {
            for (let r = 0; r < GRID.ROWS; r++) {
                if (grid[r][index] > 0) count++;
            }
            return count >= GRID.ROWS - 1; // Almost complete
        }
    }

    /**
     * Count adjacent blocks for placement scoring
     */
    countAdjacentBlocks(shape, col, row) {
        const grid = this.gameGrid.grid;
        let count = 0;
        
        for (let r = Math.max(0, row - 1); r <= Math.min(GRID.ROWS - 1, row + shape.height); r++) {
            for (let c = Math.max(0, col - 1); c <= Math.min(GRID.COLS - 1, col + shape.width); c++) {
                if (grid[r][c] > 0) count++;
            }
        }
        
        return count;
    }

    /**
     * ENDLESS MODE: Check if grid is 80% full and trigger cleanup
     */
    checkEndlessFullness() {
        const grid = this.gameGrid.grid;
        let filledCells = 0;
        const totalCells = GRID.ROWS * GRID.COLS;
        
        for (let row = 0; row < GRID.ROWS; row++) {
            for (let col = 0; col < GRID.COLS; col++) {
                if (grid[row][col] > 0) filledCells++;
            }
        }
        
        const fillPercentage = filledCells / totalCells;
        
        if (fillPercentage >= 0.8) {
            this.performEndlessCleanup();
            this.showMessage('Grid Overflow! Auto-cleanup activated!', 2000);
        }
    }

    /**
     * ENDLESS MODE: Perform smart cleanup to keep game going
     */
    performEndlessCleanup() {
        if (!this.gameGrid || !this.gameGrid.grid) return;
        
        const grid = this.gameGrid.grid;
        let cleared = 0;
        
        // Strategy 1: Clear incomplete lines first (priority cleanup)
        cleared += this.clearIncompleteLines();
        
        // Strategy 2: If still too full, clear scattered blocks
        if (this.getGridFillPercentage() > 0.6) {
            cleared += this.clearScatteredBlocks();
        }
        
        // Strategy 3: Emergency cleanup - clear random blocks if needed
        if (this.getGridFillPercentage() > 0.7) {
            cleared += this.emergencyCleanup();
        }
        
        // Re-render grid and play effects
        if (cleared > 0) {
            this.gameGrid.render();
            audioManager.playClear();
            
            // Add visual cleanup effect
            this.createCleanupEffect();
            
            // Award points for survival
            const bonusPoints = cleared * 5;
            this.scoringManager.addScore(bonusPoints);
            this.showFloatingScore(bonusPoints, 'SURVIVAL BONUS');
            
            // Check for pressure level increase
            this.updateEndlessPressure();
        }
        
        console.log(`Endless cleanup cleared ${cleared} blocks`);
    }

    /**
     * ENDLESS MODE: Clear incomplete lines (lines with 7-9 blocks)
     */
    clearIncompleteLines() {
        const grid = this.gameGrid.grid;
        let cleared = 0;
        
        // Check rows
        for (let row = 0; row < GRID.ROWS; row++) {
            let count = 0;
            for (let col = 0; col < GRID.COLS; col++) {
                if (grid[row][col] > 0) count++;
            }
            
            // Clear lines that are 70-90% full
            if (count >= 7 && count <= 9) {
                for (let col = 0; col < GRID.COLS; col++) {
                    if (grid[row][col] > 0) {
                        grid[row][col] = 0;
                        cleared++;
                    }
                }
            }
        }
        
        // Check columns
        for (let col = 0; col < GRID.COLS; col++) {
            let count = 0;
            for (let row = 0; row < GRID.ROWS; row++) {
                if (grid[row][col] > 0) count++;
            }
            
            // Clear columns that are 70-90% full
            if (count >= 7 && count <= 9) {
                for (let row = 0; row < GRID.ROWS; row++) {
                    if (grid[row][col] > 0) {
                        grid[row][col] = 0;
                        cleared++;
                    }
                }
            }
        }
        
        return cleared;
    }

    /**
     * ENDLESS MODE: Clear scattered blocks (isolated blocks)
     */
    clearScatteredBlocks() {
        const grid = this.gameGrid.grid;
        let cleared = 0;
        
        for (let row = 0; row < GRID.ROWS; row++) {
            for (let col = 0; col < GRID.COLS; col++) {
                if (grid[row][col] > 0 && this.isIsolatedBlock(row, col)) {
                    grid[row][col] = 0;
                    cleared++;
                    
                    // 30% chance to clear adjacent blocks too
                    if (Math.random() < 0.3) {
                        this.clearAdjacentBlocks(row, col);
                        cleared += this.countAdjacentClearable(row, col);
                    }
                }
            }
        }
        
        return cleared;
    }

    /**
     * ENDLESS MODE: Emergency cleanup - clear random blocks
     */
    emergencyCleanup() {
        const grid = this.gameGrid.grid;
        let cleared = 0;
        
        for (let row = 0; row < GRID.ROWS; row++) {
            for (let col = 0; col < GRID.COLS; col++) {
                if (grid[row][col] > 0 && Math.random() < 0.15) { // 15% chance
                    grid[row][col] = 0;
                    cleared++;
                }
            }
        }
        
        return cleared;
    }

    /**
     * ENDLESS MODE: Check if block is isolated (has few neighbors)
     */
    isIsolatedBlock(row, col) {
        const grid = this.gameGrid.grid;
        let neighbors = 0;
        
        for (let r = Math.max(0, row - 1); r <= Math.min(GRID.ROWS - 1, row + 1); r++) {
            for (let c = Math.max(0, col - 1); c <= Math.min(GRID.COLS - 1, col + 1); c++) {
                if (r !== row || c !== col) {
                    if (grid[r][c] > 0) neighbors++;
                }
            }
        }
        
        return neighbors <= 2; // Isolated if 2 or fewer neighbors
    }

    /**
     * ENDLESS MODE: Get current grid fill percentage
     */
    getGridFillPercentage() {
        const grid = this.gameGrid.grid;
        let filled = 0;
        const total = GRID.ROWS * GRID.COLS;
        
        for (let row = 0; row < GRID.ROWS; row++) {
            for (let col = 0; col < GRID.COLS; col++) {
                if (grid[row][col] > 0) filled++;
            }
        }
        
        return filled / total;
    }

    /**
     * ENDLESS MODE: Update pressure level based on score
     */
    updateEndlessPressure() {
        if (this.gameMode !== GAME_MODES.ENDLESS) return;
        
        const currentScore = this.scoringManager.currentScore;
        const newPressureLevel = Math.floor(currentScore / 100) + 1;
        
        if (!this.endlessPressureLevel) {
            this.endlessPressureLevel = 1;
        }
        
        if (newPressureLevel > this.endlessPressureLevel) {
            this.endlessPressureLevel = newPressureLevel;
            this.applyPressureLevel(this.endlessPressureLevel);
            
            this.showMessage(`PRESSURE LEVEL ${this.endlessPressureLevel}!`, 3000);
            
            // Award pressure level bonus
            const bonus = this.endlessPressureLevel * 50;
            this.scoringManager.addScore(bonus);
            this.showFloatingScore(bonus, `LEVEL ${this.endlessPressureLevel} BONUS`);
        }
    }

    /**
     * ENDLESS MODE: Apply pressure level effects
     */
    applyPressureLevel(level) {
        // Level 1-3: Faster shape generation
        if (level <= 3) {
            // Reduce shape generation delay slightly
            this.shapeGenerationDelay = Math.max(500, 1000 - (level * 100));
        }
        
        // Level 4-6: Add shape complexity
        else if (level <= 6) {
            this.difficulty = level <= 5 ? DIFFICULTY.MEDIUM : DIFFICULTY.HARD;
            this.shapeGenerator.setDifficulty(this.difficulty);
        }
        
        // Level 7-9: Grid effects
        else if (level <= 9) {
            // Randomly add some "obstacle" blocks
            if (Math.random() < 0.3) {
                this.addRandomObstacles(Math.min(3, level - 6));
            }
        }
        
        // Level 10+: Extreme mode
        else {
            // Combination of all effects
            this.difficulty = DIFFICULTY.HARD;
            this.shapeGenerator.setDifficulty(this.difficulty);
            
            if (Math.random() < 0.5) {
                this.addRandomObstacles(Math.min(5, Math.floor(level / 2)));
            }
        }
        
        console.log(`Applied pressure level ${level} effects`);
    }

    /**
     * ENDLESS MODE: Add random obstacle blocks for pressure
     */
    addRandomObstacles(count) {
        const grid = this.gameGrid.grid;
        let added = 0;
        
        for (let i = 0; i < count * 10 && added < count; i++) {
            const row = Math.floor(Math.random() * GRID.ROWS);
            const col = Math.floor(Math.random() * GRID.COLS);
            
            if (grid[row][col] === 0) {
                grid[row][col] = 7; // Special obstacle color
                added++;
            }
        }
        
        if (added > 0) {
            this.gameGrid.render();
            this.showMessage(`${added} obstacles added!`, 1500);
        }
    }

    /**
     * ENDLESS MODE: Create visual cleanup effect
     */
    createCleanupEffect() {
        const centerX = this.cameras.main.centerX;
        const centerY = this.cameras.main.centerY;
        
        // Create expanding ring effect
        const ring = this.add.circle(centerX, centerY, 10, 0x00FF00, 0);
        ring.setStrokeStyle(3, 0x00FF00, 0.8);
        ring.setDepth(10);
        
        this.tweens.add({
            targets: ring,
            radius: 200,
            alpha: 0,
            duration: 1000,
            ease: 'Power2.Out',
            onComplete: () => ring.destroy()
        });
        
        // Add sparkle effects
        for (let i = 0; i < 12; i++) {
            const angle = (i / 12) * Math.PI * 2;
            const sparkle = this.add.text(
                centerX + Math.cos(angle) * 50,
                centerY + Math.sin(angle) * 50,
                '✨', { fontSize: '16px' }
            ).setDepth(11);
            
            this.tweens.add({
                targets: sparkle,
                x: centerX + Math.cos(angle) * 150,
                y: centerY + Math.sin(angle) * 150,
                alpha: 0,
                scale: 0.5,
                duration: 800,
                delay: i * 50,
                ease: 'Power2.Out',
                onComplete: () => sparkle.destroy()
            });
        }
    }

    /**
     * ENDLESS MODE: Clear adjacent blocks around position
     */
    clearAdjacentBlocks(row, col) {
        const grid = this.gameGrid.grid;
        
        for (let r = Math.max(0, row - 1); r <= Math.min(GRID.ROWS - 1, row + 1); r++) {
            for (let c = Math.max(0, col - 1); c <= Math.min(GRID.COLS - 1, col + 1); c++) {
                if (r !== row || c !== col) {
                    grid[r][c] = 0;
                }
            }
        }
    }

    /**
     * ENDLESS MODE: Count clearable adjacent blocks
     */
    countAdjacentClearable(row, col) {
        const grid = this.gameGrid.grid;
        let count = 0;
        
        for (let r = Math.max(0, row - 1); r <= Math.min(GRID.ROWS - 1, row + 1); r++) {
            for (let c = Math.max(0, col - 1); c <= Math.min(GRID.COLS - 1, col + 1); c++) {
                if (r !== row || c !== col && grid[r][c] > 0) {
                    count++;
                }
            }
        }
        
        return count;
    }

    /**
     * Show floating score with custom text
     */
    showFloatingScore(points, text) {
        const centerX = this.cameras.main.centerX;
        const centerY = this.cameras.main.centerY - 100;
        
        const scoreText = this.add.text(centerX, centerY, `+${points}\n${text}`, {
            fontSize: '24px',
            fontFamily: 'Arial Bold',
            color: '#FFD700',
            align: 'center',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5).setDepth(15);
        
        this.tweens.add({
            targets: scoreText,
            y: centerY - 80,
            alpha: 0,
            scale: 1.2,
            duration: 2000,
            ease: 'Power2.Out',
            onComplete: () => scoreText.destroy()
        });
    }

    /**
     * DAILY CHALLENGES: Handle shape placement for challenge-specific logic
     */
    handleChallengeShapePlacement(shape) {
        const challengeType = this.dailyChallenge.challengeType;
        
        switch (challengeType) {
            case 'bossBattle':
                this.handleBossBattleAttack(shape);
                break;
            case 'speedRun':
                this.handleSpeedRunPlacement();
                break;
            case 'zenMode':
                this.handleZenModePlacement();
                break;
        }
        
        // Update challenge progress
        this.dailyChallenge.updateChallenge({
            shapePlaced: shape,
            gridState: this.gameGrid.grid,
            linesCleared: this.lastLinesCleared || 0
        });
        
        // Update challenge UI
        this.updateChallengeUI();
    }

    /**
     * BOSS BATTLE: Handle attack when shape is placed
     */
    handleBossBattleAttack(shape) {
        const attackResult = this.dailyChallenge.updateBossBattle(shape);
        
        if (attackResult.weaknessHit) {
            // Critical hit effect
            this.createBossHitEffect(attackResult.damage, true);
            this.showMessage(`CRITICAL HIT! ${attackResult.damage} damage!`, 2000);
            
            // Boss health updated automatically in dailyChallenge
        } else {
            // Regular attack
            const regularDamage = 10;
            this.dailyChallenge.bossHealth = Math.max(0, this.dailyChallenge.bossHealth - regularDamage);
            this.createBossHitEffect(regularDamage, false);
        }
        
        // Check if boss is defeated
        if (this.dailyChallenge.bossHealth <= 0) {
            this.handleBossDefeat();
        }
    }

    /**
     * BOSS BATTLE: Create boss hit visual effect
     */
    createBossHitEffect(damage, isCritical) {
        const centerX = this.cameras.main.centerX;
        const centerY = this.cameras.main.centerY;
        
        const hitText = this.add.text(centerX, centerY - 100, `-${damage}`, {
            fontSize: isCritical ? '32px' : '24px',
            fontFamily: 'Arial Bold',
            color: isCritical ? '#FF0000' : '#FF8888',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5).setDepth(200);
        
        this.tweens.add({
            targets: hitText,
            y: centerY - 150,
            alpha: 0,
            scale: isCritical ? 1.5 : 1.2,
            duration: 1500,
            ease: 'Power2.Out',
            onComplete: () => hitText.destroy()
        });
        
        // Screen shake for critical hits
        if (isCritical) {
            this.cameras.main.shake(200, 0.02);
        }
    }

    /**
     * BOSS BATTLE: Handle boss defeat
     */
    handleBossDefeat() {
        this.showMessage('🎉 BOSS DEFEATED! 🎉', 4000);
        
        // Victory effect
        this.createVictoryEffect();
        
        // Bonus score
        const victoryBonus = 1000;
        this.scoringManager.addScore(victoryBonus);
        this.showFloatingScore(victoryBonus, 'VICTORY BONUS');
        
        // Play victory sound
        audioManager.playClear(); // Use clear sound as victory for now
    }

    /**
     * BOSS BATTLE: Create victory visual effect
     */
    createVictoryEffect() {
        const centerX = this.cameras.main.centerX;
        const centerY = this.cameras.main.centerY;
        
        // Fireworks effect
        for (let i = 0; i < 15; i++) {
            const angle = (i / 15) * Math.PI * 2;
            const distance = 50 + Math.random() * 100;
            
            const firework = this.add.text(
                centerX + Math.cos(angle) * distance,
                centerY + Math.sin(angle) * distance,
                '🎆', { fontSize: '24px' }
            ).setDepth(200);
            
            this.tweens.add({
                targets: firework,
                x: centerX + Math.cos(angle) * (distance + 100),
                y: centerY + Math.sin(angle) * (distance + 100),
                alpha: 0,
                scale: 0.3,
                duration: 2000,
                delay: i * 100,
                ease: 'Power2.Out',
                onComplete: () => firework.destroy()
            });
        }
    }

    /**
     * SPEED RUN: Handle fast placement bonuses
     */
    handleSpeedRunPlacement() {
        const now = Date.now();
        const timeSinceLastPlacement = now - (this.lastPlacementTime || now);
        
        if (timeSinceLastPlacement < 2000) { // Fast placement
            const speedBonus = Math.floor(50 * this.dailyChallenge.speedLevel);
            this.scoringManager.addScore(speedBonus);
            this.showFloatingScore(speedBonus, 'SPEED BONUS');
        }
        
        this.lastPlacementTime = now;
    }

    /**
     * ZEN MODE: Handle pattern beauty scoring
     */
    handleZenModePlacement() {
        // This is handled automatically in the daily challenge update
        // Additional visual feedback could be added here
        const beautyScore = this.dailyChallenge.patternScore;
        if (beautyScore > 0) {
            this.showMessage(`Beautiful pattern! +${beautyScore} harmony`, 1500);
        }
    }

    /**
     * Update challenge-specific UI elements
     */
    updateChallengeUI() {
        if (!this.dailyChallenge) return;
        
        const challengeType = this.dailyChallenge.challengeType;
        
        switch (challengeType) {
            case 'timeAttack':
                if (this.ui.timerText) {
                    const timeLeft = Math.max(0, this.dailyChallenge.timeRemaining);
                    const minutes = Math.floor(timeLeft / 60000);
                    const seconds = Math.floor((timeLeft % 60000) / 1000);
                    this.ui.timerText.setText(`${minutes}:${seconds.toString().padStart(2, '0')}`);
                    
                    // Change color as time runs out
                    if (timeLeft < 30000) {
                        this.ui.timerText.setColor('#FF0000');
                    } else if (timeLeft < 60000) {
                        this.ui.timerText.setColor('#FF8800');
                    }
                }
                break;
                
            case 'cascade':
                if (this.ui.cascadeMultiplier) {
                    this.ui.cascadeMultiplier.setText(`Cascade: x${this.dailyChallenge.cascadeMultiplier.toFixed(1)}`);
                }
                break;
                
            case 'speedRun':
                if (this.ui.speedLevel) {
                    this.ui.speedLevel.setText(`Speed: Level ${Math.floor(this.dailyChallenge.speedLevel)}`);
                }
                break;
                
            case 'zenMode':
                if (this.ui.patternScore) {
                    this.ui.patternScore.setText(`Harmony: ${this.dailyChallenge.patternScore}`);
                }
                break;
                
            case 'bossBattle':
                if (this.ui.bossHealthBar && this.ui.bossHealthText) {
                    const healthPercent = this.dailyChallenge.bossHealth / this.dailyChallenge.config.bossHealth;
                    this.ui.bossHealthBar.scaleX = healthPercent;
                    this.ui.bossHealthText.setText(`Boss: ${this.dailyChallenge.bossHealth}`);
                    
                    // Change health bar color as boss gets weaker
                    if (healthPercent < 0.3) {
                        this.ui.bossHealthBar.setFillStyle(0xFF8800);
                    } else if (healthPercent < 0.6) {
                        this.ui.bossHealthBar.setFillStyle(0xFFFF00);
                    }
                }
                break;
        }
    }

    /**
     * Handle mystery grid reveals for Wednesday challenges
     */
    handleMysteryGridReveal(linesCleared) {
        if (!this.currentMystery || this.mysteryGuessed) return;
        
        this.mysteryLinesCleared += linesCleared;
        
        // Hide the initial hint after first line clear
        if (this.ui.mysteryHint) {
            this.ui.mysteryHint.destroy();
            this.ui.mysteryHint = null;
        }
        
        // Progressive reveal - only starts revealing after 5 lines
        if (this.mysteryLinesCleared < 5) {
            this.updateMysteryProgress();
            this.showMessage(`Keep clearing lines! (${this.mysteryLinesCleared}/15)`, 1500);
            return;
        }
        
        // Calculate how many pixels to reveal - ONLY reveal a few pixels per line clear
        const pixelsPerLineClear = Math.max(1, Math.floor(this.mysteryTotalPixels / 15)); // Spread across 15 lines
        const pixelsToReveal = pixelsPerLineClear; // Only reveal based on THIS line clear, not total
        
        // Add some pixels to existing revealed pixels
        this.revealMysteryPixels(pixelsToReveal);
        this.updateMysteryProgress();
        
        // Check for milestones
        this.checkMysteryMilestones();
        
        // Show progress feedback
        if (this.mysteryLinesCleared < 15) {
            this.showMessage(`Image revealing... (${this.mysteryLinesCleared}/15 lines)`, 1500);
        }
    }
    
    revealMysteryPixels(count) {
        const pattern = this.currentMystery.pattern;
        let revealed = 0;
        
        // Build list of all possible pixel positions
        const allPixels = [];
        for (let row = 0; row < pattern.length; row++) {
            for (let col = 0; col < pattern[row].length; col++) {
                if (pattern[row][col] !== ' ') {
                    allPixels.push({ row, col });
                }
            }
        }
        
        // Reveal random pixels that haven't been revealed yet
        for (let i = 0; i < count && revealed < count; i++) {
            const availablePixels = allPixels.filter(pixel => 
                !this.revealedPixels.some(p => p.row === pixel.row && p.col === pixel.col)
            );
            
            if (availablePixels.length === 0) break;
            
            const randomPixel = availablePixels[Math.floor(Math.random() * availablePixels.length)];
            this.revealedPixels.push(randomPixel);
            
            // Create visual pixel
            this.createMysteryPixelVisual(randomPixel);
            revealed++;
        }
        
        this.mysteryPixelsRevealed += revealed;
    }
    
    createMysteryPixelVisual(pixel) {
        const pixelSize = 12;
        const pixelX = this.mysteryRevealAreaX + (pixel.col * pixelSize);
        const pixelY = this.mysteryRevealAreaY + (pixel.row * pixelSize);
        
        const pixelGraphic = this.add.rectangle(
            pixelX, pixelY,
            pixelSize - 1, pixelSize - 1,
            0xFFD700, 1.0
        ).setDepth(50);
        
        // Add reveal animation
        pixelGraphic.setScale(0);
        this.tweens.add({
            targets: pixelGraphic,
            scale: 1,
            duration: 300,
            ease: 'Back.easeOut'
        });
        
        this.mysteryPixelGroup.add(pixelGraphic);
    }
    
    updateMysteryProgress() {
        if (this.ui.mysteryProgress) {
            const percentage = Math.floor((this.mysteryPixelsRevealed / this.mysteryTotalPixels) * 100);
            this.ui.mysteryProgress.setText(
                `Lines Cleared: ${this.mysteryLinesCleared}/15\nReveal Progress: ${percentage}%`
            );
        }
    }
    
    checkMysteryMilestones() {
        const percentage = this.mysteryPixelsRevealed / this.mysteryTotalPixels;
        
        // Major milestones with rewards based on actual revealed percentage
        if (percentage >= 0.25 && !this.mysteryMilestone25) {
            this.mysteryMilestone25 = true;
            this.showMessage('🔍 25% revealed! Image taking shape!', 2000);
            this.scoringManager.addScore(200);
        }
        
        if (percentage >= 0.5 && !this.mysteryMilestone50) {
            this.mysteryMilestone50 = true;
            this.showMessage('🎯 50% revealed! Can you guess what it is?', 2500);
            this.scoringManager.addScore(300);
        }
        
        // Full reveal and guessing phase only after 15 lines
        if (this.mysteryLinesCleared >= 15 && !this.mysteryRevealed) {
            this.mysteryRevealed = true;
            this.revealRemainingPixels();
            this.showMysteryGuessDialog();
        }
    }
    
    revealRemainingPixels() {
        // Reveal all remaining pixels with animation
        const pattern = this.currentMystery.pattern;
        for (let row = 0; row < pattern.length; row++) {
            for (let col = 0; col < pattern[row].length; col++) {
                if (pattern[row][col] !== ' ') {
                    const isAlreadyRevealed = this.revealedPixels.some(p => p.row === row && p.col === col);
                    if (!isAlreadyRevealed) {
                        this.time.delayedCall(Math.random() * 1000, () => {
                            this.createMysteryPixelVisual({ row, col });
                        });
                    }
                }
            }
        }
        
        this.mysteryPixelsRevealed = this.mysteryTotalPixels;
        this.updateMysteryProgress();
    }
    
    showMysteryGuessDialog() {
        // Show guess prompt
        this.ui.guessPrompt = this.add.text(this.cameras.main.centerX, 450, 
            `🎯 MYSTERY REVEALED!\nWhat do you think it is?\n\n🔤 Type your guess or click for hint!`, {
            fontSize: '14px',
            fontFamily: 'Arial',
            color: '#FFD700',
            backgroundColor: 'rgba(0,0,100,0.9)',
            padding: { x: 15, y: 10 },
            align: 'center'
        }).setOrigin(0.5).setDepth(200);
        
        // Add guess input functionality
        this.setupMysteryGuessInput();
    }
    
    setupMysteryGuessInput() {
        // Enable keyboard input for guessing
        if (this.input.keyboard) {
            this.guessInput = '';
            this.showGuessInputField();
        }
    }
    
    showGuessInputField() {
        // Create input field visual
        this.ui.inputField = this.add.rectangle(
            this.cameras.main.centerX, 520,
            300, 40,
            0x000080, 0.9
        ).setDepth(200);
        
        this.ui.inputField.setStrokeStyle(2, 0xFFD700);
        
        this.ui.inputText = this.add.text(
            this.cameras.main.centerX, 520,
            'Type your guess here...',
            {
                fontSize: '14px',
                fontFamily: 'Arial',
                color: '#FFFFFF'
            }
        ).setOrigin(0.5).setDepth(201);
        
        // Add hint button
        this.ui.hintButton = this.add.text(
            this.cameras.main.centerX - 80, 570,
            '💡 HINT',
            {
                fontSize: '12px',
                fontFamily: 'Arial',
                color: '#FFD700',
                backgroundColor: 'rgba(100,100,0,0.8)',
                padding: { x: 10, y: 5 }
            }
        ).setOrigin(0.5).setDepth(200).setInteractive();
        
        this.ui.hintButton.on('pointerdown', () => this.showMysteryHint());
        
        // Add submit button
        this.ui.submitButton = this.add.text(
            this.cameras.main.centerX + 80, 570,
            '✅ GUESS',
            {
                fontSize: '12px',
                fontFamily: 'Arial',
                color: '#FFFFFF',
                backgroundColor: 'rgba(0,100,0,0.8)',
                padding: { x: 10, y: 5 }
            }
        ).setOrigin(0.5).setDepth(200).setInteractive();
        
        this.ui.submitButton.on('pointerdown', () => this.submitMysteryGuess());
        
        // Handle keyboard input
        this.input.keyboard.on('keydown', (event) => {
            if (this.mysteryGuessed) return;
            
            if (event.key === 'Enter') {
                this.submitMysteryGuess();
            } else if (event.key === 'Backspace') {
                this.guessInput = this.guessInput.slice(0, -1);
                this.updateGuessDisplay();
            } else if (event.key.length === 1 && this.guessInput.length < 20) {
                this.guessInput += event.key;
                this.updateGuessDisplay();
            }
        });
    }
    
    updateGuessDisplay() {
        if (this.ui.inputText) {
            this.ui.inputText.setText(this.guessInput || 'Type your guess here...');
        }
    }
    
    showMysteryHint() {
        if (this.currentHintIndex >= this.currentMystery.hints.length) {
            this.showMessage('No more hints available!', 2000);
            return;
        }
        
        const hint = this.currentMystery.hints[this.currentHintIndex];
        this.currentHintIndex++;
        
        this.showMessage(`💡 Hint: ${hint}`, 4000);
        this.scoringManager.addScore(-50); // Small penalty for using hints
    }
    
    submitMysteryGuess() {
        if (!this.guessInput || this.guessInput.trim() === '') {
            this.showMessage('Please enter a guess first!', 2000);
            return;
        }
        
        const guess = this.guessInput.toLowerCase().trim();
        const correctAnswers = this.currentMystery.answers;
        
        const isCorrect = correctAnswers.some(answer => 
            answer.toLowerCase() === guess || guess.includes(answer.toLowerCase())
        );
        
        if (isCorrect) {
            this.mysteryGuessed = true;
            this.showMessage(`🎉 CORRECT! It's a ${this.currentMystery.name}!\n+1000 BONUS POINTS!`, 4000);
            this.scoringManager.addScore(1000);
            this.cleanupMysteryGuessUI();
        } else {
            this.showMessage(`❌ Not quite right. Try again!`, 2000);
            this.guessInput = '';
            this.updateGuessDisplay();
        }
    }
    
    cleanupMysteryGuessUI() {
        // Clean up guess interface
        if (this.ui.guessPrompt) this.ui.guessPrompt.destroy();
        if (this.ui.inputField) this.ui.inputField.destroy();
        if (this.ui.inputText) this.ui.inputText.destroy();
        if (this.ui.hintButton) this.ui.hintButton.destroy();
        if (this.ui.submitButton) this.ui.submitButton.destroy();
        
        // Remove keyboard listener
        if (this.input.keyboard) {
            this.input.keyboard.removeAllListeners('keydown');
        }
    }

    /**
     * MYSTERY GRID: Reveal a random pixel from the mystery image
     * @returns {boolean} True if a pixel was actually revealed
     */


    /**
     * Show game over screen with enhanced animations and design
     */
    showGameOverScreen(isNewHighScore, achievementUnlocks = []) {
        const centerX = this.cameras.main.centerX;
        const centerY = this.cameras.main.centerY;
        const theme = themeManager.getCurrentTheme();

        // Enhanced background overlay with dramatic fade-in
        const overlay = this.add.rectangle(centerX, centerY, 500, 700, 0x000000, 0.95);
        overlay.setAlpha(0);
        this.tweens.add({
            targets: overlay,
            alpha: 0.95,
            duration: 800,
            ease: 'Power3.Out'
        });

        // Main panel with glow effect and smoother entrance
        const panel = this.add.rectangle(centerX, centerY, 380, 520, 0x1a1a1a)
            .setStrokeStyle(3, theme.primary);
        panel.setAlpha(0);
        panel.setScale(0.3);
        
        // Panel entrance with elegant bounce
        this.tweens.add({
            targets: panel,
            alpha: 1,
            scaleX: 1,
            scaleY: 1,
            duration: 1000,
            delay: 300,
            ease: 'Elastic.Out'
        });

        // Dramatic Game Over text with multiple effects
        const gameOverText = this.add.text(centerX, centerY - 200, 'GAME OVER', {
            fontSize: '32px', 
            fontFamily: 'Arial Black', 
            color: theme.primary, 
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5);
        
        gameOverText.setScale(0);
        gameOverText.setRotation(-0.1);
        
        // Multi-stage game over animation
        this.tweens.add({
            targets: gameOverText,
            scaleX: 1.2,
            scaleY: 1.2,
            rotation: 0,
            duration: 800,
            delay: 600,
            ease: 'Back.Out'
        });

        // Subtle continuous glow effect for game over text
        this.tweens.add({
            targets: gameOverText,
            alpha: 0.8,
            duration: 2000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
            delay: 1400
        });

        // Enhanced score display with dramatic reveal
        const score = this.scoringManager.currentScore;
        const scoreLabel = this.add.text(centerX, centerY - 150, 'FINAL SCORE', {
            fontSize: '14px', fontFamily: 'Arial', color: theme.textSecondary, fontStyle: 'bold'
        }).setOrigin(0.5);

        const scoreValue = this.add.text(centerX, centerY - 125, score.toLocaleString(), {
            fontSize: '28px', 
            fontFamily: 'Arial Black', 
            color: theme.accent, 
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 1
        }).setOrigin(0.5);

        // Score animation with number counting effect
        scoreLabel.setAlpha(0);
        scoreValue.setAlpha(0);
        scoreValue.setScale(0.5);

        this.tweens.add({
            targets: scoreLabel,
            alpha: 1,
            duration: 600,
            delay: 800,
            ease: 'Power2.Out'
        });

        this.tweens.add({
            targets: scoreValue,
            alpha: 1,
            scaleX: 1,
            scaleY: 1,
            duration: 800,
            delay: 1000,
            ease: 'Bounce.Out'
        });

        // Spectacular high score celebration
        if (isNewHighScore) {
            const newHighText = this.add.text(centerX, centerY - 90, '� NEW HIGH SCORE! �', {
                fontSize: '18px', 
                fontFamily: 'Arial Black', 
                color: '#FFD700', 
                fontStyle: 'bold',
                stroke: '#FF6B00',
                strokeThickness: 2
            }).setOrigin(0.5);

            newHighText.setScale(0);
            
            // Epic high score entrance
            this.tweens.add({
                targets: newHighText,
                scaleX: 1,
                scaleY: 1,
                duration: 1000,
                delay: 1200,
                ease: 'Elastic.Out'
            });

            // Continuous celebration pulsing
            this.tweens.add({
                targets: newHighText,
                scaleX: 1.15,
                scaleY: 1.15,
                duration: 1000,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut',
                delay: 2200
            });

            // Color cycling for extra celebration
            this.tweens.add({
                targets: newHighText,
                tint: 0xFF6B00,
                duration: 1500,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut',
                delay: 2200
            });
        }

        // Enhanced statistics panel with staggered animations
        const stats = this.getGameStatistics();
        const statsY = centerY - 40;

        const statsTitle = this.add.text(centerX, statsY, 'GAME STATISTICS', {
            fontSize: '16px', fontFamily: 'Arial', color: theme.text, fontStyle: 'bold'
        }).setOrigin(0.5);

        statsTitle.setAlpha(0);
        this.tweens.add({
            targets: statsTitle,
            alpha: 1,
            duration: 600,
            delay: 1400,
            ease: 'Power2.Out'
        });

        // Statistics with individual slide-in animations
        const statLines = [
            `Lines Cleared: ${stats.linesCleared}`,
            `Max Combo: ${stats.maxCombo}x`,
            `Shapes Placed: ${stats.shapesPlaced}`,
            `Play Time: ${this.formatTime(stats.playTime)}`,
            `Coins Earned: ${stats.coinsEarned}`
        ];

        statLines.forEach((line, index) => {
            const statText = this.add.text(centerX, statsY + 30 + (index * 20), line, {
                fontSize: '13px', fontFamily: 'Arial', color: theme.textSecondary
            }).setOrigin(0.5);

            statText.setAlpha(0);
            statText.x = centerX - 100; // Start from left

            // Staggered slide-in effect
            this.tweens.add({
                targets: statText,
                alpha: 1,
                x: centerX,
                duration: 500,
                delay: 1600 + (index * 150),
                ease: 'Back.Out'
            });
        });

        // Enhanced performance rating with badge-style display
        const rating = this.calculatePerformanceRating(score, stats);
        const ratingColors = {
            'Novice': '#8E8E93',
            'Beginner': '#34C759', 
            'Intermediate': '#007AFF',
            'Advanced': '#AF52DE',
            'Expert': '#FF9500',
            'Master': '#FF3B30'
        };

        const performanceText = this.add.text(centerX, centerY + 65, `PERFORMANCE: ${rating.toUpperCase()}`, {
            fontSize: '15px', 
            fontFamily: 'Arial', 
            color: ratingColors[rating] || theme.accent, 
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 1
        }).setOrigin(0.5);

        performanceText.setAlpha(0);
        performanceText.setScale(0.8);

        this.tweens.add({
            targets: performanceText,
            alpha: 1,
            scaleX: 1,
            scaleY: 1,
            duration: 600,
            delay: 2200,
            ease: 'Back.Out'
        });

        // Subtle performance rating glow
        this.tweens.add({
            targets: performanceText,
            scaleX: 1.05,
            scaleY: 1.05,
            duration: 2000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
            delay: 2800
        });

        // Daily challenge completion handling with enhanced visuals
        let dailyChallengeOffset = 0;
        if (this.gameMode === GAME_MODES.DAILY && this.dailyChallenge) {
            this.dailyChallenge.completeChallenge(score, stats);
            const rewards = this.dailyChallenge.getRewards();
            
            // Track mode-specific stats for daily challenge completion
            const gameStats = this.getGameStatistics();
            storage.updateModeStats(this.gameMode, gameStats);
            
            // Update achievements for daily challenge completion
            console.log('📅 DAILY CHALLENGE - Calling achievementSystem.updateRecords with:', this.gameMode, gameStats);
            achievementSystem.updateRecords(this.gameMode, gameStats);

            if (rewards) {
                dailyChallengeOffset = 60;
                
                // Enhanced daily challenge completion
                const dailyText = this.add.text(centerX, centerY + 95, '📅 DAILY CHALLENGE COMPLETE!', {
                    fontSize: '16px', 
                    fontFamily: 'Arial', 
                    color: '#4CAF50', 
                    fontStyle: 'bold',
                    stroke: '#000000',
                    strokeThickness: 1
                }).setOrigin(0.5);

                dailyText.setAlpha(0);
                dailyText.setScale(0.5);

                this.tweens.add({
                    targets: dailyText,
                    alpha: 1,
                    scaleX: 1,
                    scaleY: 1,
                    duration: 800,
                    delay: 2400,
                    ease: 'Elastic.Out'
                });

                // Rewards display with coin animation
                const rewardText = this.add.text(centerX, centerY + 120, `💰 +${rewards.coins} COINS EARNED`, {
                    fontSize: '14px', fontFamily: 'Arial', color: theme.accent, fontStyle: 'bold'
                }).setOrigin(0.5);

                rewardText.setAlpha(0);
                this.tweens.add({
                    targets: rewardText,
                    alpha: 1,
                    duration: 600,
                    delay: 3200,
                    ease: 'Power2.Out'
                });

                if (rewards.streakBonus > 0) {
                    const bonusText = this.add.text(centerX, centerY + 140, `🔥 Streak Bonus: +${rewards.streakBonus}`, {
                        fontSize: '12px', fontFamily: 'Arial', color: '#FFD700', fontStyle: 'bold'
                    }).setOrigin(0.5);

                    bonusText.setAlpha(0);
                    this.tweens.add({
                        targets: bonusText,
                        alpha: 1,
                        duration: 600,
                        delay: 3800,
                        ease: 'Power2.Out'
                    });
                }

                // Award the coins
                storage.addCoins(rewards.coins);
            }
        }

        // Show achievement unlock notifications
        let achievementOffset = 0;
        if (achievementUnlocks.length > 0) {
            achievementOffset = this.showAchievementUnlocks(centerX, centerY + 120 + dailyChallengeOffset, achievementUnlocks);
        }

        // Enhanced play again button with better positioning and animation
        const buttonY = centerY + 180 + dailyChallengeOffset + achievementOffset;
        
        const playAgainButton = this.createButton(centerX, buttonY, 160, 40, '🎮 PLAY AGAIN', () => {
            this.scene.restart();
        });

        // Button entrance animation
        playAgainButton.setAlpha(0);
        playAgainButton.setScale(0.8);

        this.tweens.add({
            targets: playAgainButton,
            alpha: 1,
            scaleX: 1,
            scaleY: 1,
            duration: 600,
            delay: 3000 + (dailyChallengeOffset > 0 ? 1000 : 0),
            ease: 'Back.Out'
        });

        // Menu button for easy navigation
        const menuButton = this.createButton(centerX, buttonY + 50, 120, 35, '🏠 MENU', () => {
            this.scene.start('MenuScene');
        });

        menuButton.setAlpha(0);
        menuButton.setScale(0.8);

        this.tweens.add({
            targets: menuButton,
            alpha: 1,
            scaleX: 1,
            scaleY: 1,
            duration: 600,
            delay: 3200 + (dailyChallengeOffset > 0 ? 1000 : 0),
            ease: 'Back.Out'
        });
    }

    /**
     * Get comprehensive game statistics
     */
    getGameStatistics() {
        const playTime = Date.now() - this.gameStartTime;
        const coinsEarned = storage.getCoins() - this.initialCoins;

        const gameStats = {
            score: this.scoringManager.getScore() || 0,
            linesCleared: this.scoringManager.totalLinesCleared || 0,
            maxCombo: this.scoringManager.maxCombo || 0,
            shapesPlaced: this.shapesPlacedCount || 0,
            playTime: playTime,
            coinsEarned: Math.max(0, coinsEarned)
        };
        
        console.log('📊 Game statistics generated:', gameStats);
        return gameStats;
    }

    /**
     * Format time in mm:ss format
     */
    formatTime(milliseconds) {
        const seconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    /**
     * Calculate performance rating based on score and stats
     */
    calculatePerformanceRating(score, stats) {
        const ratings = ['Novice', 'Beginner', 'Intermediate', 'Advanced', 'Expert', 'Master'];

        // Simple rating calculation based on score and efficiency
        let ratingIndex = 0;
        if (score > 1000) ratingIndex = 1;
        if (score > 2500) ratingIndex = 2;
        if (score > 5000) ratingIndex = 3;
        if (score > 10000) ratingIndex = 4;
        if (score > 20000) ratingIndex = 5;

        // Bonus for efficiency (high combo, many lines cleared)
        if (stats.maxCombo > 3) ratingIndex = Math.min(5, ratingIndex + 1);
        if (stats.linesCleared > 20) ratingIndex = Math.min(5, ratingIndex + 1);

        return ratings[ratingIndex];
    }

    /**
     * Share score functionality (placeholder for future social features)
     */
    shareScore(score, stats) {
        const shareText = `I just scored ${score.toLocaleString()} points in BlockQuest! 🎮\nLines cleared: ${stats.linesCleared}, Max combo: ${stats.maxCombo}\nCan you beat my score?`;

        if (navigator.share) {
            navigator.share({
                title: 'BlockQuest High Score',
                text: shareText,
                url: window.location.href
            });
        } else {
            // Fallback: copy to clipboard
            navigator.clipboard.writeText(shareText).then(() => {
                console.log('Score copied to clipboard!');
                // Could show a toast message here
            });
        }
    }

    /**
     * Use a power-up
     */
    usePowerUp(powerUpType) {
        const result = this.powerUpManager.usePowerUp(powerUpType, this.scoringManager.getCurrentScore());

        if (result.success) {
            // Track analytics for power-up usage
            const cost = result.scoreCost || 0;
            analyticsManager.trackPowerUpUsage(powerUpType, cost);

            // Deduct score cost if in endless mode
            if (result.scoreCost && this.gameMode === GAME_MODES.ENDLESS) {
                // This would need to be handled by the scoring system
                console.log(`Power-up cost: ${result.scoreCost} score`);
            }

            this.updatePowerUpButtons();
            this.updateUI();
        } else {
            console.log('Power-up failed:', result.reason);
        }
    }

    /**
     * Clear a specific row (power-up callback)
     */
    clearRow(rowIndex) {
        const success = this.gameGrid.clearRow(rowIndex);
        return { success, blocksCleared: success ? 10 : 0 };
    }

    /**
     * Swap tray shapes (power-up callback)
     */
    swapTray() {
        this.generateTrayShapes();
        return true;
    }

    /**
     * Save current game state to history
     */
    saveGameState() {
        const gameState = {
            grid: this.gameGrid.getGridState(),
            score: this.scoringManager.getCurrentScore(),
            trayShapes: this.trayShapes.map(shape => shape ? shape.clone() : null),
            timestamp: Date.now()
        };
        
        this.gameHistory.push(gameState);
        
        // Keep only the last N states
        if (this.gameHistory.length > this.maxHistorySize) {
            this.gameHistory.shift();
        }
    }

    /**
     * Perform undo (power-up callback)
     */
    performUndo() {
        if (this.gameHistory.length === 0) {
            console.log('No moves to undo');
            return false;
        }
        
        // Get the last saved state
        const previousState = this.gameHistory.pop();
        
        // Restore grid state using the correct method
        this.gameGrid.setGridState(previousState.grid);
        
        // Restore score
        this.scoringManager.setScore(previousState.score);
        
        // Restore tray shapes (simplified - just generate new ones)
        this.generateTrayShapes();
        
        // Update UI
        this.updateUI();
        
        console.log('Game state restored to previous move');
        return true;
    }



    /**
     * Create a button
     */
    createButton(x, y, width, height, text, callback) {
        const theme = themeManager.getCurrentTheme();

        const button = this.add.rectangle(x, y, width, height,
            parseInt(theme.ui.buttonBackground.replace('#', ''), 16));
        button.setStrokeStyle(1, parseInt(theme.ui.borderColor.replace('#', ''), 16));
        button.setInteractive({ useHandCursor: true });

        const buttonText = this.add.text(x, y, text, {
            fontSize: '12px', fontFamily: 'Arial', color: theme.text
        }).setOrigin(0.5);

        button.on('pointerdown', callback);

        return this.add.container(0, 0, [button, buttonText]);
    }

    /**
     * Update UI elements
     */
    updateUI() {
        const score = this.scoringManager.getCurrentScore();
        const coins = storage.getCoins();

        this.ui.scoreText.setText(`Score: ${score.toLocaleString()}`);
        this.ui.coinsText.setText(`💰 ${coins.toLocaleString()}`);
        
        // Add a subtle glow effect to coins when they change
        if (this.previousCoins !== coins) {
            this.tweens.add({
                targets: this.ui.coinsText,
                scaleX: 1.2,
                scaleY: 1.2,
                duration: 200,
                yoyo: true,
                ease: 'Power2'
            });
            this.previousCoins = coins;
        }
    }

    /**
     * Update power-up buttons
     */
    updatePowerUpButtons() {
        this.ui.powerUpButtons.forEach(button => {
            const count = this.powerUpManager.getPowerUpCount(button.powerUpType);
            button.count.setText(count.toString());

            // Update button availability
            const canUse = count > 0 || this.gameMode === GAME_MODES.ENDLESS;
            button.button.setAlpha(canUse ? 1 : 0.5);
        });
    }

    /**
     * Show score popup with enhanced visual effects
     */
    showScorePopup(score, combo) {
        const centerX = this.cameras.main.centerX;
        const centerY = this.cameras.main.centerY - 50;

        let text = `+${score.toLocaleString()}`;
        let color = themeManager.getCurrentTheme().accent;
        let fontSize = '18px';
        
        // Create main score popup
        const popup = this.add.text(centerX, centerY, text, {
            fontSize: fontSize, 
            fontFamily: 'Arial', 
            color: color,
            fontStyle: 'bold',
            stroke: '#000',
            strokeThickness: 2
        }).setOrigin(0.5);

        this.tweens.add({
            targets: popup,
            y: centerY - 60,
            alpha: 0,
            duration: 1500,
            ease: 'Power2',
            onComplete: () => popup.destroy()
        });

        // Add combo effect if applicable
        if (combo > 1) {
            audioManager.playCombo();
            
            const comboText = this.add.text(centerX, centerY - 30, `${combo}x COMBO!`, {
                fontSize: '24px', 
                fontFamily: 'Arial', 
                color: '#FFD700', 
                fontStyle: 'bold', 
                stroke: '#000', 
                strokeThickness: 3
            }).setOrigin(0.5);
            
            this.tweens.add({
                targets: comboText,
                scale: 1.3,
                y: centerY - 80,
                alpha: 0,
                duration: 1200,
                ease: 'Cubic.easeOut',
                onComplete: () => comboText.destroy()
            });
        }
    }

    /**
     * Toggle pause
     */
    togglePause() {
        // Pause functionality removed - no longer needed
        // Players can use browser pause or home button instead
    }

    /**
     * Toggle audio
     */
    toggleAudio() {
        const enabled = audioManager.toggle();
        this.ui.audioButton.list[1].setText(enabled ? '🔊' : '🔇');
    }

    /**
     * Return to main menu
     */
    returnToMenu() {
        // End analytics tracking if game is still active
        if (this.gameState === 'playing') {
            const finalScore = this.scoringManager.currentScore;
            analyticsManager.endGame(finalScore, false); // Player quit
        }

        this.scene.start('MenuScene');
    }

    /**
     * Setup input handlers
     */
    setupInputHandlers() {
        this.input.keyboard.on('keydown-ESC', () => {
            this.returnToMenu();
        });

        this.input.keyboard.on('keydown-SPACE', () => {
            this.togglePause();
        });

        // Add grid click handler for power-ups
        this.input.on('pointerdown', (pointer) => {
            if (this.clearRowModeActive) {
                this.handleClearRowClick(pointer);
            } else if (this.lineBlastModeActive) {
                this.handleLineBlastClick(pointer);
            }
        });
    }

    /**
     * Handle click when clear row mode is active
     */
    handleClearRowClick(pointer) {
        const { row } = pixelToGrid(pointer.x, pointer.y);
        if (row >= 0 && row < 10) {
            const result = this.clearRow(row);
            if (result.success) {
                this.showMessage(`Row ${row + 1} cleared!`, 1000);
            }
            this.clearRowModeActive = false;
            this.deactivatePowerUpMode();
        }
    }

    /**
     * Handle click when line blast mode is active
     */
    handleLineBlastClick(pointer) {
        const { row, col } = pixelToGrid(pointer.x, pointer.y);
        if (row >= 0 && row < 10 && col >= 0 && col < 10) {
            // Clear both row and column
            let cleared = 0;
            const grid = this.gameGrid.grid;
            
            // Clear row
            for (let c = 0; c < grid[row].length; c++) {
                if (grid[row][c] > 0) {
                    grid[row][c] = 0;
                    cleared++;
                }
            }
            
            // Clear column
            for (let r = 0; r < grid.length; r++) {
                if (grid[r][col] > 0) {
                    grid[r][col] = 0;
                    cleared++;
                }
            }
            
            if (cleared > 0) {
                this.scoringManager.addScore(cleared * 15);
                audioManager.playClear();
                this.gameGrid.render();
                this.updateUI();
                this.showMessage(`Line blast! Cleared ${cleared} blocks!`, 1500);
            }
            
            this.lineBlastModeActive = false;
            this.deactivatePowerUpMode();
        }
    }

    /**
     * Show temporary message to user
     */
    showMessage(text, duration = 2000) {
        const centerX = this.cameras.main.centerX;
        const centerY = this.cameras.main.centerY;
        
        const messageText = this.add.text(centerX, centerY, text, {
            fontSize: '18px',
            fontFamily: 'Arial Black',
            color: '#FFFFFF',
            stroke: '#000000',
            strokeThickness: 2,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            padding: { x: 10, y: 5 }
        }).setOrigin(0.5);

        // Animate the message
        this.tweens.add({
            targets: messageText,
            alpha: 0,
            y: centerY - 50,
            duration: duration,
            ease: 'Power2',
            onComplete: () => {
                messageText.destroy();
            }
        });
    }

    /**
     * Update theme
     */
    updateTheme() {
        const colors = themeManager.getPhaserColors();
        const theme = themeManager.getCurrentTheme();
        
        // Create gradient background instead of solid color
        if (this.backgroundGraphics) {
            this.backgroundGraphics.destroy();
        }
        
        this.backgroundGraphics = this.add.graphics();
        this.backgroundGraphics.setDepth(-10); // Put behind everything
        
        // Create a beautiful gradient background
        this.backgroundGraphics.fillGradientStyle(
            parseInt(theme.primary.replace('#', ''), 16),
            parseInt(theme.secondary.replace('#', ''), 16),
            parseInt(theme.accent.replace('#', ''), 16),
            parseInt(theme.background.replace('#', ''), 16),
            0.8
        );
        this.backgroundGraphics.fillRect(0, 0, this.cameras.main.width, this.cameras.main.height);
        
        // Add subtle pattern overlay
        this.backgroundGraphics.fillStyle(0xFFFFFF, 0.03);
        for (let i = 0; i < 20; i++) {
            const x = Math.random() * this.cameras.main.width;
            const y = Math.random() * this.cameras.main.height;
            const size = 20 + Math.random() * 40;
            this.backgroundGraphics.fillCircle(x, y, size);
        }

        if (this.gameGrid) {
            this.gameGrid.updateTheme();
        }

        // Update UI colors would be implemented here
    }

    /**
     * Activate clear row mode
     */
    activateClearRowMode() {
        this.clearRowModeActive = true;
        console.log('Clear row mode activated - click on a row to clear it');
        
        // Show visual indication
        this.showMessage('Click on a row to clear it!', 2000);
    }

    /**
     * Deactivate power-up mode
     */
    deactivatePowerUpMode() {
        // Reset any visual indicators
        this.clearRowModeActive = false;
        this.lineBlastModeActive = false;
        console.log('Power-up mode deactivated');
    }

    /**
     * Activate Time Warp power-up (enhanced time slow)
     */
    activateTimeWarp() {
        // Enable time warp mode with visual effects
        this.timeWarpActive = true;
        this.timeWarpEndTime = Date.now() + 30000; // 30 seconds
        
        // Add visual time warp overlay
        this.createTimeWarpOverlay();
        
        // Slow down drag mechanics for easier placement
        this.dragSpeedMultiplier = 0.7;
        
        console.log('Time Warp activated for 30 seconds');
        this.showMessage('Time Warp Active! Easier placement for 30s', 3000);
        
        // Set timer to deactivate
        this.time.delayedCall(30000, () => {
            this.deactivateTimeWarp();
        });
    }

    /**
     * Deactivate Time Warp
     */
    deactivateTimeWarp() {
        this.timeWarpActive = false;
        this.dragSpeedMultiplier = 1.0;
        
        if (this.timeWarpOverlay) {
            this.timeWarpOverlay.destroy();
            this.timeWarpOverlay = null;
        }
        
        this.showMessage('Time Warp ended', 1500);
    }

    /**
     * Create visual Time Warp overlay
     */
    createTimeWarpOverlay() {
        if (this.timeWarpOverlay) {
            this.timeWarpOverlay.destroy();
        }
        
        this.timeWarpOverlay = this.add.graphics();
        this.timeWarpOverlay.setDepth(-5);
        this.timeWarpOverlay.fillStyle(0x4169E1, 0.1); // Royal blue tint
        this.timeWarpOverlay.fillRect(0, 0, this.cameras.main.width, this.cameras.main.height);
        
        // Pulsing effect
        this.tweens.add({
            targets: this.timeWarpOverlay,
            alpha: 0.2,
            duration: 2000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }

    /**
     * Activate Future Sight power-up (enhanced block preview)
     */
    activateFutureSight() {
        this.futureSightActive = true;
        this.futureSightEndTime = Date.now() + 60000; // 60 seconds
        
        // Generate and show next shapes preview
        this.nextShapes = this.shapeGenerator.generateShapes(3);
        this.createFutureSightDisplay();
        
        console.log('Future Sight activated for 60 seconds');
        this.showMessage('Future Sight Active! Next shapes revealed for 60s', 3000);
        
        // Set timer to deactivate
        this.time.delayedCall(60000, () => {
            this.deactivateFutureSight();
        });
    }

    /**
     * Deactivate Future Sight
     */
    deactivateFutureSight() {
        this.futureSightActive = false;
        this.nextShapes = null;
        
        if (this.futureSightDisplay) {
            this.futureSightDisplay.destroy();
            this.futureSightDisplay = null;
        }
        
        this.showMessage('Future Sight ended', 1500);
    }

    /**
     * Create Future Sight display showing next shapes
     */
    createFutureSightDisplay() {
        if (this.futureSightDisplay) {
            this.futureSightDisplay.destroy();
        }
        
        this.futureSightDisplay = this.add.container(350, 120);
        this.futureSightDisplay.setDepth(10);
        
        // Background panel
        const bg = this.add.rectangle(0, 0, 60, 120, 0x000000, 0.7);
        bg.setStrokeStyle(2, 0x4169E1);
        this.futureSightDisplay.add(bg);
        
        // Title
        const title = this.add.text(0, -45, 'NEXT', {
            fontSize: '8px', fontFamily: 'Arial', color: '#4169E1', fontStyle: 'bold'
        }).setOrigin(0.5);
        this.futureSightDisplay.add(title);
        
        // Show mini previews of next 3 shapes
        this.nextShapes.forEach((shape, index) => {
            const miniShape = this.createMiniShapePreview(shape, 0, -20 + index * 25);
            this.futureSightDisplay.add(miniShape);
        });
    }

    /**
     * Create mini shape preview
     */
    createMiniShapePreview(shape, x, y) {
        const container = this.add.container(x, y);
        const colors = themeManager.getPhaserColors();
        const blockColor = colors.blockColors[(shape.color - 1) % colors.blockColors.length];
        
        const graphics = this.add.graphics();
        graphics.fillStyle(blockColor);
        
        const miniSize = 4; // Very small blocks
        for (let r = 0; r < shape.height; r++) {
            for (let c = 0; c < shape.width; c++) {
                if (shape.pattern[r][c] === 1) {
                    graphics.fillRect(c * miniSize - shape.width * 2, r * miniSize - shape.height * 2, miniSize - 1, miniSize - 1);
                }
            }
        }
        
        container.add(graphics);
        return container;
    }

    /**
     * Activate line blast mode
     */
    activateLineBlastMode() {
        this.lineBlastModeActive = true;
        console.log('Line blast mode activated - click on a row or column');
    }

    /**
     * Activate Color Radar power-up (enhanced color matching)
     */
    activateColorRadar() {
        this.colorRadarActive = true;
        this.colorRadarEndTime = Date.now() + 15000; // 15 seconds
        
        // First, highlight all matching color groups
        this.highlightColorGroups();
        
        console.log('Color Radar activated for 15 seconds');
        this.showMessage('Color Radar Active! Matching blocks highlighted for 15s', 3000);
        
        // Set timer to deactivate
        this.time.delayedCall(15000, () => {
            this.deactivateColorRadar();
        });
        
        return true;
    }

    /**
     * Deactivate Color Radar
     */
    deactivateColorRadar() {
        this.colorRadarActive = false;
        
        // Remove color highlights
        if (this.colorHighlights) {
            this.colorHighlights.forEach(highlight => highlight.destroy());
            this.colorHighlights = [];
        }
        
        this.showMessage('Color Radar ended', 1500);
    }

    /**
     * Highlight color groups on the grid
     */
    highlightColorGroups() {
        if (!this.gameGrid || !this.gameGrid.grid) {
            return;
        }

        // Clear existing highlights
        if (this.colorHighlights) {
            this.colorHighlights.forEach(highlight => highlight.destroy());
        }
        this.colorHighlights = [];

        const grid = this.gameGrid.grid;
        const colors = {};
        
        // Count blocks by color/type
        for (let row = 0; row < grid.length; row++) {
            for (let col = 0; col < grid[row].length; col++) {
                const cell = grid[row][col];
                if (cell > 0) {
                    if (!colors[cell]) {
                        colors[cell] = [];
                    }
                    colors[cell].push({ row, col });
                }
            }
        }

        // Highlight groups with 3+ matching blocks
        for (const [colorType, positions] of Object.entries(colors)) {
            if (positions.length >= 3) {
                positions.forEach(pos => {
                    const highlight = this.add.rectangle(
                        GRID.START_X + pos.col * (GRID.CELL_SIZE + GRID.MARGIN) + GRID.CELL_SIZE / 2,
                        GRID.START_Y + pos.row * (GRID.CELL_SIZE + GRID.MARGIN) + GRID.CELL_SIZE / 2,
                        GRID.CELL_SIZE + 4,
                        GRID.CELL_SIZE + 4,
                        0xFFD700, // Gold highlight
                        0
                    );
                    highlight.setStrokeStyle(3, 0xFFD700, 0.8);
                    highlight.setDepth(5);
                    
                    // Pulsing animation
                    this.tweens.add({
                        targets: highlight,
                        alpha: 0.5,
                        duration: 1000,
                        yoyo: true,
                        repeat: -1,
                        ease: 'Sine.easeInOut'
                    });
                    
                    this.colorHighlights.push(highlight);
                });
            }
        }
    }

    /**
     * Activate Smart Placement power-up (enhanced perfect fit)
     */
    activateSmartPlacement() {
        this.smartPlacementActive = true;
        this.smartPlacementEndTime = Date.now() + 45000; // 45 seconds
        
        // Enable smart placement hints
        this.enableSmartHints = true;
        
        console.log('Smart Placement activated for 45 seconds');
        this.showMessage('Smart Placement Active! Optimal spots highlighted for 45s', 3000);
        
        // Set timer to deactivate
        this.time.delayedCall(45000, () => {
            this.deactivateSmartPlacement();
        });
    }

    /**
     * Deactivate Smart Placement
     */
    deactivateSmartPlacement() {
        this.smartPlacementActive = false;
        this.enableSmartHints = false;
        
        // Remove smart placement hints
        if (this.smartHints) {
            this.smartHints.forEach(hint => hint.destroy());
            this.smartHints = [];
        }
        
        this.showMessage('Smart Placement ended', 1500);
    }

    /**
     * Activate Phoenix Revival power-up (enhanced second chance)
     */
    activatePhoenixRevival() {
        this.phoenixRevivalActive = true;
        
        // Create visual phoenix indicator
        this.createPhoenixIndicator();
        
        console.log('Phoenix Revival activated - you can continue after game over');
        this.showMessage('Phoenix Revival Active! Continue after game over once', 3000);
    }

    /**
     * Create Phoenix Revival indicator
     */
    createPhoenixIndicator() {
        if (this.phoenixIndicator) {
            this.phoenixIndicator.destroy();
        }
        
        this.phoenixIndicator = this.add.text(this.cameras.main.centerX, 50, '🔥 PHOENIX 🔥', {
            fontSize: '14px',
            fontFamily: 'Arial',
            color: '#FF6B00',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 1
        }).setOrigin(0.5);
        
        // Glowing animation
        this.tweens.add({
            targets: this.phoenixIndicator,
            alpha: 0.7,
            scale: 1.1,
            duration: 1500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }

    /**
     * Create colorful particle effects when lines are cleared
     */
    createLineClearParticles(rows, cols) {
        const theme = themeManager.getCurrentTheme();
        const colors = theme.blockColors;
        
        // Create particles for each cleared row
        rows.forEach(row => {
            for (let col = 0; col < GRID.COLS; col++) {
                const x = col * GRID.CELL_SIZE + GRID.CELL_SIZE / 2 + GRID.START_X;
                const y = row * GRID.CELL_SIZE + GRID.CELL_SIZE / 2 + GRID.START_Y;
                this.createParticleBurst(x, y, colors[Math.floor(Math.random() * colors.length)]);
            }
        });

        // Create particles for each cleared column
        cols.forEach(col => {
            for (let row = 0; row < GRID.ROWS; row++) {
                const x = col * GRID.CELL_SIZE + GRID.CELL_SIZE / 2 + GRID.START_X;
                const y = row * GRID.CELL_SIZE + GRID.CELL_SIZE / 2 + GRID.START_Y;
                this.createParticleBurst(x, y, colors[Math.floor(Math.random() * colors.length)]);
            }
        });
    }

    /**
     * Create a burst of particles at a specific location
     */
    createParticleBurst(x, y, color) {
        const particleCount = 8;
        
        for (let i = 0; i < particleCount; i++) {
            const particle = this.add.rectangle(x, y, 4, 4, parseInt(color.replace('#', ''), 16));
            particle.setAlpha(0.9);
            
            // Random direction and speed
            const angle = (Math.PI * 2 * i) / particleCount + (Math.random() - 0.5) * 0.5;
            const speed = 50 + Math.random() * 100;
            const vx = Math.cos(angle) * speed;
            const vy = Math.sin(angle) * speed;
            
            // Animate particle
            this.tweens.add({
                targets: particle,
                x: x + vx,
                y: y + vy,
                scaleX: 0,
                scaleY: 0,
                alpha: 0,
                duration: 500 + Math.random() * 300,
                ease: 'Cubic.easeOut',
                onComplete: () => particle.destroy()
            });
        }
    }

    /**
     * Create visual feedback when shape is placed
     */
    createShapePlaceEffect(shape, gridX, gridY) {
        const theme = themeManager.getCurrentTheme();
        
        shape.pattern.forEach((row, r) => {
            row.forEach((cell, c) => {
                if (cell === 1) {
                    const x = (gridX + c) * GRID.CELL_SIZE + GRID.CELL_SIZE / 2 + GRID.START_X;
                    const y = (gridY + r) * GRID.CELL_SIZE + GRID.CELL_SIZE / 2 + GRID.START_Y;
                    
                    // Flash effect
                    const flash = this.add.rectangle(x, y, GRID.CELL_SIZE, GRID.CELL_SIZE, 0xFFFFFF, 0.8);
                    this.tweens.add({
                        targets: flash,
                        alpha: 0,
                        scaleX: 1.2,
                        scaleY: 1.2,
                        duration: 200,
                        ease: 'Power2',
                        onComplete: () => flash.destroy()
                    });
                }
            });
        });
    }

    /**
     * Draw a 3D colorful block with depth and highlights
     */
    draw3DBlock(graphic, x, y, size, baseColor) {
        const depth = 3; // 3D depth for tray shapes
        
        // Convert color to integer - handle both hex strings and numbers
        let colorInt;
        if (typeof baseColor === 'string') {
            colorInt = parseInt(baseColor.replace('#', ''), 16);
        } else {
            colorInt = baseColor;
        }
        
        // Create lighter shade for highlight (top/left faces)
        const lightColor = this.lightenColor(colorInt, 0.4);
        // Create darker shade for shadow (bottom/right faces)
        const darkColor = this.darkenColor(colorInt, 0.3);
        
        // Draw main face (front)
        graphic.fillStyle(baseColor);
        graphic.fillRect(x, y, size, size);
        
        // Draw top face (3D effect)
        graphic.fillStyle(lightColor);
        graphic.beginPath();
        graphic.moveTo(x, y);
        graphic.lineTo(x + depth, y - depth);
        graphic.lineTo(x + size + depth, y - depth);
        graphic.lineTo(x + size, y);
        graphic.closePath();
        graphic.fillPath();
        
        // Draw right face (3D effect)
        graphic.fillStyle(darkColor);
        graphic.beginPath();
        graphic.moveTo(x + size, y);
        graphic.lineTo(x + size + depth, y - depth);
        graphic.lineTo(x + size + depth, y + size - depth);
        graphic.lineTo(x + size, y + size);
        graphic.closePath();
        graphic.fillPath();
        
        // Add subtle highlight on main face
        graphic.fillStyle(lightColor, 0.3);
        graphic.fillRect(x + 2, y + 2, size * 0.3, size * 0.3);
        
        // Add border to main face
        graphic.lineStyle(1, darkColor, 0.8);
        graphic.strokeRect(x, y, size, size);
    }

    /**
     * Lighten a color by a factor
     */
    lightenColor(color, factor) {
        const r = Math.min(255, Math.floor(((color >> 16) & 0xFF) * (1 + factor)));
        const g = Math.min(255, Math.floor(((color >> 8) & 0xFF) * (1 + factor)));
        const b = Math.min(255, Math.floor((color & 0xFF) * (1 + factor)));
        return (r << 16) | (g << 8) | b;
    }

    /**
     * Darken a color by a factor
     */
    darkenColor(color, factor) {
        const r = Math.floor(((color >> 16) & 0xFF) * (1 - factor));
        const g = Math.floor(((color >> 8) & 0xFF) * (1 - factor));
        const b = Math.floor((color & 0xFF) * (1 - factor));
        return (r << 16) | (g << 8) | b;
    }

    /**
     * Show achievement unlock notifications
     */
    showAchievementUnlocks(centerX, startY, unlocks) {
        if (!unlocks || unlocks.length === 0) return 0;

        let totalHeight = 0;
        let delay = 4000; // Start after other animations

        unlocks.forEach((unlock, index) => {
            const y = startY + (index * 60);
            totalHeight += 60;

            // Achievement unlock container
            const container = this.add.container(centerX, y);

            // Background with tier color
            const tierColors = {
                bronze: 0xCD7F32,
                silver: 0xC0C0C0,
                gold: 0xFFD700,
                diamond: 0xB9F2FF
            };

            const bg = this.add.rectangle(0, 0, 350, 50, 0x000000, 0.9);
            bg.setStrokeStyle(3, tierColors[unlock.tier.level] || 0xFFD700);

            // Achievement icon
            const icon = this.add.text(-150, 0, unlock.tier.icon, {
                fontSize: '24px'
            }).setOrigin(0.5);

            // Achievement text
            const titleText = this.add.text(-120, -8, `🎉 ACHIEVEMENT UNLOCKED!`, {
                fontSize: '12px',
                fontFamily: 'Arial',
                color: '#FFD700',
                fontStyle: 'bold'
            });

            const nameText = this.add.text(-120, 8, unlock.tier.name, {
                fontSize: '14px',
                fontFamily: 'Arial',
                color: tierColors[unlock.tier.level] ? `#${tierColors[unlock.tier.level].toString(16).padStart(6, '0')}` : '#FFD700',
                fontStyle: 'bold'
            });

            // Coin reward
            const coinText = this.add.text(140, 0, `+${unlock.coins} 💰`, {
                fontSize: '16px',
                fontFamily: 'Arial',
                color: '#FFD700',
                fontStyle: 'bold'
            }).setOrigin(0.5);

            container.add([bg, icon, titleText, nameText, coinText]);

            // Animation
            container.setAlpha(0);
            container.setScale(0.8);

            this.tweens.add({
                targets: container,
                alpha: 1,
                scaleX: 1,
                scaleY: 1,
                duration: 800,
                delay: delay + (index * 500),
                ease: 'Back.Out'
            });

            // Sparkle effect
            this.time.delayedCall(delay + (index * 500) + 400, () => {
                this.createSparkleEffect(centerX, y, tierColors[unlock.tier.level] || 0xFFD700);
            });

            // Award coins
            storage.addCoins(unlock.coins);
        });

        return totalHeight + 20; // Extra spacing
    }

    /**
     * Create sparkle effect for achievement unlocks
     */
    createSparkleEffect(x, y, color) {
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const distance = 60;
            const sparkleX = x + Math.cos(angle) * distance;
            const sparkleY = y + Math.sin(angle) * distance;

            const sparkle = this.add.text(sparkleX, sparkleY, '✨', {
                fontSize: '16px'
            }).setOrigin(0.5);

            this.tweens.add({
                targets: sparkle,
                alpha: 0,
                scale: 1.5,
                x: sparkleX + Math.cos(angle) * 20,
                y: sparkleY + Math.sin(angle) * 20,
                duration: 1000,
                ease: 'Power2.Out',
                onComplete: () => sparkle.destroy()
            });
        }
    }
}