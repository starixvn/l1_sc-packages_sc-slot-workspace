#!/usr/bin/env ts-node

/**
 * Detect Wrong Free Spin Count Script
 * Identifies chains where boards trigger free spins (4+ scatter symbols)
 * but have incorrect free spin count (not 15)
 *
 * Detection criteria:
 * - Board has 4 or more symbol 9 (scatter) on initial board
 * - Free spin odds in settlementResult is not 15 (or missing)
 *
 * Usage:
 *   npm run detect-wrong-freespin-count
 */

import { connectDatabase } from '../database/connection';
import { ResultChainRepository } from '../database/repositories/result-chain-repository';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const SCATTER_SYMBOL = 9;
const SCATTER_TRIGGER_COUNT = 4;
const EXPECTED_FREESPIN_COUNT = 15;

interface WrongFreeSpinBoard {
    boardIndex: number;
    scatterCount: number;
    actualFreeSpins: number;
    expectedFreeSpins: number;
}

interface ChainWithWrongFreeSpins {
    chainId: string;
    chainName: string;
    patternType: string;
    volatility: number;
    boardCount: number;
    wrongBoards: WrongFreeSpinBoard[];
}

/**
 * Count max scatter symbols (symbol 9) from ALL tumbles newBoard
 * Scatters can appear in ANY tumble during cascading, not just the first
 * newBoard is a comma-separated string like "1,3,4,8,3,2,8,8,7,7,7,1,..."
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

        // Parse comma-separated string and count symbol 9
        const symbols = boardString.split(',').map((s: string) => parseInt(s.trim(), 10));
        const scatterCount = symbols.filter((s: number) => s === SCATTER_SYMBOL).length;

        if (scatterCount > maxScatterCount) {
            maxScatterCount = scatterCount;
        }
    }

    return maxScatterCount;
}

/**
 * Analyze chain for wrong free spin counts
 */
function analyzeChainFreeSpins(chainData: any): ChainWithWrongFreeSpins | null {
    const boards = chainData.boardsData;
    const wrongBoards: WrongFreeSpinBoard[] = [];

    boards.forEach((board: any, index: number) => {
        const scatterCount = countScatterSymbols(board);

        // Check if board should trigger free spins (4+ scatters)
        if (scatterCount >= SCATTER_TRIGGER_COUNT) {
            const actualFreeSpins = board.settlementResult?.freeSpins?.odds || 0;

            // Check if free spin count is wrong
            if (actualFreeSpins !== EXPECTED_FREESPIN_COUNT) {
                wrongBoards.push({
                    boardIndex: index,
                    scatterCount,
                    actualFreeSpins,
                    expectedFreeSpins: EXPECTED_FREESPIN_COUNT
                });
            }
        }
    });

    if (wrongBoards.length === 0) {
        return null;
    }

    return {
        chainId: chainData._id.toString(),
        chainName: chainData.name,
        patternType: chainData.patternType || 'unknown',
        volatility: chainData.volatility || 0,
        boardCount: chainData.totalBoardCount,
        wrongBoards
    };
}

/**
 * Main function
 */
async function main() {
    console.log('🔍 Detect Wrong Free Spin Count Script');
    console.log('═'.repeat(60));
    console.log(`Scatter Symbol: ${SCATTER_SYMBOL}`);
    console.log(`Trigger Count: ${SCATTER_TRIGGER_COUNT}+ scatters`);
    console.log(`Expected Free Spins: ${EXPECTED_FREESPIN_COUNT}`);
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
        const chainsWithWrongFreeSpins: ChainWithWrongFreeSpins[] = [];
        let totalBoardsWithTriggers = 0;
        let totalWrongBoards = 0;

        for (const chain of chains) {
            const result = analyzeChainFreeSpins(chain);
            if (result) {
                chainsWithWrongFreeSpins.push(result);
                totalWrongBoards += result.wrongBoards.length;
            }

            // Count all boards with triggers for statistics
            const boards = chain.boardsData;
            boards.forEach((board: any) => {
                const scatterCount = countScatterSymbols(board);
                if (scatterCount >= SCATTER_TRIGGER_COUNT) {
                    totalBoardsWithTriggers++;
                }
            });
        }

        // Sort by number of wrong boards (most problems first)
        chainsWithWrongFreeSpins.sort((a, b) => b.wrongBoards.length - a.wrongBoards.length);

        // Print results
        console.log('═'.repeat(60));
        console.log('      WRONG FREE SPIN COUNT DETECTION SUMMARY');
        console.log('═'.repeat(60));

        console.log('\n📊 STATISTICS');
        console.log('─'.repeat(40));
        console.log(`Total chains analyzed: ${chains.length}`);
        console.log(`Total boards with ${SCATTER_TRIGGER_COUNT}+ scatters: ${totalBoardsWithTriggers}`);
        console.log(`Boards with WRONG free spin count: ${totalWrongBoards}`);
        console.log(`Boards with CORRECT free spin count: ${totalBoardsWithTriggers - totalWrongBoards}`);
        console.log(`Chains affected: ${chainsWithWrongFreeSpins.length}`);

        if (chainsWithWrongFreeSpins.length > 0) {
            console.log('\n🔴 CHAINS WITH WRONG FREE SPIN COUNT');
            console.log('─'.repeat(60));
            console.log(`These chains have boards with ${SCATTER_TRIGGER_COUNT}+ scatters but wrong free spin count:\n`);

            chainsWithWrongFreeSpins.forEach((chain, index) => {
                console.log(`${index + 1}. ${chain.chainName}`);
                console.log(`   ID: ${chain.chainId}`);
                console.log(`   Pattern: ${chain.patternType} | Volatility: ${chain.volatility}`);
                console.log(`   Total Boards: ${chain.boardCount}`);
                console.log(`   Wrong Boards: ${chain.wrongBoards.length}`);
                console.log('   Details:');
                chain.wrongBoards.forEach(wb => {
                    console.log(`      - Board #${wb.boardIndex}: ${wb.scatterCount} scatters, got ${wb.actualFreeSpins} free spins (expected ${wb.expectedFreeSpins})`);
                });
                console.log('');
            });

            // Group by actual free spin count
            const groupedByActual = new Map<number, number>();
            chainsWithWrongFreeSpins.forEach(chain => {
                chain.wrongBoards.forEach(wb => {
                    groupedByActual.set(wb.actualFreeSpins, (groupedByActual.get(wb.actualFreeSpins) || 0) + 1);
                });
            });

            console.log('📊 GROUPED BY ACTUAL FREE SPIN COUNT');
            console.log('─'.repeat(40));
            const sortedGroups = Array.from(groupedByActual.entries()).sort((a, b) => b[1] - a[1]);
            sortedGroups.forEach(([freeSpins, count]) => {
                console.log(`   ${freeSpins} free spins: ${count} boards`);
            });
        } else {
            console.log(`\n✅ All boards with ${SCATTER_TRIGGER_COUNT}+ scatters have correct free spin count (${EXPECTED_FREESPIN_COUNT})`);
        }

        console.log('\n' + '═'.repeat(60));

        // Close database connection
        if (dbConnection && dbConnection.close) {
            await dbConnection.close();
        }

        process.exit(chainsWithWrongFreeSpins.length > 0 ? 1 : 0);

    } catch (error) {
        console.error('❌ Script failed:', error);
        process.exit(1);
    }
}

// Run the script
const isMainModule = process.argv[1] && process.argv[1].includes('detect-wrong-freespin-count');
if (isMainModule) {
    main().catch(console.error);
}

export { analyzeChainFreeSpins, countScatterSymbols, ChainWithWrongFreeSpins };
