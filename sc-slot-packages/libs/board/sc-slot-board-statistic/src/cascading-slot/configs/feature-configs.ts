// Feature Trigger Configurations
// Defines how different bonus features behave and trigger
// ONLY INCLUDES ACTUAL FEATURES AVAILABLE IN THE SLOT SYSTEM

import { FeatureTriggerConfig, FeatureType } from "../feature-trigger-system.js";

/**
 * Conservative Feature Configuration
 * For loss-averse players who prefer predictable, safe features
 */
export const CONSERVATIVE_FEATURE_CONFIG: FeatureTriggerConfig = {
    enableFeatures: true,
    availableFeatures: [
        'free-spins', 
        'tumble-cascade'
    ],
    baseFrequency: 0.08,              // 8% base chance - conservative
    patternBoostMultiplier: 2.0,      // 2x boost when pattern requests feature
    featureConfigs: {
        'free-spins': {
            type: 'free-spins',
            triggerSymbols: [9],          // Scatter symbols (assuming symbol 9 is scatter)
            minSymbolCount: 3,
            triggerProbability: 0.05,     // 5% chance when scatters present
            patternTriggered: true
        },
        'additional-free-spins': {
            type: 'additional-free-spins',
            triggerSymbols: [9],          // Scatter symbols during free spins
            minSymbolCount: 2,            // Need 2+ scatters to retrigger (easier than normal)
            triggerProbability: 0.04,     // 4% chance during free spins (conservative)
            patternTriggered: true
        },
        'tumble-cascade': {
            type: 'tumble-cascade',
            triggerSymbols: [0, 1, 2, 3, 4, 5, 6, 7, 8], // Any winning symbols
            minSymbolCount: 5,            // Need good wins to trigger (conservative)
            triggerProbability: 0.03,     // 3% chance with wins (conservative)
            patternTriggered: true
        }
    }
};

/**
 * Aggressive Feature Configuration
 * For risk-seekers who want frequent, high-impact features
 */
export const AGGRESSIVE_FEATURE_CONFIG: FeatureTriggerConfig = {
    enableFeatures: true,
    availableFeatures: [
        'free-spins',
        'additional-free-spins',
        'tumble-cascade'
    ],
    baseFrequency: 0.18,              // 18% base chance - aggressive
    patternBoostMultiplier: 3.0,      // 3x boost when pattern requests feature
    featureConfigs: {
        'free-spins': {
            type: 'free-spins',
            triggerSymbols: [9],          // Scatter symbols
            minSymbolCount: 3,
            triggerProbability: 0.12,     // 12% chance when scatters present
            patternTriggered: true
        },
        'additional-free-spins': {
            type: 'additional-free-spins',
            triggerSymbols: [9],          // Scatter symbols during free spins
            minSymbolCount: 2,            // Need 2+ scatters to retrigger
            triggerProbability: 0.10,     // 10% chance during free spins (aggressive)
            patternTriggered: true
        },
        'tumble-cascade': {
            type: 'tumble-cascade',
            triggerSymbols: [0, 1, 2, 3, 4, 5, 6, 7, 8], // Any winning symbols
            minSymbolCount: 3,            // Lower threshold for triggers
            triggerProbability: 0.08,     // 8% chance with wins (aggressive)
            patternTriggered: true
        }
    }
};

/**
 * Explorer Feature Configuration
 * For players who like discovering new features and experiences
 */
export const EXPLORER_FEATURE_CONFIG: FeatureTriggerConfig = {
    enableFeatures: true,
    availableFeatures: [
        'free-spins',
        'additional-free-spins',
        'tumble-cascade'
    ],
    baseFrequency: 0.12,              // 12% base chance - balanced
    patternBoostMultiplier: 2.8,      // High boost for discovery patterns
    featureConfigs: {
        'free-spins': {
            type: 'free-spins',
            triggerSymbols: [9],          // Scatter symbols
            minSymbolCount: 3,
            triggerProbability: 0.08,     // 8% chance when scatters present
            patternTriggered: true
        },
        'additional-free-spins': {
            type: 'additional-free-spins',
            triggerSymbols: [9],          // Scatter symbols during free spins
            minSymbolCount: 2,            // Need 2+ scatters to retrigger
            triggerProbability: 0.07,     // 7% chance during free spins
            patternTriggered: true
        },
        'tumble-cascade': {
            type: 'tumble-cascade',
            triggerSymbols: [0, 1, 2, 3, 4, 5, 6, 7, 8], // Any winning symbols
            minSymbolCount: 4,            // Moderate threshold
            triggerProbability: 0.06,     // 6% chance with wins
            patternTriggered: true
        }
    }
};

/**
 * Tournament Feature Configuration
 * Fair, predictable features for competitive play
 */
export const TOURNAMENT_FEATURE_CONFIG: FeatureTriggerConfig = {
    enableFeatures: true,
    availableFeatures: [
        'free-spins',
        'tumble-cascade'  // No additional free spins for fair play
    ],
    baseFrequency: 0.10,              // 10% base chance - fair
    patternBoostMultiplier: 1.5,      // Minimal boost for fairness
    featureConfigs: {
        'free-spins': {
            type: 'free-spins',
            triggerSymbols: [9],
            minSymbolCount: 3,
            triggerProbability: 0.06,     // Standard chance
            patternTriggered: false       // No pattern influence
        },
        'additional-free-spins': {
            type: 'additional-free-spins',
            triggerSymbols: [9],
            minSymbolCount: 3,            // Harder to retrigger in tournaments
            triggerProbability: 0.03,     // Lower chance for fairness
            patternTriggered: false
        },
        'tumble-cascade': {
            type: 'tumble-cascade',
            triggerSymbols: [0, 1, 2, 3, 4, 5, 6, 7, 8],
            minSymbolCount: 5,            // Standard threshold
            triggerProbability: 0.05,     // Standard chance
            patternTriggered: false
        }
    }
};

/**
 * Balanced Feature Configuration
 * Default balanced approach for general players
 */
export const BALANCED_FEATURE_CONFIG: FeatureTriggerConfig = {
    enableFeatures: true,
    availableFeatures: [
        'free-spins',
        'additional-free-spins',
        'tumble-cascade'
    ],
    baseFrequency: 0.12,              // 12% base chance - balanced
    patternBoostMultiplier: 2.2,      // Moderate boost
    featureConfigs: {
        'free-spins': {
            type: 'free-spins',
            triggerSymbols: [9],
            minSymbolCount: 3,
            triggerProbability: 0.08,     // 8% chance when scatters present
            patternTriggered: true
        },
        'additional-free-spins': {
            type: 'additional-free-spins',
            triggerSymbols: [9],
            minSymbolCount: 2,
            triggerProbability: 0.06,     // 6% chance during free spins
            patternTriggered: true
        },
        'tumble-cascade': {
            type: 'tumble-cascade',
            triggerSymbols: [0, 1, 2, 3, 4, 5, 6, 7, 8],
            minSymbolCount: 4,
            triggerProbability: 0.05,     // 5% chance with wins
            patternTriggered: true
        }
    }
};

/**
 * All available feature configurations
 */
export const FEATURE_CONFIGS: Record<string, FeatureTriggerConfig> = {
    'conservative': CONSERVATIVE_FEATURE_CONFIG,
    'aggressive': AGGRESSIVE_FEATURE_CONFIG,
    'explorer': EXPLORER_FEATURE_CONFIG,
    'tournament': TOURNAMENT_FEATURE_CONFIG,
    'balanced': BALANCED_FEATURE_CONFIG
};

export type FeatureConfigKey = keyof typeof FEATURE_CONFIGS;

/**
 * Get a feature configuration by key
 */
export function getFeatureConfig(key: FeatureConfigKey): FeatureTriggerConfig {
    return FEATURE_CONFIGS[key];
}

/**
 * Get all available feature configuration keys
 */
export function getFeatureConfigKeys(): FeatureConfigKey[] {
    return Object.keys(FEATURE_CONFIGS) as FeatureConfigKey[];
}

/**
 * Create a custom feature configuration based on risk profile and session type
 */
export function createCustomFeatureConfig(options: {
    baseFrequency: number;
    patternBoost: number;
    includeFreeSpins: boolean;
    includeRetrigger: boolean;
    includeTumbles: boolean;
    aggressiveness: 'low' | 'medium' | 'high';
}): FeatureTriggerConfig {
    const features: FeatureType[] = [];
    
    if (options.includeFreeSpins) features.push('free-spins');
    if (options.includeRetrigger) features.push('additional-free-spins');
    if (options.includeTumbles) features.push('tumble-cascade');
    
    // Adjust probabilities based on aggressiveness
    const multipliers = {
        low: 0.7,
        medium: 1.0,
        high: 1.4
    };
    const mult = multipliers[options.aggressiveness];
    
    return {
        enableFeatures: true,
        availableFeatures: features,
        baseFrequency: options.baseFrequency,
        patternBoostMultiplier: options.patternBoost,
        featureConfigs: {
            'free-spins': {
                type: 'free-spins',
                triggerSymbols: [9],
                minSymbolCount: 3,
                triggerProbability: 0.08 * mult,
                patternTriggered: true
            },
            'additional-free-spins': {
                type: 'additional-free-spins',
                triggerSymbols: [9],
                minSymbolCount: options.aggressiveness === 'high' ? 2 : 3,
                triggerProbability: 0.06 * mult,
                patternTriggered: true
            },
            'tumble-cascade': {
                type: 'tumble-cascade',
                triggerSymbols: [0, 1, 2, 3, 4, 5, 6, 7, 8],
                minSymbolCount: options.aggressiveness === 'high' ? 3 : 5,
                triggerProbability: 0.05 * mult,
                patternTriggered: true
            }
        }
    };
}