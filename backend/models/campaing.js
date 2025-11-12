import mongoose from 'mongoose';

const candidateSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: true
  },
  foto: String,
  propuestas: String,
  votos: {
    type: Number,
    default: 0
  }
});

const campaignSchema = new mongoose.Schema({
  titulo: {
    type: String,
    required: true,
    trim: true
  },
  descripcion: {
    type: String,
    required: true
  },
  estado: {
    type: String,
    enum: ['habilitada', 'deshabilitada', 'cerrada'],
    default: 'deshabilitada',
    index: true,
  },
  fechaInicio: {
    type: Date,
    required: false,
    default: null,
  },
  fechaFin: {
    type: Date,
    required: true,
    index: true,
  },
  candidatos: [candidateSchema],
  totalVotos: {
    type: Number,
    default: 0
  },
  // Nuevo: Registro de votos por iglesia
  votosPorIglesia: [{
    iglesiaId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Iglesia'
    },
    votosUsados: {
      type: Number,
      default: 0
    }
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

campaignSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

export default mongoose.model('Campaign', campaignSchema);