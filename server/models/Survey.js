import mongoose from 'mongoose';

const surveySchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  description: String,
  criteria: {
    ageMin: Number,
    ageMax: Number,
    income: String,
    jobTitle: String,
    location: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model('Survey', surveySchema);
