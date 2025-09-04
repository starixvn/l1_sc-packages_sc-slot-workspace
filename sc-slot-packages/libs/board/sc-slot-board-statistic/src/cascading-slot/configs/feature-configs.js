// Feature Trigger Configurations
// Defines how different bonus features behave and trigger
// ONLY INCLUDES ACTUAL FEATURES AVAILABLE IN THE SLOT SYSTEM
/**
 * Conservative Feature Configuration
 * For loss-averse players who prefer predictable, safe features
 */
export const CONSERVATIVE_FEATURE_CONFIG = {
    enableFeatures: true,
    availableFeatures: [
        'free-spins',
        'tumble-cascade'
    ],
    baseFrequency: 0.08,
    patternBoostMultiplier: 2.0,
    featureConfigs: {
        'free-spins': {
            type: 'free-spins',
            triggerSymbols: [9],
            minSymbolCount: 3,
            triggerProbability: 0.05,
            patternTriggered: true
        },
        'additional-free-spins': {
            type: 'additional-free-spins',
            triggerSymbols: [9],
            minSymbolCount: 2,
            triggerProbability: 0.04,
            patternTriggered: true
        },
        'tumble-cascade': {
            type: 'tumble-cascade',
            triggerSymbols: [0, 1, 2, 3, 4, 5, 6, 7, 8],
            minSymbolCount: 5,
            triggerProbability: 0.03,
            patternTriggered: true
        }
    }
};
/**
 * Aggressive Feature Configuration
 * For risk-seekers who want frequent, high-impact features
 */
export const AGGRESSIVE_FEATURE_CONFIG = {
    enableFeatures: true,
    availableFeatures: [
        'free-spins',
        'additional-free-spins',
        'tumble-cascade'
    ],
    baseFrequency: 0.18,
    patternBoostMultiplier: 3.0,
    featureConfigs: {
        'free-spins': {
            type: 'free-spins',
            triggerSymbols: [9],
            minSymbolCount: 3,
            triggerProbability: 0.12,
            patternTriggered: true
        },
        'additional-free-spins': {
            type: 'additional-free-spins',
            triggerSymbols: [9],
            minSymbolCount: 2,
            triggerProbability: 0.10,
            patternTriggered: true
        },
        'tumble-cascade': {
            type: 'tumble-cascade',
            triggerSymbols: [0, 1, 2, 3, 4, 5, 6, 7, 8],
            minSymbolCount: 3,
            triggerProbability: 0.08,
            patternTriggered: true
        }
    }
};
/**
 * Explorer Feature Configuration
 * For players who like discovering new features and experiences
 */
export const EXPLORER_FEATURE_CONFIG = {
    enableFeatures: true,
    availableFeatures: [
        'free-spins',
        'additional-free-spins',
        'tumble-cascade'
    ],
    baseFrequency: 0.12,
    patternBoostMultiplier: 2.8,
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
            triggerProbability: 0.07,
            patternTriggered: true
        },
        'tumble-cascade': {
            type: 'tumble-cascade',
            triggerSymbols: [0, 1, 2, 3, 4, 5, 6, 7, 8],
            minSymbolCount: 4,
            triggerProbability: 0.06,
            patternTriggered: true
        }
    }
};
/**
 * Tournament Feature Configuration
 * Fair, predictable features for competitive play
 */
export const TOURNAMENT_FEATURE_CONFIG = {
    enableFeatures: true,
    availableFeatures: [
        'free-spins',
        'tumble-cascade' // No additional free spins for fair play
    ],
    baseFrequency: 0.10,
    patternBoostMultiplier: 1.5,
    featureConfigs: {
        'free-spins': {
            type: 'free-spins',
            triggerSymbols: [9],
            minSymbolCount: 3,
            triggerProbability: 0.06,
            patternTriggered: false // No pattern influence
        },
        'additional-free-spins': {
            type: 'additional-free-spins',
            triggerSymbols: [9],
            minSymbolCount: 3,
            triggerProbability: 0.03,
            patternTriggered: false
        },
        'tumble-cascade': {
            type: 'tumble-cascade',
            triggerSymbols: [0, 1, 2, 3, 4, 5, 6, 7, 8],
            minSymbolCount: 5,
            triggerProbability: 0.05,
            patternTriggered: false
        }
    }
};
/**
 * Balanced Feature Configuration
 * Default balanced approach for general players
 */
export const BALANCED_FEATURE_CONFIG = {
    enableFeatures: true,
    availableFeatures: [
        'free-spins',
        'additional-free-spins',
        'tumble-cascade'
    ],
    baseFrequency: 0.12,
    patternBoostMultiplier: 2.2,
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
/**
 * All available feature configurations
 */
export const FEATURE_CONFIGS = {
    'conservative': CONSERVATIVE_FEATURE_CONFIG,
    'aggressive': AGGRESSIVE_FEATURE_CONFIG,
    'explorer': EXPLORER_FEATURE_CONFIG,
    'tournament': TOURNAMENT_FEATURE_CONFIG,
    'balanced': BALANCED_FEATURE_CONFIG
};
/**
 * Get a feature configuration by key
 */
export function getFeatureConfig(key) {
    return FEATURE_CONFIGS[key];
}
/**
 * Get all available feature configuration keys
 */
export function getFeatureConfigKeys() {
    return Object.keys(FEATURE_CONFIGS);
}
/**
 * Create a custom feature configuration based on risk profile and session type
 */
export function createCustomFeatureConfig(options) {
    const features = [];
    if (options.includeFreeSpins)
        features.push('free-spins');
    if (options.includeRetrigger)
        features.push('additional-free-spins');
    if (options.includeTumbles)
        features.push('tumble-cascade');
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
