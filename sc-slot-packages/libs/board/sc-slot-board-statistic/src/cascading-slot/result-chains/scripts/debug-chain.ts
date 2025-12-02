#!/usr/bin/env ts-node

/**
 * Debug script to check a specific chain's free spin data
 */

import { connectDatabase } from '../database/connection';
import { ResultChainRepository } from '../database/repositories/result-chain-repository';
import * as dotenv from 'dotenv';

dotenv.config();

const SCATTER_SYMBOL = 9;
const SCATTER_TRIGGER_COUNT = 4;

async function main() {
    const chainName = process.argv[2] || 'comeback-100boards-bet9_00-1760942759840';

    console.log('🔍 Debug Chain Free Spins');
    console.log('═'.repeat(60));
    console.log(`Chain Name: ${chainName}`);
    console.log('');

    try {
        console.log('🗄️  Connecting to MongoDB...');
        const dbConnection = await connectDatabase();
        console.log('✅ Database connected successfully\n');

        const repo = new ResultChainRepository();
        const chain = await repo.getByName(chainName);

        if (!chain) {
            console.log('❌ Chain not found!');
            process.exit(1);
        }

        console.log('✅ Chain found:', chain.name);
        console.log('   Board count:', chain.totalBoardCount);
        console.log('   Pattern:', chain.patternType);
        console.log('   Volatility:', chain.volatility);
        console.log('');

        // Check each board for scatters - check ALL tumbles, not just first
        let boardsWithScatters = 0;
        let boardsWithWrongFreeSpins = 0;

        console.log('📋 Scanning ALL tumbles for scatter symbols:');
        console.log('─'.repeat(60));

        chain.boardsData.forEach((board: any, index: number) => {
            const tumbles = board.settlementResult?.tumbles;
            const freeSpins = board.settlementResult?.freeSpins;

            // Check if freeSpins.count > 0 (QC uses this to identify triggers)
            if (freeSpins?.count > 0) {
                console.log(`\n[FREESPIN TRIGGER] Board #${index}:`);
                console.log(`   freeSpins.count: ${freeSpins.count}`);
                console.log(`   freeSpins.odds: ${freeSpins.odds}`);
            }

            if (!tumbles || tumbles.length === 0) {
                return;
            }

            // Check ALL tumbles for scatter symbols
            let maxScatterCount = 0;
            let scatterTumbleIndex = -1;

            tumbles.forEach((tumble: any, tIndex: number) => {
                const boardString = tumble.newBoard || tumble.originalBoard;
                if (!boardString || typeof boardString !== 'string') return;

                const symbols = boardString.split(',').map((s: string) => parseInt(s.trim(), 10));
                const scatterCount = symbols.filter((s: number) => s === SCATTER_SYMBOL).length;

                if (scatterCount > maxScatterCount) {
                    maxScatterCount = scatterCount;
                    scatterTumbleIndex = tIndex;
                }

                // Show any board with scatter symbols
                if (scatterCount > 0) {
                    console.log(`\n[SCATTER FOUND] Board #${index}, Tumble #${tIndex}:`);
                    console.log(`   Scatter count: ${scatterCount}`);
                    console.log(`   freeSpins: ${JSON.stringify(freeSpins)}`);
                }
            });

            if (maxScatterCount >= SCATTER_TRIGGER_COUNT) {
                boardsWithScatters++;
                const freeSpinOdds = freeSpins?.odds || 0;

                console.log(`\n[4+ SCATTERS] Board #${index} (Tumble #${scatterTumbleIndex}):`);
                console.log(`   Max scatter count: ${maxScatterCount}`);
                console.log(`   freeSpins.count: ${freeSpins?.count || 0}`);
                console.log(`   freeSpins.odds: ${freeSpinOdds}`);
                console.log(`   Expected odds: 15`);
                console.log(`   Status: ${freeSpinOdds === 15 ? '✅ CORRECT' : '❌ WRONG'}`);

                if (freeSpinOdds !== 15) {
                    boardsWithWrongFreeSpins++;
                }
            }
        });

        console.log('\n' + '═'.repeat(60));
        console.log('📊 SUMMARY');
        console.log('─'.repeat(40));
        console.log(`Total boards: ${chain.totalBoardCount}`);
        console.log(`Boards with ${SCATTER_TRIGGER_COUNT}+ scatters: ${boardsWithScatters}`);
        console.log(`Boards with wrong free spin count: ${boardsWithWrongFreeSpins}`);

        if (dbConnection && dbConnection.close) {
            await dbConnection.close();
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

main().catch(console.error);
