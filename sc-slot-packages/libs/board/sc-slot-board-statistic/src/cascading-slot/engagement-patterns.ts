// Emotional Engagement Pattern Definitions
// Implementation of Option A: Pattern State Machine Extension

export type PatternPhaseType = 
    | 'loss' 
    | 'small-win' 
    | 'medium-win' 
    | 'big-win' 
    | 'near-miss' 
    | 'neutral' 
    | 'feature-trigger';

export type EmotionalState = 
    | 'tension' 
    | 'frustration' 
    | 'hope' 
    | 'relief' 
    | 'excitement' 
    | 'elation' 
    | 'curiosity' 
    | 'anticipation' 
    | 'calm'
    | 'urge'
    | 'satisfaction';

export type RiskProfile = 
    | 'loss-averse' 
    | 'risk-seeker' 
    | 'explorer' 
    | 'streak-hunter' 
    | 'mixed';

export interface PatternPhase {
    type: PatternPhaseType;
    duration: number;              // How many spins this phase should last
    targetMultiplier?: number;     // Win size multiplier (e.g., 2.5 = 2.5x bet)
    nearMissDistance?: number;     // For near-miss: how close to winning (1-3 symbols away)
    emotionalState: EmotionalState;
    description: string;           // Human readable description
}

export interface EngagementPattern {
    name: string;
    description: string;
    phases: PatternPhase[];
    currentPhase: number;
    completedCycles: number;
    priority: number;              // 1-10, higher = more important
    riskProfile: RiskProfile;
    minCycleDuration: number;      // Minimum spins per complete cycle
    maxCycleDuration: number;      // Maximum spins per complete cycle
    targetRTPContribution: number; // How much RTP this pattern should contribute
}

export interface PatternProgress {
    patternName: string;
    currentPhaseIndex: number;
    spinsInCurrentPhase: number;
    totalCyclesCompleted: number;
    lastActivated: number;         // Spin number when pattern was last activated
    isActive: boolean;
}

/**
 * Pattern Configuration Definitions
 * Each pattern implements one of the 5 emotional engagement loops
 */
export const ENGAGEMENT_PATTERNS: Record<string, EngagementPattern> = {
    /**
     * 1. The Comeback Loop
     * Structure: Loss streak → Near-miss → Medium win → Small win → Neutral spins
     * Emotional Arc: Tension → Frustration → Hope → Relief → Calm
     * Purpose: Creates a sense of recovery and "I can turn this around" feeling
     * Risk Profile: Works well for loss-averse players who need reassurance
     */
    comeback: {
        name: "Comeback Loop",
        description: "Recovery-focused pattern for loss-averse players",
        phases: [
            {
                type: 'loss',
                duration: 3,
                emotionalState: 'tension',
                description: "Loss streak builds tension"
            },
            {
                type: 'loss',
                duration: 2,
                emotionalState: 'frustration',
                description: "Continued losses create frustration"
            },
            {
                type: 'near-miss',
                duration: 1,
                nearMissDistance: 1,
                emotionalState: 'hope',
                description: "Near-miss sparks hope for recovery"
            },
            {
                type: 'medium-win',
                duration: 1,
                targetMultiplier: 3.5,
                emotionalState: 'relief',
                description: "Medium win provides relief"
            },
            {
                type: 'small-win',
                duration: 1,
                targetMultiplier: 1.2,
                emotionalState: 'relief',
                description: "Small win reinforces recovery feeling"
            },
            {
                type: 'neutral',
                duration: 2,
                emotionalState: 'calm',
                description: "Neutral spins allow emotional reset"
            }
        ],
        currentPhase: 0,
        completedCycles: 0,
        priority: 8,
        riskProfile: 'loss-averse',
        minCycleDuration: 8,
        maxCycleDuration: 12,
        targetRTPContribution: 0.15  // 15% of total RTP
    },

    /**
     * 2. The Cliffhanger Loop
     * Structure: Small win → Small win → Near-miss → Loss streak → Big win
     * Emotional Arc: Excitement → Hope → Tension spike → Frustration → Elation
     * Purpose: Builds suspense before delivering a high-impact win
     * Risk Profile: Appeals to risk-seekers who chase dramatic swings
     */
    cliffhanger: {
        name: "Cliffhanger Loop",
        description: "High-suspense pattern for risk-seekers",
        phases: [
            {
                type: 'small-win',
                duration: 1,
                targetMultiplier: 0.8,
                emotionalState: 'excitement',
                description: "First small win builds excitement"
            },
            {
                type: 'small-win',
                duration: 1,
                targetMultiplier: 1.1,
                emotionalState: 'hope',
                description: "Second small win increases hope"
            },
            {
                type: 'near-miss',
                duration: 1,
                nearMissDistance: 1,
                emotionalState: 'tension',
                description: "Near-miss creates tension spike"
            },
            {
                type: 'loss',
                duration: 2,
                emotionalState: 'frustration',
                description: "Loss streak builds frustration"
            },
            {
                type: 'loss',
                duration: 1,
                emotionalState: 'frustration',
                description: "Continued losses peak frustration"
            },
            {
                type: 'big-win',
                duration: 1,
                targetMultiplier: 12.0,
                emotionalState: 'elation',
                description: "Big win delivers dramatic payoff"
            }
        ],
        currentPhase: 0,
        completedCycles: 0,
        priority: 7,
        riskProfile: 'risk-seeker',
        minCycleDuration: 6,
        maxCycleDuration: 8,
        targetRTPContribution: 0.25  // 25% of total RTP
    },

    /**
     * 3. The Discovery Loop
     * Structure: Neutral spins → Small win → Small win → Feature trigger → Moderate payout
     * Emotional Arc: Curiosity → Anticipation → Reward → Satisfaction
     * Purpose: Rewards exploration and patience
     * Risk Profile: Effective for explorer-type players with high curiosity index
     */
    discovery: {
        name: "Discovery Loop", 
        description: "Exploration-reward pattern for curious players",
        phases: [
            {
                type: 'neutral',
                duration: 2,
                emotionalState: 'curiosity',
                description: "Neutral spins build curiosity"
            },
            {
                type: 'neutral',
                duration: 1,
                emotionalState: 'curiosity',
                description: "Continued neutrality maintains curiosity"
            },
            {
                type: 'small-win',
                duration: 1,
                targetMultiplier: 0.6,
                emotionalState: 'anticipation',
                description: "Small win creates anticipation"
            },
            {
                type: 'small-win',
                duration: 1,
                targetMultiplier: 0.9,
                emotionalState: 'anticipation',
                description: "Second small win builds anticipation"
            },
            {
                type: 'feature-trigger',
                duration: 1,
                emotionalState: 'reward',
                description: "Feature trigger provides exploration reward"
            },
            {
                type: 'medium-win',
                duration: 1,
                targetMultiplier: 4.2,
                emotionalState: 'satisfaction',
                description: "Moderate payout delivers satisfaction"
            }
        ],
        currentPhase: 0,
        completedCycles: 0,
        priority: 6,
        riskProfile: 'explorer',
        minCycleDuration: 6,
        maxCycleDuration: 8,
        targetRTPContribution: 0.18  // 18% of total RTP
    },

    /**
     * 4. The Tease Loop
     * Structure: Multiple near-misses in short span → Neutral spins → Medium win
     * Emotional Arc: Frustration → Urge → Payoff → Relief
     * Purpose: Leverages the near-miss effect ethically by showing actual RNG results
     * Risk Profile: Works across all profiles, especially streak hunters
     */
    tease: {
        name: "Tease Loop",
        description: "Near-miss leveraging pattern for all player types",
        phases: [
            {
                type: 'near-miss',
                duration: 1,
                nearMissDistance: 1,
                emotionalState: 'frustration',
                description: "First near-miss creates frustration"
            },
            {
                type: 'near-miss',
                duration: 1,
                nearMissDistance: 2,
                emotionalState: 'frustration',
                description: "Second near-miss increases frustration"
            },
            {
                type: 'near-miss',
                duration: 1,
                nearMissDistance: 1,
                emotionalState: 'urge',
                description: "Third near-miss creates strong urge"
            },
            {
                type: 'neutral',
                duration: 2,
                emotionalState: 'urge',
                description: "Neutral spins maintain urge"
            },
            {
                type: 'medium-win',
                duration: 1,
                targetMultiplier: 5.8,
                emotionalState: 'relief',
                description: "Medium win provides payoff and relief"
            }
        ],
        currentPhase: 0,
        completedCycles: 0,
        priority: 9,
        riskProfile: 'mixed',
        minCycleDuration: 5,
        maxCycleDuration: 7,
        targetRTPContribution: 0.20  // 20% of total RTP
    },

    /**
     * 5. The Wave Loop
     * Structure: Small win → Neutral → Medium win → Neutral → Small win → Big win
     * Emotional Arc: Rising hope → Anticipation → Climax → Satisfaction
     * Purpose: Creates a rhythm, keeping engagement without sharp loss walls
     * Risk Profile: Balances risk for mixed-volatility audiences
     */
    wave: {
        name: "Wave Loop",
        description: "Rhythmic engagement pattern for balanced volatility",
        phases: [
            {
                type: 'small-win',
                duration: 1,
                targetMultiplier: 0.7,
                emotionalState: 'hope',
                description: "First small win establishes rising hope"
            },
            {
                type: 'neutral',
                duration: 1,
                emotionalState: 'anticipation',
                description: "Neutral spin maintains anticipation"
            },
            {
                type: 'medium-win',
                duration: 1,
                targetMultiplier: 2.8,
                emotionalState: 'anticipation',
                description: "Medium win builds anticipation"
            },
            {
                type: 'neutral',
                duration: 1,
                emotionalState: 'anticipation',
                description: "Neutral spin heightens anticipation"
            },
            {
                type: 'small-win',
                duration: 1,
                targetMultiplier: 1.3,
                emotionalState: 'anticipation',
                description: "Small win peaks anticipation"
            },
            {
                type: 'big-win',
                duration: 1,
                targetMultiplier: 15.0,
                emotionalState: 'elation',
                description: "Big win provides climactic satisfaction"
            }
        ],
        currentPhase: 0,
        completedCycles: 0,
        priority: 5,
        riskProfile: 'mixed',
        minCycleDuration: 6,
        maxCycleDuration: 6,
        targetRTPContribution: 0.22  // 22% of total RTP
    }
};

/**
 * Pattern Configuration Manager
 * Handles loading, validating, and customizing patterns
 */
export class PatternConfigurationManager {
    private patterns: Map<string, EngagementPattern> = new Map();
    
    constructor() {
        this.loadDefaultPatterns();
    }
    
    /**
     * Load default patterns from configuration
     */
    private loadDefaultPatterns(): void {
        Object.entries(ENGAGEMENT_PATTERNS).forEach(([key, pattern]) => {
            this.patterns.set(key, { ...pattern });
        });
    }
    
    /**
     * Get pattern configuration by name
     */
    getPattern(name: string): EngagementPattern | undefined {
        return this.patterns.get(name);
    }
    
    /**
     * Get all available patterns
     */
    getAllPatterns(): EngagementPattern[] {
        return Array.from(this.patterns.values());
    }
    
    /**
     * Get patterns suitable for a specific risk profile
     */
    getPatternsForRiskProfile(riskProfile: RiskProfile): EngagementPattern[] {
        return Array.from(this.patterns.values())
            .filter(pattern => pattern.riskProfile === riskProfile || pattern.riskProfile === 'mixed')
            .sort((a, b) => b.priority - a.priority);
    }
    
    /**
     * Customize pattern parameters
     */
    customizePattern(
        patternName: string, 
        customizations: Partial<EngagementPattern>
    ): boolean {
        const pattern = this.patterns.get(patternName);
        if (!pattern) return false;
        
        // Apply customizations while preserving core structure
        Object.assign(pattern, customizations);
        
        // Validate pattern integrity
        return this.validatePattern(pattern);
    }
    
    /**
     * Validate pattern configuration
     */
    private validatePattern(pattern: EngagementPattern): boolean {
        // Check basic structure
        if (!pattern.phases || pattern.phases.length === 0) return false;
        
        // Check RTP contribution doesn't exceed 100%
        if (pattern.targetRTPContribution > 1.0) return false;
        
        // Check phase durations are reasonable
        const totalDuration = pattern.phases.reduce((sum, phase) => sum + phase.duration, 0);
        if (totalDuration < pattern.minCycleDuration || totalDuration > pattern.maxCycleDuration) {
            return false;
        }
        
        return true;
    }
    
    /**
     * Create custom pattern from configuration
     */
    createCustomPattern(config: {
        name: string;
        description: string;
        phases: Omit<PatternPhase, 'description'>[];
        riskProfile: RiskProfile;
        priority: number;
        targetRTPContribution: number;
    }): string {
        const customPattern: EngagementPattern = {
            name: config.name,
            description: config.description,
            phases: config.phases.map((phase, index) => ({
                ...phase,
                description: `Phase ${index + 1}: ${phase.type} (${phase.emotionalState})`
            })),
            currentPhase: 0,
            completedCycles: 0,
            priority: config.priority,
            riskProfile: config.riskProfile,
            minCycleDuration: config.phases.reduce((sum, phase) => sum + phase.duration, 0),
            maxCycleDuration: config.phases.reduce((sum, phase) => sum + phase.duration, 0),
            targetRTPContribution: config.targetRTPContribution
        };
        
        if (this.validatePattern(customPattern)) {
            const patternId = `custom_${Date.now()}`;
            this.patterns.set(patternId, customPattern);
            return patternId;
        }
        
        throw new Error('Invalid custom pattern configuration');
    }
}
