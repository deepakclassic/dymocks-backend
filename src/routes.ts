import { Router } from 'express';
import qaRouter from './modules/qa/routes';

const router = Router();

router.use('/v1/question', qaRouter);

export default router;
