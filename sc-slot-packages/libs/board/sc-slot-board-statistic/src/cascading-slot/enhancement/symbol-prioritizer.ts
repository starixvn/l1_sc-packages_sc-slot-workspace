import { defaultOdds, commonDefinition } from '../generator-definition.js';

export interface NearWinSymbol {
    symbol: number;
    count: number;
    needed: number;
    priority: number;
    expectedPayout: number;
    payoutTiers: PayoutTier[];
}

export interface PayoutTier {
    symbolCount: number;
    odds: number;
    multiplier: number;
    distance: number; // How far from target multiplier
}

export interface SymbolPriorityResult {
    primarySymbol: NearWinSymbol | null;
    alternativeSymbols: NearWinSymbol[];
    canReachTarget: boolean;
    recommendedStrategy: 'single-symbol' | 'multi-symbol' | 'multiplier-boost' | 'multiplier-generation';
}

/**
 * Advanced symbol prioritization system for board enhancement
 * Analyzes near-win symbols and determines optimal enhancement strategy
 */
export class SymbolPrioritizer {
    private readonly betMultiplier: number;

    constructor() {
        this.betMultiplier = commonDefinition.betSettings.defaultBetMultiplier;
    }

    /**
     * Analyze and prioritize near-win symbols for target multiplier
     */
    prioritizeSymbols(
        symbolCounts: { [symbol: number]: number },
        targetMultiplier: number,
        boardMultiplierSum: number = 0
    ): SymbolPriorityResult {
        const startTime = Date.now();
        const maxTime = 2000; // 2 second timeout for symbol prioritization
        
        try {
            // Extract near-win symbols (4-7 count, expandable to 8+)
            const nearWinSymbols = this.extractNearWinSymbols(symbolCounts, targetMultiplier);
            
            // Check timeout
            if (Date.now() - startTime > maxTime) {
                console.warn('⚠️ Symbol prioritization timeout, returning fallback result');
                return this.createFallbackResult();
            }
            
            if (nearWinSymbols.length === 0) {
                console.log('ℹ️ No near-win symbols found');
                return {
                    primarySymbol: null,
                    alternativeSymbols: [],
                    canReachTarget: false,
                    recommendedStrategy: 'multiplier-boost'
                };
            }

            // Sort by priority (highest first)
            nearWinSymbols.sort((a, b) => b.priority - a.priority);

            const primarySymbol = nearWinSymbols[0];
            const alternativeSymbols = nearWinSymbols.slice(1);

            // Check timeout again
            if (Date.now() - startTime > maxTime) {
                console.warn('⚠️ Symbol prioritization timeout during analysis');
                return this.createFallbackResult(primarySymbol);
            }

            // Determine if primary symbol can reach target alone
            const canReachTarget = this.canSymbolReachTarget(primarySymbol, targetMultiplier, boardMultiplierSum);
            
            // Recommend strategy based on analysis
            const recommendedStrategy = this.determineStrategy(
                primarySymbol, 
                alternativeSymbols, 
                targetMultiplier, 
                canReachTarget
            );

            console.log(`✅ Symbol prioritization completed in ${Date.now() - startTime}ms`);
            return {
                primarySymbol,
                alternativeSymbols,
                canReachTarget,
                recommendedStrategy
            };
            
        } catch (error) {
            console.error(`❌ Error in symbol prioritization: ${error.message}`);
            return this.createFallbackResult();
        }
    }

    /**
     * Extract and analyze near-win symbols with enhanced scoring
     */
    private extractNearWinSymbols(
        symbolCounts: { [symbol: number]: number },
        targetMultiplier: number
    ): NearWinSymbol[] {
        const nearWinSymbols: NearWinSymbol[] = [];

        Object.entries(symbolCounts).forEach(([symbolStr, count]) => {
            const symbol = parseInt(symbolStr);
            
            // Consider symbols with 4-7 count as near-wins (expandable to 8+)
            if (count >= 4 && count <= 7 && symbol >= 0 && symbol <= 8) {
                const needed = 8 - count;
                const payoutTiers = this.calculatePayoutTiers(symbol, targetMultiplier);
                const expectedPayout = this.getSymbolOdds(symbol, 8); // Base payout for 8 symbols
                const priority = this.calculatePriority(symbol, count, payoutTiers, targetMultiplier);

                nearWinSymbols.push({
                    symbol,
                    count,
                    needed,
                    priority,
                    expectedPayout,
                    payoutTiers
                });
            }
        });

        return nearWinSymbols;
    }

    /**
     * Calculate all possible payout tiers for a symbol
     */
    private calculatePayoutTiers(symbol: number, targetMultiplier: number): PayoutTier[] {
        const symbolConfig = defaultOdds.normalSymbols.find(s => s.symbol === symbol);
        if (!symbolConfig) return [];

        const tiers: PayoutTier[] = [];

        // Test symbol counts from 8 to 15 (reasonable maximum)
        for (let symbolCount = 8; symbolCount <= 15; symbolCount++) {
            const odds = this.getSymbolOdds(symbol, symbolCount);
            if (odds > 0) {
                const multiplier = odds / this.betMultiplier;
                const distance = Math.abs(multiplier - targetMultiplier);
                
                tiers.push({
                    symbolCount,
                    odds,
                    multiplier,
                    distance
                });
            }
        }

        // Sort by distance to target (closest first)
        return tiers.sort((a, b) => a.distance - b.distance);
    }

    /**
     * Calculate priority score for a near-win symbol
     */
    private calculatePriority(
        symbol: number,
        currentCount: number,
        payoutTiers: PayoutTier[],
        targetMultiplier: number
    ): number {
        // Base factors
        const proximityFactor = (8 - (8 - currentCount)) / 4; // 0.25 to 1.0 (closer to 8 = higher)
        const payoutFactor = Math.min(payoutTiers[0]?.multiplier || 0, 10) / 10; // Normalize high payouts
        
        // Target matching factor - how well this symbol can match target
        const bestTier = payoutTiers[0];
        const targetMatchFactor = bestTier ? 
            Math.max(0, 1 - (bestTier.distance / targetMultiplier)) : 0;

        // Symbol value factor - higher symbol numbers generally have better payouts
        const symbolValueFactor = symbol / 8; // 0 to 1.0

        // Weighted priority calculation
        const priority = (
            proximityFactor * 0.3 +      // 30% - how close to winning
            payoutFactor * 0.25 +        // 25% - payout potential
            targetMatchFactor * 0.35 +   // 35% - target matching ability
            symbolValueFactor * 0.1      // 10% - symbol inherent value
        );

        return Math.min(priority, 1.0); // Cap at 1.0
    }

    /**
     * Check if a symbol can reach target multiplier alone
     */
    private canSymbolReachTarget(
        symbol: NearWinSymbol,
        targetMultiplier: number,
        boardMultiplierSum: number = 0
    ): boolean {
        if (!symbol.payoutTiers.length) return false;

        // Check if any tier can reach target
        const effectiveMultiplier = boardMultiplierSum > 0 ? boardMultiplierSum : 1;
        
        return symbol.payoutTiers.some(tier => {
            const totalMultiplier = tier.multiplier * effectiveMultiplier;
            return totalMultiplier >= targetMultiplier * 0.8; // Within 80% is acceptable
        });
    }

    /**
     * Determine optimal enhancement strategy
     */
    private determineStrategy(
        primarySymbol: NearWinSymbol,
        alternativeSymbols: NearWinSymbol[],
        targetMultiplier: number,
        canReachTarget: boolean
    ): 'single-symbol' | 'multi-symbol' | 'multiplier-boost' | 'multiplier-generation' {
        if (canReachTarget) {
            return 'single-symbol';
        }

        if (targetMultiplier > 10.0) {
            return 'multiplier-generation';
        }

        const goodAlternatives = alternativeSymbols.filter(s => s.priority > 0.5);
        if (goodAlternatives.length >= 1 && targetMultiplier > 2.0) {
            return 'multi-symbol';
        }

        return 'multiplier-boost';
    }

    /**
     * Get odds for a symbol at specific count
     */
    private getSymbolOdds(symbol: number, symbolCount: number): number {
        try {
            const symbolConfig = defaultOdds?.normalSymbols?.find(s => s.symbol === symbol);
            if (!symbolConfig) {
                console.warn(`⚠️ Symbol config not found for symbol ${symbol}, using fallback odds`);
                return this.getFallbackOdds(symbol, symbolCount);
            }

            // Find appropriate payout tier
            for (const payoutRange of symbolConfig.payout) {
                if (symbolCount >= payoutRange.from && symbolCount <= payoutRange.to) {
                    return payoutRange.odds;
                }
            }

            console.warn(`⚠️ No payout range found for symbol ${symbol} count ${symbolCount}, using fallback`);
            return this.getFallbackOdds(symbol, symbolCount);
            
        } catch (error) {
            console.error(`❌ Error getting symbol odds for ${symbol}:`, error.message);
            return this.getFallbackOdds(symbol, symbolCount);
        }
    }

    /**
     * Fallback odds calculation when defaultOdds is not available
     */
    private getFallbackOdds(symbol: number, symbolCount: number): number {
        // Simple fallback based on symbol value and count
        const baseOdds = [5, 8, 10, 16, 20, 30, 40, 50, 200]; // Rough approximation
        const symbolOdds = baseOdds[symbol] || 5;
        
        // Scale by symbol count (rough approximation)
        if (symbolCount >= 12) return symbolOdds * 8;
        if (symbolCount >= 10) return symbolOdds * 2;
        return symbolOdds; // 8-9 symbols
    }

    /**
     * Create a safe fallback result when prioritization fails
     */
    private createFallbackResult(primarySymbol?: NearWinSymbol): SymbolPriorityResult {
        return {
            primarySymbol: primarySymbol || null,
            alternativeSymbols: [],
            canReachTarget: false,
            recommendedStrategy: 'multiplier-boost'
        };
    }

    /**
     * Get detailed analysis for debugging/logging
     */
    getDetailedAnalysis(result: SymbolPriorityResult, targetMultiplier: number): string {
        if (!result.primarySymbol) {
            return `No suitable near-win symbols found for target ${targetMultiplier.toFixed(1)}x`;
        }

        const primary = result.primarySymbol;
        const bestTier = primary.payoutTiers[0];
        
        let analysis = `Primary: Symbol ${primary.symbol} (${primary.count} → ${bestTier?.symbolCount || 8}) `;
        analysis += `= ${bestTier?.multiplier.toFixed(1) || '0.0'}x (priority: ${primary.priority.toFixed(2)})`;
        
        if (result.alternativeSymbols.length > 0) {
            analysis += `\nAlternatives: ${result.alternativeSymbols.map(s => 
                `Symbol ${s.symbol}(${s.count}, ${s.priority.toFixed(2)})`
            ).join(', ')}`;
        }
        
        analysis += `\nStrategy: ${result.recommendedStrategy}`;
        
        return analysis;
    }
}
