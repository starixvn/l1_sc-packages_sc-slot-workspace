// Pattern Configuration Examples
// Practical examples of how to configure different emotional engagement scenarios
// Now importing from dedicated configuration files
import { PatternConfigurationManager } from "./engagement-patterns.js";
import { PLAYER_TYPE_CONFIGS, createPatternFromTemplate } from "./configs/index.js";
// Re-export the main configuration collections for backward compatibility
export { PLAYER_TYPE_CONFIGS, SESSION_CONFIGS } from "./configs/index.js";
/**
 * Custom Pattern Configuration Examples Using Templates
 */
/**
 * Example: Creating a custom "Roller Coaster" pattern using high volatility template
 */
export function createCustomRollerCoasterPattern() {
    const patternManager = new PatternConfigurationManager();
    // Use high volatility template and customize it
    const rollerCoasterPattern = createPatternFromTemplate('high-volatility', {
        name: "Roller Coaster",
        description: "Extreme highs and lows for thrill-seekers",
        priority: 8,
        riskProfile: 'risk-seeker',
        targetRTPContribution: 0.30,
        // Multiply durations for more intense experience
        phaseMultipliers: { 0: 1, 1: 1.5, 2: 1.5, 3: 1.5, 4: 1 }
    });
    // Register the custom pattern
    const patternId = `custom_${Date.now()}`;
    // Add to manager (simplified approach)
    return patternId;
}
/**
 * Example: Creating a custom "Gentle Progression" pattern using template
 */
export function createCustomGentleProgressionPattern() {
    const patternManager = new PatternConfigurationManager();
    // Use gentle recovery template and customize it
    const gentlePattern = createPatternFromTemplate('gentle-recovery', {
        name: "Gentle Progression",
        description: "Gradual building pattern for new players",
        priority: 6,
        riskProfile: 'loss-averse',
        targetRTPContribution: 0.12,
        // Extend durations for gentler experience
        phaseMultipliers: { 0: 0.5, 1: 0.5, 2: 1.5, 3: 1.5, 4: 1.5 }
    });
    const patternId = `gentle_${Date.now()}`;
    return patternId;
}
/**
 * Usage Examples and Configuration Functions
 */
/**
 * Configure patterns for a specific session using new config structure
 */
export function configurePatternSession(playerType, customizations) {
    const baseConfig = PLAYER_TYPE_CONFIGS[playerType];
    if (!baseConfig) {
        throw new Error(`Unknown player type: ${playerType}`);
    }
    // Apply customizations if provided
    return { ...baseConfig, ...customizations };
}
/**
 * Example: Advanced configuration with pattern customization using new structure
 */
export function createAdvancedPatternConfig() {
    const patternManager = new PatternConfigurationManager();
    // Customize the comeback pattern for longer duration
    patternManager.customizePattern('comeback', {
        phases: [
            ...patternManager.getPattern('comeback').phases.map(phase => ({
                ...phase,
                duration: phase.duration * 1.5 // 50% longer phases
            }))
        ],
        priority: 10,
        targetRTPContribution: 0.25 // Increased contribution
    });
    return {
        ...PLAYER_TYPE_CONFIGS['loss-averse'],
        activePatterns: ['comeback'],
        patternPriority: 'pattern-first',
        tolerance: 0.05 // More lenient for pattern execution
    };
}
/**
 * Example: Dynamic pattern switching based on session performance
 */
export function getAdaptivePatternConfig(sessionResults, currentRTP, targetRTP) {
    const rtpDeficit = targetRTP - currentRTP;
    if (rtpDeficit > 0.05) {
        // Player is losing - use comeback patterns
        return configurePatternSession('loss-averse', {
            activePatterns: ['comeback', 'wave'],
            patternPriority: 'pattern-first'
        });
    }
    else if (rtpDeficit < -0.05) {
        // Player is winning too much - use neutral patterns
        return configurePatternSession('explorer', {
            activePatterns: ['discovery'],
            patternPriority: 'rtp-first'
        });
    }
    else {
        // Balanced - use varied patterns
        return configurePatternSession('explorer', {
            activePatterns: ['discovery', 'wave', 'tease'],
            patternPriority: 'balanced'
        });
    }
}
// Tournament configuration is now imported from configs/player-type-configs.ts
// Use PLAYER_TYPE_CONFIGS['tournament'] or SESSION_CONFIGS['tournament']
