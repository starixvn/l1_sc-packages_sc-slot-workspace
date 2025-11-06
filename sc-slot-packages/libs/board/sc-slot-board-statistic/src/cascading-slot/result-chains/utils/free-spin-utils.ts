import { defaultOdds } from "../../generator-definition";

/**
 * Calculate free spin awards using actual configuration from generator-definition.ts
 * @param scatterCount - Number of scatter symbols on the board
 * @param isRetrigger - Whether this is a retrigger calculation (true) or base game (false)
 * @returns Number of free spins awarded
 */
export function calculateFreeSpinAward(scatterCount: number, isRetrigger: boolean): number {
    if (isRetrigger) {
        // Free spin retrigger mode - use additionalOdds from generator-definition
        // 3+ scatters can award additional free spins during free spin mode
        const retriggerRule = defaultOdds.freeSpins.additionalOdds.find(rule => scatterCount >= rule.count);
        return retriggerRule ? retriggerRule.odds : 0;
    } else {
        // Base game mode - use initialOdds from generator-definition
        // Only 4+ scatters award free spins in base game
        if (scatterCount < 4) {
            return 0; // No free spins awarded
        }
        const initialRule = defaultOdds.freeSpins.initialOdds.find(rule => scatterCount >= rule.count);
        return initialRule ? initialRule.odds : 0;
    }
}
