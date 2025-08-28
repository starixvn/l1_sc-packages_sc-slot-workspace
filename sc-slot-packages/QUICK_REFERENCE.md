# 🚀 Quick Reference Guide

> **Note**: This guide uses `nx` commands (requires `npm install -g nx`). If you prefer not to install globally, replace `nx` with `npx nx` in all commands.

## Most Common Commands

### Daily Development
```bash
# Start development
npm install -g nx                        # Install NX CLI globally (one-time)
npm install                              # Install dependencies
nx show projects                         # List all projects

# Build and test
nx build sc-slot-board-generator         # Build generator library
nx test sc-slot-board-generator          # Run tests
nx lint sc-slot-board-generator          # Check code quality
```

### Working with Board Generator
```bash
# Core commands
nx build sc-slot-board-generator         # Build the library
nx test sc-slot-board-generator          # Run unit tests
nx generate sc-slot-board-generator      # Generate predefined results

# Specialized generation
nx generate:batch sc-slot-board-generator    # Batch generation
nx generate:demo sc-slot-board-generator     # Quick demo (50 boards)
```

### Working with Statistics
```bash
# Statistics library (runs on-the-fly with ts-node, no build needed)
nx cascading-slot sc-slot-board-statistic   # Run analysis
nx lint sc-slot-board-statistic             # Lint code
```

### Workspace Management
```bash
# See what's affected by changes
nx affected:graph                        # Visual graph of affected projects
nx affected:build                        # Build only affected projects
nx affected:test                         # Test only affected projects

# Clean and reset
nx reset                                 # Clear NX cache
npm run clean                            # Clean all builds
```

## Import Examples

### Quick Start Import
```typescript
// Most common imports
import { 
  BoardGenerator, 
  PayoutCalculator,
  generateDemoChain 
} from '@sc-slot-packages/board-generator';

import { StatisticCalculator } from '@sc-slot-packages/board-statistic';
```

### Complete Import Reference
```typescript
// Board Generator - Core
import { 
  BoardGenerator,
  Difficulty 
} from '@sc-slot-packages/board-generator';

// Board Generator - Payout System
import { 
  PayoutCalculator,
  PayoutRule,
  SymbolWin,
  ScatterWin,
  PayoutResult 
} from '@sc-slot-packages/board-generator';

// Board Generator - RTP & Chains
import { 
  RTPController,
  ResultChainGenerator,
  createResultChainGenerator,
  generateResultChain,
  generateDemoChain 
} from '@sc-slot-packages/board-generator';

// Statistics Library
import { 
  StatisticCalculator,
  StatisticReporter,
  StatisticRunner,
  GeneratorDefinition 
} from '@sc-slot-packages/board-statistic';
```

## Code Snippets

### Generate a Basic Board
```typescript
import { BoardGenerator, Difficulty } from '@sc-slot-packages/board-generator';

const generator = new BoardGenerator(
  boardSettings,      // Your board configuration
  multiplierSettings, // Multiplier configuration  
  Difficulty.Medium   // Difficulty level
);

const board = generator.generateBoard();
```

### Generate Result Chain
```typescript
import { createResultChainGenerator } from '@sc-slot-packages/board-generator';

const { generator, config } = createResultChainGenerator({
  boardCount: 100,
  targetRTP: 0.97,
  betSize: 1,
  playerBudget: 100
});

const chain = await generator.generateChain(config);
```

### Quick Demo Generation
```typescript
import { generateDemoChain } from '@sc-slot-packages/board-generator';

// Generates demo with default settings
const demoChain = await generateDemoChain();
```

## Troubleshooting

### Build Issues
```bash
# Clear everything and rebuild
nx reset
rm -rf node_modules package-lock.json
npm install
nx build sc-slot-board-generator
```

### Type Issues
```bash
# Sync TypeScript references
nx sync
nx typecheck sc-slot-board-generator
```

### Test Issues
```bash
# Clear Jest cache and rerun
nx test sc-slot-board-generator --clearCache
nx test sc-slot-board-generator --verbose
```

## File Locations

```
📁 Core Files
├── libs/board/sc-slot-board-generator/src/index.ts     # Main exports
├── libs/board/sc-slot-board-generator/project.json     # NX config
├── libs/board/sc-slot-board-statistic/src/index.ts     # Stats exports
└── tsconfig.base.json                                  # Path mappings

📁 Documentation
├── README.md                                           # Main guide
├── QUICK_REFERENCE.md                                  # This file
├── libs/board/sc-slot-board-generator/README.md        # Generator docs
└── libs/board/sc-slot-board-generator/CUSTOM_PAYOUT_RULES_GUIDE.md
```

## Environment Setup

### VS Code Extensions (Recommended)
- **Nx Console** - Visual NX command runner
- **TypeScript Hero** - Auto import organization
- **Prettier** - Code formatting
- **Jest** - Test runner integration

### Useful VS Code Settings
```json
{
  "typescript.preferences.importModuleSpecifier": "relative",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll": true
  }
}
```

---

💡 **Tip**: Bookmark this file for quick reference during development!
