// Player Type Configurations
// Pre-defined configurations for different player behavioral profiles
/**
 * Configuration for Loss-Averse Players
 * Focus: Recovery patterns, reassurance, lower volatility
 * Behavioral traits: Risk-averse, need emotional safety net, prefer gradual wins
 */
export const LOSS_AVERSE_PLAYER_CONFIG = {
    // Base RTP settings - Conservative approach
    targetRTP: 0.97,
    tolerance: 0.02,
    boardCount: 120,
    betSize: 1.0,
    playerBudget: 100,
    // Pattern-specific settings
    enablePatterns: true,
    activePatterns: ['comeback', 'wave'],
    playerRiskProfile: 'loss-averse',
    patternPriority: 'rtp-first',
    maxConcurrentPatterns: 1,
    patternCooldownSpins: 5,
    // Conservative near-miss settings
    enableNearMiss: true,
    nearMissFrequency: 0.3,
    // Conservative feature settings
    enableFeatureTriggers: true,
    featureTriggerFrequency: 0.15 // Conservative feature triggers
};
/**
 * Configuration for Risk-Seeking Players
 * Focus: High volatility, dramatic swings, excitement
 * Behavioral traits: Thrill-seekers, enjoy suspense, chase big wins
 */
export const RISK_SEEKER_CONFIG = {
    // Base RTP settings - Allow higher volatility
    targetRTP: 0.96,
    tolerance: 0.05,
    boardCount: 100,
    betSize: 2.0,
    playerBudget: 200,
    // Pattern-specific settings
    enablePatterns: true,
    activePatterns: ['cliffhanger', 'tease'],
    playerRiskProfile: 'risk-seeker',
    patternPriority: 'pattern-first',
    maxConcurrentPatterns: 2,
    patternCooldownSpins: 3,
    // Aggressive near-miss settings
    enableNearMiss: true,
    nearMissFrequency: 0.6,
    // High feature activity
    enableFeatureTriggers: true,
    featureTriggerFrequency: 0.25 // Frequent feature triggers
};
/**
 * Configuration for Explorer Players
 * Focus: Discovery, features, curiosity rewards
 * Behavioral traits: High curiosity, enjoy variety, patient with exploration
 */
export const EXPLORER_CONFIG = {
    // Base RTP settings - Reward exploration
    targetRTP: 0.975,
    tolerance: 0.03,
    boardCount: 150,
    betSize: 1.0,
    playerBudget: 150,
    // Pattern-specific settings
    enablePatterns: true,
    activePatterns: ['discovery', 'wave', 'tease'],
    playerRiskProfile: 'explorer',
    patternPriority: 'balanced',
    maxConcurrentPatterns: 2,
    patternCooldownSpins: 8,
    // Moderate near-miss settings
    enableNearMiss: true,
    nearMissFrequency: 0.4,
    // High feature activity for exploration
    enableFeatureTriggers: true,
    featureTriggerFrequency: 0.35 // High feature frequency for discovery
};
/**
 * Configuration for Streak Hunters
 * Focus: Pattern recognition, consecutive wins/losses
 * Behavioral traits: Look for patterns, enjoy predictable sequences
 */
export const STREAK_HUNTER_CONFIG = {
    // Base RTP settings
    targetRTP: 0.965,
    tolerance: 0.04,
    boardCount: 80,
    betSize: 1.5,
    playerBudget: 120,
    // Pattern-specific settings
    enablePatterns: true,
    activePatterns: ['tease', 'cliffhanger'],
    playerRiskProfile: 'streak-hunter',
    patternPriority: 'pattern-first',
    maxConcurrentPatterns: 1,
    patternCooldownSpins: 2,
    // High near-miss for pattern recognition
    enableNearMiss: true,
    nearMissFrequency: 0.7,
    // Moderate features
    enableFeatureTriggers: true,
    featureTriggerFrequency: 0.2
};
/**
 * Configuration for Mixed/Balanced Players
 * Focus: Balanced experience across all pattern types
 * Behavioral traits: Enjoy variety, moderate risk tolerance
 */
export const BALANCED_PLAYER_CONFIG = {
    // Base RTP settings
    targetRTP: 0.97,
    tolerance: 0.025,
    boardCount: 120,
    betSize: 1.0,
    playerBudget: 120,
    // Pattern-specific settings
    enablePatterns: true,
    activePatterns: ['comeback', 'discovery', 'wave'],
    playerRiskProfile: 'mixed',
    patternPriority: 'balanced',
    maxConcurrentPatterns: 2,
    patternCooldownSpins: 6,
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
export const HIGH_STAKES_CONFIG = {
    // Base RTP settings - Premium experience
    targetRTP: 0.985,
    tolerance: 0.01,
    boardCount: 60,
    betSize: 10.0,
    playerBudget: 600,
    // Pattern-specific settings
    enablePatterns: true,
    activePatterns: ['wave', 'discovery'],
    playerRiskProfile: 'mixed',
    patternPriority: 'rtp-first',
    maxConcurrentPatterns: 1,
    patternCooldownSpins: 10,
    // Premium settings
    enableNearMiss: true,
    nearMissFrequency: 0.2,
    enableFeatureTriggers: true,
    featureTriggerFrequency: 0.4 // High feature frequency for premium feel
};
/**
 * Configuration for Tournament/Competitive Play
 * Focus: Fairness, predictability, skill-based elements
 * Behavioral traits: Competitive, fair play expectations
 */
export const TOURNAMENT_CONFIG = {
    // Base RTP settings - Strict fairness
    targetRTP: 0.98,
    tolerance: 0.01,
    boardCount: 200,
    betSize: 1.0,
    playerBudget: 200,
    // Pattern-specific settings
    enablePatterns: true,
    activePatterns: ['wave'],
    playerRiskProfile: 'mixed',
    patternPriority: 'rtp-first',
    maxConcurrentPatterns: 1,
    patternCooldownSpins: 10,
    // Fair competition settings
    enableNearMiss: false,
    nearMissFrequency: 0.0,
    enableFeatureTriggers: true,
    featureTriggerFrequency: 0.15 // Conservative features
};
/**
 * Configuration for Development/Testing
 * Focus: Quick testing of all patterns and features
 * Behavioral traits: Developer/tester needs
 */
export const DEVELOPMENT_CONFIG = {
    // Base RTP settings - Lenient for testing
    targetRTP: 0.5,
    tolerance: 0.2,
    boardCount: 25,
    betSize: 1.0,
    playerBudget: 50,
    // Pattern-specific settings - Test everything
    enablePatterns: true,
    activePatterns: ['comeback', 'cliffhanger', 'discovery', 'tease', 'wave'],
    playerRiskProfile: 'mixed',
    patternPriority: 'pattern-first',
    maxConcurrentPatterns: 3,
    patternCooldownSpins: 1,
    // High activity for testing
    enableNearMiss: true,
    nearMissFrequency: 0.8,
    enableFeatureTriggers: true,
    featureTriggerFrequency: 0.4 // High feature activity for testing
};
/**
 * Configuration for Demo/Showcase
 * Focus: Impressive demonstrations, high entertainment value
 * Behavioral traits: Viewers/demo audiences
 */
export const DEMO_SHOWCASE_CONFIG = {
    // Base RTP settings - Entertaining
    targetRTP: 1.2,
    tolerance: 0.1,
    boardCount: 30,
    betSize: 1.0,
    playerBudget: 100,
    // Pattern-specific settings - Maximum entertainment
    enablePatterns: true,
    activePatterns: ['cliffhanger', 'discovery', 'tease'],
    playerRiskProfile: 'risk-seeker',
    patternPriority: 'pattern-first',
    maxConcurrentPatterns: 2,
    patternCooldownSpins: 2,
    // High entertainment settings
    enableNearMiss: true,
    nearMissFrequency: 0.5,
    enableFeatureTriggers: true,
    featureTriggerFrequency: 0.6 // Very high feature frequency for show
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
};
