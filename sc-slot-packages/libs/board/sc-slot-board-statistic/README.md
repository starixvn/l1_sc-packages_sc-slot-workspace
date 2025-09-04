# 🎰 Enhanced Slot Board Statistics (MongoDB)

> **Version 2.0** - MongoDB-powered result chain generation and verification with simplified schema

A streamlined system for generating, storing, and analyzing slot machine result chains with **97% RTP target** and MongoDB persistence. Features JSON-based generation and simplified database schema.

## ✨ Key Features

### 🎯 Enhanced Result Chain Management
- **97% RTP Target**: Updated from 85% to meet higher payout requirements
- **Optimized Chain Length**: 100-150 boards per chain for optimal player engagement
- **MongoDB Persistence**: All chains stored with unique ObjectIds for tracking
- **Pattern-Based Generation**: 5 emotional engagement patterns (comeback, cliffhanger, discovery, tease, wave)

### 🗄️ Simplified Database Schema
- **Core Chain Data**: Essential chain information (name, boardsData, createdAt)
- **Separate Statistics**: RTP metrics and generation data in dedicated collection
- **Clean Separation**: Core data separate from analytics for better performance
- **Library Focus**: No player management - handled by external services

### 🛠️ JSON-Based Workflow
- **Chain Generation**: Generate chains and save to JSON files
- **Database Import**: Import JSON files to MongoDB collections
- **Pattern Testing**: Test different emotional engagement patterns
- **Database Management**: Reset, seed, and manage test data

### 🗄️ MongoDB Integration
- **Mongoose ODM**: Type-safe MongoDB operations with schema validation
- **Optimized Indexes**: Performance-optimized database indexes
- **Aggregation Pipelines**: Powerful analytics using MongoDB aggregations
- **Connection Pooling**: Efficient database connection management

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MongoDB 5+ (local or cloud)
- npm 9+

### Installation

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your MongoDB connection string

# Test database connection
npm run db:connect

# Build the project
npm run build
```

### Environment Configuration

Create a `.env` file with your MongoDB configuration:

```env
# MongoDB Configuration (Replica Set)
MONGODB_URI=mongodb://lmn_backend:LmnBackend@10.10.50.12:39202,10.10.50.13:39202,10.10.50.14:39202/?replicaSet=L2ppLocal&appName=resultChain
DB_NAME=minigame
DB_MAX_CONNECTIONS=10
DB_CONNECTION_TIMEOUT=10000

# Application Configuration
NODE_ENV=development
DEBUG_MODE=true

# Generation Configuration
DEFAULT_TARGET_RTP=0.97
DEFAULT_BOARD_COUNT=125
```

### Test the System

```bash
# 1. Test database connection
npm run db:connect

# 2. Generate result chains (saves to JSON files)
npm run generate-chains 125 comeback,wave

# 3. Import chains to database
npm run import-chains

# 4. View results (check MongoDB collections)
```

## 📋 Available Scripts

### Chain Generation
```bash
# Generate chains with specific parameters (board count and patterns)
npm run generate-chains 125 comeback,wave

# Generate chains with different board counts
npm run generate-chains 100 cliffhanger
npm run generate-chains 150 discovery,tease

# All available patterns: comeback,cliffhanger,discovery,tease,wave
```

### Chain Import
```bash
# Import all JSON files from chain-output directory
npm run import-chains

# Import with custom settings (see script help)
npm run import-chains -- --help
```

### Database Management
```bash
# Test database connection
npm run db:connect

# Reset database (careful!)
npm run db:reset -- --confirm

# Reset with index rebuild
npm run db:reset -- --confirm --rebuild-indexes
```

### Development
```bash
# Build TypeScript
npm run build

# Run tests
npm run test

# Lint code
npm run lint

# Fix linting issues
npm run lint:fix
```

## 🎭 Engagement Patterns

### Available Patterns

| Pattern | Description | Risk Profile | RTP Contribution | Boards |
|---------|-------------|--------------|------------------|--------|
| **Comeback** | Recovery-focused for loss-averse players | loss-averse | 15% | 100-150 |
| **Cliffhanger** | High-suspense for thrill-seekers | risk-seeker | 25% | 100-150 |
| **Discovery** | Exploration-reward for curious players | explorer | 18% | 100-150 |
| **Tease** | Near-miss leveraging for anticipation | mixed | 20% | 100-150 |
| **Wave** | Rhythmic engagement for balanced play | mixed | 22% | 100-150 |

### Pattern Generation Examples

```bash
# Generate all patterns with default settings
npm run generate-chains

# Generate specific patterns with different board counts
npm run generate-chains -- --patterns comeback,wave --board-counts 125,150

# Generate high-accuracy chains
npm run generate-chains -- --target-rtp 0.97 --tolerance 0.01 --max-retries 20
```

## 🗄️ MongoDB Schema

### Collections

#### `result_chains`
Stores generated result chains with pattern configuration and performance data.

```typescript
{
  _id: ObjectId,
  name: string,                    // Unique chain name
  patternType: string,            // Pattern type (comeback, cliffhanger, etc.)
  boardCount: number,             // Number of boards (100-150)
  targetRTP: number,              // Target RTP (0.97)
  actualRTP: number,              // Achieved RTP
  rtpVariance: number,            // Variance from target
  totalWagered: number,           // Total bet amount
  totalWon: number,               // Total payout
  generationAttempts: number,     // Attempts to achieve RTP
  generationDuration: number,     // Generation time (ms)
  configJson: object,             // Full generation config
  boardsData: array,              // All board results
  tumbleStats: object,            // Tumble statistics
  generationStats: object,        // Generation performance
  status: string,                 // active, archived, testing
  createdAt: Date,
  updatedAt: Date
}
```

#### `result_chain_statistics`
Statistics and metrics for result chains.

```typescript
{
  _id: ObjectId,
  resultChainName: string,        // Reference to result chain by name
  patternType: string,            // comeback, cliffhanger, discovery, tease, wave
  boardCount: number,             // 100-150
  targetRTP: number,              // Usually 0.97 (97%)
  actualRTP: number,              // Calculated actual RTP
  rtpVariance: number,            // Difference from target
  totalWagered: number,
  totalWon: number,
  generationAttempts: number,     // Generation attempts needed
  generationDuration: number,     // Generation time in ms
  configJson: object,             // Pattern configuration used
  tumbleStats: object,            // Cascade/tumble statistics
  generationStats: object,        // Detailed generation metrics
  status: string,                 // active, archived, testing
  createdBy?: string,
  createdAt: Date
}
```

### Indexes

Optimized indexes for performance:

```javascript
// result_chains
{ name: 1 }                     // Unique
{ createdAt: -1 }               // Recent first

// result_chain_statistics
{ patternType: 1, actualRTP: -1 }
{ status: 1, createdAt: -1 }
{ boardCount: 1, targetRTP: 1 }
{ resultChainName: "text" }     // Text search
```

## 🧪 Testing Workflow

### 1. Database Setup
```bash
# Test connection
npm run db:connect

# Reset database (if needed)
npm run db:reset -- --confirm
```

### 2. Generate Result Chains
```bash
# Generate test chains (all patterns)
npm run generate-chains

# Check generation results
# - View MongoDB collections
# - Check generation logs
# - Verify RTP accuracy
```

### 3. Import to Database
```bash
# Import generated chains to MongoDB
npm run import-chains

# Verify results:
# - Check result_chains collection for core data
# - Check result_chain_statistics collection for metrics
# - Confirm proper linking between collections
```

### 4. Analyze Results
```bash
# Check MongoDB collections:
# - result_chains: Core chain data (name, boardsData, createdAt)
# - result_chain_statistics: RTP metrics and generation statistics

# View chain statistics
npm run db:connect  # Opens database connection for manual queries
```

## 🔧 Configuration

### RTP Configuration
The system targets **97% RTP** with configurable tolerance:

```typescript
{
  targetRTP: 0.97,
  tolerance: 0.02,           // ±2% variance allowed
  maxRetries: 10,            // Maximum generation attempts
  supportedRTPTargets: [0.94, 0.95, 0.96, 0.97, 0.98]
}
```

### Chain Configuration
```typescript
{
  supportedChainLengths: [100, 125, 150],
  defaultBoardCount: 125,
  supportedPatterns: ["comeback", "cliffhanger", "discovery", "tease", "wave"]
}
```

### Database Configuration
```typescript
{
  collections: ["result_chains", "result_chain_statistics"],
  connectionUri: "mongodb://lmn_backend:LmnBackend@10.10.50.12:39202,10.10.50.13:39202,10.10.50.14:39202/?replicaSet=L2ppLocal&appName=resultChain",
  database: "minigame",
  indexes: ["name", "createdAt", "patternType", "actualRTP"],
  replicaSet: "L2ppLocal",
  authentication: true
}
```

## 📊 Data Analysis

### Chain Performance Queries

```javascript
// Get all result chains
db.result_chains.find().sort({ createdAt: -1 });

// Get chain statistics by pattern
db.result_chain_statistics.aggregate([
  { $match: { status: "active" } },
  { $group: {
    _id: "$patternType",
    avgRTP: { $avg: "$actualRTP" },
    count: { $sum: 1 },
    avgBoardCount: { $avg: "$boardCount" }
  }}
]);

// Find best performing chains
db.result_chain_statistics.find({ status: "active" })
  .sort({ actualRTP: -1 })
  .limit(10);
```

### Chain Statistics Queries

```javascript
// RTP accuracy analysis
db.result_chain_statistics.aggregate([
  {
    $project: {
      resultChainName: 1,
      patternType: 1,
      actualRTP: 1,
      targetRTP: 1,
      rtpAccuracy: { $abs: { $subtract: ["$actualRTP", "$targetRTP"] } }
    }
  },
  { $match: { rtpAccuracy: { $lte: 0.02 } } }  // Within 2% tolerance
]);

// Generation performance
db.result_chain_statistics.aggregate([
  { $group: {
    _id: "$patternType",
    avgAttempts: { $avg: "$generationAttempts" },
    avgDuration: { $avg: "$generationDuration" },
    successRate: { $avg: { $cond: [{ $lte: ["$rtpVariance", 0.02] }, 1, 0] } }
  }}
]);
```

### Data Export Queries

```javascript
// Export chain data with statistics
db.result_chains.aggregate([
  { $lookup: {
    from: "result_chain_statistics",
    localField: "name", 
    foreignField: "resultChainName",
    as: "statistics"
  }},
  { $unwind: "$statistics" },
  { $project: {
    name: 1,
    createdAt: 1,
    boardCount: { $size: "$boardsData" },
    patternType: "$statistics.patternType",
    actualRTP: "$statistics.actualRTP",
    generationAttempts: "$statistics.generationAttempts"
  }}
]);
```

## 🚀 Production Considerations

### MongoDB Setup
- Use MongoDB Atlas or properly configured replica set
- Enable authentication and SSL/TLS
- Configure connection pooling appropriately
- Set up monitoring and alerting

### Performance Optimization
- Ensure proper indexing for query patterns
- Use aggregation pipelines for complex analytics
- Consider sharding for very large datasets
- Monitor query performance and optimization

### Data Management
- Implement data archival strategy
- Set up regular backups
- Monitor disk usage and growth
- Plan for data retention policies

## 🛠️ Development

### Project Structure
```
src/
├── database/
│   ├── connection.ts                    # MongoDB connection
│   ├── models/                          # Mongoose models
│   │   ├── result-chain.model.ts        # Core chain data
│   │   └── result-chain-statistics.model.ts  # RTP & generation metrics
│   └── repositories/                    # Data access layer
├── scripts/                             # Generation & import scripts
│   ├── generate-chains.ts               # Generate chains to JSON
│   └── import-chains.ts                 # Import JSON to MongoDB
└── cascading-slot/                      # Pattern configurations
```

### Adding New Features

1. **New Patterns**: Add to `engagement-patterns.ts`
2. **New Scripts**: Create in `scripts/` directory
3. **Schema Changes**: Update Mongoose models and repositories
4. **New Repositories**: Create data access methods for new collections

### Testing Strategy

1. **Unit Tests**: Individual component testing
2. **Integration Tests**: Database integration testing  
3. **Script Tests**: End-to-end workflow testing
4. **Performance Tests**: Load and stress testing

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/enhancement`
3. Make changes and add tests
4. Run the test suite: `npm test`
5. Test with scripts: `npm run generate-chains 125 comeback && npm run import-chains`
6. Submit a pull request

### Code Standards
- TypeScript with strict mode
- ESLint configuration provided
- Comprehensive error handling
- Script-based testing
- MongoDB best practices

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

For issues, questions, or feature requests:
1. Check the script output for detailed error messages
2. Verify MongoDB connection and data
3. Review the [troubleshooting section](#troubleshooting)  
4. Submit an issue on the repository

## 🔍 Troubleshooting

### Common Issues

**MongoDB Connection Failed**
```bash
# Check MongoDB is running
npm run db:connect

# Verify connection string in .env
MONGODB_URI=mongodb://lmn_backend:LmnBackend@10.10.50.12:39202,10.10.50.13:39202,10.10.50.14:39202/?replicaSet=L2ppLocal&appName=resultChain
DB_NAME=minigame
```

**No Chains Found**
```bash
# Generate chains first
npm run generate-chains 125 comeback

# Check generated chains
npm run import-chains
# Query: db.result_chains.find().sort({createdAt: -1})
```

**Import Failed**
```bash
# Check JSON files exist
ls chain-output/

# Check file format
npm run import-chains -- --help
```

**RTP Target Not Met**
```bash
# Try different patterns or board counts
npm run generate-chains 150 wave
npm run generate-chains 100 discovery

# Check generation statistics in JSON files
cat chain-output/generation-summary-*.json
```

---

**Version**: 2.0.0 (MongoDB)  
**Last Updated**: December 2024  
**Status**: ✅ Production Ready with Script-Based Testing