import mongoose from 'mongoose';
import bcrypt from 'bcryptjs/dist/bcrypt.js';

const iglesiaSchema = new mongoose.Schema({
  codigo: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  nombre: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  votosAsignados: {
    type: Number,
    required: true,
    min: 1
  },
  password: {
    type: String,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  // ✅ NUEVO: Campo para sesión única
  currentSessionId: {
    type: String,
    default: null
  },
  lastLoginAt: {
    type: Date,
    default: null
  },
  lastLoginDevice: {
    type: String,
    default: null
  },
  votedCampaigns: [{
    campaignId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Campaign'
    },
    votosUsados: {
      type: Number,
      default: 0
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Hash de password antes de guardar
iglesiaSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Método para comparar passwords
iglesiaSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model('Iglesia', iglesiaSchema);