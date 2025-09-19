#!/usr/bin/env ts-node

/**
 * Enhanced Chain Generation Script
 * Generates result chains with 97% RTP target and saves to JSON files
 * Reuses test-pattern functionality for consistent generation
 */

import { ResultChainOrchestrator } from '../cascading-slot/result-chain-orchestrator';
import { BoardGeneratorAdapter } from '../cascading-slot/board-generator-adapter';
import { commonDefinition } from '../cascading-slot/generator-definition';
import { Difficulty } from 'sc-slot-board-generator';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { createPatternSpecificBoardGeneratorFactory, getPatternConfigSummary } from '../cascading-slot/custom-generator-configs';
import { 
    BetConfiguration, 
    BET_LEVELS, 
    COIN_VALUES, 
    generateAllBetConfigurations,
    generateUniqueBetAmountConfigurations,
    getUniqueBetAmounts,
    getTotalBetConfigurations, 
    formatBetConfiguration 
} from './betSettings.js';

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

interface GenerationConfig {
    patterns: string[];
    boardCounts: number[];
    targetRTP: number;
    createdBy: string;
    maxRetries: number;
    tolerance: number;
    outputDir: string;
    betLevel?: number;  // Optional for single config mode
    coinValue?: number; // Optional for single config mode
    betAmounts?: number[]; // For multiple config mode - array of unique bet amounts
}

// Note: BetConfiguration interface and arrays are now imported from betSettings.ts

/**
 * Find a valid bet level/coin value combination for a given base bet amount
 * @param baseBetAmount - Target base bet amount (before multiplier)
 * @returns BetConfiguration that produces the target base bet amount
 */
function findBetConfigForAmount(baseBetAmount: number): BetConfiguration {
    // Find the first valid combination that produces this base bet amount
    for (const betLevel of BET_LEVELS) {
        for (const coinValue of COIN_VALUES) {
            if (Math.abs(betLevel * coinValue - baseBetAmount) < 0.001) { // Handle floating point precision
                return { betLevel, coinValue };
            }
        }
    }
    
    // Fallback: create a reasonable approximation
    // Find the closest bet level for coinValue = 1
    const closestBetLevel = BET_LEVELS.reduce((prev, curr) => 
        Math.abs(curr - baseBetAmount) < Math.abs(prev - baseBetAmount) ? curr : prev
    );
    
    return { betLevel: closestBetLevel, coinValue: 1 };
}

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
        
        // Determine if using single or multiple bet amounts
        // Note: For filename consistency, we use baseBetAmount (not totalBetAmount)
        const betAmounts = config.betAmounts || 
            [config.betLevel! * config.coinValue!]; // baseBetAmount only

        if (config.betAmounts) {
            console.log(`   Bet Amounts: ${betAmounts.length} unique amounts`);
            console.log(`   Range: $${Math.min(...betAmounts).toFixed(2)} - $${Math.max(...betAmounts).toFixed(2)}`);
        } else {
            console.log(`   Bet Level: ${config.betLevel}`);
            console.log(`   Coin Value: $${config.coinValue}`);
            console.log(`   Base Bet Amount: $${betAmounts[0].toFixed(2)} (for filename)`);
            console.log(`   Total Bet Amount: $${(betAmounts[0] * commonDefinition.betSettings.defaultBetMultiplier).toFixed(2)} (for RTP)`);
        }
        
        console.log(`   Max Retries: ${config.maxRetries}`);
        console.log(`   Tolerance: ${(config.tolerance * 100).toFixed(1)}%`);
        console.log(`   Output Dir: ${config.outputDir}`);
        console.log(`   Created By: ${config.createdBy}`);
        console.log('');
        
        // Display pattern-specific configurations
        console.log('🎭 Pattern-Specific Board Generator Configurations:');
        const patternSummary = getPatternConfigSummary();
        config.patterns.forEach(pattern => {
            const summary = patternSummary[pattern as keyof typeof patternSummary];
            if (summary) {
                console.log(`   ${summary}`);
            }
        });
        console.log('');

        // Ensure output directory exists
        if (!existsSync(config.outputDir)) {
            mkdirSync(config.outputDir, { recursive: true });
            console.log(`📁 Created output directory: ${config.outputDir}`);
        }

        // Calculate total chains to generate
        const totalChains = betAmounts.length * config.patterns.length * config.boardCounts.length;
        console.log(`🔄 Generating ${totalChains} chains...`);
        if (betAmounts.length > 1) {
            console.log(`   ${betAmounts.length} bet amounts × ${config.patterns.length} patterns × ${config.boardCounts.length} board counts`);
        }
        console.log('');

        let successCount = 0;
        let failureCount = 0;
        const results = [];

        // 🎯 ENHANCED LOOP: Support multiple bet amounts
        for (const baseBetAmount of betAmounts) {
            if (betAmounts.length > 1) {
                console.log(`💰 Processing base bet amount: $${baseBetAmount.toFixed(2)}`);
            }
            
            for (const pattern of config.patterns) {
                for (const boardCount of config.boardCounts) {
                    const timestamp = Date.now();
                    const baseBetAmountStr = baseBetAmount.toFixed(2).replace('.', '_');
                    const chainName = `${pattern}-${boardCount}boards-bet${baseBetAmountStr}-${timestamp}`;
                    
                    console.log(`🎭 Generating: ${chainName}`);
                    
                    try {
                        // Find a valid bet level/coin value combination for this base bet amount
                        const validConfig = findBetConfigForAmount(baseBetAmount);
                        
                        // Create config with current bet amount
                        const currentConfig = {
                            ...config,
                            betLevel: validConfig.betLevel,
                            coinValue: validConfig.coinValue
                        };
                        
                        const chainResult = await generateChain(pattern, boardCount, currentConfig);
                    
                    if (chainResult.success) {
                        // Save to JSON file
                        const filename = `${chainName}.json`;
                        const filePath = join(config.outputDir, filename);
                        
                        const actualRTP = chainResult.actualRTP || 0;
                        // Create bet data from current base bet amount
                        const totalBetAmount = baseBetAmount * commonDefinition.betSettings.defaultBetMultiplier;
                        const betData = {
                            betLevel: validConfig.betLevel,
                            coinValue: validConfig.coinValue,
                            betMultiplier: commonDefinition.betSettings.defaultBetMultiplier,
                            baseBetAmount: baseBetAmount,
                            totalBetAmount: totalBetAmount
                        };

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
                                generationStats: chainResult.generationStats,
                                betData // Add bet data to metadata
                            },
                            config: {
                                boardCount: boardCount,
                                targetRTP: config.targetRTP,
                                difficulty: 'medium',
                                maxRetries: config.maxRetries,
                                tolerance: config.tolerance,
                                betLevel: config.betLevel,
                                coinValue: config.coinValue
                            },
                            // Filter out deprecated fields from boards and include new multiplier fields
                            boards: chainResult.boards.map(board => ({
                                board: board.board,
                                multipliers: board.multipliers,
                                isFreeSpin: board.isFreeSpin,
                                accumulatedMultiplier: board.accumulatedMultiplier,
                                remainingFreeSpins: board.remainingFreeSpins,
                                freeSpinsPlayed: board.freeSpinsPlayed,
                                freeSpinWins: board.freeSpinWins,
                                freeSpinBoards: board.freeSpinBoards,
                                settlementResult: board.settlementResult,
                                totalTumbleWin: board.totalTumbleWin || 0,        // Raw tumble wins (base + free spins)
                                boardMultiplierSum: board.boardMultiplierSum || 0, // Sum of board multipliers
                                totalWin: board.totalWin || board.totalTumbleWin || 0, // Final win with multipliers applied
                                // Additional fields for debugging multiplier effects
                                multiplierApplied: (board.boardMultiplierSum || 0) > 0,
                                winMultiplier: (board.boardMultiplierSum || 0) > 0 ? (board.boardMultiplierSum || 0) : 1,
                            })),
                            tumbleStats: chainResult.tumbleStats,
                            patternInfo: AVAILABLE_PATTERNS[pattern as keyof typeof AVAILABLE_PATTERNS]
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
                    } else {
                        failureCount++;
                        console.log(`   ❌ Failed: ${chainResult.error}`);
                        results.push({ 
                            success: false, 
                            chainName, 
                            error: chainResult.error 
                        });
                    }
                } catch (error) {
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
        
        // End of bet configuration loop
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

    } catch (error) {
        console.error('❌ Chain generation failed:', error);
        process.exit(1);
    }
}

function parseArguments(args: string[]): GenerationConfig {
    // Show help if requested
    if (args.includes('--help') || args.includes('-h')) {
        showHelp();
        process.exit(0);
    }

    // Check for multiple configurations flag (support both --flag and flag formats for npm compatibility)
    const useMultipleConfigs = args.includes('--all-configs') || args.includes('--multi') || 
                              args.includes('all-configs') || args.includes('multi');
    
    // Filter out flags from positional arguments
    const positionalArgs = args.filter(arg => 
        !arg.startsWith('--') && 
        arg !== 'all-configs' && 
        arg !== 'multi'
    );

    // Positional arguments (like test-pattern scripts)
    const boardCount = positionalArgs[0] ? parseInt(positionalArgs[0], 10) : 125;
    const patternsInput = positionalArgs[1] || 'comeback,cliffhanger,discovery,tease,wave';
    
    let betLevel: number | undefined;
    let coinValue: number | undefined;
    let betAmounts: number[] | undefined;

    if (useMultipleConfigs) {
        // Generate unique bet amounts (reduces file count by grouping duplicate bet amounts)
        betAmounts = getUniqueBetAmounts();
        const totalPossible = getTotalBetConfigurations();
        console.log(`🎯 Multiple configuration mode: ${betAmounts.length} unique bet amounts (reduced from ${totalPossible} total combinations)`);
    } else {
        // Single configuration mode
        betLevel = positionalArgs[2] ? parseFloat(positionalArgs[2]) : 0.5;
        coinValue = positionalArgs[3] ? parseFloat(positionalArgs[3]) : 0.1;
    }
    
    // Validate board count (allow smaller counts for testing)
    if (isNaN(boardCount) || boardCount < 10 || boardCount > 150) {
        console.error(`❌ Error: Board count must be between 10-150, got: ${boardCount}`);
        showHelp();
        process.exit(1);
    }

    // Validate betLevel and coinValue (only for single config mode)
    if (!useMultipleConfigs) {
        if (isNaN(betLevel!) || betLevel! < 0.1 || betLevel! > 10.0) {
            console.error(`❌ Error: Bet level must be between 0.1-10.0, got: ${betLevel}`);
            showHelp();
            process.exit(1);
        }

        if (isNaN(coinValue!) || coinValue! < 0.01 || coinValue! > 2.0) {
            console.error(`❌ Error: Coin value must be between 0.01-2.0, got: ${coinValue}`);
            showHelp();
            process.exit(1);
        }
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
        betLevel,
        coinValue,
        betAmounts
    };
}

function showHelp(): void {
    console.log(`
Enhanced Chain Generation Script (JSON Output)

Usage: 
  Single Configuration:
    npm run generate-chains [boardCount] [patterns] [betLevel] [coinValue]
  
  Multiple Configurations:
    npm run generate-chains [boardCount] [patterns] multi
    npm run generate-chains [boardCount] [patterns] all-configs

Arguments:
  boardCount    Number of boards per chain (10-150, default: 125)
  patterns      Comma-separated pattern types (default: all patterns)
  betLevel      Bet level multiplier (0.1-10.0, default: 0.5) [single mode only]
  coinValue     Coin value in currency (0.01-2.0, default: 0.1) [single mode only]

Flags:
  multi         Generate chains for all unique bet amounts (grouped combinations)       
  all-configs   Alias for multi
  --help, -h    Show this help message

Multiple Configuration Arrays:
  Bet Levels: [${BET_LEVELS.join(', ')}]
  Coin Values: [${COIN_VALUES.join(', ')}]
  Unique Bet Amounts: ${getUniqueBetAmounts().length} (grouped from ${getTotalBetConfigurations()} total combinations)

Examples:
  Single Configuration Mode:
    npm run generate-chains                         # All patterns, 125 boards, default bet settings
    npm run generate-chains 100                    # All patterns, 100 boards, default bet settings
    npm run generate-chains 100 tease              # Tease pattern only, 100 boards
    npm run generate-chains 100 "tease,wave" 1.0 0.5 # Custom bet: level 1.0, coin 0.5
  
  Multiple Configuration Mode:
    npm run generate-chains 50 tease multi # Tease pattern, ~27 unique bet amounts
    npm run generate-chains 30 multi       # All patterns, ~27 amounts each
    npm run generate-chains 25 "comeback,wave" all-configs # 2 patterns × ~27 amounts

Available Patterns (with automatic board generator configuration):
  - comeback     : 🛡️  Recovery pattern → Easy difficulty, 1x-18x multipliers, frequent wins
  - cliffhanger  : 🎲  High-suspense pattern → Hard difficulty, 3x-50x multipliers, rare big wins  
  - discovery    : 🔍  Exploration pattern → Medium difficulty, 2x-30x multipliers, feature-rich
  - tease        : ⚖️   Near-miss pattern → Medium difficulty, 2x-25x multipliers, balanced
  - wave         : 🌊  Rhythmic pattern → Medium difficulty, 2x-21x multipliers, consistent

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
async function generateChain(patternType: string, boardCount: number, config: GenerationConfig) {
    try {
        const startTime = Date.now();
        
        // Calculate bet amounts following correct rules
        const coinValue = config.coinValue || 0.1;
        const betLevel = config.betLevel || 0.5;
        const betMultiplier = commonDefinition.betSettings.defaultBetMultiplier;
        const baseBetAmount = coinValue * betLevel;
        const totalBetAmount = baseBetAmount * betMultiplier;
        
        // Create RTP configuration (RTP calculations use totalBetAmount)
        const rtpConfig = {
            targetRTP: config.targetRTP,
            tolerance: config.tolerance,
            boardCount: boardCount,
            betSize: totalBetAmount, // RTP calculations use total bet amount
            playerBudget: boardCount * totalBetAmount,
        };

        // ===============================
        // 🎭 BOARD GENERATOR (TEMPORARY BYPASS FOR TESTING)
        // ===============================
        
        // TEMPORARY: Use standard configuration to test critical tumbles fix
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
        
        console.log(`🎯 Pattern: ${patternType.toUpperCase()} (using standard config for testing)`);
        console.log(`📋 Testing: Critical tumbles fix - all boards should have at least 1 tumble`);
        console.log('');

        const orchestrator = new ResultChainOrchestrator(boardGeneratorFactory, rtpConfig);

        // Generate result chain with correct parameters
        const chainResult = await orchestrator.generateResultChain({
            boardCount: boardCount,
            targetRTP: config.targetRTP,
            difficulty: Difficulty.Medium,
            maxRetries: config.maxRetries,
            tolerance: config.tolerance,
            betLevel: config.betLevel,
            coinValue: config.coinValue
        });

        const executionTime = Date.now() - startTime;

        // Calculate metrics (use totalBetAmount for wagering calculations)
        const totalWagered = chainResult.boards.length * totalBetAmount;
        let totalWon = 0;
        let featuresTriggered = 0;
        let freeSpinsWon = 0;
        let cascadeCount = 0;

        const winDistribution = {
            losses: 0,
            smallWins: 0,  // 0.1x - 1x
            mediumWins: 0, // 1x - 5x
            bigWins: 0     // 5x+
        };

        chainResult.boards.forEach(board => {
            // Use new totalWin field that includes board multipliers, fallback to totalTumbleWin
            const boardWin = board.totalWin || board.totalTumbleWin || 0;
            totalWon += boardWin;
            
            if (boardWin === 0) {
                winDistribution.losses++;
            } else {
                const multiplier = boardWin / totalBetAmount; // Correct multiplier calculation
                if (multiplier <= 1) winDistribution.smallWins++;
                else if (multiplier <= 5) winDistribution.mediumWins++;
                else winDistribution.bigWins++;
            }
            
            // Count features and cascades - access available properties
            if ((board as any).features) {
                featuresTriggered += (board as any).features.length;
            }
            if ((board as any).freeSpinsWon) {
                freeSpinsWon += (board as any).freeSpinsWon;
            }
            // Count tumbles from available properties
            if ((board as any).tumbleCount) {
                cascadeCount += (board as any).tumbleCount;
            } else {
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
                attempts: (chainResult as any).generationAttempts || 1,
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
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown generation error'
        };
    }
}

// Run the script - simplified for ES modules
main().catch(console.error);
