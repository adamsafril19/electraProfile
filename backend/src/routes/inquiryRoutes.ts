import { Router } from 'express';
import { InquiryController } from '../controllers/inquiryController';
import { inquiryLimiter } from '../middlewares/rateLimiter';

const router = Router();

router.post('/', inquiryLimiter, InquiryController.createInquiry);
router.get('/:code', InquiryController.getInquiryByCode);

export default router;
