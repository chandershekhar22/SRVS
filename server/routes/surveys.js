import express from 'express';
import * as surveyController from '../controllers/surveyController.js';

const router = express.Router();

router.get('/', surveyController.getSurveys);
router.get('/:id', surveyController.getSurvey);
router.post('/', surveyController.createSurvey);
router.put('/:id', surveyController.updateSurvey);
router.delete('/:id', surveyController.deleteSurvey);

export default router;
