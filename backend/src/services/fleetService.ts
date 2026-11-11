import { MOCK_FLEET } from '../data/mockFleet';
import { Vehicle, BodyType, ServiceType, PortType } from '../types';
import { prisma } from '../config/database';
import { AppError } from '../utils/AppError';
import { store } from '../utils/JsonStore';

export class FleetService {
  // Salinan dalam agar perubahan tarif tidak memodifikasi data seed (MOCK_FLEET)
  private fallbackFleet: Vehicle[] = MOCK_FLEET.map((v) => JSON.parse(JSON.stringify(v)) as Vehicle);

  constructor() {
    // Terapkan perubahan admin yang tersimpan (tampil/sembunyi, status, tarif)
    for (const v of this.fallbackFleet) {
      const o = store.data.fleetOverrides[v.id];
      if (!o) continue;
      if (o.isActive !== undefined) v.isActive = o.isActive;
      if (o.status) v.status = o.status;
      for (const r of o.rates || []) {
        const rate = v.rates.find((x) => x.serviceType === r.serviceType);
        if (rate) {
          rate.dailyRate = r.dailyRate;
          rate.depositAmount = r.depositAmount;
        }
      }
    }
  }

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

  /** Seluruh armada termasuk yang dinonaktifkan (khusus panel admin). */
  public async listAllForAdmin(): Promise<Vehicle[]> {
    try {
      const dbVehicles = await prisma.vehicle.findMany({
        include: { specs: true, rates: true },
        orderBy: { createdAt: 'asc' },
      });
      if (dbVehicles.length > 0) {
        return dbVehicles.map((v) => this.mapDbVehicleToType(v));
      }
    } catch (error: any) {
      console.warn('⚠️ [FleetService] Daftar armada admin: DB offline, memakai data fallback');
    }
    return this.fallbackFleet;
  }

  public async updateVehicle(
    id: string,
    changes: {
      isActive?: boolean;
      status?: 'AVAILABLE' | 'BOOKED' | 'MAINTENANCE';
      rates?: { serviceType: ServiceType; dailyRate: number; depositAmount: number }[];
    }
  ): Promise<Vehicle> {
    // Jalur database: dipakai jika unit memang ada di DB
    try {
      const existing = await prisma.vehicle.findUnique({ where: { id }, include: { rates: true } });
      if (existing) {
        for (const r of changes.rates || []) {
          if (!existing.rates.some((er) => er.serviceType === r.serviceType)) {
            throw new AppError(`Unit ini tidak memiliki layanan ${r.serviceType}`, 400);
          }
        }
        await prisma.$transaction([
          prisma.vehicle.update({
            where: { id },
            data: {
              ...(changes.isActive !== undefined ? { isActive: changes.isActive } : {}),
              ...(changes.status ? { status: changes.status as any } : {}),
            },
          }),
          ...(changes.rates || []).map((r) =>
            prisma.rentalRate.update({
              where: { vehicleId_serviceType: { vehicleId: id, serviceType: r.serviceType as any } },
              data: { dailyRate: r.dailyRate, depositAmount: r.depositAmount },
            })
          ),
        ]);
        const fresh = await prisma.vehicle.findUnique({ where: { id }, include: { specs: true, rates: true } });
        return this.mapDbVehicleToType(fresh);
      }
    } catch (error: any) {
      if (error instanceof AppError) throw error;
      console.warn('⚠️ [FleetService] Update armada via DB gagal, mencoba data fallback:', error.message);
    }

    // Jalur fallback (in-memory)
    const vehicle = this.fallbackFleet.find((v) => v.id === id);
    if (!vehicle) throw new AppError('Kendaraan tidak ditemukan', 404);
    for (const r of changes.rates || []) {
      if (!vehicle.rates.some((er) => er.serviceType === r.serviceType)) {
        throw new AppError(`Unit ini tidak memiliki layanan ${r.serviceType}`, 400);
      }
    }
    if (changes.isActive !== undefined) vehicle.isActive = changes.isActive;
    if (changes.status) vehicle.status = changes.status;
    for (const r of changes.rates || []) {
      const rate = vehicle.rates.find((er) => er.serviceType === r.serviceType)!;
      rate.dailyRate = r.dailyRate;
      rate.depositAmount = r.depositAmount;
    }
    store.data.fleetOverrides[vehicle.id] = {
      isActive: vehicle.isActive,
      status: vehicle.status,
      rates: vehicle.rates.map((r) => ({ serviceType: r.serviceType, dailyRate: r.dailyRate, depositAmount: r.depositAmount })),
    };
    store.save();
    return vehicle;
  }

  
  public async createVehicle(input: any): Promise<Vehicle> {
    const slugBase = `${input.brand}-${input.model}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    let slug = slugBase;
    let counter = 1;

    try {
      while (await prisma.vehicle.findUnique({ where: { slug } })) {
        slug = `${slugBase}-${counter++}`;
      }
    } catch {
      while (this.fallbackFleet.some((v) => v.slug === slug)) {
        slug = `${slugBase}-${counter++}`;
      }
    }

    const defaultImages: Record<string, string> = {
      CITY_CAR: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?q=80&w=800&auto=format&fit=crop',
      COMPACT_SUV: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?q=80&w=800&auto=format&fit=crop',
      MPV: 'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?q=80&w=800&auto=format&fit=crop',
    };

    const imageUrl = input.imageUrl || defaultImages[input.bodyType] || defaultImages.CITY_CAR;
    const thumbnailUrl = input.thumbnailUrl || imageUrl;

    try {
      const created = await prisma.vehicle.create({
        data: {
          slug,
          brand: input.brand,
          model: input.model,
          bodyType: input.bodyType,
          licensePlate: input.licensePlate.toUpperCase(),
          imageUrl,
          thumbnailUrl,
          status: input.status || 'AVAILABLE',
          isActive: true,
          tags: input.tags && input.tags.length > 0 ? input.tags : ['EV', input.brand, input.bodyType],
          specs: {
            create: {
              batteryCapacityKwh: Number(input.specs.batteryCapacityKwh),
              rangeCltcKm: Number(input.specs.rangeCltcKm),
              portType: input.specs.portType || 'CCS2',
              maxAcKw: Number(input.specs.maxAcKw || 7.0),
              maxDcKw: input.specs.maxDcKw ? Number(input.specs.maxDcKw) : null,
              seatingCapacity: Number(input.specs.seatingCapacity || 5),
              portableChargerIncluded: input.specs.portableChargerIncluded ?? true,
              gbtAdapterIncluded: input.specs.gbtAdapterIncluded ?? false,
              chargingTimeAcHours: Number(input.specs.chargingTimeAcHours || 6.0),
              chargingTimeDcMinutes: input.specs.chargingTimeDcMinutes ? Number(input.specs.chargingTimeDcMinutes) : null,
            },
          },
          rates: {
            create: input.rates.map((r: any) => ({
              serviceType: r.serviceType,
              dailyRate: Number(r.dailyRate),
              depositAmount: Number(r.depositAmount || (input.bodyType === 'CITY_CAR' ? 500000 : 1000000)),
              overtimeHourlyRate: Number(r.overtimeHourlyRate || Math.round(Number(r.dailyRate) * 0.1)),
            })),
          },
        },
        include: { specs: true, rates: true },
      });

      const mapped = this.mapDbVehicleToType(created);
      this.fallbackFleet.push(mapped);
      return mapped;
    } catch (err: any) {
      console.warn('⚠️ [FleetService] Create vehicle via DB gagal, memakai in-memory fallback:', err.message);
    }

    const id = `veh-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const newVeh: Vehicle = {
      id,
      slug,
      brand: input.brand,
      model: input.model,
      bodyType: input.bodyType,
      licensePlate: input.licensePlate.toUpperCase(),
      imageUrl,
      thumbnailUrl,
      status: input.status || 'AVAILABLE',
      isActive: true,
      tags: input.tags && input.tags.length > 0 ? input.tags : ['EV', input.brand, input.bodyType],
      specs: {
        batteryCapacityKwh: Number(input.specs.batteryCapacityKwh),
        rangeCltcKm: Number(input.specs.rangeCltcKm),
        portType: input.specs.portType || 'CCS2',
        maxAcKw: Number(input.specs.maxAcKw || 7.0),
        maxDcKw: input.specs.maxDcKw ? Number(input.specs.maxDcKw) : undefined,
        seatingCapacity: Number(input.specs.seatingCapacity || 5),
        portableChargerIncluded: input.specs.portableChargerIncluded ?? true,
        gbtAdapterIncluded: input.specs.gbtAdapterIncluded ?? false,
        chargingTimeAcHours: Number(input.specs.chargingTimeAcHours || 6.0),
        chargingTimeDcMinutes: input.specs.chargingTimeDcMinutes ? Number(input.specs.chargingTimeDcMinutes) : undefined,
      },
      rates: input.rates.map((r: any) => ({
        serviceType: r.serviceType,
        dailyRate: Number(r.dailyRate),
        depositAmount: Number(r.depositAmount || (input.bodyType === 'CITY_CAR' ? 500000 : 1000000)),
        overtimeHourlyRate: Number(r.overtimeHourlyRate || Math.round(Number(r.dailyRate) * 0.1)),
      })),
    };

    this.fallbackFleet.push(newVeh);
    store.data.fleetOverrides[id] = {
      isActive: true,
      status: newVeh.status,
      rates: newVeh.rates.map(r => ({ serviceType: r.serviceType, dailyRate: r.dailyRate, depositAmount: r.depositAmount })),
    };
    store.save();
    return newVeh;
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
