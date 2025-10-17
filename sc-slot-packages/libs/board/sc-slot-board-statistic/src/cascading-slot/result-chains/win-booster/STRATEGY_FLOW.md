# Board Enhancement Strategy Flow

## Overview
This document explains the refactored board enhancement flow where **engagement mechanics are integrated as strategies** rather than preprocessing steps.

---

## Refactored Flow

```
┌─────────────────────────────────────────────────────────────┐
│  1. Analyze Board                                           │
│     • Count symbols                                         │
│     • Identify winning/near-win symbols                     │
│     • Calculate board density & cascade potential           │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│  2. Determine if Boost is Needed                            │
│     • Check board density (< 0.3 → cascade boost)           │
│     • Check target vs premium symbols (high → premium)      │
│     • Check scatter count (2-3 → scatter boost)             │
│     • Returns: { needsBoost, boostType, reason }            │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│  3. Prioritize Symbols                                      │
│     • Analyze near-win symbols (4-7 count)                  │
│     • Calculate payout tiers                                │
│     • Recommend base strategy (single/multi-symbol)         │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│  4. Select Strategy (based on engagement mechanics)         │
│     Priority 1: Engagement Mechanics + Boost Need           │
│       • scatterBoost + boostType='scatter' → scatter-boost  │
│       • premiumBoost + boostType='premium' → premium-boost  │
│       • cascadeTarget + boostType='cascade' → cascade-setup │
│     Priority 2: Symbol Priority Recommendation              │
│       • single-symbol | multi-symbol | multiplier-boost     │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│  5. Execute Strategy                                        │
│     Strategy uses engagement mechanics for symbol placement │
└─────────────────────────────────────────────────────────────┘
```

---

## Key Changes from Old Design

### **Before (Preprocessing Approach)**
```typescript
// ❌ Problem: Engagement mechanics applied blindly
if (engagementMechanics.scatterBoost) {
    board = enhanceScatters(board); // Always runs
}
if (engagementMechanics.premiumBoost) {
    board = boostPremiumSymbols(board); // Always runs
}
if (engagementMechanics.cascadeTarget) {
    board = setupMultiCascade(board); // Always runs
}

// Then analyze and choose strategy
analyzeBoard(board);
chooseStrategy(); // Doesn't know about engagement
```

**Problems:**
- All engagement mechanics fire regardless of need
- Strategies don't know board was modified
- Potential duplication/conflicts
- Early exit if engagement creates win (wastes strategy logic)

---

### **After (Strategy-Integrated Approach)**
```typescript
// ✅ Solution: Engagement mechanics as intelligent strategies
analyzeBoard(board);
boostNeeded = determineBoostNeed(board, target);
strategy = selectStrategy(boostNeeded, engagementMechanics);

// Execute only the chosen strategy
switch (strategy) {
    case 'scatter-boost': applyScatterBoostStrategy();
    case 'premium-boost': applyPremiumBoostStrategy();
    case 'cascade-setup': applyCascadeSetupStrategy();
    case 'single-symbol': applySingleSymbolStrategy();
    case 'multi-symbol': applyMultiSymbolStrategy();
}
```

**Benefits:**
- Only one strategy runs (no duplication)
- Strategy selection is intelligent (based on analysis)
- Engagement mechanics are strategies, not preprocessing
- Coordinated approach (strategy knows what it's doing)

---

## Strategy Descriptions

### **Engagement-Based Strategies**

#### 1. **Scatter-Boost Strategy**
- **When**: `boostType === 'scatter'` AND `engagementMechanics.scatterBoost` defined
- **Trigger**: Board has 2-3 scatters (near free spin trigger)
- **Action**: Replaces low-value symbols (0-3) with scatter (symbol 9)
- **Goal**: Increase free spin trigger chance (Discovery pattern)
- **Target**: 4+ scatters for free spin bonus

#### 2. **Premium-Boost Strategy**
- **When**: `boostType === 'premium'` AND `engagementMechanics.premiumSymbolBoost` defined
- **Trigger**: High target multiplier (>50x) with low premium symbols (<5)
- **Action**: Upgrades 15% of board (min 3) from low symbols (0-4) to premium (5-8)
- **Goal**: High-value wins (Cliffhanger pattern)
- **Adapts to board state**:
  - Has multipliers (≥10): Boost medium symbols (5, 6)
  - Low multipliers (<10): Boost upper-medium (6, 7)
  - No multipliers + extreme boost: Ultra-premium (7, 8 heavy on 8)
  - No multipliers + standard: Premium mix (7, 8 balanced)

#### 3. **Cascade-Setup Strategy**
- **When**: `boostType === 'cascade'` AND `engagementMechanics.cascadeTarget` defined
- **Trigger**: Very sparse board (density < 0.3)
- **Action**: Places multiple symbol types (3 types, 8-10 each) across board
- **Goal**: Create multi-tumble cascades (3-4+ tumbles)
- **Symbol selection** based on target:
  - Big win (>100x base): Symbols 7, 6, 5
  - Medium win (>50x base): Symbols 6, 5, 4
  - Standard: Symbols 5, 4, 3

---

### **Standard Strategies** (Fallback)

#### 4. **Single-Symbol Strategy**
- **When**: Symbol priority recommends single-symbol approach
- **Action**: Places one symbol type to reach 8+ count
- **Goal**: Achieve target multiplier with focused placement
- **Uses**: Optimal position selection, preserves multipliers

#### 5. **Multi-Symbol Strategy**
- **When**: Symbol priority recommends multi-symbol approach
- **Action**: Combines multiple symbol types to reach target
- **Goal**: Distributed wins across multiple symbols
- **Fallback**: Falls back to single-symbol if not feasible

---

## Boost Need Determination Logic

The `determineBoostNeed()` method analyzes board state and returns boost requirements:

| Condition | Boost Type | Reason |
|-----------|-----------|---------|
| Board density < 0.3 | `cascade` | Board too sparse, needs multi-cascade |
| Target >50x AND premium symbols <5 | `premium` | Need high-value symbols for big win |
| Scatter count 2-3 | `scatter` | Near free spin trigger |
| Otherwise | `none` | Standard strategies sufficient |

---

## Strategy Selection Priority

```typescript
function selectStrategy(boostNeeded, engagementMechanics) {
    // Priority 1: Engagement mechanics (if defined and boost needed)
    if (engagementMechanics) {
        if (scatterBoost && boostNeeded.boostType === 'scatter')
            return 'scatter-boost';
        
        if (premiumBoost && boostNeeded.boostType === 'premium')
            return 'premium-boost';
        
        if (cascadeTarget && boostNeeded.boostType === 'cascade')
            return 'cascade-setup';
    }
    
    // Priority 2: Symbol priority recommendation
    return symbolPriority.recommendedStrategy; // single/multi-symbol
}
```

---

## Example Scenarios

### **Scenario 1: Discovery Pattern (Free Spin Focus)**
```
Board: 3 scatters, low-value symbols
Analysis: boostNeeded = { boostType: 'scatter', ... }
EngagementMechanics: { scatterBoost: 1.5 }
Strategy: scatter-boost
Result: Replaces low symbols → scatters, aims for 4+ scatters
```

### **Scenario 2: Cliffhanger Pattern (Big Win)**
```
Board: Target 100x, only 2 premium symbols, has 12x multipliers
Analysis: boostNeeded = { boostType: 'premium', ... }
EngagementMechanics: { premiumSymbolBoost: 2.0 }
Strategy: premium-boost (medium-high approach: symbols 5, 6)
Result: Upgrades 5-7 symbols to medium (5,6), leverages multipliers
```

### **Scenario 3: Multi-Cascade Pattern**
```
Board: Density 0.25, target 60x
Analysis: boostNeeded = { boostType: 'cascade', ... }
EngagementMechanics: { cascadeTarget: 4 }
Strategy: cascade-setup
Result: Places 3 symbol types (6,5,4) with 8-10 each for cascades
```

### **Scenario 4: Standard Enhancement (No Engagement)**
```
Board: Density 0.7, symbol 5 has 6 count, target 30x
Analysis: boostNeeded = { boostType: 'none', ... }
EngagementMechanics: undefined
Strategy: single-symbol (from symbol priority)
Result: Places 2 more of symbol 5 to reach 8+, hits 30x
```

---

## Benefits of New Design

| Aspect | Benefit |
|--------|---------|
| **Clarity** | Clear flow: analyze → determine → select → execute |
| **Efficiency** | Only one strategy runs (no duplication) |
| **Intelligence** | Strategy selection based on actual need |
| **Coordination** | Engagement mechanics ARE strategies, not preprocessing |
| **Flexibility** | Easy to add new strategies or adjust selection logic |
| **Testability** | Each strategy is independent and testable |
| **Maintainability** | No hidden side effects from preprocessing |

---

## Future Enhancements

1. **Hybrid Strategies**: Combine engagement + standard (e.g., scatter-boost + single-symbol)
2. **Strategy Chains**: Run multiple strategies in sequence if first doesn't achieve target
3. **Adaptive Boost Intensity**: Adjust boost amounts based on how far from target
4. **Smart Fallbacks**: If engagement strategy fails, automatically try standard strategy
5. **Strategy Scoring**: Predict which strategy is most likely to succeed before execution

---

## Code Location

- **Main orchestrator**: `board-enhancement-orchestrator.ts`
- **Strategy selection**: `selectStrategy()` method (line 215)
- **Boost determination**: `determineBoostNeed()` method (line 162)
- **Engagement strategies**: 
  - `applyScatterBoostStrategy()` (line 245)
  - `applyPremiumBoostStrategy()` (line 286)
  - `applyCascadeSetupStrategy()` (line 328)

