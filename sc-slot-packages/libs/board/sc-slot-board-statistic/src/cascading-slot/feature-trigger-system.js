// Feature Trigger System
// Implements ONLY the actual bonus features available in the slot system
// Based on settlementResult structure: freeSpins, additionalFreeSpins, and tumbles
export class FeatureTriggerSystem {
    config;
    featureCooldowns = new Map();
    constructor(config) {
        this.config = config;
    }
    /**
     * Determine if any feature should trigger for current round
     */
    shouldTriggerFeature(currentRound, patternRequest) {
        if (!this.config.enableFeatures) {
            return null;
        }
        const board = currentRound.board || [];
        const currentWin = currentRound.currentWin || 0;
        const isFreeSpin = currentRound.isFreeSpin || false;
        // Count symbols on board
        const symbolCounts = {};
        board.forEach((symbol) => {
            symbolCounts[symbol] = (symbolCounts[symbol] || 0) + 1;
        });
        // Try each available feature
        for (const featureType of this.config.availableFeatures) {
            // Skip if on cooldown
            if (this.isFeatureOnCooldown(featureType)) {
                continue;
            }
            const featureConfig = this.config.featureConfigs[featureType];
            if (!featureConfig)
                continue;
            // Check if this feature should trigger
            const shouldTrigger = this.checkFeatureTrigger(featureConfig, board, symbolCounts, patternRequest?.triggerFeature && patternRequest?.featureType === featureType, currentWin);
            if (shouldTrigger) {
                const result = this.executeFeature(featureType, featureConfig, board, currentWin);
                this.setFeatureCooldown(featureType);
                return {
                    triggered: true,
                    type: featureType,
                    result,
                    description: result.description
                };
            }
        }
        return null;
    }
    /**
     * Check if specific feature should trigger based on conditions
     */
    checkFeatureTrigger(featureConfig, board, symbols, patternRequestsFeature, currentWin) {
        // Check if trigger symbols are present
        const triggerSymbolsPresent = featureConfig.triggerSymbols.some(symbol => (symbols[symbol] || 0) >= featureConfig.minSymbolCount);
        // Must have either trigger symbols or pattern request
        if (!triggerSymbolsPresent && !patternRequestsFeature) {
            return false;
        }
        // Calculate trigger probability
        let triggerProbability = featureConfig.triggerProbability;
        // Boost probability if pattern requests this feature
        if (patternRequestsFeature) {
            triggerProbability *= this.config.patternBoostMultiplier;
        }
        // Apply base frequency modifier
        triggerProbability *= this.config.baseFrequency / 0.1; // Normalize around 10%
        // Cap at 95%
        triggerProbability = Math.min(triggerProbability, 0.95);
        // Roll for trigger
        return Math.random() < triggerProbability;
    }
    /**
     * Execute a specific feature
     */
    executeFeature(featureType, featureConfig, board, baseWin) {
        switch (featureType) {
            case 'free-spins':
                return this.executeFreeSpinsFeature(baseWin);
            case 'additional-free-spins':
                return this.executeAdditionalFreeSpinsFeature(baseWin);
            case 'tumble-cascade':
                return this.executeTumbleCascadeFeature(baseWin);
            default:
                return this.createNullFeatureResult(baseWin);
        }
    }
    /**
     * Free Spins Feature
     * Awards 8-15 free spins with accumulating multipliers during the feature
     * Based on settlementResult.freeSpins.odds
     */
    executeFreeSpinsFeature(baseWin) {
        const freeSpinsCount = 8 + Math.floor(Math.random() * 8); // 8-15 spins
        const startingMultiplier = 1; // Multipliers accumulate during free spins
        const featureWin = baseWin * 1.5; // Base enhancement for triggering
        return {
            type: 'free-spins',
            triggered: true,
            baseWin,
            featureWin,
            totalWin: baseWin + featureWin,
            multiplier: startingMultiplier,
            freeSpinsAwarded: freeSpinsCount,
            description: `🎰 FREE SPINS! ${freeSpinsCount} free spins with accumulating multipliers`,
            emotionalImpact: 'high'
        };
    }
    /**
     * Additional Free Spins Feature
     * Awards extra free spins during free spin mode (retriggering)
     * Based on settlementResult.additionalFreeSpins.odds
     */
    executeAdditionalFreeSpinsFeature(baseWin) {
        const additionalSpins = 3 + Math.floor(Math.random() * 5); // 3-7 additional spins
        const featureWin = baseWin * 0.8; // Moderate enhancement
        return {
            type: 'additional-free-spins',
            triggered: true,
            baseWin,
            featureWin,
            totalWin: baseWin + featureWin,
            multiplier: 1,
            freeSpinsAwarded: additionalSpins,
            description: `🔄 RETRIGGER! ${additionalSpins} additional free spins awarded`,
            emotionalImpact: 'high'
        };
    }
    /**
     * Tumble Cascade Feature
     * Enhanced tumbling mechanics with better cascade potential
     * Based on settlementResult.tumbles array with multipliers
     */
    executeTumbleCascadeFeature(baseWin) {
        const cascadeMultiplier = 1.2 + Math.random() * 0.8; // 1.2x-2.0x multiplier
        const featureWin = baseWin * (cascadeMultiplier - 1);
        return {
            type: 'tumble-cascade',
            triggered: true,
            baseWin,
            featureWin,
            totalWin: baseWin * cascadeMultiplier,
            multiplier: cascadeMultiplier,
            freeSpinsAwarded: 0,
            description: `💎 ENHANCED TUMBLE! Better cascade potential at ${cascadeMultiplier.toFixed(1)}x`,
            emotionalImpact: 'medium'
        };
    }
    /**
     * Create null result when no feature triggers
     */
    createNullFeatureResult(baseWin) {
        return {
            type: 'free-spins',
            triggered: false,
            baseWin,
            featureWin: 0,
            totalWin: baseWin,
            multiplier: 1,
            freeSpinsAwarded: 0,
            description: 'No feature triggered',
            emotionalImpact: 'low'
        };
    }
    /**
     * Check if feature is on cooldown
     */
    isFeatureOnCooldown(featureType) {
        const cooldownEnd = this.featureCooldowns.get(featureType);
        return cooldownEnd ? Date.now() < cooldownEnd : false;
    }
    /**
     * Set cooldown for a feature
     */
    setFeatureCooldown(featureType, cooldownSpins = 5) {
        // Simple time-based cooldown for now
        const cooldownMs = cooldownSpins * 3000; // 3 seconds per "spin" 
        this.featureCooldowns.set(featureType, Date.now() + cooldownMs);
    }
    /**
     * Force trigger a specific feature (for patterns)
     */
    forceTriggerFeature(featureType, baseWin) {
        const featureConfig = this.config.featureConfigs[featureType];
        if (featureConfig) {
            return this.executeFeature(featureType, featureConfig, [], baseWin);
        }
        return this.createNullFeatureResult(baseWin);
    }
    /**
     * Get feature system status
     */
    getFeatureStatus() {
        const cooldownStatus = {};
        this.featureCooldowns.forEach((endTime, featureType) => {
            const remaining = Math.max(0, endTime - Date.now());
            if (remaining > 0) {
                cooldownStatus[featureType] = Math.ceil(remaining / 1000);
            }
        });
        return {
            availableFeatures: [...this.config.availableFeatures],
            cooldowns: cooldownStatus
        };
    }
}
/**
 * Default Feature Configuration - Using ONLY Real Features
 */
export const DEFAULT_FEATURE_CONFIG = {
    enableFeatures: true,
    availableFeatures: [
        'free-spins',
        'additional-free-spins',
        'tumble-cascade'
    ],
    baseFrequency: 0.10,
    patternBoostMultiplier: 2.5,
    featureConfigs: {
        'free-spins': {
            type: 'free-spins',
            triggerSymbols: [9],
            minSymbolCount: 3,
            triggerProbability: 0.08,
            patternTriggered: true
        },
        'additional-free-spins': {
            type: 'additional-free-spins',
            triggerSymbols: [9],
            minSymbolCount: 2,
            triggerProbability: 0.06,
            patternTriggered: true
        },
        'tumble-cascade': {
            type: 'tumble-cascade',
            triggerSymbols: [0, 1, 2, 3, 4, 5, 6, 7, 8],
            minSymbolCount: 4,
            triggerProbability: 0.05,
            patternTriggered: true
        }
    }
};
