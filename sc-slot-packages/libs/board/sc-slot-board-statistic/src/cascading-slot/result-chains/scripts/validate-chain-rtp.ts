#!/usr/bin/env ts-node

/**
 * RTP Validation Script for Result Chains
 * Validates that generated chains achieve their target RTP
 * Formula: RTP = (totalTumbleWin + totalHouseExpenditure) / totalBets
 *
 * Usage:
 *   npm run validate-rtp                          - Validates all chains in ./chain-output
 *   npm run validate-rtp <directory>              - Validates all chains in specified directory
 *   npm run validate-rtp <chain-file.json>        - Validates a single chain file
 *
 * Features:
 *   - Scans directory for chain files (ignores generation-summary files and subdirectories)
 *   - Generates summary report with pattern breakdown
 *   - Saves detailed validation results to JSON
 *   - Exit code 0 if all chains pass, 1 if any fail
 */

import * as fs from 'fs';
import * as path from 'path';
import {
    calculateTotalHouseExpenditure,
    calculateFreeSpinCost,
    calculateExpectedFreeSpinPayout
} from '../utils/free-spin-utils';

interface ChainMetadata {
    name: string;
    patternType: string;
    boardCount: number;
    targetRTP: number;
    actualRTP: number;
    rtpVariance: number;
    meetsTargetRTP: boolean;
    generatedAt: string;
    betData: {
        betLevel: number;
        coinValue: number;
        betMultiplier: number;
        baseBetAmount: number;
        totalBetAmount: number;
    };
}

interface ChainBoard {
    board: number[];
    multipliers: number[];
    accumulatedMultiplier: number;
    remainingFreeSpins: number;
    freeSpinsPlayed: number;
    freeSpinWins: number;
    settlementResult: {
        tumbles: any[];
        freeSpins: { count: number; odds: number };
        additionalFreeSpins: { count: number; odds: number };
    };
    totalTumbleWin: number;
    boardMultiplierSum: number;
    totalWin: number;
    freeSpinBoards?: Array<{
        board: number[];
        multipliers: number[];
        isFreeSpin: boolean;
        accumulatedMultiplier: number;
        remainingFreeSpins: number;
        freeSpinsPlayed: number;
        freeSpinWins: number;
        originalBoard?: string;
        settlementResult?: any;
    }>;
}

interface ChainData {
    metadata: ChainMetadata;
    boards: ChainBoard[];
}

interface RTPValidationResult {
    chainName: string;
    metadata: ChainMetadata;

    // Win calculations
    totalWin: number; // Sum of all board wins (includes multipliers and executed free spins)
    averageWinPerBoard: number;

    // Free spin expenditure calculations
    totalFreeSpinCost: number;
    expectedFreeSpinPayout: number;
    totalHouseExpenditure: number;

    // Overall RTP calculation
    totalWinForRTP: number; // totalWin + totalHouseExpenditure (same as RTP controller)
    totalBets: number;
    calculatedRTP: number;
    rtpVariance: number;
    meetsTarget: boolean;

    // Additional statistics
    freeSpinTriggers: number;
    totalFreeSpinsAwarded: number;
    totalRetriggerSpins: number;
    winningBoards: number;
    hitFrequency: number;
}

/**
 * Validate RTP for a single chain file
 */
function validateChainRTP(filePath: string): RTPValidationResult | null {
    try {
        const data: ChainData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const { metadata, boards } = data;

        // Calculate total board wins (base game wins only, as per user's clarification)
        const totalWin = boards.reduce((sum, board) => sum + (board.totalWin || 0), 0);

        // Debug: Print original boards for free spin rounds
        console.log('\n🎰 FREE SPIN BOARD ANALYSIS:');
        let freeSpinBoardCount = 0;
        boards.forEach((board, index) => {
            
            if(board.settlementResult?.freeSpins?.odds > 0) {
                freeSpinBoardCount++;
                console.log(`Free spin board ${index + 1}:`);
                console.log(`  Free spins awarded: ${board.settlementResult.freeSpins.count}`);
                console.log(`  Free spin payout odds: ${board.settlementResult.freeSpins.odds}`);
                console.log(`  Original board: ${board.board.join(',')}`);
            }
        });
        console.log(`Total free spin boards found: ${freeSpinBoardCount}\n`);

        // Calculate free spin expenditure (for reporting, not RTP calculation)
        let totalFreeSpinCost = 0;
        let expectedFreeSpinPayout = 0;
        let freeSpinTriggers = 0;
        let totalFreeSpinsAwarded = 0;
        let totalRetriggerSpins = 0;

    boards.forEach(board => {
        // Count free spin triggers (base game awards only, since free spin execution is removed)
        if (board.settlementResult?.freeSpins?.odds > 0) {
            const awardedSpins = board.settlementResult.freeSpins.odds;
            totalFreeSpinCost += calculateFreeSpinCost(awardedSpins, metadata.betData.totalBetAmount);
            expectedFreeSpinPayout += calculateExpectedFreeSpinPayout(awardedSpins, metadata.betData.totalBetAmount);
            freeSpinTriggers++;
            totalFreeSpinsAwarded += awardedSpins;
        }
    });

    const totalHouseExpenditure = calculateTotalHouseExpenditure(
        totalFreeSpinsAwarded + totalRetriggerSpins,
        metadata.betData.totalBetAmount
    );

    // Calculate overall RTP using same logic as RTP controller
    // boardWin (totalWin) = base game wins only
    // totalHouseExpenditure = expected value of awarded free spins
    // RTP = (boardWin + totalHouseExpenditure) / totalBets
    const totalBets = metadata.boardCount * metadata.betData.totalBetAmount;
    const totalWinForRTP = totalWin + totalHouseExpenditure;
    const calculatedRTP = totalWinForRTP / totalBets;
    const rtpVariance = calculatedRTP - metadata.targetRTP;
    const meetsTarget = Math.abs(rtpVariance) <= 0.02; // ±2% tolerance

        // Additional statistics
        const winningBoards = boards.filter(board => (board.totalWin || 0) > 0).length;
        const hitFrequency = winningBoards / metadata.boardCount;

        return {
            chainName: metadata.name,
            metadata,

            // Win calculations
            totalWin,
            averageWinPerBoard: totalWin / metadata.boardCount,

            // Free spin expenditure calculations
            totalFreeSpinCost,
            expectedFreeSpinPayout,
            totalHouseExpenditure,

            // Overall RTP calculation
            totalWinForRTP,
            totalBets,
            calculatedRTP,
            rtpVariance,
            meetsTarget,

            // Additional statistics
            freeSpinTriggers,
            totalFreeSpinsAwarded,
            totalRetriggerSpins,
            winningBoards,
            hitFrequency
        };

    } catch (error) {
        console.error(`❌ Error validating chain RTP for ${filePath}:`, error);
        return null;
    }
}

/**
 * Format RTP validation result for display
 */
function formatRTPValidationResult(result: RTPValidationResult): string {
    const { metadata } = result;

    return `
🎯 RTP VALIDATION REPORT
========================
Chain: ${result.chainName}
Pattern: ${metadata.patternType}
Boards: ${metadata.boardCount}
Target RTP: ${(metadata.targetRTP * 100).toFixed(2)}%

📊 WIN BREAKDOWN
----------------
Total Board Wins: $${result.totalWin.toFixed(2)}
Average Per Board: $${result.averageWinPerBoard.toFixed(2)}

🎰 FREE SPIN EXPENDITURE
------------------------
Free Spin Cost: $${result.totalFreeSpinCost.toFixed(2)}
Expected RTP Payout: $${result.expectedFreeSpinPayout.toFixed(2)}
Total House Expenditure: $${result.totalHouseExpenditure.toFixed(2)}

🎲 OVERALL RTP CALCULATION
--------------------------
Board Wins: $${result.totalWin.toFixed(2)} (base game wins)
House Expenditure: $${result.totalHouseExpenditure.toFixed(2)} (free spin value)
Total Win (for RTP): $${result.totalWinForRTP.toFixed(2)} (board wins + expenditure)
Total Bets: $${result.totalBets.toFixed(2)}
Calculated RTP: ${(result.calculatedRTP * 100).toFixed(2)}%
Target RTP: ${(metadata.targetRTP * 100).toFixed(2)}%
Variance: ${(result.rtpVariance * 100).toFixed(2)}%
Meets Target: ${result.meetsTarget ? '✅ YES' : '❌ NO'}

📈 ADDITIONAL STATISTICS
-----------------------
Free Spin Triggers: ${result.freeSpinTriggers}
Total Free Spins Awarded: ${result.totalFreeSpinsAwarded}
Retrigger Spins: ${result.totalRetriggerSpins}
Winning Boards: ${result.winningBoards}/${metadata.boardCount}
Hit Frequency: ${(result.hitFrequency * 100).toFixed(1)}%

💰 BET INFORMATION
-----------------
Bet Level: ${metadata.betData.betLevel}
Coin Value: $${metadata.betData.coinValue.toFixed(2)}
Base Bet: $${metadata.betData.baseBetAmount.toFixed(2)}
Total Bet: $${metadata.betData.totalBetAmount.toFixed(2)}
Total Wagered: $${result.totalBets.toFixed(2)}
`;
}

/**
 * Get all chain files from chain-output directory
 * Ignores generation-summary files and subdirectories
 */
function getChainFiles(chainOutputDir: string): string[] {
    if (!fs.existsSync(chainOutputDir)) {
        console.log(`❌ Error: Chain output directory not found: ${chainOutputDir}`);
        return [];
    }

    const files = fs.readdirSync(chainOutputDir);
    const chainFiles: string[] = [];

    for (const file of files) {
        const filePath = path.join(chainOutputDir, file);
        const stats = fs.statSync(filePath);

        // Skip directories
        if (stats.isDirectory()) {
            continue;
        }

        // Skip generation-summary files
        if (file.startsWith('generation-summary-')) {
            continue;
        }

        // Only include .json files
        if (file.endsWith('.json')) {
            chainFiles.push(filePath);
        }
    }

    return chainFiles.sort(); // Sort alphabetically for consistent ordering
}

/**
 * Generate summary report for multiple chains
 */
function generateSummaryReport(results: RTPValidationResult[]): string {
    const totalChains = results.length;
    const passedChains = results.filter(r => r.meetsTarget).length;
    const failedChains = totalChains - passedChains;
    const passRate = (passedChains / totalChains) * 100;

    const avgRTP = results.reduce((sum, r) => sum + r.calculatedRTP, 0) / totalChains;
    const avgVariance = results.reduce((sum, r) => sum + Math.abs(r.rtpVariance), 0) / totalChains;
    const avgHitFrequency = results.reduce((sum, r) => sum + r.hitFrequency, 0) / totalChains;

    // Group by pattern type
    const patternGroups: { [pattern: string]: RTPValidationResult[] } = {};
    results.forEach(r => {
        const pattern = r.metadata.patternType;
        if (!patternGroups[pattern]) {
            patternGroups[pattern] = [];
        }
        patternGroups[pattern].push(r);
    });

    let report = `
╔═══════════════════════════════════════════════════════════════╗
║           CHAIN RTP VALIDATION SUMMARY REPORT                  ║
╚═══════════════════════════════════════════════════════════════╝

📊 OVERALL STATISTICS
---------------------
Total Chains: ${totalChains}
Passed: ${passedChains} (${passRate.toFixed(1)}%)
Failed: ${failedChains} (${((failedChains / totalChains) * 100).toFixed(1)}%)

Average RTP: ${(avgRTP * 100).toFixed(2)}%
Average Variance: ${(avgVariance * 100).toFixed(2)}%
Average Hit Frequency: ${(avgHitFrequency * 100).toFixed(1)}%

`;

    // Pattern breakdown
    report += `🎭 PATTERN BREAKDOWN
--------------------
`;
    for (const [pattern, patternResults] of Object.entries(patternGroups)) {
        const patternPassed = patternResults.filter(r => r.meetsTarget).length;
        const patternTotal = patternResults.length;
        const patternPassRate = (patternPassed / patternTotal) * 100;
        const patternAvgRTP = patternResults.reduce((sum, r) => sum + r.calculatedRTP, 0) / patternTotal;

        report += `  ${pattern.padEnd(15)} ${patternPassed}/${patternTotal} (${patternPassRate.toFixed(1)}%) - Avg RTP: ${(patternAvgRTP * 100).toFixed(2)}%\n`;
    }

    // Failed chains detail
    const failedResults = results.filter(r => !r.meetsTarget);
    if (failedResults.length > 0) {
        report += `
❌ FAILED CHAINS (${failedResults.length})
--------------------
`;
        failedResults.forEach(r => {
            report += `  ${r.chainName}\n`;
            report += `    Target: ${(r.metadata.targetRTP * 100).toFixed(2)}%, Actual: ${(r.calculatedRTP * 100).toFixed(2)}%, Variance: ${(r.rtpVariance * 100).toFixed(2)}%\n`;
        });
    }

    return report;
}

/**
 * Main validation function
 */
function main() {
    const args = process.argv.slice(2);

    // If a specific file is provided, validate just that file
    if (args.length > 0 && args[0].endsWith('.json')) {
        const chainFile = args[0];

        if (!fs.existsSync(chainFile)) {
            console.log(`❌ Error: Chain file not found: ${chainFile}`);
            process.exit(1);
        }

        console.log('🔍 Validating Single Chain RTP...');
        console.log(`📄 File: ${chainFile}\n`);

        const validationResult = validateChainRTP(chainFile);

        if (!validationResult) {
            console.log('❌ Failed to validate chain RTP');
            process.exit(1);
        }

        console.log(formatRTPValidationResult(validationResult));

        // Exit with appropriate code
        if (validationResult.meetsTarget) {
            console.log('✅ RTP validation PASSED');
            process.exit(0);
        } else {
            console.log('❌ RTP validation FAILED');
            process.exit(1);
        }
    }

    // Otherwise, scan chain-output directory
    const chainOutputDir = args[0] || './chain-output';

    console.log('🔍 Scanning Chain Output Directory...');
    console.log(`📁 Directory: ${chainOutputDir}\n`);

    const chainFiles = getChainFiles(chainOutputDir);

    if (chainFiles.length === 0) {
        console.log('❌ No chain files found in directory');
        console.log('💡 Make sure you have generated chains using: npm run generate-chains');
        process.exit(1);
    }

    console.log(`📊 Found ${chainFiles.length} chain files\n`);

    // Validate all chains
    const results: RTPValidationResult[] = [];
    let validatedCount = 0;
    let failedCount = 0;

    for (const chainFile of chainFiles) {
        const fileName = path.basename(chainFile);
        process.stdout.write(`Validating ${fileName}... `);

        const validationResult = validateChainRTP(chainFile);

        if (validationResult) {
            results.push(validationResult);
            validatedCount++;

            if (validationResult.meetsTarget) {
                console.log('✅ PASS');
            } else {
                console.log(`❌ FAIL (RTP: ${(validationResult.calculatedRTP * 100).toFixed(2)}%)`);
                failedCount++;
            }
        } else {
            console.log('❌ ERROR');
            failedCount++;
        }
    }

    console.log('');

    // Generate summary report
    if (results.length > 0) {
        console.log(generateSummaryReport(results));

        // Save detailed results to JSON
        const summaryPath = path.join(chainOutputDir, `rtp-validation-summary-${Date.now()}.json`);
        const summaryData = {
            timestamp: new Date().toISOString(),
            totalChains: results.length,
            passedChains: results.filter(r => r.meetsTarget).length,
            failedChains: results.filter(r => !r.meetsTarget).length,
            results: results
        };

        fs.writeFileSync(summaryPath, JSON.stringify(summaryData, null, 2));
        console.log(`💾 Detailed results saved to: ${summaryPath}\n`);
    }

    // Exit with appropriate code
    if (failedCount === 0) {
        console.log('✅ ALL CHAINS PASSED RTP VALIDATION');
        process.exit(0);
    } else {
        console.log(`❌ ${failedCount} CHAINS FAILED RTP VALIDATION`);
        process.exit(1);
    }
}

// Run the script if executed directly
if (process.argv[1]?.endsWith('validate-chain-rtp.ts')) {
    main();
}

export { validateChainRTP, RTPValidationResult };
