import { Router } from 'express';
import fleetRoutes from './fleetRoutes';
import inquiryRoutes from './inquiryRoutes';
import socRoutes from './socRoutes';

const router = Router();

// Health Check
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'online',
    timestamp: new Date().toISOString(),
    service: 'Electra EV Rental API'
  });
});

router.use('/fleet', fleetRoutes);
router.use('/inquiries', inquiryRoutes);
router.use('/soc', socRoutes);

export default router;
