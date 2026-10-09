import { PrismaClient, BodyType, PortType, ServiceType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 [Prisma Seed] Memulai seeding data armada mobil listrik (EV)...');

  // Bersihkan data lama jika ada
  await prisma.batteryLog.deleteMany();
  await prisma.inquiry.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.rentalRate.deleteMany();
  await prisma.vehicleSpec.deleteMany();
  await prisma.vehicle.deleteMany();

  // 1. Wuling Air EV Long Range
  const wulingAir = await prisma.vehicle.create({
    data: {
      slug: 'wuling-air-ev-long-range',
      brand: 'Wuling',
      model: 'Air EV Long Range',
      bodyType: BodyType.CITY_CAR,
      licensePlate: 'DK 1024 EV',
      imageUrl: 'https://www3.wuling.id/wp-content/uploads/2025/02/Pro.png',
      thumbnailUrl: 'https://www3.wuling.id/wp-content/uploads/2025/02/Pro.png',
      tags: ['City Car Lincah', 'Paling Irit', 'Bebas Ganjil-Genap'],
      specs: {
        create: {
          batteryCapacityKwh: 26.7,
          rangeCltcKm: 300,
          portType: PortType.GB_T,
          maxAcKw: 6.6,
          seatingCapacity: 4,
          portableChargerIncluded: true,
          gbtAdapterIncluded: false,
          chargingTimeAcHours: 4.5
        }
      },
      rates: {
        create: [
          {
            serviceType: ServiceType.LEPAS_KUNCI,
            dailyRate: 350000,
            depositAmount: 500000,
            overtimeHourlyRate: 35000
          },
          {
            serviceType: ServiceType.DENGAN_DRIVER,
            dailyRate: 600000,
            depositAmount: 0,
            overtimeHourlyRate: 50000
          }
        ]
      }
    }
  });

  // 2. Wuling Binguo EV Premium Range 410km
  const wulingBinguo = await prisma.vehicle.create({
    data: {
      slug: 'wuling-binguo-ev-410km',
      brand: 'Wuling',
      model: 'Binguo EV Premium Range 410 km',
      bodyType: BodyType.CITY_CAR,
      licensePlate: 'DK 1125 EV',
      imageUrl: 'https://www.mobilwuling.id/wp-content/uploads/2023/12/Wuling_Binguo_EV_mousse-green-mobile.png',
      thumbnailUrl: 'https://www.mobilwuling.id/wp-content/uploads/2023/12/Wuling_Binguo_EV_mousse-green-mobile.png',
      tags: ['Favorit Wisatawan', 'Retro Modern', 'DC Fast Charging'],
      specs: {
        create: {
          batteryCapacityKwh: 37.9,
          rangeCltcKm: 410,
          portType: PortType.GB_T,
          maxAcKw: 7.0,
          maxDcKw: 50.0,
          seatingCapacity: 5,
          portableChargerIncluded: true,
          gbtAdapterIncluded: true,
          chargingTimeAcHours: 5.5,
          chargingTimeDcMinutes: 35
        }
      },
      rates: {
        create: [
          {
            serviceType: ServiceType.LEPAS_KUNCI,
            dailyRate: 450000,
            depositAmount: 500000,
            overtimeHourlyRate: 45000
          },
          {
            serviceType: ServiceType.DENGAN_DRIVER,
            dailyRate: 750000,
            depositAmount: 0,
            overtimeHourlyRate: 60000
          }
        ]
      }
    }
  });

  // 3. BYD Atto 3 Superior Extended
  const bydAtto = await prisma.vehicle.create({
    data: {
      slug: 'byd-atto-3-superior',
      brand: 'BYD',
      model: 'Atto 3 Superior Extended',
      bodyType: BodyType.COMPACT_SUV,
      licensePlate: 'DK 1236 EV',
      imageUrl: 'https://www.byd.com/material/byd-site/eu-v3/model/atto3-evo/mob/exterior-gallery/irisblue/1.webp',
      thumbnailUrl: 'https://www.byd.com/material/byd-site/eu-v3/model/atto3-evo/mob/exterior-gallery/irisblue/1.webp',
      tags: ['Premium SUV Crossover', 'CCS2 Universal', 'Blade Battery'],
      specs: {
        create: {
          batteryCapacityKwh: 60.48,
          rangeCltcKm: 480,
          rangeWltpKm: 420,
          portType: PortType.CCS2,
          maxAcKw: 7.0,
          maxDcKw: 80.0,
          seatingCapacity: 5,
          portableChargerIncluded: true,
          gbtAdapterIncluded: false,
          chargingTimeAcHours: 8.5,
          chargingTimeDcMinutes: 45
        }
      },
      rates: {
        create: [
          {
            serviceType: ServiceType.LEPAS_KUNCI,
            dailyRate: 850000,
            depositAmount: 1000000,
            overtimeHourlyRate: 85000
          },
          {
            serviceType: ServiceType.DENGAN_DRIVER,
            dailyRate: 1250000,
            depositAmount: 0,
            overtimeHourlyRate: 100000
          }
        ]
      }
    }
  });

  // 4. BYD M6 Superior Extended (7-Seater MPV)
  const bydM6 = await prisma.vehicle.create({
    data: {
      slug: 'byd-m6-superior-7-seater',
      brand: 'BYD',
      model: 'M6 Superior Extended (7-Seater MPV)',
      bodyType: BodyType.MPV,
      licensePlate: 'DK 1347 EV',
      imageUrl: 'https://www.indorent.co.id/_astro/m6.BJaexOkK_xDA7s.webp',
      thumbnailUrl: 'https://www.indorent.co.id/_astro/m6.BJaexOkK_xDA7s.webp',
      tags: ['Keluarga 7-Seater', 'Paling Luas & Nyaman', 'CCS2 Universal'],
      specs: {
        create: {
          batteryCapacityKwh: 71.8,
          rangeCltcKm: 530,
          rangeWltpKm: 460,
          portType: PortType.CCS2,
          maxAcKw: 7.0,
          maxDcKw: 115.0,
          seatingCapacity: 7,
          portableChargerIncluded: true,
          gbtAdapterIncluded: false,
          chargingTimeAcHours: 10.0,
          chargingTimeDcMinutes: 40
        }
      },
      rates: {
        create: [
          {
            serviceType: ServiceType.LEPAS_KUNCI,
            dailyRate: 950000,
            depositAmount: 1000000,
            overtimeHourlyRate: 95000
          },
          {
            serviceType: ServiceType.DENGAN_DRIVER,
            dailyRate: 1400000,
            depositAmount: 0,
            overtimeHourlyRate: 120000
          }
        ]
      }
    }
  });

  // 5. Hyundai Ioniq 5 Signature Long Range
  const ioniq5 = await prisma.vehicle.create({
    data: {
      slug: 'hyundai-ioniq-5-signature',
      brand: 'Hyundai',
      model: 'Ioniq 5 Signature Long Range',
      bodyType: BodyType.COMPACT_SUV,
      licensePlate: 'DK 1458 EV',
      imageUrl: 'https://www.indorent.co.id/_astro/ioniq.CWJs8ymx_Z1fosIA.webp',
      thumbnailUrl: 'https://www.indorent.co.id/_astro/ioniq.CWJs8ymx_Z1fosIA.webp',
      tags: ['Futuristik Premium', 'Ultra Fast 350kW', 'Fitur V2L Bivak'],
      specs: {
        create: {
          batteryCapacityKwh: 72.6,
          rangeCltcKm: 481,
          rangeWltpKm: 451,
          portType: PortType.CCS2,
          maxAcKw: 11.0,
          maxDcKw: 350.0,
          seatingCapacity: 5,
          portableChargerIncluded: true,
          gbtAdapterIncluded: false,
          chargingTimeAcHours: 6.0,
          chargingTimeDcMinutes: 18
        }
      },
      rates: {
        create: [
          {
            serviceType: ServiceType.LEPAS_KUNCI,
            dailyRate: 1100000,
            depositAmount: 1500000,
            overtimeHourlyRate: 110000
          },
          {
            serviceType: ServiceType.DENGAN_DRIVER,
            dailyRate: 1600000,
            depositAmount: 0,
            overtimeHourlyRate: 130000
          }
        ]
      }
    }
  });

  console.log(`✅ [Prisma Seed] Berhasil membuat 5 armada listrik:`);
  console.log(`   - ${wulingAir.brand} ${wulingAir.model} (${wulingAir.licensePlate})`);
  console.log(`   - ${wulingBinguo.brand} ${wulingBinguo.model} (${wulingBinguo.licensePlate})`);
  console.log(`   - ${bydAtto.brand} ${bydAtto.model} (${bydAtto.licensePlate})`);
  console.log(`   - ${bydM6.brand} ${bydM6.model} (${bydM6.licensePlate})`);
  console.log(`   - ${ioniq5.brand} ${ioniq5.model} (${ioniq5.licensePlate})`);
}

main()
  .catch((e) => {
    console.error('❌ [Prisma Seed Error]:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
