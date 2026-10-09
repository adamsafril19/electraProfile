export type ServiceType = 'LEPAS_KUNCI' | 'DENGAN_DRIVER';
export type BodyType = 'CITY_CAR' | 'COMPACT_SUV' | 'MPV';
export type PortType = 'CCS2' | 'GB_T' | 'TYPE_2';

export interface VehicleSpecs {
  batteryCapacityKwh: number;
  rangeCltcKm: number;
  rangeWltpKm?: number;
  portType: PortType;
  maxAcKw: number;
  maxDcKw?: number;
  seatingCapacity: number;
  portableChargerIncluded: boolean;
  gbtAdapterIncluded: boolean;
  chargingTimeAcHours: number;
  chargingTimeDcMinutes?: number;
}

export interface RentalRate {
  serviceType: ServiceType;
  dailyRate: number;
  depositAmount: number;
  overtimeHourlyRate: number;
}

export interface Vehicle {
  id: string;
  slug: string;
  brand: string;
  model: string;
  bodyType: BodyType;
  licensePlate: string;
  imageUrl: string;
  thumbnailUrl: string;
  status: 'AVAILABLE' | 'BOOKED' | 'MAINTENANCE';
  isActive: boolean;
  specs: VehicleSpecs;
  rates: RentalRate[];
  tags: string[];
}

export interface BookingFormInput {
  vehicleId: string;
  serviceType: ServiceType;
  startDate: string;
  durationDays: number;
  pickupLocation: string;
  returnLocation: string;
  customerName: string;
  customerPhone: string;
  customerNotes?: string;
}
