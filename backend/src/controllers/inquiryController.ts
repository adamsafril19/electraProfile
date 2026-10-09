import { Request, Response, NextFunction } from 'express';
import { inquiryService } from '../services/inquiryService';
import { createInquirySchema } from '../validators/inquiryValidator';

export class InquiryController {
  public static async createInquiry(req: Request, res: Response, next: NextFunction) {
    try {
      const validatedData = createInquirySchema.parse(req.body);
      const inquiry = await inquiryService.createInquiry(validatedData);

      return res.status(201).json({
        success: true,
        message: 'Inquiry berhasil dicatat dan link WhatsApp tergenerasi',
        data: inquiry
      });
    } catch (error) {
      next(error);
    }
  }

  public static async getInquiryByCode(req: Request, res: Response, next: NextFunction) {
    try {
      const { code } = req.params;
      const inquiry = await inquiryService.getInquiryByCode(code);

      if (!inquiry) {
        return res.status(404).json({
          success: false,
          message: 'Inquiry dengan kode tersebut tidak ditemukan'
        });
      }

      return res.status(200).json({
        success: true,
        data: inquiry
      });
    } catch (error) {
      next(error);
    }
  }
}
