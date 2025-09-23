// Power-up system for special abilities and game economy
import { POWER_UPS, POWER_UP_COSTS, GAME_MODES } from '../core/constants.js';
import { storage } from '../core/storage.js';
import { audioManager } from '../core/audio.js';

/**
 * Power-up manager class
 */
export class PowerUpManager {
    constructor(gameMode = GAME_MODES.NORMAL) {
        this.gameMode = gameMode;
        this.activePowerUp = null;
        this.powerUpCallbacks = {};
        this.costs = this.getCostsForMode(gameMode);
        
        // Advanced power-up states
        this.timeWarpActive = false;
        this.timeWarpEndTime = 0;
        this.futureSightActive = false;
        this.futureSightEndTime = 0;
        this.colorRadarActive = false;
        this.colorRadarEndTime = 0;
        this.smartPlacementActive = false;
        this.smartPlacementEndTime = 0;
        this.phoenixRevivalActive = false;
    }

    /**
     * Get power-up costs for current game mode
     */
    getCostsForMode(mode) {
        return mode === GAME_MODES.ENDLESS ? POWER_UP_COSTS.ENDLESS : POWER_UP_COSTS.NORMAL;
    }

    /**
     * Set game mode and update costs
     */
    setGameMode(mode) {
        this.gameMode = mode;
        this.costs = this.getCostsForMode(mode);
    }

    /**
     * Register callbacks for power-up effects
     */
    registerCallbacks(callbacks) {
        this.powerUpCallbacks = { ...callbacks };
    }

    /**
     * Check if player can afford a power-up
     */
    canAfford(powerUpType, score = 0) {
        const cost = this.costs[powerUpType];
        if (!cost) return false;

        if (this.gameMode === GAME_MODES.ENDLESS) {
            // In endless mode, use score to buy power-ups
            return score >= cost;
        } else {
            // In other modes, use coins
            return storage.getCoins() >= cost;
        }
    }

    /**
     * Purchase a power-up
     */
    purchasePowerUp(powerUpType, score = 0) {
        if (!this.canAfford(powerUpType, score)) {
            return { success: false, reason: 'insufficient_funds' };
        }

        const cost = this.costs[powerUpType];

        if (this.gameMode === GAME_MODES.ENDLESS) {
            // In endless mode, power-ups are used immediately and cost score
            return this.usePowerUp(powerUpType, score);
        } else {
            // In other modes, spend coins and add to inventory
            if (storage.spendCoins(cost)) {
                storage.addPowerUp(powerUpType, 1);
                return {
                    success: true,
                    powerUpType,
                    cost,
                    newCount: storage.getPowerUpCount(powerUpType)
                };
            }
        }

        return { success: false, reason: 'transaction_failed' };
    }

    /**
     * Use a power-up
     */
    usePowerUp(powerUpType, currentScore = 0) {
        // Check availability
        if (this.gameMode === GAME_MODES.ENDLESS) {
            if (!this.canAfford(powerUpType, currentScore)) {
                return { success: false, reason: 'insufficient_score' };
            }
        } else {
            if (storage.getPowerUpCount(powerUpType) <= 0) {
                return { success: false, reason: 'not_owned' };
            }
        }

        // Check if another power-up is active
        if (this.activePowerUp && this.activePowerUp !== powerUpType) {
            return { success: false, reason: 'power_up_active' };
        }

        // Execute power-up effect
        const result = this.executePowerUp(powerUpType, currentScore);

        if (result.success) {
            // Deduct cost/inventory
            if (this.gameMode === GAME_MODES.ENDLESS) {
                result.scoreCost = this.costs[powerUpType];
            } else {
                storage.usePowerUp(powerUpType);
            }
        }

        return result;
    }

    /**
     * Execute power-up effect
     */
    executePowerUp(powerUpType, currentScore = 0) {
        switch (powerUpType) {
            case POWER_UPS.CLEAR_ROW:
                return this.executeClearRow();

            case POWER_UPS.SWAP_TRAY:
                return this.executeSwapTray();

            case POWER_UPS.EXTRA_UNDO:
                return this.executeExtraUndo();

            case POWER_UPS.TIME_SLOW:
                return this.executeTimeSlow();

            case POWER_UPS.BLOCK_PREVIEW:
                return this.executeBlockPreview();

            case POWER_UPS.LINE_BLAST:
                return this.executeLineBlast();

            case POWER_UPS.COLOR_MATCH:
                return this.executeColorMatch();

            case POWER_UPS.PERFECT_FIT:
                return this.executePerfectFit();

            case POWER_UPS.SECOND_CHANCE:
                return this.executeSecondChance();

            default:
                return { success: false, reason: 'unknown_power_up' };
        }
    }

    /**
     * Execute Clear Row power-up
     */
    executeClearRow() {
        this.activePowerUp = POWER_UPS.CLEAR_ROW;

        if (this.powerUpCallbacks.onClearRowActivated) {
            this.powerUpCallbacks.onClearRowActivated();
        }

        return {
            success: true,
            powerUpType: POWER_UPS.CLEAR_ROW,
            requiresSelection: true,
            message: 'Click on a row to clear it'
        };
    }

    /**
     * Clear specific row (called after row selection)
     */
    clearRow(rowIndex) {
        if (this.activePowerUp !== POWER_UPS.CLEAR_ROW) {
            return { success: false, reason: 'power_up_not_active' };
        }

        let rowCleared = false;
        let blocksCleared = 0;

        if (this.powerUpCallbacks.onClearRow) {
            const result = this.powerUpCallbacks.onClearRow(rowIndex);
            rowCleared = result.success;
            blocksCleared = result.blocksCleared || 0;
        }

        this.activePowerUp = null;

        if (rowCleared) {
            audioManager.playClear();
            return {
                success: true,
                rowIndex,
                blocksCleared,
                message: `Row ${rowIndex + 1} cleared!`
            };
        }

        return { success: false, reason: 'clear_failed' };
    }

    /**
     * Execute Swap Tray power-up
     */
    executeSwapTray() {
        let swapSuccess = false;

        if (this.powerUpCallbacks.onSwapTray) {
            swapSuccess = this.powerUpCallbacks.onSwapTray();
        }

        if (swapSuccess) {
            audioManager.playPlace();
            return {
                success: true,
                powerUpType: POWER_UPS.SWAP_TRAY,
                message: 'Tray refreshed with new shapes!'
            };
        }

        return { success: false, reason: 'swap_failed' };
    }

    /**
     * Execute Extra Undo power-up
     */
    executeExtraUndo() {
        let undoSuccess = false;

        if (this.powerUpCallbacks.onExtraUndo) {
            undoSuccess = this.powerUpCallbacks.onExtraUndo();
        }

        if (undoSuccess) {
            audioManager.playPlace();
            return {
                success: true,
                powerUpType: POWER_UPS.EXTRA_UNDO,
                message: 'Last move undone!'
            };
        }

        return { success: false, reason: 'undo_failed' };
    }

    /**
     * Execute Time Slow (Time Warp) power-up
     */
    executeTimeSlow() {
        if (this.powerUpCallbacks.onTimeSlow) {
            this.powerUpCallbacks.onTimeSlow();
        }

        // Start time warp effect
        this.timeWarpActive = true;
        this.timeWarpEndTime = Date.now() + 30000; // 30 seconds

        audioManager.playPlace();
        return {
            success: true,
            powerUpType: POWER_UPS.TIME_SLOW,
            message: 'Time Warp activated for 30 seconds!',
            duration: 30000
        };
    }

    /**
     * Execute Block Preview (Future Sight) power-up
     */
    executeBlockPreview() {
        if (this.powerUpCallbacks.onBlockPreview) {
            this.powerUpCallbacks.onBlockPreview();
        }

        // Activate future sight mode
        this.futureSightActive = true;
        this.futureSightEndTime = Date.now() + 60000; // 60 seconds

        audioManager.playPlace();
        return {
            success: true,
            powerUpType: POWER_UPS.BLOCK_PREVIEW,
            message: 'Future Sight activated! See upcoming shapes!',
            duration: 60000
        };
    }

    /**
     * Execute Line Blast power-up
     */
    executeLineBlast() {
        this.activePowerUp = POWER_UPS.LINE_BLAST;

        if (this.powerUpCallbacks.onLineBlastActivated) {
            this.powerUpCallbacks.onLineBlastActivated();
        }

        return {
            success: true,
            powerUpType: POWER_UPS.LINE_BLAST,
            message: 'Click on a line to blast it!'
        };
    }

    /**
     * Execute Color Match (Color Radar) power-up
     */
    executeColorMatch() {
        if (this.powerUpCallbacks.onColorMatch) {
            // First activate color radar mode to highlight matching blocks
            this.colorRadarActive = true;
            this.colorRadarEndTime = Date.now() + 15000; // 15 seconds to see highlighted blocks
            
            const matchSuccess = this.powerUpCallbacks.onColorMatch();
            
            audioManager.playPlace();
            return {
                success: true,
                powerUpType: POWER_UPS.COLOR_MATCH,
                message: 'Color Radar activated! Matching blocks highlighted!',
                duration: 15000
            };
        }

        return { success: false, reason: 'no_matches' };
    }

    /**
     * Execute Perfect Fit (Smart Placement) power-up
     */
    executePerfectFit() {
        if (this.powerUpCallbacks.onPerfectFit) {
            this.powerUpCallbacks.onPerfectFit();
        }

        // Activate smart placement mode
        this.smartPlacementActive = true;
        this.smartPlacementEndTime = Date.now() + 45000; // 45 seconds

        audioManager.playPlace();
        return {
            success: true,
            powerUpType: POWER_UPS.PERFECT_FIT,
            message: 'Smart Placement activated! Optimal spots highlighted!',
            duration: 45000
        };
    }

    /**
     * Execute Second Chance (Phoenix Revival) power-up
     */
    executeSecondChance() {
        if (this.powerUpCallbacks.onSecondChance) {
            this.powerUpCallbacks.onSecondChance();
        }

        // Store phoenix revival state
        this.phoenixRevivalActive = true;

        audioManager.playPlace();
        return {
            success: true,
            powerUpType: POWER_UPS.SECOND_CHANCE,
            message: 'Phoenix Revival activated! You can continue after game over!'
        };
    }

    /**
     * Cancel active power-up
     */
    cancelActivePowerUp() {
        const wasActive = this.activePowerUp;
        this.activePowerUp = null;

        if (this.powerUpCallbacks.onPowerUpCancelled) {
            this.powerUpCallbacks.onPowerUpCancelled(wasActive);
        }

        return wasActive !== null;
    }

    /**
     * Get active power-up
     */
    getActivePowerUp() {
        return this.activePowerUp;
    }

    /**
     * Check if a power-up is active
     */
    isPowerUpActive(powerUpType = null) {
        if (powerUpType) {
            return this.activePowerUp === powerUpType;
        }
        return this.activePowerUp !== null;
    }

    /**
     * Get power-up cost for display
     */
    getPowerUpCost(powerUpType) {
        return this.costs[powerUpType] || 0;
    }

    /**
     * Get power-up count from storage
     */
    getPowerUpCount(powerUpType) {
        return storage.getPowerUpCount(powerUpType);
    }

    /**
     * Check if time warp is active
     */
    isTimeWarpActive() {
        if (this.timeWarpActive && Date.now() > this.timeWarpEndTime) {
            this.timeWarpActive = false;
        }
        return this.timeWarpActive;
    }

    /**
     * Check if future sight is active
     */
    isFutureSightActive() {
        if (this.futureSightActive && Date.now() > this.futureSightEndTime) {
            this.futureSightActive = false;
        }
        return this.futureSightActive;
    }

    /**
     * Check if color radar is active
     */
    isColorRadarActive() {
        if (this.colorRadarActive && Date.now() > this.colorRadarEndTime) {
            this.colorRadarActive = false;
        }
        return this.colorRadarActive;
    }

    /**
     * Check if smart placement is active
     */
    isSmartPlacementActive() {
        if (this.smartPlacementActive && Date.now() > this.smartPlacementEndTime) {
            this.smartPlacementActive = false;
        }
        return this.smartPlacementActive;
    }

    /**
     * Check if phoenix revival is active
     */
    isPhoenixRevivalActive() {
        return this.phoenixRevivalActive;
    }

    /**
     * Use phoenix revival (called when game over occurs)
     */
    usePhoenixRevival() {
        if (this.phoenixRevivalActive) {
            this.phoenixRevivalActive = false;
            return true;
        }
        return false;
    }

    /**
     * Get time remaining for active power-ups
     */
    getActivePowerUpTimeRemaining() {
        const now = Date.now();
        const active = {};
        
        if (this.isTimeWarpActive()) {
            active.timeWarp = Math.max(0, this.timeWarpEndTime - now);
        }
        if (this.isFutureSightActive()) {
            active.futureSight = Math.max(0, this.futureSightEndTime - now);
        }
        if (this.isColorRadarActive()) {
            active.colorRadar = Math.max(0, this.colorRadarEndTime - now);
        }
        if (this.isSmartPlacementActive()) {
            active.smartPlacement = Math.max(0, this.smartPlacementEndTime - now);
        }
        
        return active;
    }

    /**
     * Get all power-up counts
     */
    getAllPowerUpCounts() {
        return {
            [POWER_UPS.CLEAR_ROW]: this.getPowerUpCount(POWER_UPS.CLEAR_ROW),
            [POWER_UPS.SWAP_TRAY]: this.getPowerUpCount(POWER_UPS.SWAP_TRAY),
            [POWER_UPS.EXTRA_UNDO]: this.getPowerUpCount(POWER_UPS.EXTRA_UNDO)
        };
    }

    /**
     * Get power-up information for UI
     */
    getPowerUpInfo(powerUpType) {
        const info = {
            type: powerUpType,
            cost: this.getPowerUpCost(powerUpType),
            owned: this.getPowerUpCount(powerUpType),
            currency: this.gameMode === GAME_MODES.ENDLESS ? 'score' : 'coins'
        };

        switch (powerUpType) {
            case POWER_UPS.CLEAR_ROW:
                info.name = 'Clear Row';
                info.description = 'Instantly clear any row';
                info.icon = '🧹';
                break;
            case POWER_UPS.SWAP_TRAY:
                info.name = 'Swap Tray';
                info.description = 'Replace all tray shapes with new ones';
                info.icon = '🔄';
                break;
            case POWER_UPS.EXTRA_UNDO:
                info.name = 'Extra Undo';
                info.description = 'Undo your last move';
                info.icon = '↶';
                break;
        }

        return info;
    }

    /**
     * Get all power-up information
     */
    getAllPowerUpInfo() {
        return [
            this.getPowerUpInfo(POWER_UPS.CLEAR_ROW),
            this.getPowerUpInfo(POWER_UPS.SWAP_TRAY),
            this.getPowerUpInfo(POWER_UPS.EXTRA_UNDO)
        ];
    }

    /**
     * Check if player has any power-ups
     */
    hasAnyPowerUps() {
        return Object.values(POWER_UPS).some(powerUp =>
            this.getPowerUpCount(powerUp) > 0
        );
    }

    /**
     * Get power-up shop data for menu
     */
    getShopData() {
        const currentCoins = storage.getCoins();

        return this.getAllPowerUpInfo().map(info => ({
            ...info,
            canAfford: this.gameMode === GAME_MODES.ENDLESS ? true : currentCoins >= info.cost,
            isMaxed: false // Could implement max limits if desired
        }));
    }

    /**
     * Bulk purchase power-ups
     */
    bulkPurchase(purchases) {
        const results = [];
        let totalCost = 0;

        // Calculate total cost first
        for (const { powerUpType, quantity } of purchases) {
            const unitCost = this.getPowerUpCost(powerUpType);
            totalCost += unitCost * quantity;
        }

        // Check if player can afford all
        if (this.gameMode !== GAME_MODES.ENDLESS && storage.getCoins() < totalCost) {
            return { success: false, reason: 'insufficient_funds', totalCost };
        }

        // Execute purchases
        for (const { powerUpType, quantity } of purchases) {
            for (let i = 0; i < quantity; i++) {
                const result = this.purchasePowerUp(powerUpType);
                results.push(result);

                if (!result.success) {
                    // Rollback previous purchases if any fail
                    // This is simplified - a real implementation might need more sophisticated rollback
                    break;
                }
            }
        }

        return {
            success: results.every(r => r.success),
            results,
            totalCost
        };
    }

    /**
     * Get usage statistics
     */
    getUsageStats() {
        // This would be enhanced with actual usage tracking
        return {
            totalUsed: 0,
            mostUsed: POWER_UPS.SWAP_TRAY,
            efficiency: 0
        };
    }

    /**
     * Reset power-up state (for new game)
     */
    reset() {
        this.activePowerUp = null;
    }

    /**
     * Export power-up state
     */
    exportState() {
        return {
            gameMode: this.gameMode,
            activePowerUp: this.activePowerUp,
            costs: this.costs
        };
    }

    /**
     * Import power-up state
     */
    importState(state) {
        this.gameMode = state.gameMode || GAME_MODES.NORMAL;
        this.activePowerUp = state.activePowerUp || null;
        this.costs = state.costs || this.getCostsForMode(this.gameMode);
    }
}