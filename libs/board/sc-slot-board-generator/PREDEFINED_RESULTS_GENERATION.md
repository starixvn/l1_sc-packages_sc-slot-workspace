# Predefined Results Generation Script

## Overview

A comprehensive command-line tool for generating predefined slot game result chains with specific RTP targets and configurations. The script generates sequences of board results that can be used for testing, demonstrations, or controlled gameplay experiences.

## Features

- 🎯 **RTP Targeting** - Generate chains that meet specific Return To Player percentages
- 📊 **Multiple Configurations** - Support for various board counts, difficulties, and tolerances
- 🎮 **Custom Rules Integration** - Use custom payout rules from JSON files
- 📁 **Structured Output** - JSON data files with metadata and human-readable summaries
- 🔄 **Batch Generation** - Generate multiple configurations automatically
- 🧪 **Testing Tools** - Dry-run mode and validation features

## Quick Start

### Installation

The script uses existing project dependencies. Ensure you have:

```bash
npm install  # Installs commander and other dependencies
```

### Basic Usage

```bash
# Generate default configuration (120 boards, 97% RTP)
npm run generate

# Generate quick demo (50 boards)
npm run generate:demo

# Generate multiple configurations
npm run generate:batch

# Show all available options
npm run generate:help
```

## Script Location

- **Main Script**: `scripts/generate-predefined-results.ts`
- **Configuration**: `scripts/configs/batch-generation.json`
- **Documentation**: `scripts/README.md`
- **Examples**: `examples/script-usage-example.ts`

## Command Line Options

| Option          | Description                  | Default                   | Example                       |
| --------------- | ---------------------------- | ------------------------- | ----------------------------- |
| `--boards`      | Number of boards to generate | `120`                     | `--boards 200`                |
| `--rtp`         | Target RTP (0.0-1.0)         | `0.97`                    | `--rtp 0.95`                  |
| `--tolerance`   | RTP tolerance (±%)           | `0.01`                    | `--tolerance 0.02`            |
| `--max-retries` | Maximum generation attempts  | `10`                      | `--max-retries 20`            |
| `--output`      | Output filename              | `predefined-results.json` | `--output custom.json`        |
| `--rules`       | Custom rules JSON file       | -                         | `--rules ./my-rules.json`     |
| `--difficulty`  | Game difficulty              | `Medium`                  | `--difficulty Hard`           |
| `--description` | Chain description            | -                         | `--description "Test config"` |
| `--batch`       | Generate multiple configs    | -                         | `--batch`                     |
| `--dry-run`     | Validate without generating  | -                         | `--dry-run`                   |

## Output Structure

### Generated Files

All files are saved to the `output/` directory:

1. **`{name}.json`** - Complete board data with metadata
2. **`{name}-summary.txt`** - Human-readable summary

### JSON Structure

```json
{
  "metadata": {
    "generatedAt": "2024-01-01T12:00:00.000Z",
    "generatorVersion": "1.0.0",
    "config": { ... },
    "stats": { ... },
    "rtpResult": { ... }
  },
  "chainConfig": { ... },
  "boards": [
    {
      "boardIndex": 0,
      "board": [0, 1, 2, ...],
      "multipliers": [2, 5],
      "cascadeCount": 2,
      "totalCascadeWin": 15.5,
      "payoutResult": { ... },
      "isFreeSpin": false,
      "accumulatedMultiplier": 0,
      "remainingFreeSpins": 0
    }
    // ... more boards
  ]
}
```

## Usage Examples

### 1. Standard Gaming Session

```bash
npm run generate -- \
  --boards 120 \
  --rtp 0.97 \
  --output "standard-session.json" \
  --description "Standard 120-board gaming session"
```

### 2. High RTP Promotional Event

```bash
npx ts-node scripts/generate-predefined-results.ts \
  --boards 100 \
  --rtp 0.98 \
  --tolerance 0.015 \
  --difficulty "Easy" \
  --output "promo-event.json" \
  --description "High RTP promotional configuration"
```

### 3. Using Custom Payout Rules

```bash
npx ts-node scripts/generate-predefined-results.ts \
  --boards 80 \
  --rtp 0.96 \
  --rules "./examples/high-volatility-rules.json" \
  --output "high-volatility-session.json" \
  --description "High volatility with custom rules"
```

### 4. Quick Testing Configuration

```bash
npx ts-node scripts/generate-predefined-results.ts \
  --boards 30 \
  --rtp 0.95 \
  --tolerance 0.05 \
  --max-retries 5 \
  --output "quick-test.json"
```

### 5. Extended Marathon Session

```bash
npx ts-node scripts/generate-predefined-results.ts \
  --boards 250 \
  --rtp 0.965 \
  --tolerance 0.02 \
  --max-retries 25 \
  --difficulty "Medium" \
  --output "marathon-session.json" \
  --description "Extended 250-board marathon session"
```

## Batch Configurations

The `--batch` option generates 6 predefined configurations:

1. **Standard Balanced** (120 boards, 97% RTP, Medium)
2. **High RTP Player Friendly** (100 boards, 98% RTP, Easy)
3. **Conservative House Edge** (150 boards, 95% RTP, Hard)
4. **Extended Session** (200 boards, 96.5% RTP, Medium)
5. **Quick Demo** (50 boards, 97% RTP, Easy)
6. **Tournament Mode** (80 boards, 97.5% RTP, Medium)

## RTP Generation Notes

### Success Factors

- **Board Count**: Smaller chains (30-100 boards) are easier to balance
- **Tolerance**: Larger tolerance (±2-5%) allows more flexibility
- **Retries**: More retries increase chances of meeting targets
- **Target RTP**: Moderate targets (95-97%) are more achievable

### Common Challenges

- Very high RTP targets (98%+) may require many retries
- Small board counts with tight tolerance can be difficult
- Extreme difficulty settings may limit generation options

### Optimization Tips

1. **For Tight RTP Control**:

   ```bash
   --tolerance 0.01 --max-retries 20 --boards 100
   ```

2. **For Fast Generation**:

   ```bash
   --tolerance 0.03 --max-retries 5 --boards 50
   ```

3. **For Testing**:
   ```bash
   --dry-run  # Validate configuration first
   ```

## Integration with Custom Rules

### Using Existing Rules

```bash
# High volatility configuration
--rules "./examples/high-volatility-rules.json"

# Default rules (no --rules parameter needed)
```

### Creating Custom Rules

1. Create a JSON file following the `PayoutRulesConfig` structure
2. Reference it with the `--rules` parameter
3. The script will validate and load the custom rules

Example command:

```bash
npx ts-node scripts/generate-predefined-results.ts \
  --rules "./my-custom-rules.json" \
  --boards 100 \
  --output "custom-rules-result.json"
```

## Error Handling

The script includes comprehensive error handling:

- **Configuration Validation**: Checks parameter ranges and types
- **File Operations**: Graceful handling of missing files or permissions
- **Generation Failures**: Continues batch operations even if individual configs fail
- **Custom Rules**: Falls back to defaults if custom rules are invalid

## Performance Considerations

- **Generation Time**: Scales with board count and retry attempts
- **Memory Usage**: Large board counts (500+) may require significant memory
- **File Size**: Output files grow proportionally with board count
- **Batch Operations**: Run sequentially to avoid resource conflicts

## Troubleshooting

### Common Issues

1. **Long Generation Times**

   - Reduce board count or increase tolerance
   - Check if target RTP is realistic

2. **Cannot Meet RTP Target**

   - Increase `--max-retries`
   - Increase `--tolerance`
   - Try different difficulty level

3. **File Access Errors**

   - Ensure write permissions to output directory
   - Check available disk space

4. **Custom Rules Not Loading**
   - Verify JSON syntax is valid
   - Check file path is correct
   - Ensure all required fields are present

### Debug Commands

```bash
# Validate configuration without generation
npx ts-node scripts/generate-predefined-results.ts --dry-run --boards 100 --rtp 0.97

# Quick test with lenient parameters
npx ts-node scripts/generate-predefined-results.ts --boards 20 --tolerance 0.1 --max-retries 3

# Check help for all options
npm run generate:help
```

## NPM Scripts Reference

Add these to your workflow:

```json
{
  "scripts": {
    "generate": "npx ts-node scripts/generate-predefined-results.ts",
    "generate:batch": "npx ts-node scripts/generate-predefined-results.ts --batch",
    "generate:demo": "npx ts-node scripts/generate-predefined-results.ts --boards 50 --rtp 0.97 --output demo-results.json",
    "generate:help": "npx ts-node scripts/generate-predefined-results.ts --help"
  }
}
```

## Future Enhancements

Potential improvements for future versions:

- **Parallel Batch Generation**: Run multiple configurations simultaneously
- **Progress Indicators**: Show generation progress for long-running operations
- **Configuration Presets**: Save and load common configurations
- **Statistics Analysis**: Advanced analytics on generated chains
- **Export Formats**: Support for additional output formats (CSV, XML)
- **Real-time Validation**: Live RTP tracking during generation

## Conclusion

The Predefined Results Generation Script provides a powerful and flexible tool for creating controlled slot game experiences. Whether you need quick testing configurations or complex multi-chain setups, the script offers the configuration options and reliability needed for professional game development.

For detailed usage examples and advanced configurations, see:

- `scripts/README.md` - Detailed script documentation
- `examples/script-usage-example.ts` - Code examples
- `CUSTOM_PAYOUT_RULES_GUIDE.md` - Custom rules integration
