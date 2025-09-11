import mongoose, { Schema } from 'mongoose';
// Simplified Schema Definition
const ResultChainSchema = new Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        maxlength: 255,
        index: true
    },
    boardsData: [{
            type: Schema.Types.Mixed,
            required: true
        }],
    betLevel: {
        type: Number,
        required: true,
        min: 0.1,
        max: 10.0,
        default: 0.5,
        index: true
    },
    coinValue: {
        type: Number,
        required: true,
        min: 0.01,
        max: 1.0,
        default: 0.1,
        index: true
    }
}, {
    timestamps: { createdAt: true, updatedAt: false },
    collection: 'result_chains'
});
// Simple indexes for performance
ResultChainSchema.index({ name: 1 });
ResultChainSchema.index({ createdAt: -1 });
ResultChainSchema.index({ betLevel: 1, coinValue: 1 }); // For player bet selection
// Static methods
ResultChainSchema.statics.findByName = function (name) {
    return this.findOne({ name });
};
ResultChainSchema.statics.findRecent = function (limit = 10) {
    return this.find({}).sort({ createdAt: -1 }).limit(limit);
};
// Post-save middleware
ResultChainSchema.post('save', function (doc) {
    const boardCount = doc.boardsData?.length || 0;
    console.log(`📊 Result chain saved: ${doc.name} (${boardCount} boards)`);
});
// Create and export the model
export const ResultChain = mongoose.model('ResultChain', ResultChainSchema);
export default ResultChain;
