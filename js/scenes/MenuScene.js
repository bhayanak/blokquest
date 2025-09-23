// Main menu scene for BlockQuest
import { GAME_MODES, DIFFICULTY, UI, POWER_UPS, POWER_UP_INFO, POWER_UP_COSTS } from '../core/constants.js';
import { storage } from '../core/storage.js';
import { themeManager } from '../core/themes.js';
import { audioManager } from '../core/audio.js';
import { analyticsManager } from '../core/analytics.js';
import { DailyChallenge, isDailyCompleted, getTodaysDateString } from '../systems/DailyChallenge.js';

export class MenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MenuScene' });
        this.selectedDifficulty = storage.getDifficulty();
        this.selectedTheme = storage.getTheme();
        this.menuElements = {};
        this.animationTweens = [];
        this.musicStarted = false;
        this.currentShopCategory = 'all'; // Initialize shop category
        this.difficultyButtons = []; // Track all difficulty buttons
    }

    preload() {
        // Load audio assets properly
        console.log('📥 Preloading audio assets...');

        // Load audio files directly in preload
        this.load.audio('place', 'assets/place.wav');
        this.load.audio('clear', 'assets/clear.wav');
        this.load.audio('gameover', 'assets/gameover.wav');
        this.load.audio('combo', 'assets/combo.wav');
        this.load.audio('hover', 'assets/hover.wav');
        this.load.audio('bgmusic', 'assets/sfx.wav');

        // Logo is already loaded in LoadingScene
        // this.load.image('logo', 'assets/logo.png');
    }

    create() {
        // Initialize analytics session
        analyticsManager.startSession();

        // Initialize audio - assets should now be loaded
        audioManager.scene = this;
        audioManager.initialized = true;
        audioManager.createSounds();

        // Don't start background music automatically (Chrome AudioContext restriction)
        // Music will start on first user interaction

        // Apply current theme with gradient background
        this.createGradientBackground();
        const colors = themeManager.getPhaserColors();

        // Create UI elements
        this.createTitle();
        this.createMainMenu();
        this.createSettingsPanel();
        this.createStatisticsPanel();
        this.createPowerUpShop();

        // Set up input handlers
        this.setupInputHandlers();

        // Start title animation
        this.startTitleAnimation();
    }

    /**
     * Create animated title with much better visuals
     */
    createTitle() {
        const centerX = this.cameras.main.centerX;
        const theme = themeManager.getCurrentTheme();

        // Background glow effect
        const glow = this.add.graphics();
        glow.fillGradientStyle(0x000000, 0x000000, theme.primary, theme.secondary, 0.3);
        glow.fillRect(0, 0, this.cameras.main.width, 200);

        // Logo with animation - smaller and positioned above title
        if (this.textures.exists('logo')) {
            this.menuElements.logo = this.add.image(centerX, 65, 'logo');
            this.menuElements.logo.setScale(0.3); // Much smaller logo
            this.menuElements.logo.setTint(parseInt(theme.accent.replace('#', '0x')));

            // Gentle logo floating animation
            this.tweens.add({
                targets: this.menuElements.logo,
                y: 68,
                duration: 2000,
                ease: 'Sine.easeInOut',
                yoyo: true,
                repeat: -1
            });
        }

        // Rainbow title - each letter in different color
        this.menuElements.title = this.createRainbowTitle(centerX-70, 105, 'BLOCK QUEST');

        // Title pulse animation
        this.tweens.add({
            targets: this.menuElements.title,
            scale: 1.05,
            duration: 1500,
            ease: 'Sine.easeInOut',
            yoyo: true,
            repeat: -1
        });

        // Animated subtitle
        this.menuElements.subtitle = this.add.text(centerX, 165, '🎮 Epic Puzzle Adventure 🎮', {
            fontSize: '16px',
            fontFamily: 'Arial, sans-serif',
            color: theme.accent,
            fontStyle: 'bold'
        });
        this.menuElements.subtitle.setOrigin(0.5);

        // Subtitle typing effect
        this.tweens.add({
            targets: this.menuElements.subtitle,
            alpha: 0.7,
            duration: 800,
            ease: 'Power2',
            yoyo: true,
            repeat: -1
        });
    }

    /**
     * Create main menu buttons
     */
    createMainMenu() {
        const centerX = this.cameras.main.centerX;
        const startY = 220;
        const buttonHeight = 45;
        const buttonSpacing = 10;

        // Game mode buttons with better layout and colors
        const modes = [
            { key: GAME_MODES.NORMAL, label: '🎮 CLASSIC', color: '#4CAF50' },
            { key: GAME_MODES.DAILY, label: '🗓️ DAILY', color: '#FF9800' },
            { key: GAME_MODES.ENDLESS, label: '♾️ ENDLESS', color: '#2196F3' },
            { key: GAME_MODES.ADVENTURE, label: '🗺️ ADVENTURE', color: '#9C27B0' },
            { key: GAME_MODES.PUZZLE, label: '🧩 PUZZLE', color: '#F44336' },
            { key: 'shop', label: '🛒 SHOP', color: '#FFD700' }
        ];

        this.menuElements.modeButtons = [];

        modes.forEach((mode, index) => {
            const row = Math.floor(index / 2);
            const col = index % 2;
            const x = centerX + (col === 0 ? -100 : 100);
            const y = startY + row * (buttonHeight + buttonSpacing);

            let buttonLabel = mode.label;
            let button;

            // Special handling for daily challenge
            if (mode.key === GAME_MODES.DAILY) {
                const isCompleted = isDailyCompleted();
                if (isCompleted) {
                    buttonLabel = '📅 DAILY ✅';
                }
            }

            // Special handling for puzzle mode - create disabled button
            if (mode.key === GAME_MODES.PUZZLE) {
                button = this.createDisabledMenuButton(x, y, 190, buttonHeight, buttonLabel, 'Coming Soon');
            } else {
                button = this.createMenuButton(x, y, 190, buttonHeight, buttonLabel, () => {
                    this.selectGameMode(mode.key);
                });
            }

            this.menuElements.modeButtons.push({ button });
        });

        // Settings and stats buttons
        const bottomY = startY + Math.ceil(modes.length / 2) * (buttonHeight + buttonSpacing) + 30;

        this.menuElements.settingsButton = this.createMenuButton(
            centerX - 70, bottomY, 120, 40, '⚙️ SETTINGS', () => this.showSettings()
        );

        this.menuElements.statsButton = this.createMenuButton(
            centerX + 70, bottomY, 120, 40, '📊 STATS', () => this.showStatistics()
        );

        // Difficulty and theme toggles without text labels
        this.createDifficultyToggle(centerX - 70, bottomY + 55);
        this.createThemeSelector(centerX + 70, bottomY + 55);
    }

    /**
     * Create amazing animated background with particles and dynamic effects
     */
    createGradientBackground() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        const theme = themeManager.getCurrentTheme();

        // Base gradient background
        const bg = this.add.graphics();
        bg.setDepth(-1000);

        // Animated gradient layers
        this.backgroundLayers = [];
        this.createAnimatedGradientLayers(width, height, theme);

        // Floating particles system
        this.createFloatingParticles(width, height);

        // Animated geometric shapes
        this.createGeometricShapes(width, height, theme);

        // Pulsing orbs
        this.createPulsingOrbs(width, height, theme);

        // Moving wave effect
        this.createWaveEffect(width, height, theme);

        // Start background animations
        this.startBackgroundAnimations();
    }

    /**
     * Create animated gradient layers with smooth transitions
     */
    createAnimatedGradientLayers(width, height, theme) {
        // Primary gradient layer
        const gradient1 = this.add.graphics();
        gradient1.setDepth(-950);
        this.backgroundLayers.push(gradient1);

        // Secondary gradient layer  
        const gradient2 = this.add.graphics();
        gradient2.setDepth(-940);
        this.backgroundLayers.push(gradient2);

        // Tertiary gradient layer
        const gradient3 = this.add.graphics();
        gradient3.setDepth(-930);
        this.backgroundLayers.push(gradient3);

        this.updateGradientLayers(width, height, theme, 0);
    }

    /**
     * Update gradient layers with animated colors
     */
    updateGradientLayers(width, height, theme, time) {
        if (!this.backgroundLayers || this.backgroundLayers.length === 0) return;

        // Calculate animated color shifts
        const hueShift1 = Math.sin(time * 0.001) * 30;
        const hueShift2 = Math.cos(time * 0.0015) * 40;
        const hueShift3 = Math.sin(time * 0.0008) * 25;

        // Primary layer - base colors with subtle animation
        const layer1 = this.backgroundLayers[0];
        layer1.clear();
        layer1.fillGradientStyle(
            this.shiftHue(theme.primary, hueShift1),
            this.shiftHue(theme.secondary, hueShift1),
            this.shiftHue(theme.accent, hueShift1),
            this.shiftHue(theme.background, hueShift1),
            0.8
        );
        layer1.fillRect(0, 0, width, height);

        // Secondary layer - creates depth
        const layer2 = this.backgroundLayers[1];
        layer2.clear();
        layer2.fillGradientStyle(
            this.shiftHue(theme.secondary, hueShift2),
            this.shiftHue(theme.accent, hueShift2),
            this.shiftHue(theme.primary, hueShift2),
            this.shiftHue(theme.secondary, hueShift2),
            0.4
        );
        layer2.fillRect(0, 0, width, height);

        // Tertiary layer - adds sparkle
        const layer3 = this.backgroundLayers[2];
        layer3.clear();
        layer3.fillGradientStyle(
            this.shiftHue(theme.accent, hueShift3),
            this.shiftHue(theme.primary, hueShift3),
            this.shiftHue(theme.background, hueShift3),
            this.shiftHue(theme.accent, hueShift3),
            0.2
        );
        layer3.fillRect(0, 0, width, height);
    }

    /**
     * Shift color hue for animation effects
     */
    shiftHue(colorHex, shift) {
        const color = parseInt(colorHex.replace('#', ''), 16);
        const r = (color >> 16) & 255;
        const g = (color >> 8) & 255;
        const b = color & 255;

        // Simple hue shift approximation
        const factor = 1 + shift / 100;
        const newR = Math.min(255, Math.max(0, r * factor));
        const newG = Math.min(255, Math.max(0, g * factor));
        const newB = Math.min(255, Math.max(0, b * factor));

        return (newR << 16) | (newG << 8) | newB;
    }

    /**
     * Create floating particle system
     */
    createFloatingParticles(width, height) {
        this.particles = [];
        const particleCount = 50;

        for (let i = 0; i < particleCount; i++) {
            const particle = this.add.graphics();
            particle.setDepth(-900 + i);
            
            // Random particle properties
            const size = Phaser.Math.Between(2, 8);
            const x = Phaser.Math.Between(0, width);
            const y = Phaser.Math.Between(0, height);
            const alpha = Phaser.Math.FloatBetween(0.1, 0.6);
            
            // Create glowing particle
            particle.fillStyle(0xFFFFFF, alpha);
            particle.fillCircle(0, 0, size);
            particle.setPosition(x, y);
            
            // Store movement properties
            particle.velocity = {
                x: Phaser.Math.FloatBetween(-0.5, 0.5),
                y: Phaser.Math.FloatBetween(-1, -0.2)
            };
            particle.originalAlpha = alpha;
            particle.size = size;
            
            this.particles.push(particle);
        }
    }

    /**
     * Create animated geometric shapes
     */
    createGeometricShapes(width, height, theme) {
        this.geometricShapes = [];
        const shapeCount = 8;

        for (let i = 0; i < shapeCount; i++) {
            const shape = this.add.graphics();
            shape.setDepth(-880 + i);
            
            const x = Phaser.Math.Between(width * 0.1, width * 0.9);
            const y = Phaser.Math.Between(height * 0.1, height * 0.9);
            const size = Phaser.Math.Between(30, 80);
            const sides = Phaser.Math.Between(3, 8);
            
            shape.setPosition(x, y);
            shape.rotation = Phaser.Math.FloatBetween(0, Math.PI * 2);
            shape.alpha = 0.1;
            
            // Store properties for animation
            shape.size = size;
            shape.sides = sides;
            shape.rotationSpeed = Phaser.Math.FloatBetween(-0.01, 0.01);
            shape.pulseSpeed = Phaser.Math.FloatBetween(0.002, 0.005);
            shape.colorIndex = i % 4; // Rotate through theme colors
            
            this.geometricShapes.push(shape);
        }
    }

    /**
     * Create pulsing orbs
     */
    createPulsingOrbs(width, height, theme) {
        this.pulsingOrbs = [];
        const orbCount = 6;

        for (let i = 0; i < orbCount; i++) {
            const orb = this.add.graphics();
            orb.setDepth(-860 + i);
            
            const x = Phaser.Math.Between(width * 0.2, width * 0.8);
            const y = Phaser.Math.Between(height * 0.2, height * 0.8);
            const baseSize = Phaser.Math.Between(40, 100);
            
            orb.setPosition(x, y);
            orb.alpha = 0.15;
            
            // Store properties for animation
            orb.baseSize = baseSize;
            orb.pulsePhase = Phaser.Math.FloatBetween(0, Math.PI * 2);
            orb.pulseSpeed = Phaser.Math.FloatBetween(0.01, 0.03);
            orb.colorIndex = i % 4;
            
            this.pulsingOrbs.push(orb);
        }
    }

    /**
     * Create wave effect
     */
    createWaveEffect(width, height, theme) {
        this.waveGraphics = this.add.graphics();
        this.waveGraphics.setDepth(-920);
        this.waveTime = 0;
    }

    /**
     * Start all background animations
     */
    startBackgroundAnimations() {
        // Main animation loop
        this.backgroundAnimationTimer = this.time.addEvent({
            delay: 16, // ~60 FPS
            callback: this.updateBackgroundAnimation,
            callbackScope: this,
            loop: true
        });
    }

    /**
     * Update all background animations
     */
    updateBackgroundAnimation() {
        const time = this.time.now;
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        const theme = themeManager.getCurrentTheme();

        // Update gradient layers
        this.updateGradientLayers(width, height, theme, time);

        // Update particles
        this.updateParticles(width, height);

        // Update geometric shapes
        this.updateGeometricShapes(theme, time);

        // Update pulsing orbs
        this.updatePulsingOrbs(theme, time);

        // Update wave effect
        this.updateWaveEffect(width, height, theme, time);
    }

    /**
     * Update floating particles
     */
    updateParticles(width, height) {
        if (!this.particles) return;

        this.particles.forEach(particle => {
            // Move particle
            particle.x += particle.velocity.x;
            particle.y += particle.velocity.y;
            
            // Wrap around screen
            if (particle.x < -10) particle.x = width + 10;
            if (particle.x > width + 10) particle.x = -10;
            if (particle.y < -10) particle.y = height + 10;
            if (particle.y > height + 10) particle.y = -10;
            
            // Subtle alpha pulsing
            particle.alpha = particle.originalAlpha + Math.sin(this.time.now * 0.002 + particle.x * 0.01) * 0.1;
        });
    }

    /**
     * Update geometric shapes
     */
    updateGeometricShapes(theme, time) {
        if (!this.geometricShapes) return;

        const themeColors = [theme.primary, theme.secondary, theme.accent, theme.background];

        this.geometricShapes.forEach(shape => {
            // Rotate shape
            shape.rotation += shape.rotationSpeed;
            
            // Pulse size
            const pulseFactor = 1 + Math.sin(time * shape.pulseSpeed) * 0.2;
            const currentSize = shape.size * pulseFactor;
            
            // Update shape graphics
            shape.clear();
            const color = parseInt(themeColors[shape.colorIndex].replace('#', ''), 16);
            shape.lineStyle(2, color, 0.3);
            shape.fillStyle(color, 0.05);
            
            // Draw polygon
            const points = [];
            for (let i = 0; i < shape.sides; i++) {
                const angle = (i / shape.sides) * Math.PI * 2;
                points.push({
                    x: Math.cos(angle) * currentSize,
                    y: Math.sin(angle) * currentSize
                });
            }
            
            shape.beginPath();
            shape.moveTo(points[0].x, points[0].y);
            for (let i = 1; i < points.length; i++) {
                shape.lineTo(points[i].x, points[i].y);
            }
            shape.closePath();
            shape.fillPath();
            shape.strokePath();
        });
    }

    /**
     * Update pulsing orbs
     */
    updatePulsingOrbs(theme, time) {
        if (!this.pulsingOrbs) return;

        const themeColors = [theme.primary, theme.secondary, theme.accent, theme.background];

        this.pulsingOrbs.forEach(orb => {
            // Update pulse phase
            orb.pulsePhase += orb.pulseSpeed;
            
            // Calculate pulsing size and alpha
            const pulseFactor = 1 + Math.sin(orb.pulsePhase) * 0.4;
            const currentSize = orb.baseSize * pulseFactor;
            const currentAlpha = 0.15 + Math.sin(orb.pulsePhase * 0.5) * 0.1;
            
            // Update orb graphics
            orb.clear();
            orb.alpha = currentAlpha;
            const color = parseInt(themeColors[orb.colorIndex].replace('#', ''), 16);
            
            // Create gradient-like effect with multiple circles
            for (let i = 3; i >= 0; i--) {
                const radius = currentSize * (i + 1) / 4;
                const alpha = (0.8 - i * 0.2) * currentAlpha;
                orb.fillStyle(color, alpha);
                orb.fillCircle(0, 0, radius);
            }
        });
    }

    /**
     * Update wave effect
     */
    updateWaveEffect(width, height, theme, time) {
        if (!this.waveGraphics) return;

        this.waveTime += 0.02;
        this.waveGraphics.clear();
        
        const color = parseInt(theme.accent.replace('#', ''), 16);
        this.waveGraphics.lineStyle(3, color, 0.2);
        
        // Draw multiple sine waves
        for (let wave = 0; wave < 3; wave++) {
            const amplitude = 30 + wave * 10;
            const frequency = 0.01 + wave * 0.005;
            const phase = this.waveTime + wave * Math.PI / 3;
            
            this.waveGraphics.beginPath();
            for (let x = 0; x <= width; x += 5) {
                const y = height / 2 + Math.sin(x * frequency + phase) * amplitude + wave * 60;
                if (x === 0) {
                    this.waveGraphics.moveTo(x, y);
                } else {
                    this.waveGraphics.lineTo(x, y);
                }
            }
            this.waveGraphics.strokePath();
        }
    }

    /**
     * Create difficulty toggle - clean button without label
     */
    createDifficultyToggle(x, y) {
        this.menuElements.difficultyButton = this.createMenuButton(
            x, y, 120, 35,
            this.selectedDifficulty === 'easy' ? '😊 EASY' : '😈 HARD',
            () => this.toggleDifficulty()
        );
        this.difficultyButtons.push(this.menuElements.difficultyButton);
    }

    /**
     * Create theme selector - clean button without label
     */
    createThemeSelector(x, y) {
        const themes = themeManager.getAllThemes();
        const currentIndex = themes.indexOf(this.selectedTheme);
        const currentTheme = themeManager.getTheme(this.selectedTheme);

        this.menuElements.themeButton = this.createMenuButton(
            x, y, 120, 30,
            `🎨 ${currentTheme.name}`,
            () => this.cycleTheme()
        );
    }

    /**
     * Create responsive, colorful settings panel
     */
    createSettingsPanel() {
        // Initially hidden
        this.menuElements.settingsPanel = this.add.container(0, 0);
        this.menuElements.settingsPanel.setVisible(false);

        const centerX = this.cameras.main.centerX;
        const centerY = this.cameras.main.centerY;
        const theme = themeManager.getCurrentTheme();

        // Responsive background - fit screen better
        const panelWidth = Math.min(400, this.cameras.main.width - 40);
        const panelHeight = Math.min(500, this.cameras.main.height - 80);

        // Background with gradient effect
        const bg = this.add.graphics();
        bg.fillGradientStyle(
            parseInt(theme.gridBackground.replace('#', ''), 16),
            parseInt(theme.background.replace('#', ''), 16),
            parseInt(theme.background.replace('#', ''), 16),
            parseInt(theme.gridBackground.replace('#', ''), 16),
            0.95
        );
        bg.fillRoundedRect(centerX - panelWidth / 2, centerY - panelHeight / 2, panelWidth, panelHeight, 15);
        bg.lineStyle(3, parseInt(theme.primary.replace('#', ''), 16), 1);
        bg.strokeRoundedRect(centerX - panelWidth / 2, centerY - panelHeight / 2, panelWidth, panelHeight, 15);
        this.menuElements.settingsPanel.add(bg);

        // Main title with better styling
        const title = this.add.text(centerX, centerY - panelHeight / 2 + 30, '⚙️ SETTINGS', {
            fontSize: '28px',
            fontFamily: 'Arial Black, sans-serif',
            color: theme.primary,
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 2
        });
        title.setOrigin(0.5);
        this.menuElements.settingsPanel.add(title);

        // Settings content container for scrolling
        this.menuElements.settingsContent = this.add.container(0, 0);
        this.menuElements.settingsPanel.add(this.menuElements.settingsContent);

        this.createThemeSettings(centerX, centerY - 220);
        this.createAudioSettings(centerX, centerY - 80);
        this.createGameplaySettings(centerX, centerY + 40);
        this.createAccessibilitySettings(centerX, centerY + 120);
        this.createAccountSettings(centerX, centerY + 200);

        // Back button - positioned better
        this.menuElements.closeSettingsButton = this.createMenuButton(
            centerX, centerY + panelHeight / 2 - 30, 140, 40,
            '⬅️ BACK',
            () => this.hideSettings()
        );
        this.menuElements.settingsPanel.add(this.menuElements.closeSettingsButton);
    }

    /**
     * Create theme selection section
     */
    createThemeSettings(centerX, startY) {
        // Section title
        const themeTitle = this.add.text(centerX, startY, 'Theme Selection', {
            fontSize: '18px',
            fontFamily: 'Arial, sans-serif',
            color: themeManager.getCurrentTheme().accent,
            fontStyle: 'bold'
        });
        themeTitle.setOrigin(0.5);
        this.menuElements.settingsContent.add(themeTitle);

        // Theme buttons grid (2x3)
        const themes = ['vibrant', 'forest', 'neon', 'pastel', 'space', 'colorblindFriendly'];
        const themeNames = ['Vibrant', 'Forest', 'Neon', 'Pastel', 'Space', 'Colorblind'];
        const currentTheme = themeManager.getCurrentThemeName();

        this.menuElements.themeButtons = [];

        for (let i = 0; i < themes.length; i++) {
            const col = i % 3;
            const row = Math.floor(i / 3);
            const x = centerX - 120 + col * 120;
            const y = startY + 30 + row * 50;

            const isSelected = themes[i] === currentTheme;
            const buttonColor = isSelected ? 0x444444 : 0x222222;

            const themeButton = this.createMenuButton(
                x, y, 110, 40,
                themeNames[i],
                () => this.selectTheme(themes[i])
            );

            // Add selection indicator
            if (isSelected) {
                const indicator = this.add.text(x + 45, y, '✓', {
                    fontSize: '14px',
                    color: themeManager.getCurrentTheme().accent
                });
                indicator.setOrigin(0.5);
                this.menuElements.settingsContent.add(indicator);
            }

            this.menuElements.themeButtons.push(themeButton);
            this.menuElements.settingsContent.add(themeButton);
        }
    }

    /**
     * Create audio control section
     */
    createAudioSettings(centerX, startY) {
        // Section title
        const audioTitle = this.add.text(centerX, startY, 'Audio Controls', {
            fontSize: '18px',
            fontFamily: 'Arial, sans-serif',
            color: themeManager.getCurrentTheme().accent,
            fontStyle: 'bold'
        });
        audioTitle.setOrigin(0.5);
        this.menuElements.settingsContent.add(audioTitle);

        // Audio toggle
        const audioEnabled = audioManager.isEnabled();
        this.menuElements.audioToggle = this.createMenuButton(
            centerX - 100, startY + 30, 120, 35,
            audioEnabled ? '🔊 Audio On' : '🔇 Audio Off',
            () => this.toggleAudio()
        );
        this.menuElements.settingsContent.add(this.menuElements.audioToggle);

        // Master volume slider
        const masterVol = Math.round(audioManager.masterVolume * 100);
        this.menuElements.masterVolumeText = this.add.text(centerX + 80, startY + 15, `Master: ${masterVol}%`, {
            fontSize: '14px',
            color: themeManager.getCurrentTheme().text
        });
        this.menuElements.masterVolumeText.setOrigin(0.5);
        this.menuElements.settingsContent.add(this.menuElements.masterVolumeText);

        // Volume controls
        this.menuElements.masterVolumeDown = this.createMenuButton(
            centerX + 20, startY + 30, 30, 25, '-',
            () => this.adjustMasterVolume(-0.1)
        );
        this.menuElements.masterVolumeUp = this.createMenuButton(
            centerX + 140, startY + 30, 30, 25, '+',
            () => this.adjustMasterVolume(0.1)
        );
        this.menuElements.settingsContent.add(this.menuElements.masterVolumeDown);
        this.menuElements.settingsContent.add(this.menuElements.masterVolumeUp);

        // SFX volume
        const sfxVol = Math.round(audioManager.sfxVolume * 100);
        this.menuElements.sfxVolumeText = this.add.text(centerX + 80, startY + 55, `SFX: ${sfxVol}%`, {
            fontSize: '14px',
            color: themeManager.getCurrentTheme().text
        });
        this.menuElements.sfxVolumeText.setOrigin(0.5);
        this.menuElements.settingsContent.add(this.menuElements.sfxVolumeText);

        this.menuElements.sfxVolumeDown = this.createMenuButton(
            centerX + 20, startY + 70, 30, 25, '-',
            () => this.adjustSFXVolume(-0.1)
        );
        this.menuElements.sfxVolumeUp = this.createMenuButton(
            centerX + 140, startY + 70, 30, 25, '+',
            () => this.adjustSFXVolume(0.1)
        );
        this.menuElements.settingsContent.add(this.menuElements.sfxVolumeDown);
        this.menuElements.settingsContent.add(this.menuElements.sfxVolumeUp);
    }

    /**
     * Create gameplay settings section
     */
    createGameplaySettings(centerX, startY) {
        // Section title
        const gameplayTitle = this.add.text(centerX, startY, 'Gameplay Settings', {
            fontSize: '18px',
            fontFamily: 'Arial, sans-serif',
            color: themeManager.getCurrentTheme().accent,
            fontStyle: 'bold'
        });
        gameplayTitle.setOrigin(0.5);
        this.menuElements.settingsContent.add(gameplayTitle);

        // Auto-save toggle
        const autoSave = storage.get('autoSave', true);
        this.menuElements.autoSaveToggle = this.createMenuButton(
            centerX - 80, startY + 30, 140, 30,
            autoSave ? '� Auto-save: On' : '💾 Auto-save: Off',
            () => this.toggleAutoSave()
        );
        this.menuElements.settingsContent.add(this.menuElements.autoSaveToggle);

        // Difficulty preference
        const difficulty = storage.get('difficulty', 'easy');
        this.selectedDifficulty = difficulty;
        this.menuElements.settingsDifficultyButton = this.createMenuButton(
            centerX + 80, startY + 30, 140, 30,
            difficulty === 'easy' ? '😊 EASY' : '😈 HARD',
            () => this.toggleDifficulty()
        );
        this.difficultyButtons.push(this.menuElements.settingsDifficultyButton);
        this.menuElements.settingsContent.add(this.menuElements.settingsDifficultyButton);
    }

    /**
     * Create accessibility settings section
     */
    createAccessibilitySettings(centerX, startY) {
        // Section title
        const accessTitle = this.add.text(centerX, startY, 'Accessibility', {
            fontSize: '18px',
            fontFamily: 'Arial, sans-serif',
            color: themeManager.getCurrentTheme().accent,
            fontStyle: 'bold'
        });
        accessTitle.setOrigin(0.5);
        this.menuElements.settingsContent.add(accessTitle);

        // Font size
        const fontSize = storage.get('fontSize', 'normal');
        this.menuElements.fontSizeButton = this.createMenuButton(
            centerX - 80, startY + 30, 140, 30,
            `🔤 Font: ${fontSize.charAt(0).toUpperCase() + fontSize.slice(1)}`,
            () => this.cycleFontSize()
        );
        this.menuElements.settingsContent.add(this.menuElements.fontSizeButton);

        // High contrast
        const highContrast = storage.get('highContrast', false);
        this.menuElements.contrastToggle = this.createMenuButton(
            centerX + 80, startY + 30, 140, 30,
            highContrast ? '🌓 Contrast: High' : '🌓 Contrast: Normal',
            () => this.toggleHighContrast()
        );
        this.menuElements.settingsContent.add(this.menuElements.contrastToggle);
    }

    /**
     * Create account management section
     */
    createAccountSettings(centerX, startY) {
        // Section title
        const accountTitle = this.add.text(centerX, startY, 'Account Management', {
            fontSize: '18px',
            fontFamily: 'Arial, sans-serif',
            color: themeManager.getCurrentTheme().accent,
            fontStyle: 'bold'
        });
        accountTitle.setOrigin(0.5);
        this.menuElements.settingsContent.add(accountTitle);

        // Export data button
        this.menuElements.exportButton = this.createMenuButton(
            centerX - 80, startY + 30, 140, 30,
            '📤 Export Data',
            () => this.exportGameData()
        );
        this.menuElements.settingsContent.add(this.menuElements.exportButton);

        // Import data button
        this.menuElements.importButton = this.createMenuButton(
            centerX + 80, startY + 30, 140, 30,
            '📥 Import Data',
            () => this.importGameData()
        );
        this.menuElements.settingsContent.add(this.menuElements.importButton);

        // Reset data button
        this.menuElements.resetButton = this.createMenuButton(
            centerX, startY + 70, 140, 30,
            '🗑️ Reset All Data',
            () => this.confirmResetData()
        );
        this.menuElements.settingsContent.add(this.menuElements.resetButton);
    }

    /**
     * Create responsive, colorful statistics panel
     */
    createStatisticsPanel() {
        // Initially hidden
        this.menuElements.statsPanel = this.add.container(0, 0);
        this.menuElements.statsPanel.setVisible(false);

        const centerX = this.cameras.main.centerX;
        const centerY = this.cameras.main.centerY;
        const theme = themeManager.getCurrentTheme();

        // Responsive background - fit screen better with proper margins
        const panelWidth = Math.min(420, this.cameras.main.width - 60);
        const panelHeight = Math.min(550, this.cameras.main.height - 120);

        // Background with gradient effect
        const bg = this.add.graphics();
        bg.fillGradientStyle(
            parseInt(theme.gridBackground.replace('#', ''), 16),
            parseInt(theme.background.replace('#', ''), 16),
            parseInt(theme.background.replace('#', ''), 16),
            parseInt(theme.gridBackground.replace('#', ''), 16),
            0.95
        );
        bg.fillRoundedRect(centerX - panelWidth / 2, centerY - panelHeight / 2, panelWidth, panelHeight, 15);
        bg.lineStyle(3, parseInt(theme.secondary.replace('#', ''), 16), 1);
        bg.strokeRoundedRect(centerX - panelWidth / 2, centerY - panelHeight / 2, panelWidth, panelHeight, 15);
        this.menuElements.statsPanel.add(bg);

        // Main title with better styling
        const title = this.add.text(centerX, centerY - panelHeight / 2 + 30, '📊 STATISTICS', {
            fontSize: '28px',
            fontFamily: 'Arial Black, sans-serif',
            color: theme.secondary,
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 2
        });
        title.setOrigin(0.5);
        this.menuElements.statsPanel.add(title);

        // Create tabs for different stat categories
        this.createStatisticsTabs(centerX, centerY - panelHeight / 2 + 80);

        // Stats content container with proper clipping
        this.menuElements.statsContent = this.add.container(0, 0);

        // Create a mask to clip content within panel bounds
        const maskShape = this.add.graphics();
        maskShape.fillRect(
            centerX - panelWidth / 2 + 10,
            centerY - panelHeight / 2 + 90,
            panelWidth - 20,
            panelHeight - 140
        );
        const mask = maskShape.createGeometryMask();
        this.menuElements.statsContent.setMask(mask);

        this.menuElements.statsPanel.add(this.menuElements.statsContent);

        // Default to overview tab
        this.currentStatsTab = 'overview';
        this.updateStatisticsContent();

        // Back button - positioned better
        this.menuElements.closeStatsButton = this.createMenuButton(
            centerX, centerY + panelHeight / 2 - 30, 140, 40,
            '⬅️ BACK',
            () => this.hideStatistics()
        );
        this.menuElements.statsPanel.add(this.menuElements.closeStatsButton);
    }

    /**
     * Create statistics tabs
     */
    createStatisticsTabs(centerX, y) {
        const tabs = [
            { key: 'overview', label: '📊 Overview' },
            { key: 'records', label: '🏆 Records' }
        ];

        this.menuElements.statsTabs = [];
        this.menuElements.statsHighlights = [];

        // Responsive tab layout - adjust based on screen width
        const panelWidth = Math.min(420, this.cameras.main.width - 60);
        const tabWidth = Math.max(70, Math.min(110, (panelWidth - 40) / tabs.length));
        const totalWidth = tabWidth * tabs.length;
        const startX = centerX - totalWidth / 2 + tabWidth / 2;

        tabs.forEach((tab, index) => {
            const x = startX + index * tabWidth;
            const isSelected = this.currentStatsTab === tab.key;

            const tabButton = this.createMenuButton(
                x, y, tabWidth - 5, 30,
                tab.label,
                () => this.selectStatsTab(tab.key)
            );

            // Highlight selected tab
            if (isSelected) {
                const highlight = this.add.rectangle(x, y - 15, tabWidth - 5, 2, parseInt(themeManager.getCurrentTheme().accent.replace('#', ''), 16));
                this.menuElements.statsPanel.add(highlight);
                this.menuElements.statsHighlights.push(highlight);
            }

            this.menuElements.statsTabs.push(tabButton);
            this.menuElements.statsPanel.add(tabButton);
        });
    }

    /**
     * Select statistics tab
     */
    selectStatsTab(tabKey) {
        this.currentStatsTab = tabKey;
        this.updateStatisticsContent();

        // Refresh the tabs to show new selection
        this.refreshStatisticsTabs();
    }

    /**
     * Refresh statistics tabs to show current selection
     */
    refreshStatisticsTabs() {
        // Remove old tabs and highlights properly from the statistics panel
        if (this.menuElements.statsTabs) {
            this.menuElements.statsTabs.forEach(tab => {
                if (tab && tab.destroy) {
                    // Remove from panel first
                    if (this.menuElements.statsPanel) {
                        this.menuElements.statsPanel.remove(tab);
                    }
                    tab.destroy();
                }
            });
            this.menuElements.statsTabs = [];
        }

        // Clear any existing highlights
        if (this.menuElements.statsHighlights) {
            this.menuElements.statsHighlights.forEach(highlight => {
                if (highlight && highlight.destroy) {
                    // Remove from panel first  
                    if (this.menuElements.statsPanel) {
                        this.menuElements.statsPanel.remove(highlight);
                    }
                    highlight.destroy();
                }
            });
            this.menuElements.statsHighlights = [];
        }

        const centerX = this.cameras.main.centerX;
        const centerY = this.cameras.main.centerY;
        // Use proper positioning relative to panel
        const panelHeight = Math.min(550, this.cameras.main.height - 120);
        this.createStatisticsTabs(centerX, centerY - panelHeight / 2 + 80);
    }

    /**
     * Create responsive, colorful power-up shop panel
     */
    createPowerUpShop() {
        // Initially hidden
        this.menuElements.shopPanel = this.add.container(0, 0);
        this.menuElements.shopPanel.setVisible(false);

        const centerX = this.cameras.main.centerX;
        const centerY = this.cameras.main.centerY;
        const theme = themeManager.getCurrentTheme();

        // Responsive background - fit screen better with proper margins
        const panelWidth = Math.min(450, this.cameras.main.width - 60);
        const panelHeight = Math.min(600, this.cameras.main.height - 120);

        // Background with gradient effect
        const bg = this.add.graphics();
        bg.fillGradientStyle(
            parseInt(theme.gridBackground.replace('#', ''), 16),
            parseInt(theme.background.replace('#', ''), 16),
            parseInt(theme.background.replace('#', ''), 16),
            parseInt(theme.gridBackground.replace('#', ''), 16),
            0.95
        );
        bg.fillRoundedRect(centerX - panelWidth / 2, centerY - panelHeight / 2, panelWidth, panelHeight, 15);
        bg.lineStyle(3, parseInt(theme.accent.replace('#', ''), 16), 1);
        bg.strokeRoundedRect(centerX - panelWidth / 2, centerY - panelHeight / 2, panelWidth, panelHeight, 15);
        this.menuElements.shopPanel.add(bg);

        // Title with better styling
        const title = this.add.text(centerX, centerY - panelHeight / 2 + 30, '🛒 POWER-UP SHOP', {
            fontSize: '26px',
            fontFamily: 'Arial Black, sans-serif',
            color: theme.accent,
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 2
        });
        title.setOrigin(0.5);
        this.menuElements.shopPanel.add(title);

        // Coins display with enhanced styling - positioned properly within panel
        const coins = storage.getCoins();
        const coinsY = centerY - panelHeight / 2 + 80; // Position below title but inside panel
        this.menuElements.coinsBg = this.add.rectangle(centerX, coinsY, 200, 40, parseInt(themeManager.getCurrentTheme().ui.buttonBackground.replace('#', ''), 16));
        this.menuElements.shopPanel.add(this.menuElements.coinsBg);

        this.menuElements.coinsDisplay = this.add.text(centerX, coinsY, `💰 ${coins} coins`, {
            fontSize: '18px',
            fontFamily: 'Arial, sans-serif',
            color: themeManager.getCurrentTheme().accent,
            fontStyle: 'bold'
        });
        this.menuElements.coinsDisplay.setOrigin(0.5);
        this.menuElements.shopPanel.add(this.menuElements.coinsDisplay);

        // Shop content container - display all power-ups directly
        this.menuElements.shopContent = this.add.container(0, 0);
        this.menuElements.shopPanel.add(this.menuElements.shopContent);

        // Show all power-ups without category filtering
        this.createAllPowerUpsDisplay(centerX, centerY - 180);

        // Back button - positioned better
        this.menuElements.closeShopButton = this.createMenuButton(
            centerX, centerY + panelHeight / 2 - 30, 140, 40,
            '⬅️ BACK',
            () => this.hideShop()
        );
        this.menuElements.shopPanel.add(this.menuElements.closeShopButton);
    }

    /**
     * Create shop category tabs
     */
    createShopTabs(centerX, y) {
        const tabs = [
            { key: 'all', label: '🛒 All', color: '#666666' },
            { key: 'utility', label: '🔧 Utility', color: '#4ECDC4' },
            { key: 'temporal', label: '⏰ Time', color: '#FF6B6B' },
            { key: 'information', label: '📊 Info', color: '#45B7D1' },
            { key: 'assistance', label: '🧠 Smart', color: '#96CEB4' },
            { key: 'survival', label: '🔥 Survival', color: '#DDA0DD' }
        ];

        this.menuElements.shopTabs = [];

        tabs.forEach((tab, index) => {
            const x = centerX - 275 + index * 95;
            const isSelected = this.currentShopCategory === tab.key;

            const tabButton = this.createMenuButton(
                x, y, 90, 30,
                tab.label,
                () => this.selectShopCategory(tab.key)
            );

            // Highlight selected tab
            if (isSelected) {
                const highlight = this.add.rectangle(x, y - 18, 90, 3, parseInt(tab.color.replace('#', ''), 16));
                this.menuElements.shopPanel.add(highlight);
            }

            this.menuElements.shopTabs.push(tabButton);
            this.menuElements.shopPanel.add(tabButton);
        });
    }

    /**
     * Select shop category
     */
    selectShopCategory(category) {
        this.currentShopCategory = category;
        this.updateShopContent();
        this.refreshShopTabs();
    }

    /**
     * Refresh shop tabs to show current selection
     */
    refreshShopTabs() {
        if (this.menuElements.shopTabs) {
            this.menuElements.shopTabs.forEach(tab => tab.destroy());
        }

        const centerX = this.cameras.main.centerX;
        const centerY = this.cameras.main.centerY;
        this.createShopTabs(centerX, centerY - 260);
    }

    /**
     * Create a vibrant, game-like menu button with 3D effect
     */
    createMenuButton(x, y, width, height, text, callback) {
        const theme = themeManager.getCurrentTheme();
        const graphics = this.add.graphics();

        // Button colors - much more vibrant
        const buttonColor = parseInt(theme.primary.replace('#', ''), 16);
        const shadowColor = 0x000000;
        const highlightColor = parseInt(theme.accent.replace('#', ''), 16);

        // 3D shadow effect
        graphics.fillStyle(shadowColor, 0.6);
        graphics.fillRoundedRect(x - width / 2 + 3, y - height / 2 + 3, width, height, 8);

        // Main button background - gradient effect
        graphics.fillGradientStyle(buttonColor, buttonColor, shadowColor, shadowColor, 0.8);
        graphics.fillRoundedRect(x - width / 2, y - height / 2, width, height, 8);

        // Highlight on top
        graphics.fillStyle(highlightColor, 0.3);
        graphics.fillRoundedRect(x - width / 2, y - height / 2, width, height / 3, 8);

        // Border
        graphics.lineStyle(2, highlightColor, 1);
        graphics.strokeRoundedRect(x - width / 2, y - height / 2, width, height, 8);

        // Interactive area
        const button = this.add.rectangle(x, y, width, height, 0x000000, 0);
        button.setInteractive({ useHandCursor: true });

        // Button text with better styling
        const buttonText = this.add.text(x, y, text, {
            fontSize: height > 35 ? '16px' : '14px',
            fontFamily: 'Arial Black, sans-serif',
            color: '#FFFFFF',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 2,
            shadow: {
                offsetX: 1,
                offsetY: 1,
                color: '#000000',
                blur: 2,
                fill: true
            }
        });
        buttonText.setOrigin(0.5);

        // Hover effects with particles
        button.on('pointerover', () => {
            audioManager.playHover();

            // Glow effect
            graphics.clear();
            graphics.fillStyle(shadowColor, 0.6);
            graphics.fillRoundedRect(x - width / 2 + 3, y - height / 2 + 3, width, height, 8);
            graphics.fillGradientStyle(highlightColor, highlightColor, buttonColor, buttonColor, 0.9);
            graphics.fillRoundedRect(x - width / 2, y - height / 2, width, height, 8);
            graphics.fillStyle(0xFFFFFF, 0.4);
            graphics.fillRoundedRect(x - width / 2, y - height / 2, width, height / 3, 8);
            graphics.lineStyle(3, 0xFFFFFF, 0.8);
            graphics.strokeRoundedRect(x - width / 2, y - height / 2, width, height, 8);

            this.tweens.add({
                targets: [button, buttonText, graphics],
                scaleX: 1.08,
                scaleY: 1.08,
                duration: 150,
                ease: 'Back.easeOut'
            });
        });

        button.on('pointerout', () => {
            // Reset to normal
            graphics.clear();
            graphics.fillStyle(shadowColor, 0.6);
            graphics.fillRoundedRect(x - width / 2 + 3, y - height / 2 + 3, width, height, 8);
            graphics.fillGradientStyle(buttonColor, buttonColor, shadowColor, shadowColor, 0.8);
            graphics.fillRoundedRect(x - width / 2, y - height / 2, width, height, 8);
            graphics.fillStyle(highlightColor, 0.3);
            graphics.fillRoundedRect(x - width / 2, y - height / 2, width, height / 3, 8);
            graphics.lineStyle(2, highlightColor, 1);
            graphics.strokeRoundedRect(x - width / 2, y - height / 2, width, height, 8);

            this.tweens.add({
                targets: [button, buttonText, graphics],
                scaleX: 1,
                scaleY: 1,
                duration: 150,
                ease: 'Back.easeOut'
            });
        });

        button.on('pointerdown', () => {
            // Start background music on first user interaction (Chrome AudioContext requirement)
            if (!this.musicStarted) {
                this.musicStarted = true;
                audioManager.startBackgroundMusic();
            }

            // Press effect
            this.tweens.add({
                targets: [button, buttonText, graphics],
                scaleX: 0.92,
                scaleY: 0.92,
                duration: 80,
                yoyo: true,
                ease: 'Power2',
                onComplete: () => {
                    if (callback) callback();
                }
            });
        });

        return this.add.container(0, 0, [graphics, button, buttonText]);
    }

    /**
     * Create a disabled menu button with grayed-out styling and tooltip
     */
    createDisabledMenuButton(x, y, width, height, text, tooltipText) {
        const theme = themeManager.getCurrentTheme();
        const graphics = this.add.graphics();

        // Disabled button colors - grayed out
        const buttonColor = 0x666666;
        const shadowColor = 0x333333;
        const textColor = '#999999';

        // Shadow effect (lighter for disabled state)
        graphics.fillStyle(shadowColor, 0.4);
        graphics.fillRoundedRect(x - width / 2 + 2, y - height / 2 + 2, width, height, 8);

        // Main button background - single gray color
        graphics.fillStyle(buttonColor, 0.6);
        graphics.fillRoundedRect(x - width / 2, y - height / 2, width, height, 8);

        // Subtle highlight (very muted)
        graphics.fillStyle(0x888888, 0.2);
        graphics.fillRoundedRect(x - width / 2, y - height / 2, width, height / 3, 8);

        // Border (muted)
        graphics.lineStyle(1, 0x888888, 0.8);
        graphics.strokeRoundedRect(x - width / 2, y - height / 2, width, height, 8);

        // Interactive area for tooltip
        const button = this.add.rectangle(x, y, width, height, 0x000000, 0);
        button.setInteractive({ useHandCursor: false });

        // Button text with disabled styling
        const buttonText = this.add.text(x, y, text, {
            fontSize: height > 35 ? '16px' : '14px',
            fontFamily: 'Arial Black, sans-serif',
            color: textColor,
            fontStyle: 'bold',
            stroke: '#333333',
            strokeThickness: 1,
            shadow: {
                offsetX: 1,
                offsetY: 1,
                color: '#000000',
                blur: 1,
                fill: true
            }
        });
        buttonText.setOrigin(0.5);

        // Tooltip functionality
        let tooltip = null;

        button.on('pointerover', () => {
            // Create tooltip
            if (tooltipText) {
                const tooltipBg = this.add.graphics();
                tooltipBg.fillStyle(0x000000, 0.8);
                tooltipBg.fillRoundedRect(x - 100, y - height / 2 - 40, 200, 30, 5);
                
                tooltip = this.add.text(x, y - height / 2 - 25, tooltipText, {
                    fontSize: '12px',
                    fontFamily: 'Arial, sans-serif',
                    color: '#FFFFFF',
                    align: 'center'
                });
                tooltip.setOrigin(0.5);
                
                // Add both to container for easy cleanup
                tooltip.tooltipBg = tooltipBg;
            }
        });

        button.on('pointerout', () => {
            // Remove tooltip
            if (tooltip) {
                tooltip.destroy();
                if (tooltip.tooltipBg) tooltip.tooltipBg.destroy();
                tooltip = null;
            }
        });

        return this.add.container(0, 0, [graphics, button, buttonText]);
    }

    /**
     * Start title animation
     */
    startTitleAnimation() {
        // Rainbow title already has fixed colors, no animation needed
        // Previous color cycling animation removed since title is now a container with rainbow letters
    }

    /**
     * Set up input handlers
     */
    setupInputHandlers() {
        // Keyboard shortcuts
        this.input.keyboard.on('keydown-ESC', () => {
            this.hideAllPanels();
        });

        this.input.keyboard.on('keydown-S', () => {
            this.showSettings();
        });

        this.input.keyboard.on('keydown-T', () => {
            this.cycleTheme();
        });

        // Cheat code: Ctrl+Shift+C for 500 coins
        this.input.keyboard.on('keydown-C', (event) => {
            if (event.ctrlKey && event.shiftKey) {
                storage.addCoins(500);
                console.log('🎮 Cheat activated! Added 500 coins. Total:', storage.getCoins());
                
                // Show a temporary message
                const centerX = this.cameras.main.centerX;
                const centerY = this.cameras.main.centerY;
                const cheatText = this.add.text(centerX, centerY - 50, '+500 COINS!', {
                    fontSize: '24px',
                    fontFamily: 'Arial Black',
                    color: '#FFD700',
                    stroke: '#000000',
                    strokeThickness: 2,
                    shadow: {
                        offsetX: 2,
                        offsetY: 2,
                        color: '#000000',
                        blur: 5,
                        stroke: true,
                        fill: true
                    }
                }).setOrigin(0.5);

                // Animate the cheat text
                this.tweens.add({
                    targets: cheatText,
                    y: centerY - 100,
                    alpha: 0,
                    scale: 1.5,
                    duration: 2000,
                    ease: 'Power2',
                    onComplete: () => {
                        cheatText.destroy();
                    }
                });

                // Update coin display if visible
                this.updateCoinDisplay();
            }
        });
    }

    /**
     * Update coin display in shop and UI
     */
    updateCoinDisplay() {
        const coins = storage.getCoins();
        
        // Update shop coin display if shop is open
        if (this.menuElements.shopPanel && this.menuElements.shopPanel.visible) {
            this.updateShopContent();
        }
        
        // Update any other coin displays in the UI
        if (this.menuElements.coinText) {
            this.menuElements.coinText.setText(`💰 ${coins}`);
        }
    }

    /**
     * Toggle difficulty
     */


    /**
     * Cycle through themes
     */
    cycleTheme() {
        const themes = themeManager.getAllThemes();
        const currentIndex = themes.indexOf(this.selectedTheme);
        const nextIndex = (currentIndex + 1) % themes.length;
        const nextTheme = themes[nextIndex];

        this.selectedTheme = nextTheme;
        themeManager.setTheme(nextTheme);
        storage.setTheme(nextTheme);

        // Update theme button
        const themeName = themeManager.getTheme(nextTheme).name;
        this.menuElements.themeButton.list[2].setText(`🎨 ${themeName}`);

        // Update scene colors
        this.updateTheme();
    }

    /**
     * Select game mode
     */
    selectGameMode(mode) {
        if (mode === 'shop') {
            this.showShop();
            return;
        }

        // Show "Coming Soon" message for puzzle mode
        if (mode === 'puzzle') {
            this.showModalPopup('Puzzle Mode Coming Soon', 'Puzzle Mode is currently being improved and will be available soon! Stay tuned for exciting puzzle challenges.');
            return;
        }

        // Prevent replaying daily challenge if already completed
        if (mode === GAME_MODES.DAILY && isDailyCompleted()) {
            this.showModalPopup('Daily Challenge Completed', 'You have already completed today\'s Daily Challenge! Come back tomorrow for a new puzzle.');
            return;
        }

        // Stop background music when leaving menu
        audioManager.stopBackgroundMusic();

        // Route to the correct scene based on mode
        switch (mode) {
            case 'adventure':
                this.scene.start('AdventureScene');
                break;
            case 'puzzle':
                // This case is now handled above with the "Coming Soon" message
                break;
            case 'normal':
            case 'daily':
            case 'endless':
            default:
                this.scene.start('GameScene', {
                    mode: mode,
                    difficulty: this.selectedDifficulty
                });
                break;
        }
    }
    /**
     * Show a modal popup with a message
     * @param {string} title - Popup title
     * @param {string} message - Popup message
     */
    showModalPopup(title, message) {
        // Remove any existing modal
        if (this.menuElements.modalPopup) {
            this.menuElements.modalPopup.bg.destroy();
            this.menuElements.modalPopup.panel.destroy();
            this.menuElements.modalPopup.titleText.destroy();
            this.menuElements.modalPopup.messageText.destroy();
            this.menuElements.modalPopup.okButton.destroy();
        }

        const centerX = this.cameras.main.centerX;
        const centerY = this.cameras.main.centerY;
        const theme = themeManager.getCurrentTheme();

        // Background overlay
        const bg = this.add.rectangle(centerX, centerY, 420, 700, 0x000000, 0.7).setDepth(1000);
        // Modal panel
        const panel = this.add.rectangle(centerX, centerY, 320, 180, 0x22232a, 1).setStrokeStyle(2, theme.primary).setDepth(1001);
        // Title
        const titleText = this.add.text(centerX, centerY - 55, title, {
            fontSize: '20px', fontFamily: 'Arial', color: theme.primary, fontStyle: 'bold', align: 'center'
        }).setOrigin(0.5).setDepth(1002);
        // Message
        const messageText = this.add.text(centerX, centerY - 10, message, {
            fontSize: '14px', fontFamily: 'Arial', color: theme.text, wordWrap: { width: 260 }
        }).setOrigin(0.5).setDepth(1002);
        // OK button
        const okButton = this.createMenuButton(centerX, centerY + 45, 120, 36, 'OK', () => {
            bg.destroy();
            panel.destroy();
            titleText.destroy();
            messageText.destroy();
            okButton.destroy();
            this.menuElements.modalPopup = null;
        });
        okButton.setDepth(1002);

        this.menuElements.modalPopup = { bg, panel, titleText, messageText, okButton };
    }

    /**
     * Show/hide panels
     */
    showSettings() {
        this.hideAllPanels();
        this.menuElements.settingsPanel.setVisible(true);
    }

    // --- Modal popup method inserted here ---

    hideSettings() {
        this.menuElements.settingsPanel.setVisible(false);
    }

    showStatistics() {
        this.hideAllPanels();
        this.updateStatisticsContent();
        this.menuElements.statsPanel.setVisible(true);
    }

    hideStatistics() {
        this.menuElements.statsPanel.setVisible(false);
    }

    showShop() {
        this.hideAllPanels();
        this.updateShopContent();
        this.menuElements.shopPanel.setVisible(true);
    }

    hideShop() {
        this.menuElements.shopPanel.setVisible(false);
    }

    hideAllPanels() {
        if (this.menuElements.settingsPanel) this.menuElements.settingsPanel.setVisible(false);
        if (this.menuElements.statsPanel) this.menuElements.statsPanel.setVisible(false);
        if (this.menuElements.shopPanel) this.menuElements.shopPanel.setVisible(false);
    }

    /**
     * Toggle audio
     */
    toggleAudio() {
        const enabled = audioManager.toggle();
        const text = enabled ? '🔊 Audio On' : '🔇 Audio Off';
        this.menuElements.audioToggle.list[2].setText(text);

        // Control background music based on audio state
        if (enabled) {
            audioManager.startBackgroundMusic();
        } else {
            audioManager.stopBackgroundMusic();
        }
    }

    /**
     * Select theme
     */
    selectTheme(themeName) {
        themeManager.setTheme(themeName);
        // Refresh the settings panel to show updated selection
        this.refreshSettingsPanel();
    }

    /**
     * Adjust master volume
     */
    adjustMasterVolume(delta) {
        const newVolume = Math.max(0, Math.min(1, audioManager.masterVolume + delta));
        audioManager.setMasterVolume(newVolume);
        const percentage = Math.round(newVolume * 100);
        this.menuElements.masterVolumeText.setText(`Master: ${percentage}%`);
        storage.set('masterVolume', newVolume);
    }

    /**
     * Adjust SFX volume
     */
    adjustSFXVolume(delta) {
        const newVolume = Math.max(0, Math.min(1, audioManager.sfxVolume + delta));
        audioManager.setSFXVolume(newVolume);
        const percentage = Math.round(newVolume * 100);
        this.menuElements.sfxVolumeText.setText(`SFX: ${percentage}%`);
        storage.set('sfxVolume', newVolume);
    }

    /**
     * Toggle auto-save
     */
    toggleAutoSave() {
        const current = storage.get('autoSave', true);
        const newValue = !current;
        storage.set('autoSave', newValue);
        const text = newValue ? '💾 Auto-save: On' : '� Auto-save: Off';
        this.menuElements.autoSaveToggle.list[2].setText(text);
    }

    /**
     * Toggle through difficulty levels
     */
    toggleDifficulty() {
        // Toggle between easy and hard
        this.selectedDifficulty = this.selectedDifficulty === 'easy' ? 'hard' : 'easy';
        storage.set('difficulty', this.selectedDifficulty);

        const newText = this.selectedDifficulty === 'easy' ? '😊 EASY' : '😈 HARD';

        // Update all difficulty buttons
        this.difficultyButtons.forEach((button, index) => {
            if (button && button.list && button.list[2]) {
                button.list[2].setText(newText);
            }
        });

        // Clean up any destroyed buttons from the array
        this.difficultyButtons = this.difficultyButtons.filter(button => button && !button.destroyed);
    }

    /**
     * Cycle through font sizes
     */
    cycleFontSize() {
        const sizes = ['small', 'normal', 'large'];
        const current = storage.get('fontSize', 'normal');
        const currentIndex = sizes.indexOf(current);
        const nextIndex = (currentIndex + 1) % sizes.length;
        const newSize = sizes[nextIndex];

        storage.set('fontSize', newSize);
        const text = `🔤 Font: ${newSize.charAt(0).toUpperCase() + newSize.slice(1)}`;
        this.menuElements.fontSizeButton.list[2].setText(text);

        // Apply font size change immediately
        this.applyFontSize(newSize);
    }

    /**
     * Toggle high contrast mode
     */
    toggleHighContrast() {
        const current = storage.get('highContrast', false);
        const newValue = !current;
        storage.set('highContrast', newValue);
        const text = newValue ? '🌓 Contrast: High' : '🌓 Contrast: Normal';
        this.menuElements.contrastToggle.list[2].setText(text);

        // Apply contrast change immediately
        this.applyHighContrast(newValue);
    }

    /**
     * Export game data
     */
    exportGameData() {
        try {
            const gameData = {
                statistics: storage.getStatistics(),
                settings: {
                    theme: themeManager.getCurrentThemeName(),
                    audioEnabled: audioManager.isEnabled(),
                    masterVolume: audioManager.masterVolume,
                    sfxVolume: audioManager.sfxVolume,
                    autoSave: storage.get('autoSave', true),
                    difficulty: storage.get('difficulty', 'normal'),
                    fontSize: storage.get('fontSize', 'normal'),
                    highContrast: storage.get('highContrast', false)
                },
                gameState: {
                    coins: storage.getCoins(),
                    unlockedThemes: storage.get('unlockedThemes', ['vibrant']),
                    purchasedPowerUps: storage.get('purchasedPowerUps', {})
                },
                exportDate: new Date().toISOString()
            };

            const dataStr = JSON.stringify(gameData, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(dataBlob);

            const link = document.createElement('a');
            link.href = url;
            link.download = `blockquest-data-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            this.showNotification('Game data exported successfully!', 'success');
        } catch (error) {
            console.error('Failed to export data:', error);
            this.showNotification('Failed to export data', 'error');
        }
    }

    /**
     * Import game data
     */
    importGameData() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';

        input.onchange = (event) => {
            const file = event.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const gameData = JSON.parse(e.target.result);

                    // Validate data structure
                    if (!gameData.statistics || !gameData.settings || !gameData.gameState) {
                        throw new Error('Invalid data format');
                    }

                    // Import statistics
                    Object.keys(gameData.statistics).forEach(key => {
                        storage.set(key, gameData.statistics[key]);
                    });

                    // Import settings
                    if (gameData.settings.theme) {
                        themeManager.setTheme(gameData.settings.theme);
                    }
                    if (typeof gameData.settings.audioEnabled === 'boolean') {
                        if (gameData.settings.audioEnabled) {
                            audioManager.enable();
                        } else {
                            audioManager.disable();
                        }
                    }
                    if (typeof gameData.settings.masterVolume === 'number') {
                        audioManager.setMasterVolume(gameData.settings.masterVolume);
                        storage.set('masterVolume', gameData.settings.masterVolume);
                    }
                    if (typeof gameData.settings.sfxVolume === 'number') {
                        audioManager.setSFXVolume(gameData.settings.sfxVolume);
                        storage.set('sfxVolume', gameData.settings.sfxVolume);
                    }

                    Object.keys(gameData.settings).forEach(key => {
                        if (['autoSave', 'difficulty', 'fontSize', 'highContrast'].includes(key)) {
                            storage.set(key, gameData.settings[key]);
                        }
                    });

                    // Import game state
                    if (typeof gameData.gameState.coins === 'number') {
                        storage.setCoins(gameData.gameState.coins);
                    }
                    if (Array.isArray(gameData.gameState.unlockedThemes)) {
                        storage.set('unlockedThemes', gameData.gameState.unlockedThemes);
                    }
                    if (gameData.gameState.purchasedPowerUps) {
                        storage.set('purchasedPowerUps', gameData.gameState.purchasedPowerUps);
                    }

                    this.showNotification('Game data imported successfully!', 'success');
                    this.refreshSettingsPanel();

                } catch (error) {
                    console.error('Failed to import data:', error);
                    this.showNotification('Failed to import data - invalid format', 'error');
                }
            };
            reader.readAsText(file);
        };

        input.click();
    }

    /**
     * Refresh settings panel with current values
     */
    refreshSettingsPanel() {
        if (!this.menuElements.settingsPanel || !this.menuElements.settingsPanel.visible) return;

        // Hide and recreate the settings panel
        this.hideSettings();
        this.createSettingsPanel();
        this.showSettings();
    }

    /**
     * Apply font size setting
     */
    applyFontSize(size) {
        const multipliers = { small: 0.8, normal: 1.0, large: 1.2 };
        const multiplier = multipliers[size] || 1.0;

        // Apply to all text elements in the scene
        this.children.list.forEach(child => {
            if (child.type === 'Text') {
                const originalSize = parseInt(child.style.fontSize);
                child.setFontSize(Math.round(originalSize * multiplier));
            }
        });
    }

    /**
     * Apply high contrast setting
     */
    applyHighContrast(enabled) {
        if (enabled) {
            // Force high contrast theme temporarily
            const highContrastTheme = {
                background: '#000000',
                text: '#FFFFFF',
                primary: '#FFFFFF',
                secondary: '#FFFF00',
                accent: '#00FF00'
            };

            // Apply high contrast colors to UI elements
            this.children.list.forEach(child => {
                if (child.type === 'Text') {
                    child.setColor(highContrastTheme.text);
                }
            });
        } else {
            // Restore original theme colors
            const theme = themeManager.getCurrentTheme();
            this.children.list.forEach(child => {
                if (child.type === 'Text') {
                    child.setColor(theme.text);
                }
            });
        }
    }

    /**
     * Show notification message
     */
    showNotification(message, type = 'info') {
        const centerX = this.cameras.main.centerX;
        const centerY = this.cameras.main.centerY;

        const colors = {
            success: '#00AA00',
            error: '#AA0000',
            info: '#0066AA'
        };

        const notification = this.add.container(centerX, centerY - 200);

        const bg = this.add.rectangle(0, 0, 300, 50, 0x000000, 0.9);
        const border = this.add.rectangle(0, 0, 302, 52, parseInt(colors[type].replace('#', ''), 16), 0.8);
        border.setStrokeStyle(2, parseInt(colors[type].replace('#', ''), 16));

        const text = this.add.text(0, 0, message, {
            fontSize: '14px',
            fontFamily: 'Arial, sans-serif',
            color: colors[type],
            align: 'center',
            wordWrap: { width: 280 }
        });
        text.setOrigin(0.5);

        notification.add([border, bg, text]);

        // Auto-hide after 3 seconds
        this.time.delayedCall(3000, () => {
            this.tweens.add({
                targets: notification,
                alpha: 0,
                duration: 500,
                onComplete: () => notification.destroy()
            });
        });
    }

    /**
     * Update statistics content
     */
    updateStatisticsContent() {
        if (!this.menuElements.statsPanel || !this.menuElements.statsContent) return;

        // Clear existing content
        this.menuElements.statsContent.removeAll(true);

        const centerX = this.cameras.main.centerX;
        const stats = storage.getStatistics();

        switch (this.currentStatsTab) {
            case 'overview':
                this.createOverviewStats(centerX, stats);
                break;
            case 'records':
                this.createRecordStats(centerX, stats);
                break;
            default:
                this.createOverviewStats(centerX, stats);
                break;
        }
    }

    /**
     * Create overview statistics display
     */
    createOverviewStats(centerX, stats) {
        const centerY = this.cameras.main.centerY;
        const panelHeight = Math.min(550, this.cameras.main.height - 120);
        const contentStartY = centerY - panelHeight / 2 + 120; // Start below tabs and title
        let currentY = contentStartY;

        // Game Overview Section
        this.addStatsSection('🎮 Game Overview', centerX, currentY);
        currentY += 40;

        const overviewData = [
            `Total Games Played: ${stats.totalGames || 0}`,
            `Total Play Time: ${this.formatDuration(stats.totalPlayTime || 0)}`,
            `Average Session: ${this.formatDuration(stats.averageSessionTime || 0)}`,
            `High Score: ${stats.highScore || 0}`,
            `Total Score: ${stats.totalScore || 0}`,
            `Lines Cleared: ${stats.linesCleared || 0}`
        ];

        overviewData.forEach((text, index) => {
            this.addStatsText(text, centerX, currentY + (index * 25));
        });
        currentY += overviewData.length * 25 + 20;

        // Recent Activity Section
        this.addStatsSection('📅 Recent Activity', centerX, currentY);
        currentY += 40;

        // Fix stats calculation - use consistent property names
        const totalGamesPlayed = stats.totalGames || stats.gamesPlayed || 0;
        const recentData = [
            `Total Games: ${totalGamesPlayed}`,
            `Total Score: ${stats.totalScore || 0}`,
            `Last Played: ${stats.lastPlayed ? new Date(stats.lastPlayed).toLocaleDateString() : 'Never'}`,
            `Highest Score: ${stats.highScore || 0}`
        ];

        recentData.forEach((text, index) => {
            this.addStatsText(text, centerX, currentY + (index * 25));
        });
    }

    /**
     * Create performance statistics display
     */
    createPerformanceStats(centerX, stats) {
        const centerY = this.cameras.main.centerY;
        const panelHeight = Math.min(550, this.cameras.main.height - 120);
        const contentStartY = centerY - panelHeight / 2 + 120; // Start below tabs and title
        let currentY = contentStartY;

        // Performance Metrics Section
        this.addStatsSection('🎯 Performance Metrics', centerX, currentY);
        currentY += 40;

        const avgScore = Math.round(stats.averageScore || 0);
        const efficiency = Math.round((stats.gameplayEfficiency || 0) * 100) / 100;
        const decisionTime = this.formatDuration(stats.decisionSpeed || 0);

        const performanceData = [
            `Average Score: ${avgScore}`,
            `Gameplay Efficiency: ${efficiency} blocks/min`,
            `Average Decision Time: ${decisionTime}`,
            `Perfect Clears: ${stats.perfectClears || 0}`,
            `Total Combos: ${stats.combosAchieved || 0}`,
            `Max Combo Chain: ${stats.maxComboChain || 0}`
        ];

        performanceData.forEach((text, index) => {
            this.addStatsText(text, centerX, currentY + (index * 25));
        });
        currentY += performanceData.length * 25 + 20;

        // Block Placement Stats
        this.addStatsSection('🧩 Block Statistics', centerX, currentY);
        currentY += 40;

        const blockData = [
            `Total Blocks Placed: ${stats.totalBlocksPlaced || 0}`,
            `Total Shapes Used: ${stats.totalShapesUsed || 0}`,
            `Average Blocks/Game: ${Math.round(stats.averageBlocksPerGame || 0)}`,
            `Most Used Shape: ${stats.mostUsedShape || 'None'}`,
            `Least Used Shape: ${stats.leastUsedShape || 'None'}`
        ];

        blockData.forEach((text, index) => {
            this.addStatsText(text, centerX, currentY + (index * 25));
        });
    }

    /**
     * Create pattern analysis display
     */
    createPatternStats(centerX, stats) {
        const centerY = this.cameras.main.centerY;
        const panelHeight = Math.min(550, this.cameras.main.height - 120);
        const contentStartY = centerY - panelHeight / 2 + 120; // Start below tabs and title
        let currentY = contentStartY;

        // Playing Patterns Section
        this.addStatsSection('📈 Playing Patterns', centerX, currentY);
        currentY += 40;

        const patternData = [
            `Difficulty Preference: ${(stats.difficultyPreference || 'normal').charAt(0).toUpperCase() + (stats.difficultyPreference || 'normal').slice(1)}`,
            `Favorite Playing Time: ${stats.favoritePlayingTime || 'Not determined'}`,
            `Power-ups Used: ${stats.powerUpsUsed || 0}`,
            `Coins Earned: ${stats.coinsEarned || 0}`,
            `Coins Spent: ${stats.coinsSpent || 0}`
        ];

        patternData.forEach((text, index) => {
            this.addStatsText(text, centerX, currentY + (index * 25));
        });
        currentY += patternData.length * 25 + 20;

        // Shape Usage Analysis
        this.addStatsSection('🔍 Shape Usage Analysis', centerX, currentY);
        currentY += 40;

        const shapeUsage = stats.shapeUsageCount || {};
        const shapeEntries = Object.entries(shapeUsage).sort((a, b) => b[1] - a[1]);

        if (shapeEntries.length > 0) {
            shapeEntries.slice(0, 5).forEach(([shape, count], index) => {
                this.addStatsText(`${shape}: ${count} times`, centerX, currentY + (index * 25));
            });
        } else {
            this.addStatsText('No shape data available yet', centerX, currentY);
        }
    }

    /**
     * Create personal records and mode statistics display
     */
    createRecordStats(centerX, stats) {
        const centerY = this.cameras.main.centerY;
        const panelHeight = Math.min(550, this.cameras.main.height - 120);
        const contentStartY = centerY - panelHeight / 2 + 120; // Start below tabs and title
        let currentY = contentStartY;

        // Personal Records Section
        this.addStatsSection('🏆 Personal Records', centerX, currentY);
        currentY += 40;

        const records = stats.personalRecords || {};
        const recordData = [
            `Highest Single Score: ${records.highestSingleScore || 0}`,
            `Most Lines in One Game: ${records.mostLinesInOneGame || 0}`,
            `Longest Combo Chain: ${records.longestComboChain || 0}`,
            `Best Score Streak: ${stats.bestScoreStreak || 0} games`
        ];

        recordData.forEach((text, index) => {
            this.addStatsText(text, centerX, currentY + (index * 25));
        });
        currentY += recordData.length * 25 + 30;

        // Mode Statistics Section
        this.addStatsSection('� Mode Statistics', centerX, currentY);
        currentY += 40;

        const modeStats = stats.modeStats || {};
        const modes = [
            { key: 'normal', name: 'Normal Mode', icon: '🎯' },
            { key: 'endless', name: 'Endless Mode', icon: '♾️' },
            { key: 'daily', name: 'Daily Challenge', icon: '📅' },
            { key: 'adventure', name: 'Adventure Mode', icon: '🗺️' },
            { key: 'puzzle', name: 'Puzzle Mode', icon: '🧩' }
        ];

        modes.forEach((mode, index) => {
            const modeData = modeStats[mode.key] || {};
            const gamesPlayed = modeData.gamesPlayed || 0;
            const highScore = modeData.highScore || 0;
            const totalScore = modeData.totalScore || 0;
            const avgScore = gamesPlayed > 0 ? Math.round(totalScore / gamesPlayed) : 0;

            // Mode header
            this.addStatsText(`${mode.icon} ${mode.name}`, centerX, currentY, '#FFD700');
            currentY += 25;

            if (gamesPlayed > 0) {
                this.addStatsText(`  Games Played: ${gamesPlayed}`, centerX, currentY);
                currentY += 20;
                this.addStatsText(`  High Score: ${highScore.toLocaleString()}`, centerX, currentY);
                currentY += 20;
                this.addStatsText(`  Average Score: ${avgScore.toLocaleString()}`, centerX, currentY);
                currentY += 25;
            } else {
                this.addStatsText(`  No games played yet`, centerX, currentY, '#888888');
                currentY += 25;
            }
        });

        // Achievements Section
        this.addStatsSection('🎖️ Achievements', centerX, currentY);
        currentY += 40;

        const achievements = this.calculateAchievements(stats);
        achievements.forEach((achievement, index) => {
            const color = achievement.unlocked ? '#4CAF50' : '#888888';
            const status = achievement.unlocked ? '✅' : '🔒';
            this.addStatsText(`${status} ${achievement.name}`, centerX, currentY, color);
            currentY += 20;
            if (achievement.description) {
                this.addStatsText(`    ${achievement.description}`, centerX, currentY, '#CCCCCC');
                currentY += 20;
            }
            currentY += 10;
        });
    }

    /**
     * Calculate achievements based on statistics
     */
    calculateAchievements(stats) {
        const achievements = [];
        const totalGamesPlayed = stats.totalGamesPlayed || 0;
        const totalScore = stats.totalScore || 0;
        const totalLinesCleared = stats.totalLinesCleared || 0;
        const records = stats.personalRecords || {};

        // Basic achievements
        achievements.push({
            name: 'First Steps',
            description: 'Play your first game',
            unlocked: totalGamesPlayed >= 1
        });

        achievements.push({
            name: 'Getting Started',
            description: 'Play 10 games',
            unlocked: totalGamesPlayed >= 10
        });

        achievements.push({
            name: 'Dedicated Player',
            description: 'Play 50 games',
            unlocked: totalGamesPlayed >= 50
        });

        achievements.push({
            name: 'High Scorer',
            description: 'Reach 10,000 points in a single game',
            unlocked: (records.highestSingleScore || 0) >= 10000
        });

        achievements.push({
            name: 'Line Master',
            description: 'Clear 1,000 total lines',
            unlocked: totalLinesCleared >= 1000
        });

        achievements.push({
            name: 'Combo Expert',
            description: 'Achieve a 5x combo',
            unlocked: (records.longestComboChain || 0) >= 5
        });

        return achievements;
    }

    /**
     * Create mode-specific statistics display
     */
    createModeStats(centerX, stats) {
        const startY = -240;
        let currentY = startY;

        const modeStats = stats.modeStats || {};
        const modes = [
            { key: 'normal', name: '🎮 Normal Mode' },
            { key: 'endless', name: '♾️ Endless Mode' },
            { key: 'daily', name: '📅 Daily Challenge' },
            { key: 'adventure', name: '🗺️ Adventure Mode' },
            { key: 'puzzle', name: '🧩 Puzzle Mode' }
        ];

        modes.forEach((mode, modeIndex) => {
            const modeData = modeStats[mode.key] || { gamesPlayed: 0, averageScore: 0, bestScore: 0, totalTime: 0 };

            this.addStatsSection(mode.name, centerX, currentY);
            currentY += 40;

            const modeInfo = [
                `Games Played: ${modeData.gamesPlayed}`,
                `Average Score: ${Math.round(modeData.averageScore)}`,
                `Best Score: ${modeData.bestScore}`,
                `Total Time: ${this.formatDuration(modeData.totalTime)}`
            ];

            modeInfo.forEach((text, index) => {
                this.addStatsText(text, centerX, currentY + (index * 20));
            });

            currentY += modeInfo.length * 20 + 30;
        });
    }

    /**
     * Add a statistics section header
     */
    addStatsSection(title, x, y) {
        const text = this.add.text(x, y, title, {
            fontSize: '16px',
            fontFamily: 'Arial, sans-serif',
            color: themeManager.getCurrentTheme().accent,
            fontStyle: 'bold'
        });
        text.setOrigin(0.5);
        this.menuElements.statsContent.add(text);
    }

    /**
     * Add a statistics text line
     */
    addStatsText(content, x, y, color = null) {
        const text = this.add.text(x, y, content, {
            fontSize: '13px',
            fontFamily: 'Arial, sans-serif',
            color: color || themeManager.getCurrentTheme().text
        });
        text.setOrigin(0.5);
        this.menuElements.statsContent.add(text);
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
     * Update shop content based on selected category
     */
    updateShopContent() {
        if (!this.menuElements.shopContent) return;

        // Clear existing content
        this.menuElements.shopContent.removeAll(true);

        // Update coins display
        if (this.menuElements.coinsDisplay) {
            const coins = storage.getCoins();
            this.menuElements.coinsDisplay.setText(`💰 ${coins} coins`);
        }

        const centerX = this.cameras.main.centerX;
        const centerY = this.cameras.main.centerY;
        const panelHeight = Math.min(600, this.cameras.main.height - 120);
        const startY = centerY - panelHeight / 2 + 120; // Position below title and tabs

        // Get filtered power-ups based on category
        const powerUps = this.getFilteredPowerUps();

        // Create power-up items
        this.createPowerUpItems(powerUps, centerX, startY);
    }

    /**
     * Get power-ups filtered by current category
     */
    getFilteredPowerUps() {
        const allPowerUps = Object.values(POWER_UPS);

        if (this.currentShopCategory === 'all') {
            return allPowerUps;
        }

        return allPowerUps.filter(powerUpType => {
            const info = POWER_UP_INFO[powerUpType];
            return info && info.category === this.currentShopCategory;
        });
    }

    /**
     * Create display showing all 9 power-ups
     */
    createAllPowerUpsDisplay(centerX, startY) {
        const allPowerUps = Object.values(POWER_UPS);
        const coins = storage.getCoins();
        const ownedPowerUps = storage.getPowerUps();

        // Use 3 columns layout with all 9 power-ups
        const itemsPerRow = 3;
        const itemWidth = 120;
        const spacing = 130;
        const totalWidth = (itemsPerRow - 1) * spacing;
        const startX = centerX - totalWidth / 2;

        allPowerUps.forEach((powerUpType, index) => {
            const info = POWER_UP_INFO[powerUpType];
            const cost = POWER_UP_COSTS.NORMAL[powerUpType];
            const owned = ownedPowerUps[powerUpType] || 0;

            const row = Math.floor(index / itemsPerRow);
            const col = index % itemsPerRow;
            const x = startX + col * spacing;
            const y = startY + row * 110; // Adjust spacing for better layout

            this.createPowerUpCard(powerUpType, info, cost, owned, coins, x, y);
        });
    }

    /**
     * Create power-up item displays
     */
    createPowerUpItems(powerUps, centerX, startY) {
        const coins = storage.getCoins();
        const ownedPowerUps = storage.getPowerUps();

        // Use 3 columns layout with smaller, cleaner cards
        const itemsPerRow = 3;
        const itemWidth = 100;
        const spacing = 110;
        const totalWidth = (itemsPerRow - 1) * spacing;
        const startX = centerX - totalWidth / 2;

        powerUps.forEach((powerUpType, index) => {
            const info = POWER_UP_INFO[powerUpType];
            const cost = POWER_UP_COSTS.NORMAL[powerUpType];
            const owned = ownedPowerUps[powerUpType] || 0;

            const row = Math.floor(index / itemsPerRow);
            const col = index % itemsPerRow;
            const x = startX + col * spacing;
            const y = startY + row * 90; // Reduced spacing to fit more rows

            this.createPowerUpCard(powerUpType, info, cost, owned, coins, x, y);
        });
    }

    /**
     * Create individual power-up card
     */
    createPowerUpCard(powerUpType, info, cost, owned, playerCoins, x, y) {
        // Card background with rarity color - bigger cards
        const rarityColors = {
            common: '#4A4A4A',
            uncommon: '#2E7D32',
            rare: '#1565C0',
            epic: '#7B1FA2',
            legendary: '#E65100'
        };

        const cardBg = this.add.rectangle(x, y, 120, 90, parseInt(rarityColors[info.rarity].replace('#', ''), 16), 0.3);
        const cardBorder = this.add.rectangle(x, y, 122, 92, parseInt(rarityColors[info.rarity].replace('#', ''), 16));
        cardBorder.setStrokeStyle(2, parseInt(rarityColors[info.rarity].replace('#', ''), 16));

        this.menuElements.shopContent.add([cardBorder, cardBg]);

        // Power-up icon - bigger
        const iconText = this.add.text(x, y - 30, info.icon, {
            fontSize: '20px'
        });
        iconText.setOrigin(0.5);
        this.menuElements.shopContent.add(iconText);

        // Power-up name
        const nameText = this.add.text(x, y - 10, info.name, {
            fontSize: '12px',
            fontFamily: 'Arial, sans-serif',
            color: themeManager.getCurrentTheme().text,
            fontStyle: 'bold'
        });
        nameText.setOrigin(0.5, 0.5);
        this.menuElements.shopContent.add(nameText);

        // Description text
        const descText = this.add.text(x, y + 5, info.description, {
            fontSize: '9px',
            fontFamily: 'Arial, sans-serif',
            color: themeManager.getCurrentTheme().textSecondary,
            wordWrap: { width: 110 }
        });
        descText.setOrigin(0.5, 0.5);
        this.menuElements.shopContent.add(descText);

        // Owned count  
        const ownedText = this.add.text(x, y + 20, `Owned: ${owned}`, {
            fontSize: '10px',
            fontFamily: 'Arial, sans-serif',
            color: themeManager.getCurrentTheme().accent,
            fontStyle: 'bold'
        });
        ownedText.setOrigin(0.5, 0.5);
        this.menuElements.shopContent.add(ownedText);

        // Purchase button - bigger and more prominent
        const canAfford = playerCoins >= cost;
        const buyButton = this.createMenuButton(
            x, y + 35, 60, 20,
            `💰 ${cost}`,
            canAfford ? () => this.purchasePowerUp(powerUpType) : null
        );

        if (!canAfford) {
            buyButton.setAlpha(0.5);
        }
        this.menuElements.shopContent.add(buyButton);
    }

    /**
     * Purchase a single power-up
     */
    purchasePowerUp(powerUpType) {
        const cost = POWER_UP_COSTS.NORMAL[powerUpType];
        const coins = storage.getCoins();

        if (coins >= cost) {
            // Deduct coins
            storage.setCoins(coins - cost);

            // Add power-up
            storage.addPowerUp(powerUpType, 1);

            // Track analytics
            analyticsManager.trackCoinsEarned(-cost, 'power_up_purchase');

            // Show purchase confirmation
            this.showPurchaseConfirmation(powerUpType, 1);

            // Update shop display
            this.updateShopContent();
        }
    }



    /**
     * Show purchase confirmation popup
     */
    showPurchaseConfirmation(powerUpType, quantity) {
        const info = POWER_UP_INFO[powerUpType];

        const message = quantity === 1
            ? `Purchased ${info.icon} ${info.name}!`
            : `Purchased ${quantity}x ${info.icon} ${info.name}!`;

        this.showNotification(message, 'success');
    }

    /**
     * Confirm reset data
     */
    confirmResetData() {
        // Simple confirmation - in a full implementation, you'd want a proper dialog
        if (confirm('Are you sure you want to reset all game data? This cannot be undone.')) {
            storage.resetAllData();
            location.reload();
        }
    }

    /**
     * Update theme colors
     */
    updateTheme() {
        const colors = themeManager.getPhaserColors();
        this.cameras.main.setBackgroundColor(colors.background);

        // Update all UI elements with new theme colors
        // This is a simplified version - full implementation would update all elements
        // Note: Rainbow title doesn't need color update as it uses fixed rainbow colors
        if (this.menuElements.subtitle) {
            this.menuElements.subtitle.setColor(themeManager.getCurrentTheme().textSecondary);
        }
    }

    /**
     * Create rainbow-colored title with each letter in different color
     */
    createRainbowTitle(x, y, text) {
        const container = this.add.container(x, y);
        const rainbowColors = [
            '#FF6B6B', // Red
            '#FF9F43', // Orange  
            '#FFDD59', // Yellow
            '#26de81', // Green
            '#4834d4', // Blue
            '#a55eea', // Purple
            '#fd79a8', // Pink
            '#00cec9', // Cyan
            '#fab1a0', // Peach
            '#74b9ff'  // Light Blue
        ];
        
        const fontSize = 35;
        const letterSpacing = 1;  
        let currentX = 0;
        
        // Calculate total width for centering
        const totalWidth = text.length * (fontSize * 0.5 + letterSpacing);
        currentX = -totalWidth / 2;
        
        // Create each letter with different color
        for (let i = 0; i < text.length; i++) {
            const letter = text[i];
            const color = rainbowColors[i % rainbowColors.length];
            
            const letterText = this.add.text(currentX, 0, letter, {
                fontSize: fontSize + 'px',
                fontFamily: 'Arial Black, sans-serif',
                color: color,
                fontStyle: 'bold',
                stroke: '#000000',
                strokeThickness: 3,
                shadow: {
                    offsetX: 2,
                    offsetY: 2,
                    color: '#000000',
                    blur: 3,
                    fill: true
                }
            }).setOrigin(0, 0.5);
            
            container.add(letterText);
            
            // Move to next letter position
            currentX += letterText.width + letterSpacing;
        }
        
        return container;
    }

    /**
     * Clean up
     */
    destroy() {
        // Stop title animations
        if (this.titleColorTween) {
            this.titleColorTween.stop();
        }

        this.animationTweens.forEach(tween => tween.stop());
        this.animationTweens = [];

        // Stop background animations
        if (this.backgroundAnimationTimer) {
            this.backgroundAnimationTimer.destroy();
            this.backgroundAnimationTimer = null;
        }

        // Clean up background elements
        if (this.backgroundLayers) {
            this.backgroundLayers.forEach(layer => {
                if (layer && layer.destroy) layer.destroy();
            });
            this.backgroundLayers = [];
        }

        if (this.particles) {
            this.particles.forEach(particle => {
                if (particle && particle.destroy) particle.destroy();
            });
            this.particles = [];
        }

        if (this.geometricShapes) {
            this.geometricShapes.forEach(shape => {
                if (shape && shape.destroy) shape.destroy();
            });
            this.geometricShapes = [];
        }

        if (this.pulsingOrbs) {
            this.pulsingOrbs.forEach(orb => {
                if (orb && orb.destroy) orb.destroy();
            });
            this.pulsingOrbs = [];
        }

        if (this.waveGraphics && this.waveGraphics.destroy) {
            this.waveGraphics.destroy();
            this.waveGraphics = null;
        }
    }
}