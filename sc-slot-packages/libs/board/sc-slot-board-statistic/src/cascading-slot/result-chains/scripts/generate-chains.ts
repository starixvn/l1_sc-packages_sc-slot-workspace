#!/usr/bin/env ts-node

/**
 * Enhanced Chain Generation Script
 * Generates result chains with 97% RTP target and saves to JSON files
 * Reuses test-pattern functionality for consistent generation
 */

import { ResultChainOrchestrator } from '../orchestration/result-chain-orchestrator';
import { Volatility } from 'sc-slot-board-generator/lib/volatility';
import { commonDefinition } from '../../generator-definition';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { createPatternSpecificBoardGeneratorFactory, getPatternConfigSummary } from '../orchestration/custom-generator-configs';
import {
    BetConfiguration,
    BET_LEVELS,
    COIN_VALUES,
    getUniqueBetAmounts,
    getTotalBetConfigurations,
} from './betSettings';
import { PATTERN_CONFIGS } from '../orchestration/custom-generator-configs';
import { calculateFreeSpinAward } from '../utils/free-spin-utils';
import { defaultOdds } from '../../generator-definition';

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
    volatility?: Volatility; // Optional volatility override (from command line)
}

// Note: BetConfiguration interface and arrays are now imported from betSettings.ts

/**
 * Parse volatility string to enum value
 * @param volatilityStr - String representation (e.g., "MediumLow", "VeryHigh", "2", "5")
 * @returns Volatility enum value
 */
function parseVolatility(volatilityStr: string): Volatility {
    // Support both string names and numeric values
    const volatilityMap: { [key: string]: Volatility } = {
        'low': Volatility.Low,
        'mediumlow': Volatility.MediumLow,
        'medium': Volatility.Medium,
        'high': Volatility.High,
        'veryhigh': Volatility.VeryHigh,
        '1': Volatility.Low,
        '2': Volatility.MediumLow,
        '3': Volatility.Medium,
        '4': Volatility.High,
        '5': Volatility.VeryHigh
    };
    
    const normalized = volatilityStr.toLowerCase().replace(/[_-]/g, '');
    const volatility = volatilityMap[normalized];
    
    if (!volatility) {
        throw new Error(`Invalid volatility: ${volatilityStr}. Valid values: Low, MediumLow, Medium, High, VeryHigh (or 1-5)`);
    }
    
    return volatility;
}

/**
 * Get volatility name for display
 */
function getVolatilityName(volatility: Volatility): string {
    const names = {
        [Volatility.Low]: 'Low',
        [Volatility.MediumLow]: 'MediumLow',
        [Volatility.Medium]: 'Medium',
        [Volatility.High]: 'High',
        [Volatility.VeryHigh]: 'VeryHigh'
    };
    return names[volatility] || 'Unknown';
}

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
        console.log(`   Volatility: ${config.volatility ? getVolatilityName(config.volatility) : 'Pattern-Default'}`);
        
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
                    
                    // Determine volatility to use (CLI override or pattern default)
                    const patternConfig = PATTERN_CONFIGS[pattern];
                    const effectiveVolatility = config.volatility || patternConfig?.volatility || Volatility.MediumLow;
                    const volatilityStr = getVolatilityName(effectiveVolatility).toLowerCase();
                    
                    const chainName = `${pattern}-${volatilityStr}-${boardCount}boards-bet${baseBetAmountStr}-${timestamp}`;
                    
                    console.log(`🎭 Generating: ${chainName}`);
                    
                    try {
                        // Find a valid bet level/coin value combination for this base bet amount
                        const validConfig = findBetConfigForAmount(baseBetAmount);
                        
                        // Create config with current bet amount
                        const currentConfig = {
                            ...config,
                            betLevel: validConfig.betLevel,
                            coinValue: validConfig.coinValue,
                            volatility: effectiveVolatility  // Pass effective volatility
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

                        // Get the effective volatility that was used for generation
                        const patternConfigForSave = PATTERN_CONFIGS[pattern];
                        const effectiveVolatilityForSave = config.volatility || patternConfigForSave?.volatility || Volatility.MediumLow;
                        const volatilityName = getVolatilityName(effectiveVolatilityForSave);
                        
                        const chainData = {
                            metadata: {
                                name: chainName,
                                patternType: pattern,
                                boardCount: boardCount,
                                targetRTP: chainResult.targetRTP,  // Use pattern-specific target RTP from generateChain result
                                actualRTP: actualRTP,
                                rtpVariance: chainResult.rtpResult.variance,  // Use RTP controller's variance calculation
                                meetsTargetRTP: chainResult.rtpResult.meetsTarget,  // Use RTP controller's meets target result
                                createdBy: config.createdBy,
                                generatedAt: new Date().toISOString(),
                                generationStats: chainResult.generationStats,
                                betData // Add bet data to metadata
                            },
                            config: {
                                boardCount: boardCount,
                                targetRTP: config.targetRTP,
                                volatility: volatilityName,  // Use actual volatility that was used
                                maxRetries: config.maxRetries,
                                tolerance: config.tolerance,
                                betLevel: config.betLevel,
                                coinValue: config.coinValue
                            },
                            // Filter out deprecated fields from boards and include new multiplier fields
                            boards: chainResult.boards.map(board => ({
                                board: board.board,
                                multipliers: board.multipliers,
                                accumulatedMultiplier: board.accumulatedMultiplier,
                                settlementResult: board.settlementResult,
                                totalTumbleWin: board.totalTumbleWin || 0,        // Raw tumble wins
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
    const volatilityInput = positionalArgs[2]; // New: volatility parameter
    
    let betLevel: number | undefined;
    let coinValue: number | undefined;
    let betAmounts: number[] | undefined;
    let volatility: Volatility | undefined;

    // Parse volatility if provided
    if (volatilityInput) {
        try {
            volatility = parseVolatility(volatilityInput);
            console.log(`🎰 Using custom volatility: ${getVolatilityName(volatility)}`);
        } catch (error) {
            console.error(`❌ ${error.message}`);
            showHelp();
            process.exit(1);
        }
    }

    if (useMultipleConfigs) {
        // Generate unique bet amounts (reduces file count by grouping duplicate bet amounts)
        betAmounts = getUniqueBetAmounts();
        const totalPossible = getTotalBetConfigurations();
        console.log(`🎯 Multiple configuration mode: ${betAmounts.length} unique bet amounts (reduced from ${totalPossible} total combinations)`);
    } else {
        // Single configuration mode - bet parameters shift to position 3 and 4
        betLevel = positionalArgs[3] ? parseFloat(positionalArgs[3]) : 0.5;
        coinValue = positionalArgs[4] ? parseFloat(positionalArgs[4]) : 0.1;
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
        betAmounts,
        volatility
    };
}

function showHelp(): void {
    console.log(`
Enhanced Chain Generation Script (JSON Output)

Usage: 
  Single Configuration:
    npm run generate-chains [boardCount] [patterns] [volatility] [betLevel] [coinValue]
  
  Multiple Configurations:
    npm run generate-chains [boardCount] [patterns] [volatility] multi
    npm run generate-chains [boardCount] [patterns] [volatility] all-configs

Arguments:
  boardCount    Number of boards per chain (10-150, default: 125)
  patterns      Comma-separated pattern types (default: all patterns)
  volatility    Game volatility: Low, MediumLow, Medium, High, VeryHigh (or 1-5)
                If omitted, uses pattern's default volatility
  betLevel      Bet level multiplier (0.1-10.0, default: 0.5) [single mode only]
  coinValue     Coin value in currency (0.01-2.0, default: 0.1) [single mode only]

Flags:
  multi         Generate chains for all unique bet amounts (grouped combinations)       
  all-configs   Alias for multi
  --help, -h    Show this help message

Volatility Values:
  Low (1)       - Frequent small wins, low variance
  MediumLow (2) - Balanced small-medium wins (default for most patterns)
  Medium (3)    - Moderate variance, mixed win sizes
  High (4)      - Higher variance, occasional big wins
  VeryHigh (5)  - Rare massive wins, high risk/reward

Multiple Configuration Arrays:
  Bet Levels: [${BET_LEVELS.join(', ')}]
  Coin Values: [${COIN_VALUES.join(', ')}]
  Unique Bet Amounts: ${getUniqueBetAmounts().length} (grouped from ${getTotalBetConfigurations()} total combinations)

Examples:
  Single Configuration Mode:
    npm run generate-chains                              # All patterns, default volatility per pattern
    npm run generate-chains 100                          # 100 boards, default volatility
    npm run generate-chains 100 tease VeryHigh          # Tease pattern with VeryHigh volatility
    npm run generate-chains 100 "tease,wave" MediumLow  # Multiple patterns, MediumLow volatility
    npm run generate-chains 100 comeback 5 1.0 0.5      # Comeback with VeryHigh(5), custom bet
  
  Multiple Configuration Mode:
    npm run generate-chains 50 tease VeryHigh multi     # Tease + VeryHigh, all bet amounts
    npm run generate-chains 30 comeback Low multi        # Comeback + Low volatility, all bets
    npm run generate-chains 25 "comeback,wave" 2 all-configs # 2 patterns, MediumLow(2)

Available Patterns:
  - comeback     : 🛡️  Recovery pattern (default: MediumLow)
  - cliffhanger  : 🎲  High-suspense pattern (default: VeryHigh)
  - discovery    : 🔍  Exploration pattern (default: MediumLow)
  - tease        : ⚖️   Near-miss pattern (default: MediumLow)
  - wave         : 🌊  Rhythmic pattern (default: MediumLow)

Note: Volatility parameter OVERRIDES pattern defaults to match game configuration

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
        // 🎭 PATTERN-SPECIFIC BOARD GENERATOR
        // ===============================
        
        // Get pattern-specific generator and engagement mechanics with volatility override
        const volatilityOverride = config.volatility; // Use volatility from CLI if provided
        const { generatorFactory, engagementMechanics } = createPatternSpecificBoardGeneratorFactory(patternType, volatilityOverride);
        
        // Use custom RTP from engagement mechanics or fall back to config default
        const targetRTP = engagementMechanics?.targetRTP || config.targetRTP;
        const tolerance = engagementMechanics?.rtpTolerance || config.tolerance;
        const freeSpinRTP = engagementMechanics?.freeSpinRTP || defaultOdds.freeSpins.rtp || 0.3;
        
        // Update RTP configuration with pattern-specific values
        const patternRtpConfig = {
            ...rtpConfig,
            targetRTP,
            tolerance,
        };
        
        console.log(`🎯 Pattern: ${patternType.toUpperCase()}`);
        console.log(`📋 RTP Config: Target ${(targetRTP * 100).toFixed(1)}% ± ${(tolerance * 100).toFixed(1)}%`);
        console.log(`   Free Spin RTP: ${(freeSpinRTP * 100).toFixed(0)}%`);
        if (engagementMechanics) {
            if (engagementMechanics.targetHitFrequency) {
                console.log(`   Hit Frequency Target: ${(engagementMechanics.targetHitFrequency * 100).toFixed(0)}%`);
            }
            if (engagementMechanics.cascadeTarget) {
                console.log(`   Cascade Target: ${engagementMechanics.cascadeTarget} tumbles`);
            }
        }
        console.log('');

        const orchestrator = new ResultChainOrchestrator(generatorFactory, patternRtpConfig, engagementMechanics);

        // Determine effective volatility (CLI override or pattern default)
        const patternConfig = PATTERN_CONFIGS[patternType];
        const effectiveVolatility = config.volatility || patternConfig?.volatility || Volatility.MediumLow;
        
        // Generate result chain with pattern-specific parameters
        const chainResult = await orchestrator.generateResultChain({
            boardCount: boardCount,
            targetRTP: targetRTP,  // Use pattern-specific RTP
            volatility: effectiveVolatility,  // Use effective volatility (CLI override or pattern default)
            maxRetries: config.maxRetries,
            tolerance: tolerance,  // Use pattern-specific tolerance
            betLevel: config.betLevel,
            coinValue: config.coinValue
        });

        const executionTime = Date.now() - startTime;

        // Use complete RTP result from orchestrator - no RTP calculations needed here
        const rtpResult = chainResult.rtpResult; // Complete RTP analysis from RTP controller

        let featuresTriggered = 0;
        let freeSpinsWon = 0;
        let freeSpinsPlayed = 0;
        let cascadeCount = 0;

        const winDistribution = {
            losses: 0,
            smallWins: 0,  // 0.1x - 1x
            mediumWins: 0, // 1x - 5x
            bigWins: 0     // 5x+
        };

        chainResult.boards.forEach(board => {
            // Count scatter symbols for statistics only
            const scatterCount = board.board.filter(symbol => symbol === 9).length;
            const freeSpinCount = calculateFreeSpinAward(scatterCount, false); // Base game mode
            freeSpinsPlayed += freeSpinCount;

            // Use totalWin field for statistics
            const boardWin = board.totalWin || board.totalTumbleWin || 0;

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

        // Build comprehensive result - RTP calculations handled by RTP controller
        return {
            success: true,
            actualRTP: rtpResult.actualRTP,
            rtpVariance: rtpResult.variance,
            meetsTarget: rtpResult.meetsTarget,
            rtpResult, // Include full RTP result for metadata
            targetRTP, // Include pattern-specific target RTP
            boards: chainResult.boards,
            tumbleStats: {
                totalTumbles: cascadeCount,
                averageTumblesPerBoard: cascadeCount / chainResult.boards.length,
                totalFeatures: featuresTriggered,
                totalFreeSpinsWon: freeSpinsWon,
                totalFreeSpinsPlayed: freeSpinsPlayed
            },
            generationStats: {
                attempts: (chainResult as any).generationAttempts || 1,
                duration: executionTime,
                finalRTP: rtpResult.actualRTP,
                targetAchieved: rtpResult.meetsTarget
            },
            metrics: {
                totalWagered: rtpResult.totalBets,
                totalWon: rtpResult.totalWins,
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
