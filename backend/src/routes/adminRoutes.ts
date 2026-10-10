import { Router } from 'express';
import { AdminController } from '../controllers/adminController';
import { requireAdmin } from '../middlewares/requireAdmin';
import { adminLoginLimiter } from '../middlewares/rateLimiter';

const router = Router();

// Satu-satunya endpoint admin yang terbuka
router.post('/login', adminLoginLimiter, AdminController.login);

// Selebihnya wajib token admin
router.use(requireAdmin);
router.get('/me', AdminController.me);
router.get('/summary', AdminController.summary);
router.get('/inquiries', AdminController.listInquiries);
router.patch('/inquiries/:id/status', AdminController.updateInquiryStatus);
router.put('/inquiries/:id/driver', AdminController.assignDriver);
router.get('/fleet', AdminController.listFleet);
router.patch('/fleet/:id', AdminController.updateVehicle);

router.get('/drivers', AdminController.listDrivers);
router.post('/drivers', AdminController.createDriver);
router.patch('/drivers/:id', AdminController.updateDriver);
router.post('/drivers/:id/time-off', AdminController.addDriverTimeOff);
router.delete('/drivers/:id/time-off/:timeOffId', AdminController.removeDriverTimeOff);

router.get('/calendar', AdminController.calendar);
router.get('/calendar.ics', AdminController.calendarIcs);

router.get('/finance/summary', AdminController.financeSummary);
router.get('/finance/ledger', AdminController.financeLedger);
router.get('/inquiries/:id/finance', AdminController.inquiryFinance);
router.post('/payments', AdminController.createPayment);
router.post('/payments/:id/void', AdminController.voidPayment);
router.post('/expenses', AdminController.createExpense);
router.post('/expenses/:id/void', AdminController.voidExpense);

router.get('/chat/sessions', AdminController.chatSessions);
router.get('/chat/sessions/:id/messages', AdminController.chatMessages);
router.post('/chat/sessions/:id/messages', AdminController.chatReply);

router.get('/badges', AdminController.badges);

export default router;
