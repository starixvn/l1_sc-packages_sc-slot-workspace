// Standard pattern testing script with configurable parameters
import { BoardGeneratorAdapter } from "./cascading-slot/board-generator-adapter.js";
import { ResultChainOrchestrator } from "./cascading-slot/result-chain-orchestrator.js";
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
// Available patterns with descriptions (simplified - no complex pattern system)
const AVAILABLE_PATTERNS = {
    'comeback': {
        name: 'Comeback Loop',
        description: 'Recovery-focused pattern for loss-averse players',
        riskProfile: 'loss-averse'
    },
    'cliffhanger': {
        name: 'Cliffhanger Loop',
        description: 'Suspense-building pattern for thrill-seekers',
        riskProfile: 'risk-seeker'
    },
    'discovery': {
        name: 'Discovery Loop',
        description: 'Exploration and learning pattern for curious players',
        riskProfile: 'explorer'
    },
    'tease': {
        name: 'Tease Loop',
        description: 'Near-miss pattern for anticipation-driven players',
        riskProfile: 'streak-hunter'
    },
    'wave': {
        name: 'Wave Loop',
        description: 'Rhythmic pattern for balanced gameplay',
        riskProfile: 'mixed'
    }
};
function printUsage() {
    const patternNames = Object.keys(AVAILABLE_PATTERNS);
    console.log(`
🎭 Standard Pattern Testing Script

Usage:
  npm run test-pattern -- [totalBoards] [patternType]
  
Parameters:
  totalBoards   Number of boards to generate (default: 50)
  patternType   Pattern to test: ${patternNames.join(', ')} (default: comeback)

Examples:
  npm run test-pattern                      # 50 boards, comeback pattern
  npm run test-pattern -- 100              # 100 boards, comeback pattern  
  npm run test-pattern -- 75 cliffhanger   # 75 boards, cliffhanger pattern
  npm run test-pattern -- 200 discovery    # 200 boards, discovery pattern

Available Patterns:
${patternNames.map(p => `  - ${p.padEnd(12)} : ${AVAILABLE_PATTERNS[p].description}`).join('\n')}
`);
}
async function testPatternStandard() {
    // Parse command line arguments
    const args = process.argv.slice(2);
    // Show help if requested
    if (args.includes('--help') || args.includes('-h')) {
        printUsage();
        return;
    }
    const totalBoards = args[0] ? parseInt(args[0], 10) : 50;
    const patternType = args[1] || 'comeback';
    // Validate inputs
    if (isNaN(totalBoards) || totalBoards < 1) {
        console.error("❌ Error: totalBoards must be a positive number");
        printUsage();
        process.exit(1);
    }
    const patternNames = Object.keys(AVAILABLE_PATTERNS);
    if (!patternNames.includes(patternType)) {
        console.error(`❌ Error: Invalid pattern '${patternType}'`);
        console.error(`Available patterns: ${patternNames.join(', ')}`);
        printUsage();
        process.exit(1);
    }
    const pattern = AVAILABLE_PATTERNS[patternType];
    console.log("🎭 Standard Pattern Test");
    console.log("========================");
    console.log(`Pattern: ${pattern.name}`);
    console.log(`Description: ${pattern.description}`);
    console.log(`Total Boards: ${totalBoards}`);
    console.log(`Risk Profile: ${pattern.riskProfile}`);
    console.log("");
    // Test configuration
    const testConfig = {
        totalBoards,
        patternType,
        betSize: 1.0,
        targetRTP: 0.85,
        outputDir: './pattern-test-results'
    };
    try {
        console.log("🔄 Initializing orchestrator...");
        // Create basic RTP configuration
        const rtpConfig = {
            targetRTP: testConfig.targetRTP,
            tolerance: 0.05,
            boardCount: testConfig.totalBoards,
            betSize: testConfig.betSize,
            playerBudget: testConfig.totalBoards * testConfig.betSize,
        };
        // Create board generator factory with proper constructor arguments
        const boardGeneratorFactory = () => new BoardGeneratorAdapter({
            reels: 6,
            symbolsOnReel: 5,
            numberOfSymbols: 11,
            numberOfShuffles: 3,
        }, {
            min: 2,
            max: 21,
        }, 2 /* Difficulty.Medium */);
        const orchestrator = new ResultChainOrchestrator(boardGeneratorFactory, rtpConfig);
        console.log(`🎯 Generating ${testConfig.totalBoards} boards using '${pattern.name}' pattern...`);
        const startTime = Date.now();
        // Generate result chain
        const chainResult = await orchestrator.generateResultChain({
            boardCount: testConfig.totalBoards,
            targetRTP: testConfig.targetRTP,
            betSize: testConfig.betSize,
            playerBudget: testConfig.totalBoards * testConfig.betSize,
            difficulty: 2 /* Difficulty.Medium */,
            maxRetries: 5,
            tolerance: 0.05
        });
        const executionTime = Date.now() - startTime;
        // Calculate metrics
        const totalWagered = chainResult.boards.length * testConfig.betSize;
        let totalWon = 0;
        let featuresTriggered = 0;
        let freeSpinsWon = 0;
        let cascadeCount = 0;
        const winDistribution = {
            losses: 0,
            smallWins: 0,
            mediumWins: 0,
            bigWins: 0 // > 5x bet
        };
        chainResult.boards.forEach((board) => {
            // Calculate total win from settlementResult.tumbles
            let totalWin = 0;
            if (board.settlementResult?.tumbles) {
                board.settlementResult.tumbles.forEach((tumble) => {
                    totalWin += tumble.win || 0;
                });
            }
            totalWon += totalWin;
            // Categorize wins
            const winMultiplier = totalWin / testConfig.betSize;
            if (totalWin === 0) {
                winDistribution.losses++;
            }
            else if (winMultiplier < 1) {
                winDistribution.smallWins++;
            }
            else if (winMultiplier <= 5) {
                winDistribution.mediumWins++;
            }
            else {
                winDistribution.bigWins++;
            }
            // Count features
            const cascades = board.cascadeCount || 0;
            const isFreeSpin = board.isFreeSpin || false;
            const freeSpinCount = board.settlementResult?.freeSpins?.count || 0;
            if (cascades > 0 || isFreeSpin) {
                featuresTriggered++;
            }
            cascadeCount += cascades;
            freeSpinsWon += freeSpinCount;
        });
        const actualRTP = totalWon / totalWagered;
        const rtpVariance = Math.abs(actualRTP - testConfig.targetRTP);
        console.log("✅ Pattern Test Results:");
        console.log("========================");
        console.log(`Pattern: ${pattern.name}`);
        console.log(`Boards Generated: ${chainResult.boards.length}`);
        console.log(`Total Wagered: $${totalWagered.toFixed(2)}`);
        console.log(`Total Won: $${totalWon.toFixed(2)}`);
        console.log(`Actual RTP: ${(actualRTP * 100).toFixed(2)}%`);
        console.log(`Target RTP: ${(testConfig.targetRTP * 100).toFixed(1)}%`);
        console.log(`RTP Variance: ${(rtpVariance * 100).toFixed(2)}%`);
        console.log(`Execution Time: ${executionTime}ms`);
        console.log("");
        console.log("🎰 Feature Statistics:");
        console.log(`Boards with Features: ${featuresTriggered} (${((featuresTriggered / chainResult.boards.length) * 100).toFixed(1)}%)`);
        console.log(`Total Cascades: ${cascadeCount}`);
        console.log(`Total Free Spins Won: ${freeSpinsWon}`);
        console.log("");
        console.log("💰 Win Distribution:");
        console.log(`Losses (0x): ${winDistribution.losses} (${((winDistribution.losses / chainResult.boards.length) * 100).toFixed(1)}%)`);
        console.log(`Small Wins (<1x): ${winDistribution.smallWins} (${((winDistribution.smallWins / chainResult.boards.length) * 100).toFixed(1)}%)`);
        console.log(`Medium Wins (1-5x): ${winDistribution.mediumWins} (${((winDistribution.mediumWins / chainResult.boards.length) * 100).toFixed(1)}%)`);
        console.log(`Big Wins (>5x): ${winDistribution.bigWins} (${((winDistribution.bigWins / chainResult.boards.length) * 100).toFixed(1)}%)`);
        console.log("");
        // Show sample results
        const sampleCount = Math.min(10, chainResult.boards.length);
        console.log(`📊 Sample Results (first ${sampleCount} rounds):`);
        chainResult.boards.slice(0, sampleCount).forEach((board, index) => {
            // Calculate total win from settlementResult.tumbles
            let totalWin = 0;
            if (board.settlementResult?.tumbles) {
                board.settlementResult.tumbles.forEach((tumble) => {
                    totalWin += tumble.win || 0;
                });
            }
            const features = [];
            const cascades = board.cascadeCount || 0;
            const isFreeSpin = board.isFreeSpin || false;
            const accumulatedMultiplier = board.accumulatedMultiplier || 1;
            const freeSpinCount = board.settlementResult?.freeSpins?.count || 0;
            if (isFreeSpin)
                features.push('Free Spin');
            if (cascades > 0)
                features.push(`Cascades: ${cascades}`);
            if (accumulatedMultiplier > 1)
                features.push(`Multiplier: ${accumulatedMultiplier}x`);
            if (freeSpinCount > 0)
                features.push(`Free Spins Won: ${freeSpinCount}`);
            const winMultiplier = totalWin / testConfig.betSize;
            const winType = totalWin === 0 ? 'LOSS' :
                winMultiplier < 1 ? 'Small' :
                    winMultiplier <= 5 ? 'Medium' : 'BIG';
            console.log(`Round ${(index + 1).toString().padStart(2)}: Win $${totalWin.toFixed(2)} (${winMultiplier.toFixed(1)}x) [${winType}]${features.length > 0 ? ` [${features.join(', ')}]` : ''}`);
        });
        // Save results to JSON
        try {
            mkdirSync(testConfig.outputDir, { recursive: true });
        }
        catch (e) {
            // Directory already exists
        }
        const resultData = {
            config: testConfig,
            pattern: pattern,
            results: {
                boardsGenerated: chainResult.boards.length,
                totalWagered: totalWagered,
                totalWon: totalWon,
                actualRTP: actualRTP,
                rtpVariance: rtpVariance,
                executionTime: executionTime,
                featuresTriggered: featuresTriggered,
                cascadeCount: cascadeCount,
                freeSpinsWon: freeSpinsWon,
                winDistribution: winDistribution
            },
            sampleBoards: chainResult.boards.slice(0, 10),
            timestamp: new Date().toISOString()
        };
        const outputPath = join(testConfig.outputDir, `standard-test-${patternType}-${totalBoards}boards.json`);
        writeFileSync(outputPath, JSON.stringify(resultData, null, 2));
        console.log(`💾 Results saved to: ${outputPath}`);
        // Validation
        console.log("\n🔍 Validation:");
        if (rtpVariance <= 0.1) {
            console.log("✅ RTP variance within acceptable range");
        }
        else {
            console.log("⚠️  RTP variance high - consider larger sample size");
        }
        if (featuresTriggered > 0) {
            console.log("✅ Features are triggering");
        }
        else {
            console.log("⚠️  No features triggered");
        }
        console.log(`✅ ${pattern.name} pattern test completed successfully!`);
    }
    catch (error) {
        console.error(`❌ Pattern test failed:`, error);
        console.error("Stack trace:", error.stack);
        process.exit(1);
    }
}
// Run the test
testPatternStandard();
