// Session Configuration Templates
// Pre-defined configurations for different session types and scenarios
import { PLAYER_TYPE_CONFIGS } from "./player-type-configs.js";
/**
 * Quick Session Configuration (15-30 minutes)
 * For players with limited time who want quick entertainment
 */
export const QUICK_SESSION_CONFIG = {
    ...PLAYER_TYPE_CONFIGS.balanced,
    // Session-specific overrides
    targetRTP: 1.05,
    boardCount: 40,
    betSize: 1.0,
    playerBudget: 50,
    // Fast-paced patterns
    activePatterns: ['wave', 'tease'],
    maxConcurrentPatterns: 1,
    patternCooldownSpins: 3,
    // Higher feature activity for quick entertainment
    enableFeatureTriggers: true,
    featureTriggerFrequency: 0.35
};
/**
 * Extended Session Configuration (1-2 hours)
 * For players who want longer, more involved gaming sessions
 */
export const EXTENDED_SESSION_CONFIG = {
    ...PLAYER_TYPE_CONFIGS.explorer,
    // Session-specific overrides
    targetRTP: 0.975,
    boardCount: 300,
    betSize: 1.0,
    playerBudget: 300,
    // Varied patterns for long sessions
    activePatterns: ['discovery', 'comeback', 'wave', 'cliffhanger'],
    maxConcurrentPatterns: 2,
    patternCooldownSpins: 8,
    // Moderate features to pace the session
    enableFeatureTriggers: true,
    featureTriggerFrequency: 0.25
};
/**
 * Lunch Break Session Configuration (5-15 minutes)
 * For very quick gaming sessions during breaks
 */
export const LUNCH_BREAK_CONFIG = {
    ...PLAYER_TYPE_CONFIGS.balanced,
    // Session-specific overrides
    targetRTP: 1.1,
    boardCount: 20,
    betSize: 0.5,
    playerBudget: 15,
    // Fast, simple patterns
    activePatterns: ['wave'],
    maxConcurrentPatterns: 1,
    patternCooldownSpins: 1,
    // High feature activity for quick excitement
    enableFeatureTriggers: true,
    featureTriggerFrequency: 0.5 // High for quick entertainment
};
/**
 * Weekend Gaming Session Configuration (2+ hours)
 * For dedicated weekend gaming sessions
 */
export const WEEKEND_SESSION_CONFIG = {
    ...PLAYER_TYPE_CONFIGS.explorer,
    // Session-specific overrides
    targetRTP: 0.97,
    boardCount: 500,
    betSize: 1.0,
    playerBudget: 500,
    // All patterns for maximum variety
    activePatterns: ['comeback', 'cliffhanger', 'discovery', 'tease', 'wave'],
    maxConcurrentPatterns: 3,
    patternCooldownSpins: 10,
    // Moderate features spread over long session
    enableFeatureTriggers: true,
    featureTriggerFrequency: 0.20
};
/**
 * Mobile Gaming Session Configuration
 * Optimized for mobile/touch gaming with shorter attention spans
 */
export const MOBILE_SESSION_CONFIG = {
    ...PLAYER_TYPE_CONFIGS.balanced,
    // Session-specific overrides
    targetRTP: 1.02,
    boardCount: 60,
    betSize: 0.5,
    playerBudget: 40,
    // Mobile-friendly patterns
    activePatterns: ['wave', 'tease'],
    maxConcurrentPatterns: 1,
    patternCooldownSpins: 4,
    // Frequent features for mobile engagement
    enableFeatureTriggers: true,
    featureTriggerFrequency: 0.40
};
/**
 * Social Gaming Session Configuration
 * For players in social/multiplayer contexts
 */
export const SOCIAL_SESSION_CONFIG = {
    ...PLAYER_TYPE_CONFIGS.balanced,
    // Session-specific overrides
    targetRTP: 0.98,
    boardCount: 100,
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
export const RELAXATION_SESSION_CONFIG = {
    ...PLAYER_TYPE_CONFIGS['loss-averse'],
    // Session-specific overrides
    targetRTP: 1.05,
    boardCount: 80,
    betSize: 0.5,
    playerBudget: 50,
    // Calm, predictable patterns
    activePatterns: ['wave', 'comeback'],
    maxConcurrentPatterns: 1,
    patternCooldownSpins: 8,
    // Lower feature activity for calm experience
    enableFeatureTriggers: true,
    featureTriggerFrequency: 0.20
};
/**
 * Excitement Session Configuration
 * For players seeking high-energy, thrilling gaming
 */
export const EXCITEMENT_SESSION_CONFIG = {
    ...PLAYER_TYPE_CONFIGS['risk-seeker'],
    // Session-specific overrides
    targetRTP: 0.95,
    boardCount: 80,
    betSize: 2.0,
    playerBudget: 200,
    // High-energy patterns
    activePatterns: ['cliffhanger', 'tease'],
    maxConcurrentPatterns: 2,
    patternCooldownSpins: 2,
    // High feature activity for thrills
    enableFeatureTriggers: true,
    featureTriggerFrequency: 0.45
};
/**
 * Learning Session Configuration
 * For new players learning the game mechanics
 */
export const LEARNING_SESSION_CONFIG = {
    ...PLAYER_TYPE_CONFIGS['loss-averse'],
    // Session-specific overrides
    targetRTP: 1.15,
    tolerance: 0.05,
    boardCount: 50,
    betSize: 0.25,
    playerBudget: 20,
    // Simple, educational patterns
    activePatterns: ['wave'],
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
export const VIP_SESSION_CONFIG = {
    ...PLAYER_TYPE_CONFIGS['high-stakes'],
    // Session-specific overrides
    targetRTP: 0.99,
    tolerance: 0.005,
    boardCount: 200,
    betSize: 10.0,
    playerBudget: 2000,
    // Premium patterns
    activePatterns: ['discovery', 'wave'],
    maxConcurrentPatterns: 1,
    patternCooldownSpins: 12,
    // Premium feature experience
    enableFeatureTriggers: true,
    featureTriggerFrequency: 0.4 // High-quality features
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
};
/**
 * Helper function to get session config with player type overlay
 */
export function getSessionConfig(sessionType, playerTypeOverrides) {
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
export function createTimeBasedSessionConfig(availableMinutes, playerRiskProfile = 'medium') {
    let baseConfig;
    if (availableMinutes <= 10) {
        baseConfig = LUNCH_BREAK_CONFIG;
    }
    else if (availableMinutes <= 30) {
        baseConfig = QUICK_SESSION_CONFIG;
    }
    else if (availableMinutes <= 90) {
        baseConfig = EXTENDED_SESSION_CONFIG;
    }
    else {
        baseConfig = WEEKEND_SESSION_CONFIG;
    }
    // Adjust based on risk profile
    const riskAdjustments = {
        'low': {
            playerRiskProfile: 'loss-averse',
            patternPriority: 'rtp-first',
            tolerance: 0.015,
            featureTriggerFrequency: baseConfig.featureTriggerFrequency * 0.8
        },
        'medium': {
            playerRiskProfile: 'mixed',
            patternPriority: 'balanced'
        },
        'high': {
            playerRiskProfile: 'risk-seeker',
            patternPriority: 'pattern-first',
            tolerance: 0.04,
            featureTriggerFrequency: baseConfig.featureTriggerFrequency * 1.3
        }
    };
    return {
        ...baseConfig,
        ...riskAdjustments[playerRiskProfile]
    };
}
