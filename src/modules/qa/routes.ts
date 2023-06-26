import express from 'express';
import * as qAController from './controller';

const router = express.Router();

router.post('/qa', qAController.analyseAnswer);
router.post('/analyseAnswerQuestion', qAController.analyseAnswerQuestion);
router.get('/getPdfData', qAController.extractPdfData);
router.post('/summarizeData', qAController.summarizeChapterData);

export = router;
