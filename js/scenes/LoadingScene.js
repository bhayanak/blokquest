// Loading scene for game initialization
import { themeManager } from '../core/themes.js';

export class LoadingScene extends Phaser.Scene {
    constructor() {
        super({ key: 'LoadingScene' });
    }

    preload() {
        // Show loading text
        this.add.text(this.cameras.main.centerX, this.cameras.main.centerY - 50, 'BLOCKQUEST', {
            fontSize: '24px',
            fontFamily: 'Arial, sans-serif',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        this.add.text(this.cameras.main.centerX, this.cameras.main.centerY, 'Loading...', {
            fontSize: '16px',
            fontFamily: 'Arial, sans-serif',
            color: '#cccccc'
        }).setOrigin(0.5);

        // Create loading bar
        const loadingBar = this.add.graphics();
        const loadingBox = this.add.graphics();
        
        loadingBox.fillStyle(0x222222);
        loadingBox.fillRect(this.cameras.main.centerX - 160, this.cameras.main.centerY + 30, 320, 20);
        
        // Loading progress
        this.load.on('progress', (value) => {
            loadingBar.clear();
            loadingBar.fillStyle(0x4CAF50);
            loadingBar.fillRect(this.cameras.main.centerX - 155, this.cameras.main.centerY + 35, 310 * value, 10);
        });

        // Load assets
        this.load.audio('place', 'assets/place.wav');
        this.load.audio('clear', 'assets/clear.wav');  
        this.load.audio('gameover', 'assets/gameover.wav');
        this.load.image('logo', 'assets/logo.png');
        this.load.image('favicon', 'assets/favicon.png');
    }

    create() {
        // Initialize core systems
        this.initializeSystems().then(() => {
            // Transition to menu
            this.scene.start('MenuScene');
        });
    }

    async initializeSystems() {
        // Initialize theme manager
        themeManager.init();
        
        // Small delay to show loading screen
        await new Promise(resolve => setTimeout(resolve, 500));
    }
}