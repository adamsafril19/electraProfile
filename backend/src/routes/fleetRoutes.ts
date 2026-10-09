import { Router } from 'express';
import { FleetController } from '../controllers/fleetController';

const router = Router();

router.get('/', FleetController.getAllFleet);
router.get('/:slug', FleetController.getFleetBySlug);

export default router;
