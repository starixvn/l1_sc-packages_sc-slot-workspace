# Tumble Win Calculation Process

## Overview

This document outlines the tumble win calculation process in the sc-slot-board-statistic system. The actual calculation logic is handled by external dependencies, while this system consumes and analyzes the results.

**✅ Updated**: This document reflects the **corrected settlement result format** that follows Pattern 1 and Pattern 2 as validated in the current system (September 2025).

## Architecture

### External Dependencies

The tumble win calculations are performed by external packages:

- **`sc-cascading-slot-base/src/board/round-calculator`** - Main calculation engine
- **`sc-cascading-slot-base/src/board/tumble-calculator`** - Tumble-specific calculations

### Internal Components

The statistic system consists of:

- **`statistic-runner.ts`** - Orchestrates the calculation process
- **`statistic-calculator.ts`** - Analyzes and aggregates results
- **`generator-definition.ts`** - Provides game configuration

## Data Flow

### 1. Round Initialization

Each round starts with basic round data:

```typescript
const round: Round = {
  id: i,
  coinValue: options.coinValue,
  betLevel: options.betLevel,
  betMultiplier: 20, // Fixed multiplier
  totalAmount: options.coinValue * options.betLevel * betMultiplier,
  odds: predefinedOdds
};
```

### 2. Processing Pipeline

```
Round Input → RoundCalculator.processSpinning() → Populated Round → Statistics
```

The `processSpinning()` method from the external RoundCalculator populates the round object with calculation results.

### 3. Calculator Setup

```typescript
const calculator = new RoundCalculator({
  boardGenerator: generator,
  tumbleCalculator: new TumbleCalculator(),
});
```

## Settlement Result Structure

After processing, the round object contains a `settlementResult` that follows **two validated patterns**:

### Pattern 1: No-Win Boards

For boards with no winning combinations:

```typescript
settlementResult: {
  tumbles: [
    {
      icons: {};                    // Empty - no wins
      originalBoard: string;        // CSV board state  
      newBoard: string;             // Same as originalBoard
      multipliers: number[];        
      win: 0;                       // No win amount
      // NO explodedSymbols or newSymbols properties
    }
  ];
  freeSpins: { count: number; odds: number };
  additionalFreeSpins: { count: number; odds: number };
}
```

### Pattern 2: Winning Boards with Cascades

For boards with winning combinations and cascades:

```typescript
settlementResult: {
  tumbles: [
    // One or more winning tumbles
    {
      icons: Record<string, { count: number; odds: number; win: number }>; // Win data
      originalBoard: string;        // CSV board state before cascade
      newBoard: string;             // CSV board state after cascade  
      explodedSymbols?: number[];   // Array showing exploded positions
      newSymbols?: number[];        // Array showing replacement symbols
      multipliers: number[];
      win: number;                  // Positive win amount
    },
    // ... more winning tumbles if cascades continue ...
    
    // Final tumble (always last)
    {
      icons: {};                    // Empty - no more wins
      originalBoard: string;        // Final board state
      newBoard: string;             // Same as originalBoard  
      multipliers: number[];
      win: 0;                       // No additional wins
      // NO explodedSymbols or newSymbols properties
    }
  ];
  freeSpins: { count: number; odds: number };
  additionalFreeSpins: { count: number; odds: number };
}
```

### Critical Pattern Rules

1. **No-Win Boards**: Exactly 1 tumble with empty icons and identical board states
2. **Winning Boards**: Multiple tumbles where only winning tumbles have exploded/new symbols data
3. **Final Tumbles**: Always have empty icons and no exploded/new symbols properties
4. **Board State Flow**: `originalBoard` of tumble N+1 matches `newBoard` of tumble N
5. **Win Distribution**: Only winning tumbles have `win > 0`, final tumbles always have `win = 0`

### Tumbles Array Properties

Each tumble contains:

- **`icons`** - Symbol combinations that created wins (empty for non-winning tumbles)
  - Key: Symbol identifier (string)  
  - Value: `{ count: number; odds: number; win: number }` - Symbol count, payout odds, and win amount
- **`win`** - Individual payout amount for this specific tumble
- **`originalBoard`** - Board state before this tumble (comma-separated string)
- **`newBoard`** - Board state after cascade processing (comma-separated string)
- **`explodedSymbols`** - *(Winning tumbles only)* Array of 30 integers showing exploded positions (-1 = not exploded, symbol value = exploded)
- **`newSymbols`** - *(Winning tumbles only)* Array of 30 integers showing replacement symbols (-1 = no change, symbol value = new symbol)
- **`multipliers`** - Array of multiplier values applied during this tumble

### Free Spins Data

- **`freeSpins`** - Initial free spins triggered
  - `count`: Number of scatter symbols
  - `odds`: Number of free spins awarded
- **`additionalFreeSpins`** - Extra free spins won during free spin rounds
  - `count`: Number of scatter symbols in free spin
  - `odds`: Additional free spins awarded

## Round Result Properties

After processing, additional properties are populated in the round:

### Financial Results

- **`betwin`** - Total payout for the entire round
- **`totalTumbleWin`** - Sum of all individual tumble wins
- **`multiplier`** - Final multiplier value for the round

### Round Classification

- **`freeSpin`** - Boolean indicating if this is a free spin round
- **`freeSpinId`** - Index of free spin (for free spin rounds)

## Calculation Process (Inferred from Usage)

### 1. Initial Spin Processing

1. Generate initial board using BoardGenerator
2. Identify winning symbol combinations
3. Calculate initial payouts using odds tables
4. Remove winning symbols from board

### 2. Cascading Tumbles

1. Cascade remaining symbols downward
2. Fill empty positions with new symbols
3. Check for new winning combinations
4. Calculate additional payouts
5. Repeat until no more wins occur

### 3. Result Accumulation

1. Sum all individual tumble wins → `totalTumbleWin`
2. Apply multipliers and bonuses → `betwin`
3. Check for free spin triggers
4. Store detailed settlement data

## Statistics Integration

### Data Extraction

The statistics system extracts key metrics from the settlement result:

```typescript
// Total tumbles in round
statistic.round.maximumTumbles = max(statistic.round.maximumTumbles, round.settlementResult.tumbles.length);

// Multiplier count from last tumble
statistic.totalMultipliers += compose(length, prop("multipliers"), last)(round.settlementResult.tumbles);

// Free spins awarded
statistic.totalFreeSpins += round.settlementResult.freeSpins.odds;
```

### Symbol Analysis

The system analyzes symbol occurrences by parsing board states:

```typescript
const counts = map(compose(countBy(parseInt), split(","), prop("originalBoard")))(
  round.settlementResult.tumbles
);
```

This extracts symbol frequency data from each tumble's original board state.

## Configuration

### Board Settings

```typescript
boardSettings: {
  reels: 6,
  symbolsOnReel: 5,
  numberOfSymbols: 11,
  numberOfShuffles: 3,
}
```

### Multiplier Settings

```typescript
multiplier: {
  symbol: 10,    // Multiplier symbol ID
  min: 2,        // Minimum multiplier value
  max: 21,       // Maximum multiplier value
}
```

### Payout Tables

The system uses predefined payout tables for symbols 0-8:

- Symbols require 8+ matches for wins
- Higher-numbered symbols have higher payouts
- Symbol 9 is the free spin scatter
- Symbol 10 is the multiplier symbol

## Free Spin Mechanics

### Free Spin Triggering

Free spins are triggered by scatter symbols (symbol 9):

```typescript
freeSpins: {
  symbol: 9,
  initialOdds: [
    { count: 4, odds: 3 },   // 4 scatters = 3 free spins
    { count: 5, odds: 6 },   // 5 scatters = 6 free spins
    { count: 6, odds: 18 },  // 6 scatters = 18 free spins
  ],
  additionalOdds: [{ count: 4, odds: 5 }], // During free spins
}
```

### Free Spin Processing

1. Execute base round normally
2. Check for free spin triggers in `settlementResult.freeSpins.odds`
3. Execute free spin rounds with accumulated multipliers
4. Multipliers persist and accumulate across free spins
5. Additional free spins can be won during free spin rounds

### Multiplier Accumulation

During free spins:

```typescript
if (freeSpinRound.betwin) {
  multiplier += freeSpinRound.multiplier;
}
```

Multipliers accumulate across all free spin rounds and apply to subsequent spins.

## Settlement Result Validation

The system includes comprehensive validation to ensure all settlement data follows the correct patterns:

### Validation Process

All settlement results undergo automatic validation during generation:

```typescript
// Pattern 1 validation for no-win boards
if (totalWin === 0) {
  validateSingleTumble(tumbles);
  validateEmptyIcons(tumbles[0]);
  validateNoCascadeProperties(tumbles[0]);
  validateIdenticalBoards(tumbles[0]);
}

// Pattern 2 validation for winning boards  
if (totalWin > 0) {
  validateMultipleTumbles(tumbles);
  validateWinningTumbles(tumbles.slice(0, -1));
  validateFinalTumble(tumbles[tumbles.length - 1]);
  validateBoardStateFlow(tumbles);
}
```

### Validation Rules

#### Pattern 1 Validation:
- ✅ Exactly 1 tumble in array
- ✅ Empty icons object `{}`  
- ✅ Win amount equals 0
- ✅ No explodedSymbols or newSymbols properties
- ✅ originalBoard identical to newBoard

#### Pattern 2 Validation:
- ✅ At least 2 tumbles in array
- ✅ Winning tumbles have non-empty icons and positive wins
- ✅ Winning tumbles have explodedSymbols and newSymbols arrays
- ✅ Final tumble has empty icons and zero win
- ✅ Final tumble has no explodedSymbols or newSymbols properties
- ✅ Board state continuity across tumbles

### Error Detection

The validation system catches common issues:

- **❌ Extra Initial Tumbles**: Prevents incorrect "initial state" tumbles
- **❌ Wrong Tumble Ordering**: Ensures winning tumbles come first
- **❌ Incorrect Final Tumble**: Validates clean final tumble format  
- **❌ Missing Cascade Data**: Detects missing exploded/new symbols in winning tumbles
- **❌ Board State Inconsistency**: Validates proper board transitions

### Validation Success Indicators

Console output shows validation results:

```
✅ Pattern 1 validation passed: No-win board with 1 tumble
✅ Pattern 2 validation passed: 3 tumbles, total win: 26
```

## Important Notes

1. **External Implementation**: The core calculation logic resides in external packages not present in this codebase
2. **Data Consumer**: This system primarily consumes and analyzes calculation results
3. **Validated Output**: All settlement results are validated against Pattern 1/Pattern 2 specifications
4. **Result Processing**: Focus is on statistical analysis and reporting of validated settlement results
5. **Interface Contracts**: The system enforces strict adherence to corrected settlementResult format
6. **Production Ready**: Comprehensive validation ensures data integrity for ChainManager integration

## Usage in Statistics

The settlement result data is used for:

- RTP calculation (`betwin` / `totalAmount`)
- Win frequency analysis
- Symbol occurrence tracking
- Multiplier distribution analysis
- Free spin frequency and effectiveness
- Maximum value tracking (biggest wins, most tumbles, etc.)
- Variance and deviation calculations
