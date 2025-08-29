// Custom Pattern Templates
// Pre-designed pattern templates that can be easily customized

import { EngagementPattern, PatternPhase } from "../engagement-patterns.js";

/**
 * Template: Simple Alternating Pattern
 * Structure: Win → Loss → Win → Loss (basic alternation)
 */
export const SIMPLE_ALTERNATING_TEMPLATE: Omit<EngagementPattern, 'name' | 'description' | 'currentPhase' | 'completedCycles'> = {
    phases: [
        {
            type: 'small-win',
            duration: 1,
            targetMultiplier: 1.5,
            emotionalState: 'hope',
            description: "Small win builds hope"
        },
        {
            type: 'loss',
            duration: 1,
            emotionalState: 'tension',
            description: "Loss creates tension"
        },
        {
            type: 'medium-win',
            duration: 1,
            targetMultiplier: 3.0,
            emotionalState: 'relief',
            description: "Medium win provides relief"
        },
        {
            type: 'loss',
            duration: 1,
            emotionalState: 'anticipation',
            description: "Loss builds anticipation for next cycle"
        }
    ],
    priority: 5,
    riskProfile: 'mixed',
    minCycleDuration: 4,
    maxCycleDuration: 4,
    targetRTPContribution: 0.20
};

/**
 * Template: Escalating Wins Pattern
 * Structure: Small → Medium → Big → Neutral (building excitement)
 */
export const ESCALATING_WINS_TEMPLATE: Omit<EngagementPattern, 'name' | 'description' | 'currentPhase' | 'completedCycles'> = {
    phases: [
        {
            type: 'small-win',
            duration: 1,
            targetMultiplier: 0.8,
            emotionalState: 'hope',
            description: "Small win starts the escalation"
        },
        {
            type: 'medium-win',
            duration: 1,
            targetMultiplier: 2.5,
            emotionalState: 'excitement',
            description: "Medium win builds excitement"
        },
        {
            type: 'big-win',
            duration: 1,
            targetMultiplier: 8.0,
            emotionalState: 'elation',
            description: "Big win delivers peak excitement"
        },
        {
            type: 'neutral',
            duration: 2,
            emotionalState: 'satisfaction',
            description: "Neutral spins allow satisfaction to settle"
        }
    ],
    priority: 7,
    riskProfile: 'risk-seeker',
    minCycleDuration: 5,
    maxCycleDuration: 5,
    targetRTPContribution: 0.25
};

/**
 * Template: Near-Miss Heavy Pattern
 * Structure: Near-miss → Near-miss → Loss → Big win (frustration → payoff)
 */
export const NEAR_MISS_HEAVY_TEMPLATE: Omit<EngagementPattern, 'name' | 'description' | 'currentPhase' | 'completedCycles'> = {
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
            nearMissDistance: 1,
            emotionalState: 'urge',
            description: "Second near-miss increases urge"
        },
        {
            type: 'loss',
            duration: 1,
            emotionalState: 'tension',
            description: "Loss peaks tension"
        },
        {
            type: 'big-win',
            duration: 1,
            targetMultiplier: 10.0,
            emotionalState: 'elation',
            description: "Big win provides massive relief"
        }
    ],
    priority: 8,
    riskProfile: 'streak-hunter',
    minCycleDuration: 4,
    maxCycleDuration: 4,
    targetRTPContribution: 0.22
};

/**
 * Template: Feature-Heavy Pattern
 * Structure: Neutral → Feature → Feature → Big win (discovery focused)
 */
export const FEATURE_HEAVY_TEMPLATE: Omit<EngagementPattern, 'name' | 'description' | 'currentPhase' | 'completedCycles'> = {
    phases: [
        {
            type: 'neutral',
            duration: 2,
            emotionalState: 'curiosity',
            description: "Neutral spins build curiosity"
        },
        {
            type: 'feature-trigger',
            duration: 1,
            emotionalState: 'anticipation',
            description: "First feature trigger builds anticipation"
        },
        {
            type: 'feature-trigger',
            duration: 1,
            emotionalState: 'excitement',
            description: "Second feature trigger increases excitement"
        },
        {
            type: 'big-win',
            duration: 1,
            targetMultiplier: 12.0,
            emotionalState: 'satisfaction',
            description: "Big win delivers ultimate satisfaction"
        }
    ],
    priority: 6,
    riskProfile: 'explorer',
    minCycleDuration: 5,
    maxCycleDuration: 5,
    targetRTPContribution: 0.28
};

/**
 * Template: Gentle Recovery Pattern
 * Structure: Loss → Loss → Small win → Small win → Medium win (gradual recovery)
 */
export const GENTLE_RECOVERY_TEMPLATE: Omit<EngagementPattern, 'name' | 'description' | 'currentPhase' | 'completedCycles'> = {
    phases: [
        {
            type: 'loss',
            duration: 1,
            emotionalState: 'tension',
            description: "First loss creates tension"
        },
        {
            type: 'loss',
            duration: 1,
            emotionalState: 'frustration',
            description: "Second loss builds frustration"
        },
        {
            type: 'small-win',
            duration: 1,
            targetMultiplier: 0.6,
            emotionalState: 'hope',
            description: "Small win sparks hope"
        },
        {
            type: 'small-win',
            duration: 1,
            targetMultiplier: 1.2,
            emotionalState: 'relief',
            description: "Second small win provides relief"
        },
        {
            type: 'medium-win',
            duration: 1,
            targetMultiplier: 3.5,
            emotionalState: 'satisfaction',
            description: "Medium win completes recovery"
        }
    ],
    priority: 7,
    riskProfile: 'loss-averse',
    minCycleDuration: 5,
    maxCycleDuration: 5,
    targetRTPContribution: 0.18
};

/**
 * Template: High Volatility Pattern
 * Structure: Loss → Loss → Loss → Loss → Mega win (extreme volatility)
 */
export const HIGH_VOLATILITY_TEMPLATE: Omit<EngagementPattern, 'name' | 'description' | 'currentPhase' | 'completedCycles'> = {
    phases: [
        {
            type: 'loss',
            duration: 1,
            emotionalState: 'tension',
            description: "First loss"
        },
        {
            type: 'loss',
            duration: 1,
            emotionalState: 'frustration',
            description: "Second loss builds frustration"
        },
        {
            type: 'loss',
            duration: 1,
            emotionalState: 'frustration',
            description: "Third loss increases frustration"
        },
        {
            type: 'loss',
            duration: 1,
            emotionalState: 'urge',
            description: "Fourth loss creates strong urge"
        },
        {
            type: 'big-win',
            duration: 1,
            targetMultiplier: 25.0,
            emotionalState: 'elation',
            description: "Mega win delivers extreme elation"
        }
    ],
    priority: 9,
    riskProfile: 'risk-seeker',
    minCycleDuration: 5,
    maxCycleDuration: 5,
    targetRTPContribution: 0.35
};

/**
 * Template: Balanced Rhythm Pattern
 * Structure: Small → Neutral → Medium → Neutral → Small → Neutral (steady rhythm)
 */
export const BALANCED_RHYTHM_TEMPLATE: Omit<EngagementPattern, 'name' | 'description' | 'currentPhase' | 'completedCycles'> = {
    phases: [
        {
            type: 'small-win',
            duration: 1,
            targetMultiplier: 0.8,
            emotionalState: 'hope',
            description: "Small win starts rhythm"
        },
        {
            type: 'neutral',
            duration: 1,
            emotionalState: 'calm',
            description: "Neutral maintains rhythm"
        },
        {
            type: 'medium-win',
            duration: 1,
            targetMultiplier: 2.8,
            emotionalState: 'excitement',
            description: "Medium win builds excitement"
        },
        {
            type: 'neutral',
            duration: 1,
            emotionalState: 'anticipation',
            description: "Neutral builds anticipation"
        },
        {
            type: 'small-win',
            duration: 1,
            targetMultiplier: 1.1,
            emotionalState: 'satisfaction',
            description: "Small win provides satisfaction"
        },
        {
            type: 'neutral',
            duration: 1,
            emotionalState: 'calm',
            description: "Neutral completes rhythm"
        }
    ],
    priority: 5,
    riskProfile: 'mixed',
    minCycleDuration: 6,
    maxCycleDuration: 6,
    targetRTPContribution: 0.16
};

/**
 * Pattern Template Registry
 * Easy lookup for different pattern templates
 */
export const PATTERN_TEMPLATES = {
    'simple-alternating': SIMPLE_ALTERNATING_TEMPLATE,
    'escalating-wins': ESCALATING_WINS_TEMPLATE,
    'near-miss-heavy': NEAR_MISS_HEAVY_TEMPLATE,
    'feature-heavy': FEATURE_HEAVY_TEMPLATE,
    'gentle-recovery': GENTLE_RECOVERY_TEMPLATE,
    'high-volatility': HIGH_VOLATILITY_TEMPLATE,
    'balanced-rhythm': BALANCED_RHYTHM_TEMPLATE
} as const;

export type PatternTemplateKey = keyof typeof PATTERN_TEMPLATES;

/**
 * Helper function to create custom pattern from template
 */
export function createPatternFromTemplate(
    templateKey: PatternTemplateKey,
    customizations: {
        name: string;
        description: string;
        priority?: number;
        riskProfile?: 'loss-averse' | 'risk-seeker' | 'explorer' | 'streak-hunter' | 'mixed';
        targetRTPContribution?: number;
        phaseMultipliers?: { [phaseIndex: number]: number }; // Multiply phase durations
    }
): EngagementPattern {
    const template = PATTERN_TEMPLATES[templateKey];
    
    // Apply phase multipliers if provided
    let phases = template.phases;
    if (customizations.phaseMultipliers) {
        phases = template.phases.map((phase, index) => ({
            ...phase,
            duration: customizations.phaseMultipliers![index] 
                ? Math.ceil(phase.duration * customizations.phaseMultipliers![index])
                : phase.duration
        }));
    }
    
    // Calculate cycle duration
    const cycleDuration = phases.reduce((sum, phase) => sum + phase.duration, 0);
    
    return {
        name: customizations.name,
        description: customizations.description,
        phases,
        currentPhase: 0,
        completedCycles: 0,
        priority: customizations.priority || template.priority,
        riskProfile: customizations.riskProfile || template.riskProfile,
        minCycleDuration: cycleDuration,
        maxCycleDuration: cycleDuration,
        targetRTPContribution: customizations.targetRTPContribution || template.targetRTPContribution
    };
}

/**
 * Helper function to validate custom pattern template
 */
export function validatePatternTemplate(template: Omit<EngagementPattern, 'name' | 'description' | 'currentPhase' | 'completedCycles'>): {
    valid: boolean;
    errors: string[];
} {
    const errors: string[] = [];
    
    // Check phases
    if (!template.phases || template.phases.length === 0) {
        errors.push("Pattern must have at least one phase");
    }
    
    // Check cycle duration consistency
    const actualDuration = template.phases.reduce((sum, phase) => sum + phase.duration, 0);
    if (actualDuration < template.minCycleDuration || actualDuration > template.maxCycleDuration) {
        errors.push(`Actual duration (${actualDuration}) doesn't match min/max cycle duration`);
    }
    
    // Check RTP contribution
    if (template.targetRTPContribution > 1.0) {
        errors.push("RTP contribution cannot exceed 100%");
    }
    
    // Check priority range
    if (template.priority < 1 || template.priority > 10) {
        errors.push("Priority must be between 1 and 10");
    }
    
    // Check phase durations
    for (const phase of template.phases) {
        if (phase.duration < 1) {
            errors.push(`Phase "${phase.type}" must have duration >= 1`);
        }
        
        if (['small-win', 'medium-win', 'big-win'].includes(phase.type) && !phase.targetMultiplier) {
            errors.push(`Win phase "${phase.type}" must have targetMultiplier`);
        }
        
        if (phase.type === 'near-miss' && !phase.nearMissDistance) {
            errors.push(`Near-miss phase must have nearMissDistance`);
        }
    }
    
    return {
        valid: errors.length === 0,
        errors
    };
}
