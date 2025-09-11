#!/usr/bin/env ts-node

/**
 * Chain Verification Script
 * 
 * Validates chain data integrity including explodedSymbols and boardSequence.
 * Run this after generating chains to ensure correctness.
 * 
 * Usage:
 *   npm run verify-chain                    # Validate latest chain
 *   npm run verify-chain -- latest         # Validate latest chain  
 *   npm run verify-chain -- all           # Validate all chains
 *   npm run verify-chain -- file.json     # Validate specific file
 */

import { ExplodedSymbolsValidator } from '../utils/exploded-symbols-validator.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

async function main() {
    console.log('🔍 Chain Data Verification Tool');
    console.log('===============================\n');
    console.log('Validates explodedSymbols and boardSequence integrity\n');

    const args = process.argv.slice(2);
    const mode = args[0] || 'latest';

    try {
        if (mode === 'all') {
            // Validate all chain files
            console.log('📂 Validating all chain files...\n');
            
            const results = ExplodedSymbolsValidator.validateAllChains('./chain-output');
            
            if (results.length === 0) {
                console.log('⚠️  No chain files found to validate.');
                return;
            }

            let totalValid = 0;
            let totalInvalid = 0;

            results.forEach((result, index) => {
                console.log(`\n[${index + 1}/${results.length}] ${result.fileName}:`);
                
                if (result.isValid) {
                    totalValid++;
                    console.log(`✅ VALID - ${result.validExplodedSymbols}/${result.tumblesWithWins} tumbles validated`);
                } else {
                    totalInvalid++;
                    console.log(`❌ INVALID - ${result.errors.length} errors found`);
                    result.errors.slice(0, 3).forEach(error => {
                        console.log(`   • ${error}`);
                    });
                    if (result.errors.length > 3) {
                        console.log(`   • ... and ${result.errors.length - 3} more errors`);
                    }
                }
            });

            console.log(`\n📊 Overall Results:`);
            console.log(`   Valid Chains: ${totalValid}/${results.length}`);
            console.log(`   Invalid Chains: ${totalInvalid}/${results.length}`);
            console.log(`   Success Rate: ${((totalValid / results.length) * 100).toFixed(1)}%`);

            if (totalValid === results.length) {
                console.log(`\n🎉 ALL CHAINS VALIDATED SUCCESSFULLY!`);
                console.log(`   explodedSymbols data integrity is perfect across all chains.`);
            } else {
                console.log(`\n⚠️  Some chains have validation issues that need attention.`);
            }

        } else if (mode === 'latest' || mode === '') {
            // Validate latest chain
            console.log('📂 Validating latest chain file...\n');
            
            const result = ExplodedSymbolsValidator.validateLatestChain('./chain-output');
            
            console.log(result.summary);
            
            // Add initialBoard validation
            const initialBoardResult = validateInitialBoard('./chain-output');
            console.log(`\n🔍 TumbleSequence Validation:`);
            console.log(initialBoardResult.summary);
            
            if (result.errors.length > 0) {
                console.log(`\n❌ ExplodedSymbols Validation Errors:`);
                result.errors.forEach((error, index) => {
                    console.log(`   ${index + 1}. ${error}`);
                });
            }

            if (initialBoardResult.errors.length > 0) {
                console.log(`\n❌ TumbleSequence Validation Errors:`);
                initialBoardResult.errors.forEach((error, index) => {
                    console.log(`   ${index + 1}. ${error}`);
                });
            }

            if (result.warnings.length > 0) {
                console.log(`\n⚠️  Warnings:`);
                result.warnings.forEach((warning, index) => {
                    console.log(`   ${index + 1}. ${warning}`);
                });
            }

            const overallValid = result.isValid && initialBoardResult.isValid;
            if (overallValid) {
                console.log(`\n🎉 OVERALL VALIDATION SUCCESSFUL!`);
                console.log(`   ✅ All explodedSymbols data is correct and consistent.`);
                console.log(`   ✅ All tumble sequences have proper initial state insertion.`);
                console.log(`   Chain is ready for production use.`);
            } else {
                console.log(`\n❌ OVERALL VALIDATION FAILED!`);
                if (!result.isValid) {
                    console.log(`   ❌ ExplodedSymbols validation issues detected.`);
                }
                if (!initialBoardResult.isValid) {
                    console.log(`   ❌ TumbleSequence validation issues detected.`);
                }
                console.log(`   Data integrity issues found. Please review and fix.`);
                process.exit(1);
            }

        } else {
            // Validate specific file
            const filePath = path.resolve('./chain-output', mode);
            console.log(`📂 Validating specific file: ${mode}\n`);
            
            const result = ExplodedSymbolsValidator.validateChainFile(filePath);
            
            console.log(result.summary);
            
            if (result.errors.length > 0) {
                console.log(`\n❌ Validation Errors:`);
                result.errors.forEach((error, index) => {
                    console.log(`   ${index + 1}. ${error}`);
                });
            }

            if (result.warnings.length > 0) {
                console.log(`\n⚠️  Warnings:`);
                result.warnings.forEach((warning, index) => {
                    console.log(`   ${index + 1}. ${warning}`);
                });
            }

            if (result.isValid) {
                console.log(`\n🎉 VALIDATION SUCCESSFUL!`);
            } else {
                console.log(`\n❌ VALIDATION FAILED!`);
                process.exit(1);
            }
        }

    } catch (error: any) {
        console.error('💥 Verification script failed:', error.message);
        console.error('Stack trace:', error.stack);
        process.exit(1);
    }
}

/**
 * Validate initial board data in tumbles array
 */
function validateInitialBoard(chainOutputDir: string) {
    const result = {
        isValid: false,
        summary: '',
        errors: [] as string[],
        boardsWithInitialBoard: 0,
        totalBoards: 0,
        totalTumbles: 0,
        tumblesWithInitialBoard: 0,
        boardsWithWins: 0,
        winningBoardsWithInitialBoard: 0,
        fileName: ''
    };

    try {
        // Find latest chain file
        const files = fs.readdirSync(chainOutputDir)
            .filter(f => f.endsWith('.json') && !f.startsWith('generation-summary-'))
            .sort((a, b) => {
                const statA = fs.statSync(path.join(chainOutputDir, a));
                const statB = fs.statSync(path.join(chainOutputDir, b));
                return statB.mtime.getTime() - statA.mtime.getTime();
            });

        if (files.length === 0) {
            result.errors.push('No chain files found');
            result.summary = '❌ No chain files to validate';
            return result;
        }

        const latestFile = files[0];
        result.fileName = latestFile;
        const filePath = path.join(chainOutputDir, latestFile);
        const chainData = JSON.parse(fs.readFileSync(filePath, 'utf8'));

        if (!chainData.boards || !Array.isArray(chainData.boards)) {
            result.errors.push('No boards array found in chain data');
            result.summary = '❌ Invalid chain file structure';
            return result;
        }

        result.totalBoards = chainData.boards.length;

        // Check each board for proper tumble sequence, focusing on boards with wins
        let boardsWithWins = 0;
        let winningBoardsWithValidSequence = 0;
        
        chainData.boards.forEach((board: any, index: number) => {
            const tumbles = board.settlementResult?.tumbles || [];
            const totalWin = board.totalTumbleWin || 0;
            result.totalTumbles += tumbles.length;
            
            // Focus on boards with CASCADE wins - these MUST have proper sequence  
            const hasActualCascades = tumbles.some((tumble: any) => tumble.win > 0);
            if (totalWin > 0 && hasActualCascades) {
                boardsWithWins++;
                if (tumbles.length >= 3) { // Should be: initial(0) + cascade(s) + final(0)
                    const firstTumble = tumbles[0];
                    
                    // Validate first tumble is initial state (originalBoard == newBoard, win: 0)
                    if (firstTumble.win === 0 && 
                        firstTumble.originalBoard === firstTumble.newBoard &&
                        firstTumble.originalBoard && firstTumble.originalBoard.split(',').length === 30) {
                        
                        // Validate at least one cascade tumble has win > 0
                        let hasWinningCascade = false;
                        let hasFinalState = false;
                        
                        for (let i = 1; i < tumbles.length; i++) {
                            if (tumbles[i].win > 0) {
                                hasWinningCascade = true;
                            }
                            if (i === tumbles.length - 1 && tumbles[i].win === 0) {
                                hasFinalState = true;
                            }
                        }
                        
                        if (hasWinningCascade && hasFinalState) {
                            winningBoardsWithValidSequence++;
                            result.boardsWithInitialBoard++;
                            result.tumblesWithInitialBoard++;
                        } else {
                            if (!hasWinningCascade) {
                                result.errors.push(`Board ${index}: Has totalWin (${totalWin}) but no cascade tumbles with win > 0`);
                            }
                            if (!hasFinalState) {
                                result.errors.push(`Board ${index}: Missing final tumble with win: 0`);
                            }
                        }
                    } else {
                        result.errors.push(`Board ${index}: Has win (${totalWin}) but first tumble is not initial state (win: ${firstTumble.win})`);
                    }
                } else {
                    result.errors.push(`Board ${index}: Has win (${totalWin}) but insufficient tumbles (${tumbles.length}, need >= 3)`);
                }
            } else if (tumbles.length > 0) {
                // Non-winning boards - just count them
                result.boardsWithInitialBoard++;
                result.tumblesWithInitialBoard++;
            }
        });
        
        // Store additional metrics
        result.boardsWithWins = boardsWithWins;
        result.winningBoardsWithInitialBoard = winningBoardsWithValidSequence;

        const hasInitialBoardData = result.boardsWithInitialBoard > 0;
        const percentage = result.totalBoards > 0 ? ((result.boardsWithInitialBoard / result.totalBoards) * 100).toFixed(1) : '0';
        const winningPercentage = result.boardsWithWins > 0 ? ((result.winningBoardsWithInitialBoard / result.boardsWithWins) * 100).toFixed(1) : '0';
        
        // Critical: All winning boards MUST have valid tumble sequence
        if (result.boardsWithWins > 0 && result.winningBoardsWithInitialBoard < result.boardsWithWins) {
            result.errors.push(`${result.boardsWithWins - result.winningBoardsWithInitialBoard}/${result.boardsWithWins} winning boards have invalid tumble sequence`);
        }
        
        if (!hasInitialBoardData && result.totalTumbles > 0) {
            result.errors.push('No valid tumble sequences found - the fix is not working');
        }
        
        result.isValid = result.errors.length === 0;
        
        if (result.boardsWithWins > 0) {
            result.summary = result.winningBoardsWithInitialBoard === result.boardsWithWins ?
                `✅ TumbleSequence: ${result.winningBoardsWithInitialBoard}/${result.boardsWithWins} winning boards (${winningPercentage}%) have valid sequence` :
                `❌ TumbleSequence: ${result.winningBoardsWithInitialBoard}/${result.boardsWithWins} winning boards (${winningPercentage}%) have valid sequence - INCOMPLETE`;
        } else {
            result.summary = `⚠️  TumbleSequence: No winning boards found to validate (${result.totalBoards} boards total)`;
        }

    } catch (error: any) {
        result.errors.push(`Validation error: ${error.message}`);
        result.summary = '❌ InitialBoard validation failed';
    }

    return result;
}

// Show help
function showHelp() {
    console.log(`
Exploded Symbols Verification Tool

This tool validates the integrity of explodedSymbols data in generated chain files.
It ensures that:
- explodedSymbols arrays have correct length (30 elements)
- Exploded positions match original board positions exactly  
- Symbol counts in icons data match exploded symbol counts
- Position mappings are 100% accurate
- Bet data calculations are correct

Usage:
  npm run verify-exploded-symbols                    # Validate latest chain
  npm run verify-exploded-symbols -- latest         # Validate latest chain  
  npm run verify-exploded-symbols -- all           # Validate all chains
  npm run verify-exploded-symbols -- file.json     # Validate specific file
  npm run verify-exploded-symbols -- --help        # Show this help

Examples:
  npm run verify-exploded-symbols
  npm run verify-exploded-symbols -- all
  npm run verify-exploded-symbols -- tease-100boards-1757485660704.json

This tool should be run after every chain generation to ensure data correctness.
`);
}

// ES Module entry point check
const __filename = fileURLToPath(import.meta.url);

// Check if this script is being run directly
if (process.argv[1] === __filename) {
    const args = process.argv.slice(2);
    if (args.includes('--help') || args.includes('-h')) {
        showHelp();
    } else {
        main().catch(error => {
            console.error('💥 Unexpected error:', error);
            process.exit(1);
        });
    }
}
