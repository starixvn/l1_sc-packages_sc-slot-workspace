# Predefined Results Generation Scripts

This directory contains scripts for generating predefined slot game result chains.

## Main Script

### `generate-predefined-results.ts`

A comprehensive CLI tool for generating predefined result chains with various configurations.

## Usage

### Quick Start

```bash
# Generate default configuration (120 boards, 97% RTP)
npm run generate

# Generate batch of multiple configurations
npm run generate:batch

# Generate quick demo (50 boards)
npm run generate:demo

# Show help
npm run generate:help
```

### Advanced Usage

```bash
# Custom configuration
npx ts-node scripts/generate-predefined-results.ts \
  --boards 200 \
  --rtp 0.96 \
  --tolerance 0.02 \
  --max-retries 15 \
  --output "custom-config.json" \
  --difficulty "Hard" \
  --description "Custom high variance configuration"

# Using custom payout rules
npx ts-node scripts/generate-predefined-results.ts \
  --boards 100 \
  --rtp 0.98 \
  --rules "./examples/high-volatility-rules.json" \
  --output "high-volatility-results.json"

# Dry run to check configuration
npx ts-node scripts/generate-predefined-results.ts \
  --boards 150 \
  --rtp 0.95 \
  --dry-run
```

## Command Line Options

| Option          | Short | Description                                 | Default                   |
| --------------- | ----- | ------------------------------------------- | ------------------------- |
| `--boards`      | `-b`  | Number of boards to generate                | `120`                     |
| `--rtp`         | `-r`  | Target RTP (0.0-1.0)                        | `0.97`                    |
| `--tolerance`   | `-t`  | RTP tolerance                               | `0.01`                    |
| `--max-retries` | `-m`  | Maximum generation retries                  | `10`                      |
| `--output`      | `-o`  | Output file path (relative to output/)      | `predefined-results.json` |
| `--rules`       | `-R`  | Custom rules JSON file                      | -                         |
| `--difficulty`  | `-d`  | Difficulty level (Easy, Medium, Hard)       | `Medium`                  |
| `--description` | `-D`  | Description for the generated chain         | -                         |
| `--batch`       |       | Generate multiple predefined configurations | -                         |
| `--dry-run`     |       | Show configuration without generating       | -                         |

## Output Structure

Generated files are saved to the `output/` directory with the following structure:

### JSON Output

```json
{
  "metadata": {
    "generatedAt": "2024-01-01T12:00:00.000Z",
    "generatorVersion": "1.0.0",
    "config": {
      "boardCount": 120,
      "targetRTP": 0.97,
      "tolerance": 0.01,
      "maxRetries": 10,
      "difficulty": "Medium",
      "description": "..."
    },
    "stats": {
      "attempts": 3,
      "duration": 1250,
      "finalRTP": 0.9698,
      "averageWin": 0.9698
    },
    "rtpResult": {
      "actualRTP": 0.9698,
      "totalBets": 120,
      "totalWins": 116.376,
      "meetsTarget": true,
      "variance": 0.0012
    }
  },
  "chainConfig": { ... },
  "boards": [
    {
      "boardIndex": 0,
      "board": [0, 1, 2, ...],
      "multipliers": [2, 5],
      "cascadeCount": 2,
      "totalCascadeWin": 15.5,
      "payoutResult": {
        "totalWin": 10.0,
        "symbolWins": [...],
        "scatterWin": {...},
        "winningSymbols": [0, 5, 12],
        "multiplierOrbValue": 3,
        "triggersFreeSpin": false,
        "freeSpinsAwarded": 0
      },
      "isFreeSpin": false,
      "accumulatedMultiplier": 0,
      "remainingFreeSpins": 0
    }
    // ... more boards
  ]
}
```

### Summary Output

A human-readable `.txt` summary is also generated with:

- Configuration details
- Generation statistics
- Win distribution analysis
- Board statistics

## Batch Configurations

The `--batch` option generates multiple predefined configurations:

1. **Standard Balanced** - 120 boards, 97% RTP, medium difficulty
2. **High RTP Player Friendly** - 100 boards, 98% RTP, easy difficulty
3. **Conservative House Edge** - 150 boards, 95% RTP, hard difficulty
4. **Extended Session** - 200 boards, 96.5% RTP, medium difficulty
5. **Quick Demo** - 50 boards, 97% RTP, easy difficulty
6. **Tournament Mode** - 80 boards, 97.5% RTP, medium difficulty

## Custom Rules Integration

To use custom payout rules:

1. Create a custom rules JSON file (see `examples/high-volatility-rules.json`)
2. Use the `--rules` option to specify the file path
3. The generator will load and apply the custom rules

Example:

```bash
npx ts-node scripts/generate-predefined-results.ts \
  --rules "./examples/high-volatility-rules.json" \
  --boards 100 \
  --output "high-volatility-chain.json"
```

## Error Handling

The script includes comprehensive error handling:

- **Validation**: Checks for valid RTP range (0.0-1.0), board count (1-1000)
- **File Operations**: Graceful handling of file read/write errors
- **Generation Failures**: Continues batch generation even if individual configs fail
- **Custom Rules**: Falls back to default rules if custom rules fail to load

## Performance Considerations

- Generation time scales with board count and retry attempts
- Complex configurations (high RTP with tight tolerance) may require more retries
- Batch generation runs configurations sequentially to avoid memory issues
- Large board counts (500+) may take several minutes to generate

## Examples

### Standard Gaming Session

```bash
npm run generate -- --boards 120 --rtp 0.97 --output "gaming-session.json"
```

### High Stakes Configuration

```bash
npm run generate -- \
  --boards 80 \
  --rtp 0.95 \
  --tolerance 0.01 \
  --difficulty "Hard" \
  --description "High stakes with tight variance"
```

### Promotional Event

```bash
npm run generate -- \
  --boards 100 \
  --rtp 0.98 \
  --difficulty "Easy" \
  --description "Player-friendly promotional event"
```

## Troubleshooting

### Common Issues

1. **Generation Takes Too Long**

   - Reduce `--max-retries` or increase `--tolerance`
   - Lower the target RTP slightly

2. **Cannot Meet RTP Target**

   - Increase `--tolerance` (e.g., 0.02 instead of 0.01)
   - Increase `--max-retries`
   - Check if target RTP is realistic for the configuration

3. **Custom Rules Not Loading**

   - Verify the JSON file path is correct
   - Check JSON syntax is valid
   - Ensure all required fields are present

4. **Output Directory Issues**
   - The script automatically creates the `output/` directory
   - Check file permissions if write operations fail

### Debug Mode

For troubleshooting, use the `--dry-run` option to validate configuration without generation:

```bash
npm run generate -- --boards 150 --rtp 0.96 --dry-run
```

This shows the parsed configuration and validates parameters without starting generation.
