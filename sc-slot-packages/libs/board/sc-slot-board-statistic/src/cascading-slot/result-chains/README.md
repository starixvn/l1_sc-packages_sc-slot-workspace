# Result Chains Module

This module contains all functionality related to generating, orchestrating, and managing slot machine result chains with RTP compliance.

## Directory Structure

```
result-chains/
├── scripts/           # Executable scripts for chain generation and management
│   ├── generate-chains.ts           # Main chain generation script
│   ├── import-chains.ts             # Chain import functionality  
│   ├── verify-chain-multipliers.ts  # Chain multiplier verification script
│   └── betSettings.ts               # Bet configuration settings
├── orchestration/     # Core orchestration and control logic
│   ├── result-chain-orchestrator.ts    # Main orchestration logic
│   ├── rtp-controller.ts               # RTP validation and control
│   ├── board-generator-adapter.ts      # Board generator adapter
│   └── custom-generator-configs.ts     # Pattern-specific configurations
├── enhancement/       # Board enhancement and optimization
│   ├── board-enhancement-orchestrator.ts  # Main enhancement orchestrator
│   ├── enhanced-board-analyzer.ts         # Board analysis functions
│   ├── symbol-prioritizer.ts              # Symbol prioritization logic
│   └── multi-symbol-strategy.ts           # Multi-symbol enhancement strategies
├── validation/        # Chain and board validation
│   └── chain-validator.ts              # Chain validation functions
└── index.ts          # Module exports
```

## Key Components

### Scripts (`scripts/`)
- **generate-chains.ts**: Main script for generating result chains with configurable patterns, bet amounts, and RTP targets
- **import-chains.ts**: Utility for importing generated chains into MongoDB
- **verify-chain-multipliers.ts**: Verification script for validating chain multiplier correctness
- **betSettings.ts**: Configuration for bet levels and coin values

### Orchestration (`orchestration/`)
- **ResultChainOrchestrator**: Coordinates the entire chain generation process
- **RTPController**: Manages RTP validation and ensures target compliance
- **BoardGeneratorAdapter**: Wraps the board generator for consistent interface
- **Pattern Configs**: Defines pattern-specific board generation parameters

### Enhancement (`enhancement/`)
- **BoardEnhancementOrchestrator**: Coordinates board enhancement strategies
- **EnhancedBoardAnalyzer**: Analyzes board states for optimization opportunities
- **SymbolPrioritizer**: Prioritizes symbols for strategic placement
- **MultiSymbolStrategy**: Handles complex multi-symbol enhancement scenarios

### Validation (`validation/`)
- **ChainValidator**: Validates generated chains for compliance and correctness

## Usage

### Generate Chains
```bash
# Generate chains with default settings
npm run generate-chains

# Generate specific pattern with custom settings
npm run generate-chains 100 tease 1.0 0.5

# Generate multiple configurations
npm run generate-chains 50 "comeback,wave" multi
```

### Import Chains
```bash
npm run import-chains
```

### Verify Chain Multipliers
```bash
npm run verify-chain-multipliers
```

### Programmatic Usage
```typescript
import { 
    ResultChainOrchestrator, 
    BoardGeneratorAdapter,
    createPatternSpecificBoardGeneratorFactory 
} from './result-chains';

// Create pattern-specific generator
const generatorFactory = createPatternSpecificBoardGeneratorFactory('comeback');

// Create orchestrator
const orchestrator = new ResultChainOrchestrator(generatorFactory, rtpConfig);

// Generate chain
const chain = await orchestrator.generateResultChain(config);
```

## Key Features

- **Pattern-Aware Generation**: Different patterns (comeback, cliffhanger, discovery, tease, wave) with tailored configurations
- **RTP Compliance**: Automatic validation and adjustment to meet target RTP requirements
- **Board Enhancement**: Intelligent board modification to achieve target win amounts
- **Comprehensive Validation**: Multi-level validation for data integrity and business rule compliance
- **Flexible Betting**: Support for multiple bet configurations and amounts
- **MongoDB Integration**: Direct import capabilities for generated chains

## Configuration

The module supports extensive configuration through:
- Pattern-specific board generator settings
- RTP targets and tolerances
- Bet level and coin value arrays
- Enhancement strategies and timeouts
- Validation rules and compliance checks
