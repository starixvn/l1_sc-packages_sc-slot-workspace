#!/usr/bin/env ts-node

/**
 * Delete High RTP Chains Script
 * Connects to MongoDB and deletes chains with RTP over 100%
 * These chains are unprofitable and should be removed
 *
 * Usage:
 *   npm run delete-high-rtp-chains                    - Preview chains to delete (dry run)
 *   npm run delete-high-rtp-chains -- --confirm       - Actually delete the chains
 *   npm run delete-high-rtp-chains -- --threshold 1.0 - Set RTP threshold (default: 1.0 = 100%)
 */

import { connectDatabase } from '../database/connection';
import { ResultChainRepository } from '../database/repositories/result-chain-repository';
import { ResultChainStatisticsRepository } from '../database/repositories/result-chain-statistics-repository';
import * as dotenv from 'dotenv';
import {
    calculateTotalHouseExpenditure
} from '../utils/free-spin-utils';

// Load environment variables
dotenv.config();

interface DeleteConfig {
    threshold: number;
    confirm: boolean;
    limit: number;
}

interface ChainToDelete {
    chainId: string;
    chainName: string;
    calculatedRTP: number;
    boardCount: number;
    patternType: string;
    volatility: number;
}

/**
 * Calculate RTP for a chain
 */
function calculateChainRTP(chainData: any): number {
    const boards = chainData.boardsData;
    const boardCount = chainData.totalBoardCount;
    const baseBetAmount = chainData.baseBetAmount;
    const betMultiplier = 20;
    const totalBetAmount = baseBetAmount * betMultiplier;

    // Calculate total board wins
    const totalWin = boards.reduce((sum: number, board: any) => sum + (board.totalWin || 0), 0);

    // Calculate free spin statistics
    let totalFreeSpinsAwarded = 0;
    boards.forEach((board: any) => {
        if (board.settlementResult?.freeSpins?.odds > 0) {
            totalFreeSpinsAwarded += board.settlementResult.freeSpins.odds;
        }
    });

    // Calculate house expenditure
    const totalHouseExpenditure = calculateTotalHouseExpenditure(
        totalFreeSpinsAwarded,
        totalBetAmount
    );

    // Calculate RTP
    const totalBets = boardCount * totalBetAmount;
    const totalWinForRTP = totalWin + totalHouseExpenditure;
    return totalWinForRTP / totalBets;
}

/**
 * Parse command line arguments
 */
function parseArguments(args: string[]): DeleteConfig {
    const config: DeleteConfig = {
        threshold: 1.0, // 100% RTP
        confirm: false,
        limit: 10000
    };

    // Debug: show received arguments
    console.log(`📋 Received arguments: [${args.join(', ')}]`);

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];

        switch (arg) {
            case '--threshold':
            case '-t':
                config.threshold = parseFloat(args[++i]) || config.threshold;
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
            default:
                if (arg.startsWith('-')) {
                    console.warn(`⚠️  Unknown argument: ${arg}`);
                }
        }
    }

    return config;
}

/**
 * Show help message
 */
function showHelp(): void {
    console.log(`
Delete High RTP Chains Script

Usage: npm run delete-high-rtp-chains [options]

Options:
  --threshold <number>   RTP threshold as decimal (default: 1.0 for 100%)
  --confirm              Actually delete the chains (without this, it's a dry run)
  --limit <number>       Maximum chains to process (default: 10000)
  --help                 Show this help message

Examples:
  npm run delete-high-rtp-chains                      # Preview only
  npm run delete-high-rtp-chains -- --confirm         # Delete chains with RTP > 100%
  npm run delete-high-rtp-chains -- --threshold 0.98  # Delete chains with RTP > 98%

Note: Always run without --confirm first to preview what will be deleted.
`);
}

/**
 * Main function
 */
async function main() {
    // Debug: print full process.argv
    console.log('📋 Full process.argv:', process.argv);

    const args = process.argv.slice(2);
    const config = parseArguments(args);

    console.log('🗑️  Delete High RTP Chains Script');
    console.log('═'.repeat(50));
    console.log(`Threshold: >${(config.threshold * 100).toFixed(1)}% RTP`);
    console.log(`Mode: ${config.confirm ? '⚠️  DELETE MODE' : '👁️  PREVIEW MODE (dry run)'}`);
    console.log('');

    try {
        // Connect to database
        console.log('🗄️  Connecting to MongoDB...');
        const dbConnection = await connectDatabase();
        console.log('✅ Database connected successfully\n');

        // Initialize repositories
        const chainRepository = new ResultChainRepository();
        const statsRepository = new ResultChainStatisticsRepository();

        // Fetch all chains
        console.log('📊 Fetching chains from database...');
        const { chains, total } = await chainRepository.getFiltered({}, config.limit, 0);
        console.log(`📁 Found ${total} chains total, processing ${chains.length}\n`);

        if (chains.length === 0) {
            console.log('❌ No chains found in database');
            if (dbConnection && dbConnection.close) {
                await dbConnection.close();
            }
            process.exit(0);
        }

        // Find chains with RTP over threshold
        const chainsToDelete: ChainToDelete[] = [];

        for (const chain of chains) {
            const calculatedRTP = calculateChainRTP(chain);

            if (calculatedRTP > config.threshold) {
                chainsToDelete.push({
                    chainId: chain._id.toString(),
                    chainName: chain.name,
                    calculatedRTP,
                    boardCount: chain.totalBoardCount,
                    patternType: chain.patternType || 'unknown',
                    volatility: chain.volatility || 0
                });
            }
        }

        // Sort by RTP descending
        chainsToDelete.sort((a, b) => b.calculatedRTP - a.calculatedRTP);

        if (chainsToDelete.length === 0) {
            console.log(`✅ No chains found with RTP > ${(config.threshold * 100).toFixed(1)}%`);
            if (dbConnection && dbConnection.close) {
                await dbConnection.close();
            }
            process.exit(0);
        }

        // Display chains to delete
        console.log(`🔴 Found ${chainsToDelete.length} chains with RTP > ${(config.threshold * 100).toFixed(1)}%:\n`);

        chainsToDelete.forEach((chain, index) => {
            console.log(`${index + 1}. ${chain.chainName}`);
            console.log(`   ID: ${chain.chainId}`);
            console.log(`   RTP: ${(chain.calculatedRTP * 100).toFixed(2)}%`);
            console.log(`   Pattern: ${chain.patternType} | Volatility: ${chain.volatility} | Boards: ${chain.boardCount}`);
            console.log('');
        });

        // Delete if confirmed
        if (config.confirm) {
            console.log('═'.repeat(50));
            console.log('⚠️  DELETING CHAINS...\n');

            let deletedCount = 0;
            let failedCount = 0;

            for (const chain of chainsToDelete) {
                try {
                    // Delete from main chain repository
                    console.log(`   Deleting ${chain.chainName} (ID: ${chain.chainId})...`);
                    const deleted = await chainRepository.delete(chain.chainId);

                    // Also try to delete from statistics repository
                    try {
                        const stats = await statsRepository.getByChainName(chain.chainName);
                        if (stats) {
                            await statsRepository.delete(stats._id.toString());
                            console.log(`   ✅ Statistics also deleted`);
                        }
                    } catch (statsError) {
                        // Statistics might not exist, that's okay
                        console.log(`   ⚠️  No statistics found for this chain`);
                    }

                    if (deleted) {
                        console.log(`✅ Deleted: ${chain.chainName}\n`);
                        deletedCount++;
                    } else {
                        console.log(`❌ Failed to delete: ${chain.chainName} (chain not found or already deleted)\n`);
                        failedCount++;
                    }
                } catch (error: any) {
                    console.log(`❌ Error deleting ${chain.chainName}: ${error.message || error}\n`);
                    failedCount++;
                }
            }

            console.log('\n═'.repeat(50));
            console.log('📊 DELETE SUMMARY');
            console.log('─'.repeat(30));
            console.log(`Total to delete: ${chainsToDelete.length}`);
            console.log(`Successfully deleted: ${deletedCount}`);
            console.log(`Failed: ${failedCount}`);
        } else {
            console.log('═'.repeat(50));
            console.log('👁️  This was a DRY RUN - no chains were deleted');
            console.log('To actually delete, run with --confirm flag');
        }

        // Close database connection
        if (dbConnection && dbConnection.close) {
            await dbConnection.close();
        }

        process.exit(0);

    } catch (error) {
        console.error('❌ Script failed:', error);
        process.exit(1);
    }
}

// Run the script
const isMainModule = process.argv[1] && process.argv[1].includes('delete-high-rtp-chains');
if (isMainModule) {
    main().catch(console.error);
}
