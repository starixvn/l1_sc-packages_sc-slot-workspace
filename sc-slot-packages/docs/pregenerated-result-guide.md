# preGeneratedResult Generation Guide

## Overview

The `preGeneratedResult` array provides pre-calculated cascading slot data to `RoundCalculator.processSpinning()`. This guide explains how to structure this data correctly.

**⚠️ IMPORTANT**: This guide covers the **input format** (`preGeneratedResult`) for RoundCalculator. For the **output format** (`settlementResult.tumbles`) that results from processing, see `PREGENERATEDRESULT_COMPATIBLE_GUIDE.md` which contains the corrected patterns that all generated data must follow.

## Key Rule: N Array Items for N Tumbles

**Critical**: To generate N final tumbles, you need exactly N items in the `preGeneratedResult` array.

```javascript
// For 2 tumbles in final result → Need 2 array items
// For 3 tumbles in final result → Need 3 array items
// etc.
```

## Data Structure Template

```javascript
// Example: 2 tumbles = 2 array items
const preGeneratedResult = [
  // Item 1: Creates first tumble (must have winning combination to cascade)
  {
    newBoard: [
      /* 30 integers for 6x5 board with winning symbols */
    ],
    multipliers: [
      /* multiplier values */
    ],
    icons: {}, // Always empty - calculated by TumbleCalculator
    explodedSymbols: [], // Not used for tumble creation
    newSymbols: [], // Not used for tumble creation
  },

  // Item 2: Provides explodedSymbols to first tumble AND creates second tumble (no wins)
  {
    newBoard: [
      /* board after cascade - becomes second tumble (should have NO wins) */
    ],
    multipliers: [
      /* carried forward */
    ],
    icons: {},
    explodedSymbols: [
      /* what exploded in first tumble (goes TO first tumble) */
    ],
    newSymbols: [
      /* what dropped in first tumble (goes TO first tumble) */
    ],
  },
];

// Key insight: Only WINNING tumbles get explodedSymbols
// The LAST tumble never gets explodedSymbols (that's what stops the cascade)
```

## Data Format Requirements

### Board Format

- **newBoard**: Array of 30 integers (6 reels × 5 symbols)
- **Values**: 0-8 (normal symbols), 9 (free spin), 10 (multiplier)

### Multiplier Format

- **multipliers**: Array of multiplier values that accumulate across tumbles
- **Values**: 2-25 (generated from Symbol 10s)
- **Accumulation Pattern**: `[6, 6] → [6, 6, 2] → [6, 6, 2]` (preserves existing, appends new)
- **Final Calculation**: Sum of all accumulated values used for win multiplication

### explodedSymbols Format

- **Length**: 30 elements (same as board)
- **Values**:
  - `-1` = symbol NOT exploded
  - `original_symbol_value` = symbol WAS exploded
- **Empty array `[]`** = no symbols exploded (stops cascade)

### newSymbols Format

- **Length**: 30 elements (same as board)
- **Values**:
  - `-1` = no new symbol at this position
  - `new_symbol_value` = symbol that dropped in
- **Empty array `[]`** = no new symbols (stops cascade)

## Multiplier Accumulation System

### How Multiplier Accumulation Works

The system now properly accumulates multiplier values across tumbles following these rules:

1. **Symbol 10 Detection**: Each tumble detects Symbol 10s on the current board
2. **Value Generation**: Each Symbol 10 generates a random multiplier value (2-25 range)
3. **Accumulation**: New values are appended to existing multiplier array
4. **Persistence**: Previous multiplier values are always preserved
5. **Final Calculation**: Sum of all accumulated values multiplies the final win

### Accumulation Examples

#### Example 1: Single Symbol 10 Accumulation
```javascript
// Initial state
multipliers: [8, 14]

// Tumble 1: Board has 1 Symbol 10 → generates [12]
// Before: [8, 14]
// After:  [8, 14, 12] (Sum: 34)

// Final win calculation: baseWin × 34
```

#### Example 2: Multi-Tumble Accumulation
```javascript
// Initial state
multipliers: [5, 15]

// Tumble 1: Board has 1 Symbol 10 → generates [18]
// Before: [5, 15]
// After:  [5, 15, 18] (Sum: 38)

// Tumble 2: Board has 1 Symbol 10 → generates [21]
// Before: [5, 15, 18]
// After:  [5, 15, 18, 21] (Sum: 59)

// Final win calculation: baseWin × 59
```

#### Example 3: Multiple Symbol 10s in Single Tumble
```javascript
// Initial state
multipliers: [11, 5, 12, 3]

// Tumble 1: Board has 2 Symbol 10s → generates [18, 20]
// Before: [11, 5, 12, 3]
// After:  [11, 5, 12, 3, 18, 20] (Sum: 69)

// Final win calculation: baseWin × 69
```

### PreGeneratedResult Structure with Multipliers

When creating preGeneratedResult data, ensure multiplier arrays follow the accumulation pattern:

```javascript
const preGeneratedResult = [
  // Item 1: Initial board with Symbol 10s
  {
    newBoard: [10, 2, 3, 4, 5, 6, 7, 8, 0, 1, 2, 3, 4, 5, 6, 7, 8, 0, 1, 2, 3, 4, 5, 6, 7, 8, 0, 1, 2, 3],
    multipliers: [8, 14], // Initial multipliers
    icons: {},
    explodedSymbols: [],
    newSymbols: [],
  },
  
  // Item 2: After processing Symbol 10 → multipliers accumulated
  {
    newBoard: [4, 2, 3, 4, 5, 6, 7, 8, 0, 1, 2, 3, 4, 5, 6, 7, 8, 0, 1, 2, 3, 4, 5, 6, 7, 8, 0, 1, 2, 3],
    multipliers: [8, 14, 12], // Accumulated: original + new Symbol 10 value
    icons: {},
    explodedSymbols: [/* cascade data */],
    newSymbols: [/* replacement data */],
  },
];
```

## Quick Examples

### Single Tumble (No Cascade)

```javascript
const preGeneratedResult = [
  {
    newBoard: [1, 2, 3, 4, 5, 6, 7, 8, 0, 1, 2, 3, 4, 5, 6, 7, 8, 0, 1, 2, 3, 4, 5, 6, 7, 8, 0, 1, 2, 3],
    multipliers: [1],
    icons: {},
    explodedSymbols: [],
    newSymbols: [],
  },
  // Only 1 item needed for 1 tumble
  // settleTumble will return false (no wins), so no cascade occurs
];
```

### Two Tumbles (One Cascade)

```javascript
const preGeneratedResult = [
  // Item 1: Creates first tumble with winning 8's
  {
    newBoard: [8, 8, 8, 1, 2, 3, 4, 5, 6, 7, 0, 1, 2, 3, 4, 5, 6, 7, 8, 0, 1, 2, 3, 4, 5, 6, 7, 8, 0, 1],
    multipliers: [1],
    icons: {},
    explodedSymbols: [], // Not used for tumble creation
    newSymbols: [], // Not used for tumble creation
  },

  // Item 2: Provides explodedSymbols to first tumble AND creates second tumble (no wins)
  {
    newBoard: [4, 5, 6, 1, 2, 3, 4, 5, 6, 7, 0, 1, 2, 3, 4, 5, 6, 7, 8, 0, 1, 2, 3, 4, 5, 6, 7, 8, 0, 1],
    multipliers: [1],
    icons: {},
    explodedSymbols: [8, 8, 8, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
    newSymbols: [4, 5, 6, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  },
];

// Result:
// - First tumble gets explodedSymbols (it was a winner)
// - Second tumble gets NO explodedSymbols (cascade stops because it has no wins)
```

### Three Tumbles (Two Cascades)

```javascript
const preGeneratedResult = [
  // Item 1: Creates first tumble with winning 8's
  {
    newBoard: [8, 8, 8, 1, 2, 3, 4, 5, 6, 7, 0, 1, 2, 3, 4, 5, 6, 7, 8, 0, 1, 2, 3, 4, 5, 6, 7, 8, 0, 1],
    multipliers: [1],
    icons: {},
    explodedSymbols: [],
    newSymbols: [],
  },

  // Item 2: Provides explodedSymbols to first tumble AND creates second tumble (also has wins!)
  {
    newBoard: [7, 7, 7, 1, 2, 3, 4, 5, 6, 7, 0, 1, 2, 3, 4, 5, 6, 7, 8, 0, 1, 2, 3, 4, 5, 6, 7, 8, 0, 1],
    multipliers: [1],
    icons: {},
    explodedSymbols: [8, 8, 8, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
    newSymbols: [7, 7, 7, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  },

  // Item 3: Provides explodedSymbols to second tumble AND creates third tumble (no wins)
  {
    newBoard: [1, 2, 3, 1, 2, 3, 4, 5, 6, 7, 0, 1, 2, 3, 4, 5, 6, 7, 8, 0, 1, 2, 3, 4, 5, 6, 7, 8, 0, 1],
    multipliers: [1],
    icons: {},
    explodedSymbols: [7, 7, 7, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
    newSymbols: [1, 2, 3, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  },
];

// Result:
// - First tumble gets explodedSymbols from Item 2 (it was a winner)
// - Second tumble gets explodedSymbols from Item 3 (it was a winner)
// - Third tumble gets NO explodedSymbols (cascade stops because it has no wins)
```

## Validation Checklist

### Basic Structure
- [ ] Array length = expected_tumbles (exactly N items for N tumbles)
- [ ] All newBoard arrays have exactly 30 integers
- [ ] explodedSymbols/newSymbols have 30 elements OR are empty arrays
- [ ] First item has empty explodedSymbols/newSymbols (not used for tumble creation)
- [ ] Items 2 to N should have explodedSymbols data (goes to previous winning tumbles)
- [ ] Last item should create a non-winning tumble (to stop cascade)
- [ ] Board symbols are valid (0-10 range)
- [ ] multipliers array is not empty (at least [1])

### Multiplier Accumulation Validation
- [ ] Multiplier arrays follow accumulation pattern: preserve existing + append new
- [ ] Symbol 10s on board correspond to new multiplier values generated
- [ ] Multiplier values are in valid range (2-25 for generated values)
- [ ] No multiplier values are lost between tumbles
- [ ] Final multiplier sum correctly calculated from all accumulated values
- [ ] Board enhancement uses projected multipliers for target win adjustment

### BoardGenerator Integration Validation
- [ ] BoardGenerator.generate() multipliers used directly without modification
- [ ] BoardGenerator.explodeAndRefill() receives correct oldMultipliers parameter
- [ ] tumbleResult.multipliers used directly without regeneration or override
- [ ] No manual Symbol 10 counting or multiplier value generation
- [ ] No synchronization attempts that override BoardGenerator logic
- [ ] Data flow respected: oldMultipliers → explodeAndRefill → newMultipliers
- [ ] currentMultipliers updated with BoardGenerator output for next tumble

### Free Spin Validation
- [ ] `isFreeSpin` boolean correctly indicates game mode
- [ ] Free spin properties present when `isFreeSpin: true`:
  - [ ] `accumulatedMultiplier` (number)
  - [ ] `remainingFreeSpins` (number)
  - [ ] `freeSpinsPlayed` (number)
  - [ ] `freeSpinWins` (number)
- [ ] Free spin awards follow correct rules:
  - [ ] Base game (`isFreeSpin: false`): Use `initialOdds` (4→3, 5→6, 6+→18)
  - [ ] Retrigger (`isFreeSpin: true`): Use `additionalOdds` (4+→5 always)
- [ ] Scatter symbol count matches awarded free spins according to rules

## Key Insights Summary

🎯 **The Golden Rules:**

1. **N Items = N Tumbles**: For N final tumbles, you need exactly N items in preGeneratedResult
2. **Only Winners Get explodedSymbols**: Only tumbles with winning combinations get explodedSymbols assigned
3. **Last Tumble Never Wins**: The final tumble must have no wins to stop the cascade
4. **explodedSymbols Flow**: Item N+1 provides explodedSymbols to tumble N (if tumble N won)
5. **Trust BoardGenerator Multipliers**: Always use BoardGenerator's multiplier output directly - never override or regenerate
6. **Pass oldMultipliers Correctly**: BoardGenerator.explodeAndRefill() requires oldMultipliers for proper arrangement
7. **No Manual Synchronization**: BoardGenerator handles multiplier logic internally based on board state
8. **Respect Data Flow**: oldMultipliers → explodeAndRefill → newMultipliers → next tumble

🔄 **The Pattern:**

```
Item 1 → Creates Tumble 1 (winner)
Item 2 → explodedSymbols to Tumble 1 + Creates Tumble 2 (winner)
Item 3 → explodedSymbols to Tumble 2 + Creates Tumble 3 (no wins)
Result: 3 tumbles, only first 2 have explodedSymbols
```

This structure ensures smooth integration with `RoundCalculator.processSpinning()` and proper cascade behavior.

## BoardGenerator Integration Guidelines

### Critical Multiplier Handling Rules

The external `sc-slot-board-generator` package handles multiplier generation and arrangement internally. **Never override or regenerate its multipliers**.

#### ✅ Correct Approach
```typescript
// 1. Trust BoardGenerator's initial multipliers
const initialBoard = boardGenerator.generate();
// Use initialBoard.multipliers directly - they're generated based on the board

// 2. Pass oldMultipliers to explodeAndRefill
const tumbleResult = boardGenerator.explodeAndRefill(
    currentBoard, 
    winSymbols, 
    currentMultipliers  // ← Essential for proper arrangement
);

// 3. Use BoardGenerator's output directly
accumulatedMultiplierValues = [...tumbleResult.multipliers];
currentMultipliers = [...tumbleResult.multipliers];
```

#### ❌ Wrong Approach
```typescript
// DON'T: Override BoardGenerator's multipliers
if (symbol10Count !== initialBoard.multipliers.length) {
    initialBoard.multipliers = generateOwnMultipliers(symbol10Count); // ❌ WRONG
}

// DON'T: Ignore BoardGenerator's output
const tumbleResult = boardGenerator.explodeAndRefill(/*...*/);
// Ignore tumbleResult.multipliers and generate own ❌ WRONG
const newValues = generateOwnMultipliers(newSymbol10Count);
```

### Why BoardGenerator Knows Best

1. **Board State Awareness**: BoardGenerator sees the complete board state and symbol positions
2. **Internal Logic**: Has sophisticated multiplier arrangement algorithms based on cascades
3. **Symbol Tracking**: Properly tracks which Symbol 10s are new vs existing
4. **Arrangement Rules**: Handles multiplier positioning and accumulation internally
5. **Data Consistency**: Ensures multipliers always correspond to actual board state

### Common Mistakes to Avoid

❌ **Synchronization Attempts**: Don't try to "fix" BoardGenerator's multipliers
❌ **Double Generation**: Don't generate values for symbols BoardGenerator already handled  
❌ **Manual Counting**: Don't count Symbol 10s and generate corresponding values
❌ **Array Overrides**: Don't replace BoardGenerator's multiplier arrays
❌ **Logic Duplication**: Don't reimplement BoardGenerator's internal logic

### Integration Validation

✅ **Trust Test**: Use BoardGenerator output without modification
✅ **Flow Test**: Verify oldMultipliers → explodeAndRefill → newMultipliers works
✅ **Consistency Test**: Ensure multipliers match actual board state automatically
✅ **Data Test**: Confirm no manual intervention breaks the data flow

## Board Enhancement Integration

The system now includes intelligent board enhancement that works with multiplier accumulation:

### Enhancement Strategy Selection

The system automatically selects the optimal enhancement strategy based on target multipliers:

```typescript
// Strategy selection logic
if (canReachTarget) {
    return 'single-symbol';           // Direct achievement
}
if (targetMultiplier > 10.0) {
    return 'multiplier-generation';   // High targets → Place Symbol 10s
}
if (goodAlternatives.length >= 1 && targetMultiplier > 2.0) {
    return 'multi-symbol';           // Complex combinations
}
return 'multiplier-boost';           // Use existing multipliers
```

### Multiplier-Generation Strategy

For extreme high targets (>10x), the system automatically:

1. **Calculates Needed Multipliers**: `neededSum = targetMultiplier × 20`
2. **Places Symbol 10s**: Adds Symbol 10s to empty board positions
3. **Generates Values**: Creates random multiplier values (2-25 range)
4. **Accumulates**: Appends new values to existing multiplier array
5. **Validates**: Ensures target multiplier sum is achieved

### Target Win Adjustment

When boards have existing multipliers, target wins are automatically adjusted:

```typescript
// Example: Target 50x with existing 20x multipliers
const adjustedTarget = 50 / 20 = 2.5x  // Adjusted for raw tumble wins
// System places symbols to achieve 2.5x raw win
// Final result: 2.5x × 20x = 50x total
```

This ensures accurate target achievement while respecting multiplier accumulation rules.

## Output Format Compliance

The `preGeneratedResult` input is processed by RoundCalculator to produce `settlementResult.tumbles` output. The output **must** follow these validated patterns:

### Pattern 1: No-Win Boards
```javascript
"settlementResult": {
  "tumbles": [
    {
      "icons": {},  // Empty - no wins
      "originalBoard": "comma,separated,board,state",
      "newBoard": "comma,separated,board,state", // Same as original
      "multipliers": [],
      "win": 0
      // NO explodedSymbols or newSymbols properties
    }
  ]
}
```

### Pattern 2: Winning Boards with Cascades  
```javascript
"settlementResult": {
  "tumbles": [
    // Winning tumbles (1 or more)
    {
      "icons": {"0": {"count": 9, "odds": 5, "win": 0.25}}, // Has win data
      "originalBoard": "initial,board,state",
      "newBoard": "modified,after,cascade", // Different from original
      "explodedSymbols": [-1, -1, 0, 0, -1, ...], // Cascade data
      "newSymbols": [-1, -1, 5, 6, -1, ...],      // Cascade data
      "multipliers": [18],
      "win": 5
    },
    // Final tumble (always last)
    {
      "icons": {}, // Empty - no more wins
      "originalBoard": "final,board,state",
      "newBoard": "final,board,state", // Same (no changes)
      "multipliers": [18],
      "win": 0
      // NO explodedSymbols or newSymbols properties
    }
  ]
}
```

### Validation System

All generated settlement data undergoes comprehensive validation:
- ✅ **Pattern 1**: No-win boards have exactly 1 tumble with no cascade properties
- ✅ **Pattern 2**: Winning boards have winning tumbles first, clean final tumble last  
- ✅ **Property Validation**: Correct presence/absence of explodedSymbols and newSymbols
- ✅ **Board State Consistency**: Proper originalBoard → newBoard transitions
- ✅ **Win Calculations**: Positive wins for winning tumbles, zero for final tumbles

## Free Spin Round Format

Free spin rounds require additional properties in the board data structure:

```javascript
{
  "board": [/* 30 integers */],
  "multipliers": [/* multiplier values */],
  "isFreeSpin": true,  // Indicates this is a free spin round
  "accumulatedMultiplier": 35,  // Total accumulated multiplier
  "remainingFreeSpins": 0,  // Free spins left after this round
  "freeSpinsPlayed": 2,  // Number of free spins played so far
  "freeSpinWins": 1,  // Number of winning free spin rounds
  "settlementResult": {
    "tumbles": [/* tumble data */],
    "freeSpins": {
      "count": 4,  // Number of scatter symbols found
      "odds": 5    // Free spins awarded (based on rules below)
    }
  }
}
```

## Free Spin Award Rules

**⚠️ CRITICAL**: Free spin awards depend on game mode (base game vs free spin mode):

### Base Game Awards (initialOdds)
When `isFreeSpin: false`, use `initialOdds` from generator definition:
- **4 scatter symbols** → **3 free spins**
- **5 scatter symbols** → **6 free spins** 
- **6+ scatter symbols** → **18 free spins**

### Free Spin Retrigger Awards (additionalOdds)
When `isFreeSpin: true`, use `additionalOdds` from generator definition:
- **4+ scatter symbols** → **5 additional free spins** (regardless of count)

### Example Validation
```javascript
// ❌ INCORRECT: Using initialOdds during retrigger
{
  "isFreeSpin": true,  // Already in free spin mode
  "freeSpins": {
    "count": 6,
    "odds": 18  // Wrong! Should be 5 for retrigger
  }
}

// ✅ CORRECT: Using additionalOdds during retrigger
{
  "isFreeSpin": true,  // Already in free spin mode
  "freeSpins": {
    "count": 6,
    "odds": 5   // Correct! Always 5 for any retrigger (4+ scatters)
  }
}
```

## Testing Utilities

For testing and debugging `preGeneratedResult` data, use the utilities in `src/board/pregeneratedresult-utils.js`:

These utilities allow you to:

- ✅ Test data structure without consuming original arrays
- ✅ Simulate `processSpinning()` consumption behavior
- ✅ Debug cascade logic and expected tumble counts
- ✅ Validate board properties before processing
- ✅ Create safe working copies for actual processing tests
