#!/usr/bin/env ts-node
/**
 * Enhanced Chain Generation Script
 * Generates result chains with 97% RTP target and saves to JSON files
 * Reuses test-pattern functionality for consistent generation
 */
import { ResultChainOrchestrator } from '../cascading-slot/result-chain-orchestrator';
import { BoardGeneratorAdapter } from '../cascading-slot/board-generator-adapter';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
// Available patterns for chain generation
const AVAILABLE_PATTERNS = {
    comeback: {
        name: 'Comeback',
        description: 'Recovery pattern for loss-averse players - builds hope after losses',
        riskProfile: 'loss-averse'
    },
    cliffhanger: {
        name: 'Cliffhanger',
        description: 'High-suspense pattern for risk-seekers - near-miss excitement',
        riskProfile: 'risk-seeker'
    },
    discovery: {
        name: 'Discovery',
        description: 'Exploration pattern for curious players - gradual reveals',
        riskProfile: 'explorer'
    },
    tease: {
        name: 'Tease',
        description: 'Near-miss pattern for engagement - balanced anticipation',
        riskProfile: 'mixed'
    },
    wave: {
        name: 'Wave',
        description: 'Rhythmic pattern for balanced volatility - consistent engagement',
        riskProfile: 'mixed'
    }
};
async function main() {
    try {
        console.log('🚀 Enhanced Chain Generation Script');
        console.log('====================================');
        // Parse command line arguments
        const args = process.argv.slice(2);
        const config = parseArguments(args);
        // Display configuration
        console.log('📋 Generation Configuration:');
        console.log(`   Patterns: ${config.patterns.join(', ')}`);
        console.log(`   Board Counts: ${config.boardCounts.join(', ')}`);
        console.log(`   Target RTP: ${(config.targetRTP * 100).toFixed(1)}%`);
        console.log(`   Max Retries: ${config.maxRetries}`);
        console.log(`   Tolerance: ${(config.tolerance * 100).toFixed(1)}%`);
        console.log(`   Output Dir: ${config.outputDir}`);
        console.log(`   Created By: ${config.createdBy}`);
        console.log('');
        // Ensure output directory exists
        if (!existsSync(config.outputDir)) {
            mkdirSync(config.outputDir, { recursive: true });
            console.log(`📁 Created output directory: ${config.outputDir}`);
        }
        // Generate chains for each pattern and board count combination
        const totalChains = config.patterns.length * config.boardCounts.length;
        console.log(`🔄 Generating ${totalChains} chains...`);
        console.log('');
        let successCount = 0;
        let failureCount = 0;
        const results = [];
        for (const pattern of config.patterns) {
            for (const boardCount of config.boardCounts) {
                const timestamp = Date.now();
                const chainName = `${pattern}-${boardCount}boards-${timestamp}`;
                console.log(`🎭 Generating: ${chainName}`);
                try {
                    const chainResult = await generateChain(pattern, boardCount, config);
                    if (chainResult.success) {
                        // Save to JSON file
                        const filename = `${chainName}.json`;
                        const filePath = join(config.outputDir, filename);
                        const actualRTP = chainResult.actualRTP || 0;
                        const chainData = {
                            metadata: {
                                name: chainName,
                                patternType: pattern,
                                boardCount: boardCount,
                                targetRTP: config.targetRTP,
                                actualRTP: actualRTP,
                                rtpVariance: Math.abs(actualRTP - config.targetRTP),
                                meetsTargetRTP: Math.abs(actualRTP - config.targetRTP) <= config.tolerance,
                                createdBy: config.createdBy,
                                generatedAt: new Date().toISOString(),
                                generationStats: chainResult.generationStats
                            },
                            config: {
                                boardCount: boardCount,
                                targetRTP: config.targetRTP,
                                betSize: config.betSize,
                                playerBudget: boardCount * config.betSize,
                                difficulty: 'medium',
                                maxRetries: config.maxRetries,
                                tolerance: config.tolerance
                            },
                            boards: chainResult.boards,
                            tumbleStats: chainResult.tumbleStats,
                            patternInfo: AVAILABLE_PATTERNS[pattern]
                        };
                        writeFileSync(filePath, JSON.stringify(chainData, null, 2));
                        successCount++;
                        console.log(`   ✅ Success - RTP: ${(actualRTP * 100).toFixed(2)}%`);
                        console.log(`   💾 Saved to: ${filename}`);
                        results.push({
                            success: true,
                            chainName,
                            filename,
                            actualRTP: actualRTP,
                            generationStats: chainResult.generationStats
                        });
                    }
                    else {
                        failureCount++;
                        console.log(`   ❌ Failed: ${chainResult.error}`);
                        results.push({
                            success: false,
                            chainName,
                            error: chainResult.error
                        });
                    }
                }
                catch (error) {
                    failureCount++;
                    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                    console.log(`   ❌ Error: ${errorMessage}`);
                    results.push({
                        success: false,
                        chainName,
                        error: errorMessage
                    });
                }
                console.log('');
                // Add delay between generations to avoid overwhelming system
                if (totalChains > 1) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            }
        }
        // Summary
        console.log('📈 Generation Summary:');
        console.log(`   Total Chains: ${totalChains}`);
        console.log(`   Successful: ${successCount}`);
        console.log(`   Failed: ${failureCount}`);
        console.log(`   Success Rate: ${((successCount / totalChains) * 100).toFixed(1)}%`);
        if (successCount > 0) {
            console.log('');
            console.log('🔍 Generated JSON files:');
            results.filter(r => r.success).slice(0, 5).forEach(result => {
                const rtp = result.actualRTP || 0;
                console.log(`   📊 ${result.filename} - RTP: ${(rtp * 100).toFixed(2)}%`);
            });
            if (successCount > 5) {
                console.log(`   ... and ${successCount - 5} more files`);
            }
        }
        // Save generation summary
        const resultsSummary = {
            timestamp: new Date().toISOString(),
            config,
            summary: {
                total: totalChains,
                successful: successCount,
                failed: failureCount,
                successRate: (successCount / totalChains) * 100
            },
            results
        };
        const summaryPath = join(config.outputDir, `generation-summary-${Date.now()}.json`);
        writeFileSync(summaryPath, JSON.stringify(resultsSummary, null, 2));
        console.log(`💾 Summary saved to: ${summaryPath}`);
        console.log('');
        console.log('✅ Chain generation completed successfully!');
        console.log(`📁 Output directory: ${config.outputDir}`);
        console.log('💡 Next step: Use "npm run import-chains" to load JSON files into MongoDB');
        process.exit(0);
    }
    catch (error) {
        console.error('❌ Chain generation failed:', error);
        process.exit(1);
    }
}
function parseArguments(args) {
    // Show help if requested
    if (args.includes('--help') || args.includes('-h')) {
        showHelp();
        process.exit(0);
    }
    // Positional arguments (like test-pattern scripts)
    const boardCount = args[0] ? parseInt(args[0], 10) : 125;
    const patternsInput = args[1] || 'comeback,cliffhanger,discovery,tease,wave';
    // Validate board count
    if (isNaN(boardCount) || boardCount < 100 || boardCount > 150) {
        console.error(`❌ Error: Board count must be between 100-150, got: ${boardCount}`);
        showHelp();
        process.exit(1);
    }
    // Parse patterns
    const patterns = patternsInput.split(',').map(p => p.trim());
    const validPatterns = Object.keys(AVAILABLE_PATTERNS);
    const invalidPatterns = patterns.filter(p => !validPatterns.includes(p));
    if (invalidPatterns.length > 0) {
        console.error(`❌ Error: Invalid pattern(s): ${invalidPatterns.join(', ')}`);
        console.error(`Available patterns: ${validPatterns.join(', ')}`);
        process.exit(1);
    }
    return {
        patterns,
        boardCounts: [boardCount],
        targetRTP: 0.97,
        createdBy: 'script-generator',
        maxRetries: 10,
        tolerance: 0.02,
        outputDir: './chain-output',
        betSize: 1.0
    };
}
function showHelp() {
    console.log(`
Enhanced Chain Generation Script (JSON Output)

Usage: npm run generate-chains [boardCount] [patterns]

Arguments:
  boardCount    Number of boards per chain (100-150, default: 125)
  patterns      Comma-separated pattern types (default: all patterns)

Examples:
  npm run generate-chains                           # Generate all patterns with 125 boards
  npm run generate-chains 100                      # Generate all patterns with 100 boards  
  npm run generate-chains 125 comeback             # Generate comeback pattern with 125 boards
  npm run generate-chains 150 comeback,wave        # Generate comeback & wave with 150 boards

Available Patterns:
  - comeback     : Recovery-focused pattern for loss-averse players
  - cliffhanger  : High-suspense pattern for risk-seekers
  - discovery    : Exploration-reward pattern for curious players
  - tease        : Near-miss leveraging pattern for all player types
  - wave         : Rhythmic engagement pattern for balanced volatility

Settings:
  - Target RTP: 97%
  - Output Directory: ./chain-output
  - Tolerance: ±2%

Output: Individual JSON files per chain + generation summary
Next Step: Run 'npm run import-chains' to load JSON files into MongoDB
`);
}
/**
 * Generate a single chain using the test-pattern approach
 */
async function generateChain(patternType, boardCount, config) {
    try {
        const startTime = Date.now();
        // Create RTP configuration
        const rtpConfig = {
            targetRTP: config.targetRTP,
            tolerance: config.tolerance,
            boardCount: boardCount,
            betSize: config.betSize,
            playerBudget: boardCount * config.betSize,
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
        // Generate result chain with correct parameters
        const chainResult = await orchestrator.generateResultChain({
            boardCount: boardCount,
            targetRTP: config.targetRTP,
            betSize: config.betSize,
            playerBudget: boardCount * config.betSize,
            difficulty: 2 /* Difficulty.Medium */,
            maxRetries: config.maxRetries,
            tolerance: config.tolerance
        });
        const executionTime = Date.now() - startTime;
        // Calculate metrics
        const totalWagered = chainResult.boards.length * config.betSize;
        let totalWon = 0;
        let featuresTriggered = 0;
        let freeSpinsWon = 0;
        let cascadeCount = 0;
        const winDistribution = {
            losses: 0,
            smallWins: 0,
            mediumWins: 0,
            bigWins: 0 // 5x+
        };
        chainResult.boards.forEach(board => {
            const boardWin = board.totalTumbleWin || 0;
            totalWon += boardWin;
            if (boardWin === 0) {
                winDistribution.losses++;
            }
            else {
                const multiplier = boardWin / config.betSize;
                if (multiplier <= 1)
                    winDistribution.smallWins++;
                else if (multiplier <= 5)
                    winDistribution.mediumWins++;
                else
                    winDistribution.bigWins++;
            }
            // Count features and cascades - access available properties
            if (board.features) {
                featuresTriggered += board.features.length;
            }
            if (board.freeSpinsWon) {
                freeSpinsWon += board.freeSpinsWon;
            }
            // Count tumbles from available properties
            if (board.tumbleCount) {
                cascadeCount += board.tumbleCount;
            }
            else {
                // Default to 1 for boards with any win
                cascadeCount += boardWin > 0 ? 1 : 0;
            }
        });
        const actualRTP = totalWagered > 0 ? totalWon / totalWagered : 0;
        const rtpVariance = Math.abs(actualRTP - config.targetRTP);
        const meetsTarget = rtpVariance <= config.tolerance;
        // Build comprehensive result
        return {
            success: true,
            actualRTP,
            rtpVariance,
            meetsTarget,
            boards: chainResult.boards,
            tumbleStats: {
                totalTumbles: cascadeCount,
                averageTumblesPerBoard: cascadeCount / chainResult.boards.length,
                totalFeatures: featuresTriggered,
                totalFreeSpins: freeSpinsWon
            },
            generationStats: {
                attempts: chainResult.generationAttempts || 1,
                duration: executionTime,
                finalRTP: actualRTP,
                targetAchieved: meetsTarget
            },
            metrics: {
                totalWagered,
                totalWon,
                winDistribution,
                featuresTriggered,
                freeSpinsWon,
                cascadeCount,
                executionTime
            }
        };
    }
    catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown generation error'
        };
    }
}
// Run the script - simplified for ES modules
main().catch(console.error);
