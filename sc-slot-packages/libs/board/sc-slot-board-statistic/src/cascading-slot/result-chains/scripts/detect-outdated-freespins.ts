#!/usr/bin/env ts-node

/**
 * Detect Outdated Free Spins Chains Script
 * Identifies chains with old free spin odds (not 15 per trigger)
 *
 * Detection criteria:
 * - Chain has free spin triggers
 * - Total free spins awarded is not equal to (triggers * 15)
 *
 * Usage:
 *   npm run detect-outdated-freespins
 */

import { connectDatabase } from '../database/connection';
import { ResultChainRepository } from '../database/repositories/result-chain-repository';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const EXPECTED_FREESPINS_PER_TRIGGER = 15;

interface OutdatedChain {
    chainId: string;
    chainName: string;
    patternType: string;
    volatility: number;
    boardCount: number;
    freeSpinTriggers: number;
    totalFreeSpinsAwarded: number;
    expectedFreeSpins: number;
    avgFreeSpinsPerTrigger: number;
}

/**
 * Analyze chain for outdated free spin odds
 */
function analyzeChainFreeSpins(chainData: any): OutdatedChain | null {
    const boards = chainData.boardsData;

    let freeSpinTriggers = 0;
    let totalFreeSpinsAwarded = 0;

    boards.forEach((board: any) => {
        if (board.settlementResult?.freeSpins?.odds > 0) {
            freeSpinTriggers++;
            totalFreeSpinsAwarded += board.settlementResult.freeSpins.odds;
        }
    });

    // Only check chains that have free spin triggers
    if (freeSpinTriggers === 0) {
        return null;
    }

    const expectedFreeSpins = freeSpinTriggers * EXPECTED_FREESPINS_PER_TRIGGER;
    const avgFreeSpinsPerTrigger = totalFreeSpinsAwarded / freeSpinTriggers;

    // Check if total free spins matches expected (triggers * 15)
    if (totalFreeSpinsAwarded === expectedFreeSpins) {
        return null; // Chain has correct free spin odds
    }

    // This chain has outdated free spin odds
    return {
        chainId: chainData._id.toString(),
        chainName: chainData.name,
        patternType: chainData.patternType || 'unknown',
        volatility: chainData.volatility || 0,
        boardCount: chainData.totalBoardCount,
        freeSpinTriggers,
        totalFreeSpinsAwarded,
        expectedFreeSpins,
        avgFreeSpinsPerTrigger
    };
}

/**
 * Main function
 */
async function main() {
    console.log('🔍 Detect Outdated Free Spins Chains Script');
    console.log('═'.repeat(60));
    console.log(`Expected free spins per trigger: ${EXPECTED_FREESPINS_PER_TRIGGER}`);
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
        const { chains, total } = await chainRepository.getFiltered({}, 10000, 0);
        console.log(`📁 Found ${total} chains total, analyzing ${chains.length}\n`);

        if (chains.length === 0) {
            console.log('❌ No chains found in database');
            if (dbConnection && dbConnection.close) {
                await dbConnection.close();
            }
            process.exit(0);
        }

        // Analyze each chain
        const outdatedChains: OutdatedChain[] = [];
        let chainsWithFreeSpins = 0;

        for (const chain of chains) {
            const result = analyzeChainFreeSpins(chain);
            if (result) {
                outdatedChains.push(result);
                chainsWithFreeSpins++;
            } else {
                // Check if chain has free spins but correct odds
                const boards = chain.boardsData;
                const hasFreeSpins = boards.some((board: any) =>
                    board.settlementResult?.freeSpins?.odds > 0
                );
                if (hasFreeSpins) {
                    chainsWithFreeSpins++;
                }
            }
        }

        // Sort by avgFreeSpinsPerTrigger to group similar outdated odds
        outdatedChains.sort((a, b) => a.avgFreeSpinsPerTrigger - b.avgFreeSpinsPerTrigger);

        // Print results
        console.log('═'.repeat(60));
        console.log('           OUTDATED FREE SPINS DETECTION SUMMARY');
        console.log('═'.repeat(60));

        console.log('\n📊 STATISTICS');
        console.log('─'.repeat(40));
        console.log(`Total chains analyzed: ${chains.length}`);
        console.log(`Chains with free spin triggers: ${chainsWithFreeSpins}`);
        console.log(`Chains with OUTDATED free spin odds: ${outdatedChains.length}`);
        console.log(`Chains with CORRECT free spin odds: ${chainsWithFreeSpins - outdatedChains.length}`);

        if (outdatedChains.length > 0) {
            console.log('\n🔴 CHAINS WITH OUTDATED FREE SPIN ODDS');
            console.log('─'.repeat(60));
            console.log(`These chains have free spin odds != ${EXPECTED_FREESPINS_PER_TRIGGER} per trigger:\n`);

            outdatedChains.forEach((chain, index) => {
                console.log(`${index + 1}. ${chain.chainName}`);
                console.log(`   ID: ${chain.chainId}`);
                console.log(`   Pattern: ${chain.patternType} | Volatility: ${chain.volatility}`);
                console.log(`   Free Spin Triggers: ${chain.freeSpinTriggers}`);
                console.log(`   Total Free Spins Awarded: ${chain.totalFreeSpinsAwarded}`);
                console.log(`   Expected (${chain.freeSpinTriggers} × ${EXPECTED_FREESPINS_PER_TRIGGER}): ${chain.expectedFreeSpins}`);
                console.log(`   Avg Free Spins Per Trigger: ${chain.avgFreeSpinsPerTrigger.toFixed(1)}`);
                console.log('');
            });

            // Group by avg free spins per trigger
            const groupedByOdds = new Map<number, number>();
            outdatedChains.forEach(chain => {
                const rounded = Math.round(chain.avgFreeSpinsPerTrigger);
                groupedByOdds.set(rounded, (groupedByOdds.get(rounded) || 0) + 1);
            });

            console.log('📊 GROUPED BY OLD FREE SPIN ODDS');
            console.log('─'.repeat(40));
            groupedByOdds.forEach((count, odds) => {
                console.log(`   ${odds} free spins per trigger: ${count} chains`);
            });
        } else {
            console.log('\n✅ All chains with free spins have correct odds (15 per trigger)');
        }

        console.log('\n' + '═'.repeat(60));

        // Close database connection
        if (dbConnection && dbConnection.close) {
            await dbConnection.close();
        }

        process.exit(outdatedChains.length > 0 ? 1 : 0);

    } catch (error) {
        console.error('❌ Script failed:', error);
        process.exit(1);
    }
}

// Run the script
const isMainModule = process.argv[1] && process.argv[1].includes('detect-outdated-freespins');
if (isMainModule) {
    main().catch(console.error);
}

export { analyzeChainFreeSpins, OutdatedChain };
