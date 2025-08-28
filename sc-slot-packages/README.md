# SC Slot Packages Monorepo

<a alt="Nx logo" href="https://nx.dev" target="_blank" rel="noreferrer"><img src="https://raw.githubusercontent.com/nrwl/nx/master/images/nx-logo.png" width="45"></a>

A modern NX monorepo containing slot board libraries for game development. Built with TypeScript, Jest testing, and Prettier formatting.

> **Note**: This documentation uses `nx` commands (requires global installation). If you prefer not to install globally, replace `nx` with `npx nx` in all commands.

## 📦 Available Libraries

### 🎰 Board Generator (`@sc-slot-packages/board-generator`)
**Location:** `libs/board/sc-slot-board-generator`

Comprehensive slot board generation library featuring:
- **Board Generation**: Create game boards with various symbols and configurations
- **Payout Calculation**: Advanced payout system with symbol matching and scatters
- **RTP Management**: Control Return to Player percentages with precision
- **Result Chains**: Generate cascading sequences and demo chains
- **Multiplier Generation**: Dynamic multiplier orb placement

### 📊 Board Statistics (`@sc-slot-packages/board-statistic`)
**Location:** `libs/board/sc-slot-board-statistic`

Statistics and analysis library for slot boards (runs on-the-fly with ts-node):
- **Cascading Slots**: Generator definitions and configurations
- **Statistic Calculation**: Analyze board performance and outcomes
- **Reporting Tools**: Generate comprehensive statistics reports
- **Runner Utilities**: Execute statistic analysis workflows
- **Note**: This library executes directly with TypeScript, no compilation needed

## 🚀 Quick Start

### Prerequisites
- Node.js (v16+)
- npm or yarn
- Git

### Installation
```bash
# Clone the repository
git clone <repository-url>
cd sc-slot-packages

# Install NX CLI globally (recommended)
npm install -g nx

# Install dependencies
npm install

# Verify installation
nx show projects
```

## 🛠️ Development Commands

### Building Libraries
```bash
# Build all libraries (only builds libraries that require compilation)
nx run-many -t build

# Build board generator (compiles to JavaScript)
nx build sc-slot-board-generator

# Note: sc-slot-board-statistic runs on-the-fly with ts-node, no build needed
```

### Testing
```bash
# Run all tests
nx run-many -t test

# Test specific library
nx test sc-slot-board-generator

# Run tests with coverage
nx test sc-slot-board-generator --coverage
```

### Linting
```bash
# Lint all projects
nx run-many -t lint

# Lint specific library
nx lint sc-slot-board-generator
```

### Library-Specific Commands

#### Board Generator
```bash
# Generate predefined results
nx generate sc-slot-board-generator

# Batch generation
nx generate:batch sc-slot-board-generator

# Quick demo generation
nx generate:demo sc-slot-board-generator
```

#### Board Statistics
```bash
# Run cascading slot analysis
nx cascading-slot sc-slot-board-statistic
```

## 📚 Usage Examples

### Importing Libraries
```typescript
// Import board generator
import { 
  BoardGenerator, 
  PayoutCalculator, 
  createResultChainGenerator,
  generateDemoChain 
} from '@sc-slot-packages/board-generator';

// Import statistics tools
import { 
  StatisticCalculator, 
  StatisticReporter 
} from '@sc-slot-packages/board-statistic';
```

### Basic Board Generation
```typescript
import { BoardGenerator, Difficulty } from '@sc-slot-packages/board-generator';

// Create a board generator
const generator = new BoardGenerator(boardSettings, multiplierSettings, Difficulty.Medium);

// Generate a board
const board = generator.generateBoard();
```

### Result Chain Generation
```typescript
import { createResultChainGenerator } from '@sc-slot-packages/board-generator';

// Create generator with custom config
const { generator, config } = createResultChainGenerator({
  boardCount: 50,
  targetRTP: 0.96,
  betSize: 2,
  playerBudget: 200
});

// Generate result chain
const chain = await generator.generateChain(config);
```

### Quick Demo
```typescript
import { generateDemoChain } from '@sc-slot-packages/board-generator';

// Generate a demo chain for testing
const demoChain = await generateDemoChain();
console.log('Demo chain generated:', demoChain);
```

## 🏗️ Project Structure

```
sc-slot-packages/
├── libs/
│   └── board/                          # Board-related libraries
│       ├── sc-slot-board-generator/    # Core generation library
│       │   ├── src/                    # Source code
│       │   │   ├── board-generator.ts  # Main board generation
│       │   │   ├── payout-calculator.ts # Payout logic
│       │   │   ├── result-chain/       # Chain generation
│       │   │   └── index.ts           # Public API
│       │   ├── tests/                 # Test files
│       │   ├── scripts/               # Generation scripts
│       │   └── project.json          # NX project config
│       └── sc-slot-board-statistic/   # Statistics library
│           ├── src/
│           │   └── cascading-slot/    # Cascading analysis
│           └── project.json
├── packages/                          # Future packages
├── nx.json                           # NX workspace config
├── tsconfig.base.json               # Base TypeScript config
└── package.json                     # Root package config
```

## 🔧 Development Workflow

### Adding a New Library
```bash
# Generate a new library
nx generate @nx/js:library libs/board/my-new-lib

# Or create in different scope
nx generate @nx/js:library libs/utils/my-utility-lib
```

### Working with Dependencies
```bash
# Add dependency to specific library
cd libs/board/sc-slot-board-generator
npm install new-dependency

# Update workspace dependencies
npm install new-dev-dependency --save-dev
```

### Code Quality
```bash
# Format code with Prettier
nx format

# Fix linting issues
nx lint sc-slot-board-generator --fix

# Type checking
nx typecheck sc-slot-board-generator
```

## 📊 Monitoring & Analysis

### Dependency Graph
```bash
# View project dependencies
nx graph

# Show specific project details
nx show project sc-slot-board-generator
```

### Build Analysis
```bash
# Show affected projects
nx affected:graph

# Build only affected projects
nx affected:build
```

## 🧪 Testing Strategy

### Unit Tests
- Located in `tests/` directories
- Use Jest with TypeScript support
- Include extended matchers via `jest-extended`

### Running Tests
```bash
# Watch mode for development
nx test sc-slot-board-generator --watch

# Generate coverage report
nx test sc-slot-board-generator --coverage

# Test specific file
nx test sc-slot-board-generator --testNamePattern="BoardGenerator"
```

## 📋 Available Scripts

### Root Level
- `npm run format` - Format all code with Prettier
- `npm run lint` - Lint all projects
- `npm run test` - Run all tests
- `npm run build` - Build all libraries

### Library Level
Each library has its own `package.json` with specific scripts accessible via NX.

## 🔍 Troubleshooting

### Common Issues

**Build Errors:**
```bash
# Clear NX cache
nx reset

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

**Type Errors:**
```bash
# Sync TypeScript project references
nx sync

# Check TypeScript configuration
nx typecheck
```

**Test Failures:**
```bash
# Run tests with verbose output
nx test --verbose

# Clear Jest cache
nx test --clearCache
```

## 🚀 Production Deployment

### Building for Production
```bash
# Build all libraries for production
nx run-many -t build --configuration=production

# Build specific library
nx build sc-slot-board-generator --configuration=production
```

### Publishing Libraries
```bash
# Version and release
nx release

# Dry run (preview changes)
nx release --dry-run
```

## 🤝 Contributing

1. **Clone** the repository
2. **Create** a feature branch: `git checkout -b feature/amazing-feature`
3. **Develop** using the workflow above
4. **Test** your changes: `nx affected:test`
5. **Build** to verify: `nx affected:build`
6. **Commit** changes: `git commit -m 'Add amazing feature'`
7. **Push** to branch: `git push origin feature/amazing-feature`
8. **Create** a Pull Request

### Code Standards
- Follow TypeScript best practices
- Maintain test coverage above 80%
- Use Prettier for formatting
- Follow conventional commit messages

## 📖 Additional Resources

- [NX Documentation](https://nx.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Jest Testing Framework](https://jestjs.io/)
- [Slot Board Generator Guide](./libs/board/sc-slot-board-generator/README.md)

## 📞 Support

For questions and support:
- Check existing documentation
- Review library-specific README files
- Create an issue for bugs or feature requests
- Contact the development team

---

**Happy coding! 🎰✨**