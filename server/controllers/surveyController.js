import Survey from '../models/Survey.js';

// Get all surveys
export const getSurveys = async (req, res) => {
  try {
    const surveys = await Survey.find();
    res.json(surveys);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get single survey
export const getSurvey = async (req, res) => {
  try {
    const survey = await Survey.findById(req.params.id);
    if (!survey) return res.status(404).json({ message: 'Survey not found' });
    res.json(survey);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create survey
export const createSurvey = async (req, res) => {
  const survey = new Survey(req.body);
  try {
    const newSurvey = await survey.save();
    res.status(201).json(newSurvey);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Update survey
export const updateSurvey = async (req, res) => {
  try {
    const survey = await Survey.findById(req.params.id);
    if (!survey) return res.status(404).json({ message: 'Survey not found' });
    
    Object.assign(survey, req.body);
    const updatedSurvey = await survey.save();
    res.json(updatedSurvey);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Delete survey
export const deleteSurvey = async (req, res) => {
  try {
    const survey = await Survey.findByIdAndDelete(req.params.id);
    if (!survey) return res.status(404).json({ message: 'Survey not found' });
    res.json({ message: 'Survey deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
