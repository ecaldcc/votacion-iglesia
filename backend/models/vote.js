import mongoose from 'mongoose';

const voteSchema = new mongoose.Schema({
  campaignId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Campaign',
    required: true,
    index: true  // ← AGREGAR
  },
  iglesiaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Iglesia',
    required: true,
    index: true  // ← AGREGAR
  },
  candidateId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  votedAt: {
    type: Date,
    default: Date.now,
    index: true  // ← AGREGAR
  },
  ipAddress: String,
  userAgent: String
});

// Índice compuesto para contar votos rápidamente
voteSchema.index({ campaignId: 1, iglesiaId: 1 });

export default mongoose.model('Vote', voteSchema);