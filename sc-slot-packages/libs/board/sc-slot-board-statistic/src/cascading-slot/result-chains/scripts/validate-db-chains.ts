#!/usr/bin/env ts-node

/**
 * Database Chain RTP Validation Script
 * Connects to MongoDB and validates RTP for all chains in the database
 * Identifies chains with RTP higher than expected that need attention
 *
 * Usage:
 *   npm run validate-db-chains                    - Validates all chains in database
 *   npm run validate-db-chains --tolerance 0.02   - Set RTP tolerance (default: 2%)
 *   npm run validate-db-chains --pattern discovery - Filter by pattern type
 *   npm run validate-db-chains --volatility 2     - Filter by volatility
 */

import { connectDatabase } from '../database/connection';
import { ResultChainRepository } from '../database/repositories/result-chain-repository';
import * as dotenv from 'dotenv';
import {
    calculateTotalHouseExpenditure,
    calculateFreeSpinCost,
    calculateExpectedFreeSpinPayout
} from '../utils/free-spin-utils';

// Load environment variables
dotenv.config();

interface ValidationConfig {
    tolerance: number;
    patternType?: string;
    volatility?: number;
    limit: number;
    showAll: boolean;
}

interface ChainValidationResult {
    chainId: string;
    chainName: string;
    patternType: string;
    volatility: number;
    boardCount: number;
    betLevel: number;
    coinValue: number;
    baseBetAmount: number;

    // RTP Calculations
    totalWin: number;
    totalHouseExpenditure: number;
    totalWinForRTP: number;
    totalBets: number;
    calculatedRTP: number;
    targetRTP: number;
    rtpVariance: number;
    meetsTarget: boolean;

    // Status
    status: 'PASS' | 'HIGH' | 'LOW';
    needsAttention: boolean;

    // Additional stats
    freeSpinTriggers: number;
    totalFreeSpinsAwarded: number;
    winningBoards: number;
    hitFrequency: number;
}

interface ValidationSummary {
    totalChains: number;
    passedChains: number;
    highRTPChains: number;
    averageRTP: number;
    averageVariance: number;
    chainsNeedingAttention: ChainValidationResult[];
}

/**
 * Validate a single chain from database
 */
function validateChain(
    chainData: any,
    tolerance: number
): ChainValidationResult | null {
    try {
        const boards = chainData.boardsData;
        const boardCount = chainData.totalBoardCount;
        const betLevel = chainData.betLevel;
        const coinValue = chainData.coinValue;
        const baseBetAmount = chainData.baseBetAmount;

        // Calculate total bet amount per spin (baseBetAmount * betMultiplier)
        // For cascading slots, betMultiplier is typically 20
        const betMultiplier = 20;
        const totalBetAmount = baseBetAmount * betMultiplier;

        // Calculate total board wins
        const totalWin = boards.reduce((sum: number, board: any) => sum + (board.totalWin || 0), 0);

        // Calculate free spin statistics
        let freeSpinTriggers = 0;
        let totalFreeSpinsAwarded = 0;

        boards.forEach((board: any) => {
            if (board.settlementResult?.freeSpins?.odds > 0) {
                const awardedSpins = board.settlementResult.freeSpins.odds;
                freeSpinTriggers++;
                totalFreeSpinsAwarded += awardedSpins;
            }
        });

        // Calculate house expenditure for free spins
        const totalHouseExpenditure = calculateTotalHouseExpenditure(
            totalFreeSpinsAwarded,
            totalBetAmount
        );

        // Calculate RTP
        const totalBets = boardCount * totalBetAmount;
        const totalWinForRTP = totalWin + totalHouseExpenditure;
        const calculatedRTP = totalWinForRTP / totalBets;

        // Target RTP based on volatility (typical values)
        const volatilityRTPMap: { [key: number]: number } = {
            1: 0.96,  // Low
            2: 0.96,  // MediumLow
            3: 0.96,  // Medium
            4: 0.96,  // High
            5: 0.96   // VeryHigh
        };
        const targetRTP = volatilityRTPMap[chainData.volatility] || 0.96;

        const rtpVariance = calculatedRTP - targetRTP;
        const meetsTarget = Math.abs(rtpVariance) <= tolerance;

        // Determine status
        let status: 'PASS' | 'HIGH' | 'LOW';
        if (meetsTarget) {
            status = 'PASS';
        } else if (calculatedRTP > targetRTP) {
            status = 'HIGH';
        } else {
            status = 'LOW';
        }

        // Additional statistics
        const winningBoards = boards.filter((board: any) => (board.totalWin || 0) > 0).length;
        const hitFrequency = winningBoards / boardCount;

        return {
            chainId: chainData._id.toString(),
            chainName: chainData.name,
            patternType: chainData.patternType || 'unknown',
            volatility: chainData.volatility || 0,
            boardCount,
            betLevel,
            coinValue,
            baseBetAmount,

            totalWin,
            totalHouseExpenditure,
            totalWinForRTP,
            totalBets,
            calculatedRTP,
            targetRTP,
            rtpVariance,
            meetsTarget,

            status,
            needsAttention: status === 'HIGH',

            freeSpinTriggers,
            totalFreeSpinsAwarded,
            winningBoards,
            hitFrequency
        };
    } catch (error) {
        console.error(`❌ Error validating chain ${chainData.name}:`, error);
        return null;
    }
}

/**
 * Format validation result for display
 */
function formatResult(result: ChainValidationResult): string {
    const statusEmoji = result.status === 'PASS' ? '✅' : result.status === 'HIGH' ? '🔴' : '🟡';
    const rtpPercent = (result.calculatedRTP * 100).toFixed(2);
    const variancePercent = (result.rtpVariance * 100).toFixed(2);
    const varianceSign = result.rtpVariance >= 0 ? '+' : '';

    return `${statusEmoji} ${result.chainName.padEnd(50)} | RTP: ${rtpPercent}% | Var: ${varianceSign}${variancePercent}% | Boards: ${result.boardCount}`;
}

/**
 * Generate summary report
 */
function generateSummary(results: ChainValidationResult[]): ValidationSummary {
    const totalChains = results.length;
    const passedChains = results.filter(r => r.status === 'PASS').length;
    const highRTPChains = results.filter(r => r.status === 'HIGH').length;

    const averageRTP = results.reduce((sum, r) => sum + r.calculatedRTP, 0) / totalChains;
    const averageVariance = results.reduce((sum, r) => sum + Math.abs(r.rtpVariance), 0) / totalChains;

    // Chains needing attention (HIGH RTP - paying out more than expected)
    // Sort by calculated RTP descending (highest RTP first)
    const chainsNeedingAttention = results
        .filter(r => r.needsAttention)
        .sort((a, b) => b.calculatedRTP - a.calculatedRTP);

    return {
        totalChains,
        passedChains,
        highRTPChains,
        averageRTP,
        averageVariance,
        chainsNeedingAttention
    };
}

/**
 * Print summary report
 */
function printSummary(summary: ValidationSummary, config: ValidationConfig): void {
    console.log('\n' + '═'.repeat(70));
    console.log('           DATABASE CHAIN RTP VALIDATION SUMMARY');
    console.log('═'.repeat(70));

    console.log('\n📊 OVERALL STATISTICS');
    console.log('─'.repeat(40));
    console.log(`Total Chains Validated: ${summary.totalChains}`);
    console.log(`Passed (within ±${(config.tolerance * 100).toFixed(1)}%): ${summary.passedChains} (${((summary.passedChains / summary.totalChains) * 100).toFixed(1)}%)`);
    console.log(`High RTP (above target): ${summary.highRTPChains} (${((summary.highRTPChains / summary.totalChains) * 100).toFixed(1)}%)`);
    console.log(`\nAverage RTP: ${(summary.averageRTP * 100).toFixed(2)}%`);
    console.log(`Average Variance: ${(summary.averageVariance * 100).toFixed(2)}%`);

    if (summary.chainsNeedingAttention.length > 0) {
        console.log('\n🔴 CHAINS WITH HIGH RTP (Need Attention)');
        console.log('─'.repeat(70));
        console.log('These chains are paying out MORE than expected RTP:\n');

        summary.chainsNeedingAttention.forEach((chain, index) => {
            console.log(`${index + 1}. ${chain.chainName}`);
            console.log(`   ID: ${chain.chainId}`);
            console.log(`   Pattern: ${chain.patternType} | Volatility: ${chain.volatility}`);
            console.log(`   RTP: ${(chain.calculatedRTP * 100).toFixed(2)}% | Target: ${(chain.targetRTP * 100).toFixed(2)}%`);
            console.log(`   Variance: +${(chain.rtpVariance * 100).toFixed(2)}%`);
            console.log(`   Bet: Level=${chain.betLevel}, Coin=${chain.coinValue}, Base=${chain.baseBetAmount.toFixed(2)}`);
            console.log(`   Stats: ${chain.boardCount} boards, ${chain.freeSpinTriggers} free spin triggers`);
            console.log('');
        });
    } else {
        console.log('\n✅ No chains with high RTP found. All chains within tolerance.');
    }

    console.log('═'.repeat(70));
}

/**
 * Parse command line arguments
 */
function parseArguments(args: string[]): ValidationConfig {
    const config: ValidationConfig = {
        tolerance: 0.02, // Default 2%
        limit: 1000,
        showAll: false
    };

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];

        switch (arg) {
            case '--tolerance':
                config.tolerance = parseFloat(args[++i]) || config.tolerance;
                break;
            case '--pattern':
                config.patternType = args[++i];
                break;
            case '--volatility':
                config.volatility = parseInt(args[++i]);
                break;
            case '--limit':
                config.limit = parseInt(args[++i]) || config.limit;
                break;
            case '--show-all':
                config.showAll = true;
                break;
            case '--help':
                showHelp();
                process.exit(0);
            default:
                if (arg.startsWith('--')) {
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
Database Chain RTP Validation Script

Usage: npm run validate-db-chains [options]

Options:
  --tolerance <number>    RTP tolerance as decimal (default: 0.02 for ±2%)
  --pattern <string>      Filter by pattern type (comeback, cliffhanger, discovery, tease, wave)
  --volatility <number>   Filter by volatility (1=Low, 2=MediumLow, 3=Medium, 4=High, 5=VeryHigh)
  --limit <number>        Maximum chains to validate (default: 1000)
  --show-all             Show all chain results, not just summary
  --help                  Show this help message

Examples:
  npm run validate-db-chains
  npm run validate-db-chains -- --tolerance 0.01
  npm run validate-db-chains -- --pattern discovery --volatility 2
  npm run validate-db-chains -- --show-all

Output:
  - Lists all chains with RTP higher than target that need attention
  - Provides summary statistics for all validated chains
  - Exit code 0 if no high RTP chains, 1 if any found
`);
}

/**
 * Main function
 */
async function main() {
    const args = process.argv.slice(2);
    const config = parseArguments(args);

    console.log('🔍 Database Chain RTP Validation Script');
    console.log('═'.repeat(50));
    console.log(`Tolerance: ±${(config.tolerance * 100).toFixed(1)}%`);
    if (config.patternType) console.log(`Pattern Filter: ${config.patternType}`);
    if (config.volatility) console.log(`Volatility Filter: ${config.volatility}`);
    console.log(`Limit: ${config.limit} chains`);
    console.log('');

    try {
        // Connect to database
        console.log('🗄️  Connecting to MongoDB...');
        const dbConnection = await connectDatabase();
        console.log('✅ Database connected successfully\n');

        // Initialize repository
        const chainRepository = new ResultChainRepository();

        // Build filter
        const filter: any = {
            inactive: false // Only validate active chains
        };
        if (config.patternType) filter.patternType = config.patternType;
        if (config.volatility) filter.volatility = config.volatility;

        // Fetch chains from database
        console.log('📊 Fetching chains from database...');
        const { chains, total } = await chainRepository.getFiltered(filter, config.limit, 0);
        console.log(`📁 Found ${total} chains total, validating ${chains.length}\n`);

        if (chains.length === 0) {
            console.log('❌ No chains found matching the criteria');
            if (dbConnection && dbConnection.close) {
                await dbConnection.close();
            }
            process.exit(0);
        }

        // Validate each chain
        console.log('🔄 Validating chains...\n');
        const results: ChainValidationResult[] = [];
        let processedCount = 0;

        for (const chain of chains) {
            processedCount++;
            const result = validateChain(chain, config.tolerance);

            if (result) {
                results.push(result);

                if (config.showAll) {
                    console.log(formatResult(result));
                } else if (!result.meetsTarget) {
                    // Only show non-passing chains during validation
                    console.log(formatResult(result));
                }
            }

            // Progress update every 100 chains
            if (processedCount % 100 === 0) {
                console.log(`... processed ${processedCount}/${chains.length} chains`);
            }
        }

        // Generate and print summary
        const summary = generateSummary(results);
        printSummary(summary, config);

        // Close database connection
        if (dbConnection && dbConnection.close) {
            await dbConnection.close();
        }

        // Exit with appropriate code
        if (summary.highRTPChains > 0) {
            console.log(`\n⚠️  ${summary.highRTPChains} chains have higher RTP than expected and need attention.`);
            process.exit(1);
        } else {
            console.log('\n✅ All chains are within acceptable RTP tolerance.');
            process.exit(0);
        }

    } catch (error) {
        console.error('❌ Validation failed:', error);
        process.exit(1);
    }
}

// Run the script
const isMainModule = process.argv[1] && process.argv[1].includes('validate-db-chains');
if (isMainModule) {
    main().catch(console.error);
}

export { validateChain, ChainValidationResult, ValidationSummary };
