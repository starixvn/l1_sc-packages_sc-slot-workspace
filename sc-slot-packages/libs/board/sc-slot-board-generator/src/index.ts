import { BoardGenerator } from "./board-generator";
import { Difficulty } from "./difficulties";
import {
    PayoutCalculator,
    PayoutRule,
    SymbolWin,
    ScatterWin,
    PayoutResult,
    PayoutRulesConfig,
    SymbolPayoutConfig,
    ScatterPayoutConfig,
    MultiplierOrbConfig,
    PayoutTier,
} from "./payout-calculator";
// RTP control and result chain generation moved to sc-slot-board-statistic
import defaultDefinition from "./default-definition";

// Core board generation
export { BoardGenerator, Difficulty };

// Payout system
export {
    PayoutCalculator,
    PayoutRule,
    SymbolWin,
    ScatterWin,
    PayoutResult,
    PayoutRulesConfig,
    SymbolPayoutConfig,
    ScatterPayoutConfig,
    MultiplierOrbConfig,
    PayoutTier,
};

// Note: RTP management and result chain generation moved to sc-slot-board-statistic

// Legacy result chain functions removed.
// For RTP-controlled result chains, use sc-slot-board-statistic package.
