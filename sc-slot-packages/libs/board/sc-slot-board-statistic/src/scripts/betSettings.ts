/**
 * Bet Configuration Settings
 * 
 * This file contains all bet level and coin value configurations used for chain generation.
 * Update these arrays to modify available betting options across the system.
 */

export interface BetConfiguration {
    betLevel: number;
    coinValue: number;
}

/**
 * Available bet levels (multipliers)
 * Range: 1-10 for standard slot machine configurations
 */
export const BET_LEVELS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

/**
 * Available coin values (in currency units)
 * Range: 0.01-2.00 for typical casino denominations
 */
export const COIN_VALUES = [0.01, 0.05, 0.1, 0.5, 1, 2];

/**
 * Generate all possible bet configurations from the arrays above
 * @returns Array of all bet level/coin value combinations
 */
export function generateAllBetConfigurations(): BetConfiguration[] {
    const configurations: BetConfiguration[] = [];
    
    for (const betLevel of BET_LEVELS) {
        for (const coinValue of COIN_VALUES) {
            configurations.push({ betLevel, coinValue });
        }
    }
    
    return configurations;
}

/**
 * Generate bet configurations for specific bet levels
 * @param betLevels - Array of specific bet levels to include
 * @returns Array of bet configurations for specified levels only
 */
export function generateBetConfigurationsForLevels(betLevels: number[]): BetConfiguration[] {
    const configurations: BetConfiguration[] = [];
    
    for (const betLevel of betLevels) {
        if (!BET_LEVELS.includes(betLevel)) {
            throw new Error(`Invalid bet level: ${betLevel}. Must be one of: ${BET_LEVELS.join(', ')}`);
        }
        
        for (const coinValue of COIN_VALUES) {
            configurations.push({ betLevel, coinValue });
        }
    }
    
    return configurations;
}

/**
 * Generate bet configurations for specific coin values
 * @param coinValues - Array of specific coin values to include
 * @returns Array of bet configurations for specified coin values only
 */
export function generateBetConfigurationsForCoinValues(coinValues: number[]): BetConfiguration[] {
    const configurations: BetConfiguration[] = [];
    
    for (const coinValue of coinValues) {
        if (!COIN_VALUES.includes(coinValue)) {
            throw new Error(`Invalid coin value: ${coinValue}. Must be one of: ${COIN_VALUES.join(', ')}`);
        }
        
        for (const betLevel of BET_LEVELS) {
            configurations.push({ betLevel, coinValue });
        }
    }
    
    return configurations;
}

/**
 * Get total number of possible bet configurations
 * @returns Total combinations of bet levels × coin values
 */
export function getTotalBetConfigurations(): number {
    return BET_LEVELS.length * COIN_VALUES.length;
}

/**
 * Validate a bet configuration
 * @param config - Bet configuration to validate
 * @returns true if valid, throws error if invalid
 */
export function validateBetConfiguration(config: BetConfiguration): boolean {
    if (!BET_LEVELS.includes(config.betLevel)) {
        throw new Error(`Invalid bet level: ${config.betLevel}. Must be one of: ${BET_LEVELS.join(', ')}`);
    }
    
    if (!COIN_VALUES.includes(config.coinValue)) {
        throw new Error(`Invalid coin value: ${config.coinValue}. Must be one of: ${COIN_VALUES.join(', ')}`);
    }
    
    return true;
}

/**
 * Format bet configuration for display
 * @param config - Bet configuration to format
 * @returns Formatted string representation
 */
export function formatBetConfiguration(config: BetConfiguration): string {
    return `Level ${config.betLevel}, Coin $${config.coinValue}`;
}

/**
 * Calculate bet amount from configuration
 * @param config - Bet configuration
 * @param betMultiplier - Multiplier (default: 20)
 * @returns Calculated bet amount
 */
export function calculateBetAmount(config: BetConfiguration, betMultiplier: number = 20): number {
    return config.betLevel * config.coinValue * betMultiplier / 20;
}
