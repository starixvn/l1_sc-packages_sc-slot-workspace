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
        }]
}, {
    timestamps: { createdAt: true, updatedAt: false },
    collection: 'result_chains'
});
// Simple indexes for performance
ResultChainSchema.index({ name: 1 });
ResultChainSchema.index({ createdAt: -1 });
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
