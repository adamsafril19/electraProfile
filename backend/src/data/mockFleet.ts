import { Vehicle } from '../types';

export const MOCK_FLEET: Vehicle[] = [
  {
    id: 'veh-001',
    slug: 'wuling-air-ev-long-range',
    brand: 'Wuling',
    model: 'Air EV Long Range',
    bodyType: 'CITY_CAR',
    licensePlate: 'DK 1024 EV',
    imageUrl: 'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?auto=format&fit=crop&w=800&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?auto=format&fit=crop&w=400&q=80',
    status: 'AVAILABLE',
    isActive: true,
    tags: ['Best Seller', 'Paling Irit', 'Bebas Ganjil-Genap'],
    specs: {
      batteryCapacityKwh: 26.7,
      rangeCltcKm: 300,
      portType: 'GB_T',
      maxAcKw: 6.6,
      seatingCapacity: 4,
      portableChargerIncluded: true,
      gbtAdapterIncluded: false,
      chargingTimeAcHours: 4.5
    },
    rates: [
      {
        serviceType: 'LEPAS_KUNCI',
        dailyRate: 350000,
        depositAmount: 500000,
        overtimeHourlyRate: 35000
      },
      {
        serviceType: 'DENGAN_DRIVER',
        dailyRate: 600000,
        depositAmount: 0,
        overtimeHourlyRate: 50000
      }
    ]
  },
  {
    id: 'veh-002',
    slug: 'wuling-binguo-ev-410km',
    brand: 'Wuling',
    model: 'Binguo EV Premium Range 410 km',
    bodyType: 'CITY_CAR',
    licensePlate: 'DK 1125 EV',
    imageUrl: 'https://images.unsplash.com/photo-1617788138017-80ad40651399?auto=format&fit=crop&w=800&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1617788138017-80ad40651399?auto=format&fit=crop&w=400&q=80',
    status: 'AVAILABLE',
    isActive: true,
    tags: ['Favorit Wisatawan', 'Fast Charging Support', 'Retro Elegan'],
    specs: {
      batteryCapacityKwh: 37.9,
      rangeCltcKm: 410,
      portType: 'GB_T',
      maxAcKw: 7.0,
      maxDcKw: 50.0,
      seatingCapacity: 5,
      portableChargerIncluded: true,
      gbtAdapterIncluded: true,
      chargingTimeAcHours: 5.5,
      chargingTimeDcMinutes: 35
    },
    rates: [
      {
        serviceType: 'LEPAS_KUNCI',
        dailyRate: 450000,
        depositAmount: 500000,
        overtimeHourlyRate: 45000
      },
      {
        serviceType: 'DENGAN_DRIVER',
        dailyRate: 750000,
        depositAmount: 0,
        overtimeHourlyRate: 60000
      }
    ]
  },
  {
    id: 'veh-003',
    slug: 'byd-atto-3-superior',
    brand: 'BYD',
    model: 'Atto 3 Superior Extended',
    bodyType: 'COMPACT_SUV',
    licensePlate: 'DK 1236 EV',
    imageUrl: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=800&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=400&q=80',
    status: 'AVAILABLE',
    isActive: true,
    tags: ['Premium SUV', 'CCS2 Universal', 'Blade Battery'],
    specs: {
      batteryCapacityKwh: 60.48,
      rangeCltcKm: 480,
      rangeWltpKm: 420,
      portType: 'CCS2',
      maxAcKw: 7.0,
      maxDcKw: 80.0,
      seatingCapacity: 5,
      portableChargerIncluded: true,
      gbtAdapterIncluded: false,
      chargingTimeAcHours: 8.5,
      chargingTimeDcMinutes: 45
    },
    rates: [
      {
        serviceType: 'LEPAS_KUNCI',
        dailyRate: 850000,
        depositAmount: 1000000,
        overtimeHourlyRate: 85000
      },
      {
        serviceType: 'DENGAN_DRIVER',
        dailyRate: 1250000,
        depositAmount: 0,
        overtimeHourlyRate: 100000
      }
    ]
  },
  {
    id: 'veh-004',
    slug: 'byd-m6-superior-7-seater',
    brand: 'BYD',
    model: 'M6 Superior Extended (7-Seater MPV)',
    bodyType: 'MPV',
    licensePlate: 'DK 1347 EV',
    imageUrl: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=400&q=80',
    status: 'AVAILABLE',
    isActive: true,
    tags: ['Keluarga 7-Seat', 'Paling Luas & Nyaman', 'CCS2 Universal'],
    specs: {
      batteryCapacityKwh: 71.8,
      rangeCltcKm: 530,
      rangeWltpKm: 460,
      portType: 'CCS2',
      maxAcKw: 7.0,
      maxDcKw: 115.0,
      seatingCapacity: 7,
      portableChargerIncluded: true,
      gbtAdapterIncluded: false,
      chargingTimeAcHours: 10.0,
      chargingTimeDcMinutes: 40
    },
    rates: [
      {
        serviceType: 'LEPAS_KUNCI',
        dailyRate: 950000,
        depositAmount: 1000000,
        overtimeHourlyRate: 95000
      },
      {
        serviceType: 'DENGAN_DRIVER',
        dailyRate: 1400000,
        depositAmount: 0,
        overtimeHourlyRate: 120000
      }
    ]
  }
];
