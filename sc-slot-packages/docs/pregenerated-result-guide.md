# preGeneratedResult Generation Guide

## Overview

The `preGeneratedResult` array provides pre-calculated cascading slot data to `RoundCalculator.processSpinning()`. This guide explains how to structure this data correctly.

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

- [ ] Array length = expected_tumbles (exactly N items for N tumbles)
- [ ] All newBoard arrays have exactly 30 integers
- [ ] explodedSymbols/newSymbols have 30 elements OR are empty arrays
- [ ] First item has empty explodedSymbols/newSymbols (not used for tumble creation)
- [ ] Items 2 to N should have explodedSymbols data (goes to previous winning tumbles)
- [ ] Last item should create a non-winning tumble (to stop cascade)
- [ ] Board symbols are valid (0-10 range)
- [ ] multipliers array is not empty (at least [1])

## Key Insights Summary

🎯 **The Golden Rules:**

1. **N Items = N Tumbles**: For N final tumbles, you need exactly N items in preGeneratedResult
2. **Only Winners Get explodedSymbols**: Only tumbles with winning combinations get explodedSymbols assigned
3. **Last Tumble Never Wins**: The final tumble must have no wins to stop the cascade
4. **explodedSymbols Flow**: Item N+1 provides explodedSymbols to tumble N (if tumble N won)

🔄 **The Pattern:**

```
Item 1 → Creates Tumble 1 (winner)
Item 2 → explodedSymbols to Tumble 1 + Creates Tumble 2 (winner)
Item 3 → explodedSymbols to Tumble 2 + Creates Tumble 3 (no wins)
Result: 3 tumbles, only first 2 have explodedSymbols
```

This structure ensures smooth integration with `RoundCalculator.processSpinning()` and proper cascade behavior.

## Testing Utilities

For testing and debugging `preGeneratedResult` data, use the utilities in `src/board/pregeneratedresult-utils.js`:

These utilities allow you to:

- ✅ Test data structure without consuming original arrays
- ✅ Simulate `processSpinning()` consumption behavior
- ✅ Debug cascade logic and expected tumble counts
- ✅ Validate board properties before processing
- ✅ Create safe working copies for actual processing tests
