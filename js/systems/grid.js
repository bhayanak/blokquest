// Grid system for the game board
import { GRID } from '../core/constants.js';
import {
    gridToPixel,
    pixelToGrid,
    isInBounds,
    canPlaceShape,
    placeShape,
    findCompletedLines,
    clearLines,
    createEmptyGrid
} from '../core/utils.js';
import { themeManager } from '../core/themes.js';

/**
 * Grid class managing the game board
 */
export class GameGrid {
    constructor(scene) {
        this.scene = scene;
        this.grid = createEmptyGrid();
        this.gridGraphics = null;
        this.cellGraphics = [];
        this.highlightGraphics = null;
        this.animationTweens = [];
        this.totalLinesCleared = 0; // Initialize line counter for puzzle mode

        this.initialize();
    }

    /**
     * Initialize the grid graphics
     */
    initialize() {
        this.createGridGraphics();
        this.createCellGraphics();
        this.createHighlightGraphics();
        this.render();
    }

    /**
     * Create method for external initialization (called by scenes)
     */
    create() {
        // Re-initialize if needed or just ensure everything is ready
        if (!this.gridGraphics) {
            this.initialize();
        }
        this.render();
    }

    /**
     * Create the grid background and lines
     */
    createGridGraphics() {
        this.gridGraphics = this.scene.add.graphics();
        this.updateGridColors();
    }

    /**
     * Create graphics for individual cells
     */
    createCellGraphics() {
        this.cellGraphics = [];
        for (let y = 0; y < GRID.ROWS; y++) {
            this.cellGraphics[y] = [];
            for (let x = 0; x < GRID.COLS; x++) {
                const cellGraphic = this.scene.add.graphics();
                this.cellGraphics[y][x] = cellGraphic;
            }
        }
    }

    /**
     * Create highlight graphics for drag preview
     */
    createHighlightGraphics() {
        this.highlightGraphics = this.scene.add.graphics();
        this.highlightGraphics.setDepth(10);
    }

    /**
     * Update grid colors based on current theme
     */
    updateGridColors() {
        if (!this.gridGraphics) return;

        const theme = themeManager.getCurrentTheme();
        const colors = themeManager.getPhaserColors();

        this.gridGraphics.clear();

        // Draw grid background
        this.gridGraphics.fillStyle(colors.gridBackground);
        this.gridGraphics.fillRect(
            GRID.START_X - GRID.MARGIN,
            GRID.START_Y - GRID.MARGIN,
            GRID.COLS * (GRID.CELL_SIZE + GRID.MARGIN) + GRID.MARGIN,
            GRID.ROWS * (GRID.CELL_SIZE + GRID.MARGIN) + GRID.MARGIN
        );

        // Draw grid lines
        this.gridGraphics.lineStyle(1, colors.gridLines, 0.3);

        // Vertical lines
        for (let x = 0; x <= GRID.COLS; x++) {
            const pixelX = GRID.START_X + x * (GRID.CELL_SIZE + GRID.MARGIN) - GRID.MARGIN / 2;
            this.gridGraphics.lineBetween(
                pixelX,
                GRID.START_Y - GRID.MARGIN,
                pixelX,
                GRID.START_Y + GRID.ROWS * (GRID.CELL_SIZE + GRID.MARGIN)
            );
        }

        // Horizontal lines
        for (let y = 0; y <= GRID.ROWS; y++) {
            const pixelY = GRID.START_Y + y * (GRID.CELL_SIZE + GRID.MARGIN) - GRID.MARGIN / 2;
            this.gridGraphics.lineBetween(
                GRID.START_X - GRID.MARGIN,
                pixelY,
                GRID.START_X + GRID.COLS * (GRID.CELL_SIZE + GRID.MARGIN),
                pixelY
            );
        }
    }

    /**
     * Render the current grid state
     */
    render() {
        const colors = themeManager.getPhaserColors();

        for (let y = 0; y < GRID.ROWS; y++) {
            for (let x = 0; x < GRID.COLS; x++) {
                const cell = this.grid[y][x];
                const graphic = this.cellGraphics[y][x];
                const pos = gridToPixel(y, x);

                graphic.clear();

                if (cell > 0) {
                    // Draw 3D colorful block
                    const baseColor = colors.blockColors[(cell - 1) % colors.blockColors.length];
                    this.draw3DBlock(graphic, pos.x, pos.y, GRID.CELL_SIZE, baseColor);
                }
            }
        }
    }

    /**
     * Show highlight for valid shape placement
     */
    showPlacementHighlight(shape, gridX, gridY, isValid = true) {
        this.highlightGraphics.clear();

        if (!shape || !shape.pattern) return;

        const colors = themeManager.getPhaserColors();
        const highlightColor = isValid ? GRID.HIGHLIGHT_COLOR : GRID.INVALID_COLOR;
        const alpha = 0.5;

        this.highlightGraphics.fillStyle(highlightColor, alpha);
        this.highlightGraphics.lineStyle(2, highlightColor, 0.8);

        // Draw highlight for each block in the shape
        for (let y = 0; y < shape.height; y++) {
            for (let x = 0; x < shape.width; x++) {
                if (shape.pattern[y][x] === 1) {
                    const cellX = gridX + x;
                    const cellY = gridY + y;

                    if (isInBounds(cellX, cellY)) {
                        const pos = gridToPixel(cellY, cellX);
                        this.highlightGraphics.fillRect(pos.x, pos.y, GRID.CELL_SIZE, GRID.CELL_SIZE);
                        this.highlightGraphics.strokeRect(pos.x, pos.y, GRID.CELL_SIZE, GRID.CELL_SIZE);
                    }
                }
            }
        }
    }

    /**
     * Hide placement highlight
     */
    hidePlacementHighlight() {
        this.highlightGraphics.clear();
    }

    /**
     * Check if shape can be placed at position
     */
    canPlaceShape(shape, gridX, gridY) {
        return canPlaceShape(this.grid, shape.pattern, gridX, gridY);
    }

    /**
     * Place shape on grid
     */
    placeShape(shape, gridX, gridY) {
        if (this.canPlaceShape(shape, gridX, gridY)) {
            placeShape(this.grid, shape.pattern, gridX, gridY, shape.color);
            this.render();
            return true;
        }
        return false;
    }

    /**
     * Convert pixel coordinates to grid coordinates
     */
    pixelToGrid(pixelX, pixelY) {
        return pixelToGrid(pixelX, pixelY);
    }

    /**
     * Convert grid coordinates to pixel coordinates
     */
    gridToPixel(row, col) {
        return gridToPixel(row, col);
    }

    /**
     * Check for completed lines and return them
     */
    findCompletedLines() {
        return findCompletedLines(this.grid);
    }

    /**
     * Clear completed lines with animation
     */
    async clearCompletedLines(completedRows, completedCols) {
        if (completedRows.length === 0 && completedCols.length === 0) {
            return;
        }

        // Animate clearing
        await this.animateClearLines(completedRows, completedCols);

        // Clear from grid data
        this.grid = clearLines(this.grid, { rows: completedRows, cols: completedCols });

        // Re-render
        this.render();
    }

    /**
     * Animate line clearing
     */
    animateClearLines(completedRows, completedCols) {
        return new Promise((resolve) => {
            const colors = themeManager.getPhaserColors();
            const flashGraphics = this.scene.add.graphics();
            flashGraphics.setDepth(15);

            // Flash effect
            flashGraphics.fillStyle(0xFFFFFF, 0.8);

            // Flash completed rows
            completedRows.forEach(row => {
                const pos = gridToPixel(row, 0);
                flashGraphics.fillRect(
                    pos.x,
                    pos.y,
                    GRID.COLS * (GRID.CELL_SIZE + GRID.MARGIN) - GRID.MARGIN,
                    GRID.CELL_SIZE
                );
            });

            // Flash completed columns
            completedCols.forEach(col => {
                const pos = gridToPixel(0, col);
                flashGraphics.fillRect(
                    pos.x,
                    pos.y,
                    GRID.CELL_SIZE,
                    GRID.ROWS * (GRID.CELL_SIZE + GRID.MARGIN) - GRID.MARGIN
                );
            });

            // Animate flash
            this.scene.tweens.add({
                targets: flashGraphics,
                alpha: 0,
                duration: 300,
                ease: 'Power2',
                onComplete: () => {
                    flashGraphics.destroy();
                    resolve();
                }
            });
        });
    }

    /**
     * Clear a specific row (for power-up)
     */
    clearRow(rowIndex) {
        if (rowIndex >= 0 && rowIndex < GRID.ROWS) {
            for (let x = 0; x < GRID.COLS; x++) {
                this.grid[rowIndex][x] = 0;
            }
            this.render();
            return true;
        }
        return false;
    }

    /**
     * Clear a specific column (for power-up)
     */
    clearColumn(colIndex) {
        if (colIndex >= 0 && colIndex < GRID.COLS) {
            for (let y = 0; y < GRID.ROWS; y++) {
                this.grid[y][colIndex] = 0;
            }
            this.render();
            return true;
        }
        return false;
    }

    /**
     * Get grid state for saving/loading
     */
    getGridState() {
        return this.grid.map(row => [...row]);
    }

    /**
     * Set grid state from saved data
     */
    setGridState(gridState) {
        this.grid = gridState.map(row => [...row]);
        this.render();
    }

    /**
     * Clear the entire grid
     */
    clear() {
        this.grid = createEmptyGrid();
        this.render();
    }

    /**
     * Get number of filled cells
     */
    getFilledCellCount() {
        let count = 0;
        for (let y = 0; y < GRID.ROWS; y++) {
            for (let x = 0; x < GRID.COLS; x++) {
                if (this.grid[y][x] > 0) {
                    count++;
                }
            }
        }
        return count;
    }

    /**
     * Get grid occupancy percentage
     */
    getOccupancyPercentage() {
        const filled = this.getFilledCellCount();
        const total = GRID.ROWS * GRID.COLS;
        return (filled / total) * 100;
    }

    /**
     * Check if grid is full
     */
    isFull() {
        return this.getFilledCellCount() === GRID.ROWS * GRID.COLS;
    }

    /**
     * Check if grid is empty
     */
    isEmpty() {
        return this.getFilledCellCount() === 0;
    }

    /**
     * Check if a specific cell is filled
     */
    isCellFilled(x, y) {
        if (x < 0 || x >= GRID.COLS || y < 0 || y >= GRID.ROWS) {
            return false;
        }
        return this.grid[y][x] > 0;
    }

    /**
     * Animate shape placement
     */
    animateShapePlacement(shape, gridX, gridY) {
        const positions = [];

        for (let y = 0; y < shape.height; y++) {
            for (let x = 0; x < shape.width; x++) {
                if (shape.pattern[y][x] === 1) {
                    const cellX = gridX + x;
                    const cellY = gridY + y;
                    if (isInBounds(cellX, cellY)) {
                        positions.push({ x: cellX, y: cellY });
                    }
                }
            }
        }

        // Animate each cell with a slight delay
        positions.forEach((pos, index) => {
            const graphic = this.cellGraphics[pos.y][pos.x];
            graphic.setAlpha(0);

            this.scene.tweens.add({
                targets: graphic,
                alpha: 1,
                scaleX: 1.2,
                scaleY: 1.2,
                duration: 200,
                delay: index * 50,
                ease: 'Back.out',
                onComplete: () => {
                    this.scene.tweens.add({
                        targets: graphic,
                        scaleX: 1,
                        scaleY: 1,
                        duration: 100,
                        ease: 'Power2'
                    });
                }
            });
        });
    }

    /**
     * Update theme colors
     */
    updateTheme() {
        this.updateGridColors();
        this.render();
    }

    /**
     * Destroy all graphics
     */
    destroy() {
        // Stop all animations
        this.animationTweens.forEach(tween => tween.stop());
        this.animationTweens = [];

        // Destroy graphics
        if (this.gridGraphics) {
            this.gridGraphics.destroy();
        }

        if (this.highlightGraphics) {
            this.highlightGraphics.destroy();
        }

        // Destroy cell graphics
        this.cellGraphics.forEach(row => {
            row.forEach(graphic => {
                if (graphic) {
                    graphic.destroy();
                }
            });
        });

        this.cellGraphics = [];
    }

    /**
     * Set initial grid state for puzzles
     */
    setInitialState(initialGrid) {
        this.grid = initialGrid.map(row => [...row]);
        this.render();
    }

    /**
     * Get total lines cleared (for tracking)
     */
    getTotalLinesCleared() {
        return this.totalLinesCleared;
    }

    /**
     * Check if a shape can be placed anywhere on the grid
     */
    canPlaceShape(shape) {
        for (let row = 0; row < GRID.ROWS; row++) {
            for (let col = 0; col < GRID.COLS; col++) {
                if (canPlaceShape(this.grid, shape.pattern, row, col)) {
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * Try to place a shape at pixel coordinates
     */
    tryPlaceShape(shape, pixelX, pixelY) {
        const gridPos = pixelToGrid(pixelX, pixelY);

        if (canPlaceShape(this.grid, shape.pattern, gridPos.row, gridPos.col)) {
            this.grid = placeShape(this.grid, shape.pattern, gridPos.row, gridPos.col, shape.color || 1);
            this.render();
            return true;
        }
        return false;
    }

    /**
     * Check and clear completed lines, return cleared line info
     */
    checkAndClearLines() {
        const completedLines = findCompletedLines(this.grid);

        if (completedLines.rows.length > 0 || completedLines.cols.length > 0) {
            this.grid = clearLines(this.grid, completedLines);
            this.totalLinesCleared += completedLines.rows.length + completedLines.cols.length;
            this.render();

            return [...completedLines.rows.map(r => ({ type: 'row', index: r })),
            ...completedLines.cols.map(c => ({ type: 'col', index: c }))];
        }

        return [];
    }

    /**
     * Show placement preview
     */
    showPlacementPreview(shape, pixelX, pixelY) {
        const gridPos = pixelToGrid(pixelX, pixelY);
        const canPlace = canPlaceShape(this.grid, shape.pattern, gridPos.row, gridPos.col);

        this.highlightGraphics.clear();

        // Draw preview blocks
        shape.pattern.forEach((row, rowIndex) => {
            row.forEach((cell, colIndex) => {
                if (cell) {
                    const cellRow = gridPos.row + rowIndex;
                    const cellCol = gridPos.col + colIndex;

                    if (isInBounds(cellCol, cellRow)) {
                        const { x, y } = gridToPixel(cellRow, cellCol);
                        const color = canPlace ? 0x00ff00 : 0xff0000;
                        const alpha = 0.5;

                        this.highlightGraphics.fillStyle(color, alpha);
                        this.highlightGraphics.fillRect(
                            x,
                            y,
                            GRID.CELL_SIZE,
                            GRID.CELL_SIZE
                        );
                    }
                }
            });
        });
    }

    /**
     * Hide placement preview
     */
    hidePlacementPreview() {
        if (this.highlightGraphics) {
            this.highlightGraphics.clear();
        }
    }

    /**
     * Draw a 3D colorful block with depth and highlights
     */
    draw3DBlock(graphic, x, y, size, baseColor) {
        const depth = 4; // 3D depth

        // Convert color to integer - handle both hex strings and numbers
        let colorInt;
        if (typeof baseColor === 'string') {
            colorInt = parseInt(baseColor.replace('#', ''), 16);
        } else {
            colorInt = baseColor;
        }

        // Create lighter shade for highlight (top/left faces)
        const lightColor = this.lightenColor(colorInt, 0.3);
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
}