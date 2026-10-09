import { Router } from 'express';
import { SocController } from '../controllers/socController';

const router = Router();

router.post('/handover', SocController.recordHandover);
router.post('/return', SocController.recordReturn);

export default router;
