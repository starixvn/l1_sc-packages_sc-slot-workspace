// Simple working test without pattern dependencies
import { BoardGeneratorAdapter } from "./cascading-slot/board-generator-adapter.js";
import { ResultChainOrchestrator } from "./cascading-slot/result-chain-orchestrator.js";
import { Difficulty } from "sc-slot-board-generator";
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

async function testPatternsSimple() {
    console.log("🎭 Simple Board Chain Test");
    console.log("===========================");
    
    // Test configuration - small sample for quick validation
    const testConfig = {
        chainLength: 20,  // Only 20 rounds for quick test
        betSize: 1.0,     // $1 per round
        targetRTP: 0.85,  // 85% target RTP
        outputDir: './pattern-test-results'
    };
    
    try {
        console.log("🔄 Initializing basic orchestrator...");
        
        // Create basic RTP configuration
        const rtpConfig = {
            targetRTP: testConfig.targetRTP,
            tolerance: 0.05,
            boardCount: testConfig.chainLength,
            betSize: testConfig.betSize,
            playerBudget: 100,
        };
        
        // Create board generator factory with proper constructor arguments
        const boardGeneratorFactory = () => new BoardGeneratorAdapter(
            {
                reels: 6,
                symbolsOnReel: 5,
                numberOfSymbols: 11,
                numberOfShuffles: 3,
            },
            {
                min: 2,
                max: 21,
            },
            Difficulty.Medium
        );
        
        const orchestrator = new ResultChainOrchestrator(boardGeneratorFactory, rtpConfig);
        
        console.log("🎯 Generating basic result chain...");
        const startTime = Date.now();
        
        // Generate result chain with correct parameters
        const chainResult = await orchestrator.generateResultChain({
            boardCount: testConfig.chainLength,
            targetRTP: testConfig.targetRTP,
            betSize: testConfig.betSize,
            playerBudget: 100,
            difficulty: Difficulty.Medium,
            maxRetries: 3,
            tolerance: 0.05
        });
        
        const executionTime = Date.now() - startTime;
        
        // Calculate basic metrics
        const totalWagered = chainResult.boards.length * testConfig.betSize;
        let totalWon = 0;
        let featuresTriggered = 0;
        
        chainResult.boards.forEach((board: any) => {
            // Get wins from settlementResult.tumbles
            let totalWin = 0;
            if (board.settlementResult?.tumbles) {
                board.settlementResult.tumbles.forEach((tumble: any) => {
                    totalWin += tumble.win || 0;
                });
            }
            totalWon += totalWin;
            
            // Count features correctly
            const cascades = board.cascadeCount || 0;
            const isFreeSpin = board.isFreeSpin || false;
            
            if (cascades > 0 || isFreeSpin) {
                featuresTriggered++;
            }
        });
        
        const actualRTP = totalWon / totalWagered;
        const rtpVariance = Math.abs(actualRTP - testConfig.targetRTP);
        
        console.log("\n✅ Test Results:");
        console.log(`Rounds Generated: ${chainResult.boards.length}`);
        console.log(`Total Wagered: $${totalWagered.toFixed(2)}`);
        console.log(`Total Won: $${totalWon.toFixed(2)}`);
        console.log(`Actual RTP: ${(actualRTP * 100).toFixed(2)}%`);
        console.log(`Target RTP: ${(testConfig.targetRTP * 100).toFixed(1)}%`);
        console.log(`RTP Variance: ${(rtpVariance * 100).toFixed(2)}%`);
        console.log(`Boards with Features: ${featuresTriggered} (${((featuresTriggered / chainResult.boards.length) * 100).toFixed(1)}%)`);
        console.log(`Execution Time: ${executionTime}ms`);
        
        // Show sample results
        console.log("\n📊 Sample Results (first 5 rounds):");
        chainResult.boards.slice(0, 5).forEach((board: any, index: number) => {
            // Calculate total win from settlementResult.tumbles
            let totalWin = 0;
            if (board.settlementResult?.tumbles) {
                board.settlementResult.tumbles.forEach((tumble: any) => {
                    totalWin += tumble.win || 0;
                });
            }
            
            const features = [];
            const cascades = board.cascadeCount || 0;
            const isFreeSpin = board.isFreeSpin || false;
            const accumulatedMultiplier = board.accumulatedMultiplier || 1;
            const freeSpinCount = board.settlementResult?.freeSpins?.count || 0;
            
            if (isFreeSpin) features.push('Free Spin');
            if (cascades > 0) features.push(`Cascades: ${cascades}`);
            if (accumulatedMultiplier > 1) features.push(`Multiplier: ${accumulatedMultiplier}x`);
            if (freeSpinCount > 0) features.push(`Free Spins Won: ${freeSpinCount}`);
            
            console.log(`Round ${index + 1}: Win $${totalWin.toFixed(2)}${features.length > 0 ? ` [${features.join(', ')}]` : ''}`);
        });
        
        // Save results to JSON
        try {
            mkdirSync(testConfig.outputDir, { recursive: true });
        } catch (e) {
            // Directory already exists
        }
        
        const resultData = {
            config: testConfig,
            results: {
                roundsGenerated: chainResult.boards.length,
                totalWagered: totalWagered,
                totalWon: totalWon,
                actualRTP: actualRTP,
                rtpVariance: rtpVariance,
                featuresTriggered: featuresTriggered,
                executionTime: executionTime
            },
            sampleBoards: chainResult.boards.slice(0, 5),
            timestamp: new Date().toISOString()
        };
        
        const outputPath = join(testConfig.outputDir, 'simple-test-results.json');
        writeFileSync(outputPath, JSON.stringify(resultData, null, 2));
        console.log(`\n💾 Results saved to: ${outputPath}`);
        
        // Validation
        console.log("\n🔍 Validation:");
        if (rtpVariance <= 0.1) {
            console.log("✅ RTP variance acceptable for small sample");
        } else {
            console.log("⚠️  RTP variance high - may need larger sample size");
        }
        
        console.log("✅ Simple test completed successfully!");
        
    } catch (error) {
        console.error("❌ Test failed:", error);
        console.error("Stack trace:", error.stack);
        process.exit(1);
    }
}

// Run the test
testPatternsSimple();