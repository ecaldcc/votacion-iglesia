// models/User.js
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs/dist/bcrypt.js';

const userSchema = new mongoose.Schema({
  numeroColegiado: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  nombreCompleto: {
    type: String,
    required: true,
    trim: true
  },
  correo: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  dpi: {
    type: String,
    required: true,
    unique: true,
    length: 13
  },
  fechaNacimiento: {
    type: Date,
    required: true
  },
  password: {
    type: String,
    required: true,
    minlength: 8
  },
  role: {
    type: String,
    enum: ['voter', 'admin'],
    default: 'voter'
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true,
  },
  votedCampaigns: [{
    campaignId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Campaign'
    },
    votedAt: {
      type: Date,
      default: Date.now
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Hash de password antes de guardar
userSchema.pre('save', async function(next) {
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
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model('User', userSchema)
