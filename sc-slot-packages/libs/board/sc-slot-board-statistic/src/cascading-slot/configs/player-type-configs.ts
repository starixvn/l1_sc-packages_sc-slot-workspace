// Player Type Configurations
// Pre-defined configurations for different player behavioral profiles

import { PatternRTPConfiguration } from "../pattern-state-machine-rtp-controller.js";

/**
 * Configuration for Loss-Averse Players
 * Focus: Recovery patterns, reassurance, lower volatility
 * Behavioral traits: Risk-averse, need emotional safety net, prefer gradual wins
 */
export const LOSS_AVERSE_PLAYER_CONFIG: PatternRTPConfiguration = {
    // Base RTP settings - Conservative approach
    targetRTP: 0.97,
    tolerance: 0.02,                                // Tight RTP control
    boardCount: 120,
    betSize: 1.0,
    playerBudget: 100,

    // Pattern-specific settings
    enablePatterns: true,
    activePatterns: ['comeback', 'wave'],           // Recovery-focused patterns
    playerRiskProfile: 'loss-averse',
    patternPriority: 'rtp-first',                   // RTP safety takes priority
    maxConcurrentPatterns: 1,                       // Simple, single pattern at a time
    patternCooldownSpins: 5,                        // Short cooldown for quick recovery

    // Conservative near-miss settings
    enableNearMiss: true,
    nearMissFrequency: 0.3,                         // Moderate near-miss frequency

    // Conservative feature settings
    enableFeatureTriggers: true,
    featureTriggerFrequency: 0.15                   // Conservative feature triggers
};

/**
 * Configuration for Risk-Seeking Players  
 * Focus: High volatility, dramatic swings, excitement
 * Behavioral traits: Thrill-seekers, enjoy suspense, chase big wins
 */
export const RISK_SEEKER_CONFIG: PatternRTPConfiguration = {
    // Base RTP settings - Allow higher volatility
    targetRTP: 0.96,                                // Slightly lower RTP for higher volatility
    tolerance: 0.05,                                // Higher tolerance for dramatic swings
    boardCount: 100,
    betSize: 2.0,
    playerBudget: 200,

    // Pattern-specific settings
    enablePatterns: true,
    activePatterns: ['cliffhanger', 'tease'],       // High suspense patterns
    playerRiskProfile: 'risk-seeker',
    patternPriority: 'pattern-first',               // Patterns take priority for excitement
    maxConcurrentPatterns: 2,                       // Allow overlapping patterns
    patternCooldownSpins: 3,                        // Shorter cooldown for more action

    // Aggressive near-miss settings
    enableNearMiss: true,
    nearMissFrequency: 0.6,                         // High near-miss frequency for tension

    // High feature activity
    enableFeatureTriggers: true,
    featureTriggerFrequency: 0.25                   // Frequent feature triggers
};

/**
 * Configuration for Explorer Players
 * Focus: Discovery, features, curiosity rewards
 * Behavioral traits: High curiosity, enjoy variety, patient with exploration
 */
export const EXPLORER_CONFIG: PatternRTPConfiguration = {
    // Base RTP settings - Reward exploration
    targetRTP: 0.975,                               // Higher RTP to reward exploration
    tolerance: 0.03,
    boardCount: 150,                                // Longer sessions for exploration
    betSize: 1.0,
    playerBudget: 150,

    // Pattern-specific settings
    enablePatterns: true,
    activePatterns: ['discovery', 'wave', 'tease'], // Exploration and discovery focus
    playerRiskProfile: 'explorer',
    patternPriority: 'balanced',                    // Balance patterns with RTP
    maxConcurrentPatterns: 2,                       // Multiple patterns for variety
    patternCooldownSpins: 8,                        // Longer cooldown to build curiosity

    // Moderate near-miss settings
    enableNearMiss: true,
    nearMissFrequency: 0.4,

    // High feature activity for exploration
    enableFeatureTriggers: true,
    featureTriggerFrequency: 0.35                   // High feature frequency for discovery
};

/**
 * Configuration for Streak Hunters
 * Focus: Pattern recognition, consecutive wins/losses
 * Behavioral traits: Look for patterns, enjoy predictable sequences
 */
export const STREAK_HUNTER_CONFIG: PatternRTPConfiguration = {
    // Base RTP settings
    targetRTP: 0.965,
    tolerance: 0.04,
    boardCount: 80,                                 // Shorter sessions focused on streaks
    betSize: 1.5,
    playerBudget: 120,

    // Pattern-specific settings
    enablePatterns: true,
    activePatterns: ['tease', 'cliffhanger'],       // Patterns that create recognizable streaks
    playerRiskProfile: 'streak-hunter',
    patternPriority: 'pattern-first',               // Prioritize clear pattern execution
    maxConcurrentPatterns: 1,                       // Single pattern for clear streaks
    patternCooldownSpins: 2,                        // Very short cooldown for rapid patterns

    // High near-miss for pattern recognition
    enableNearMiss: true,
    nearMissFrequency: 0.7,                         // Very high for streak recognition

    // Moderate features
    enableFeatureTriggers: true,
    featureTriggerFrequency: 0.2
};

/**
 * Configuration for Mixed/Balanced Players
 * Focus: Balanced experience across all pattern types
 * Behavioral traits: Enjoy variety, moderate risk tolerance
 */
export const BALANCED_PLAYER_CONFIG: PatternRTPConfiguration = {
    // Base RTP settings
    targetRTP: 0.97,
    tolerance: 0.025,
    boardCount: 120,
    betSize: 1.0,
    playerBudget: 120,

    // Pattern-specific settings
    enablePatterns: true,
    activePatterns: ['comeback', 'discovery', 'wave'], // Balanced mix
    playerRiskProfile: 'mixed',
    patternPriority: 'balanced',                    // Balanced approach
    maxConcurrentPatterns: 2,                       // Allow some variety
    patternCooldownSpins: 6,                        // Moderate cooldown

    // Balanced settings
    enableNearMiss: true,
    nearMissFrequency: 0.4,

    enableFeatureTriggers: true,
    featureTriggerFrequency: 0.25
};

/**
 * Configuration for High-Stakes Players
 * Focus: Premium experience, higher RTP, quality over quantity
 * Behavioral traits: High budget, expect quality, lower frequency but higher value
 */
export const HIGH_STAKES_CONFIG: PatternRTPConfiguration = {
    // Base RTP settings - Premium experience
    targetRTP: 0.985,                               // Very high RTP for high stakes
    tolerance: 0.01,                                // Very tight control
    boardCount: 60,                                 // Shorter, premium sessions
    betSize: 10.0,                                  // High bet size
    playerBudget: 600,

    // Pattern-specific settings
    enablePatterns: true,
    activePatterns: ['wave', 'discovery'],          // Quality, smooth patterns
    playerRiskProfile: 'mixed',
    patternPriority: 'rtp-first',                   // RTP accuracy critical
    maxConcurrentPatterns: 1,                       // Single, high-quality pattern
    patternCooldownSpins: 10,                       // Longer cooldowns for premium feel

    // Premium settings
    enableNearMiss: true,
    nearMissFrequency: 0.2,                         // Lower frequency, higher quality

    enableFeatureTriggers: true,
    featureTriggerFrequency: 0.4                    // High feature frequency for premium feel
};

/**
 * Configuration for Tournament/Competitive Play
 * Focus: Fairness, predictability, skill-based elements
 * Behavioral traits: Competitive, fair play expectations
 */
export const TOURNAMENT_CONFIG: PatternRTPConfiguration = {
    // Base RTP settings - Strict fairness
    targetRTP: 0.98,                                // High RTP for fairness
    tolerance: 0.01,                                // Strict tolerance
    boardCount: 200,                                // Longer tournament sessions
    betSize: 1.0,
    playerBudget: 200,
    
    // Pattern-specific settings
    enablePatterns: true,
    activePatterns: ['wave'],                       // Predictable, fair pattern
    playerRiskProfile: 'mixed',
    patternPriority: 'rtp-first',                   // RTP accuracy is critical
    maxConcurrentPatterns: 1,
    patternCooldownSpins: 10,                       // Longer cooldowns for fairness
    
    // Fair competition settings
    enableNearMiss: false,                          // Disable for competitive fairness
    enableFeatureTriggers: true,
    featureTriggerFrequency: 0.15                   // Conservative features
};

/**
 * Configuration for Development/Testing
 * Focus: Quick testing of all patterns and features
 * Behavioral traits: Developer/tester needs
 */
export const DEVELOPMENT_CONFIG: PatternRTPConfiguration = {
    // Base RTP settings - Lenient for testing
    targetRTP: 0.5,                                 // Lower RTP for faster testing
    tolerance: 0.2,                                 // Very lenient for testing
    boardCount: 25,                                 // Short sessions
    betSize: 1.0,
    playerBudget: 50,

    // Pattern-specific settings - Test everything
    enablePatterns: true,
    activePatterns: ['comeback', 'cliffhanger', 'discovery', 'tease', 'wave'], // All patterns
    playerRiskProfile: 'mixed',
    patternPriority: 'pattern-first',               // Pattern testing takes priority
    maxConcurrentPatterns: 3,                       // Allow multiple overlapping patterns
    patternCooldownSpins: 1,                        // Minimal cooldown for rapid testing

    // High activity for testing
    enableNearMiss: true,
    nearMissFrequency: 0.8,                         // Very high for testing

    enableFeatureTriggers: true,
    featureTriggerFrequency: 0.4                    // High feature activity for testing
};

/**
 * Configuration for Demo/Showcase
 * Focus: Impressive demonstrations, high entertainment value
 * Behavioral traits: Viewers/demo audiences
 */
export const DEMO_SHOWCASE_CONFIG: PatternRTPConfiguration = {
    // Base RTP settings - Entertaining
    targetRTP: 1.2,                                 // Above 100% for impressive demos
    tolerance: 0.1,                                 // Allow for showmanship
    boardCount: 30,                                 // Short, impressive sessions
    betSize: 1.0,
    playerBudget: 100,

    // Pattern-specific settings - Maximum entertainment
    enablePatterns: true,
    activePatterns: ['cliffhanger', 'discovery', 'tease'], // Most exciting patterns
    playerRiskProfile: 'risk-seeker',
    patternPriority: 'pattern-first',               // Entertainment over accuracy
    maxConcurrentPatterns: 2,                       // Multiple patterns for variety
    patternCooldownSpins: 2,                        // Quick succession for demo

    // High entertainment settings
    enableNearMiss: true,
    nearMissFrequency: 0.5,

    enableFeatureTriggers: true,
    featureTriggerFrequency: 0.6                    // Very high feature frequency for show
};

/**
 * Player Type Configuration Registry
 * Easy lookup for different player configurations
 */
export const PLAYER_TYPE_CONFIGS = {
    'loss-averse': LOSS_AVERSE_PLAYER_CONFIG,
    'risk-seeker': RISK_SEEKER_CONFIG,
    'explorer': EXPLORER_CONFIG,
    'streak-hunter': STREAK_HUNTER_CONFIG,
    'balanced': BALANCED_PLAYER_CONFIG,
    'high-stakes': HIGH_STAKES_CONFIG,
    'tournament': TOURNAMENT_CONFIG,
    'development': DEVELOPMENT_CONFIG,
    'demo': DEMO_SHOWCASE_CONFIG
} as const;

export type PlayerTypeKey = keyof typeof PLAYER_TYPE_CONFIGS;
