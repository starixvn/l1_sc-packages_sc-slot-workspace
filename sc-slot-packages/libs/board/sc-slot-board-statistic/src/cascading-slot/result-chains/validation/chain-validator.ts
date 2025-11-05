import { BoardResult } from "../orchestration/rtp-controller";
import { Round } from "../../statistic-calculator";
import { defaultOdds } from "../../generator-definition";

/**
 * Validation results for different validation types
 */
export interface ValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
}

export interface ChainValidationResult extends ValidationResult {
    totalBoards: number;
    totalFreeSpinsAwarded: number;
    totalFreeSpinBoards: number;
    baseGameFreeSpinAwards: number;
    retriggerFreeSpinAwards: number;
    freeSpinHitRate: number;
}

export interface TumbleValidationResult extends ValidationResult {
    patternType: 'no-win' | 'winning';
    tumbleCount: number;
    totalWin: number;
}

export interface FreeSpinValidationResult extends ValidationResult {
    scatterCount: number;
    freeSpinsAwarded: number;
    expectedFreeSpins: number;
    isRetrigger: boolean;
}

/**
 * Comprehensive validation system for result chains
 * Extracted from ResultChainOrchestrator for better separation of concerns
 */
export class ChainValidator {
    
    /**
     * Validate entire chain for free spin compliance
     */
    static validateChainFreeSpinCompliance(boards: BoardResult[]): ChainValidationResult {
        let totalFreeSpinsAwarded = 0;
        let totalFreeSpinBoards = 0;
        let baseGameFreeSpinAwards = 0;
        let retriggerFreeSpinAwards = 0;
        const errors: string[] = [];
        const warnings: string[] = [];

        console.log(`🔍 Validating free spin compliance for ${boards.length} boards...`);

        boards.forEach((board, index) => {
            if (!board.settlementResult) return;

            const scatterCount = board.settlementResult.freeSpins.count;
            const freeSpinsAwarded = board.settlementResult.freeSpins.odds;
            const isFreeSpin = board.isFreeSpin;

            if (scatterCount > 0) {
                totalFreeSpinsAwarded += freeSpinsAwarded;

                // Validate award matches business rules
                const expectedAward = this.calculateFreeSpinAward(scatterCount, isFreeSpin);
                if (freeSpinsAwarded !== expectedAward) {
                    errors.push(
                        `Board ${index}: ${scatterCount} scatters in ${isFreeSpin ? 'free spin' : 'base game'} awarded ${freeSpinsAwarded}, expected ${expectedAward}`
                    );
                }

                if (isFreeSpin) {
                    retriggerFreeSpinAwards++;
                } else {
                    baseGameFreeSpinAwards++;
                }
            }

            // Count free spin boards
            if (board.freeSpinBoards) {
                totalFreeSpinBoards += board.freeSpinBoards.length;
            }
        });

        const freeSpinHitRate = ((baseGameFreeSpinAwards + retriggerFreeSpinAwards) / boards.length * 100);

        // Business rule compliance check
        if (totalFreeSpinsAwarded > 0 && totalFreeSpinBoards === 0) {
            warnings.push(`${totalFreeSpinsAwarded} free spins awarded but no free spin boards executed`);
        }

        const isValid = errors.length === 0;

        if (isValid) {
            console.log(`✅ Free spin validation passed!`);
            console.log(`   📊 Chain Statistics:`);
            console.log(`      Total boards: ${boards.length}`);
            console.log(`      Free spins awarded: ${totalFreeSpinsAwarded}`);
            console.log(`      Free spin boards executed: ${totalFreeSpinBoards}`);
            console.log(`      Base game awards: ${baseGameFreeSpinAwards}`);
            console.log(`      Retrigger awards: ${retriggerFreeSpinAwards}`);
            console.log(`      Free spin hit rate: ${freeSpinHitRate.toFixed(2)}%`);
        } else {
            console.error(`❌ Free spin validation failed:`);
            errors.forEach(error => console.error(`   ${error}`));
        }

        return {
            isValid,
            errors,
            warnings,
            totalBoards: boards.length,
            totalFreeSpinsAwarded,
            totalFreeSpinBoards,
            baseGameFreeSpinAwards,
            retriggerFreeSpinAwards,
            freeSpinHitRate
        };
    }

    /**
     * Validate free spin awards follow correct business rules from guide
     */
    static validateFreeSpinAwards(boardResult: BoardResult, isCurrentlyFreeSpin: boolean): FreeSpinValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];
        
        const settlementResult = boardResult.settlementResult;
        if (!settlementResult) {
            return {
                isValid: true,
                errors: [],
                warnings: [],
                scatterCount: 0,
                freeSpinsAwarded: 0,
                expectedFreeSpins: 0,
                isRetrigger: isCurrentlyFreeSpin
            };
        }

        const scatterCount = settlementResult.freeSpins.count;
        const freeSpinsAwarded = settlementResult.freeSpins.odds;
        const additionalFreeSpins = settlementResult.additionalFreeSpins?.odds || 0;

        // Skip validation if no scatters found
        if (scatterCount === 0) {
            if (freeSpinsAwarded !== 0) {
                errors.push(`No scatters found but ${freeSpinsAwarded} free spins awarded`);
            }
            return {
                isValid: errors.length === 0,
                errors,
                warnings,
                scatterCount,
                freeSpinsAwarded,
                expectedFreeSpins: 0,
                isRetrigger: isCurrentlyFreeSpin
            };
        }

        // Validate scatter count is realistic (max 30 positions on board)
        if (scatterCount > 30) {
            errors.push(`Invalid scatter count ${scatterCount} (max 30 positions)`);
        }

        const expectedFreeSpins = this.calculateFreeSpinAward(scatterCount, isCurrentlyFreeSpin);

        if (isCurrentlyFreeSpin) {
            // Retrigger validation - use additionalOdds rules
            if (scatterCount >= 4) {
                if (freeSpinsAwarded !== 5) {
                    errors.push(
                        `${scatterCount} scatters during free spin should award 5 additional free spins, got ${freeSpinsAwarded}`
                    );
                } else {
                    console.log(`✅ Free spin retrigger validation passed: ${scatterCount} scatters → 5 additional free spins`);
                }
            } else {
                if (freeSpinsAwarded !== 0) {
                    errors.push(
                        `${scatterCount} scatters (< 4) should award 0 free spins, got ${freeSpinsAwarded}`
                    );
                }
            }
        } else {
            // Base game validation - use initialOdds rules
            if (freeSpinsAwarded !== expectedFreeSpins) {
                errors.push(
                    `${scatterCount} scatters should award ${expectedFreeSpins} free spins, got ${freeSpinsAwarded}`
                );
            } else if (expectedFreeSpins > 0) {
                console.log(`✅ Free spin base game validation passed: ${scatterCount} scatters → ${expectedFreeSpins} free spins`);
            }
        }

        // Validate free spin board properties if free spins were awarded
        if (freeSpinsAwarded > 0 && boardResult.freeSpinBoards) {
            const boardStructureResult = this.validateFreeSpinBoardStructure(boardResult.freeSpinBoards);
            errors.push(...boardStructureResult.errors);
            warnings.push(...boardStructureResult.warnings);
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings,
            scatterCount,
            freeSpinsAwarded,
            expectedFreeSpins,
            isRetrigger: isCurrentlyFreeSpin
        };
    }

    /**
     * Validate free spin board structure follows guide format
     */
    static validateFreeSpinBoardStructure(freeSpinBoards: any[]): ValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];

        freeSpinBoards.forEach((board, index) => {
            // Required properties from guide
            const requiredProps = [
                'isFreeSpin', 'accumulatedMultiplier', 'remainingFreeSpins', 
                'freeSpinsPlayed', 'freeSpinWins', 'board', 'multipliers'
            ];

            requiredProps.forEach(prop => {
                if (board[prop] === undefined) {
                    errors.push(`Free spin board ${index} missing required property: ${prop}`);
                }
            });

            // Validate isFreeSpin is always true for free spin boards
            if (board.isFreeSpin !== true) {
                errors.push(`Free spin board ${index} should have isFreeSpin: true, got ${board.isFreeSpin}`);
            }

            // Validate board array has correct length
            if (!Array.isArray(board.board) || board.board.length !== 30) {
                errors.push(`Free spin board ${index} should have board array of length 30, got ${board.board?.length}`);
            }

            // Validate retrigger logic if applicable
            if (board.isRetrigger && board.settlementResult?.freeSpins) {
                const retriggeredSpins = board.settlementResult.freeSpins.odds;
                if (retriggeredSpins !== 5) {
                    errors.push(
                        `Free spin board ${index} retrigger should award 5 free spins, got ${retriggeredSpins}`
                    );
                }
            }
        });

        const isValid = errors.length === 0;
        if (isValid) {
            console.log(`✅ Free spin board structure validation passed for ${freeSpinBoards.length} boards`);
        }

        return {
            isValid,
            errors,
            warnings
        };
    }

    /**
     * Validate that generated tumbles follow the correct patterns from the guide
     */
    static validateTumblePatterns(tumbles: any[], totalWin: number): TumbleValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];
        let patternType: 'no-win' | 'winning';

        if (totalWin === 0) {
            // Pattern 1: No-win board
            patternType = 'no-win';
            
            if (tumbles.length !== 1) {
                errors.push(`Pattern 1 violation: No-win board should have exactly 1 tumble, got ${tumbles.length}`);
            }
            
            const tumble = tumbles[0];
            if (Object.keys(tumble.icons || {}).length > 0) {
                errors.push(`Pattern 1 violation: No-win tumble should have empty icons`);
            }
            
            if (tumble.win !== 0) {
                errors.push(`Pattern 1 violation: No-win tumble should have win = 0, got ${tumble.win}`);
            }
            
            if (tumble.explodedSymbols || tumble.newSymbols) {
                errors.push(`Pattern 1 violation: No-win tumble should not have explodedSymbols or newSymbols`);
            }
            
            if (tumble.originalBoard !== tumble.newBoard) {
                errors.push(`Pattern 1 violation: No-win tumble should have identical originalBoard and newBoard`);
            }
            
            if (errors.length === 0) {
                console.log(`✅ Pattern 1 validation passed: No-win board with 1 tumble`);
            }
        } else {
            // Pattern 2: Winning board with cascades
            patternType = 'winning';
            
            if (tumbles.length < 2) {
                errors.push(`Pattern 2 violation: Winning board should have at least 2 tumbles, got ${tumbles.length}`);
            }
            
            // Validate first tumbles (winning tumbles)
            let totalWinFromTumbles = 0;
            for (let i = 0; i < tumbles.length - 1; i++) {
                const tumble = tumbles[i];
                if (Object.keys(tumble.icons || {}).length === 0) {
                    errors.push(`Pattern 2 violation: Winning tumble ${i} should have icons data`);
                }
                
                if (tumble.win <= 0) {
                    errors.push(`Pattern 2 violation: Winning tumble ${i} should have win > 0, got ${tumble.win}`);
                }
                
                if (!tumble.explodedSymbols || !tumble.newSymbols) {
                    errors.push(`Pattern 2 violation: Winning tumble ${i} should have explodedSymbols and newSymbols`);
                }
                
                totalWinFromTumbles += tumble.win;
            }
            
            // Validate final tumble (no more wins)
            const finalTumble = tumbles[tumbles.length - 1];
            if (Object.keys(finalTumble.icons || {}).length > 0) {
                errors.push(`Pattern 2 violation: Final tumble should have empty icons`);
            }
            
            if (finalTumble.win !== 0) {
                errors.push(`Pattern 2 violation: Final tumble should have win = 0, got ${finalTumble.win}`);
            }
            
            if (finalTumble.explodedSymbols || finalTumble.newSymbols) {
                errors.push(`Pattern 2 violation: Final tumble should not have explodedSymbols or newSymbols`);
            }
            
            if (errors.length === 0) {
                console.log(`✅ Pattern 2 validation passed: ${tumbles.length} tumbles, total win: ${totalWinFromTumbles}`);
            }
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings,
            patternType,
            tumbleCount: tumbles.length,
            totalWin
        };
    }

    /**
     * Calculate free spin award based on scatter count and game mode
     * Following guide requirements: initialOdds vs additionalOdds
     */
    private static calculateFreeSpinAward(scatterCount: number, isRetrigger: boolean): number {
        if (scatterCount < 4) {
            return 0; // No free spins awarded
        }

        if (isRetrigger) {
            // Free spin retrigger mode - use additionalOdds from generator-definition
            const retriggerRule = defaultOdds.freeSpins.additionalOdds.find(rule => scatterCount >= rule.count);
            return retriggerRule ? retriggerRule.odds : 0;
        } else {
            // Base game mode - use initialOdds from generator-definition
            const initialRule = defaultOdds.freeSpins.initialOdds.find(rule => scatterCount >= rule.count);
            return initialRule ? initialRule.odds : 0;
        }

        return 0;
    }

    /**
     * Validate a complete result chain before export
     */
    static validateCompleteChain(boards: BoardResult[]): ChainValidationResult {
        console.log(`🔍 Validating complete chain with ${boards.length} boards...`);
        
        const chainResult = this.validateChainFreeSpinCompliance(boards);
        
        // Additional validations can be added here
        let totalTumbleValidationErrors = 0;
        let totalFreeSpinValidationErrors = 0;
        
        boards.forEach((board, index) => {
            // Validate tumble patterns if settlement result exists
            if (board.settlementResult?.tumbles) {
                const tumbleResult = this.validateTumblePatterns(
                    board.settlementResult.tumbles, 
                    board.totalTumbleWin || 0
                );
                if (!tumbleResult.isValid) {
                    totalTumbleValidationErrors++;
                    chainResult.errors.push(`Board ${index} tumble validation failed: ${tumbleResult.errors.join(', ')}`);
                }
            }
            
            // Validate free spin awards
            const freeSpinResult = this.validateFreeSpinAwards(board, board.isFreeSpin || false);
            if (!freeSpinResult.isValid) {
                totalFreeSpinValidationErrors++;
                chainResult.errors.push(`Board ${index} free spin validation failed: ${freeSpinResult.errors.join(', ')}`);
            }
        });
        
        if (totalTumbleValidationErrors > 0) {
            chainResult.warnings.push(`${totalTumbleValidationErrors} boards failed tumble pattern validation`);
        }
        
        if (totalFreeSpinValidationErrors > 0) {
            chainResult.warnings.push(`${totalFreeSpinValidationErrors} boards failed free spin validation`);
        }
        
        // Update overall validation status
        chainResult.isValid = chainResult.isValid && totalTumbleValidationErrors === 0 && totalFreeSpinValidationErrors === 0;
        
        if (chainResult.isValid) {
            console.log(`✅ Complete chain validation passed!`);
        } else {
            console.error(`❌ Complete chain validation failed with ${chainResult.errors.length} errors`);
        }
        
        return chainResult;
    }
}
