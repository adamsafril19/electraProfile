import { Request, Response, NextFunction } from 'express';
import { inquiryService } from '../services/inquiryService';
import { socHandoverSchema, socReturnSchema } from '../validators/inquiryValidator';

export class SocController {
  public static async recordHandover(req: Request, res: Response, next: NextFunction) {
    try {
      const validatedData = socHandoverSchema.parse(req.body);
      const log = await inquiryService.recordHandoverSoc(validatedData);

      return res.status(201).json({
        success: true,
        message: 'Serah terima awal kendaraan & level baterai (SoC) berhasil dicatat',
        data: log
      });
    } catch (error) {
      next(error);
    }
  }

  public static async recordReturn(req: Request, res: Response, next: NextFunction) {
    try {
      const validatedData = socReturnSchema.parse(req.body);
      const log = await inquiryService.recordReturnSoc(validatedData);

      return res.status(200).json({
        success: true,
        message: 'Pengembalian unit & level baterai (SoC) berhasil diverifikasi',
        data: {
          log,
          recoveryFee: log.recoveryFeeAmount,
          warningMessage:
            log.recoveryFeeAmount > 0
              ? `Level baterai kembali ${log.returnSocPct}% (<20%). Biaya pemulihan baterai Rp ${log.recoveryFeeAmount.toLocaleString('id-ID')} dipotong dari deposit.`
              : 'Level baterai sesuai ketentuan (>=20%). Tidak ada penalti baterai.'
        }
      });
    } catch (error) {
      next(error);
    }
  }
}
