// Session Configuration Templates
// Pre-defined configurations for different session types and scenarios

import { PatternRTPConfiguration } from "../pattern-state-machine-rtp-controller.js";
import { PLAYER_TYPE_CONFIGS } from "./player-type-configs.js";

/**
 * Quick Session Configuration (15-30 minutes)
 * For players with limited time who want quick entertainment
 */
export const QUICK_SESSION_CONFIG: PatternRTPConfiguration = {
    ...PLAYER_TYPE_CONFIGS.balanced,
    
    // Session-specific overrides
    targetRTP: 1.05,                                // Slightly generous for quick sessions
    boardCount: 40,                                 // Shorter session
    betSize: 1.0,
    playerBudget: 50,
    
    // Fast-paced patterns
    activePatterns: ['wave', 'tease'],              // Quick, engaging patterns
    maxConcurrentPatterns: 1,                       // Simple for quick play
    patternCooldownSpins: 3,                        // Short cooldowns
    
    // Higher feature activity for quick entertainment
    enableFeatureTriggers: true,
    featureTriggerFrequency: 0.35
};

/**
 * Extended Session Configuration (1-2 hours)
 * For players who want longer, more involved gaming sessions
 */
export const EXTENDED_SESSION_CONFIG: PatternRTPConfiguration = {
    ...PLAYER_TYPE_CONFIGS.explorer,
    
    // Session-specific overrides
    targetRTP: 0.975,                               // Good RTP for long sessions
    boardCount: 300,                                // Long session
    betSize: 1.0,
    playerBudget: 300,
    
    // Varied patterns for long sessions
    activePatterns: ['discovery', 'comeback', 'wave', 'cliffhanger'],
    maxConcurrentPatterns: 2,                       // Allow pattern variety
    patternCooldownSpins: 8,                        // Longer cooldowns to prevent fatigue
    
    // Moderate features to pace the session
    enableFeatureTriggers: true,
    featureTriggerFrequency: 0.25
};

/**
 * Lunch Break Session Configuration (5-15 minutes)
 * For very quick gaming sessions during breaks
 */
export const LUNCH_BREAK_CONFIG: PatternRTPConfiguration = {
    ...PLAYER_TYPE_CONFIGS.balanced,
    
    // Session-specific overrides
    targetRTP: 1.1,                                 // Generous for very short sessions
    boardCount: 20,                                 // Very short
    betSize: 0.5,                                   // Lower stakes for quick play
    playerBudget: 15,
    
    // Fast, simple patterns
    activePatterns: ['wave'],                       // Single, predictable pattern
    maxConcurrentPatterns: 1,
    patternCooldownSpins: 1,                        // Very short cooldowns
    
    // High feature activity for quick excitement
    enableFeatureTriggers: true,
    featureTriggerFrequency: 0.5                    // High for quick entertainment
};

/**
 * Weekend Gaming Session Configuration (2+ hours)
 * For dedicated weekend gaming sessions
 */
export const WEEKEND_SESSION_CONFIG: PatternRTPConfiguration = {
    ...PLAYER_TYPE_CONFIGS.explorer,
    
    // Session-specific overrides
    targetRTP: 0.97,                                // Standard RTP for long sessions
    boardCount: 500,                                // Very long session
    betSize: 1.0,
    playerBudget: 500,
    
    // All patterns for maximum variety
    activePatterns: ['comeback', 'cliffhanger', 'discovery', 'tease', 'wave'],
    maxConcurrentPatterns: 3,                       // High variety
    patternCooldownSpins: 10,                       // Longer cooldowns for pacing
    
    // Moderate features spread over long session
    enableFeatureTriggers: true,
    featureTriggerFrequency: 0.20
};

/**
 * Mobile Gaming Session Configuration
 * Optimized for mobile/touch gaming with shorter attention spans
 */
export const MOBILE_SESSION_CONFIG: PatternRTPConfiguration = {
    ...PLAYER_TYPE_CONFIGS.balanced,
    
    // Session-specific overrides
    targetRTP: 1.02,                                // Slightly generous for mobile
    boardCount: 60,                                 // Medium length
    betSize: 0.5,                                   // Lower stakes for mobile
    playerBudget: 40,
    
    // Mobile-friendly patterns
    activePatterns: ['wave', 'tease'],              // Simple, engaging patterns
    maxConcurrentPatterns: 1,                       // Simple for mobile
    patternCooldownSpins: 4,                        // Moderate cooldowns
    
    // Frequent features for mobile engagement
    enableFeatureTriggers: true,
    featureTriggerFrequency: 0.40
};

/**
 * Social Gaming Session Configuration
 * For players in social/multiplayer contexts
 */
export const SOCIAL_SESSION_CONFIG: PatternRTPConfiguration = {
    ...PLAYER_TYPE_CONFIGS.balanced,
    
    // Session-specific overrides
    targetRTP: 0.98,                                // Fair for social play
    boardCount: 100,                                // Medium session
    betSize: 1.0,
    playerBudget: 100,
    
    // Exciting patterns for social sharing
    activePatterns: ['cliffhanger', 'discovery', 'wave'],
    maxConcurrentPatterns: 2,
    patternCooldownSpins: 5,
    
    // High features for exciting moments to share
    enableFeatureTriggers: true,
    featureTriggerFrequency: 0.35
};

/**
 * Relaxation Session Configuration
 * For players who want calm, stress-free gaming
 */
export const RELAXATION_SESSION_CONFIG: PatternRTPConfiguration = {
    ...PLAYER_TYPE_CONFIGS['loss-averse'],
    
    // Session-specific overrides
    targetRTP: 1.05,                                // Generous for relaxation
    boardCount: 80,                                 // Medium session
    betSize: 0.5,                                   // Low stakes for relaxation
    playerBudget: 50,
    
    // Calm, predictable patterns
    activePatterns: ['wave', 'comeback'],           // Soothing patterns
    maxConcurrentPatterns: 1,                       // Simple, non-stressful
    patternCooldownSpins: 8,                        // Longer cooldowns for calm pacing
    
    // Lower feature activity for calm experience
    enableFeatureTriggers: true,
    featureTriggerFrequency: 0.20
};

/**
 * Excitement Session Configuration
 * For players seeking high-energy, thrilling gaming
 */
export const EXCITEMENT_SESSION_CONFIG: PatternRTPConfiguration = {
    ...PLAYER_TYPE_CONFIGS['risk-seeker'],
    
    // Session-specific overrides
    targetRTP: 0.95,                                // Lower RTP for higher volatility
    boardCount: 80,                                 // Medium session
    betSize: 2.0,                                   // Higher stakes for excitement
    playerBudget: 200,
    
    // High-energy patterns
    activePatterns: ['cliffhanger', 'tease'],       // Maximum suspense
    maxConcurrentPatterns: 2,                       // Overlapping excitement
    patternCooldownSpins: 2,                        // Very short cooldowns
    
    // High feature activity for thrills
    enableFeatureTriggers: true,
    featureTriggerFrequency: 0.45
};

/**
 * Learning Session Configuration
 * For new players learning the game mechanics
 */
export const LEARNING_SESSION_CONFIG: PatternRTPConfiguration = {
    ...PLAYER_TYPE_CONFIGS['loss-averse'],
    
    // Session-specific overrides
    targetRTP: 1.15,                                // Very generous for learning
    tolerance: 0.05,                                // More lenient
    boardCount: 50,                                 // Medium learning session
    betSize: 0.25,                                  // Very low stakes for learning
    playerBudget: 20,
    
    // Simple, educational patterns
    activePatterns: ['wave'],                       // Single, predictable pattern
    maxConcurrentPatterns: 1,
    patternCooldownSpins: 6,
    
    // Moderate features to learn about them
    enableFeatureTriggers: true,
    featureTriggerFrequency: 0.25
};

/**
 * VIP Session Configuration
 * For high-value players expecting premium treatment
 */
export const VIP_SESSION_CONFIG: PatternRTPConfiguration = {
    ...PLAYER_TYPE_CONFIGS['high-stakes'],
    
    // Session-specific overrides
    targetRTP: 0.99,                                // Very high RTP for VIP
    tolerance: 0.005,                               // Very tight control
    boardCount: 200,                                // Long VIP session
    betSize: 10.0,                                  // High stakes
    playerBudget: 2000,
    
    // Premium patterns
    activePatterns: ['discovery', 'wave'],          // Quality over excitement
    maxConcurrentPatterns: 1,                       // Single, high-quality pattern
    patternCooldownSpins: 12,                       // Premium pacing
    
    // Premium feature experience
    enableFeatureTriggers: true,
    featureTriggerFrequency: 0.4                    // High-quality features
};

/**
 * Session Configuration Registry
 * Easy lookup for different session types
 */
export const SESSION_CONFIGS = {
    'quick': QUICK_SESSION_CONFIG,
    'extended': EXTENDED_SESSION_CONFIG,
    'lunch-break': LUNCH_BREAK_CONFIG,
    'weekend': WEEKEND_SESSION_CONFIG,
    'mobile': MOBILE_SESSION_CONFIG,
    'social': SOCIAL_SESSION_CONFIG,
    'relaxation': RELAXATION_SESSION_CONFIG,
    'excitement': EXCITEMENT_SESSION_CONFIG,
    'learning': LEARNING_SESSION_CONFIG,
    'vip': VIP_SESSION_CONFIG
} as const;

export type SessionConfigKey = keyof typeof SESSION_CONFIGS;

/**
 * Helper function to get session config with player type overlay
 */
export function getSessionConfig(
    sessionType: SessionConfigKey,
    playerTypeOverrides?: Partial<PatternRTPConfiguration>
): PatternRTPConfiguration {
    const baseConfig = SESSION_CONFIGS[sessionType];
    
    if (!playerTypeOverrides) {
        return baseConfig;
    }
    
    return {
        ...baseConfig,
        ...playerTypeOverrides
    };
}

/**
 * Helper function to create adaptive session config based on time available
 */
export function createTimeBasedSessionConfig(
    availableMinutes: number,
    playerRiskProfile: 'low' | 'medium' | 'high' = 'medium'
): PatternRTPConfiguration {
    let baseConfig: PatternRTPConfiguration;
    
    if (availableMinutes <= 10) {
        baseConfig = LUNCH_BREAK_CONFIG;
    } else if (availableMinutes <= 30) {
        baseConfig = QUICK_SESSION_CONFIG;
    } else if (availableMinutes <= 90) {
        baseConfig = EXTENDED_SESSION_CONFIG;
    } else {
        baseConfig = WEEKEND_SESSION_CONFIG;
    }
    
    // Adjust based on risk profile
    const riskAdjustments: Record<string, Partial<PatternRTPConfiguration>> = {
        'low': {
            playerRiskProfile: 'loss-averse',
            patternPriority: 'rtp-first',
            tolerance: 0.015,
            featureTriggerFrequency: baseConfig.featureTriggerFrequency! * 0.8
        },
        'medium': {
            playerRiskProfile: 'mixed',
            patternPriority: 'balanced'
        },
        'high': {
            playerRiskProfile: 'risk-seeker',
            patternPriority: 'pattern-first',
            tolerance: 0.04,
            featureTriggerFrequency: baseConfig.featureTriggerFrequency! * 1.3
        }
    };
    
    return {
        ...baseConfig,
        ...riskAdjustments[playerRiskProfile]
    };
}
