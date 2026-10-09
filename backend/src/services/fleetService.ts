import { MOCK_FLEET } from '../data/mockFleet';
import { Vehicle, BodyType, ServiceType, PortType } from '../types';
import { prisma } from '../config/database';

export class FleetService {
  private fallbackFleet: Vehicle[] = [...MOCK_FLEET];

  public async getAllVehicles(filter?: { bodyType?: BodyType; status?: string }): Promise<Vehicle[]> {
    try {
      const dbVehicles = await prisma.vehicle.findMany({
        where: {
          isActive: true,
          ...(filter?.bodyType ? { bodyType: filter.bodyType as any } : {}),
          ...(filter?.status ? { status: filter.status as any } : {}),
        },
        include: {
          specs: true,
          rates: true,
        },
      });

      if (dbVehicles && dbVehicles.length > 0) {
        return dbVehicles.map(v => this.mapDbVehicleToType(v));
      }
    } catch (error: any) {
      console.warn('⚠️ [FleetService] Database offline/kosong, menggunakan data fallback:', error.message);
    }

    // Fallback data
    return this.fallbackFleet.filter(v => {
      if (!v.isActive) return false;
      if (filter?.bodyType && v.bodyType !== filter.bodyType) return false;
      if (filter?.status && v.status !== filter.status) return false;
      return true;
    });
  }

  public async getVehicleBySlug(slug: string): Promise<Vehicle | undefined> {
    try {
      const dbVehicle = await prisma.vehicle.findUnique({
        where: { slug },
        include: { specs: true, rates: true },
      });

      if (dbVehicle && dbVehicle.isActive) {
        return this.mapDbVehicleToType(dbVehicle);
      }
    } catch (error: any) {
      console.warn('⚠️ [FleetService] Database offline, menggunakan data fallback untuk slug:', slug);
    }

    return this.fallbackFleet.find(v => v.slug === slug && v.isActive);
  }

  public async getVehicleById(id: string): Promise<Vehicle | undefined> {
    try {
      const dbVehicle = await prisma.vehicle.findUnique({
        where: { id },
        include: { specs: true, rates: true },
      });

      if (dbVehicle && dbVehicle.isActive) {
        return this.mapDbVehicleToType(dbVehicle);
      }
    } catch (error: any) {
      console.warn('⚠️ [FleetService] Database offline, menggunakan data fallback untuk ID:', id);
    }

    return this.fallbackFleet.find(v => v.id === id && v.isActive);
  }

  private mapDbVehicleToType(v: any): Vehicle {
    return {
      id: v.id,
      slug: v.slug,
      brand: v.brand,
      model: v.model,
      bodyType: v.bodyType as BodyType,
      licensePlate: v.licensePlate,
      imageUrl: v.imageUrl,
      thumbnailUrl: v.thumbnailUrl,
      status: v.status,
      isActive: v.isActive,
      tags: v.tags || [],
      specs: {
        batteryCapacityKwh: Number(v.specs?.batteryCapacityKwh || 0),
        rangeCltcKm: v.specs?.rangeCltcKm || 0,
        rangeWltpKm: v.specs?.rangeWltpKm || undefined,
        portType: (v.specs?.portType as PortType) || 'CCS2',
        maxAcKw: Number(v.specs?.maxAcKw || 7.0),
        maxDcKw: v.specs?.maxDcKw ? Number(v.specs.maxDcKw) : undefined,
        seatingCapacity: v.specs?.seatingCapacity || 5,
        portableChargerIncluded: v.specs?.portableChargerIncluded ?? true,
        gbtAdapterIncluded: v.specs?.gbtAdapterIncluded ?? false,
        chargingTimeAcHours: Number(v.specs?.chargingTimeAcHours || 5),
        chargingTimeDcMinutes: v.specs?.chargingTimeDcMinutes || undefined,
      },
      rates: (v.rates || []).map((r: any) => ({
        serviceType: r.serviceType as ServiceType,
        dailyRate: Number(r.dailyRate),
        depositAmount: Number(r.depositAmount),
        overtimeHourlyRate: Number(r.overtimeHourlyRate),
      })),
    };
  }
}

export const fleetService = new FleetService();
