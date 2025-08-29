// Test New Configuration Structure
// Demonstrates how to use the new separated configuration files

import { PatternStateMachineRTPController } from "./cascading-slot/pattern-state-machine-rtp-controller.js";
import { BoardResult } from "./cascading-slot/rtp-controller.js";
import {
    PLAYER_TYPE_CONFIGS,
    SESSION_CONFIGS,
    createTimeBasedSessionConfig,
    getSessionConfig,
    createPatternFromTemplate
} from "./cascading-slot/configs/index.js";
import { configurePatternSession } from "./cascading-slot/pattern-configuration-examples.js";

/**
 * Example 1: Using Player Type Configurations
 */
async function testPlayerTypeConfigs() {
    console.log("🎭 Example 1: Player Type Configurations");
    console.log("=========================================");
    
    const playerTypes = ['loss-averse', 'risk-seeker', 'explorer', 'balanced'] as const;
    
    for (const playerType of playerTypes) {
        console.log(`\n👤 ${playerType.toUpperCase()} Player:`);
        
        const config = PLAYER_TYPE_CONFIGS[playerType];
        const controller = new PatternStateMachineRTPController(config);
        
        console.log(`  📊 Target RTP: ${(config.targetRTP * 100).toFixed(1)}%`);
        console.log(`  🎯 Active Patterns: ${config.activePatterns.join(', ')}`);
        console.log(`  ⚖️ Priority: ${config.patternPriority}`);
        console.log(`  🎰 Feature Frequency: ${(config.featureTriggerFrequency * 100).toFixed(0)}%`);
        
        // Simulate a few spins
        const results: BoardResult[] = [];
        for (let i = 0; i < 5; i++) {
            const shouldWin = controller.shouldNextBoardWin(results);
            const winSize = shouldWin ? controller.getTargetWinSize(results) : 0;
            
            results.push({
                board: Array(15).fill(0).map(() => Math.floor(Math.random() * 11)),
                multipliers: Array(15).fill(1),
                cascadeCount: shouldWin ? 1 : 0,
                totalCascadeWin: winSize,
                isFreeSpin: false,
                accumulatedMultiplier: 0,
                remainingFreeSpins: 0
            });
            
            console.log(`    Spin ${i + 1}: ${shouldWin ? `WIN ${winSize.toFixed(2)}` : 'LOSS'}`);
        }
    }
}

/**
 * Example 2: Using Session Configurations
 */
async function testSessionConfigs() {
    console.log("\n🕐 Example 2: Session Configurations");
    console.log("====================================");
    
    const sessionTypes = ['quick', 'lunch-break', 'weekend', 'mobile', 'vip'] as const;
    
    for (const sessionType of sessionTypes) {
        console.log(`\n📱 ${sessionType.toUpperCase()} Session:`);
        
        const config = SESSION_CONFIGS[sessionType];
        console.log(`  📊 Target RTP: ${(config.targetRTP * 100).toFixed(1)}%`);
        console.log(`  🎯 Board Count: ${config.boardCount}`);
        console.log(`  💰 Bet Size: $${config.betSize}`);
        console.log(`  🎭 Active Patterns: ${config.activePatterns.join(', ')}`);
        console.log(`  ⏱️ Pattern Cooldown: ${config.patternCooldownSpins} spins`);
    }
}

/**
 * Example 3: Time-Based Adaptive Configuration
 */
async function testTimeBasedConfig() {
    console.log("\n⏰ Example 3: Time-Based Adaptive Configuration");
    console.log("===============================================");
    
    const timeScenarios = [
        { minutes: 5, description: "Coffee break" },
        { minutes: 20, description: "Commute gaming" },
        { minutes: 60, description: "Evening session" },
        { minutes: 120, description: "Weekend gaming" }
    ];
    
    for (const scenario of timeScenarios) {
        console.log(`\n⏱️ ${scenario.description} (${scenario.minutes} minutes):`);
        
        for (const riskLevel of ['low', 'medium', 'high'] as const) {
            const config = createTimeBasedSessionConfig(scenario.minutes, riskLevel);
            console.log(`  ${riskLevel.toUpperCase()} Risk: ${config.boardCount} rounds, ${(config.targetRTP * 100).toFixed(1)}% RTP, ${config.activePatterns.join(', ')}`);
        }
    }
}

/**
 * Example 4: Configuration Customization
 */
async function testConfigCustomization() {
    console.log("\n🛠️ Example 4: Configuration Customization");
    console.log("==========================================");
    
    // Start with explorer config and customize it
    const customConfig = configurePatternSession('explorer', {
        targetRTP: 0.95,                            // Lower RTP for more volatility
        activePatterns: ['discovery', 'cliffhanger'], // Different pattern mix
        maxConcurrentPatterns: 3,                   // More concurrent patterns
        featureTriggerFrequency: 0.5               // Much higher feature frequency
    });
    
    console.log("🔧 Customized Explorer Config:");
    console.log(`  📊 Target RTP: ${(customConfig.targetRTP * 100).toFixed(1)}%`);
    console.log(`  🎯 Active Patterns: ${customConfig.activePatterns.join(', ')}`);
    console.log(`  🔀 Max Concurrent: ${customConfig.maxConcurrentPatterns}`);
    console.log(`  🎰 Feature Frequency: ${(customConfig.featureTriggerFrequency * 100).toFixed(0)}%`);
    
    const controller = new PatternStateMachineRTPController(customConfig);
    
    // Test the customized configuration
    console.log("\n🎮 Testing Customized Config:");
    const results: BoardResult[] = [];
    for (let i = 0; i < 8; i++) {
        const shouldWin = controller.shouldNextBoardWin(results);
        const winSize = shouldWin ? controller.getTargetWinSize(results) : 0;
        
        results.push({
            board: Array(15).fill(0).map(() => Math.floor(Math.random() * 11)),
            multipliers: Array(15).fill(1),
            cascadeCount: shouldWin ? 1 : 0,
            totalCascadeWin: winSize,
            isFreeSpin: false,
            accumulatedMultiplier: 0,
            remainingFreeSpins: 0
        });
        
        console.log(`  Spin ${i + 1}: ${shouldWin ? `WIN ${winSize.toFixed(2)}` : 'LOSS'}`);
    }
    
    console.log(`\n📊 Pattern Status:`, controller.getPatternStatus());
}

/**
 * Example 5: Session Config with Player Type Overlay
 */
async function testSessionWithPlayerOverlay() {
    console.log("\n🎭📱 Example 5: Session Config with Player Type Overlay");
    console.log("======================================================");
    
    // Mobile session with high-stakes player preferences
    const mobileHighStakesConfig = getSessionConfig('mobile', {
        // High-stakes player preferences
        betSize: 5.0,                               // Higher bet size
        playerBudget: 250,                          // Higher budget
        targetRTP: 0.985,                           // Premium RTP
        tolerance: 0.01,                            // Strict tolerance
        patternPriority: 'rtp-first',               // RTP accuracy important
        activePatterns: ['wave', 'discovery']       // Quality patterns
    });
    
    console.log("📱💎 Mobile High-Stakes Configuration:");
    console.log(`  📊 Target RTP: ${(mobileHighStakesConfig.targetRTP * 100).toFixed(1)}%`);
    console.log(`  💰 Bet Size: $${mobileHighStakesConfig.betSize}`);
    console.log(`  🎯 Active Patterns: ${mobileHighStakesConfig.activePatterns.join(', ')}`);
    console.log(`  ⚖️ Priority: ${mobileHighStakesConfig.patternPriority}`);
    
    // Quick test
    const controller = new PatternStateMachineRTPController(mobileHighStakesConfig);
    console.log("\n🎮 Quick Test:");
    
    const results: BoardResult[] = [];
    for (let i = 0; i < 5; i++) {
        const shouldWin = controller.shouldNextBoardWin(results);
        const winSize = shouldWin ? controller.getTargetWinSize(results) : 0;
        
        results.push({
            board: Array(15).fill(0).map(() => Math.floor(Math.random() * 11)),
            multipliers: Array(15).fill(1),
            cascadeCount: shouldWin ? 1 : 0,
            totalCascadeWin: winSize,
            isFreeSpin: false,
            accumulatedMultiplier: 0,
            remainingFreeSpins: 0
        });
        
        console.log(`  Spin ${i + 1}: ${shouldWin ? `WIN $${winSize.toFixed(2)}` : 'LOSS'}`);
    }
}

/**
 * Example 6: Pattern Template Usage
 */
async function testPatternTemplates() {
    console.log("\n🎨 Example 6: Pattern Template Usage");
    console.log("====================================");
    
    // Create custom pattern from template
    const customPattern = createPatternFromTemplate('escalating-wins', {
        name: "Mega Escalation",
        description: "Extreme escalating wins with extended phases",
        priority: 9,
        riskProfile: 'risk-seeker',
        targetRTPContribution: 0.40,
        // Double all phase durations for longer escalation
        phaseMultipliers: { 0: 2, 1: 2, 2: 2, 3: 2 }
    });
    
    console.log("🎨 Created Custom Pattern from Template:");
    console.log(`  📛 Name: ${customPattern.name}`);
    console.log(`  📝 Description: ${customPattern.description}`);
    console.log(`  🔢 Phases: ${customPattern.phases.length}`);
    console.log(`  ⏱️ Cycle Duration: ${customPattern.minCycleDuration} spins`);
    console.log(`  📊 RTP Contribution: ${(customPattern.targetRTPContribution * 100).toFixed(0)}%`);
    
    console.log("\n📋 Phase Details:");
    customPattern.phases.forEach((phase, index) => {
        console.log(`  ${index + 1}. ${phase.type} (${phase.duration} spins) - ${phase.emotionalState}`);
        if (phase.targetMultiplier) {
            console.log(`     💰 Target: ${phase.targetMultiplier}x multiplier`);
        }
    });
}

/**
 * Run all configuration tests
 */
export async function runConfigTests() {
    console.log("🔧 Testing New Configuration Structure");
    console.log("=====================================\n");
    
    await testPlayerTypeConfigs();
    await testSessionConfigs();
    await testTimeBasedConfig();
    await testConfigCustomization();
    await testSessionWithPlayerOverlay();
    await testPatternTemplates();
    
    console.log("\n✨ All configuration tests completed!");
    console.log("\n📁 Configuration Structure:");
    console.log("  📂 configs/");
    console.log("    📄 player-type-configs.ts     - Player behavioral profiles");
    console.log("    📄 feature-configs.ts         - Feature trigger settings");
    console.log("    📄 custom-pattern-templates.ts - Pattern templates");
    console.log("    📄 session-configs.ts         - Session type configurations");
    console.log("    📄 index.ts                   - Centralized exports");
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runConfigTests().catch(console.error);
}
