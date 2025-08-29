// Feature Trigger System
// Implements ONLY the actual bonus features available in the slot system
// Based on settlementResult structure: freeSpins, additionalFreeSpins, and tumbles

export type FeatureType = 
    | 'free-spins'           // Free spins with accumulating multipliers
    | 'additional-free-spins' // Retriggered free spins during free spin mode
    | 'tumble-cascade';      // Enhanced tumbling/cascading mechanics

export interface FeatureTriggerCondition {
    type: FeatureType;
    triggerSymbols: number[];        // Which symbols can trigger this feature
    minSymbolCount: number;          // Minimum symbols needed to trigger
    triggerProbability: number;      // Base probability when conditions are met
    patternTriggered?: boolean;      // Can be triggered by patterns
}

export interface FeatureTriggerConfig {
    enableFeatures: boolean;
    availableFeatures: FeatureType[];
    baseFrequency: number;           // Base chance for any feature to trigger
    patternBoostMultiplier: number;  // Multiplier when pattern requests feature
    featureConfigs: Record<string, FeatureTriggerCondition>;
}

export interface FeatureResult {
    type: FeatureType;
    triggered: boolean;
    baseWin: number;
    featureWin: number;
    totalWin: number;
    multiplier: number;
    freeSpinsAwarded: number;
    description: string;
    emotionalImpact: 'low' | 'medium' | 'high';
}

export interface FeatureTriggerResult {
    triggered: boolean;
    type?: FeatureType;
    result?: FeatureResult;
    description: string;
}

export class FeatureTriggerSystem {
    private config: FeatureTriggerConfig;
    private featureCooldowns: Map<FeatureType, number> = new Map();

    constructor(config: FeatureTriggerConfig) {
        this.config = config;
    }

    /**
     * Determine if any feature should trigger for current round
     */
    shouldTriggerFeature(
        currentRound: any,
        patternRequest?: { triggerFeature: boolean; featureType?: FeatureType; patternBoostMultiplier?: number }
    ): FeatureTriggerResult | null {
        if (!this.config.enableFeatures) {
            return null;
        }

        const board = currentRound.board || [];
        const currentWin = currentRound.currentWin || 0;
        const isFreeSpin = currentRound.isFreeSpin || false;

        // Count symbols on board
        const symbolCounts: Record<number, number> = {};
        board.forEach((symbol: number) => {
            symbolCounts[symbol] = (symbolCounts[symbol] || 0) + 1;
        });

        // Try each available feature
        for (const featureType of this.config.availableFeatures) {
            // Skip if on cooldown
            if (this.isFeatureOnCooldown(featureType)) {
                continue;
            }

            const featureConfig = this.config.featureConfigs[featureType];
            if (!featureConfig) continue;

            // Check if this feature should trigger
            const shouldTrigger = this.shouldTriggerFeature(
                featureConfig,
                board,
                symbolCounts,
                patternRequest?.triggerFeature && patternRequest?.featureType === featureType,
                currentWin
            );

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
    private shouldTriggerFeature(
        featureConfig: FeatureTriggerCondition,
        board: number[],
        symbols: Record<number, number>,
        patternRequestsFeature: boolean,
        currentWin: number
    ): boolean {
        // Check if trigger symbols are present
        const triggerSymbolsPresent = featureConfig.triggerSymbols.some(symbol => 
            (symbols[symbol] || 0) >= featureConfig.minSymbolCount
        );

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
    private executeFeature(
        featureType: FeatureType,
        featureConfig: FeatureTriggerCondition,
        board: number[],
        baseWin: number
    ): FeatureResult {
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
    private executeFreeSpinsFeature(baseWin: number): FeatureResult {
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
    private executeAdditionalFreeSpinsFeature(baseWin: number): FeatureResult {
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
    private executeTumbleCascadeFeature(baseWin: number): FeatureResult {
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
    private createNullFeatureResult(baseWin: number): FeatureResult {
        return {
            type: 'free-spins', // Default type
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
    private isFeatureOnCooldown(featureType: FeatureType): boolean {
        const cooldownEnd = this.featureCooldowns.get(featureType);
        return cooldownEnd ? Date.now() < cooldownEnd : false;
    }

    /**
     * Set cooldown for a feature
     */
    private setFeatureCooldown(featureType: FeatureType, cooldownSpins: number = 5): void {
        // Simple time-based cooldown for now
        const cooldownMs = cooldownSpins * 3000; // 3 seconds per "spin" 
        this.featureCooldowns.set(featureType, Date.now() + cooldownMs);
    }

    /**
     * Force trigger a specific feature (for patterns)
     */
    forceTriggerFeature(featureType: FeatureType, baseWin: number): FeatureResult {
        const featureConfig = this.config.featureConfigs[featureType];
        if (featureConfig) {
            return this.executeFeature(featureType, featureConfig, [], baseWin);
        }

        return this.createNullFeatureResult(baseWin);
    }

    /**
     * Get feature system status
     */
    getFeatureStatus(): { availableFeatures: FeatureType[]; cooldowns: Record<string, number> } {
        const cooldownStatus: Record<string, number> = {};
        
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
export const DEFAULT_FEATURE_CONFIG: FeatureTriggerConfig = {
    enableFeatures: true,
    availableFeatures: [
        'free-spins',
        'additional-free-spins',
        'tumble-cascade'
    ],
    baseFrequency: 0.10,              // 10% base chance for any feature
    patternBoostMultiplier: 2.5,      // 2.5x boost when pattern requests feature
    featureConfigs: {
        'free-spins': {
            type: 'free-spins',
            triggerSymbols: [9],          // Scatter symbols
            minSymbolCount: 3,            // Need 3+ scatters for free spins
            triggerProbability: 0.08,     // 8% chance when scatters present
            patternTriggered: true
        },
        'additional-free-spins': {
            type: 'additional-free-spins',
            triggerSymbols: [9],          // Scatter symbols during free spins
            minSymbolCount: 2,            // Need 2+ scatters to retrigger
            triggerProbability: 0.06,     // 6% chance during free spins
            patternTriggered: true
        },
        'tumble-cascade': {
            type: 'tumble-cascade',
            triggerSymbols: [0, 1, 2, 3, 4, 5, 6, 7, 8], // Any winning symbols
            minSymbolCount: 4,            // Need good wins to trigger
            triggerProbability: 0.05,     // 5% chance with wins
            patternTriggered: true
        }
    }
};