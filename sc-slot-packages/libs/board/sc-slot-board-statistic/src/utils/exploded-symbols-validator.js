import fs from 'fs';
import path from 'path';
export class ExplodedSymbolsValidator {
    /**
     * Validate explodedSymbols in a chain file
     */
    static validateChainFile(filePath) {
        console.log(`🔍 Validating explodedSymbols in: ${path.basename(filePath)}`);
        const result = {
            isValid: false,
            fileName: path.basename(filePath),
            totalBoards: 0,
            boardsWithWins: 0,
            totalTumbles: 0,
            tumblesWithWins: 0,
            validExplodedSymbols: 0,
            boardsWithBetData: 0,
            errors: [],
            warnings: [],
            summary: ''
        };
        try {
            if (!fs.existsSync(filePath)) {
                result.errors.push(`File not found: ${filePath}`);
                return result;
            }
            const chainData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            console.log(`📊 Chain: ${chainData.metadata?.name || 'Unknown'}`);
            console.log(`   Pattern: ${chainData.metadata?.patternType || 'Unknown'}`);
            console.log(`   Boards: ${chainData.metadata?.boardCount || 0}`);
            console.log(`   Target RTP: ${((chainData.metadata?.targetRTP || 0) * 100).toFixed(1)}%`);
            console.log(`   Actual RTP: ${((chainData.metadata?.actualRTP || 0) * 100).toFixed(1)}%`);
            if (!chainData.boards || !Array.isArray(chainData.boards)) {
                result.errors.push('No boards array found in chain data');
                return result;
            }
            // Check bet data in metadata (new location)
            if (chainData.metadata?.betData) {
                const betData = chainData.metadata.betData;
                if (betData.betLevel !== undefined && betData.coinValue !== undefined &&
                    betData.betMultiplier !== undefined && betData.betAmount !== undefined) {
                    result.boardsWithBetData = chainData.boards.length; // All boards use same bet settings from metadata
                    // Validate bet calculation
                    const expectedAmount = betData.betLevel * betData.coinValue * betData.betMultiplier;
                    if (Math.abs(betData.betAmount - expectedAmount) > 0.01) {
                        result.errors.push(`Metadata bet calculation error - expected ${expectedAmount}, got ${betData.betAmount}`);
                    }
                }
                else {
                    result.errors.push('Incomplete bet data in metadata');
                }
            }
            else {
                result.warnings.push('No bet data found in metadata - using old format check');
            }
            // Validate each board
            chainData.boards.forEach((board, boardIndex) => {
                result.totalBoards++;
                let boardHasWins = false;
                // Legacy bet data check (fallback for old format)
                if (!chainData.metadata?.betData && board.betLevel !== undefined &&
                    board.coinValue !== undefined && board.betMultiplier !== undefined &&
                    board.betAmount !== undefined) {
                    result.boardsWithBetData++;
                    // Validate bet calculation
                    const expectedAmount = board.betLevel * board.coinValue * board.betMultiplier;
                    if (Math.abs(board.betAmount - expectedAmount) > 0.01) {
                        result.errors.push(`Board ${boardIndex + 1}: Bet calculation error - expected ${expectedAmount}, got ${board.betAmount}`);
                    }
                }
                // Validate settlement results
                if (board.settlementResult && board.settlementResult.tumbles) {
                    board.settlementResult.tumbles.forEach((tumble, tumbleIndex) => {
                        result.totalTumbles++;
                        if (tumble.win && tumble.win > 0) {
                            result.tumblesWithWins++;
                            boardHasWins = true;
                            // Validate explodedSymbols for winning tumbles
                            const tumbleErrors = this.validateTumbleExplodedSymbols(tumble, boardIndex + 1, tumbleIndex + 1);
                            if (tumbleErrors.length === 0) {
                                result.validExplodedSymbols++;
                            }
                            else {
                                result.errors.push(...tumbleErrors);
                            }
                        }
                    });
                }
                if (boardHasWins) {
                    result.boardsWithWins++;
                }
            });
            // Generate summary and determine if validation passed
            result.isValid = result.errors.length === 0 &&
                (result.tumblesWithWins === 0 || result.validExplodedSymbols === result.tumblesWithWins);
            result.summary = this.generateSummary(result);
            return result;
        }
        catch (error) {
            result.errors.push(`Validation failed: ${error.message}`);
            result.summary = `❌ Validation failed due to error: ${error.message}`;
            return result;
        }
    }
    /**
     * Validate explodedSymbols for a single tumble
     */
    static validateTumbleExplodedSymbols(tumble, boardNum, tumbleNum) {
        const errors = [];
        const prefix = `Board ${boardNum}, Tumble ${tumbleNum}`;
        // Check if explodedSymbols exists
        if (!tumble.explodedSymbols) {
            errors.push(`${prefix}: Missing explodedSymbols array`);
            return errors;
        }
        // Check array length
        if (!Array.isArray(tumble.explodedSymbols) || tumble.explodedSymbols.length !== 30) {
            errors.push(`${prefix}: explodedSymbols array should have 30 elements, got ${tumble.explodedSymbols?.length || 0}`);
            return errors;
        }
        // Check original board data
        if (!tumble.originalBoard) {
            errors.push(`${prefix}: Missing originalBoard data`);
            return errors;
        }
        const originalBoard = tumble.originalBoard.split(',').map(Number);
        if (originalBoard.length !== 30) {
            errors.push(`${prefix}: originalBoard should have 30 elements, got ${originalBoard.length}`);
            return errors;
        }
        // Validate position mapping (CORRECT VALIDATION - DO NOT CHANGE)
        let positionErrors = 0;
        const explodedCounts = {};
        tumble.explodedSymbols.forEach((symbol, pos) => {
            if (symbol !== -1) {
                // Verify exploded symbol matches original board at same position
                if (symbol === originalBoard[pos]) {
                    explodedCounts[symbol] = (explodedCounts[symbol] || 0) + 1;
                }
                else {
                    errors.push(`${prefix}: Position ${pos} mismatch - exploded=${symbol}, original=${originalBoard[pos]}`);
                    positionErrors++;
                }
            }
        });
        // Validate against icons data (more realistic approach)
        if (tumble.icons && typeof tumble.icons === 'object') {
            Object.entries(tumble.icons).forEach(([symbolStr, iconData]) => {
                const symbol = parseInt(symbolStr);
                const iconsCount = iconData.count;
                const explodedCount = explodedCounts[symbol] || 0;
                // Count actual instances of this symbol on the original board
                const actualBoardCount = originalBoard.filter(s => s === symbol).length;
                // Validate exploded count matches icons count (CORRECT VALIDATION)
                const expectedCount = iconData.count;
                const actualCount = explodedCounts[symbol] || 0;
                if (actualCount !== expectedCount) {
                    errors.push(`${prefix}: Symbol ${symbol} count mismatch - icons=${expectedCount}, exploded=${actualCount}`);
                }
            });
        }
        // Check newSymbols if present
        if (tumble.newSymbols) {
            if (!Array.isArray(tumble.newSymbols) || tumble.newSymbols.length !== 30) {
                errors.push(`${prefix}: newSymbols array should have 30 elements, got ${tumble.newSymbols?.length || 0}`);
            }
        }
        return errors;
    }
    /**
     * Generate validation summary
     */
    static generateSummary(result) {
        const lines = [
            `📈 Validation Summary for ${result.fileName}:`,
            `   Total Boards: ${result.totalBoards}`,
            `   Boards with Wins: ${result.boardsWithWins}`,
            `   Total Tumbles: ${result.totalTumbles}`,
            `   Tumbles with Wins: ${result.tumblesWithWins}`,
            `   Valid explodedSymbols: ${result.validExplodedSymbols}/${result.tumblesWithWins}`,
            `   Boards with Bet Data: ${result.boardsWithBetData}/${result.totalBoards}`,
        ];
        if (result.errors.length > 0) {
            lines.push(`   Errors: ${result.errors.length}`);
        }
        if (result.warnings.length > 0) {
            lines.push(`   Warnings: ${result.warnings.length}`);
        }
        // Final assessment
        if (result.isValid) {
            if (result.tumblesWithWins > 0) {
                lines.push(`   ✅ ALL VALIDATIONS PASSED - explodedSymbols are 100% accurate!`);
            }
            else {
                lines.push(`   ✅ STRUCTURE VALID - No winning tumbles to validate`);
            }
        }
        else {
            lines.push(`   ❌ VALIDATION FAILED - Data integrity issues found`);
        }
        return lines.join('\n');
    }
    /**
     * Validate the most recent chain file in output directory
     */
    static validateLatestChain(outputDir = './chain-output') {
        try {
            if (!fs.existsSync(outputDir)) {
                return {
                    isValid: false,
                    fileName: 'N/A',
                    totalBoards: 0,
                    boardsWithWins: 0,
                    totalTumbles: 0,
                    tumblesWithWins: 0,
                    validExplodedSymbols: 0,
                    boardsWithBetData: 0,
                    errors: [`Output directory not found: ${outputDir}`],
                    warnings: [],
                    summary: `❌ Output directory not found: ${outputDir}`
                };
            }
            const files = fs.readdirSync(outputDir)
                .filter(f => f.endsWith('.json') && !f.includes('summary'))
                .map(f => ({
                name: f,
                path: path.join(outputDir, f),
                mtime: fs.statSync(path.join(outputDir, f)).mtime
            }))
                .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
            if (files.length === 0) {
                return {
                    isValid: false,
                    fileName: 'N/A',
                    totalBoards: 0,
                    boardsWithWins: 0,
                    totalTumbles: 0,
                    tumblesWithWins: 0,
                    validExplodedSymbols: 0,
                    boardsWithBetData: 0,
                    errors: ['No chain files found in output directory'],
                    warnings: [],
                    summary: '❌ No chain files found in output directory'
                };
            }
            console.log(`🔍 Validating latest chain: ${files[0].name}`);
            return this.validateChainFile(files[0].path);
        }
        catch (error) {
            return {
                isValid: false,
                fileName: 'N/A',
                totalBoards: 0,
                boardsWithWins: 0,
                totalTumbles: 0,
                tumblesWithWins: 0,
                validExplodedSymbols: 0,
                boardsWithBetData: 0,
                errors: [`Failed to validate latest chain: ${error.message}`],
                warnings: [],
                summary: `❌ Failed to validate latest chain: ${error.message}`
            };
        }
    }
    /**
     * Validate all chain files in output directory
     */
    static validateAllChains(outputDir = './chain-output') {
        try {
            if (!fs.existsSync(outputDir)) {
                return [];
            }
            const files = fs.readdirSync(outputDir)
                .filter(f => f.endsWith('.json') && !f.includes('summary'))
                .map(f => path.join(outputDir, f));
            return files.map(file => this.validateChainFile(file));
        }
        catch (error) {
            console.error(`❌ Failed to validate all chains: ${error.message}`);
            return [];
        }
    }
}
