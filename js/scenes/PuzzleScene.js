// Puzzle mode scene - Complete puzzle pack system
import { PUZZLE_PACKS, DEFAULT_PUZZLE_PROGRESS } from '../core/constants.js';
import { themeManager } from '../core/themes.js';
import { storage } from '../core/storage.js';
import { audioManager } from '../core/audio.js';
import { analyticsManager } from '../core/analytics.js';

export class PuzzleScene extends Phaser.Scene {
    constructor() {
        super({ key: 'PuzzleScene' });
        this.currentView = 'packs'; // 'packs', 'puzzles', 'playing'
        this.selectedPack = null;
        this.currentPuzzle = null;
        this.gameActive = false;
        this.puzzleStats = {
            moves: 0,
            score: 0,
            startTime: 0,
            hintsUsed: 0,
            maxCombo: 0,
            currentCombo: 0
        };
    }

    init(data) {
        this.selectedPack = data.pack || null;
        this.currentPuzzle = data.puzzle || null;

        if (this.currentPuzzle) {
            this.currentView = 'playing';
        } else if (this.selectedPack) {
            this.currentView = 'puzzles';
        } else {
            this.currentView = 'packs';
        }

        // Load puzzle progress
        this.puzzleProgress = storage.get('puzzle_progress') || DEFAULT_PUZZLE_PROGRESS;
    }

    create() {
        this.colors = themeManager.getPhaserColors();
        this.cameras.main.setBackgroundColor(this.colors.background);

        switch (this.currentView) {
            case 'packs':
                this.createPackSelection();
                break;
            case 'puzzles':
                this.createPuzzleList();
                break;
            case 'playing':
                this.startPuzzle();
                break;
        }
    }

    createPackSelection() {
        // Title
        this.add.text(this.scale.width / 2, 50, 'Puzzle Packs', {
            fontSize: '28px',
            fontFamily: 'Arial, sans-serif',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        // Back button
        const backButton = this.add.rectangle(40, 40, 60, 30, 0x444444)
            .setInteractive()
            .on('pointerdown', () => {
                audioManager.playPlace();
                this.scene.start('MenuScene');
            });

        this.add.text(40, 40, 'Back', {
            fontSize: '14px',
            color: '#ffffff'
        }).setOrigin(0.5);

        // Pack buttons
        let yPos = 120;
        Object.values(PUZZLE_PACKS).forEach((pack, index) => {
            this.createPackButton(pack, yPos + (index * 90));
        });
    }

    createPackButton(pack, yPos) {
        const progress = this.puzzleProgress.packs[pack.id];
        const isUnlocked = progress.unlocked;

        // Button background
        const buttonColor = isUnlocked ? 0x2a4a3a : 0x2a2a2a;
        const button = this.add.rectangle(this.scale.width / 2, yPos, 350, 80, buttonColor)
            .setStrokeStyle(2, isUnlocked ? 0x4a7a5a : 0x4a4a4a);

        if (isUnlocked) {
            button.setInteractive()
                .on('pointerdown', () => {
                    audioManager.playPlace();
                    // Set theme for this pack
                    themeManager.setTheme(pack.theme);
                    this.scene.restart({ pack: pack.id });
                });
        }

        // Pack name
        this.add.text(this.scale.width / 2 - 160, yPos - 20, pack.name, {
            fontSize: '20px',
            fontFamily: 'Arial, sans-serif',
            color: isUnlocked ? '#ffffff' : '#666666',
            fontStyle: 'bold'
        }).setOrigin(0, 0.5);

        // Description
        this.add.text(this.scale.width / 2 - 160, yPos + 5, pack.description, {
            fontSize: '14px',
            fontFamily: 'Arial, sans-serif',
            color: isUnlocked ? '#cccccc' : '#555555'
        }).setOrigin(0, 0.5);

        // Progress info
        if (isUnlocked) {
            this.add.text(this.scale.width / 2 + 120, yPos - 10, `${progress.completed}/${progress.total}`, {
                fontSize: '16px',
                color: '#4a7a5a',
                fontStyle: 'bold'
            }).setOrigin(0.5);

            this.add.text(this.scale.width / 2 + 120, yPos + 10, 'Complete', {
                fontSize: '12px',
                color: '#cccccc'
            }).setOrigin(0.5);

            // Difficulty indicator
            const difficulty = this.getPackDifficulty(pack);
            const difficultyColor = ['#4a7a5a', '#7a7a4a', '#7a5a4a', '#7a4a4a'][difficulty - 1] || '#4a7a5a';

            for (let i = 0; i < 4; i++) {
                this.add.circle(this.scale.width / 2 - 160 + (i * 12), yPos + 25, 4,
                    i < difficulty ? difficultyColor : 0x333333);
            }
        } else {
            this.add.text(this.scale.width / 2 + 120, yPos, 'Locked', {
                fontSize: '16px',
                color: '#666666',
                fontStyle: 'italic'
            }).setOrigin(0.5);
        }
    }

    createPuzzleList() {
        const pack = PUZZLE_PACKS[this.selectedPack];
        if (!pack) return;

        // Set theme
        themeManager.setTheme(pack.theme);
        this.colors = themeManager.getPhaserColors();
        this.cameras.main.setBackgroundColor(this.colors.background);

        // Title
        this.add.text(this.scale.width / 2, 50, pack.name, {
            fontSize: '24px',
            fontFamily: 'Arial, sans-serif',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        this.add.text(this.scale.width / 2, 75, pack.description, {
            fontSize: '14px',
            fontFamily: 'Arial, sans-serif',
            color: '#cccccc'
        }).setOrigin(0.5);

        // Back button
        const backButton = this.add.rectangle(40, 40, 60, 30, 0x444444)
            .setInteractive()
            .on('pointerdown', () => {
                audioManager.playPlace();
                this.currentView = 'packs';
                this.scene.restart();
            });

        this.add.text(40, 40, 'Back', {
            fontSize: '14px',
            color: '#ffffff'
        }).setOrigin(0.5);

        // Puzzle buttons
        let yPos = 120;
        pack.puzzles.forEach((puzzle, index) => {
            this.createPuzzleButton(puzzle, yPos + (index * 80), pack.id);
        });
    }

    createPuzzleButton(puzzle, yPos, packId) {
        const puzzleProgress = this.puzzleProgress.puzzles[puzzle.id] ||
            { completed: false, stars: 0, bestScore: 0, bestMoves: 999 };

        // Check if unlocked (first puzzle or previous completed)
        const pack = PUZZLE_PACKS[packId];
        const puzzleIndex = pack.puzzles.findIndex(p => p.id === puzzle.id);
        const isUnlocked = puzzleIndex === 0 ||
            (puzzleIndex > 0 && this.puzzleProgress.puzzles[pack.puzzles[puzzleIndex - 1].id]?.completed);

        // Button background
        const buttonColor = isUnlocked ? 0x2a3a4a : 0x2a2a2a;
        const button = this.add.rectangle(this.scale.width / 2, yPos, 350, 70, buttonColor)
            .setStrokeStyle(2, isUnlocked ? 0x4a6a7a : 0x4a4a4a);

        if (isUnlocked) {
            button.setInteractive()
                .on('pointerdown', () => {
                    audioManager.playPlace();
                    this.scene.restart({ pack: packId, puzzle: puzzle.id });
                });
        }

        // Puzzle name and info
        this.add.text(this.scale.width / 2 - 160, yPos - 15, puzzle.name, {
            fontSize: '18px',
            fontFamily: 'Arial, sans-serif',
            color: isUnlocked ? '#ffffff' : '#666666',
            fontStyle: 'bold'
        }).setOrigin(0, 0.5);

        this.add.text(this.scale.width / 2 - 160, yPos + 5, puzzle.description, {
            fontSize: '12px',
            fontFamily: 'Arial, sans-serif',
            color: isUnlocked ? '#cccccc' : '#555555'
        }).setOrigin(0, 0.5);

        // Difficulty stars
        const difficulty = puzzle.difficulty;
        for (let i = 0; i < 5; i++) {
            const starColor = i < difficulty ? '#FFD700' : '#333333';
            this.add.text(this.scale.width / 2 - 160 + (i * 15), yPos + 20, '★', {
                fontSize: '12px',
                color: starColor
            });
        }

        if (isUnlocked) {
            // Completion stars
            const stars = puzzleProgress.stars;
            for (let i = 0; i < 3; i++) {
                const starColor = i < stars ? '#4a7a5a' : '#444444';
                this.add.text(this.scale.width / 2 + 120 + (i * 20), yPos - 15, '★', {
                    fontSize: '16px',
                    color: starColor
                });
            }

            // Best stats
            if (puzzleProgress.completed) {
                this.add.text(this.scale.width / 2 + 120, yPos + 5, `Best: ${puzzleProgress.bestMoves} moves`, {
                    fontSize: '10px',
                    color: '#cccccc'
                });
                this.add.text(this.scale.width / 2 + 120, yPos + 17, `Score: ${puzzleProgress.bestScore}`, {
                    fontSize: '10px',
                    color: '#cccccc'
                });
            }
        }
    }

    startPuzzle() {
        const pack = PUZZLE_PACKS[this.selectedPack];
        const puzzle = pack.puzzles.find(p => p.id === this.currentPuzzle);

        if (!puzzle) return;

        // Set theme
        themeManager.setTheme(pack.theme);
        this.colors = themeManager.getPhaserColors();
        this.cameras.main.setBackgroundColor(this.colors.background);

        // Initialize puzzle state
        this.gameActive = true;
        this.puzzleStats = {
            moves: 0,
            score: 0,
            startTime: Date.now(),
            hintsUsed: 0,
            maxCombo: 0,
            currentCombo: 0
        };

        // Show puzzle intro
        this.showPuzzleIntro(puzzle);
    }

    showPuzzleIntro(puzzle) {
        // Create a container for all intro elements for easy cleanup
        const introContainer = this.add.container(0, 0);

        // Semi-transparent overlay
        const overlay = this.add.rectangle(this.scale.width / 2, this.scale.height / 2,
            this.scale.width, this.scale.height, 0x000000, 0.8);
        introContainer.add(overlay);

        // Info panel
        const panelWidth = Math.min(360, this.scale.width - 40);
        const panelHeight = 350;
        const panel = this.add.rectangle(this.scale.width / 2, this.scale.height / 2,
            panelWidth, panelHeight, 0x1a1a1a)
            .setStrokeStyle(2, this.colors.primary);
        introContainer.add(panel);

        // Puzzle title
        const titleText = this.add.text(this.scale.width / 2, this.scale.height / 2 - 140, puzzle.name, {
            fontSize: '24px',
            fontFamily: 'Arial, sans-serif',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        introContainer.add(titleText);

        // Description
        const descText = this.add.text(this.scale.width / 2, this.scale.height / 2 - 110, puzzle.description, {
            fontSize: '14px',
            fontFamily: 'Arial, sans-serif',
            color: '#cccccc',
            align: 'center'
        }).setOrigin(0.5);
        introContainer.add(descText);

        // Objectives
        const objTitle = this.add.text(this.scale.width / 2, this.scale.height / 2 - 70, 'Objectives:', {
            fontSize: '16px',
            fontFamily: 'Arial, sans-serif',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        introContainer.add(objTitle);

        puzzle.objectives.forEach((objective, index) => {
            const objText = this.add.text(this.scale.width / 2, this.scale.height / 2 - 45 + (index * 20),
                `• ${objective.description}`, {
                fontSize: '12px',
                fontFamily: 'Arial, sans-serif',
                color: '#cccccc'
            }).setOrigin(0.5);
            introContainer.add(objText);
        });

        // Target moves
        const targetText = this.add.text(this.scale.width / 2, this.scale.height / 2 + 20,
            `Target Moves: ${puzzle.targetMoves}`, {
            fontSize: '14px',
            fontFamily: 'Arial, sans-serif',
            color: '#ffaa00',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        introContainer.add(targetText);

        // Hint button
        const hintButton = this.add.rectangle(this.scale.width / 2 - 60, this.scale.height - 40,
            100, 30, 0x666666)
            .setInteractive()
            .on('pointerdown', () => {
                this.showHint(puzzle);
            });
        introContainer.add(hintButton);

        const hintText = this.add.text(this.scale.width / 2 - 60, this.scale.height - 40, 'Hint', {
            fontSize: '14px',
            color: '#ffffff'
        }).setOrigin(0.5);
        introContainer.add(hintText);

        // Start button
        const startButton = this.add.rectangle(this.scale.width / 2 + 60, this.scale.height - 40,
            100, 30, this.colors.primary)
            .setInteractive()
            .on('pointerdown', () => {
                audioManager.playPlace();
                // Destroy the entire intro container - this removes all elements
                introContainer.destroy();
                this.startPuzzleGameplay(puzzle);
            });
        introContainer.add(startButton);

        const startText = this.add.text(this.scale.width / 2 + 60, this.scale.height - 40, 'Start', {
            fontSize: '14px',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        introContainer.add(startText);
    }

    showHint(puzzle) {
        if (!puzzle.hints || puzzle.hints.length === 0) return;

        const hintIndex = Math.min(this.puzzleStats.hintsUsed, puzzle.hints.length - 1);
        const hint = puzzle.hints[hintIndex];
        
        // Handle both old string format and new object format for backward compatibility
        const hintData = typeof hint === 'string' ? { text: hint, cost: 0 } : hint;
        
        // Get current coins
        const gameData = storage.get('gameData') || { coins: 100, stars: 0 };
        
        // Check if player can afford the hint
        if (hintData.cost > 0 && gameData.coins < hintData.cost) {
            this.showInsufficientCoinsDialog(hintData.cost);
            return;
        }
        
        // Show confirmation dialog if hint costs coins
        if (hintData.cost > 0) {
            this.showHintConfirmation(hintData, gameData);
        } else {
            this.displayHint(hintData);
        }
    }

    showInsufficientCoinsDialog(cost) {
        const container = this.add.container(0, 0);
        
        const overlay = this.add.rectangle(this.scale.width / 2, this.scale.height / 2,
            this.scale.width, this.scale.height, 0x000000, 0.7);
        container.add(overlay);
        
        const panel = this.add.rectangle(this.scale.width / 2, this.scale.height / 2,
            300, 150, 0x1a1a1a)
            .setStrokeStyle(2, 0xff6666);
        container.add(panel);
        
        const title = this.add.text(this.scale.width / 2, this.scale.height / 2 - 30, 'Not Enough Coins!', {
            fontSize: '16px',
            fontFamily: 'Arial, sans-serif',
            color: '#ff6666',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        container.add(title);
        
        const message = this.add.text(this.scale.width / 2, this.scale.height / 2, `This hint costs ${cost} coins.\nComplete more puzzles to earn coins!`, {
            fontSize: '12px',
            fontFamily: 'Arial, sans-serif',
            color: '#ffffff',
            align: 'center'
        }).setOrigin(0.5);
        container.add(message);
        
        const okButton = this.add.rectangle(this.scale.width / 2, this.scale.height / 2 + 40,
            80, 25, 0x666666)
            .setInteractive()
            .on('pointerdown', () => container.destroy());
        container.add(okButton);
        
        const okText = this.add.text(this.scale.width / 2, this.scale.height / 2 + 40, 'OK', {
            fontSize: '12px',
            color: '#ffffff'
        }).setOrigin(0.5);
        container.add(okText);
    }

    showHintConfirmation(hintData, gameData) {
        const container = this.add.container(0, 0);
        
        const overlay = this.add.rectangle(this.scale.width / 2, this.scale.height / 2,
            this.scale.width, this.scale.height, 0x000000, 0.7);
        container.add(overlay);
        
        const panel = this.add.rectangle(this.scale.width / 2, this.scale.height / 2,
            320, 180, 0x1a1a1a)
            .setStrokeStyle(2, 0xffaa00);
        container.add(panel);
        
        const title = this.add.text(this.scale.width / 2, this.scale.height / 2 - 50, 'Purchase Hint?', {
            fontSize: '16px',
            fontFamily: 'Arial, sans-serif',
            color: '#ffaa00',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        container.add(title);
        
        const costText = this.add.text(this.scale.width / 2, this.scale.height / 2 - 20, `Cost: ${hintData.cost} coins`, {
            fontSize: '14px',
            fontFamily: 'Arial, sans-serif',
            color: '#ffdd44'
        }).setOrigin(0.5);
        container.add(costText);
        
        const balanceText = this.add.text(this.scale.width / 2, this.scale.height / 2, `Your coins: ${gameData.coins}`, {
            fontSize: '12px',
            fontFamily: 'Arial, sans-serif',
            color: '#cccccc'
        }).setOrigin(0.5);
        container.add(balanceText);
        
        // Buy button
        const buyButton = this.add.rectangle(this.scale.width / 2 - 60, this.scale.height / 2 + 40,
            80, 25, 0x44aa44)
            .setInteractive()
            .on('pointerdown', () => {
                // Deduct coins
                gameData.coins -= hintData.cost;
                storage.set('gameData', gameData);
                
                // Update coins display if it exists
                this.updateCoinsDisplay();
                
                // Close confirmation and show hint
                container.destroy();
                this.displayHint(hintData);
                
                // Track hint usage
                this.puzzleStats.hintsUsed++;
            });
        container.add(buyButton);
        
        const buyText = this.add.text(this.scale.width / 2 - 60, this.scale.height / 2 + 40, 'Buy Hint', {
            fontSize: '10px',
            color: '#ffffff'
        }).setOrigin(0.5);
        container.add(buyText);
        
        // Cancel button
        const cancelButton = this.add.rectangle(this.scale.width / 2 + 60, this.scale.height / 2 + 40,
            80, 25, 0x666666)
            .setInteractive()
            .on('pointerdown', () => container.destroy());
        container.add(cancelButton);
        
        const cancelText = this.add.text(this.scale.width / 2 + 60, this.scale.height / 2 + 40, 'Cancel', {
            fontSize: '10px',
            color: '#ffffff'
        }).setOrigin(0.5);
        container.add(cancelText);
    }

    displayHint(hintData) {
        const container = this.add.container(0, 0);
        
        const overlay = this.add.rectangle(this.scale.width / 2, this.scale.height / 2,
            this.scale.width, this.scale.height, 0x000000, 0.7);
        container.add(overlay);
        
        const panel = this.add.rectangle(this.scale.width / 2, this.scale.height / 2,
            320, 200, 0x1a1a1a)
            .setStrokeStyle(2, 0xffaa00);
        container.add(panel);
        
        const title = this.add.text(this.scale.width / 2, this.scale.height / 2 - 70, 'Hint:', {
            fontSize: '18px',
            fontFamily: 'Arial, sans-serif',
            color: '#ffaa00',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        container.add(title);
        
        const hintText = this.add.text(this.scale.width / 2, this.scale.height / 2 - 20, hintData.text, {
            fontSize: '14px',
            fontFamily: 'Arial, sans-serif',
            color: '#ffffff',
            align: 'center',
            wordWrap: { width: 280 }
        }).setOrigin(0.5);
        container.add(hintText);
        
        // Show target shape if specified
        if (hintData.targetShape) {
            const shapeText = this.add.text(this.scale.width / 2, this.scale.height / 2 + 20, `Target shape: ${hintData.targetShape}`, {
                fontSize: '12px',
                fontFamily: 'Arial, sans-serif',
                color: '#ffdd44',
                fontStyle: 'italic'
            }).setOrigin(0.5);
            container.add(shapeText);
        }
        
        const closeButton = this.add.rectangle(this.scale.width / 2, this.scale.height / 2 + 60,
            80, 25, 0x666666)
            .setInteractive()
            .on('pointerdown', () => {
                container.destroy();
                // Remove highlight if it exists
                if (this.hintHighlight) {
                    this.hintHighlight.destroy();
                    this.hintHighlight = null;
                }
            });
        container.add(closeButton);
        
        const closeText = this.add.text(this.scale.width / 2, this.scale.height / 2 + 60, 'Close', {
            fontSize: '12px',
            color: '#ffffff'
        }).setOrigin(0.5);
        container.add(closeText);
        
        // Show highlight area if specified
        if (hintData.highlightArea && this.gameGrid) {
            this.showHintHighlight(hintData.highlightArea);
        }
    }

    showHintHighlight(highlightArea) {
        // Remove existing highlight
        if (this.hintHighlight) {
            this.hintHighlight.destroy();
            this.hintHighlight = null;
        }
        
        // Calculate position based on grid
        const gridX = this.scale.width / 2 - (10 * 32) / 2; // Assuming 32px blocks and 10-wide grid
        const gridY = 120; // Grid Y position
        
        const x = gridX + (highlightArea.col * 32);
        const y = gridY + (highlightArea.row * 32);
        const width = highlightArea.width * 32;
        const height = highlightArea.height * 32;
        
        // Create pulsing highlight rectangle
        this.hintHighlight = this.add.rectangle(x + width/2, y + height/2, width, height)
            .setStrokeStyle(3, 0xffaa00, 0.8)
            .setFillStyle(0xffaa00, 0.2);
        
        // Add pulsing animation
        this.tweens.add({
            targets: this.hintHighlight,
            alpha: 0.3,
            duration: 800,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }

    updateCoinsDisplay() {
        // Update coins display if it exists in the UI
        if (this.coinsText) {
            const gameData = storage.get('gameData') || { coins: 100, stars: 0 };
            this.coinsText.setText(`Coins: ${gameData.coins}`);
        }
    }

    async startPuzzleGameplay(puzzle) {
        // Initialize analytics for this puzzle
        analyticsManager.startGame('puzzle', puzzle.difficulty || 'normal');
        
        // Initialize game systems
        await this.initializeGameSystems();

        // Set up initial grid state
        if (puzzle.initialGrid) {
            this.gameGrid.setInitialState(puzzle.initialGrid);
        }

        // Create puzzle-specific shapes
        this.createPuzzleShapes(puzzle.availableShapes);

        // Create UI
        this.createPuzzleGameplayUI(puzzle);

        // Track objectives
        this.trackObjectives(puzzle);
    }

    async initializeGameSystems() {
        // Import game systems
        const { GameGrid } = await import('../systems/grid.js');
        const { ScoringManager } = await import('../systems/scoring.js');

        // Initialize systems
        this.gameGrid = new GameGrid(this);
        this.scoringManager = new ScoringManager(this);

        // Create game grid
        this.gameGrid.create();

        // Setup keyboard controls
        this.setupInputHandlers();
    }

    createPuzzleShapes(availableShapes) {
        // Import shape generator
        import('../systems/shapes.js').then(({ ShapeGenerator, SHAPE_PATTERNS_EASY }) => {
            this.shapeGenerator = new ShapeGenerator();

            // Create predefined shapes for puzzle
            this.puzzleShapes = [];
            availableShapes.forEach((shapeKey, index) => {
                const shape = this.createSpecificShape(shapeKey);
                if (shape) {
                    this.createShapeVisual(shape, index);
                }
            });
        });
    }

    createSpecificShape(shapeKey) {
        // Map shape keys to actual patterns
        const shapeMap = {
            'I_1': { pattern: [[1]], color: 0 },
            'I_2': { pattern: [[1], [1]], color: 0 },
            'I_4': { pattern: [[1], [1], [1], [1]], color: 0 },
            'O': { pattern: [[1, 1], [1, 1]], color: 1 },
            'L_1': { pattern: [[1, 0], [1, 1]], color: 2 },
            'L_2': { pattern: [[1, 1], [1, 0], [1, 0]], color: 2 },
            'L_CORNER': { pattern: [[0, 1], [1, 1]], color: 2 }, // L-shape for corner fitting
            'T': { pattern: [[0, 1, 0], [1, 1, 1]], color: 3 },
            'Z_1': { pattern: [[1, 1, 0], [0, 1, 1]], color: 4 },
            'L_2_I': { pattern: [[1, 1, 1], [0, 0, 1]], color: 2 },
        };

        return shapeMap[shapeKey] || null;
    }

    createShapeVisual(shape, index) {
        const x = 80 + (index * 60);
        const y = this.scale.height - 80; // Moved back down since no power-ups

        // Create shape visual using Container instead of Group
        const shapeGroup = this.add.container(x, y);

        // Calculate shape bounds for proper centering
        const shapeWidth = shape.pattern[0].length * 18;
        const shapeHeight = shape.pattern.length * 18;
        const offsetX = -shapeWidth / 2;
        const offsetY = -shapeHeight / 2;

        shape.pattern.forEach((row, rowIndex) => {
            row.forEach((cell, colIndex) => {
                if (cell) {
                    const block = this.add.rectangle(
                        offsetX + colIndex * 18 + 9, // +9 to center the 16px block in 18px cell
                        offsetY + rowIndex * 18 + 9,
                        16, 16,
                        this.colors.blockColors[shape.color]
                    ).setStrokeStyle(1, 0x333333);
                    shapeGroup.add(block);
                }
            });
        });

        // Make draggable
        shapeGroup.setInteractive(
            new Phaser.Geom.Rectangle(-30, -30, 60, 60),
            Phaser.Geom.Rectangle.Contains
        );

        this.input.setDraggable(shapeGroup);

        shapeGroup.on('drag', (pointer, dragX, dragY) => {
            // Apply mobile touch offset (keep shape above finger)
            const offsetY = -40;
            shapeGroup.x = dragX;
            shapeGroup.y = dragY + offsetY;
            
            if (this.gameGrid) {
                // Use adjusted coordinates for preview
                this.gameGrid.showPlacementPreview(shape, pointer.x, pointer.y + offsetY);
            }
            if (window.audioManager) {
                window.audioManager.playHover();
            }
            
            // Mobile haptic feedback
            if ('vibrate' in navigator) {
                navigator.vibrate(5);
            }
        });

        shapeGroup.on('dragend', (pointer) => {
            if (this.gameGrid) {
                // Apply mobile touch offset for placement
                const offsetY = -40;
                if (this.gameGrid.tryPlaceShape(shape, pointer.x, pointer.y + offsetY)) {
                    this.onShapePlaced(shape, index);
                    shapeGroup.destroy();
                    
                    // Mark shape as used
                    this.puzzleShapes[index] = null;
                    
                    // Now check objectives after shape is marked as used
                    this.checkPuzzleObjectives();
                    this.checkPuzzleEnd();
                    
                    // Haptic feedback for successful placement
                    if ('vibrate' in navigator) {
                        navigator.vibrate(25);
                    }
                } else {
                    // Return to original position
                    shapeGroup.x = x;
                    shapeGroup.y = y;
                }
                this.gameGrid.hidePlacementPreview();
            }
        });

        this.puzzleShapes[index] = { group: shapeGroup, shape: shape };
    }

    createPuzzleGameplayUI(puzzle) {
        // Back button
        const backButton = this.add.rectangle(40, 30, 60, 25, 0x444444)
            .setInteractive()
            .on('pointerdown', () => {
                audioManager.playPlace();
                this.currentView = 'puzzles';
                this.scene.restart();
            });

        this.add.text(40, 30, 'Back', {
            fontSize: '12px',
            color: '#ffffff'
        }).setOrigin(0.5);

        // Create consistent header like GameScene
        this.createPuzzleHeader(puzzle);

        // Create objectives tracker
        this.createObjectiveTracker(puzzle);
    }

    createObjectiveTracker(puzzle) {
        const startY = 85;
        this.objectiveTexts = [];

        puzzle.objectives.forEach((objective, index) => {
            const text = this.add.text(20, startY + (index * 18),
                `○ ${objective.description}`, {
                fontSize: '12px',
                color: '#888888'
            });
            this.objectiveTexts.push(text);
        });
    }

    trackObjectives(puzzle) {
        this.puzzleObjectives = puzzle.objectives.map(obj => ({
            ...obj,
            completed: false
        }));
    }

    onShapePlaced(shape, index) {
        this.puzzleStats.moves++;

        // Track analytics for block placement
        analyticsManager.trackBlockPlacement(shape.type || 'unknown', null, true);

        if (this.movesText) {
            const puzzle = PUZZLE_PACKS[this.selectedPack].puzzles.find(p => p.id === this.currentPuzzle);
            this.movesText.setText(`Moves: ${this.puzzleStats.moves}/${puzzle.targetMoves}`);
        }

        // Check for line clears
        const clearedLines = this.gameGrid.checkAndClearLines();
        if (clearedLines.length > 0) {
            this.onLinesCleared(clearedLines);
        } else {
            // Reset combo if no lines were cleared
            this.puzzleStats.currentCombo = 0;
        }

        // Note: Objective checking is now done in dragend handler after shape is marked as null
    }

    onLinesCleared(lines) {
        // Extract rows and columns from the cleared lines
        const completedRows = lines.filter(line => line.type === 'row').map(line => line.index);
        const completedCols = lines.filter(line => line.type === 'col').map(line => line.index);

        // Update combo tracking
        this.puzzleStats.currentCombo++;
        this.puzzleStats.maxCombo = Math.max(this.puzzleStats.maxCombo, this.puzzleStats.currentCombo);

        const points = this.scoringManager.calculateLineScore(completedRows, completedCols);
        this.puzzleStats.score += points;

        if (this.scoreText) {
            this.scoreText.setText(`Score: ${this.puzzleStats.score}`);
        }

        audioManager.playClear();
        console.log(`Combo: ${this.puzzleStats.currentCombo}, Max Combo: ${this.puzzleStats.maxCombo}`);
    }

    checkPuzzleObjectives() {
        const puzzle = PUZZLE_PACKS[this.selectedPack].puzzles.find(p => p.id === this.currentPuzzle);
        let completedCount = 0;

        this.puzzleObjectives.forEach((objective, index) => {
            if (!objective.completed) {
                let completed = false;

                switch (objective.type) {
                    case 'lines':
                        completed = this.gameGrid.getTotalLinesCleared() >= objective.target;
                        break;
                    case 'columns':
                        completed = (this.puzzleStats.columnsCleared || 0) >= objective.target;
                        break;
                    case 'score':
                        completed = this.puzzleStats.score >= objective.target;
                        break;
                    case 'moves':
                        completed = this.puzzleStats.moves <= objective.target;
                        break;
                    case 'combo':
                        completed = (this.puzzleStats.maxCombo || 0) >= objective.target;
                        break;
                    case 'chain':
                        completed = (this.puzzleStats.chainReactions || 0) >= objective.target;
                        break;
                    case 'efficiency':
                        const totalPlacements = this.puzzleStats.moves || 1;
                        const wastedPlacements = this.puzzleStats.wastedMoves || 0;
                        const efficiency = ((totalPlacements - wastedPlacements) / totalPlacements) * 100;
                        completed = efficiency >= objective.target;
                        break;
                    case 'perfect':
                        completed = (this.puzzleStats.wastedMoves || 0) === 0;
                        break;
                    case 'fill':
                        completed = this.checkFillObjective(objective.target);
                        break;
                    case 'complete':
                        completed = this.puzzleShapes.every(ps => ps === null || ps === undefined || !ps.group?.active);
                        break;
                    case 'powerups':
                        completed = (this.puzzleStats.powerupsUsed || 0) >= objective.target;
                        break;
                    case 'speed':
                        const timeElapsed = (Date.now() - this.puzzleStats.startTime) / 1000; // in seconds
                        completed = timeElapsed <= objective.target;
                        break;
                    case 'perfection':
                        const accuracy = this.puzzleStats.moves > 0 ? 
                            ((this.puzzleStats.moves - (this.puzzleStats.wastedMoves || 0)) / this.puzzleStats.moves) * 100 : 0;
                        completed = accuracy >= objective.target;
                        break;
                    case 'mastery':
                        // Master objective requires all other objectives to be complete
                        const otherObjectives = this.puzzleObjectives.filter(obj => obj.type !== 'mastery');
                        completed = otherObjectives.every(obj => obj.completed);
                        break;
                    // Add more objective types as needed
                }

                if (completed) {
                    objective.completed = true;
                    if (this.objectiveTexts[index]) {
                        this.objectiveTexts[index].setText(`✓ ${objective.description}`);
                        this.objectiveTexts[index].setColor('#4a7a5a');
                    }
                }
            }

            if (objective.completed) completedCount++;
        });

        // Check if all objectives completed
        if (completedCount === this.puzzleObjectives.length) {
            this.completePuzzle();
        }
    }

    checkPuzzleEnd() {
        const puzzle = PUZZLE_PACKS[this.selectedPack].puzzles.find(p => p.id === this.currentPuzzle);

        // Check if exceeded move limit
        if (this.puzzleStats.moves > puzzle.targetMoves && !this.allObjectivesCompleted()) {
            this.failPuzzle('Exceeded move limit');
            return;
        }

        // Check if no more moves possible
        const hasValidMoves = this.puzzleShapes.some(ps =>
            ps && ps.group.active && this.gameGrid.canPlaceShape(ps.shape)
        );

        if (!hasValidMoves && !this.allObjectivesCompleted()) {
            this.failPuzzle('No valid moves remaining');
        }
    }

    allObjectivesCompleted() {
        return this.puzzleObjectives.every(obj => obj.completed);
    }

    completePuzzle() {
        if (!this.gameActive) return;
        this.gameActive = false;

        const puzzle = PUZZLE_PACKS[this.selectedPack].puzzles.find(p => p.id === this.currentPuzzle);
        const stars = this.calculatePuzzleStars(puzzle);

        // Track analytics for puzzle completion
        analyticsManager.endGame(this.puzzleStats.score, true);

        // Update progress
        const currentProgress = this.puzzleProgress.puzzles[puzzle.id] || {};
        this.puzzleProgress.puzzles[puzzle.id] = {
            completed: true,
            stars: Math.max(stars, currentProgress.stars || 0),
            bestScore: Math.max(this.puzzleStats.score, currentProgress.bestScore || 0),
            bestMoves: Math.min(this.puzzleStats.moves, currentProgress.bestMoves || 999)
        };

        // Update pack progress
        const pack = PUZZLE_PACKS[this.selectedPack];
        const completedPuzzles = pack.puzzles.filter(p =>
            this.puzzleProgress.puzzles[p.id]?.completed
        ).length;

        this.puzzleProgress.packs[this.selectedPack].completed = completedPuzzles;

        // Unlock next pack if current pack completed
        if (completedPuzzles === pack.puzzles.length) {
            this.unlockNextPack();
        }

        // Save progress
        storage.set('puzzle_progress', this.puzzleProgress);

        // Show completion screen
        this.showPuzzleComplete(puzzle, stars);
    }

    calculatePuzzleStars(puzzle) {
        const requirements = puzzle.starRequirements;
        let stars = 1; // Base completion star

        if (requirements.moves) {
            if (this.puzzleStats.moves <= requirements.moves[2]) stars = 3;
            else if (this.puzzleStats.moves <= requirements.moves[1]) stars = 2;
        }

        return stars;
    }

    unlockNextPack() {
        const packIds = Object.keys(PUZZLE_PACKS);
        const currentIndex = packIds.indexOf(this.selectedPack);

        if (currentIndex >= 0 && currentIndex < packIds.length - 1) {
            const nextPackId = packIds[currentIndex + 1];
            this.puzzleProgress.packs[nextPackId].unlocked = true;
        }
    }

    showPuzzleComplete(puzzle, stars) {
        // Create completion overlay
        const overlay = this.add.rectangle(this.scale.width / 2, this.scale.height / 2,
            this.scale.width, this.scale.height, 0x000000, 0.8);

        const panel = this.add.rectangle(this.scale.width / 2, this.scale.height / 2,
            320, 280, 0x1a1a1a)
            .setStrokeStyle(2, this.colors.primary);

        // Success text
        this.add.text(this.scale.width / 2, this.scale.height / 2 - 100, 'Puzzle Complete!', {
            fontSize: '24px',
            fontFamily: 'Arial, sans-serif',
            color: '#4a7a5a',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        this.add.text(this.scale.width / 2, this.scale.height / 2 - 70, puzzle.name, {
            fontSize: '18px',
            fontFamily: 'Arial, sans-serif',
            color: '#ffffff'
        }).setOrigin(0.5);

        // Stars earned
        for (let i = 0; i < 3; i++) {
            const starColor = i < stars ? '#FFD700' : '#444444';
            this.add.text(this.scale.width / 2 - 30 + (i * 30), this.scale.height / 2 - 30, '★', {
                fontSize: '24px',
                color: starColor
            }).setOrigin(0.5);
        }

        // Stats
        this.add.text(this.scale.width / 2, this.scale.height / 2 + 10,
            `Moves: ${this.puzzleStats.moves}/${puzzle.targetMoves}`, {
            fontSize: '14px',
            color: '#ffffff'
        }).setOrigin(0.5);

        this.add.text(this.scale.width / 2, this.scale.height / 2 + 30,
            `Score: ${this.puzzleStats.score}`, {
            fontSize: '14px',
            color: '#ffffff'
        }).setOrigin(0.5);

        // Buttons
        const nextButton = this.add.rectangle(this.scale.width / 2 - 70, this.scale.height - 40,
            100, 35, this.colors.primary)
            .setInteractive()
            .on('pointerdown', () => {
                audioManager.playPlace();
                this.scene.start('PuzzleScene', { pack: this.selectedPack });
            });

        this.add.text(this.scale.width / 2 - 70, this.scale.height - 40, 'Continue', {
            fontSize: '14px',
            color: '#ffffff'
        }).setOrigin(0.5);

        const menuButton = this.add.rectangle(this.scale.width / 2 + 70, this.scale.height - 40,
            100, 35, 0x666666)
            .setInteractive()
            .on('pointerdown', () => {
                audioManager.playPlace();
                this.scene.start('MenuScene');
            });

        this.add.text(this.scale.width / 2 + 70, this.scale.height - 40, 'Main Menu', {
            fontSize: '14px',
            color: '#ffffff'
        }).setOrigin(0.5);
    }

    failPuzzle(reason) {
        if (!this.gameActive) return;
        this.gameActive = false;

        // Track analytics for puzzle failure
        analyticsManager.endGame(this.puzzleStats.score, false);

        // Show failure screen
        const overlay = this.add.rectangle(this.scale.width / 2, this.scale.height / 2,
            this.scale.width, this.scale.height, 0x000000, 0.8);

        const panel = this.add.rectangle(this.scale.width / 2, this.scale.height / 2,
            300, 200, 0x1a1a1a)
            .setStrokeStyle(2, 0x7a4a4a);

        this.add.text(this.scale.width / 2, this.scale.height / 2 - 60, 'Puzzle Failed', {
            fontSize: '22px',
            fontFamily: 'Arial, sans-serif',
            color: '#7a4a4a',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        this.add.text(this.scale.width / 2, this.scale.height / 2 - 30, reason, {
            fontSize: '14px',
            color: '#cccccc'
        }).setOrigin(0.5);

        // Retry button
        const retryButton = this.add.rectangle(this.scale.width / 2 - 60, this.scale.height / 2 + 40,
            100, 35, this.colors.primary)
            .setInteractive()
            .on('pointerdown', () => {
                audioManager.playPlace();
                this.scene.restart({ pack: this.selectedPack, puzzle: this.currentPuzzle });
            });

        this.add.text(this.scale.width / 2 - 60, this.scale.height / 2 + 40, 'Retry', {
            fontSize: '14px',
            color: '#ffffff'
        }).setOrigin(0.5);

        const backButton = this.add.rectangle(this.scale.width / 2 + 60, this.scale.height / 2 + 40,
            100, 35, 0x666666)
            .setInteractive()
            .on('pointerdown', () => {
                audioManager.playPlace();
                this.scene.start('PuzzleScene', { pack: this.selectedPack });
            });

        this.add.text(this.scale.width / 2 + 60, this.scale.height / 2 + 40, 'Back', {
            fontSize: '14px',
            color: '#ffffff'
        }).setOrigin(0.5);
    }

    /**
     * Setup input handlers
     */
    setupInputHandlers() {
        this.input.keyboard.on('keydown-ESC', () => {
            this.scene.start('PuzzleScene', { pack: this.selectedPack }); // Return to puzzle selection
        });

        this.input.keyboard.on('keydown-SPACE', () => {
            // Pause functionality could be added here in the future
            console.log('Space pressed - pause functionality not yet implemented in Puzzle mode');
        });
    }

    getPackDifficulty(pack) {
        const avgDifficulty = pack.puzzles.reduce((sum, puzzle) => sum + puzzle.difficulty, 0) / pack.puzzles.length;
        return Math.ceil(avgDifficulty / 1.5);
    }

    checkFillObjective(area) {
        // area format: [x1, y1, x2, y2] - rectangle coordinates
        const [x1, y1, x2, y2] = area;
        
        for (let x = x1; x <= x2; x++) {
            for (let y = y1; y <= y2; y++) {
                if (!this.gameGrid.isCellFilled(x, y)) {
                    return false;
                }
            }
        }
        return true;
    }

    createPuzzleHeader(puzzle) {
        const theme = themeManager.getCurrentTheme();
        const headerY = 25;
        const centerX = this.cameras.main.centerX;
        
        // Back button - leftmost
        const backButton = this.add.rectangle(40, 30, 60, 25, 0x444444)
            .setInteractive()
            .on('pointerdown', () => {
                audioManager.playPlace();
                this.currentView = 'puzzles';
                this.scene.restart();
            });

        this.add.text(40, 30, 'Back', {
            fontSize: '12px',
            color: '#ffffff'
        }).setOrigin(0.5);

        // Moves - left center
        this.movesText = this.add.text(centerX - 80, headerY, `Moves: ${this.puzzleStats.moves}/${puzzle.targetMoves}`, {
            fontSize: '14px', fontFamily: 'Arial', color: theme.text, fontStyle: 'bold'
        }).setOrigin(0.5);

        // Score - right center
        this.scoreText = this.add.text(centerX + 50, headerY, `Score: ${this.puzzleStats.score}`, {
            fontSize: '14px', fontFamily: 'Arial', color: theme.text, fontStyle: 'bold'
        }).setOrigin(0.5);

        // Hint button - rightmost
        const hintButton = this.add.rectangle(this.scale.width - 50, headerY, 60, 25, 0x666666)
            .setInteractive()
            .on('pointerdown', () => {
                this.showHint(puzzle);
            });
        
        this.add.text(this.scale.width - 50, headerY, 'Hint', {
            fontSize: '12px',
            color: '#ffffff'
        }).setOrigin(0.5);
    }


}