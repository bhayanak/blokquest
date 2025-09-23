// Utility functions for the game
import { GRID } from './constants.js';

/**
 * Convert pixel coordinates to grid position
 */
export function pixelToGrid(pixelX, pixelY) {
    const col = Math.floor((pixelX - GRID.START_X) / (GRID.CELL_SIZE + GRID.MARGIN));
    const row = Math.floor((pixelY - GRID.START_Y) / (GRID.CELL_SIZE + GRID.MARGIN));
    return { row: row, col: col };
}

/**
 * Generate a random integer between min and max (inclusive)
 */
export function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generate a seeded random number generator for daily mode
 */
export function createSeededRandom(seed) {
    let m = 0x80000000; // 2**31
    let a = 1103515245;
    let c = 12345;
    
    let state = seed ? seed : Math.floor(Math.random() * (m - 1));
    
    return function() {
        state = (a * state + c) % m;
        return state / (m - 1);
    };
}

/**
 * Get today's date as a seed for daily mode
 */
export function getTodaysSeed() {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth() + 1;
    const day = today.getDate();
    return year * 10000 + month * 100 + day;
}

/**
 * Convert grid coordinates to pixel coordinates
 */
export function gridToPixel(row, col) {
    return {
        x: GRID.START_X + col * (GRID.CELL_SIZE + GRID.MARGIN),
        y: GRID.START_Y + row * (GRID.CELL_SIZE + GRID.MARGIN)
    };
}

/**
 * Convert pixel coordinates to grid coordinates
 */
/**
 * Check if a position is within grid bounds
 */
export function isInBounds(col, row) {
    return col >= 0 && col < GRID.COLS && row >= 0 && row < GRID.ROWS;
}

/**
 * Check if a shape can be placed at a given position on the grid
 */
export function canPlaceShape(grid, shape, startRow, startCol) {
    for (let row = 0; row < shape.length; row++) {
        for (let col = 0; col < shape[row].length; col++) {
            if (shape[row][col] === 1) {
                const gridRow = startRow + row;
                const gridCol = startCol + col;
                
                if (!isInBounds(gridCol, gridRow) || grid[gridRow][gridCol] !== 0) {
                    return false;
                }
            }
        }
    }
    return true;
}

/**
 * Place a shape on the grid
 */
export function placeShape(grid, shape, startRow, startCol, color = 1) {
    const newGrid = grid.map(row => [...row]); // Create a copy
    for (let row = 0; row < shape.length; row++) {
        for (let col = 0; col < shape[row].length; col++) {
            if (shape[row][col] === 1) {
                const gridRow = startRow + row;
                const gridCol = startCol + col;
                if (isInBounds(gridCol, gridRow)) {
                    newGrid[gridRow][gridCol] = color;
                }
            }
        }
    }
    return newGrid;
}

/**
 * Check for complete rows and columns
 */
export function findCompletedLines(grid) {
    const completedRows = [];
    const completedCols = [];
    
    // Check rows
    for (let y = 0; y < GRID.ROWS; y++) {
        let rowComplete = true;
        for (let x = 0; x < GRID.COLS; x++) {
            if (grid[y][x] === 0) {
                rowComplete = false;
                break;
            }
        }
        if (rowComplete) {
            completedRows.push(y);
        }
    }
    
    // Check columns
    for (let x = 0; x < GRID.COLS; x++) {
        let colComplete = true;
        for (let y = 0; y < GRID.ROWS; y++) {
            if (grid[y][x] === 0) {
                colComplete = false;
                break;
            }
        }
        if (colComplete) {
            completedCols.push(x);
        }
    }
    
    return { rows: completedRows, cols: completedCols };
}

/**
 * Clear completed lines from the grid
 */
export function clearLines(grid, completedLines) {
    // Create a copy of the grid
    const newGrid = grid.map(row => [...row]);

    // Clear rows
    if (completedLines.rows) {
        completedLines.rows.forEach(row => {
            for (let x = 0; x < GRID.COLS; x++) {
                newGrid[row][x] = 0;
            }
        });
    }
    
    // Clear columns
    if (completedLines.cols) {
        completedLines.cols.forEach(col => {
            for (let y = 0; y < GRID.ROWS; y++) {
                newGrid[y][col] = 0;
            }
        });
    }

    return newGrid;
}

/**
 * Calculate score based on completed lines
 */
export function calculateScore(completedRows, completedCols, multiplier = 1) {
    const totalLines = completedRows.length + completedCols.length;
    let baseScore = totalLines * 100;
    
    // Combo bonus for multiple lines
    if (totalLines > 1) {
        baseScore *= (1 + (totalLines - 1) * 0.2);
    }
    
    return Math.floor(baseScore * multiplier);
}

/**
 * Check if any of the given shapes can be placed on the grid
 */
export function hasValidMoves(grid, shapes) {
    for (const shape of shapes) {
        if (shape && shape.pattern) {
            for (let y = 0; y < GRID.ROWS; y++) {
                for (let x = 0; x < GRID.COLS; x++) {
                    if (canPlaceShape(grid, shape.pattern, x, y)) {
                        return true;
                    }
                }
            }
        }
    }
    return false;
}

/**
 * Create an empty grid
 */
export function createEmptyGrid() {
    const grid = [];
    for (let y = 0; y < GRID.ROWS; y++) {
        grid[y] = [];
        for (let x = 0; x < GRID.COLS; x++) {
            grid[y][x] = 0;
        }
    }
    return grid;
}

/**
 * Deep clone an object (for game state management)
 */
export function deepClone(obj) {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }
    
    if (obj instanceof Date) {
        return new Date(obj.getTime());
    }
    
    if (obj instanceof Array) {
        return obj.map(item => deepClone(item));
    }
    
    if (typeof obj === 'object') {
        const clonedObj = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                clonedObj[key] = deepClone(obj[key]);
            }
        }
        return clonedObj;
    }
}

/**
 * Format number with commas
 */
export function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * Get responsive font size based on screen width
 */
export function getResponsiveFontSize(baseSize, screenWidth) {
    const scaleFactor = Math.min(screenWidth / 400, 1.5);
    return Math.floor(baseSize * scaleFactor);
}

/**
 * Lerp between two values
 */
export function lerp(start, end, factor) {
    return start + (end - start) * factor;
}

/**
 * Easing functions for animations
 */
export const Easing = {
    easeInOut: (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
    easeOut: (t) => t * (2 - t),
    easeIn: (t) => t * t,
    bounce: (t) => {
        if (t < 1/2.75) {
            return 7.5625 * t * t;
        } else if (t < 2/2.75) {
            return 7.5625 * (t -= 1.5/2.75) * t + 0.75;
        } else if (t < 2.5/2.75) {
            return 7.5625 * (t -= 2.25/2.75) * t + 0.9375;
        } else {
            return 7.5625 * (t -= 2.625/2.75) * t + 0.984375;
        }
    }
};