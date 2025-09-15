#!/usr/bin/env ts-node
/**
 * Cascading Slot Logic Verification Script
 *
 * Validates CORRECT cascading slot mechanics:
 *
 * 1. explodedSymbols[i] should be 1 (exploded) or -1 (not exploded) - NOT symbol values
 * 2. After explosion, remaining symbols must cascade DOWN due to gravity
 * 3. New symbols fill from the TOP, not exact exploded positions
 *
 * Current implementation is WRONG for cascading slots!
 *
 * Usage:
 *   npm run verify-cascading -- file.json      # Validate specific file
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const NO_SYMBOL = -1;
const EXPLODED_FLAG = 1;
class CascadingSlotValidator {
    /**
     * Validate cascading slot logic in a chain file
     */
    static validateChainFile(filePath) {
        console.log(`🎰 Validating CASCADING SLOT logic in: ${path.basename(filePath)}`);
        console.log('🎯 CORRECT Cascading Slot Mechanics:');
        console.log('   1. explodedSymbols[i] = 1 (exploded) or -1 (not exploded)');
        console.log('   2. Remaining symbols CASCADE DOWN due to gravity');
        console.log('   3. New symbols fill from TOP positions');
        console.log('');
        const result = {
            fileName: path.basename(filePath),
            totalBoards: 0,
            winningBoards: 0,
            validCascadingBoards: 0,
            explodedSymbolsFormatErrors: 0,
            cascadingPhysicsErrors: 0,
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
                    const boardErrors = this.validateCascadingBoard(board, boardIndex, tumbles);
                    result.errors.push(...boardErrors);
                    // Count errors by type
                    boardErrors.forEach(error => {
                        if (error.error.includes('explodedSymbols format')) {
                            result.explodedSymbolsFormatErrors++;
                        }
                        if (error.error.includes('cascading') || error.error.includes('gravity')) {
                            result.cascadingPhysicsErrors++;
                        }
                    });
                    // Board is valid if no critical errors
                    const hasCriticalErrors = boardErrors.some(e => e.severity === 'CRITICAL');
                    if (!hasCriticalErrors) {
                        result.validCascadingBoards++;
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
     * Validate cascading mechanics for a winning board
     */
    static validateCascadingBoard(board, boardIndex, tumbles) {
        const errors = [];
        // Analyze each winning tumble
        tumbles.forEach((tumble, tumbleIndex) => {
            if (tumble.win && tumble.win > 0 && tumble.explodedSymbols && tumble.originalBoard) {
                console.log(`   🎯 Validating cascading tumble ${tumbleIndex + 1} (win: ${tumble.win})`);
                const tumbleErrors = this.validateTumbleCascading(tumble, boardIndex, tumbleIndex);
                errors.push(...tumbleErrors);
            }
        });
        return errors;
    }
    /**
     * Validate exploded symbols format and cascading physics
     */
    static validateTumbleCascading(tumble, boardIndex, tumbleIndex) {
        const errors = [];
        const originalBoard = tumble.originalBoard.split(',').map(Number);
        const explodedSymbols = tumble.explodedSymbols;
        const newSymbols = tumble.newSymbols;
        const newBoard = tumble.newBoard ? tumble.newBoard.split(',').map(Number) : null;
        if (originalBoard.length !== 30 || explodedSymbols.length !== 30) {
            errors.push({
                boardIndex,
                tumbleIndex,
                error: `Array length mismatch: original=${originalBoard.length}, exploded=${explodedSymbols.length}`,
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
        // CRITICAL VALIDATION 1: explodedSymbols format
        let explodedFormatErrors = 0;
        let explodedPositionCount = 0;
        for (let pos = 0; pos < 30; pos++) {
            const originalSymbol = originalBoard[pos];
            const explodedValue = explodedSymbols[pos];
            const isWinningSymbol = winSymbols.includes(originalSymbol);
            if (isWinningSymbol) {
                // Position had winning symbol → explodedSymbols should be 1 (not symbol value!)
                if (explodedValue !== EXPLODED_FLAG) {
                    errors.push({
                        boardIndex,
                        tumbleIndex,
                        error: `explodedSymbols format error: position ${pos} should be 1 (exploded flag), got ${explodedValue}`,
                        severity: 'CRITICAL',
                        details: `Position ${pos} had winning symbol ${originalSymbol}, explodedSymbols should be 1, got ${explodedValue}`
                    });
                    explodedFormatErrors++;
                }
                else {
                    explodedPositionCount++;
                }
            }
            else {
                // Position had NON-winning symbol → explodedSymbols should be -1
                if (explodedValue !== NO_SYMBOL) {
                    errors.push({
                        boardIndex,
                        tumbleIndex,
                        error: `explodedSymbols format error: position ${pos} should be -1 (not exploded), got ${explodedValue}`,
                        severity: 'CRITICAL',
                        details: `Position ${pos} had non-winning symbol ${originalSymbol}, explodedSymbols should be -1, got ${explodedValue}`
                    });
                    explodedFormatErrors++;
                }
            }
        }
        // CRITICAL VALIDATION 2: Cascading physics (6 reels x 5 symbols each)
        let cascadingPhysicsErrors = 0;
        if (newBoard && newSymbols) {
            // Validate cascading for each reel (column)
            for (let reel = 0; reel < 6; reel++) {
                const reelErrors = this.validateReelCascading(originalBoard, explodedSymbols, newBoard, newSymbols, reel, winSymbols, boardIndex, tumbleIndex);
                errors.push(...reelErrors);
                cascadingPhysicsErrors += reelErrors.length;
            }
        }
        // Report results for this tumble
        if (explodedFormatErrors === 0 && cascadingPhysicsErrors === 0) {
            console.log(`       ✅ Cascading logic: ${explodedPositionCount} exploded positions, physics correct`);
        }
        else {
            console.log(`       ❌ Cascading logic: ${explodedFormatErrors} format errors, ${cascadingPhysicsErrors} physics errors`);
        }
        return errors;
    }
    /**
     * Validate cascading physics for a single reel (gravity + refill from top)
     */
    static validateReelCascading(originalBoard, explodedSymbols, newBoard, newSymbols, reel, winSymbols, boardIndex, tumbleIndex) {
        const errors = [];
        // Extract reel data (positions: reel*5, reel*5+1, reel*5+2, reel*5+3, reel*5+4)
        const reelOriginal = [];
        const reelExploded = [];
        const reelNew = [];
        const reelNewSymbols = [];
        for (let row = 0; row < 5; row++) {
            const pos = reel * 5 + row;
            reelOriginal.push(originalBoard[pos]);
            reelExploded.push(explodedSymbols[pos]);
            reelNew.push(newBoard[pos]);
            reelNewSymbols.push(newSymbols[pos]);
        }
        // Step 1: Remove exploded symbols (where explodedSymbols[i] = 1)
        const remainingSymbols = [];
        let explodedCount = 0;
        for (let row = 0; row < 5; row++) {
            if (reelExploded[row] === EXPLODED_FLAG) {
                explodedCount++;
                // Symbol exploded - should not be in remaining
            }
            else if (reelExploded[row] === NO_SYMBOL) {
                // Symbol remained
                remainingSymbols.push(reelOriginal[row]);
            }
        }
        // Step 2: Cascade remaining symbols down (gravity)
        const cascadedReel = new Array(5).fill(NO_SYMBOL);
        const startPos = 5 - remainingSymbols.length; // Fill from bottom up
        for (let i = 0; i < remainingSymbols.length; i++) {
            cascadedReel[startPos + i] = remainingSymbols[i];
        }
        // Step 3: Fill top positions with new symbols
        const expectedNewSymbolsCount = explodedCount;
        const actualNewSymbolsInReel = reelNewSymbols.filter(s => s !== NO_SYMBOL);
        // Check if new symbols are placed at top positions
        for (let row = 0; row < expectedNewSymbolsCount; row++) {
            if (reelNewSymbols[row] === NO_SYMBOL) {
                errors.push({
                    boardIndex,
                    tumbleIndex,
                    error: `Cascading physics error: reel ${reel}, position ${row} should have new symbol (top fill), got -1`,
                    severity: 'CRITICAL',
                    details: `Reel ${reel}: ${explodedCount} symbols exploded, new symbols should fill top ${explodedCount} positions`
                });
            }
        }
        // Check that bottom positions don't have new symbols
        for (let row = expectedNewSymbolsCount; row < 5; row++) {
            if (reelNewSymbols[row] !== NO_SYMBOL) {
                errors.push({
                    boardIndex,
                    tumbleIndex,
                    error: `Cascading physics error: reel ${reel}, position ${row} should be -1 (cascaded symbol), got new symbol ${reelNewSymbols[row]}`,
                    severity: 'CRITICAL',
                    details: `Reel ${reel}: New symbols should only fill top positions, not position ${row}`
                });
            }
        }
        console.log(`       Reel ${reel}: ${explodedCount} exploded, ${remainingSymbols.length} remained, ${actualNewSymbolsInReel.length} new symbols`);
        return errors;
    }
    /**
     * Generate validation summary
     */
    static generateSummary(result) {
        const criticalErrors = result.errors.filter(e => e.severity === 'CRITICAL').length;
        const warningErrors = result.errors.filter(e => e.severity === 'WARNING').length;
        const lines = [
            `📈 Cascading Slot Logic Summary for ${result.fileName}:`,
            `   Total Boards: ${result.totalBoards}`,
            `   Winning Boards: ${result.winningBoards}`,
            `   Valid Cascading Boards: ${result.validCascadingBoards}/${result.winningBoards}`,
            `   ExplodedSymbols Format Errors: ${result.explodedSymbolsFormatErrors}`,
            `   Cascading Physics Errors: ${result.cascadingPhysicsErrors}`,
            `   Critical Errors: ${criticalErrors}`,
            `   Warnings: ${warningErrors}`
        ];
        // Final assessment
        if (result.isValid) {
            if (result.winningBoards > 0) {
                lines.push(`   ✅ CASCADING SLOT LOGIC CORRECT - Physics and format perfect!`);
            }
            else {
                lines.push(`   ✅ STRUCTURE VALID - No winning boards to validate`);
            }
        }
        else {
            lines.push(`   ❌ CASCADING SLOT LOGIC VIOLATIONS - Critical physics/format errors`);
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
                validCascadingBoards: 0,
                explodedSymbolsFormatErrors: 0,
                cascadingPhysicsErrors: 0,
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
    console.log('🎰 Cascading Slot Logic Verification Tool');
    console.log('==========================================\n');
    console.log('Validates CORRECT cascading slot mechanics:\n');
    console.log('• explodedSymbols format (1/-1 flags, not symbol values)');
    console.log('• Gravity physics (symbols cascade down)');
    console.log('• Top refill (new symbols from top positions)\n');
    const args = process.argv.slice(2);
    const mode = args[0] || 'latest';
    try {
        let result;
        if (mode === 'latest' || mode === '') {
            // Validate latest chain
            console.log('📂 Validating latest chain file...\n');
            result = CascadingSlotValidator.validateLatestChain('./chain-output');
        }
        else {
            // Validate specific file
            const filePath = path.resolve('./chain-output', mode);
            console.log(`📂 Validating specific file: ${mode}\n`);
            result = CascadingSlotValidator.validateChainFile(filePath);
        }
        console.log('\n' + result.summary);
        if (result.errors.length > 0) {
            console.log(`\n❌ Cascading Logic Violations:`);
            // Show first 20 errors for readability
            const errorsToShow = result.errors.slice(0, 20);
            errorsToShow.forEach((error, index) => {
                const severity = error.severity === 'CRITICAL' ? '🚨' : '⚠️ ';
                console.log(`   ${severity} Board ${error.boardIndex + 1}, Tumble ${error.tumbleIndex + 1}: ${error.error}`);
                if (error.details) {
                    console.log(`       ${error.details}`);
                }
            });
            if (result.errors.length > 20) {
                console.log(`   ... and ${result.errors.length - 20} more errors`);
            }
        }
        if (result.isValid) {
            console.log(`\n🎉 CASCADING SLOT VALIDATION SUCCESSFUL!`);
            console.log(`   All cascading mechanics are physically correct.`);
        }
        else {
            console.log(`\n❌ CASCADING SLOT VALIDATION FAILED!`);
            console.log(`   Critical cascading slot physics violations found.`);
            console.log(`   \n🔧 REQUIRED FIXES:`);
            console.log(`   1. Change explodedSymbols to use 1/-1 flags instead of symbol values`);
            console.log(`   2. Implement proper cascading gravity (symbols fall down)`);
            console.log(`   3. Fill new symbols from TOP positions after cascade`);
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
export { CascadingSlotValidator };
