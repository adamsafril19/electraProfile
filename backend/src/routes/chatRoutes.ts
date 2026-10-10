import { Router } from 'express';
import { ChatController } from '../controllers/chatController';
import { chatPollLimiter, chatSendLimiter, chatSessionLimiter } from '../middlewares/rateLimiter';

const router = Router();

router.post('/sessions', chatSessionLimiter, ChatController.createSession);
router.post('/sessions/:id/messages', chatSendLimiter, ChatController.send);
router.get('/sessions/:id/messages', chatPollLimiter, ChatController.poll);

export default router;
