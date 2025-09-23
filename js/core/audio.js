// Audio manager for sound effects
import { AUDIO } from './constants.js';
import { storage } from './storage.js';

class AudioManager {
    constructor() {
        this.sounds = {};
        this.enabled = storage.isAudioEnabled();
        this.masterVolume = storage.get('masterVolume', AUDIO.MASTER_VOLUME);
        this.sfxVolume = storage.get('sfxVolume', AUDIO.SFX_VOLUME);
        this.initialized = false;
    }

    /**
     * Initialize audio system with Phaser scene
     */
    init(scene) {
        this.scene = scene;
        this.loadSounds();
        this.initialized = true;
    }

    /**
     * Load all sound files
     */
    loadSounds() {
        if (!this.scene) return;

        // Preload sound files
        this.scene.load.audio('place', 'assets/place.wav');
        this.scene.load.audio('clear', 'assets/clear.wav');
        this.scene.load.audio('gameover', 'assets/gameover.wav');
        this.scene.load.audio('combo', 'assets/combo.wav');
        this.scene.load.audio('hover', 'assets/hover.wav');
        this.scene.load.audio('bgmusic', 'assets/sfx.wav');
    }

    /**
     * Create sound objects after loading
     */
    createSounds() {
        if (!this.scene || !this.initialized) {
            console.log('❌ Cannot create sounds - scene or initialization missing');
            return;
        }

        console.log('🔊 Creating audio sounds...');

        this.sounds = {
            place: this.scene.sound.add('place', { volume: this.sfxVolume * this.masterVolume }),
            clear: this.scene.sound.add('clear', { volume: this.sfxVolume * this.masterVolume }),
            gameover: this.scene.sound.add('gameover', { volume: this.sfxVolume * this.masterVolume }),
            combo: this.scene.sound.add('combo', { volume: this.sfxVolume * this.masterVolume }),
            hover: this.scene.sound.add('hover', { volume: this.sfxVolume * this.masterVolume }),
            bgmusic: this.scene.sound.add('bgmusic', {
                volume: (this.masterVolume * 0.3), // Lower volume for bg music
                loop: true
            })
        };

        console.log('✅ Audio sounds created:', Object.keys(this.sounds));
        console.log('🎵 Background music loaded:', !!this.sounds.bgmusic);
    }

    /**
     * Play combo sound
     */
    playCombo() {
        this.playSound('combo');
    }
    /**
     * Play hover sound
     */
    playHover() {
        this.playSound('hover');
    }

    /**
     * Play a sound effect
     */
    playSound(soundName) {
        if (!this.enabled || !this.sounds[soundName]) return;

        try {
            this.sounds[soundName].play();
        } catch (e) {
            console.warn(`Failed to play sound: ${soundName}`, e);
        }
    }

    /**
     * Play place sound
     */
    playPlace() {
        this.playSound('place');
    }

    /**
     * Play clear sound
     */
    playClear() {
        this.playSound('clear');
    }

    /**
     * Play game over sound
     */
    playGameOver() {
        this.playSound('gameover');
    }

    /**
     * Play combo sound
     */
    playCombo() {
        this.playSound('combo');
    }

    /**
     * Play hover sound
     */
    playHover() {
        this.playSound('hover');
    }

    /**
     * Start background music
     */
    startBackgroundMusic() {
        console.log('🎵 Attempting to start background music...');
        console.log('Audio enabled:', this.enabled);
        console.log('Background music sound exists:', !!this.sounds.bgmusic);

        if (!this.enabled) {
            console.log('❌ Audio is disabled - not starting music');
            return;
        }

        if (!this.sounds.bgmusic) {
            console.log('❌ Background music sound not loaded');
            return;
        }

        if (!this.sounds.bgmusic.isPlaying) {
            try {
                console.log('▶️ Starting background music...');
                this.sounds.bgmusic.play();
                console.log('✅ Background music started successfully');
            } catch (e) {
                console.error('❌ Failed to start background music:', e);
            }
        } else {
            console.log('🎵 Background music is already playing');
        }
    }

    /**
     * Stop background music
     */
    stopBackgroundMusic() {
        if (this.sounds.bgmusic && this.sounds.bgmusic.isPlaying) {
            this.sounds.bgmusic.stop();
        }
    }

    /**
     * Toggle audio on/off
     */
    toggle() {
        this.enabled = !this.enabled;
        storage.setAudioEnabled(this.enabled);

        if (!this.enabled) {
            this.stopAll();
        }

        return this.enabled;
    }

    /**
     * Enable audio
     */
    enable() {
        this.enabled = true;
        storage.setAudioEnabled(true);
    }

    /**
     * Disable audio
     */
    disable() {
        this.enabled = false;
        storage.setAudioEnabled(false);
        this.stopAll();
    }

    /**
     * Stop all sounds
     */
    stopAll() {
        Object.values(this.sounds).forEach(sound => {
            if (sound.isPlaying) {
                sound.stop();
            }
        });
    }

    /**
     * Set master volume
     */
    setMasterVolume(volume) {
        this.masterVolume = Math.max(0, Math.min(1, volume));
        this.updateAllVolumes();
    }

    /**
     * Set master volume
     */
    setMasterVolume(volume) {
        this.masterVolume = Math.max(0, Math.min(1, volume));
        storage.set('masterVolume', this.masterVolume);
        this.updateAllVolumes();
    }

    /**
     * Set SFX volume
     */
    setSFXVolume(volume) {
        this.sfxVolume = Math.max(0, Math.min(1, volume));
        storage.set('sfxVolume', this.sfxVolume);
        this.updateAllVolumes();
    }

    /**
     * Update volume for all sounds
     */
    updateAllVolumes() {
        const finalVolume = this.masterVolume * this.sfxVolume;
        Object.values(this.sounds).forEach(sound => {
            sound.setVolume(finalVolume);
        });
    }

    /**
     * Check if audio is enabled
     */
    isEnabled() {
        return this.enabled;
    }

    /**
     * Get current volumes
     */
    getVolumes() {
        return {
            master: this.masterVolume,
            sfx: this.sfxVolume,
            final: this.masterVolume * this.sfxVolume
        };
    }

    /**
     * Preload audio assets (call this in scene preload)
     */
    preloadAssets(scene) {
        // Check if assets are already loaded to avoid duplicates
        if (!scene.cache.audio.exists('place')) {
            scene.load.audio('place', 'assets/place.wav');
        }
        if (!scene.cache.audio.exists('clear')) {
            scene.load.audio('clear', 'assets/clear.wav');
        }
        if (!scene.cache.audio.exists('gameover')) {
            scene.load.audio('gameover', 'assets/gameover.wav');
        }
        if (!scene.cache.audio.exists('combo')) {
            scene.load.audio('combo', 'assets/combo.wav');
        }
        if (!scene.cache.audio.exists('hover')) {
            scene.load.audio('hover', 'assets/hover.wav');
        }
        if (!scene.cache.audio.exists('bgmusic')) {
            scene.load.audio('bgmusic', 'assets/sfx.wav');
        }
    }
    /**
     * Initialize sounds after assets are loaded (call this in scene create)
     */
    initializeSounds(scene) {
        this.scene = scene;
        this.initialized = true;

        // Check if assets are actually loaded before creating sounds
        console.log('🔊 Initializing audio system...');
        console.log('Scene exists:', !!scene);
        console.log('Audio cache - bgmusic:', scene.cache.audio.exists('bgmusic'));
        console.log('Audio cache - place:', scene.cache.audio.exists('place'));

        if (scene.cache.audio.exists('bgmusic') && scene.cache.audio.exists('place')) {
            this.createSounds();
        } else {
            console.log('⏳ Audio assets not yet loaded, will retry...');
            // Retry after a short delay
            scene.time.delayedCall(100, () => {
                console.log('🔄 Retrying audio initialization...');
                if (scene.cache.audio.exists('bgmusic') && scene.cache.audio.exists('place')) {
                    this.createSounds();
                } else {
                    console.log('❌ Audio assets still not loaded after retry');
                }
            });
        }
    }
}
// Create and export singleton instance
export const audioManager = new AudioManager();