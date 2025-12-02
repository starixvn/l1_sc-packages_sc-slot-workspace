#!/usr/bin/env ts-node

/**
 * Delete Corrected High RTP Chains Script
 *
 * This script:
 * 1. Detects chains with wrong free spin counts (same logic as revalidate-freespin-chains)
 * 2. Calculates corrected RTP using proper free spin values (15 per trigger)
 * 3. Deletes chains that have HIGH RTP after correction
 *
 * This is different from delete-high-rtp-chains.ts which deletes based on raw RTP.
 * This script deletes based on CORRECTED RTP (accounting for free spin bugs).
 *
 * Usage:
 *   npm run delete-corrected-high-rtp-chains              # Preview mode (dry run)
 *   npm run delete-corrected-high-rtp-chains -- -c        # Actually delete
 *   npm run delete-corrected-high-rtp-chains -- --confirm # Actually delete
 */

import { connectDatabase } from '../database/connection';
import { ResultChainRepository } from '../database/repositories/result-chain-repository';
import { ResultChainStatisticsRepository } from '../database/repositories/result-chain-statistics-repository';
import { calculateTotalHouseExpenditure } from '../utils/free-spin-utils';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const SCATTER_SYMBOL = 9;
const SCATTER_TRIGGER_COUNT = 4;
const EXPECTED_FREESPIN_COUNT = 15;

interface DeleteConfig {
    tolerance: number;
    confirm: boolean;
    limit: number;
}

interface ChainToDelete {
    chainId: string;
    chainName: string;
    patternType: string;
    volatility: number;
    boardCount: number;
    boardsWithWrongFreeSpins: number;
    originalRTP: number;
    correctedRTP: number;
    targetRTP: number;
    correctedVariance: number;
}

/**
 * Count max scatter symbols (symbol 9) from ALL tumbles newBoard
 * Scatters can appear in ANY tumble during cascading, not just the first
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
 * Analyze chain and determine if it should be deleted (HIGH RTP after correction)
 */
function analyzeChainForDeletion(chainData: any, tolerance: number): ChainToDelete | null {
    try {
        const boards = chainData.boardsData;
        const boardCount = chainData.totalBoardCount;
        const baseBetAmount = chainData.baseBetAmount;
        const betMultiplier = 20;
        const totalBetAmount = baseBetAmount * betMultiplier;

        // Calculate total wins
        const totalWin = boards.reduce((sum: number, board: any) => sum + (board.totalWin || 0), 0);

        // Analyze free spins - original vs corrected
        let originalTotalFreeSpins = 0;
        let correctedTotalFreeSpins = 0;
        let boardsWithWrongFreeSpins = 0;

        boards.forEach((board: any) => {
            const scatterCount = countScatterSymbols(board);
            const originalFreeSpins = board.settlementResult?.freeSpins?.odds || 0;

            // Count original free spins from data
            if (originalFreeSpins > 0) {
                originalTotalFreeSpins += originalFreeSpins;
            }

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

        // Calculate house expenditure - original and corrected
        const originalHouseExpenditure = calculateTotalHouseExpenditure(
            originalTotalFreeSpins,
            totalBetAmount
        );
        const correctedHouseExpenditure = calculateTotalHouseExpenditure(
            correctedTotalFreeSpins,
            totalBetAmount
        );

        // Calculate RTP
        const totalBets = boardCount * totalBetAmount;
        const originalRTP = (totalWin + originalHouseExpenditure) / totalBets;
        const correctedRTP = (totalWin + correctedHouseExpenditure) / totalBets;

        // Target RTP
        const targetRTP = 0.96;
        const correctedVariance = correctedRTP - targetRTP;

        // Only return chains with HIGH RTP after correction
        if (correctedVariance <= tolerance) {
            return null; // PASS or LOW - don't delete
        }

        return {
            chainId: chainData._id.toString(),
            chainName: chainData.name,
            patternType: chainData.patternType || 'unknown',
            volatility: chainData.volatility || 0,
            boardCount,
            boardsWithWrongFreeSpins,
            originalRTP,
            correctedRTP,
            targetRTP,
            correctedVariance
        };
    } catch (error) {
        console.error(`Error analyzing chain ${chainData.name}:`, error);
        return null;
    }
}

/**
 * Parse command line arguments
 */
function parseArguments(args: string[]): DeleteConfig {
    const config: DeleteConfig = {
        tolerance: 0.02, // +2% above target
        confirm: false,
        limit: 10000
    };

    console.log(`Received arguments: [${args.join(', ')}]`);

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];

        switch (arg) {
            case '--tolerance':
            case '-t':
                config.tolerance = parseFloat(args[++i]) || config.tolerance;
                break;
            case '--confirm':
            case '-c':
            case 'confirm':
                config.confirm = true;
                break;
            case '--limit':
            case '-l':
                config.limit = parseInt(args[++i]) || config.limit;
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
Delete Corrected High RTP Chains Script

This script deletes chains that have HIGH RTP after correcting for free spin bugs.
It uses the same detection logic as revalidate-freespin-chains.

Usage: npm run delete-corrected-high-rtp-chains [options]

Options:
  --tolerance, -t <number>   RTP tolerance above target (default: 0.02 for +2%)
  --confirm, -c, confirm     Actually delete chains (default: dry run/preview)
  --limit, -l <number>       Maximum chains to analyze (default: 10000)
  --help, -h                 Show this help message

Examples:
  npm run delete-corrected-high-rtp-chains                    # Preview what will be deleted
  npm run delete-corrected-high-rtp-chains -- -c              # Delete chains
  npm run delete-corrected-high-rtp-chains -- --confirm       # Delete chains
  npm run delete-corrected-high-rtp-chains -- -t 0.01 -c      # Stricter tolerance, delete

Note: Always run without --confirm first to preview what will be deleted.
`);
}

/**
 * Main function
 */
async function main() {
    const args = process.argv.slice(2);
    const config = parseArguments(args);

    console.log('Delete Corrected High RTP Chains Script');
    console.log('='.repeat(70));
    console.log(`Scatter Symbol: ${SCATTER_SYMBOL}`);
    console.log(`Trigger Count: ${SCATTER_TRIGGER_COUNT}+ scatters`);
    console.log(`Expected Free Spins: ${EXPECTED_FREESPIN_COUNT}`);
    console.log(`RTP Tolerance: +${(config.tolerance * 100).toFixed(1)}% above target`);
    console.log(`Mode: ${config.confirm ? 'DELETE MODE' : 'PREVIEW MODE (dry run)'}`);
    console.log('');

    try {
        // Connect to database
        console.log('Connecting to MongoDB...');
        const dbConnection = await connectDatabase();
        console.log('Database connected successfully\n');

        // Initialize repositories
        const chainRepository = new ResultChainRepository();
        const statsRepository = new ResultChainStatisticsRepository();

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

        // Analyze chains and find those to delete
        console.log('Analyzing chains for HIGH RTP after free spin correction...\n');
        const chainsToDelete: ChainToDelete[] = [];

        for (const chain of chains) {
            const result = analyzeChainForDeletion(chain, config.tolerance);
            if (result) {
                chainsToDelete.push(result);
            }
        }

        // Sort by corrected RTP descending (highest first)
        chainsToDelete.sort((a, b) => b.correctedRTP - a.correctedRTP);

        console.log('='.repeat(70));
        console.log('      CHAINS TO DELETE (HIGH RTP after correction)');
        console.log('='.repeat(70));

        console.log(`\nTotal chains analyzed: ${chains.length}`);
        console.log(`Chains with HIGH corrected RTP: ${chainsToDelete.length}`);

        if (chainsToDelete.length === 0) {
            console.log('\nNo chains need deletion. All chains within tolerance after correction.');
            if (dbConnection && dbConnection.close) {
                await dbConnection.close();
            }
            process.exit(0);
        }

        console.log('\nChains to delete:');
        console.log('-'.repeat(70));

        chainsToDelete.forEach((chain, index) => {
            console.log(`\n${index + 1}. ${chain.chainName}`);
            console.log(`   ID: ${chain.chainId}`);
            console.log(`   Pattern: ${chain.patternType} | Volatility: ${chain.volatility}`);
            console.log(`   Boards: ${chain.boardCount} | Wrong free spin boards: ${chain.boardsWithWrongFreeSpins}`);
            console.log(`   Original RTP: ${(chain.originalRTP * 100).toFixed(2)}%`);
            console.log(`   Corrected RTP: ${(chain.correctedRTP * 100).toFixed(2)}% | Target: ${(chain.targetRTP * 100).toFixed(2)}%`);
            console.log(`   Variance: +${(chain.correctedVariance * 100).toFixed(2)}%`);
        });

        if (!config.confirm) {
            console.log('\n' + '='.repeat(70));
            console.log('PREVIEW MODE - No chains were deleted');
            console.log('Run with --confirm or -c flag to actually delete these chains');
            console.log('='.repeat(70));
            if (dbConnection && dbConnection.close) {
                await dbConnection.close();
            }
            process.exit(0);
        }

        // Actually delete chains
        console.log('\n' + '='.repeat(70));
        console.log('      DELETING CHAINS');
        console.log('='.repeat(70));

        let deletedCount = 0;
        let failedCount = 0;

        for (const chain of chainsToDelete) {
            try {
                console.log(`\nDeleting ${chain.chainName}...`);

                // Delete from main chain repository
                const deleted = await chainRepository.delete(chain.chainId);

                // Also try to delete from statistics repository
                try {
                    const stats = await statsRepository.getByChainName(chain.chainName);
                    if (stats) {
                        await statsRepository.delete(stats._id.toString());
                        console.log(`   Statistics also deleted`);
                    }
                } catch (statsError) {
                    // Statistics might not exist, that's okay
                }

                if (deleted) {
                    console.log(`   DELETED: ${chain.chainName}`);
                    deletedCount++;
                } else {
                    console.log(`   FAILED: ${chain.chainName} (not found or already deleted)`);
                    failedCount++;
                }
            } catch (error: any) {
                console.log(`   ERROR: ${chain.chainName} - ${error.message || error}`);
                failedCount++;
            }
        }

        // Summary
        console.log('\n' + '='.repeat(70));
        console.log('      DELETE SUMMARY');
        console.log('='.repeat(70));

        console.log(`\nTotal chains to delete: ${chainsToDelete.length}`);
        console.log(`Successfully deleted: ${deletedCount}`);
        console.log(`Failed: ${failedCount}`);

        console.log('\n' + '='.repeat(70));

        // Close database connection
        if (dbConnection && dbConnection.close) {
            await dbConnection.close();
        }

        process.exit(failedCount > 0 ? 1 : 0);

    } catch (error) {
        console.error('Script failed:', error);
        process.exit(1);
    }
}

// Run the script
const isMainModule = process.argv[1] && process.argv[1].includes('delete-corrected-high-rtp-chains');
if (isMainModule) {
    main().catch(console.error);
}

export { analyzeChainForDeletion, ChainToDelete };
