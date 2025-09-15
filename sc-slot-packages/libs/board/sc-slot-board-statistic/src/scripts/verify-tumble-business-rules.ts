#!/usr/bin/env ts-node

/**
 * Tumble Business Rules Verification Script
 * 
 * Validates critical business logic for winning boards:
 * 1. Tumble sequence consistency (tumble[0].newBoard === tumble[1].originalBoard)
 * 2. Icons vs explodedSymbols position mapping accuracy
 * 3. Symbol explosion logic validation
 * 
 * Usage:
 *   npm run verify-tumble-rules                    # Validate latest chain
 *   npm run verify-tumble-rules -- file.json      # Validate specific file
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

interface TumbleError {
    boardIndex: number;
    tumbleIndex: number;
    error: string;
    severity: 'CRITICAL' | 'WARNING';
}

interface ValidationResult {
    fileName: string;
    totalBoards: number;
    winningBoards: number;
    validWinningBoards: number;
    totalTumbleSequenceErrors: number;
    totalIconsErrors: number;
    errors: TumbleError[];
    summary: string;
    isValid: boolean;
}

class TumbleBusinessRulesValidator {
    
    /**
     * Validate tumble business rules in a chain file
     */
    static validateChainFile(filePath: string): ValidationResult {
        console.log(`🎯 Validating tumble business rules in: ${path.basename(filePath)}`);
        
        const result: ValidationResult = {
            fileName: path.basename(filePath),
            totalBoards: 0,
            winningBoards: 0,
            validWinningBoards: 0,
            totalTumbleSequenceErrors: 0,
            totalIconsErrors: 0,
            errors: [],
            summary: '',
            isValid: false
        };

        try {
            if (!fs.existsSync(filePath)) {
                result.errors.push({
                    boardIndex: -1,
                    tumbleIndex: -1,
                    error: `File not found: ${filePath}`,
                    severity: 'CRITICAL'
                });
                return result;
            }

            const chainData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            
            console.log(`📊 Chain: ${chainData.metadata?.name || 'Unknown'}`);
            console.log(`   Pattern: ${chainData.metadata?.patternType || 'Unknown'}`);
            console.log(`   Boards: ${chainData.metadata?.boardCount || 0}`);
            console.log(`   Target RTP: ${((chainData.metadata?.targetRTP || 0) * 100).toFixed(1)}%`);
            console.log(`   Actual RTP: ${((chainData.metadata?.actualRTP || 0) * 100).toFixed(1)}%`);
            console.log('');

            if (!chainData.boards || !Array.isArray(chainData.boards)) {
                result.errors.push({
                    boardIndex: -1,
                    tumbleIndex: -1,
                    error: 'No boards array found in chain data',
                    severity: 'CRITICAL'
                });
                return result;
            }

            result.totalBoards = chainData.boards.length;

            // Validate each board with wins
            chainData.boards.forEach((board: any, boardIndex: number) => {
                const tumbles = board.settlementResult?.tumbles || [];
                const totalWin = board.totalTumbleWin || 0;

                // Focus only on boards with wins > 0
                if (totalWin > 0) {
                    result.winningBoards++;
                    console.log(`🔍 Analyzing Board ${boardIndex + 1} (Win: ${totalWin}, Tumbles: ${tumbles.length})`);
                    
                    const boardErrors = this.validateWinningBoard(board, boardIndex, tumbles);
                    result.errors.push(...boardErrors);
                    
                    // Count errors by type
                    boardErrors.forEach(error => {
                        if (error.error.includes('sequence')) {
                            result.totalTumbleSequenceErrors++;
                        }
                        if (error.error.includes('icons') || error.error.includes('exploded')) {
                            result.totalIconsErrors++;
                        }
                    });
                    
                    // Board is valid if no critical errors
                    const hasCriticalErrors = boardErrors.some(e => e.severity === 'CRITICAL');
                    if (!hasCriticalErrors) {
                        result.validWinningBoards++;
                    }
                }
            });

            // Generate summary and determine if validation passed
            result.isValid = result.errors.filter(e => e.severity === 'CRITICAL').length === 0;
            result.summary = this.generateSummary(result);

            return result;

        } catch (error: any) {
            result.errors.push({
                boardIndex: -1,
                tumbleIndex: -1,
                error: `Validation failed: ${error.message}`,
                severity: 'CRITICAL'
            });
            result.summary = `❌ Validation failed due to error: ${error.message}`;
            return result;
        }
    }

    /**
     * Validate a single winning board's tumble sequence and business rules
     */
    private static validateWinningBoard(board: any, boardIndex: number, tumbles: any[]): TumbleError[] {
        const errors: TumbleError[] = [];

        if (tumbles.length < 2) {
            errors.push({
                boardIndex,
                tumbleIndex: -1,
                error: `Winning board has insufficient tumbles (${tumbles.length}, expected >= 2)`,
                severity: 'CRITICAL'
            });
            return errors;
        }

        // Rule 1: Validate tumble sequence consistency
        for (let i = 0; i < tumbles.length - 1; i++) {
            const currentTumble = tumbles[i];
            const nextTumble = tumbles[i + 1];
            
            if (!currentTumble.newBoard || !nextTumble.originalBoard) {
                errors.push({
                    boardIndex,
                    tumbleIndex: i,
                    error: `Missing board data in tumble sequence at position ${i}`,
                    severity: 'CRITICAL'
                });
                continue;
            }

            // CRITICAL RULE: tumble[i].newBoard MUST equal tumble[i+1].originalBoard
            if (currentTumble.newBoard !== nextTumble.originalBoard) {
                errors.push({
                    boardIndex,
                    tumbleIndex: i,
                    error: `Tumble sequence broken: tumble[${i}].newBoard !== tumble[${i+1}].originalBoard`,
                    severity: 'CRITICAL'
                });
                
                // Show detailed mismatch for debugging
                console.log(`   ❌ SEQUENCE MISMATCH at Board ${boardIndex + 1}, Tumble ${i}:`);
                console.log(`      Current newBoard: ${currentTumble.newBoard.substring(0, 50)}...`);
                console.log(`      Next originalBoard: ${nextTumble.originalBoard.substring(0, 50)}...`);
            }
        }

        // Rule 2: Validate icons vs explodedSymbols for each winning tumble
        tumbles.forEach((tumble, tumbleIndex) => {
            if (tumble.win && tumble.win > 0) {
                console.log(`   🎯 Checking winning tumble ${tumbleIndex + 1} (win: ${tumble.win})`);
                
                const iconsErrors = this.validateIconsVsExplodedSymbols(
                    tumble, 
                    boardIndex, 
                    tumbleIndex
                );
                errors.push(...iconsErrors);
            }
        });

        return errors;
    }

    /**
     * Validate icons data matches explodedSymbols positions (CRITICAL BUSINESS RULE)
     */
    private static validateIconsVsExplodedSymbols(
        tumble: any, 
        boardIndex: number, 
        tumbleIndex: number
    ): TumbleError[] {
        const errors: TumbleError[] = [];

        if (!tumble.icons) {
            errors.push({
                boardIndex,
                tumbleIndex,
                error: `Winning tumble missing icons data`,
                severity: 'CRITICAL'
            });
            return errors;
        }

        if (!tumble.explodedSymbols) {
            errors.push({
                boardIndex,
                tumbleIndex,
                error: `Winning tumble missing explodedSymbols data`,
                severity: 'CRITICAL'
            });
            return errors;
        }

        if (!tumble.originalBoard) {
            errors.push({
                boardIndex,
                tumbleIndex,
                error: `Winning tumble missing originalBoard data`,
                severity: 'CRITICAL'
            });
            return errors;
        }

        const originalBoard = tumble.originalBoard.split(',').map(Number);
        
        // CRITICAL BUSINESS RULE VALIDATION
        Object.entries(tumble.icons).forEach(([symbolStr, iconData]: [string, any]) => {
            const symbol = parseInt(symbolStr);
            const expectedCount = iconData.count;
            
            console.log(`     Validating symbol ${symbol} (expected count: ${expectedCount})`);
            
            // Count actual exploded positions for this symbol
            let actualExplodedCount = 0;
            const explodedPositions: number[] = [];
            const invalidPositions: number[] = [];
            
            tumble.explodedSymbols.forEach((explodedSymbol: number, position: number) => {
                if (explodedSymbol === symbol) {
                    actualExplodedCount++;
                    explodedPositions.push(position);
                    
                    // CRITICAL: Verify the exploded position actually contains this symbol in original board
                    if (originalBoard[position] !== symbol) {
                        invalidPositions.push(position);
                        errors.push({
                            boardIndex,
                            tumbleIndex,
                            error: `Symbol ${symbol} exploded at position ${position}, but original board has ${originalBoard[position]}`,
                            severity: 'CRITICAL'
                        });
                    }
                }
            });
            
            // CRITICAL: Icons count MUST match exploded count
            if (actualExplodedCount !== expectedCount) {
                errors.push({
                    boardIndex,
                    tumbleIndex,
                    error: `Symbol ${symbol} count mismatch: icons=${expectedCount}, exploded=${actualExplodedCount}`,
                    severity: 'CRITICAL'
                });
            }
            
            // Log validation result
            if (invalidPositions.length === 0 && actualExplodedCount === expectedCount) {
                console.log(`       ✅ Symbol ${symbol}: ${actualExplodedCount} valid positions`);
            } else {
                console.log(`       ❌ Symbol ${symbol}: ${invalidPositions.length} invalid positions, count mismatch`);
            }
        });

        return errors;
    }

    /**
     * Generate validation summary
     */
    private static generateSummary(result: ValidationResult): string {
        const criticalErrors = result.errors.filter(e => e.severity === 'CRITICAL').length;
        const warningErrors = result.errors.filter(e => e.severity === 'WARNING').length;
        
        const lines = [
            `📈 Tumble Business Rules Summary for ${result.fileName}:`,
            `   Total Boards: ${result.totalBoards}`,
            `   Winning Boards: ${result.winningBoards}`,
            `   Valid Winning Boards: ${result.validWinningBoards}/${result.winningBoards}`,
            `   Tumble Sequence Errors: ${result.totalTumbleSequenceErrors}`,
            `   Icons/ExplodedSymbols Errors: ${result.totalIconsErrors}`,
            `   Critical Errors: ${criticalErrors}`,
            `   Warnings: ${warningErrors}`
        ];

        // Final assessment
        if (result.isValid) {
            if (result.winningBoards > 0) {
                lines.push(`   ✅ ALL BUSINESS RULES PASSED - Tumble logic is 100% correct!`);
            } else {
                lines.push(`   ✅ STRUCTURE VALID - No winning boards to validate`);
            }
        } else {
            lines.push(`   ❌ BUSINESS RULE VIOLATIONS FOUND - Critical issues detected`);
        }

        return lines.join('\n');
    }

    /**
     * Find and validate latest chain file
     */
    static validateLatestChain(chainOutputDir: string): ValidationResult {
        const files = fs.readdirSync(chainOutputDir)
            .filter(f => f.endsWith('.json') && !f.startsWith('generation-summary-'))
            .sort((a, b) => {
                const statA = fs.statSync(path.join(chainOutputDir, a));
                const statB = fs.statSync(path.join(chainOutputDir, b));
                return statB.mtime.getTime() - statA.mtime.getTime();
            });

        if (files.length === 0) {
            return {
                fileName: 'No files found',
                totalBoards: 0,
                winningBoards: 0,
                validWinningBoards: 0,
                totalTumbleSequenceErrors: 0,
                totalIconsErrors: 0,
                errors: [{
                    boardIndex: -1,
                    tumbleIndex: -1,
                    error: 'No chain files found',
                    severity: 'CRITICAL'
                }],
                summary: '❌ No chain files to validate',
                isValid: false
            };
        }

        const latestFile = files[0];
        const filePath = path.join(chainOutputDir, latestFile);
        return this.validateChainFile(filePath);
    }
}

async function main() {
    console.log('🎯 Tumble Business Rules Verification Tool');
    console.log('===========================================\n');
    console.log('Validates critical business logic for winning boards:\n');
    console.log('• Tumble sequence consistency');
    console.log('• Icons vs explodedSymbols position mapping'); 
    console.log('• Symbol explosion logic validation\n');

    const args = process.argv.slice(2);
    const mode = args[0] || 'latest';

    try {
        let result: ValidationResult;

        if (mode === 'latest' || mode === '') {
            // Validate latest chain
            console.log('📂 Validating latest chain file...\n');
            result = TumbleBusinessRulesValidator.validateLatestChain('./chain-output');
        } else {
            // Validate specific file
            const filePath = path.resolve('./chain-output', mode);
            console.log(`📂 Validating specific file: ${mode}\n`);
            result = TumbleBusinessRulesValidator.validateChainFile(filePath);
        }

        console.log('\n' + result.summary);
        
        if (result.errors.length > 0) {
            console.log(`\n❌ Business Rule Violations:`);
            
            // Group errors by board for better readability
            const errorsByBoard: { [key: number]: TumbleError[] } = {};
            result.errors.forEach(error => {
                if (!errorsByBoard[error.boardIndex]) {
                    errorsByBoard[error.boardIndex] = [];
                }
                errorsByBoard[error.boardIndex].push(error);
            });
            
            Object.entries(errorsByBoard).forEach(([boardIndexStr, boardErrors]) => {
                const boardIndex = parseInt(boardIndexStr);
                if (boardIndex >= 0) {
                    console.log(`\n   Board ${boardIndex + 1}:`);
                    boardErrors.forEach((error, index) => {
                        const severity = error.severity === 'CRITICAL' ? '🚨' : '⚠️ ';
                        console.log(`     ${severity} ${error.error}`);
                    });
                } else {
                    // General errors
                    boardErrors.forEach(error => {
                        console.log(`   🚨 ${error.error}`);
                    });
                }
            });
        }

        if (result.isValid) {
            console.log(`\n🎉 BUSINESS RULES VALIDATION SUCCESSFUL!`);
            console.log(`   All tumble sequences and business logic are correct.`);
        } else {
            console.log(`\n❌ BUSINESS RULES VALIDATION FAILED!`);
            console.log(`   Critical issues found that need immediate attention.`);
            process.exit(1);
        }

    } catch (error: any) {
        console.error('💥 Verification script failed:', error.message);
        console.error('Stack trace:', error.stack);
        process.exit(1);
    }
}

// ES Module entry point check
const __filename = fileURLToPath(import.meta.url);

// Check if this script is being run directly
if (process.argv[1] === __filename) {
    main().catch(error => {
        console.error('💥 Unexpected error:', error);
        process.exit(1);
    });
}

export { TumbleBusinessRulesValidator };

