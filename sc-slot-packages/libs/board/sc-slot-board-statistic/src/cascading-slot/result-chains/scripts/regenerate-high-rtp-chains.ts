#!/usr/bin/env ts-node

/**
 * Regenerate High RTP Chains Script
 *
 * This script:
 * 1. Detects chains with wrong free spin counts using revalidate-freespin-chains logic
 * 2. Filters for chains that have HIGH RTP after correction
 * 3. Regenerates each chain with the same input parameters:
 *    - betLevel, coinValue, boardCount, volatility, patternType
 * 4. Saves regenerated chains to JSON files for import
 *
 * Usage:
 *   npm run regenerate-high-rtp-chains
 *   npm run regenerate-high-rtp-chains -- --tolerance 0.02 --dry-run
 */

import { connectDatabase } from '../database/connection';
import { ResultChainRepository } from '../database/repositories/result-chain-repository';
import { ResultChainOrchestrator } from '../orchestration/result-chain-orchestrator';
import { createPatternSpecificBoardGeneratorFactory } from '../orchestration/custom-generator-configs';
import { PATTERN_CONFIGS } from '../orchestration/custom-generator-configs';
import { Volatility } from 'sc-slot-board-generator/lib/volatility';
import { commonDefinition, defaultOdds } from '../../generator-definition';
import { calculateTotalHouseExpenditure, calculateFreeSpinAward } from '../utils/free-spin-utils';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const SCATTER_SYMBOL = 9;
const SCATTER_TRIGGER_COUNT = 4;
const EXPECTED_FREESPIN_COUNT = 15;

// Valid pattern types for chain generation
const VALID_PATTERNS = ['comeback', 'cliffhanger', 'discovery', 'tease', 'wave'];

/**
 * Extract pattern type from chain name if patternType field is missing
 * Chain names follow format: {pattern}-{volatility}-{boards}boards-bet{amount}-{timestamp}
 * Example: comeback-mediumlow-100boards-bet0_50-1760942759840
 */
function extractPatternFromName(chainName: string): string | null {
    if (!chainName) return null;

    const nameLower = chainName.toLowerCase();

    for (const pattern of VALID_PATTERNS) {
        if (nameLower.startsWith(pattern + '-') || nameLower.startsWith(pattern + '_')) {
            return pattern;
        }
    }

    return null;
}

/**
 * Extract volatility from chain name if volatility field is missing
 * Chain names follow format: {pattern}-{volatility}-{boards}boards-bet{amount}-{timestamp}
 */
function extractVolatilityFromName(chainName: string): Volatility | null {
    if (!chainName) return null;

    const nameLower = chainName.toLowerCase();

    const volatilityMap: { [key: string]: Volatility } = {
        'low': Volatility.Low,
        'mediumlow': Volatility.MediumLow,
        'medium': Volatility.Medium,
        'high': Volatility.High,
        'veryhigh': Volatility.VeryHigh
    };

    for (const [name, value] of Object.entries(volatilityMap)) {
        if (nameLower.includes('-' + name + '-') || nameLower.includes('_' + name + '_')) {
            return value;
        }
    }

    return null;
}

interface RegenerationConfig {
    tolerance: number;
    limit: number;
    dryRun: boolean;
    outputDir: string;
}

interface ChainToRegenerate {
    chainId: string;
    chainName: string;
    patternType: string;
    volatility: number;
    boardCount: number;
    betLevel: number;
    coinValue: number;
    baseBetAmount: number;
    correctedRTP: number;
    targetRTP: number;
}

/**
 * Count max scatter symbols (symbol 9) from ALL tumbles newBoard
 */
function countScatterSymbols(board: any): number {
    const tumbles = board.settlementResult?.tumbles;
    if (!tumbles || !Array.isArray(tumbles) || tumbles.length === 0) {
        return 0;
    }

    let maxScatterCount = 0;

    for (const tumble of tumbles) {
        const boardString = tumble.newBoard || tumble.originalBoard;

        if (!boardString || typeof boardString !== 'string') {
            continue;
        }

        const symbols = boardString.split(',').map((s: string) => parseInt(s.trim(), 10));
        const scatterCount = symbols.filter((s: number) => s === SCATTER_SYMBOL).length;

        if (scatterCount > maxScatterCount) {
            maxScatterCount = scatterCount;
        }
    }

    return maxScatterCount;
}

/**
 * Analyze chain and determine if it needs regeneration (HIGH RTP after free spin correction)
 */
function analyzeChainForRegeneration(chainData: any, tolerance: number): ChainToRegenerate | null {
    try {
        const boards = chainData.boardsData;
        const boardCount = chainData.totalBoardCount;
        const betLevel = chainData.betLevel;
        const coinValue = chainData.coinValue;
        const baseBetAmount = chainData.baseBetAmount;
        const betMultiplier = 20;
        const totalBetAmount = baseBetAmount * betMultiplier;

        // Calculate total wins
        const totalWin = boards.reduce((sum: number, board: any) => sum + (board.totalWin || 0), 0);

        // Analyze free spins - count corrected free spins
        let correctedTotalFreeSpins = 0;
        let boardsWithWrongFreeSpins = 0;

        boards.forEach((board: any) => {
            const scatterCount = countScatterSymbols(board);
            const originalFreeSpins = board.settlementResult?.freeSpins?.odds || 0;

            // Count corrected free spins based on scatter detection
            if (scatterCount >= SCATTER_TRIGGER_COUNT) {
                correctedTotalFreeSpins += EXPECTED_FREESPIN_COUNT;

                // Check if this board has wrong free spin count
                if (originalFreeSpins !== EXPECTED_FREESPIN_COUNT) {
                    boardsWithWrongFreeSpins++;
                }
            }
        });

        // Skip chains that don't have any free spin issues
        if (boardsWithWrongFreeSpins === 0) {
            return null;
        }

        // Calculate corrected house expenditure and RTP
        const correctedHouseExpenditure = calculateTotalHouseExpenditure(
            correctedTotalFreeSpins,
            totalBetAmount
        );

        const totalBets = boardCount * totalBetAmount;
        const correctedRTP = (totalWin + correctedHouseExpenditure) / totalBets;

        // Target RTP
        const targetRTP = 0.96;
        const correctedVariance = correctedRTP - targetRTP;

        // Only return chains with HIGH RTP after correction
        if (correctedVariance <= tolerance) {
            return null; // PASS or LOW - no need to regenerate
        }

        // Determine pattern type - use field or extract from name
        let patternType = chainData.patternType;
        if (!patternType || patternType === 'unknown') {
            patternType = extractPatternFromName(chainData.name);
        }

        // Skip chains with unknown/unextractable pattern type
        if (!patternType || !VALID_PATTERNS.includes(patternType)) {
            console.warn(`Skipping chain ${chainData.name}: Cannot determine pattern type`);
            return null;
        }

        // Determine volatility - use field or extract from name
        let volatility = chainData.volatility;
        if (!volatility || volatility === 0) {
            volatility = extractVolatilityFromName(chainData.name) || Volatility.MediumLow;
        }

        return {
            chainId: chainData._id.toString(),
            chainName: chainData.name,
            patternType,
            volatility,
            boardCount,
            betLevel,
            coinValue,
            baseBetAmount,
            correctedRTP,
            targetRTP
        };
    } catch (error) {
        console.error(`Error analyzing chain ${chainData.name}:`, error);
        return null;
    }
}

/**
 * Get volatility name for display
 */
function getVolatilityName(volatility: Volatility): string {
    const names: { [key: number]: string } = {
        [Volatility.Low]: 'Low',
        [Volatility.MediumLow]: 'MediumLow',
        [Volatility.Medium]: 'Medium',
        [Volatility.High]: 'High',
        [Volatility.VeryHigh]: 'VeryHigh'
    };
    return names[volatility] || 'Unknown';
}

/**
 * Regenerate a single chain with the same parameters
 */
async function regenerateChain(
    chainInfo: ChainToRegenerate,
    config: RegenerationConfig
): Promise<{ success: boolean; filename?: string; error?: string; actualRTP?: number }> {
    try {
        const {
            patternType,
            volatility,
            boardCount,
            betLevel,
            coinValue,
            baseBetAmount
        } = chainInfo;

        const betMultiplier = commonDefinition.betSettings.defaultBetMultiplier;
        const totalBetAmount = baseBetAmount * betMultiplier;

        // Create RTP configuration
        const rtpConfig = {
            targetRTP: 0.97,
            tolerance: config.tolerance,
            boardCount: boardCount,
            betSize: totalBetAmount,
            playerBudget: boardCount * totalBetAmount,
        };

        // Get pattern-specific generator with volatility override
        const { generatorFactory, engagementMechanics } = createPatternSpecificBoardGeneratorFactory(
            patternType,
            volatility as Volatility
        );

        // Use custom RTP from engagement mechanics or fall back to config default
        const targetRTP = engagementMechanics?.targetRTP || 0.97;
        const tolerance = engagementMechanics?.rtpTolerance || config.tolerance;

        const patternRtpConfig = {
            ...rtpConfig,
            targetRTP,
            tolerance,
        };

        const orchestrator = new ResultChainOrchestrator(generatorFactory, patternRtpConfig, engagementMechanics);

        // Generate result chain with same parameters
        const chainResult = await orchestrator.generateResultChain({
            boardCount: boardCount,
            targetRTP: targetRTP,
            volatility: volatility as Volatility,
            maxRetries: 10,
            tolerance: tolerance,
            betLevel: betLevel,
            coinValue: coinValue
        });

        const rtpResult = chainResult.rtpResult;

        // Generate new chain name with timestamp
        const timestamp = Date.now();
        const baseBetAmountStr = baseBetAmount.toFixed(2).replace('.', '_');
        const volatilityStr = getVolatilityName(volatility as Volatility).toLowerCase();
        const newChainName = `${patternType}-${volatilityStr}-${boardCount}boards-bet${baseBetAmountStr}-${timestamp}`;

        // Save to JSON file
        const filename = `${newChainName}.json`;
        const filePath = join(config.outputDir, filename);

        const chainData = {
            metadata: {
                name: newChainName,
                patternType: patternType,
                boardCount: boardCount,
                targetRTP: targetRTP,
                actualRTP: rtpResult.actualRTP,
                rtpVariance: rtpResult.variance,
                meetsTargetRTP: rtpResult.meetsTarget,
                createdBy: 'regenerate-high-rtp-chains',
                generatedAt: new Date().toISOString(),
                regeneratedFrom: chainInfo.chainName,
                betData: {
                    betLevel: betLevel,
                    coinValue: coinValue,
                    betMultiplier: betMultiplier,
                    baseBetAmount: baseBetAmount,
                    totalBetAmount: totalBetAmount
                }
            },
            config: {
                boardCount: boardCount,
                targetRTP: targetRTP,
                volatility: getVolatilityName(volatility as Volatility),
                maxRetries: 10,
                tolerance: tolerance,
                betLevel: betLevel,
                coinValue: coinValue
            },
            boards: chainResult.boards.map(board => ({
                board: board.board,
                multipliers: board.multipliers,
                accumulatedMultiplier: board.accumulatedMultiplier,
                settlementResult: board.settlementResult,
                totalTumbleWin: board.totalTumbleWin || 0,
                boardMultiplierSum: board.boardMultiplierSum || 0,
                totalWin: board.totalWin || board.totalTumbleWin || 0,
                multiplierApplied: (board.boardMultiplierSum || 0) > 0,
                winMultiplier: (board.boardMultiplierSum || 0) > 0 ? (board.boardMultiplierSum || 0) : 1,
            }))
        };

        writeFileSync(filePath, JSON.stringify(chainData, null, 2));

        return {
            success: true,
            filename,
            actualRTP: rtpResult.actualRTP
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

/**
 * Parse command line arguments
 */
function parseArguments(args: string[]): RegenerationConfig {
    const config: RegenerationConfig = {
        tolerance: 0.02,
        limit: 10000,
        dryRun: false,
        outputDir: './chain-output'
    };

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        switch (arg) {
            case '--tolerance':
            case '-t':
                config.tolerance = parseFloat(args[++i]) || config.tolerance;
                break;
            case '--limit':
            case '-l':
                config.limit = parseInt(args[++i]) || config.limit;
                break;
            case '--dry-run':
            case '-d':
            case 'dry-run':
                config.dryRun = true;
                break;
            case '--output':
            case '-o':
                config.outputDir = args[++i] || config.outputDir;
                break;
            case '--help':
            case '-h':
                showHelp();
                process.exit(0);
        }
    }

    return config;
}

function showHelp(): void {
    console.log(`
Regenerate High RTP Chains Script

This script detects chains with wrong free spin counts, identifies those with
HIGH RTP after correction, and regenerates them with the same input parameters.

Usage: npm run regenerate-high-rtp-chains [options]

Options:
  --tolerance, -t <number>   RTP tolerance as decimal (default: 0.02 for +2%)
  --limit, -l <number>       Maximum chains to analyze (default: 10000)
  --dry-run, -d              Preview only, don't regenerate
  --output, -o <path>        Output directory (default: ./chain-output)
  --help, -h                 Show this help message

Examples:
  npm run regenerate-high-rtp-chains
  npm run regenerate-high-rtp-chains -- --dry-run
  npm run regenerate-high-rtp-chains -- --tolerance 0.01 --output ./new-chains
`);
}

/**
 * Main function
 */
async function main() {
    const args = process.argv.slice(2);
    const config = parseArguments(args);

    console.log('Regenerate High RTP Chains Script');
    console.log('='.repeat(70));
    console.log(`Scatter Symbol: ${SCATTER_SYMBOL}`);
    console.log(`Trigger Count: ${SCATTER_TRIGGER_COUNT}+ scatters`);
    console.log(`Expected Free Spins: ${EXPECTED_FREESPIN_COUNT}`);
    console.log(`RTP Tolerance: +${(config.tolerance * 100).toFixed(1)}%`);
    console.log(`Mode: ${config.dryRun ? 'DRY RUN (preview only)' : 'REGENERATE'}`);
    console.log(`Output Directory: ${config.outputDir}`);
    console.log('');

    try {
        // Connect to database
        console.log('Connecting to MongoDB...');
        const dbConnection = await connectDatabase();
        console.log('Database connected successfully\n');

        // Initialize repository
        const chainRepository = new ResultChainRepository();

        // Fetch all chains
        console.log('Fetching chains from database...');
        const { chains, total } = await chainRepository.getFiltered({}, config.limit, 0);
        console.log(`Found ${total} chains total, analyzing ${chains.length}\n`);

        if (chains.length === 0) {
            console.log('No chains found in database');
            if (dbConnection && dbConnection.close) {
                await dbConnection.close();
            }
            process.exit(0);
        }

        // Analyze chains and find those needing regeneration
        console.log('Analyzing chains for HIGH RTP after free spin correction...\n');
        const chainsToRegenerate: ChainToRegenerate[] = [];

        for (const chain of chains) {
            const result = analyzeChainForRegeneration(chain, config.tolerance);
            if (result) {
                chainsToRegenerate.push(result);
            }
        }

        // Sort by corrected RTP descending
        chainsToRegenerate.sort((a, b) => b.correctedRTP - a.correctedRTP);

        console.log('='.repeat(70));
        console.log('      CHAINS TO REGENERATE (HIGH RTP after correction)');
        console.log('='.repeat(70));

        console.log(`\nTotal chains analyzed: ${chains.length}`);
        console.log(`Chains with HIGH RTP needing regeneration: ${chainsToRegenerate.length}`);

        if (chainsToRegenerate.length === 0) {
            console.log('\nNo chains need regeneration. All chains within tolerance.');
            if (dbConnection && dbConnection.close) {
                await dbConnection.close();
            }
            process.exit(0);
        }

        console.log('\nChains to regenerate:');
        console.log('-'.repeat(70));

        chainsToRegenerate.forEach((chain, index) => {
            console.log(`\n${index + 1}. ${chain.chainName}`);
            console.log(`   ID: ${chain.chainId}`);
            console.log(`   Pattern: ${chain.patternType} | Volatility: ${chain.volatility}`);
            console.log(`   Boards: ${chain.boardCount}`);
            console.log(`   Bet: Level=${chain.betLevel}, Coin=${chain.coinValue}, Base=${chain.baseBetAmount.toFixed(2)}`);
            console.log(`   Corrected RTP: ${(chain.correctedRTP * 100).toFixed(2)}% | Target: ${(chain.targetRTP * 100).toFixed(2)}%`);
        });

        if (config.dryRun) {
            console.log('\n' + '='.repeat(70));
            console.log('DRY RUN - No chains were regenerated');
            console.log('Remove --dry-run flag to regenerate chains');
            if (dbConnection && dbConnection.close) {
                await dbConnection.close();
            }
            process.exit(0);
        }

        // Ensure output directory exists
        if (!existsSync(config.outputDir)) {
            mkdirSync(config.outputDir, { recursive: true });
            console.log(`\nCreated output directory: ${config.outputDir}`);
        }

        // Regenerate chains
        console.log('\n' + '='.repeat(70));
        console.log('      REGENERATING CHAINS');
        console.log('='.repeat(70));

        let successCount = 0;
        let failureCount = 0;
        const results: { chainName: string; success: boolean; filename?: string; actualRTP?: number; error?: string }[] = [];

        for (const chainInfo of chainsToRegenerate) {
            console.log(`\nRegenerating: ${chainInfo.chainName}`);
            console.log(`   Pattern: ${chainInfo.patternType} | Volatility: ${chainInfo.volatility} | Boards: ${chainInfo.boardCount}`);

            const result = await regenerateChain(chainInfo, config);

            if (result.success) {
                successCount++;
                console.log(`   SUCCESS - New RTP: ${((result.actualRTP || 0) * 100).toFixed(2)}%`);
                console.log(`   Saved to: ${result.filename}`);
                results.push({
                    chainName: chainInfo.chainName,
                    success: true,
                    filename: result.filename,
                    actualRTP: result.actualRTP
                });
            } else {
                failureCount++;
                console.log(`   FAILED: ${result.error}`);
                results.push({
                    chainName: chainInfo.chainName,
                    success: false,
                    error: result.error
                });
            }

            // Add delay between generations
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        // Summary
        console.log('\n' + '='.repeat(70));
        console.log('      REGENERATION SUMMARY');
        console.log('='.repeat(70));

        console.log(`\nTotal chains to regenerate: ${chainsToRegenerate.length}`);
        console.log(`Successfully regenerated: ${successCount}`);
        console.log(`Failed: ${failureCount}`);
        console.log(`Success rate: ${((successCount / chainsToRegenerate.length) * 100).toFixed(1)}%`);

        if (successCount > 0) {
            console.log(`\nRegenerated chains saved to: ${config.outputDir}`);
            console.log('\nNext steps:');
            console.log('1. Run "npm run import-chains" to import regenerated chains to database');
            console.log('2. Optionally delete old HIGH RTP chains using "npm run delete-high-rtp-chains"');
        }

        // Save regeneration summary
        const summaryPath = join(config.outputDir, `regeneration-summary-${Date.now()}.json`);
        const summaryData = {
            timestamp: new Date().toISOString(),
            config,
            summary: {
                totalAnalyzed: chains.length,
                chainsToRegenerate: chainsToRegenerate.length,
                successful: successCount,
                failed: failureCount
            },
            results
        };
        writeFileSync(summaryPath, JSON.stringify(summaryData, null, 2));
        console.log(`\nSummary saved to: ${summaryPath}`);

        console.log('\n' + '='.repeat(70));

        // Close database connection
        if (dbConnection && dbConnection.close) {
            await dbConnection.close();
        }

        process.exit(failureCount > 0 ? 1 : 0);

    } catch (error) {
        console.error('Script failed:', error);
        process.exit(1);
    }
}

// Run the script
const isMainModule = process.argv[1] && process.argv[1].includes('regenerate-high-rtp-chains');
if (isMainModule) {
    main().catch(console.error);
}

export { analyzeChainForRegeneration, regenerateChain, ChainToRegenerate };
