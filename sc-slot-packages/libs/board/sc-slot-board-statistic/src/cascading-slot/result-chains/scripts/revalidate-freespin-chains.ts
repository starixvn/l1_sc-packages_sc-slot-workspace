#!/usr/bin/env ts-node

/**
 * Re-validate Free Spin Chains Script
 *
 * This script:
 * 1. Detects chains with wrong free spin counts (4+ scatters but not 15 free spins)
 * 2. Re-calculates RTP using corrected free spin values (15 per trigger)
 * 3. Reports which chains have HIGH RTP after correction
 *
 * Usage:
 *   npm run revalidate-freespin-chains
 *   npm run revalidate-freespin-chains -- --tolerance 0.02
 */

import { connectDatabase } from '../database/connection';
import { ResultChainRepository } from '../database/repositories/result-chain-repository';
import * as dotenv from 'dotenv';
import { calculateTotalHouseExpenditure } from '../utils/free-spin-utils';

// Load environment variables
dotenv.config();

const SCATTER_SYMBOL = 9;
const SCATTER_TRIGGER_COUNT = 4;
const EXPECTED_FREESPIN_COUNT = 15;

interface RevalidationConfig {
    tolerance: number;
    limit: number;
}

interface ChainRevalidationResult {
    chainId: string;
    chainName: string;
    patternType: string;
    volatility: number;
    boardCount: number;
    betLevel: number;
    coinValue: number;
    baseBetAmount: number;

    // Free spin detection
    boardsWithWrongFreeSpins: number;
    originalFreeSpinTriggers: number;
    originalTotalFreeSpins: number;
    correctedFreeSpinTriggers: number;
    correctedTotalFreeSpins: number;

    // RTP calculations
    totalWin: number;
    originalHouseExpenditure: number;
    correctedHouseExpenditure: number;
    totalBets: number;
    originalRTP: number;
    correctedRTP: number;
    targetRTP: number;
    correctedVariance: number;

    // Status
    status: 'PASS' | 'HIGH' | 'LOW';
    needsAttention: boolean;
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

    // Check ALL tumbles and return the maximum scatter count found
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
 * Analyze and revalidate a single chain
 */
function revalidateChain(chainData: any, tolerance: number): ChainRevalidationResult | null {
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

        // Analyze free spins - original vs corrected
        let originalFreeSpinTriggers = 0;
        let originalTotalFreeSpins = 0;
        let correctedFreeSpinTriggers = 0;
        let correctedTotalFreeSpins = 0;
        let boardsWithWrongFreeSpins = 0;

        boards.forEach((board: any) => {
            const scatterCount = countScatterSymbols(board);
            const originalFreeSpins = board.settlementResult?.freeSpins?.odds || 0;

            // Count original free spins from data
            if (originalFreeSpins > 0) {
                originalFreeSpinTriggers++;
                originalTotalFreeSpins += originalFreeSpins;
            }

            // Count corrected free spins based on scatter detection
            if (scatterCount >= SCATTER_TRIGGER_COUNT) {
                correctedFreeSpinTriggers++;
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
        const meetsTarget = Math.abs(correctedVariance) <= tolerance;

        // Determine status based on corrected RTP
        let status: 'PASS' | 'HIGH' | 'LOW';
        if (meetsTarget) {
            status = 'PASS';
        } else if (correctedRTP > targetRTP) {
            status = 'HIGH';
        } else {
            status = 'LOW';
        }

        return {
            chainId: chainData._id.toString(),
            chainName: chainData.name,
            patternType: chainData.patternType || 'unknown',
            volatility: chainData.volatility || 0,
            boardCount,
            betLevel,
            coinValue,
            baseBetAmount,

            boardsWithWrongFreeSpins,
            originalFreeSpinTriggers,
            originalTotalFreeSpins,
            correctedFreeSpinTriggers,
            correctedTotalFreeSpins,

            totalWin,
            originalHouseExpenditure,
            correctedHouseExpenditure,
            totalBets,
            originalRTP,
            correctedRTP,
            targetRTP,
            correctedVariance,

            status,
            needsAttention: status === 'HIGH'
        };
    } catch (error) {
        console.error(`❌ Error revalidating chain ${chainData.name}:`, error);
        return null;
    }
}

/**
 * Parse command line arguments
 */
function parseArguments(args: string[]): RevalidationConfig {
    const config: RevalidationConfig = {
        tolerance: 0.02,
        limit: 10000
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
Re-validate Free Spin Chains Script

This script detects chains with wrong free spin counts and re-calculates their RTP
using corrected free spin values (15 per trigger for 4+ scatters).

Usage: npm run revalidate-freespin-chains [options]

Options:
  --tolerance, -t <number>   RTP tolerance as decimal (default: 0.02 for ±2%)
  --limit, -l <number>       Maximum chains to process (default: 10000)
  --help, -h                 Show this help message

Examples:
  npm run revalidate-freespin-chains
  npm run revalidate-freespin-chains -- --tolerance 0.01
`);
}

/**
 * Main function
 */
async function main() {
    const args = process.argv.slice(2);
    const config = parseArguments(args);

    console.log('🔄 Re-validate Free Spin Chains Script');
    console.log('═'.repeat(70));
    console.log(`Scatter Symbol: ${SCATTER_SYMBOL}`);
    console.log(`Trigger Count: ${SCATTER_TRIGGER_COUNT}+ scatters`);
    console.log(`Expected Free Spins: ${EXPECTED_FREESPIN_COUNT}`);
    console.log(`RTP Tolerance: ±${(config.tolerance * 100).toFixed(1)}%`);
    console.log('');

    try {
        // Connect to database
        console.log('🗄️  Connecting to MongoDB...');
        const dbConnection = await connectDatabase();
        console.log('✅ Database connected successfully\n');

        // Initialize repository
        const chainRepository = new ResultChainRepository();

        // Fetch all chains
        console.log('📊 Fetching chains from database...');
        const { chains, total } = await chainRepository.getFiltered({}, config.limit, 0);
        console.log(`📁 Found ${total} chains total, analyzing ${chains.length}\n`);

        if (chains.length === 0) {
            console.log('❌ No chains found in database');
            if (dbConnection && dbConnection.close) {
                await dbConnection.close();
            }
            process.exit(0);
        }

        // Revalidate each chain
        console.log('🔄 Analyzing and revalidating chains...\n');
        const results: ChainRevalidationResult[] = [];

        for (const chain of chains) {
            const result = revalidateChain(chain, config.tolerance);
            if (result) {
                results.push(result);
            }
        }

        // Sort by corrected RTP descending
        results.sort((a, b) => b.correctedRTP - a.correctedRTP);

        // Print results
        console.log('═'.repeat(70));
        console.log('      FREE SPIN CHAINS RE-VALIDATION SUMMARY');
        console.log('═'.repeat(70));

        console.log('\n📊 STATISTICS');
        console.log('─'.repeat(40));
        console.log(`Total chains analyzed: ${chains.length}`);
        console.log(`Chains with wrong free spin counts: ${results.length}`);

        const highRTPChains = results.filter(r => r.status === 'HIGH');
        const passedChains = results.filter(r => r.status === 'PASS');
        const lowRTPChains = results.filter(r => r.status === 'LOW');

        console.log(`\nAfter correction:`);
        console.log(`  PASS (within ±${(config.tolerance * 100).toFixed(1)}%): ${passedChains.length}`);
        console.log(`  HIGH RTP (above target): ${highRTPChains.length}`);
        console.log(`  LOW RTP (below target): ${lowRTPChains.length}`);

        if (results.length > 0) {
            console.log('\n📋 ALL CHAINS WITH WRONG FREE SPIN COUNTS');
            console.log('─'.repeat(70));

            results.forEach((chain, index) => {
                const statusEmoji = chain.status === 'PASS' ? '✅' : chain.status === 'HIGH' ? '🔴' : '🟡';
                console.log(`\n${index + 1}. ${statusEmoji} ${chain.chainName}`);
                console.log(`   ID: ${chain.chainId}`);
                console.log(`   Pattern: ${chain.patternType} | Volatility: ${chain.volatility}`);
                console.log(`   Boards with wrong free spins: ${chain.boardsWithWrongFreeSpins}`);
                console.log(`   Free Spins - Original: ${chain.originalFreeSpinTriggers} triggers, ${chain.originalTotalFreeSpins} total`);
                console.log(`   Free Spins - Corrected: ${chain.correctedFreeSpinTriggers} triggers, ${chain.correctedTotalFreeSpins} total`);
                console.log(`   RTP - Original: ${(chain.originalRTP * 100).toFixed(2)}%`);
                console.log(`   RTP - Corrected: ${(chain.correctedRTP * 100).toFixed(2)}% | Target: ${(chain.targetRTP * 100).toFixed(2)}%`);
                console.log(`   Variance: ${chain.correctedVariance >= 0 ? '+' : ''}${(chain.correctedVariance * 100).toFixed(2)}%`);
                console.log(`   Status: ${chain.status}`);
            });
        }

        if (highRTPChains.length > 0) {
            console.log('\n' + '═'.repeat(70));
            console.log('🔴 CHAINS THAT NEED ATTENTION (HIGH RTP after correction)');
            console.log('─'.repeat(70));
            console.log('These chains will still have HIGH RTP even with corrected free spins:\n');

            highRTPChains.forEach((chain, index) => {
                console.log(`${index + 1}. ${chain.chainName}`);
                console.log(`   ID: ${chain.chainId}`);
                console.log(`   Corrected RTP: ${(chain.correctedRTP * 100).toFixed(2)}%`);
                console.log(`   Variance: +${(chain.correctedVariance * 100).toFixed(2)}%`);
            });
        }

        console.log('\n' + '═'.repeat(70));

        // Close database connection
        if (dbConnection && dbConnection.close) {
            await dbConnection.close();
        }

        process.exit(highRTPChains.length > 0 ? 1 : 0);

    } catch (error) {
        console.error('❌ Script failed:', error);
        process.exit(1);
    }
}

// Run the script
const isMainModule = process.argv[1] && process.argv[1].includes('revalidate-freespin-chains');
if (isMainModule) {
    main().catch(console.error);
}

export { revalidateChain, ChainRevalidationResult };
