// Pattern Usage Example
// Demonstrates how to use emotional engagement patterns with the RTP system

import { PatternStateMachineRTPController } from "./cascading-slot/pattern-state-machine-rtp-controller.js";
import { 
    LOSS_AVERSE_PLAYER_CONFIG, 
    RISK_SEEKER_CONFIG,
    configurePatternSession,
    createCustomRollerCoasterPattern
} from "./cascading-slot/pattern-configuration-examples.js";
import { BoardResult } from "./cascading-slot/rtp-controller.js";

/**
 * Example 1: Basic Pattern Usage for Loss-Averse Player
 */
async function exampleLossAversePlayer() {
    console.log("🎭 Example 1: Loss-Averse Player Pattern");
    console.log("=====================================");
    
    // Create controller with loss-averse configuration
    const controller = new PatternStateMachineRTPController(LOSS_AVERSE_PLAYER_CONFIG);
    
    // Simulate 20 spins
    const results: BoardResult[] = [];
    
    for (let spin = 0; spin < 20; spin++) {
        const shouldWin = controller.shouldNextBoardWin(results);
        const winSize = shouldWin ? controller.getTargetWinSize(results) : 0;
        
        // Simulate board result
        const result: BoardResult = {
            board: Array(15).fill(0).map(() => Math.floor(Math.random() * 11)),
            multipliers: Array(15).fill(1),
            cascadeCount: shouldWin ? Math.floor(Math.random() * 3) + 1 : 0,
            totalCascadeWin: winSize,
            isFreeSpin: false,
            accumulatedMultiplier: 0,
            remainingFreeSpins: 0
        };
        
        results.push(result);
        
        console.log(`Spin ${spin + 1}: ${shouldWin ? `WIN ${winSize.toFixed(2)}` : 'LOSS'}`);
    }
    
    // Check pattern status
    const status = controller.getPatternStatus();
    console.log(`\n📊 Active Patterns: ${status.activePatterns.join(', ')}`);
    
    const currentRTP = results.reduce((sum, r) => sum + r.totalCascadeWin, 0) / 
                      (results.length * LOSS_AVERSE_PLAYER_CONFIG.betSize);
    console.log(`📈 Final RTP: ${(currentRTP * 100).toFixed(2)}%`);
    console.log(`🎯 Target RTP: ${(LOSS_AVERSE_PLAYER_CONFIG.targetRTP * 100).toFixed(2)}%\n`);
}

/**
 * Example 2: Risk-Seeker with High Volatility Patterns
 */
async function exampleRiskSeeker() {
    console.log("🎭 Example 2: Risk-Seeker Pattern");
    console.log("==================================");
    
    const controller = new PatternStateMachineRTPController(RISK_SEEKER_CONFIG);
    const results: BoardResult[] = [];
    
    for (let spin = 0; spin < 15; spin++) {
        const shouldWin = controller.shouldNextBoardWin(results);
        const winSize = shouldWin ? controller.getTargetWinSize(results) : 0;
        
        const result: BoardResult = {
            board: Array(15).fill(0).map(() => Math.floor(Math.random() * 11)),
            multipliers: Array(15).fill(1),
            cascadeCount: shouldWin ? Math.floor(Math.random() * 4) + 1 : 0,
            totalCascadeWin: winSize,
            isFreeSpin: false,
            accumulatedMultiplier: 0,
            remainingFreeSpins: 0
        };
        
        results.push(result);
        
        const winType = winSize > 20 ? "BIG WIN" : winSize > 5 ? "MEDIUM WIN" : winSize > 0 ? "SMALL WIN" : "LOSS";
        console.log(`Spin ${spin + 1}: ${winType} ${winSize > 0 ? winSize.toFixed(2) : ''}`);
    }
    
    const status = controller.getPatternStatus();
    console.log(`\n📊 Active Patterns: ${status.activePatterns.join(', ')}`);
    
    const currentRTP = results.reduce((sum, r) => sum + r.totalCascadeWin, 0) / 
                      (results.length * RISK_SEEKER_CONFIG.betSize);
    console.log(`📈 Final RTP: ${(currentRTP * 100).toFixed(2)}%`);
    console.log(`🎯 Target RTP: ${(RISK_SEEKER_CONFIG.targetRTP * 100).toFixed(2)}%\n`);
}

/**
 * Example 3: Custom Pattern Configuration
 */
async function exampleCustomPatternConfig() {
    console.log("🎭 Example 3: Custom Pattern Configuration");
    console.log("==========================================");
    
    // Create custom configuration
    const customConfig = configurePatternSession('explorer', {
        targetRTP: 0.95,
        activePatterns: ['discovery', 'wave'],
        maxConcurrentPatterns: 2,
        patternCooldownSpins: 3
    });
    
    const controller = new PatternStateMachineRTPController(customConfig);
    
    // Force activate specific pattern for demonstration
    controller.forceActivatePattern('discovery');
    
    const results: BoardResult[] = [];
    
    for (let spin = 0; spin < 12; spin++) {
        const shouldWin = controller.shouldNextBoardWin(results);
        const winSize = shouldWin ? controller.getTargetWinSize(results) : 0;
        
        const result: BoardResult = {
            board: Array(15).fill(0).map(() => Math.floor(Math.random() * 11)),
            multipliers: Array(15).fill(1),
            cascadeCount: shouldWin ? Math.floor(Math.random() * 3) + 1 : 0,
            totalCascadeWin: winSize,
            isFreeSpin: false,
            accumulatedMultiplier: 0,
            remainingFreeSpins: 0
        };
        
        results.push(result);
        
        console.log(`Spin ${spin + 1}: ${shouldWin ? `WIN ${winSize.toFixed(2)}` : 'LOSS'}`);
    }
    
    const status = controller.getPatternStatus();
    console.log(`\n📊 Active Patterns: ${status.activePatterns.join(', ')}`);
    console.log(`🔄 Pattern Progress:`, status.patternProgress.map(p => 
        `${p.patternName}: Phase ${p.currentPhaseIndex}, Spins ${p.spinsInCurrentPhase}, Cycles ${p.totalCyclesCompleted}`
    ));
    
    const currentRTP = results.reduce((sum, r) => sum + r.totalCascadeWin, 0) / 
                      (results.length * customConfig.betSize);
    console.log(`📈 Final RTP: ${(currentRTP * 100).toFixed(2)}%\n`);
}

/**
 * Example 4: Custom Roller Coaster Pattern
 */
async function exampleCustomRollerCoaster() {
    console.log("🎭 Example 4: Custom Roller Coaster Pattern");
    console.log("============================================");
    
    // Create custom roller coaster pattern
    const customPatternId = createCustomRollerCoasterPattern();
    
    // Create config with custom pattern
    const config = configurePatternSession('risk-seeker', {
        activePatterns: [customPatternId],
        maxConcurrentPatterns: 1,
        patternPriority: 'pattern-first'
    });
    
    const controller = new PatternStateMachineRTPController(config);
    controller.forceActivatePattern(customPatternId);
    
    const results: BoardResult[] = [];
    
    for (let spin = 0; spin < 10; spin++) {
        const shouldWin = controller.shouldNextBoardWin(results);
        const winSize = shouldWin ? controller.getTargetWinSize(results) : 0;
        
        const result: BoardResult = {
            board: Array(15).fill(0).map(() => Math.floor(Math.random() * 11)),
            multipliers: Array(15).fill(1),
            cascadeCount: shouldWin ? Math.floor(Math.random() * 4) + 1 : 0,
            totalCascadeWin: winSize,
            isFreeSpin: false,
            accumulatedMultiplier: 0,
            remainingFreeSpins: 0
        };
        
        results.push(result);
        
        const winType = winSize > 15 ? "🎉 BIG WIN" : winSize > 3 ? "📈 MEDIUM WIN" : winSize > 0 ? "💰 SMALL WIN" : "❌ LOSS";
        console.log(`Spin ${spin + 1}: ${winType} ${winSize > 0 ? winSize.toFixed(2) : ''}`);
    }
    
    console.log(`\n🎢 Roller Coaster Pattern completed!`);
}

/**
 * Example 5: Pattern Debugging and Monitoring
 */
async function examplePatternDebugging() {
    console.log("🎭 Example 5: Pattern Debugging");
    console.log("================================");
    
    const config = configurePatternSession('development', {
        activePatterns: ['comeback', 'tease'],
        maxConcurrentPatterns: 2
    });
    
    const controller = new PatternStateMachineRTPController(config);
    
    console.log("🔧 Initial Status:", controller.getPatternStatus());
    
    // Force activate patterns for testing
    controller.forceActivatePattern('comeback');
    console.log("🔧 After activating comeback:", controller.getPatternStatus());
    
    controller.forceActivatePattern('tease');
    console.log("🔧 After activating tease:", controller.getPatternStatus());
    
    // Simulate a few spins
    const results: BoardResult[] = [];
    
    for (let spin = 0; spin < 5; spin++) {
        const shouldWin = controller.shouldNextBoardWin(results);
        const winSize = shouldWin ? controller.getTargetWinSize(results) : 0;
        
        const result: BoardResult = {
            board: Array(15).fill(0).map(() => Math.floor(Math.random() * 11)),
            multipliers: Array(15).fill(1),
            cascadeCount: shouldWin ? 1 : 0,
            totalCascadeWin: winSize,
            isFreeSpin: false,
            accumulatedMultiplier: 0,
            remainingFreeSpins: 0
        };
        
        results.push(result);
        
        console.log(`Spin ${spin + 1}: ${shouldWin ? `WIN ${winSize.toFixed(2)}` : 'LOSS'}`);
        console.log(`  Status:`, controller.getPatternStatus());
    }
    
    // Deactivate one pattern
    controller.deactivatePattern('tease');
    console.log("🔧 After deactivating tease:", controller.getPatternStatus());
}

/**
 * Run all examples
 */
export async function runPatternExamples() {
    console.log("🎰 Emotional Engagement Pattern Examples");
    console.log("=========================================\n");
    
    await exampleLossAversePlayer();
    await exampleRiskSeeker();
    await exampleCustomPatternConfig();
    await exampleCustomRollerCoaster();
    await examplePatternDebugging();
    
    console.log("✨ All pattern examples completed!");
}

// Run examples if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runPatternExamples().catch(console.error);
}
