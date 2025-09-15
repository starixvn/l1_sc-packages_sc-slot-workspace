#!/usr/bin/env ts-node
/**
 * BoardGenerator Logic Verification Script
 *
 * Validates that tumble data matches the actual BoardGenerator.explodeAndRefill() logic:
 *
 * CORRECT UNDERSTANDING FROM board-generator.ts:
 * - explodedSymbols[i] = original symbol value IF position i had a winning symbol, -1 otherwise
 * - newSymbols[i] = new symbol value for refilled positions, -1 for non-refilled positions
 *
 * The previous verification was WRONG - it misunderstood the BoardGenerator data structure!
 *
 * Usage:
 *   npm run verify-board-generator -- file.json      # Validate specific file
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const NO_SYMBOL = -1;
class BoardGeneratorLogicValidator {
    /**
     * Validate BoardGenerator logic in a chain file
     */
    static validateChainFile(filePath) {
        console.log(`🧪 Validating BoardGenerator logic in: ${path.basename(filePath)}`);
        console.log('📋 CORRECT BoardGenerator understanding:');
        console.log('   • explodedSymbols[i] = original symbol IF winning, -1 if NOT winning');
        console.log('   • newSymbols[i] = new symbol for refilled positions, -1 otherwise');
        console.log('');
        const result = {
            fileName: path.basename(filePath),
            totalBoards: 0,
            winningBoards: 0,
            validWinningBoards: 0,
            totalExplodedSymbolsErrors: 0,
            totalNewSymbolsErrors: 0,
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
            chainData.boards.forEach((board, boardIndex) => {
                const tumbles = board.settlementResult?.tumbles || [];
                const totalWin = board.totalTumbleWin || 0;
                // Focus only on boards with wins > 0
                if (totalWin > 0) {
                    result.winningBoards++;
                    console.log(`🔍 Analyzing Board ${boardIndex + 1} (Win: ${totalWin}, Tumbles: ${tumbles.length})`);
                    const boardErrors = this.validateWinningBoardLogic(board, boardIndex, tumbles);
                    result.errors.push(...boardErrors);
                    // Count errors by type
                    boardErrors.forEach(error => {
                        if (error.error.includes('explodedSymbols')) {
                            result.totalExplodedSymbolsErrors++;
                        }
                        if (error.error.includes('newSymbols')) {
                            result.totalNewSymbolsErrors++;
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
        }
        catch (error) {
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
     * Validate BoardGenerator explodeAndRefill logic for a winning board
     */
    static validateWinningBoardLogic(board, boardIndex, tumbles) {
        const errors = [];
        // Analyze each winning tumble
        tumbles.forEach((tumble, tumbleIndex) => {
            if (tumble.win && tumble.win > 0 && tumble.explodedSymbols && tumble.originalBoard) {
                console.log(`   🎯 Validating winning tumble ${tumbleIndex + 1} (win: ${tumble.win})`);
                const tumbleErrors = this.validateTumbleLogic(tumble, boardIndex, tumbleIndex);
                errors.push(...tumbleErrors);
            }
        });
        return errors;
    }
    /**
     * Validate explodedSymbols and newSymbols against BoardGenerator.explodeAndRefill logic
     */
    static validateTumbleLogic(tumble, boardIndex, tumbleIndex) {
        const errors = [];
        const originalBoard = tumble.originalBoard.split(',').map(Number);
        const explodedSymbols = tumble.explodedSymbols;
        const newSymbols = tumble.newSymbols;
        if (originalBoard.length !== 30) {
            errors.push({
                boardIndex,
                tumbleIndex,
                error: `originalBoard should have 30 elements, got ${originalBoard.length}`,
                severity: 'CRITICAL'
            });
            return errors;
        }
        if (explodedSymbols.length !== 30) {
            errors.push({
                boardIndex,
                tumbleIndex,
                error: `explodedSymbols should have 30 elements, got ${explodedSymbols.length}`,
                severity: 'CRITICAL'
            });
            return errors;
        }
        // Get winning symbols from icons data
        const winSymbols = [];
        if (tumble.icons) {
            Object.keys(tumble.icons).forEach(symbolStr => {
                winSymbols.push(parseInt(symbolStr));
            });
        }
        console.log(`     Winning symbols: [${winSymbols.join(', ')}]`);
        // CRITICAL VALIDATION: explodedSymbols logic from BoardGenerator
        // exploded = replace(complement(isWinningSymbol), NO_SYMBOL, board)
        // This means: NON-winning symbols → -1, winning symbols → original value
        let explodedSymbolsErrors = 0;
        let correctExplodedPositions = 0;
        for (let pos = 0; pos < 30; pos++) {
            const originalSymbol = originalBoard[pos];
            const explodedSymbol = explodedSymbols[pos];
            const isWinningSymbol = winSymbols.includes(originalSymbol);
            if (isWinningSymbol) {
                // Position had winning symbol → explodedSymbol should be original symbol
                if (explodedSymbol !== originalSymbol) {
                    errors.push({
                        boardIndex,
                        tumbleIndex,
                        error: `explodedSymbols[${pos}] should be ${originalSymbol} (winning), got ${explodedSymbol}`,
                        severity: 'CRITICAL',
                        details: `Position ${pos}: original=${originalSymbol} (winning symbol), exploded=${explodedSymbol}`
                    });
                    explodedSymbolsErrors++;
                }
                else {
                    correctExplodedPositions++;
                }
            }
            else {
                // Position had NON-winning symbol → explodedSymbol should be -1
                if (explodedSymbol !== NO_SYMBOL) {
                    errors.push({
                        boardIndex,
                        tumbleIndex,
                        error: `explodedSymbols[${pos}] should be -1 (non-winning), got ${explodedSymbol}`,
                        severity: 'CRITICAL',
                        details: `Position ${pos}: original=${originalSymbol} (non-winning symbol), exploded=${explodedSymbol}`
                    });
                    explodedSymbolsErrors++;
                }
            }
        }
        // VALIDATION: newSymbols logic (more complex due to collapse/refill)
        let newSymbolsErrors = 0;
        if (newSymbols && newSymbols.length === 30) {
            // Count positions that should have new symbols (where original winning symbols were)
            const winningPositions = [];
            for (let pos = 0; pos < 30; pos++) {
                if (winSymbols.includes(originalBoard[pos])) {
                    winningPositions.push(pos);
                }
            }
            // Count how many newSymbols are not -1 (actual new symbols)
            const actualNewSymbols = newSymbols.filter((s) => s !== NO_SYMBOL);
            console.log(`     Expected new symbols count: ${winningPositions.length}`);
            console.log(`     Actual new symbols count: ${actualNewSymbols.length}`);
            // The count should match (symbols exploded = symbols refilled)
            if (actualNewSymbols.length !== winningPositions.length) {
                errors.push({
                    boardIndex,
                    tumbleIndex,
                    error: `newSymbols count mismatch: expected ${winningPositions.length} new symbols, got ${actualNewSymbols.length}`,
                    severity: 'WARNING',
                    details: `Winning positions: ${winningPositions.length}, New symbols: ${actualNewSymbols.length}`
                });
                newSymbolsErrors++;
            }
        }
        else {
            errors.push({
                boardIndex,
                tumbleIndex,
                error: `newSymbols missing or wrong length: expected 30, got ${newSymbols?.length || 'undefined'}`,
                severity: 'CRITICAL'
            });
            newSymbolsErrors++;
        }
        // Report results for this tumble
        if (explodedSymbolsErrors === 0 && newSymbolsErrors === 0) {
            console.log(`       ✅ BoardGenerator logic: ${correctExplodedPositions} exploded positions correct`);
        }
        else {
            console.log(`       ❌ BoardGenerator logic: ${explodedSymbolsErrors} exploded errors, ${newSymbolsErrors} newSymbols errors`);
        }
        return errors;
    }
    /**
     * Generate validation summary
     */
    static generateSummary(result) {
        const criticalErrors = result.errors.filter(e => e.severity === 'CRITICAL').length;
        const warningErrors = result.errors.filter(e => e.severity === 'WARNING').length;
        const lines = [
            `📈 BoardGenerator Logic Summary for ${result.fileName}:`,
            `   Total Boards: ${result.totalBoards}`,
            `   Winning Boards: ${result.winningBoards}`,
            `   Valid Winning Boards: ${result.validWinningBoards}/${result.winningBoards}`,
            `   ExplodedSymbols Errors: ${result.totalExplodedSymbolsErrors}`,
            `   NewSymbols Errors: ${result.totalNewSymbolsErrors}`,
            `   Critical Errors: ${criticalErrors}`,
            `   Warnings: ${warningErrors}`
        ];
        // Final assessment
        if (result.isValid) {
            if (result.winningBoards > 0) {
                lines.push(`   ✅ BOARDGENERATOR LOGIC CORRECT - Data matches explodeAndRefill!`);
            }
            else {
                lines.push(`   ✅ STRUCTURE VALID - No winning boards to validate`);
            }
        }
        else {
            lines.push(`   ❌ BOARDGENERATOR LOGIC VIOLATIONS - Data doesn't match explodeAndRefill`);
        }
        return lines.join('\n');
    }
    /**
     * Find and validate latest chain file
     */
    static validateLatestChain(chainOutputDir) {
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
                totalExplodedSymbolsErrors: 0,
                totalNewSymbolsErrors: 0,
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
    console.log('🧪 BoardGenerator Logic Verification Tool');
    console.log('==========================================\n');
    console.log('Validates that tumble data matches BoardGenerator.explodeAndRefill() logic\n');
    const args = process.argv.slice(2);
    const mode = args[0] || 'latest';
    try {
        let result;
        if (mode === 'latest' || mode === '') {
            // Validate latest chain
            console.log('📂 Validating latest chain file...\n');
            result = BoardGeneratorLogicValidator.validateLatestChain('./chain-output');
        }
        else {
            // Validate specific file
            const filePath = path.resolve('./chain-output', mode);
            console.log(`📂 Validating specific file: ${mode}\n`);
            result = BoardGeneratorLogicValidator.validateChainFile(filePath);
        }
        console.log('\n' + result.summary);
        if (result.errors.length > 0) {
            console.log(`\n❌ BoardGenerator Logic Violations:`);
            // Group errors by board for better readability
            const errorsByBoard = {};
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
                        if (error.details) {
                            console.log(`          ${error.details}`);
                        }
                    });
                }
                else {
                    // General errors
                    boardErrors.forEach(error => {
                        console.log(`   🚨 ${error.error}`);
                    });
                }
            });
        }
        if (result.isValid) {
            console.log(`\n🎉 BOARDGENERATOR LOGIC VALIDATION SUCCESSFUL!`);
            console.log(`   All tumble data matches BoardGenerator.explodeAndRefill() logic.`);
        }
        else {
            console.log(`\n❌ BOARDGENERATOR LOGIC VALIDATION FAILED!`);
            console.log(`   Data structure doesn't match BoardGenerator expectations.`);
            process.exit(1);
        }
    }
    catch (error) {
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
export { BoardGeneratorLogicValidator };
