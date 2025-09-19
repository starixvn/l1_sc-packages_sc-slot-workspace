export interface EnhancedBoardAnalysis {
    symbolCounts: { [symbol: number]: number };
    winningSymbols: number[];
    nearWinSymbols: Array<{
        symbol: number;
        count: number;
        needed: number;
        priority: number;
        expectedPayout: number;
    }>;
    emptyPositions: number[];
    winPotential: 'none' | 'low' | 'medium' | 'high';
    boardDensity: number;
    symbolDistribution: { [reel: number]: number[] };
    reelAnalysis: ReelAnalysis[];
    cascadePotential: CascadePotential;
    placementRecommendations: PlacementRecommendation[];
}

export interface ReelAnalysis {
    reelIndex: number;
    symbolTypes: number;
    dominantSymbol: number | null;
    density: number;
    cascadeReadiness: number; // 0-1 score for cascade potential
    availablePositions: number[];
}

export interface CascadePotential {
    score: number; // 0-1 overall cascade potential
    hotZones: Array<{
        positions: number[];
        reason: string;
        priority: number;
    }>;
    adjacencyMap: { [position: number]: number[] };
}

export interface PlacementRecommendation {
    position: number;
    symbol: number;
    reason: string;
    priority: number;
    cascadeBonus: number;
}

/**
 * Enhanced board analyzer with advanced pattern recognition and placement optimization
 */
export class EnhancedBoardAnalyzer {
    private readonly BOARD_WIDTH = 5; // 5 symbols per reel
    private readonly BOARD_HEIGHT = 6; // 6 reels
    private readonly TOTAL_POSITIONS = 30;

    /**
     * Perform comprehensive board analysis
     */
    analyzeBoard(board: number[]): EnhancedBoardAnalysis {
        // Basic symbol analysis
        const symbolCounts = this.countSymbols(board);
        const winningSymbols = this.identifyWinningSymbols(symbolCounts);
        const nearWinSymbols = this.identifyNearWinSymbols(symbolCounts);
        const emptyPositions = this.findEmptyPositions(board);
        
        // Advanced analysis
        const symbolDistribution = this.analyzeSymbolDistribution(board);
        const reelAnalysis = this.analyzeReels(board, symbolDistribution);
        const cascadePotential = this.analyzeCascadePotential(board, symbolDistribution, reelAnalysis);
        const placementRecommendations = this.generatePlacementRecommendations(
            board, 
            nearWinSymbols, 
            reelAnalysis, 
            cascadePotential
        );

        // Calculate derived metrics
        const boardDensity = this.calculateBoardDensity(board);
        const winPotential = this.assessWinPotential(winningSymbols, nearWinSymbols, cascadePotential);

        return {
            symbolCounts,
            winningSymbols,
            nearWinSymbols,
            emptyPositions,
            winPotential,
            boardDensity,
            symbolDistribution,
            reelAnalysis,
            cascadePotential,
            placementRecommendations
        };
    }

    /**
     * Count symbols on the board
     */
    private countSymbols(board: number[]): { [symbol: number]: number } {
        const counts: { [symbol: number]: number } = {};
        
        board.forEach(symbol => {
            if (symbol >= 0 && symbol <= 10) {
                counts[symbol] = (counts[symbol] || 0) + 1;
            }
        });
        
        return counts;
    }

    /**
     * Identify winning symbols (8+ count)
     */
    private identifyWinningSymbols(symbolCounts: { [symbol: number]: number }): number[] {
        return Object.entries(symbolCounts)
            .filter(([_, count]) => count >= 8)
            .map(([symbol, _]) => parseInt(symbol));
    }

    /**
     * Identify near-win symbols with basic priority
     */
    private identifyNearWinSymbols(symbolCounts: { [symbol: number]: number }): Array<{
        symbol: number;
        count: number;
        needed: number;
        priority: number;
        expectedPayout: number;
    }> {
        const nearWins: Array<{
            symbol: number;
            count: number;
            needed: number;
            priority: number;
            expectedPayout: number;
        }> = [];

        Object.entries(symbolCounts).forEach(([symbolStr, count]) => {
            const symbol = parseInt(symbolStr);
            if (count >= 4 && count <= 7 && symbol >= 0 && symbol <= 8) {
                const needed = 8 - count;
                // Basic priority calculation (will be enhanced by SymbolPrioritizer)
                const priority = (count - 3) / 4; // 0.25 to 1.0
                const expectedPayout = symbol * 10; // Rough estimate
                
                nearWins.push({
                    symbol,
                    count,
                    needed,
                    priority,
                    expectedPayout
                });
            }
        });

        return nearWins.sort((a, b) => b.priority - a.priority);
    }

    /**
     * Find empty positions on the board
     */
    private findEmptyPositions(board: number[]): number[] {
        const empty: number[] = [];
        
        board.forEach((symbol, position) => {
            if (symbol === -1 || symbol === null || symbol === undefined) {
                empty.push(position);
            }
        });
        
        return empty;
    }

    /**
     * Analyze symbol distribution across reels
     */
    private analyzeSymbolDistribution(board: number[]): { [reel: number]: number[] } {
        const distribution: { [reel: number]: number[] } = {};
        
        for (let reel = 0; reel < this.BOARD_HEIGHT; reel++) {
            distribution[reel] = [];
            for (let pos = 0; pos < this.BOARD_WIDTH; pos++) {
                const boardIndex = reel * this.BOARD_WIDTH + pos;
                if (boardIndex < board.length) {
                    distribution[reel].push(board[boardIndex]);
                }
            }
        }
        
        return distribution;
    }

    /**
     * Analyze each reel for placement opportunities
     */
    private analyzeReels(
        board: number[], 
        symbolDistribution: { [reel: number]: number[] }
    ): ReelAnalysis[] {
        const analysis: ReelAnalysis[] = [];
        
        for (let reel = 0; reel < this.BOARD_HEIGHT; reel++) {
            const reelSymbols = symbolDistribution[reel];
            const symbolTypes = new Set(reelSymbols.filter(s => s >= 0 && s <= 10)).size;
            const symbolCounts: { [symbol: number]: number } = {};
            
            // Count symbols in this reel
            reelSymbols.forEach(symbol => {
                if (symbol >= 0 && symbol <= 10) {
                    symbolCounts[symbol] = (symbolCounts[symbol] || 0) + 1;
                }
            });
            
            // Find dominant symbol
            let dominantSymbol: number | null = null;
            let maxCount = 0;
            Object.entries(symbolCounts).forEach(([symbol, count]) => {
                if (count > maxCount) {
                    maxCount = count;
                    dominantSymbol = parseInt(symbol);
                }
            });
            
            // Calculate density and available positions
            const filledPositions = reelSymbols.filter(s => s >= 0 && s <= 10).length;
            const density = filledPositions / this.BOARD_WIDTH;
            const availablePositions: number[] = [];
            
            for (let pos = 0; pos < this.BOARD_WIDTH; pos++) {
                const boardIndex = reel * this.BOARD_WIDTH + pos;
                if (boardIndex < board.length && (board[boardIndex] < 0 || board[boardIndex] > 10)) {
                    availablePositions.push(boardIndex);
                }
            }
            
            // Calculate cascade readiness (how likely this reel is to create cascades)
            const cascadeReadiness = this.calculateReelCascadeReadiness(symbolCounts, density);
            
            analysis.push({
                reelIndex: reel,
                symbolTypes,
                dominantSymbol,
                density,
                cascadeReadiness,
                availablePositions
            });
        }
        
        return analysis;
    }

    /**
     * Calculate cascade readiness for a reel
     */
    private calculateReelCascadeReadiness(
        symbolCounts: { [symbol: number]: number }, 
        density: number
    ): number {
        let readiness = 0;
        
        // Higher density generally means better cascade potential
        readiness += density * 0.3;
        
        // Multiple symbols of same type increase cascade potential
        Object.values(symbolCounts).forEach(count => {
            if (count >= 2) {
                readiness += (count - 1) * 0.2;
            }
        });
        
        return Math.min(readiness, 1.0);
    }

    /**
     * Analyze cascade potential across the entire board
     */
    private analyzeCascadePotential(
        board: number[],
        symbolDistribution: { [reel: number]: number[] },
        reelAnalysis: ReelAnalysis[]
    ): CascadePotential {
        const adjacencyMap = this.buildAdjacencyMap();
        const hotZones = this.identifyHotZones(board, reelAnalysis, adjacencyMap);
        
        // Calculate overall cascade score
        const avgReelReadiness = reelAnalysis.reduce((sum, reel) => sum + reel.cascadeReadiness, 0) / reelAnalysis.length;
        const hotZoneBonus = hotZones.length * 0.1;
        const score = Math.min(avgReelReadiness + hotZoneBonus, 1.0);
        
        return {
            score,
            hotZones,
            adjacencyMap
        };
    }

    /**
     * Build adjacency map for cascade analysis
     */
    private buildAdjacencyMap(): { [position: number]: number[] } {
        const adjacencyMap: { [position: number]: number[] } = {};
        
        for (let pos = 0; pos < this.TOTAL_POSITIONS; pos++) {
            const reel = Math.floor(pos / this.BOARD_WIDTH);
            const reelPos = pos % this.BOARD_WIDTH;
            const adjacent: number[] = [];
            
            // Adjacent positions (horizontal and vertical neighbors)
            const neighbors = [
                { r: reel - 1, p: reelPos },     // Left reel
                { r: reel + 1, p: reelPos },     // Right reel
                { r: reel, p: reelPos - 1 },     // Above
                { r: reel, p: reelPos + 1 }      // Below
            ];
            
            neighbors.forEach(({ r, p }) => {
                if (r >= 0 && r < this.BOARD_HEIGHT && p >= 0 && p < this.BOARD_WIDTH) {
                    adjacent.push(r * this.BOARD_WIDTH + p);
                }
            });
            
            adjacencyMap[pos] = adjacent;
        }
        
        return adjacencyMap;
    }

    /**
     * Identify hot zones for optimal symbol placement
     */
    private identifyHotZones(
        board: number[],
        reelAnalysis: ReelAnalysis[],
        adjacencyMap: { [position: number]: number[] }
    ): Array<{ positions: number[]; reason: string; priority: number }> {
        const hotZones: Array<{ positions: number[]; reason: string; priority: number }> = [];
        
        // High-readiness reels are hot zones
        reelAnalysis.forEach(reel => {
            if (reel.cascadeReadiness > 0.6 && reel.availablePositions.length > 0) {
                hotZones.push({
                    positions: reel.availablePositions,
                    reason: `High cascade readiness reel ${reel.reelIndex}`,
                    priority: reel.cascadeReadiness
                });
            }
        });
        
        // Areas with multiple near-win symbols are hot zones
        for (let pos = 0; pos < board.length; pos++) {
            const symbol = board[pos];
            if (symbol >= 0 && symbol <= 8) {
                const nearbySymbols = adjacencyMap[pos]
                    .map(adjPos => board[adjPos])
                    .filter(adjSymbol => adjSymbol === symbol);
                
                if (nearbySymbols.length >= 2) {
                    const availableAdjacent = adjacencyMap[pos].filter(adjPos => 
                        board[adjPos] < 0 || board[adjPos] > 10
                    );
                    
                    if (availableAdjacent.length > 0) {
                        hotZones.push({
                            positions: availableAdjacent,
                            reason: `Adjacent to ${nearbySymbols.length + 1} symbol ${symbol}s`,
                            priority: 0.7 + (nearbySymbols.length * 0.1)
                        });
                    }
                }
            }
        }
        
        return hotZones.sort((a, b) => b.priority - a.priority);
    }

    /**
     * Generate placement recommendations
     */
    private generatePlacementRecommendations(
        board: number[],
        nearWinSymbols: Array<{ symbol: number; count: number; needed: number; priority: number }>,
        reelAnalysis: ReelAnalysis[],
        cascadePotential: CascadePotential
    ): PlacementRecommendation[] {
        const recommendations: PlacementRecommendation[] = [];
        
        // For each near-win symbol, recommend optimal placement positions
        nearWinSymbols.forEach(nearWin => {
            const availablePositions = this.findAvailablePositions(board);
            
            availablePositions.forEach(pos => {
                const reel = Math.floor(pos / this.BOARD_WIDTH);
                const reelInfo = reelAnalysis[reel];
                
                // Calculate placement priority
                let priority = nearWin.priority * 0.4; // Base priority from symbol
                priority += reelInfo.cascadeReadiness * 0.3; // Reel cascade potential
                
                // Bonus for hot zones
                const inHotZone = cascadePotential.hotZones.some(zone => 
                    zone.positions.includes(pos)
                );
                if (inHotZone) {
                    priority += 0.2;
                }
                
                // Bonus for spreading across reels
                const symbolInReel = reelInfo.dominantSymbol === nearWin.symbol;
                if (!symbolInReel) {
                    priority += 0.1; // Prefer spreading symbols
                }
                
                const cascadeBonus = this.calculateCascadeBonus(pos, nearWin.symbol, board, cascadePotential);
                
                recommendations.push({
                    position: pos,
                    symbol: nearWin.symbol,
                    reason: `Near-win symbol ${nearWin.symbol} placement (${nearWin.count}/8)`,
                    priority,
                    cascadeBonus
                });
            });
        });
        
        return recommendations.sort((a, b) => b.priority - a.priority);
    }

    /**
     * Find available positions for symbol placement
     */
    private findAvailablePositions(board: number[]): number[] {
        const available: number[] = [];
        
        board.forEach((symbol, pos) => {
            if (symbol < 0 || symbol > 10) {
                available.push(pos);
            }
        });
        
        return available;
    }

    /**
     * Calculate cascade bonus for a position
     */
    private calculateCascadeBonus(
        position: number,
        symbol: number,
        board: number[],
        cascadePotential: CascadePotential
    ): number {
        let bonus = 0;
        
        // Check adjacent positions for same symbol
        const adjacent = cascadePotential.adjacencyMap[position] || [];
        const matchingAdjacent = adjacent.filter(pos => board[pos] === symbol).length;
        
        bonus += matchingAdjacent * 0.2;
        
        // Hot zone bonus
        const inHotZone = cascadePotential.hotZones.some(zone => 
            zone.positions.includes(position)
        );
        if (inHotZone) {
            bonus += 0.3;
        }
        
        return Math.min(bonus, 1.0);
    }

    /**
     * Calculate board density
     */
    private calculateBoardDensity(board: number[]): number {
        const filledPositions = board.filter(symbol => symbol >= 0 && symbol <= 10).length;
        return filledPositions / board.length;
    }

    /**
     * Assess overall win potential
     */
    private assessWinPotential(
        winningSymbols: number[],
        nearWinSymbols: Array<{ symbol: number; count: number; needed: number }>,
        cascadePotential: CascadePotential
    ): 'none' | 'low' | 'medium' | 'high' {
        if (winningSymbols.length > 0) {
            return 'high';
        }
        
        const highPriorityNearWins = nearWinSymbols.filter(s => s.needed <= 2).length;
        const cascadeBonus = cascadePotential.score > 0.6 ? 1 : 0;
        
        if (highPriorityNearWins >= 2 || (highPriorityNearWins >= 1 && cascadeBonus)) {
            return 'medium';
        } else if (nearWinSymbols.length >= 1) {
            return 'low';
        }
        
        return 'none';
    }
}
