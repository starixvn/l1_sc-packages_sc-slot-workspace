# Board Generation and Enhancement Guide

This document provides a comprehensive overview of the single board generation and board enhancement processes in the slot machine system.

## Table of Contents

- [Overview](#overview)
- [Recent Enhancements](#recent-enhancements)
- [Single Board Generation Process](#single-board-generation-process)
- [Board Enhancement Process](#board-enhancement-process)
- [Settlement and Tumble Processing](#settlement-and-tumble-processing)
- [Key Components](#key-components)
- [Configuration and Constants](#configuration-and-constants)
- [Performance and Error Handling](#performance-and-error-handling)
- [Examples](#examples)

## Overview

The board generation system creates realistic slot machine game boards that maintain target RTP (Return to Player) while providing engaging gameplay patterns. The system consists of two main processes:

1. **Single Board Generation**: Creates individual game boards with RTP-driven win targeting
2. **Board Enhancement**: Intelligently modifies boards to achieve specific win amounts

## Recent Enhancements

### ✅ Validation System Separation (v2.1)
- **Extracted validation logic** into dedicated `chain-validator.ts`
- **Modular validation** for free spins, tumble patterns, and chain compliance
- **Improved maintainability** and testability of validation rules

### ✅ Accurate Payout System (v2.2)
- **Fixed bet calculations**: `baseBetAmount` vs `totalBetAmount` distinction
- **Tier-based payouts**: Dynamic odds from `defaultOdds.normalSymbols`
- **Correct multiplier calculation**: `payoutWin / totalBetAmount`
- **Symbol count awareness**: Different payout tiers based on winning symbol counts

### ✅ Magic Number Elimination (v2.3)
- **Removed hardcoded values**: Replaced magic number `20` with `commonDefinition.betSettings.defaultBetMultiplier`
- **Configuration-driven**: All constants now sourced from `generator-definition.ts`
- **Maintainable codebase**: Easy to adjust bet multipliers and other constants

### ✅ Code Cleanup and Optimization (v2.4)
- **Removed unused imports**: Cleaned up `ramda` imports and other unused dependencies
- **Eliminated dead code**: Removed legacy methods like `cascadePatternCounter`
- **Simplified bet calculations**: Direct calls to `calculateBetAmounts().totalBetAmount`
- **Enhanced error handling**: Try-catch blocks and timeout mechanisms

### ✅ Performance and Stability Improvements (v2.5)
- **Timeout protection**: 30-second timeout for board generation, 5-second for enhancement
- **Reduced logging noise**: Only log significant wins (2x+ multiplier)
- **Error resilience**: Graceful failure handling with fallback mechanisms
- **Progress tracking**: Real-time progress indicators for long-running operations

### ✅ Filename Consistency (v2.6)
- **Corrected file naming**: Uses `baseBetAmount` instead of `totalBetAmount` in filenames
- **Clear bet display**: Shows both base and total amounts in console output
- **JSON enhancement**: Includes both `baseBetAmount` and `totalBetAmount` in output files

## Single Board Generation Process

### Step 1: RTP-Driven Target Calculation

The RTP Controller determines whether a board should be a winner and calculates the target win amount:

```typescript
// RTPController determines win probability and target amounts
const targetWin = this.rtpController.calculateTargetWin(currentResults);
const shouldWin = this.rtpController.shouldNextBoardWin(currentResults);
```

**Key Logic:**
- Analyzes current RTP performance vs target (97%)
- Adjusts win probability: 70% when behind, 20% when ahead
- Calculates required wins to maintain target RTP

### Step 2: Initial Board Generation

Creates a random 6×5 board using the BoardGenerator:

```typescript
const boardGenerator = this.boardGeneratorFactory();
let initialBoard = boardGenerator.generate(); 
// Returns: { newBoard: number[], multipliers: number[] }
```

**Board Structure:**
- **6 reels × 5 symbols** = 30 total positions
- **Symbols 0-8**: Normal payout symbols
- **Symbol 9**: Free spin trigger
- **Symbol 10**: Multiplier symbol

### Step 3: Board Enhancement (Conditional)

If the target win is greater than 0, the board undergoes enhancement:

```typescript
if (targetWin > 0) {
    initialBoard = this.enhanceBoardForTargetWin(initialBoard, targetWin, betSize);
}
```

### Step 4: Settlement Processing

Creates a Round configuration and processes the settlement:

```typescript
const round: Round = {
    id: boardId,
    coinValue: config.coinValue || 0.1,
    betLevel: config.betLevel || 0.5,
    betMultiplier: commonDefinition.betSettings.defaultBetMultiplier, // 20
    totalAmount: coinValue * betLevel * betMultiplier,
    odds: defaultOdds
};

const boardResult = await this.processSettlement(initialBoard, round, betSize);
```

### Step 5: Iterative Optimization with Timeout Protection

The system attempts up to 50 iterations to find the board closest to the target win, with built-in timeout protection:

```typescript
const maxAttempts = 50;
const startTime = Date.now();
const maxTimeMs = 30000; // 30 second timeout per board

for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // Check timeout protection
    if (Date.now() - startTime > maxTimeMs) {
        console.warn(`⚠️  Board ${boardId} generation timeout after ${attempt} attempts`);
        break;
    }
    
    const distance = Math.abs((boardResult.totalTumbleWin || 0) - targetWin);
    if (distance < bestDistance) {
        bestBoard = boardResult;
        bestDistance = distance;
    }
}
```

**Timeout Features:**
- **30-second maximum** per board generation
- **Graceful timeout handling** with warning logs
- **Best effort return** of closest board found
- **Prevents infinite loops** in complex scenarios

## Board Enhancement Process

### Step 1: Board Analysis

Analyzes the current board state to understand win potential:

```typescript
const analysis = this.analyzeBoard(currentBoard);
```

**Analysis Results:**
```typescript
{
    symbolCounts: { [symbol: number]: number }, // Count of each symbol
    winningSymbols: number[],                   // Symbols with 8+ count
    nearWinSymbols: {                          // Symbols with 6-7 count
        symbol: number,
        count: number,
        needed: number
    }[],
    emptyPositions: number[],                  // Available positions
    winPotential: 'none' | 'low' | 'medium' | 'high'
}
```

### Step 2: Early Exit for Winning Boards

If the board already has winning symbols, skip enhancement:

```typescript
if (analysis.winningSymbols.length > 0) {
    console.log('✅ Board already has winning symbols, using as-is');
    return { newBoard: currentBoard, multipliers: currentMultipliers };
}
```

### Step 3: Enhanced Target Symbol Selection

Determines the optimal symbol and count for the target multiplier using a comprehensive algorithm:

```typescript
const targetWinMultiplier = targetWin / totalBetAmount;
const { symbol, count } = this.determineTargetSymbolForWin(targetWinMultiplier, analysis);
```

**Enhanced Selection Algorithm (v2.2+):**

1. **Near-Win Priority**: Build on existing symbols with 6-7 count
2. **Dynamic Odds Integration**: Uses `defaultOdds.normalSymbols` from `generator-definition.ts`
3. **Tier-Aware Matching**: Selects appropriate payout tier based on target multiplier
4. **Optimal Symbol Search**: `findOptimalSymbolForMultiplier()` tests all symbols and counts (8-15)
5. **Accuracy Optimization**: Finds closest match to target multiplier within realistic bounds

**Selection Logic:**
```typescript
// Priority 1: Build on near-wins (6-7 symbols)
if (analysis.nearWinSymbols.length > 0) {
    for (const nearWin of analysis.nearWinSymbols) {
        const targetCount = Math.min(15, Math.max(8, nearWin.count + 2));
        const odds = this.getSymbolOdds(nearWin.symbol, targetCount);
        const resultingMultiplier = odds / commonDefinition.betSettings.defaultBetMultiplier;
        
        if (Math.abs(resultingMultiplier - targetMultiplier) < bestDistance) {
            return { symbol: nearWin.symbol, count: targetCount };
        }
    }
}

// Priority 2: Comprehensive symbol search
return this.findOptimalSymbolForMultiplier(targetMultiplier);
```

### Step 4: Strategic Symbol Placement

Places symbols intelligently to create the target win pattern:

```typescript
const enhancedBoard = this.placeWinningSymbols(currentBoard, symbol, count);
```

**Placement Strategy:**
- Maintains realistic symbol distribution
- Avoids obvious artificial patterns
- Considers existing symbol positions

### Step 5: Enhanced Verification with Smart Logging

Logs enhancement results with intelligent filtering and timeout protection:

```typescript
// Only log enhancement details for meaningful wins (2x+ multiplier) to reduce noise
const isSignificantWin = targetWin > totalBetAmount * 2; // 2x+ multiplier
if (isSignificantWin) {
    console.log(`🎯 Enhancing board for target win: ${targetWin.toFixed(2)} (${(targetWin/totalBetAmount).toFixed(1)}x total bet)`);
    console.log(`   Current winning symbols: [${analysis.winningSymbols.join(', ')}]`);
    console.log(`   Near-win symbols: ${analysis.nearWinSymbols.map(s => `${s.symbol}(${s.count})`).join(', ')}`);
    
    console.log(`🔧 Placed ${count} symbols of type ${symbol} for ${targetWinMultiplier.toFixed(1)}x target`);
    console.log(`📊 Enhanced board now has winning symbols: [${this.detectWinningSymbols(enhancedBoard).join(', ')}]`);
}

// Timeout protection for enhancement
const enhancementStart = Date.now();
const maxEnhancementTime = 5000; // 5 second timeout for enhancement

if (Date.now() - enhancementStart > maxEnhancementTime) {
    console.warn(`⚠️  Board enhancement timeout, returning original board`);
    return { newBoard: currentBoard, multipliers: currentMultipliers };
}
```

**Smart Logging Features (v2.5+):**
- **Significance filtering**: Only logs wins ≥2x multiplier
- **Detailed context**: Shows current state, near-wins, and enhancement decisions
- **Performance optimization**: Reduces log noise for small wins
- **Timeout protection**: 5-second maximum for enhancement operations

## Settlement and Tumble Processing

### Step 1: Tumble Generation

Processes the board through the tumble system:

```typescript
const tumbleProcessingResult = await this.processTumblesWithBoardGenerator(
    initialBoard.newBoard,
    initialBoard.multipliers,
    totalBetAmount, // For RTP calculations
    baseBetAmount   // For payout calculations
);
```

### Step 2: Enhanced Win Calculation with Tier-Based Payouts

Calculates wins using the accurate tier-based payout system with dynamic odds:

```typescript
const tumbleWin = this.calculateTumbleWin(winSymbols, baseBetAmount, currentBoard);
const multiplier = tumbleWin / totalBetAmount;
```

**Enhanced Payout System (v2.2+):**

```typescript
// Dynamic odds calculation from defaultOdds.normalSymbols
private getSymbolOdds(symbol: number, symbolCount?: number): number {
    const symbolConfig = defaultOdds.normalSymbols.find(s => s.symbol === symbol);
    if (!symbolConfig) return 0;
    
    // If symbolCount provided, find appropriate tier
    if (symbolCount !== undefined) {
        for (const tier of symbolConfig.payout) {
            if (symbolCount >= tier.from && symbolCount <= tier.to) {
                return tier.odds;
            }
        }
    }
    
    // Default to lowest tier odds
    return symbolConfig.payout[0]?.odds || 0;
}
```

**Accurate Payout Tiers (from defaultOdds.normalSymbols):**
- **Symbol 0**: 8-9 (5x), 10-11 (15x), 12+ (40x)
- **Symbol 1**: 8-9 (8x), 10-11 (18x), 12+ (80x) 
- **Symbol 2**: 8-9 (10x), 10-11 (25x), 12+ (100x)
- **Symbol 3**: 8-9 (16x), 10-11 (40x), 12+ (160x)
- **Symbol 4**: 8-9 (20x), 10-11 (50x), 12+ (200x)
- **And so on...**

**Key Improvements:**
- **Dynamic odds lookup** from configuration
- **Symbol count awareness** for tier selection
- **Accurate multiplier calculation** using `totalBetAmount`
- **Consistent with defaultOdds** from `generator-definition.ts`

### Step 3: Pattern Compliance

Ensures tumble data follows the correct patterns:

```typescript
if (tumbles.length === 0 || totalWin === 0) {
    // Pattern 1: No-win board - single tumble, no cascade data
    tumbles = [{
        icons: {},
        win: 0,
        originalBoard: board.join(','),
        newBoard: board.join(',')
    }];
} else {
    // Pattern 2: Winning board - multiple tumbles with cascade data
    // Each tumble includes: icons, win, originalBoard, newBoard, explodedSymbols, newSymbols
}
```

## Key Components

### RTPController

Manages target RTP and win distribution:

```typescript
interface RTPConfiguration {
    targetRTP: number;      // Target RTP (0.97 = 97%)
    tolerance: number;      // RTP tolerance (±%)
    boardCount: number;     // Total boards in chain
    betSize: number;        // Total bet amount
    playerBudget: number;   // Total player budget (legacy)
}
```

### BoardGeneratorInterface

Provides board generation and tumble processing:

```typescript
interface BoardGeneratorInterface {
    generate(): { newBoard: number[]; multipliers: number[] };
    explodeAndRefill(
        board: number[], 
        winSymbols: number[], 
        oldMultipliers: number[]
    ): {
        newBoard: number[];
        multipliers: number[];
        explodedSymbols?: number[];
        newSymbols?: number[];
    };
}
```

### defaultOdds Configuration

Defines payout structure for all symbols:

```typescript
export const defaultOdds = {
    normalSymbols: [
        {
            symbol: 0,
            payout: [
                { from: 8, to: 9, odds: 5 },
                { from: 10, to: 11, odds: 15 },
                { from: 12, to: 30, odds: 40 }
            ]
        },
        // ... symbols 1-8 with increasing payout values
    ],
    freeSpins: {
        symbol: 9,
        initialOdds: [
            { count: 4, odds: 3 },
            { count: 5, odds: 6 },
            { count: 6, odds: 18 }
        ]
    }
};
```

## Configuration and Constants

### Bet Structure (Enhanced v2.2+)

```typescript
// From commonDefinition.betSettings
const defaultBetMultiplier = 20; // No longer hardcoded!

// Enhanced calculation with proper separation
const baseBetAmount = coinValue * betLevel;           // e.g., 0.01 * 7 = 0.07
const totalBetAmount = baseBetAmount * defaultBetMultiplier; // e.g., 0.07 * 20 = 1.40

// Accurate payout calculation (v2.2+)
const symbolOdds = this.getSymbolOdds(symbol, symbolCount); // Dynamic odds
const payoutWin = baseBetAmount * symbolOdds;         // Uses baseBetAmount
const payoutMultiplier = payoutWin / totalBetAmount;  // Display multiplier

// File naming uses baseBetAmount (v2.6+)
const filename = `${pattern}-${boardCount}boards-bet${baseBetAmount.toFixed(2).replace('.', '_')}-${timestamp}.json`;
```

**Key Enhancements:**
- **Configuration-driven**: `defaultBetMultiplier` from `commonDefinition.betSettings`
- **Proper separation**: `baseBetAmount` for payouts, `totalBetAmount` for RTP
- **Dynamic odds**: Symbol odds retrieved from `defaultOdds.normalSymbols`
- **Filename consistency**: Uses `baseBetAmount` for file naming

### Board Settings

```typescript
// From commonDefinition.boardSettings
const boardSettings = {
    reels: 6,              // 6 reels
    symbolsOnReel: 5,      // 5 symbols per reel
    numberOfSymbols: 11,   // Symbols 0-10
    numberOfShuffles: 3    // Randomization passes
};
```

## Performance and Error Handling

### Timeout Protection (v2.5+)

The system includes comprehensive timeout mechanisms to prevent infinite loops and ensure responsive performance:

```typescript
// Board generation timeout (30 seconds)
private async generateSingleBoard(targetWin: number, betSize: number, boardId: number, config: ResultChainConfig): Promise<BoardResult> {
    const maxAttempts = 50;
    const startTime = Date.now();
    const maxTimeMs = 30000; // 30 second timeout per board

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        if (Date.now() - startTime > maxTimeMs) {
            console.warn(`⚠️  Board ${boardId} generation timeout after ${attempt} attempts`);
            break;
        }
        // ... generation logic
    }
    return bestBoard!;
}

// Enhancement timeout (5 seconds)
private enhanceBoardForTargetWin(board: { newBoard: number[]; multipliers: number[] }, targetWin: number, totalBetAmount: number) {
    const enhancementStart = Date.now();
    const maxEnhancementTime = 5000; // 5 second timeout for enhancement

    // ... enhancement logic

    if (Date.now() - enhancementStart > maxEnhancementTime) {
        console.warn(`⚠️  Board enhancement timeout, returning original board`);
        return { newBoard: currentBoard, multipliers: currentMultipliers };
    }
}
```

### Error Resilience

Robust error handling ensures system stability:

```typescript
// Try-catch in board generation
try {
    const tumbleProcessingResult = await this.processTumblesWithBoardGenerator(
        initialBoard.newBoard,
        initialBoard.multipliers,
        betSize,
        baseBetAmount
    );
    // ... processing logic
} catch (error) {
    console.warn(`⚠️  Board ${round.id} attempt failed:`, error.message);
    throw error; // Re-throw to be caught by generateSingleBoard
}
```

### Smart Logging (v2.5+)

Optimized logging reduces noise while maintaining visibility:

```typescript
// Only log significant wins (2x+ multiplier)
const isSignificantWin = targetWin > totalBetAmount * 2;
if (isSignificantWin) {
    console.log(`🎯 Enhancing board for target win: ${targetWin.toFixed(2)} (${(targetWin/totalBetAmount).toFixed(1)}x total bet)`);
    console.log(`   Current winning symbols: [${analysis.winningSymbols.join(', ')}]`);
}

// Progress tracking for long operations
console.log(`📊 Board ${i + 1}/${config.boardCount} - RTP: ${(currentRTP * 100).toFixed(2)}%`);
```

### Performance Optimizations

- **Reduced log verbosity**: Only meaningful wins logged
- **Timeout boundaries**: Prevent infinite loops
- **Early exits**: Skip unnecessary processing when possible
- **Efficient symbol placement**: Optimized algorithms for board enhancement
- **Memory management**: Proper cleanup of temporary objects

### Error Recovery

The system gracefully handles various error scenarios:

- **Timeout recovery**: Returns best available result
- **Generation failures**: Attempts alternative approaches
- **Invalid configurations**: Provides sensible defaults
- **Resource constraints**: Degrades gracefully under load

## Examples

### Example 1: Low-Value Win Enhancement (Enhanced v2.2+)

**Configuration**: `coinValue: 0.01`, `betLevel: 7`, `betMultiplier: 20`
- `baseBetAmount = 0.01 * 7 = 0.07`
- `totalBetAmount = 0.07 * 20 = 1.40`

**Target**: 2.3x multiplier (3.22 total win)

**Enhanced Process**:
1. **Board Analysis** → Find symbol 3 with count 6 (near-win)
2. **Dynamic Odds Lookup** → Symbol 3: 8-9 (16x), 10-11 (40x), 12+ (160x)
3. **Optimal Selection** → Need 8 symbols for 16x odds (closest to 2.3x target)
4. **Smart Placement** → Add 2 symbol 3s to reach 8 total
5. **Accurate Result** → `0.07 * 16 = 1.12` win, `1.12/1.40 = 0.8x` multiplier

**Smart Logging Output**:
```
🎯 Enhancing board for target win: 3.22 (2.3x total bet)
   Current winning symbols: []
   Near-win symbols: 3(6)
   🔧 Placed 8 symbols of type 3 for 2.3x target
   📊 Enhanced board now has winning symbols: [3]
```

### Example 2: High-Value Win Enhancement (Enhanced v2.2+)

**Configuration**: Same as above

**Target**: 6.9x multiplier (9.66 total win)

**Enhanced Process**:
1. **Board Analysis** → No near-wins found
2. **Comprehensive Search** → `findOptimalSymbolForMultiplier(6.9)` tests all combinations
3. **Optimal Match** → Symbol 4, count 12 (high tier: 200x odds)
4. **Accurate Calculation** → `0.07 * 200 = 14.0` win, `14.0/1.40 = 10.0x` multiplier
5. **Strategic Placement** → Place 12 symbol 4s across the board

**Smart Logging Output**:
```
🎯 Enhancing board for target win: 9.66 (6.9x total bet)
   Current winning symbols: []
   Near-win symbols: 1(6), 2(5)
   🔧 Placed 12 symbols of type 4 for 6.9x target
   📊 Enhanced board now has winning symbols: [4]
```

### Example 3: Timeout Protection in Action (v2.5+)

**Scenario**: Complex 50-board generation with high RTP targets

**Process**:
1. **Board 1-10** → Normal generation (150ms average per board)
2. **Board 15** → Complex target win, multiple attempts needed
3. **Timeout Triggered** → After 30 seconds of attempts
4. **Graceful Fallback** → Returns best board found so far
5. **Logging Output**:
```
⚠️  Board 15 generation timeout after 47 attempts
📊 Board 15/50 - RTP: 96.80% - Using best available result
```

### Example 4: Filename Consistency (v2.6+)

**Before Fix**: `wave-50boards-bet1_40-1758188172981.json` (used totalBetAmount)
**After Fix**: `wave-50boards-bet0_07-1758188451791.json` (uses baseBetAmount)

**Configuration Display**:
```
   Bet Level: 7
   Coin Value: $0.01
   Base Bet Amount: $0.07 (for filename)
   Total Bet Amount: $1.40 (for RTP)
```

**JSON Output Enhancement**:
```json
{
  "metadata": {
    "betData": {
      "betLevel": 7,
      "coinValue": 0.01,
      "betMultiplier": 20,
      "baseBetAmount": 0.07,    // NEW: explicit separation
      "totalBetAmount": 1.40    // NEW: explicit separation
    }
  }
}
```

### Example 5: No-Win Board (Pattern 1)

**Target**: 0.0x multiplier

**Enhanced Process**:
1. **Random Generation** → Standard board generation
2. **Skip Enhancement** → `targetWin = 0`, no modification needed
3. **Settlement Processing** → No winning symbols detected
4. **Pattern Compliance** → Single tumble with `win: 0`, no cascade data
5. **Validation** → Pattern 1 compliance check passed

**Logging Output**:
```
✅ Pattern 1 validation passed: No-win board with 1 tumble
```

## Best Practices

### For Development (Updated v2.6+)

1. **Use configuration constants** from `commonDefinition` instead of magic numbers
2. **Test with multiple bet configurations** to ensure payout accuracy across different scenarios
3. **Monitor RTP performance** across various board counts and bet levels
4. **Validate enhancement results** against target multipliers using dynamic odds
5. **Implement proper error handling** with try-catch blocks and timeout mechanisms
6. **Separate concerns**: Use `baseBetAmount` for payouts, `totalBetAmount` for RTP calculations

### For Debugging (Enhanced v2.5+)

1. **Use smart logging** that filters by significance (2x+ multiplier wins)
2. **Verify symbol counts** before and after enhancement with detailed analysis
3. **Check tumble patterns** for compliance with Pattern 1 (no-win) and Pattern 2 (winning)
4. **Monitor RTP deviation** and timeout occurrences in console output
5. **Validate file naming consistency** using `baseBetAmount` in filenames
6. **Check JSON output** for proper `baseBetAmount` and `totalBetAmount` separation

### For Performance (Optimized v2.5+)

1. **Implement timeout protection** (30s for boards, 5s for enhancement)
2. **Use efficient logging** that reduces noise for small wins
3. **Cache board analysis results** when possible to avoid recalculation
4. **Optimize symbol placement** with realistic distribution algorithms
5. **Monitor memory usage** during large board count generation
6. **Handle errors gracefully** with fallback mechanisms

### For Production Deployment

1. **Test timeout scenarios** with various board counts and complexity levels
2. **Validate RTP accuracy** across extended test runs (1000+ boards)
3. **Monitor performance metrics** including generation time and memory usage
4. **Implement proper logging levels** for production vs development environments
5. **Ensure configuration consistency** across all deployment environments
6. **Test error recovery** mechanisms under various failure conditions

---

## Version History

- **v2.6** (Latest): Filename consistency fixes, baseBetAmount vs totalBetAmount separation
- **v2.5**: Performance optimizations, timeout protection, smart logging
- **v2.4**: Code cleanup, unused import removal, simplified bet calculations  
- **v2.3**: Magic number elimination, configuration-driven constants
- **v2.2**: Accurate payout system, tier-based odds, dynamic symbol calculations
- **v2.1**: Validation system separation, modular chain validation
- **v2.0**: Enhanced board generation and RTP targeting system

*This documentation reflects the current implementation with all recent enhancements and optimizations. Last updated: January 2024.*
