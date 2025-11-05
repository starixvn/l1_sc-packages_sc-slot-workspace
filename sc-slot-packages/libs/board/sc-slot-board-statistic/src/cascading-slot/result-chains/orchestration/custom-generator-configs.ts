import { BoardGenerator } from "sc-slot-board-generator";
import { Volatility } from 'sc-slot-board-generator/lib/volatility';
import { boardDefinition } from "../../generator-definition";

// ===============================
// ENGAGEMENT MECHANICS
// ===============================

export interface EngagementMechanics {
    targetRTP?: number;                // Custom RTP target (e.g., 0.96, 1.10)
    rtpTolerance?: number;             // Custom RTP tolerance (e.g., 0.02 for ±2%)
    freeSpinRTP?: number;              // Free spin RTP (e.g., 0.3 for 30%)
    targetHitFrequency?: number;       // 0.0-1.0 (e.g., 0.50 for 50%)
    premiumSymbolBoost?: number;       // Multiplier for symbols 7-8 weight (e.g., 1.8)
    scatterBoost?: number;             // Multiplier for symbol 9 weight (e.g., 2.5)
    cascadeTarget?: number;            // Target tumble count (e.g., 3-4)
    nearMissMode?: boolean;            // Enable 6-7 symbol placement
}

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
    engagementMechanics?: EngagementMechanics;
}

// ===============================
// PATTERN-ALIGNED CONFIGURATIONS
// ===============================

export const PATTERN_CONFIGS: { [key: string]: PatternBoardConfig } = {
    // COMEBACK - Loss-averse players need frequent small wins to build confidence
    comeback: {
        name: "Comeback Pattern",
        description: "High-frequency recovery with standard RTP and 2-3 tumble cascades",
        riskProfile: 'loss-averse',
        boardSettings: {
            reels: 6,
            symbolsOnReel: 5,
            numberOfSymbols: 11,
            numberOfShuffles: 3,
        },
        multiplierSettings: {
            min: 1,   // Lower minimum for accessible wins
            max: 18,  // Lower maximum for less volatility
        },
        volatility: Volatility.MediumLow,
        engagementMechanics: {
            targetRTP: 0.97,              // Standard 97% RTP
            rtpTolerance: 0.01,           // ±1%
            targetHitFrequency: 0.50,     // 50% win rate target
            cascadeTarget: 2.5,           // 2-3 tumbles average
        },
    },

    // CLIFFHANGER - Risk-seekers want high suspense and big potential payouts  
    cliffhanger: {
        name: "Cliffhanger Pattern",
        description: "High-risk high-reward with elevated RTP ceiling and premium symbols",
        riskProfile: 'risk-seeker',
        boardSettings: {
            reels: 6,
            symbolsOnReel: 5,
            numberOfSymbols: 11,
            numberOfShuffles: 3,
        },
        multiplierSettings: {
            min: 5,    // Higher minimum for bigger baseline wins
            max: 100,  // Increased maximum for mega wins
        },
        volatility: Volatility.VeryHigh,
        engagementMechanics: {
            targetRTP: 1.05,              // Allow 105% RTP (can go up to 110%)
            rtpTolerance: 0.05,           // ±5% (allows 100%-110% range)
            premiumSymbolBoost: 1.8,      // 80% more symbols 7-8
            cascadeTarget: 4,             // 4-5 tumbles when winning
        },
    },

    // DISCOVERY - Explorers want variety and gradual feature reveals
    discovery: {
        name: "Discovery Pattern", 
        description: "Feature-rich with lower base RTP compensated by 2.5x more free spins",
        riskProfile: 'explorer',
        boardSettings: {
            reels: 6,
            symbolsOnReel: 5,
            numberOfSymbols: 11,
            numberOfShuffles: 3,
        },
        multiplierSettings: {
            min: 2,   // Standard minimum
            max: 30,  // Higher maximum for discovery rewards
        },
        volatility: Volatility.MediumLow,
        engagementMechanics: {
            targetRTP: 0.96,              // Lower 96% RTP
            rtpTolerance: 0.01,           // ±1%
            freeSpinRTP: 0.3,            // Lower 30% RTP for free spins (compensates for frequency)
            scatterBoost: 2.5,            // 2.5x scatter frequency compensates
            cascadeTarget: 3.5,           // 3-4 tumbles average
        },
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
// PATTERN CONFIG LOGGER (BUILDER PATTERN)
// ===============================

class PatternConfigLogger {
    private lines: string[] = [];

    header(icon: string, label: string, value: string): this {
        this.lines.push(`${icon} ${label}: ${value}`);
        return this;
    }

    detail(label: string, value: string | number): this {
        this.lines.push(`   ${label}: ${value}`);
        return this;
    }

    detailIf(condition: boolean | undefined, label: string, value: string | number): this {
        if (condition) {
            this.detail(label, value);
        }
        return this;
    }

    build(): void {
        this.lines.forEach(line => console.log(line));
    }
}

// ===============================
// PATTERN-AWARE FACTORY FUNCTION
// ===============================

export function createPatternSpecificBoardGeneratorFactory(patternType: string, volatilityOverride?: Volatility) {
    const config = PATTERN_CONFIGS[patternType];
    
    if (!config) {
        console.warn(`⚠️ Pattern '${patternType}' not found in configurations. Using default settings.`);
        // Fallback to standard configuration
        const effectiveVolatility = volatilityOverride || Volatility.MediumLow;
        return {
            generatorFactory: () => new BoardGenerator(
                { reels: 6, symbolsOnReel: 5, numberOfSymbols: 11, numberOfShuffles: 3 },
                { min: 2, max: 21 },
                boardDefinition,
                effectiveVolatility
            ),
            engagementMechanics: undefined
        };
    }
    
    const logger = new PatternConfigLogger();
    const mechanics = config.engagementMechanics;
    
    // Use volatility override if provided, otherwise use pattern default
    const effectiveVolatility = volatilityOverride !== undefined ? volatilityOverride : config.volatility;
    const volatilitySource = volatilityOverride !== undefined ? '(CLI Override)' : '(Pattern Default)';
    
    logger
        .header('🎭', 'Using pattern-specific configuration', config.name)
        .detail('Risk Profile', config.riskProfile)
        .detail('Description', config.description)
        .detail('Grid Size', `${config.boardSettings.reels}x${config.boardSettings.symbolsOnReel}`)
        .detail('Multiplier Range', `${config.multiplierSettings.min}x-${config.multiplierSettings.max}x`)
        .detail('Volatility', `${effectiveVolatility} ${volatilitySource}`)
        .detailIf(!!mechanics, 'RTP Target', `${((mechanics?.targetRTP || 0.97) * 100).toFixed(0)}%`)
        .detailIf(!!mechanics?.targetHitFrequency, 'Hit Frequency Target', `${((mechanics?.targetHitFrequency || 0) * 100).toFixed(0)}%`)
        .detailIf(!!mechanics?.cascadeTarget, 'Cascade Target', `${mechanics?.cascadeTarget} tumbles`)
        .detailIf(!!mechanics?.premiumSymbolBoost, 'Premium Symbol Boost', `${mechanics?.premiumSymbolBoost}x`)
        .detailIf(!!mechanics?.scatterBoost, 'Scatter Boost', `${mechanics?.scatterBoost}x`)
        .build();
    
    return {
        generatorFactory: () => new BoardGenerator(
            config.boardSettings,
            config.multiplierSettings,
            boardDefinition,
            effectiveVolatility  // Use effective volatility (override or default)
        ),
        engagementMechanics: config.engagementMechanics
    };
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
