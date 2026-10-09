import { Request, Response, NextFunction } from 'express';
import { fleetService } from '../services/fleetService';
import { BodyType } from '../types';

export class FleetController {
  public static async getAllFleet(req: Request, res: Response, next: NextFunction) {
    try {
      const { bodyType, status } = req.query;
      const vehicles = await fleetService.getAllVehicles({
        bodyType: bodyType as BodyType,
        status: status as string
      });

      return res.status(200).json({
        success: true,
        count: vehicles.length,
        data: vehicles
      });
    } catch (error) {
      next(error);
    }
  }

  public static async getFleetBySlug(req: Request, res: Response, next: NextFunction) {
    try {
      const { slug } = req.params;
      const vehicle = await fleetService.getVehicleBySlug(slug);

      if (!vehicle) {
        return res.status(404).json({
          success: false,
          message: 'Kendaraan tidak ditemukan'
        });
      }

      return res.status(200).json({
        success: true,
        data: vehicle
      });
    } catch (error) {
      next(error);
    }
  }
}
