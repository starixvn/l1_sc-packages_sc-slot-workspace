import { NearWinSymbol, PayoutTier } from './symbol-prioritizer.js';
import { commonDefinition } from '../generator-definition.js';

export interface MultiSymbolCombination {
    symbols: Array<{
        symbol: number;
        targetCount: number;
        currentCount: number;
        contribution: number; // Multiplier contribution
    }>;
    totalMultiplier: number;
    totalSymbolsNeeded: number;
    efficiency: number; // Multiplier per symbol added
    feasible: boolean;
}

export interface MultiSymbolResult {
    bestCombination: MultiSymbolCombination | null;
    alternativeCombinations: MultiSymbolCombination[];
    fallbackToSingle: boolean;
    recommendedApproach: 'multi-symbol' | 'single-enhanced' | 'multiplier-dependent';
}

/**
 * Multi-symbol strategy for cases where single symbols cannot reach target multiplier
 * Analyzes combinations of near-win symbols to achieve target wins
 */
export class MultiSymbolStrategy {
    private readonly betMultiplier: number;
    private readonly maxSymbolsToAdd: number = 8; // Reasonable limit for symbol placement

    constructor() {
        this.betMultiplier = commonDefinition.betSettings.defaultBetMultiplier;
    }

    /**
     * Analyze multi-symbol combinations to reach target multiplier
     */
    analyzeMultiSymbolOptions(
        nearWinSymbols: NearWinSymbol[],
        targetMultiplier: number,
        availablePositions: number,
        boardMultiplierSum: number = 0
    ): MultiSymbolResult {
        if (nearWinSymbols.length < 2) {
            return {
                bestCombination: null,
                alternativeCombinations: [],
                fallbackToSingle: true,
                recommendedApproach: 'single-enhanced'
            };
        }

        // Generate possible combinations
        const combinations = this.generateCombinations(
            nearWinSymbols, 
            targetMultiplier, 
            availablePositions,
            boardMultiplierSum
        );

        if (combinations.length === 0) {
            return {
                bestCombination: null,
                alternativeCombinations: [],
                fallbackToSingle: true,
                recommendedApproach: boardMultiplierSum > 0 ? 'multiplier-dependent' : 'single-enhanced'
            };
        }

        // Sort by efficiency (best multiplier per symbol added)
        combinations.sort((a, b) => b.efficiency - a.efficiency);

        const bestCombination = combinations[0];
        const alternativeCombinations = combinations.slice(1, 3); // Top 3 alternatives

        // Determine if multi-symbol is actually better than enhanced single
        const recommendedApproach = this.determineRecommendedApproach(
            bestCombination,
            nearWinSymbols[0], // Primary symbol
            targetMultiplier
        );

        return {
            bestCombination,
            alternativeCombinations,
            fallbackToSingle: recommendedApproach !== 'multi-symbol',
            recommendedApproach
        };
    }

    /**
     * Generate feasible multi-symbol combinations
     */
    private generateCombinations(
        nearWinSymbols: NearWinSymbol[],
        targetMultiplier: number,
        availablePositions: number,
        boardMultiplierSum: number
    ): MultiSymbolCombination[] {
        const combinations: MultiSymbolCombination[] = [];
        const effectiveMultiplier = boardMultiplierSum > 0 ? boardMultiplierSum : 1;

        // Try 2-symbol combinations first (most common and efficient)
        for (let i = 0; i < nearWinSymbols.length; i++) {
            for (let j = i + 1; j < nearWinSymbols.length; j++) {
                const combo = this.analyzeTwoSymbolCombination(
                    nearWinSymbols[i],
                    nearWinSymbols[j],
                    targetMultiplier,
                    effectiveMultiplier,
                    availablePositions
                );
                
                if (combo.feasible) {
                    combinations.push(combo);
                }
            }
        }

        // Try 3-symbol combinations if 2-symbol isn't sufficient and we have space
        if (combinations.length === 0 && nearWinSymbols.length >= 3 && availablePositions >= 6) {
            for (let i = 0; i < nearWinSymbols.length; i++) {
                for (let j = i + 1; j < nearWinSymbols.length; j++) {
                    for (let k = j + 1; k < nearWinSymbols.length; k++) {
                        const combo = this.analyzeThreeSymbolCombination(
                            nearWinSymbols[i],
                            nearWinSymbols[j],
                            nearWinSymbols[k],
                            targetMultiplier,
                            effectiveMultiplier,
                            availablePositions
                        );
                        
                        if (combo.feasible) {
                            combinations.push(combo);
                        }
                    }
                }
            }
        }

        return combinations;
    }

    /**
     * Analyze two-symbol combination
     */
    private analyzeTwoSymbolCombination(
        symbol1: NearWinSymbol,
        symbol2: NearWinSymbol,
        targetMultiplier: number,
        effectiveMultiplier: number,
        availablePositions: number
    ): MultiSymbolCombination {
        // Find optimal counts for both symbols
        const symbol1Target = this.findOptimalCount(symbol1, targetMultiplier / 2);
        const symbol2Target = this.findOptimalCount(symbol2, targetMultiplier / 2);

        const symbol1Needed = Math.max(0, symbol1Target.count - symbol1.count);
        const symbol2Needed = Math.max(0, symbol2Target.count - symbol2.count);
        const totalSymbolsNeeded = symbol1Needed + symbol2Needed;

        const symbol1Contribution = symbol1Target.multiplier;
        const symbol2Contribution = symbol2Target.multiplier;
        const totalMultiplier = (symbol1Contribution + symbol2Contribution) * effectiveMultiplier;

        const efficiency = totalSymbolsNeeded > 0 ? totalMultiplier / totalSymbolsNeeded : 0;
        const feasible = totalSymbolsNeeded <= availablePositions && 
                        totalSymbolsNeeded <= this.maxSymbolsToAdd &&
                        totalMultiplier >= targetMultiplier * 0.8; // Within 80% of target

        return {
            symbols: [
                {
                    symbol: symbol1.symbol,
                    targetCount: symbol1Target.count,
                    currentCount: symbol1.count,
                    contribution: symbol1Contribution
                },
                {
                    symbol: symbol2.symbol,
                    targetCount: symbol2Target.count,
                    currentCount: symbol2.count,
                    contribution: symbol2Contribution
                }
            ],
            totalMultiplier,
            totalSymbolsNeeded,
            efficiency,
            feasible
        };
    }

    /**
     * Analyze three-symbol combination
     */
    private analyzeThreeSymbolCombination(
        symbol1: NearWinSymbol,
        symbol2: NearWinSymbol,
        symbol3: NearWinSymbol,
        targetMultiplier: number,
        effectiveMultiplier: number,
        availablePositions: number
    ): MultiSymbolCombination {
        // Distribute target evenly among three symbols
        const targetPerSymbol = targetMultiplier / 3;
        
        const symbol1Target = this.findOptimalCount(symbol1, targetPerSymbol);
        const symbol2Target = this.findOptimalCount(symbol2, targetPerSymbol);
        const symbol3Target = this.findOptimalCount(symbol3, targetPerSymbol);

        const symbol1Needed = Math.max(0, symbol1Target.count - symbol1.count);
        const symbol2Needed = Math.max(0, symbol2Target.count - symbol2.count);
        const symbol3Needed = Math.max(0, symbol3Target.count - symbol3.count);
        const totalSymbolsNeeded = symbol1Needed + symbol2Needed + symbol3Needed;

        const totalMultiplier = (
            symbol1Target.multiplier + 
            symbol2Target.multiplier + 
            symbol3Target.multiplier
        ) * effectiveMultiplier;

        const efficiency = totalSymbolsNeeded > 0 ? totalMultiplier / totalSymbolsNeeded : 0;
        const feasible = totalSymbolsNeeded <= availablePositions && 
                        totalSymbolsNeeded <= this.maxSymbolsToAdd &&
                        totalMultiplier >= targetMultiplier * 0.8;

        return {
            symbols: [
                {
                    symbol: symbol1.symbol,
                    targetCount: symbol1Target.count,
                    currentCount: symbol1.count,
                    contribution: symbol1Target.multiplier
                },
                {
                    symbol: symbol2.symbol,
                    targetCount: symbol2Target.count,
                    currentCount: symbol2.count,
                    contribution: symbol2Target.multiplier
                },
                {
                    symbol: symbol3.symbol,
                    targetCount: symbol3Target.count,
                    currentCount: symbol3.count,
                    contribution: symbol3Target.multiplier
                }
            ],
            totalMultiplier,
            totalSymbolsNeeded,
            efficiency,
            feasible
        };
    }

    /**
     * Find optimal symbol count for a target contribution
     */
    private findOptimalCount(symbol: NearWinSymbol, targetContribution: number): { count: number; multiplier: number } {
        // Start with minimum winning count (8)
        let bestCount = 8;
        let bestMultiplier = 0;
        let bestDistance = Infinity;

        for (const tier of symbol.payoutTiers) {
            const distance = Math.abs(tier.multiplier - targetContribution);
            if (distance < bestDistance && tier.symbolCount >= 8) {
                bestDistance = distance;
                bestCount = tier.symbolCount;
                bestMultiplier = tier.multiplier;
            }
        }

        return { count: bestCount, multiplier: bestMultiplier };
    }

    /**
     * Determine if multi-symbol is better than enhanced single symbol
     */
    private determineRecommendedApproach(
        bestCombination: MultiSymbolCombination,
        primarySymbol: NearWinSymbol,
        targetMultiplier: number
    ): 'multi-symbol' | 'single-enhanced' | 'multiplier-dependent' {
        if (!bestCombination.feasible) {
            return 'single-enhanced';
        }

        // Calculate what single symbol could achieve with same number of symbols
        const symbolsForSingle = bestCombination.totalSymbolsNeeded;
        const singleSymbolPotential = this.calculateSingleSymbolPotential(
            primarySymbol, 
            symbolsForSingle
        );

        // Multi-symbol is better if it's more efficient or reaches target better
        const multiEfficiency = bestCombination.efficiency;
        const singleEfficiency = singleSymbolPotential.multiplier / symbolsForSingle;

        if (multiEfficiency > singleEfficiency * 1.1) { // 10% better
            return 'multi-symbol';
        }

        // If single symbol can reach target with fewer symbols, prefer it
        if (singleSymbolPotential.multiplier >= targetMultiplier * 0.9 && 
            singleSymbolPotential.symbolsNeeded < bestCombination.totalSymbolsNeeded) {
            return 'single-enhanced';
        }

        return 'multi-symbol';
    }

    /**
     * Calculate potential of single symbol with given number of additional symbols
     */
    private calculateSingleSymbolPotential(
        symbol: NearWinSymbol, 
        additionalSymbols: number
    ): { multiplier: number; symbolsNeeded: number } {
        const targetCount = symbol.count + additionalSymbols;
        
        // Find best tier for this count
        let bestMultiplier = 0;
        for (const tier of symbol.payoutTiers) {
            if (tier.symbolCount <= targetCount) {
                bestMultiplier = Math.max(bestMultiplier, tier.multiplier);
            }
        }

        return {
            multiplier: bestMultiplier,
            symbolsNeeded: additionalSymbols
        };
    }

    /**
     * Get detailed analysis for debugging/logging
     */
    getDetailedAnalysis(result: MultiSymbolResult, targetMultiplier: number): string {
        if (!result.bestCombination) {
            return `No feasible multi-symbol combinations found for target ${targetMultiplier.toFixed(1)}x`;
        }

        const combo = result.bestCombination;
        let analysis = `Best Multi-Symbol Combination (${combo.totalMultiplier.toFixed(1)}x):\n`;
        
        combo.symbols.forEach(s => {
            analysis += `  Symbol ${s.symbol}: ${s.currentCount} → ${s.targetCount} (+${s.targetCount - s.currentCount}) = ${s.contribution.toFixed(1)}x\n`;
        });
        
        analysis += `Total symbols needed: ${combo.totalSymbolsNeeded}, Efficiency: ${combo.efficiency.toFixed(2)}x per symbol\n`;
        analysis += `Recommended approach: ${result.recommendedApproach}`;
        
        return analysis;
    }
}
