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

/**
 * Calculate total house expenditure for free spins (cost + expected RTP payout)
 * @param awardedFreeSpins - Number of free spins awarded
 * @param betSize - Bet amount per spin
 * @param freeSpinRTP - Free spin RTP percentage (default: 0.3 for 30%)
 * @returns Total expected expenditure by the house
 */
export function calculateTotalHouseExpenditure(
    awardedFreeSpins: number,
    betSize: number,
    freeSpinRTP: number = 0.3
): number {
    if (awardedFreeSpins <= 0) {
        return 0;
    }

    // Free spin cost = awarded free spins × bet size
    const freeSpinCost = awardedFreeSpins * betSize;

    // Expected RTP payout = free spin cost × free spin RTP
    const expectedFreeSpinPayout = freeSpinCost * freeSpinRTP;

    // Total house expenditure = cost of free spins + expected RTP payout from those spins
    return freeSpinCost + expectedFreeSpinPayout;
}

/**
 * Calculate free spin cost component only
 * @param awardedFreeSpins - Number of free spins awarded
 * @param betSize - Bet amount per spin
 * @returns Cost to provide the free spins
 */
export function calculateFreeSpinCost(awardedFreeSpins: number, betSize: number): number {
    return awardedFreeSpins * betSize;
}

/**
 * Calculate expected free spin payout component only
 * @param awardedFreeSpins - Number of free spins awarded
 * @param betSize - Bet amount per spin
 * @param freeSpinRTP - Free spin RTP percentage (default: 0.3 for 30%)
 * @returns Expected RTP payout from free spins
 */
export function calculateExpectedFreeSpinPayout(
    awardedFreeSpins: number,
    betSize: number,
    freeSpinRTP: number = 0.3
): number {
    const freeSpinCost = calculateFreeSpinCost(awardedFreeSpins, betSize);
    return freeSpinCost * freeSpinRTP;
}
