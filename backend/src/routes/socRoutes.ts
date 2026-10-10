import { Router } from 'express';
import { SocController } from '../controllers/socController';
import { requireAdmin } from '../middlewares/requireAdmin';

const router = Router();

// Pencatatan SoC hanya untuk admin/staff (sesuai PRD)
router.post('/handover', requireAdmin, SocController.recordHandover);
router.post('/return', requireAdmin, SocController.recordReturn);

export default router;
