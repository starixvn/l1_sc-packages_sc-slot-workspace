import { BoardGenerator } from "sc-slot-board-generator";
import { Volatility } from 'sc-slot-board-generator/lib/volatility';
import { boardDefinition } from "../../generator-definition";

// ===============================
// PATTERN-SPECIFIC CONFIGURATIONS
// ===============================

export interface PatternBoardConfig {
    name: string;
    description: string;
    riskProfile: string;
    boardSettings: {
        reels: number;
        symbolsOnReel: number;
        numberOfSymbols: number;
        numberOfShuffles: number;
    };
    multiplierSettings: {
        min: number;
        max: number;
    };
    volatility: Volatility;
}

// ===============================
// PATTERN-ALIGNED CONFIGURATIONS
// ===============================

export const PATTERN_CONFIGS: { [key: string]: PatternBoardConfig } = {
    // COMEBACK - Loss-averse players need frequent small wins to build confidence
    comeback: {
        name: "Comeback Pattern",
        description: "Recovery pattern with frequent small wins for loss-averse players",
        riskProfile: 'loss-averse',
        boardSettings: {
            reels: 6,
            symbolsOnReel: 5,
            numberOfSymbols: 11,
            numberOfShuffles: 2, // Less randomization for more predictable patterns
        },
        multiplierSettings: {
            min: 1,   // Lower minimum for accessible wins
            max: 18,  // Lower maximum for less volatility
        },
        volatility: Volatility.MediumLow, // More frequent wins
    },

    // CLIFFHANGER - Risk-seekers want high suspense and big potential payouts  
    cliffhanger: {
        name: "Cliffhanger Pattern",
        description: "High-suspense pattern with big win potential for risk-seekers",
        riskProfile: 'risk-seeker',
        boardSettings: {
            reels: 6,
            symbolsOnReel: 5,
            numberOfSymbols: 11,
            numberOfShuffles: 4, // More randomization for unpredictability
        },
        multiplierSettings: {
            min: 3,   // Higher minimum for bigger baseline wins
            max: 50,  // Much higher maximum for excitement
        },
        volatility: Volatility.VeryHigh, // Fewer but bigger wins
    },

    // DISCOVERY - Explorers want variety and gradual feature reveals
    discovery: {
        name: "Discovery Pattern", 
        description: "Exploration pattern with enhanced features for curious players",
        riskProfile: 'explorer',
        boardSettings: {
            reels: 6,
            symbolsOnReel: 5,
            numberOfSymbols: 11,
            numberOfShuffles: 3, // Standard randomization
        },
        multiplierSettings: {
            min: 2,   // Standard minimum
            max: 30,  // Higher maximum for discovery rewards
        },
        volatility: Volatility.MediumLow, // Balanced for exploration
        // Note: This pattern would benefit from enhanced scatter distribution
    },

    // TEASE - Mixed players want balanced anticipation
    tease: {
        name: "Tease Pattern",
        description: "Near-miss pattern with balanced anticipation for mixed player types",
        riskProfile: 'mixed',
        boardSettings: {
            reels: 6,
            symbolsOnReel: 5,
            numberOfSymbols: 11,
            numberOfShuffles: 3, // Standard randomization
        },
        multiplierSettings: {
            min: 2,   // Standard minimum
            max: 25,  // Standard maximum
        },
        volatility: Volatility.MediumLow, // Balanced approach
    },

    // WAVE - Mixed players want rhythmic, consistent engagement
    wave: {
        name: "Wave Pattern",
        description: "Rhythmic pattern with consistent engagement for balanced players", 
        riskProfile: 'mixed',
        boardSettings: {
            reels: 6,
            symbolsOnReel: 5,
            numberOfSymbols: 11,
            numberOfShuffles: 3, // Standard randomization
        },
        multiplierSettings: {
            min: 2,   // Standard minimum  
            max: 21,  // Standard maximum (current default)
        },
        volatility: Volatility.MediumLow, // Balanced volatility
    }
};

// ===============================
// PATTERN-AWARE FACTORY FUNCTION
// ===============================

export function createPatternSpecificBoardGeneratorFactory(patternType: string) {
    const config = PATTERN_CONFIGS[patternType];
    
    if (!config) {
        console.warn(`⚠️ Pattern '${patternType}' not found in configurations. Using default settings.`);
        // Fallback to standard configuration
        return () => new BoardGenerator(
            { reels: 6, symbolsOnReel: 5, numberOfSymbols: 11, numberOfShuffles: 3 },
            { min: 2, max: 21 },
            boardDefinition,
            Volatility.MediumLow
        );
    }
    
    console.log(`🎭 Using pattern-specific configuration: ${config.name}`);
    console.log(`   Risk Profile: ${config.riskProfile}`);
    console.log(`   Description: ${config.description}`);
    console.log(`   Grid Size: ${config.boardSettings.reels}x${config.boardSettings.symbolsOnReel}`);
    console.log(`   Multiplier Range: ${config.multiplierSettings.min}x-${config.multiplierSettings.max}x`);
    console.log(`   Volatility: ${config.volatility}`);
    console.log(`   Hit Frequency: ${config.volatility === Volatility.MediumLow ? '~30%' : '~20%'}`);
    
        return () => new BoardGenerator(
            config.boardSettings,
            config.multiplierSettings,
            boardDefinition,
            config.volatility
        );
}

// ===============================
// CONFIGURATION SUMMARY
// ===============================

export function getPatternConfigSummary() {
    return {
        comeback: "🛡️ Loss-Averse → Easy difficulty, 1x-18x multipliers, frequent small wins",
        cliffhanger: "🎲 Risk-Seeker → Hard difficulty, 3x-50x multipliers, rare big wins", 
        discovery: "🔍 Explorer → Medium difficulty, 2x-30x multipliers, feature-rich gameplay",
        tease: "⚖️ Mixed → Medium difficulty, 2x-25x multipliers, balanced anticipation",
        wave: "🌊 Mixed → Medium difficulty, 2x-21x multipliers, consistent engagement"
    };
}
