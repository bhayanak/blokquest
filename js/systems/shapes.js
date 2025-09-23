// Shape patterns and management system
import { randomInt, createSeededRandom } from '../core/utils.js';
import { DIFFICULTY } from '../core/constants.js';

// Easy difficulty shape patterns
export const SHAPE_PATTERNS_EASY = [
    // Single blocks
    [[1]],
    
    // Lines
    [[1, 1]],
    [[1, 1, 1]],
    [[1], [1]],
    [[1], [1], [1]],
    
    // L shapes
    [
        [1, 0],
        [1, 1]
    ],
    [
        [0, 1],
        [1, 1]
    ],
    [
        [1, 1],
        [1, 0]
    ],
    [
        [1, 1],
        [0, 1]
    ],
    
    // Small squares
    [
        [1, 1],
        [1, 1]
    ],
    
    // T shapes
    [
        [1, 1, 1],
        [0, 1, 0]
    ],
    [
        [0, 1],
        [1, 1],
        [0, 1]
    ],
    [
        [0, 1, 0],
        [1, 1, 1]
    ],
    [
        [1, 0],
        [1, 1],
        [1, 0]
    ]
];

// Difficult shape patterns (larger and more complex)
export const SHAPE_PATTERNS_DIFFICULT = [
    ...SHAPE_PATTERNS_EASY, // Include all easy patterns
    
    // Longer lines
    [[1, 1, 1, 1]],
    [[1], [1], [1], [1]],
    [[1, 1, 1, 1, 1]],
    [[1], [1], [1], [1], [1]],
    
    // Larger L shapes
    [
        [1, 0, 0],
        [1, 0, 0],
        [1, 1, 1]
    ],
    [
        [0, 0, 1],
        [0, 0, 1],
        [1, 1, 1]
    ],
    [
        [1, 1, 1],
        [1, 0, 0],
        [1, 0, 0]
    ],
    [
        [1, 1, 1],
        [0, 0, 1],
        [0, 0, 1]
    ],
    
    // Complex shapes
    [
        [1, 1, 0],
        [0, 1, 1]
    ],
    [
        [0, 1, 1],
        [1, 1, 0]
    ],
    [
        [1, 0, 1],
        [1, 1, 1]
    ],
    [
        [1, 1, 1],
        [1, 0, 1]
    ],
    
    // 3x3 patterns
    [
        [1, 0, 1],
        [0, 1, 0],
        [1, 0, 1]
    ],
    [
        [0, 1, 0],
        [1, 1, 1],
        [0, 1, 0]
    ],
    [
        [1, 1, 0],
        [1, 0, 0],
        [1, 0, 0]
    ],
    [
        [0, 1, 1],
        [0, 0, 1],
        [0, 0, 1]
    ]
];

/**
 * Shape class representing a game piece
 */
export class Shape {
    constructor(pattern, color = 1, id = null) {
        // Deep copy the pattern to prevent reference sharing between shapes
        this.pattern = JSON.parse(JSON.stringify(pattern));
        this.color = color;
        this.id = id || this.generateId();
        this.width = this.pattern[0].length;
        this.height = this.pattern.length;
        this.isDragging = false;
        this.originalX = 0;
        this.originalY = 0;
    }

    /**
     * Generate unique ID for the shape
     */
    generateId() {
        return 'shape_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Get pattern as 2D array
     */
    getPattern() {
        return this.pattern;
    }

    /**
     * Get shape dimensions
     */
    getDimensions() {
        return { width: this.width, height: this.height };
    }

    /**
     * Check if shape has a block at specific position
     */
    hasBlockAt(x, y) {
        if (y >= 0 && y < this.height && x >= 0 && x < this.width) {
            return this.pattern[y][x] === 1;
        }
        return false;
    }

    /**
     * Get all block positions relative to shape origin
     */
    getBlockPositions() {
        const positions = [];
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.pattern[y][x] === 1) {
                    positions.push({ x, y });
                }
            }
        }
        return positions;
    }

    /**
     * Clone the shape
     */
    clone() {
        const clonedPattern = this.pattern.map(row => [...row]);
        return new Shape(clonedPattern, this.color);
    }

    /**
     * Rotate shape 90 degrees clockwise
     */
    rotate() {
        const rotated = [];
        for (let x = 0; x < this.width; x++) {
            const newRow = [];
            for (let y = this.height - 1; y >= 0; y--) {
                newRow.push(this.pattern[y][x]);
            }
            rotated.push(newRow);
        }
        this.pattern = rotated;
        this.width = rotated[0].length;
        this.height = rotated.length;
    }

    /**
     * Get bounding box of the shape
     */
    getBoundingBox() {
        let minX = this.width, maxX = -1;
        let minY = this.height, maxY = -1;

        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.pattern[y][x] === 1) {
                    minX = Math.min(minX, x);
                    maxX = Math.max(maxX, x);
                    minY = Math.min(minY, y);
                    maxY = Math.max(maxY, y);
                }
            }
        }

        return {
            x: minX,
            y: minY,
            width: maxX - minX + 1,
            height: maxY - minY + 1
        };
    }
}

/**
 * Shape generator class
 */
export class ShapeGenerator {
    constructor(difficulty = DIFFICULTY.EASY, useSeeded = false, seed = null) {
        this.difficulty = difficulty;
        this.useSeeded = useSeeded;
        this.random = useSeeded ? createSeededRandom(seed) : Math.random;
        this.shapeHistory = [];
        this.maxHistorySize = 10; // Prevent immediate repeats
    }

    /**
     * Set difficulty level
     */
    setDifficulty(difficulty) {
        this.difficulty = difficulty;
    }

    /**
     * Set seeded random generator
     */
    setSeeded(seed) {
        this.useSeeded = true;
        this.random = createSeededRandom(seed);
    }

    /**
     * Get available patterns based on difficulty
     */
    getAvailablePatterns() {
        return this.difficulty === DIFFICULTY.EASY ? SHAPE_PATTERNS_EASY : SHAPE_PATTERNS_DIFFICULT;
    }

    /**
     * Generate a random shape
     */
    generateShape(colorIndex = null) {
        const patterns = this.getAvailablePatterns();
        let patternIndex;
        let attempts = 0;
        const maxAttempts = 20;

        // Try to avoid recently used patterns
        do {
            patternIndex = Math.floor(this.random() * patterns.length);
            attempts++;
        } while (
            attempts < maxAttempts && 
            this.shapeHistory.includes(patternIndex) && 
            this.shapeHistory.length < patterns.length
        );

        const pattern = patterns[patternIndex];
        const color = colorIndex !== null ? colorIndex : Math.floor(this.random() * 8) + 1;
        
        // Update history
        this.shapeHistory.push(patternIndex);
        if (this.shapeHistory.length > this.maxHistorySize) {
            this.shapeHistory.shift();
        }

        return new Shape(pattern, color);
    }

    /**
     * Generate a random shape (alias for generateShape for backward compatibility)
     */
    generateRandomShape(colorIndex = null) {
        return this.generateShape(colorIndex);
    }

    /**
     * Generate multiple shapes
     */
    generateShapes(count, colorIndices = null) {
        const shapes = [];
        for (let i = 0; i < count; i++) {
            const colorIndex = colorIndices ? colorIndices[i] : null;
            shapes.push(this.generateShape(colorIndex));
        }
        return shapes;
    }

    /**
     * Generate shapes with balanced difficulty
     */
    generateBalancedShapes(count) {
        const shapes = [];
        const patterns = this.getAvailablePatterns();
        const easyPatterns = SHAPE_PATTERNS_EASY;
        
        for (let i = 0; i < count; i++) {
            // Mix of easy and difficult shapes based on difficulty setting
            let useEasy = false;
            if (this.difficulty === DIFFICULTY.EASY) {
                useEasy = true;
            } else {
                // In hard mode, still include some easy shapes (30% chance)
                useEasy = this.random() < 0.3;
            }
            
            const availablePatterns = useEasy ? easyPatterns : patterns;
            const patternIndex = Math.floor(this.random() * availablePatterns.length);
            const pattern = availablePatterns[patternIndex];
            const color = Math.floor(this.random() * 8) + 1;
            
            shapes.push(new Shape(pattern, color));
        }
        
        return shapes;
    }

    /**
     * Generate specific shape by pattern index
     */
    generateSpecificShape(patternIndex, colorIndex = null) {
        const patterns = this.getAvailablePatterns();
        if (patternIndex >= 0 && patternIndex < patterns.length) {
            const pattern = patterns[patternIndex];
            const color = colorIndex !== null ? colorIndex : Math.floor(this.random() * 8) + 1;
            return new Shape(pattern, color);
        }
        return this.generateShape(colorIndex);
    }

    /**
     * Get total number of available patterns
     */
    getPatternCount() {
        return this.getAvailablePatterns().length;
    }

    /**
     * Reset history (useful for new games)
     */
    resetHistory() {
        this.shapeHistory = [];
    }
}

/**
 * Utility functions for shape operations
 */
export const ShapeUtils = {
    /**
     * Check if two shapes are identical
     */
    areIdentical(shape1, shape2) {
        if (shape1.width !== shape2.width || shape1.height !== shape2.height) {
            return false;
        }
        
        for (let y = 0; y < shape1.height; y++) {
            for (let x = 0; x < shape1.width; x++) {
                if (shape1.pattern[y][x] !== shape2.pattern[y][x]) {
                    return false;
                }
            }
        }
        
        return true;
    },

    /**
     * Get shape complexity score (for balancing)
     */
    getComplexity(shape) {
        let blockCount = 0;
        for (let y = 0; y < shape.height; y++) {
            for (let x = 0; x < shape.width; x++) {
                if (shape.pattern[y][x] === 1) {
                    blockCount++;
                }
            }
        }
        
        // Consider both size and block count
        return blockCount + (shape.width * shape.height * 0.1);
    },

    /**
     * Create shape from pattern string (for puzzle mode)
     */
    fromPatternString(patternString, color = 1) {
        const rows = patternString.trim().split('\n');
        const pattern = rows.map(row => 
            row.split('').map(char => char === '1' ? 1 : 0)
        );
        return new Shape(pattern, color);
    },

    /**
     * Convert shape to pattern string
     */
    toPatternString(shape) {
        return shape.pattern.map(row => 
            row.map(cell => cell === 1 ? '1' : '0').join('')
        ).join('\n');
    }
};