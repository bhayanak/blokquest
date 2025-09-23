// Theme system with 6 predefined color schemes
export const THEMES = {
    vibrant: {
        name: 'Vibrant',
        background: '#FF6B6B', // Bright coral background
        primary: '#4ECDC4', // Turquoise primary
        secondary: '#45B7D1', // Sky blue secondary  
        accent: '#FFA07A', // Light salmon accent
        text: '#FFFFFF',
        textSecondary: '#F8F8FF', // Ghost white
        gridBackground: '#FF8E8E', // Light coral grid
        gridLines: '#FFFFFF', // White grid lines
        blockColors: [
            '#FF1744', // Bright red
            '#FF6D00', // Vivid orange
            '#FFD600', // Electric yellow
            '#00E676', // Neon green
            '#00BCD4', // Cyan
            '#2196F3', // Blue
            '#9C27B0', // Purple
            '#E91E63'  // Pink
        ],
        ui: {
            buttonBackground: '#4A148C', // Purple buttons
            buttonHover: '#6A1B9A', // Lighter purple hover
            buttonActive: '#8E24AA', // Even lighter active
            inputBackground: '#1A0033',
            borderColor: '#9C27B0'
        }
    },

    forest: {
        name: 'Forest',
        background: '#32CD32', // Lime green background
        primary: '#228B22', // Forest green primary
        secondary: '#00FF7F', // Spring green secondary
        accent: '#ADFF2F', // Green yellow accent
        text: '#FFFFFF',
        textSecondary: '#F0FFF0', // Honeydew
        gridBackground: '#90EE90', // Light green grid
        gridLines: '#FFFFFF', // White grid lines
        blockColors: [
            '#52B788', // Forest Green
            '#74C69D', // Light Green
            '#95D5B2', // Mint Green
            '#B7E4C7', // Pale Green
            '#D8F3DC', // Very Light Green
            '#40916C', // Dark Green
            '#2D5A27', // Deep Forest
            '#95A472'  // Olive Green
        ],
        ui: {
            buttonBackground: '#2D5A35',
            buttonHover: '#40916C',
            buttonActive: '#52B788',
            inputBackground: '#1B4332',
            borderColor: '#40916C'
        }
    },

    neon: {
        name: 'Neon',
        background: '#FF4081', // Bright pink background
        primary: '#00FF89', // Electric mint green
        secondary: '#FF1493', // Deep pink
        accent: '#00BFFF', // Deep sky blue
        text: '#FFFFFF',
        textSecondary: '#F0F8FF', // Alice blue
        gridBackground: '#FF69B4', // Hot pink grid
        gridLines: '#FFFFFF', // White grid lines
        blockColors: [
            '#00FF41', // Electric green
            '#FF0080', // Hot pink
            '#00D4FF', // Electric blue
            '#FF4000', // Neon orange-red
            '#8000FF', // Electric purple
            '#FFFF00', // Electric yellow
            '#00FFFF', // Cyan
            '#FF6600'  // Orange
        ],
        ui: {
            buttonBackground: '#001100', // Dark green tint
            buttonHover: '#003300', // Brighter green
            buttonActive: '#006600', // Active green
            inputBackground: '#000000',
            borderColor: '#00FF41'
        }
    },

    pastel: {
        name: 'Pastel',
        background: '#F8F9FA',
        primary: '#FFB3BA',
        secondary: '#BAFFC9',
        accent: '#BAE1FF',
        text: '#2C3E50',
        textSecondary: '#7F8C8D',
        gridBackground: '#FFFFFF',
        gridLines: '#E9ECEF',
        blockColors: [
            '#FFB3BA', // Pastel Pink
            '#BAFFC9', // Pastel Green
            '#BAE1FF', // Pastel Blue
            '#FFFFBA', // Pastel Yellow
            '#FFDFBA', // Pastel Orange
            '#E0BBE4', // Pastel Purple
            '#FFDAC1', // Pastel Peach
            '#C7CEEA'  // Pastel Lavender
        ],
        ui: {
            buttonBackground: '#E9ECEF',
            buttonHover: '#DEE2E6',
            buttonActive: '#CED4DA',
            inputBackground: '#FFFFFF',
            borderColor: '#DEE2E6'
        }
    },

    space: {
        name: 'Space',
        background: '#0B1426',
        primary: '#4A90E2',
        secondary: '#7B68EE',
        accent: '#9370DB',
        text: '#FFFFFF',
        textSecondary: '#B8BCC8',
        gridBackground: '#1A2332',
        gridLines: '#2A3441',
        blockColors: [
            '#4A90E2', // Space Blue
            '#7B68EE', // Medium Slate Blue
            '#9370DB', // Medium Purple
            '#8A2BE2', // Blue Violet
            '#6495ED', // Cornflower Blue
            '#00BFFF', // Deep Sky Blue
            '#1E90FF', // Dodger Blue
            '#483D8B'  // Dark Slate Blue
        ],
        ui: {
            buttonBackground: '#2A3441',
            buttonHover: '#3A4551',
            buttonActive: '#4A5661',
            inputBackground: '#1A2332',
            borderColor: '#3A4551'
        }
    },

    colorblind: {
        name: 'Colorblind Friendly',
        background: '#2C2C2C',
        primary: '#E69F00',
        secondary: '#56B4E9',
        accent: '#009E73',
        text: '#FFFFFF',
        textSecondary: '#CCCCCC',
        gridBackground: '#404040',
        gridLines: '#666666',
        blockColors: [
            '#E69F00', // Orange
            '#56B4E9', // Sky Blue
            '#009E73', // Bluish Green
            '#F0E442', // Yellow
            '#CC79A7', // Reddish Purple
            '#D55E00', // Vermillion
            '#0072B2', // Blue
            '#999999'  // Gray
        ],
        ui: {
            buttonBackground: '#555555',
            buttonHover: '#666666',
            buttonActive: '#777777',
            inputBackground: '#404040',
            borderColor: '#666666'
        }
    }
};

/**
 * Theme manager class
 */
class ThemeManager {
    constructor() {
        this.currentTheme = 'vibrant';
        this.themes = THEMES;
    }

    /**
     * Set current theme
     */
    setTheme(themeName) {
        if (this.themes[themeName]) {
            this.currentTheme = themeName;
            this.applyTheme();
            return true;
        }
        return false;
    }

    /**
     * Get current theme
     */
    getCurrentTheme() {
        return this.themes[this.currentTheme];
    }

    /**
     * Get theme by name
     */
    getTheme(themeName) {
        return this.themes[themeName] || this.themes.vibrant;
    }

    /**
     * Get all available themes
     */
    getAllThemes() {
        return Object.keys(this.themes);
    }

    /**
     * Get current theme name
     */
    getCurrentThemeName() {
        return this.currentTheme;
    }

    /**
     * Get block color by index
     */
    getBlockColor(index) {
        const theme = this.getCurrentTheme();
        return theme.blockColors[index % theme.blockColors.length];
    }

    /**
     * Get block color hex value
     */
    getBlockColorHex(index) {
        const color = this.getBlockColor(index);
        return parseInt(color.replace('#', ''), 16);
    }

    /**
     * Apply theme to DOM elements
     */
    applyTheme() {
        const theme = this.getCurrentTheme();
        const root = document.documentElement;

        // Apply CSS custom properties
        root.style.setProperty('--bg-color', theme.background);
        root.style.setProperty('--primary-color', theme.primary);
        root.style.setProperty('--secondary-color', theme.secondary);
        root.style.setProperty('--accent-color', theme.accent);
        root.style.setProperty('--text-color', theme.text);
        root.style.setProperty('--text-secondary-color', theme.textSecondary);
        root.style.setProperty('--grid-bg-color', theme.gridBackground);
        root.style.setProperty('--grid-lines-color', theme.gridLines);
        root.style.setProperty('--button-bg-color', theme.ui.buttonBackground);
        root.style.setProperty('--button-hover-color', theme.ui.buttonHover);
        root.style.setProperty('--button-active-color', theme.ui.buttonActive);
        root.style.setProperty('--input-bg-color', theme.ui.inputBackground);
        root.style.setProperty('--border-color', theme.ui.borderColor);

        // Apply background to body
        document.body.style.backgroundColor = theme.background;
    }

    /**
     * Get theme colors for Phaser scenes
     */
    getPhaserColors() {
        const theme = this.getCurrentTheme();
        return {
            background: parseInt(theme.background.replace('#', ''), 16),
            primary: parseInt(theme.primary.replace('#', ''), 16),
            secondary: parseInt(theme.secondary.replace('#', ''), 16),
            accent: parseInt(theme.accent.replace('#', ''), 16),
            text: parseInt(theme.text.replace('#', ''), 16),
            gridBackground: parseInt(theme.gridBackground.replace('#', ''), 16),
            gridLines: parseInt(theme.gridLines.replace('#', ''), 16),
            blockColors: (theme.blockColors || []).map(color => parseInt(color.replace('#', ''), 16))
        };
    }

    /**
     * Initialize theme system
     */
    init(initialTheme = 'vibrant') {
        this.setTheme(initialTheme);
    }

    /**
     * Get contrasting text color for a background
     */
    getContrastingTextColor(backgroundColor) {
        // Convert hex to RGB
        const hex = backgroundColor.replace('#', '');
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);

        // Calculate relative luminance
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

        // Return black for light backgrounds, white for dark
        return luminance > 0.5 ? '#000000' : '#FFFFFF';
    }

    /**
     * Create gradient background for UI elements
     */
    createGradient(color1, color2, direction = 'to bottom') {
        return `linear-gradient(${direction}, ${color1}, ${color2})`;
    }

    /**
     * Get theme-appropriate shadow
     */
    getShadow(intensity = 'normal') {
        const theme = this.getCurrentTheme();
        const shadowColor = theme.background === '#F8F9FA' ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)';

        switch (intensity) {
            case 'light':
                return `0 1px 3px ${shadowColor}`;
            case 'normal':
                return `0 2px 6px ${shadowColor}`;
            case 'heavy':
                return `0 4px 12px ${shadowColor}`;
            default:
                return `0 2px 6px ${shadowColor}`;
        }
    }
}

// Create and export singleton instance
export const themeManager = new ThemeManager();