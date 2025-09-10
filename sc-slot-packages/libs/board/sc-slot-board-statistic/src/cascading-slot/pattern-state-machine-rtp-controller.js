// Pattern State Machine RTP Controller
// Implementation of Option A: Extends RTPController with emotional engagement patterns
import { RTPController } from "./rtp-controller.js";
import { PatternConfigurationManager } from "./engagement-patterns.js";
/**
 * Enhanced RTP Controller with Emotional Engagement Patterns
 * Implements Pattern State Machine approach (Option A)
 */
export class PatternStateMachineRTPController extends RTPController {
    patternConfig;
    patternManager;
    activePatternProgress = new Map();
    currentSpin = 0;
    lastPatternActivation = 0;
    constructor(config) {
        super(config);
        this.patternConfig = config;
        this.patternManager = new PatternConfigurationManager();
        this.initializeActivePatterns();
    }
    /**
     * Initialize active patterns based on configuration
     */
    initializeActivePatterns() {
        if (!this.patternConfig.enablePatterns)
            return;
        // Get patterns suitable for player's risk profile
        const suitablePatterns = this.patternManager.getPatternsForRiskProfile(this.patternConfig.playerRiskProfile);
        // Initialize specified active patterns
        this.patternConfig.activePatterns.forEach(patternName => {
            const pattern = this.patternManager.getPattern(patternName);
            if (pattern && suitablePatterns.includes(pattern)) {
                this.activePatternProgress.set(patternName, {
                    patternName,
                    currentPhaseIndex: 0,
                    spinsInCurrentPhase: 0,
                    totalCyclesCompleted: 0,
                    lastActivated: 0,
                    isActive: false
                });
            }
        });
    }
    /**
     * Override main decision method to consider patterns
     */
    shouldNextBoardWin(currentResults) {
        this.currentSpin = currentResults.length;
        // Get pattern recommendation
        const patternDecision = this.evaluatePatternRequirements(currentResults);
        // Get base RTP recommendation  
        const rtpDecision = super.shouldNextBoardWin(currentResults);
        // Reconcile decisions based on priority setting
        return this.reconcileDecisions(rtpDecision, patternDecision, currentResults);
    }
    /**
     * Override target win size to consider pattern requirements
     */
    getTargetWinSize(currentResults) {
        const patternDecision = this.evaluatePatternRequirements(currentResults);
        if (patternDecision.shouldExecute && patternDecision.targetMultiplier) {
            const baseWinSize = this.patternConfig.betSize * patternDecision.targetMultiplier;
            console.log(`🎭 Pattern "${patternDecision.patternName}" suggests ${patternDecision.targetMultiplier}x win`);
            return baseWinSize;
        }
        // Fallback to standard RTP logic
        return super.getTargetWinSize(currentResults);
    }
    /**
     * Evaluate pattern requirements and recommendations
     */
    evaluatePatternRequirements(currentResults) {
        if (!this.patternConfig.enablePatterns) {
            return this.createNullDecision("Patterns disabled");
        }
        // Check if we're in cooldown period
        if (this.currentSpin - this.lastPatternActivation < this.patternConfig.patternCooldownSpins) {
            return this.createNullDecision("Pattern cooldown active");
        }
        // Evaluate each active pattern
        const patternDecisions = [];
        for (const [patternName, progress] of this.activePatternProgress.entries()) {
            const pattern = this.patternManager.getPattern(patternName);
            if (!pattern)
                continue;
            const decision = this.evaluateSinglePattern(pattern, progress, currentResults);
            if (decision.shouldExecute) {
                patternDecisions.push(decision);
            }
        }
        // No active patterns want to execute
        if (patternDecisions.length === 0) {
            return this.considerActivatingNewPattern(currentResults);
        }
        // Return highest priority decision
        patternDecisions.sort((a, b) => b.confidence - a.confidence);
        return patternDecisions[0];
    }
    /**
     * Evaluate a single pattern's current state and requirements
     */
    evaluateSinglePattern(pattern, progress, currentResults) {
        if (!progress.isActive) {
            return this.createNullDecision(`Pattern ${pattern.name} not active`);
        }
        const currentPhase = pattern.phases[progress.currentPhaseIndex];
        // Check if we should advance to next phase
        if (progress.spinsInCurrentPhase >= currentPhase.duration) {
            progress.currentPhaseIndex = (progress.currentPhaseIndex + 1) % pattern.phases.length;
            progress.spinsInCurrentPhase = 0;
            // Pattern completed full cycle
            if (progress.currentPhaseIndex === 0) {
                progress.totalCyclesCompleted++;
                console.log(`🔄 Pattern "${pattern.name}" completed cycle ${progress.totalCyclesCompleted}`);
            }
        }
        const newPhase = pattern.phases[progress.currentPhaseIndex];
        return this.createPhaseDecision(pattern, newPhase, progress);
    }
    /**
     * Create a pattern decision based on current phase requirements
     */
    createPhaseDecision(pattern, phase, progress) {
        const shouldWin = ['small-win', 'medium-win', 'big-win', 'feature-trigger'].includes(phase.type);
        return {
            shouldExecute: true,
            phaseType: phase.type,
            targetMultiplier: phase.targetMultiplier,
            nearMissDistance: phase.nearMissDistance,
            triggerFeature: phase.type === 'feature-trigger',
            patternName: pattern.name,
            confidence: pattern.priority / 10,
            reasoning: `Pattern "${pattern.name}" phase: ${phase.description}`
        };
    }
    /**
     * Consider activating a new pattern if none are active
     */
    considerActivatingNewPattern(currentResults) {
        // Check if we can activate more patterns
        const activeCount = Array.from(this.activePatternProgress.values())
            .filter(progress => progress.isActive).length;
        if (activeCount >= this.patternConfig.maxConcurrentPatterns) {
            return this.createNullDecision("Max concurrent patterns reached");
        }
        // Find inactive patterns that could be activated
        const inactivePatterns = Array.from(this.activePatternProgress.entries())
            .filter(([_, progress]) => !progress.isActive);
        if (inactivePatterns.length === 0) {
            return this.createNullDecision("No inactive patterns available");
        }
        // Activate highest priority inactive pattern
        inactivePatterns.sort((a, b) => {
            const patternA = this.patternManager.getPattern(a[0]);
            const patternB = this.patternManager.getPattern(b[0]);
            return (patternB?.priority || 0) - (patternA?.priority || 0);
        });
        const [patternName, progress] = inactivePatterns[0];
        const pattern = this.patternManager.getPattern(patternName);
        if (pattern) {
            progress.isActive = true;
            progress.currentPhaseIndex = 0;
            progress.spinsInCurrentPhase = 0;
            progress.lastActivated = this.currentSpin;
            this.lastPatternActivation = this.currentSpin;
            console.log(`🎭 Activating pattern: ${pattern.name}`);
            const firstPhase = pattern.phases[0];
            return this.createPhaseDecision(pattern, firstPhase, progress);
        }
        return this.createNullDecision("Failed to activate pattern");
    }
    /**
     * Reconcile RTP decision with pattern decision based on priority
     */
    reconcileDecisions(rtpDecision, patternDecision, currentResults) {
        if (!patternDecision.shouldExecute) {
            return rtpDecision;
        }
        const currentRTP = this.calculateCurrentRTP(currentResults);
        const rtpDeficit = this.patternConfig.targetRTP - currentRTP;
        switch (this.patternConfig.patternPriority) {
            case 'rtp-first':
                // RTP takes priority - only follow pattern if it doesn't hurt RTP
                if (Math.abs(rtpDeficit) > this.patternConfig.tolerance) {
                    console.log(`🎯 RTP-first: Ignoring pattern decision due to RTP deficit: ${rtpDeficit.toFixed(3)}`);
                    return rtpDecision;
                }
                break;
            case 'pattern-first':
                // Pattern takes priority - follow pattern unless RTP is critically off
                if (Math.abs(rtpDeficit) > this.patternConfig.tolerance * 2) {
                    console.log(`⚠️ Pattern-first: Overriding pattern due to critical RTP deficit: ${rtpDeficit.toFixed(3)}`);
                    return rtpDecision;
                }
                break;
            case 'balanced':
            default:
                // Balanced approach - weight decisions by confidence and RTP status
                const rtpWeight = Math.abs(rtpDeficit) / this.patternConfig.tolerance;
                const patternWeight = patternDecision.confidence;
                if (rtpWeight > patternWeight) {
                    console.log(`⚖️ Balanced: RTP weight (${rtpWeight.toFixed(2)}) > Pattern weight (${patternWeight.toFixed(2)})`);
                    return rtpDecision;
                }
                break;
        }
        // Update pattern progress when decision is followed
        this.updatePatternProgress(patternDecision.patternName);
        console.log(`🎭 Following pattern decision: ${patternDecision.reasoning}`);
        // Determine win/loss based on pattern phase
        return ['small-win', 'medium-win', 'big-win', 'feature-trigger'].includes(patternDecision.phaseType);
    }
    /**
     * Update pattern progress when a decision is executed
     */
    updatePatternProgress(patternName) {
        const progress = this.activePatternProgress.get(patternName);
        if (progress) {
            progress.spinsInCurrentPhase++;
        }
    }
    /**
     * Calculate current RTP (helper method)
     */
    calculateCurrentRTP(currentResults) {
        if (currentResults.length === 0)
            return 0;
        const totalBets = currentResults.length * this.patternConfig.betSize;
        const totalWins = currentResults.reduce((sum, result) => sum + (result.totalTumbleWin || 0), 0);
        return totalWins / totalBets;
    }
    /**
     * Create a null decision (no pattern action)
     */
    createNullDecision(reason) {
        return {
            shouldExecute: false,
            phaseType: 'neutral',
            patternName: 'none',
            confidence: 0,
            reasoning: reason
        };
    }
    /**
     * Get current pattern status for debugging/monitoring
     */
    getPatternStatus() {
        return {
            activePatterns: Array.from(this.activePatternProgress.entries())
                .filter(([_, progress]) => progress.isActive)
                .map(([name, _]) => name),
            patternProgress: Array.from(this.activePatternProgress.values()),
            currentSpin: this.currentSpin
        };
    }
    /**
     * Force activate a specific pattern (for testing/debugging)
     */
    forceActivatePattern(patternName) {
        const progress = this.activePatternProgress.get(patternName);
        if (progress) {
            progress.isActive = true;
            progress.currentPhaseIndex = 0;
            progress.spinsInCurrentPhase = 0;
            progress.lastActivated = this.currentSpin;
            console.log(`🔧 Force-activated pattern: ${patternName}`);
            return true;
        }
        return false;
    }
    /**
     * Deactivate a specific pattern
     */
    deactivatePattern(patternName) {
        const progress = this.activePatternProgress.get(patternName);
        if (progress) {
            progress.isActive = false;
            console.log(`🛑 Deactivated pattern: ${patternName}`);
            return true;
        }
        return false;
    }
}
