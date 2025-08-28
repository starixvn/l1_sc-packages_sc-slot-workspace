# Contributing to SC Slot Packages

## 🚀 Quick Setup

1. **Clone and Install**
   ```bash
   git clone <repository-url>
   cd sc-slot-packages
   npm install -g nx   # Install NX CLI globally (recommended)
   npm install
   ```

2. **Verify Setup**
   ```bash
   nx show projects    # Should show: sc-slot-board-generator, sc-slot-board-statistic
   npm run build       # Build all libraries
   npm run test        # Run all tests
   ```

## 🔄 Development Workflow

### Before Making Changes
```bash
# Create feature branch
git checkout -b feature/your-feature-name

# Make sure everything works
npm run build
npm run test
```

### Making Changes

1. **Edit Code** in `libs/board/*/src/`
2. **Write Tests** in `libs/board/*/tests/`
3. **Test Locally**:
   ```bash
   # Test specific library
   npm run board-gen:test
   npm run board-gen:build
   
   # Or test affected only
   npm run affected:test
   npm run affected:build
   ```

### Before Committing
```bash
# Format code
npm run format

# Lint and fix issues
npm run lint

# Final test
npm run test
```

## 📝 Code Standards

### File Structure
```
libs/board/library-name/
├── src/
│   ├── index.ts          # Main exports
│   ├── feature.ts        # Feature implementation
│   └── subfolder/        # Organized by functionality
├── tests/
│   └── feature.test.ts   # Tests for each feature
├── project.json          # NX configuration
└── README.md            # Library documentation
```

### TypeScript Guidelines
- Use **strict TypeScript** settings
- Export types and interfaces from `index.ts`
- Document public APIs with JSDoc comments
- Use meaningful variable and function names

### Testing Requirements
- **Unit tests** for all public functions
- **Coverage** should be above 80%
- Use **descriptive test names**
- Test **edge cases** and error conditions

Example test structure:
```typescript
describe('BoardGenerator', () => {
  describe('generateBoard', () => {
    it('should generate a board with correct dimensions', () => {
      // Test implementation
    });
    
    it('should handle invalid input gracefully', () => {
      // Error case testing
    });
  });
});
```

## 📦 Adding New Features

### Creating a New Library
```bash
# Generate new library
nx generate @nx/js:library libs/board/my-new-feature

# Add to workspace paths in tsconfig.base.json
# Update this README with new library info
```

### Adding Dependencies
```bash
# Add to specific library
cd libs/board/library-name
npm install new-dependency

# Add to workspace (dev dependencies)
npm install --save-dev new-dev-dependency
```

### Updating Existing Libraries
1. **Check affected projects**: `nx affected:graph`
2. **Update imports** if changing public APIs
3. **Update documentation** in README files
4. **Run full test suite**: `npm run test`

## 🧪 Testing Guidelines

### Running Tests
```bash
# All tests
npm run test

# Specific library
npm run board-gen:test

# With coverage
nx test sc-slot-board-generator --coverage

# Watch mode for development
nx test sc-slot-board-generator --watch
```

### Test Categories
- **Unit Tests**: Test individual functions/classes
- **Integration Tests**: Test library interactions
- **Demo Tests**: Verify generation scripts work

### Writing Good Tests
```typescript
// ✅ Good: Descriptive and specific
it('should generate a 5x3 board when configured with standard dimensions', () => {
  const generator = new BoardGenerator(standardConfig);
  const board = generator.generateBoard();
  
  expect(board.rows).toBe(5);
  expect(board.columns).toBe(3);
});

// ❌ Bad: Vague and unclear
it('should work', () => {
  // Test implementation
});
```

## 📋 Pull Request Checklist

### Before Submitting
- [ ] **Code formatted** with Prettier (`npm run format`)
- [ ] **All tests pass** (`npm run test`)
- [ ] **No linting errors** (`npm run lint`)
- [ ] **Documentation updated** (README, JSDoc comments)
- [ ] **Feature tested manually** if applicable

### PR Description Template
```markdown
## What This PR Does
Brief description of the changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests pass
- [ ] Manual testing completed

## Documentation
- [ ] README updated
- [ ] JSDoc comments added
- [ ] Examples provided if needed
```

## 🛠️ Common Tasks

### Board Generator Development
```bash
# Build and test generator
npm run board-gen:build
npm run board-gen:test

# Test generation scripts
npm run board-gen:generate
npm run board-gen:demo
```

### Statistics Development
```bash
# Build and test statistics
npm run board-stats:build

# Run statistics analysis
npm run board-stats:run
```

### Debugging
```bash
# Clear caches
npm run clean

# Rebuild everything
npm install
npm run build

# Check project configuration
nx show project sc-slot-board-generator
```

## 🐛 Troubleshooting

### Common Issues

**"Cannot find module" errors:**
```bash
nx sync           # Sync TypeScript references
npm run build     # Rebuild dependencies
```

**Test failures:**
```bash
nx test --clearCache    # Clear Jest cache
nx test --verbose       # See detailed output
```

**Build errors:**
```bash
npm run clean     # Clear all caches
npm install       # Reinstall dependencies
```

### Getting Help
1. Check existing documentation
2. Look at similar implementations in the codebase
3. Run `nx --help` for NX command help
4. Ask team members or create an issue

## 📖 Resources

- [Main README](./README.md) - Complete documentation
- [Quick Reference](./QUICK_REFERENCE.md) - Common commands
- [NX Documentation](https://nx.dev) - NX framework docs
- [TypeScript Handbook](https://www.typescriptlang.org/docs/) - TS best practices

---

Happy contributing! 🎰✨
