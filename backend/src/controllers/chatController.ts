import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ChatService } from '../services/chatService';

const createSchema = z.object({ name: z.string().max(60).optional() });
const sendSchema = z.object({ text: z.string().max(5000) });

// Endpoint publik: pelanggan hanya bisa mengakses sesi miliknya lewat ID rahasia
export class ChatController {
  public static async createSession(req: Request, res: Response, next: NextFunction) {
    try {
      const { name } = createSchema.parse(req.body ?? {});
      return res.status(201).json({ success: true, data: ChatService.createSession(name) });
    } catch (error) {
      next(error);
    }
  }

  public static async send(req: Request, res: Response, next: NextFunction) {
    try {
      const { text } = sendSchema.parse(req.body ?? {});
      return res.status(201).json({ success: true, data: ChatService.customerSend(req.params.id, text) });
    } catch (error) {
      next(error);
    }
  }

  public static async poll(req: Request, res: Response, next: NextFunction) {
    try {
      const after = typeof req.query.after === 'string' ? req.query.after : undefined;
      const result = ChatService.customerPoll(req.params.id, after);
      // Pelanggan yang sedang membuka jendela chat dianggap sudah membaca
      if (req.query.markRead === '1') ChatService.customerMarkRead(req.params.id);
      return res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}
