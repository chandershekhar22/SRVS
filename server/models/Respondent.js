import mongoose from 'mongoose';

const respondentSchema = new mongoose.Schema({
  panelId: {
    type: String,
    required: true,
  },
  hashedData: {
    type: String,
    required: true,
  },
  proofStatus: {
    type: String,
    enum: ['pending', 'verified', 'failed'],
    default: 'pending',
  },
  verificationResults: mongoose.Schema.Types.Mixed,
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model('Respondent', respondentSchema);
