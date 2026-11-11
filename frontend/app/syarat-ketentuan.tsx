import React from 'react';
import { View, StyleSheet } from 'react-native';
import Head from 'expo-router/head';
import { BatteryCharging, FileCheck2, Timer, Wallet, ShieldCheck } from 'lucide-react-native';
import { Callout, CheckList, ContentWrap, InfoSection, PageHero, Paragraph, StepList } from '../components/ContentKit';
import { useLanguage } from '../context/LanguageContext';

export default function TermsScreen() {
  const { locale, t } = useLanguage();
  return (
    <View style={styles.container}>
      <Head>
        <title>Syarat & Ketentuan Sewa Mobil Listrik | Electra</title>
        <meta name="description" content="Persyaratan dokumen, aturan baterai (SoC), deposit, dan ketentuan keterlambatan sewa mobil listrik Electra." />
      </Head>

      <PageHero
        eyebrow={t('TRANSPARANSI KEBIJAKAN OPERASIONAL', 'OPERATIONAL POLICY TRANSPARENCY')}
        title={t('Syarat & Ketentuan Penyewaan', 'Rental Terms & Conditions')}
        subtitle={t(
          'Ketentuan transparan tanpa klausul tersembunyi demi kenyamanan, keselamatan, dan integritas armada kendaraan listrik mandiri.',
          'Clear, transparent guidelines with no hidden clauses to ensure peace of mind, vehicle integrity, and safety on the road.'
        )}
        icon={ShieldCheck}
      />

      <ContentWrap>
        <InfoSection
          tag={t('PASAL 01', 'ARTICLE 01')}
          kicker={t('PERSYARATAN VERIFIKASI SEWA LEPAS KUNCI', 'SELF-DRIVE RENTAL VERIFICATION')}
          title={t('Verifikasi Identitas Penyewa Retail & Wisatawan', 'Identity Verification for Retail & Tourist Renters')}
          icon={FileCheck2}
          tone="blue"
        >
          <Paragraph>
            {t(
              'Sebagai langkah mitigasi keamanan armada, calon penyewa wajib melampirkan berkas verifikasi berikut sebelum serah terima unit dilakukan:',
              'As a vehicle security and fleet compliance protocol, prospective renters must provide the following verification documents prior to vehicle handover:'
            )}
          </Paragraph>
          <CheckList
            items={[
              t('e-KTP Asli / Paspor (Foto jelas tanpa blur atau tertutup jari).', 'Original Government ID / Valid Passport for international tourists.'),
              t('SIM A Asli / International Driving Permit yang masih berlaku.', 'Valid Driver License (SIM A / International Driving Permit).'),
              t('Bukti Tiket Penerbangan / Kereta Api Pulang-Pergi (khusus wisatawan luar kota).', 'Proof of Return Flight or Travel Ticket (for out-of-town and foreign tourists).'),
              t('Bukti Reservasi Hotel, Resort, atau Villa selama periode sewa kendaraan.', 'Confirmed Hotel, Resort, or Villa Reservation for the duration of the rental.'),
              t('Akun Media Sosial Aktif (LinkedIn / Instagram) untuk verifikasi domisili & identitas.', 'Active Social Media Profile (LinkedIn / Instagram) for identity cross-verification.'),
            ]}
          />
        </InfoSection>

        <InfoSection
          tag={t('PASAL 02', 'ARTICLE 02')}
          kicker={t('STANDAR KESEHATAN BATERAI & STATE OF CHARGE (SOC)', 'BATTERY HEALTH & STATE OF CHARGE (SOC) RULES')}
          title={t('Aturan Tingkat Daya Baterai Saat Serah Terima & Pengembalian', 'Battery Level Standards at Handover & Return')}
          icon={BatteryCharging}
          tone="green"
          delay={70}
        >
          <Paragraph>
            {t(
              'Kendaraan listrik memerlukan perlakuan teknis khusus untuk menjaga keandalan sel baterai:',
              'Electric vehicles require dedicated battery care to maintain the longevity and health of the cells:'
            )}
          </Paragraph>
          <StepList
            items={[
              t(
                '**Penyerahan Unit (Outbound)**: Kendaraan diserahkan kepada penyewa dengan tingkat daya baterai prima minimal **80% hingga 100%**.',
                '**Handover (Outbound)**: Vehicles are delivered to renters in prime condition with a minimum battery level of **80% to 100%**.'
              ),
              t(
                '**Pengembalian Unit (Inbound)**: Penyewa wajib mengembalikan kendaraan dengan sisa baterai minimal **20% hingga 30%** guna mencegah *deep discharge* sel baterai.',
                '**Return (Inbound)**: Renters must return the vehicle with at least **20% to 30%** remaining SoC to prevent damaging deep discharge.'
              ),
              t(
                '**Biaya Pemulihan Daya Baterai**: Apabila kendaraan dikembalikan dengan baterai di bawah 20%, dikenakan biaya pemulihan pengisian flat Rp 50.000 (10–19%) atau Rp 150.000 (di bawah 10%) yang dipotong langsung dari deposit jaminan.',
                '**Battery Recovery Charge**: If returned under 20% SoC, a flat recharge fee of Rp 50,000 (10–19%) or Rp 150,000 (below 10%) will be deducted from the security deposit.'
              ),
            ]}
          />
        </InfoSection>

        <InfoSection
          tag={t('PASAL 03', 'ARTICLE 03')}
          kicker={t('DEPOSIT JAMINAN KEAMANAN & PENGEMBALIAN', 'SECURITY DEPOSIT & REFUND POLICY')}
          title={t('Besaran Deposit & Ketentuan Pengembalian', 'Deposit Amounts & Refund Timeline')}
          icon={Wallet}
          tone="amber"
          delay={140}
        >
          <CheckList
            color="#B45309"
            items={[
              t('City Car (Wuling Air EV / Binguo EV): **Rp 500.000**', 'City Car (Wuling Air EV / Binguo EV): **Rp 500,000**'),
              t('Compact SUV & MPV (BYD Atto 3 / BYD M6): **Rp 1.000.000**', 'Compact SUV & MPV (BYD Atto 3 / BYD M6): **Rp 1,000,000**'),
            ]}
          />
          <Callout tone="amber">
            {t(
              '**Jadwal Pengembalian Dana**: Deposit ditransfer 100% penuh dalam kurun waktu **H+1 hingga maksimal H+3 hari kerja** pasca unit dikembalikan, setelah diverifikasi bebas tilang elektronik (ETLE) kepolisian dan kondisi fisik kendaraan.',
              '**Refund Schedule**: 100% of the deposit is refunded within **1 to 3 business days** after return inspection, once verified free of electronic traffic camera fines (ETLE) and physical damage.'
            )}
          </Callout>
        </InfoSection>

        <InfoSection
          tag={t('PASAL 04', 'ARTICLE 04')}
          kicker={t('KETERLAMBATAN PENGEMBALIAN (OVERTIME)', 'LATE RETURN & OVERTIME POLICIES')}
          title={t('Toleransi Waktu & Tarif Keterlambatan', 'Grace Period & Overtime Hourly Rates')}
          icon={Timer}
          tone="red"
          delay={210}
        >
          <CheckList
            color="#B91C1C"
            items={[
              t(
                '**Grace Period**: Toleransi keterlambatan maksimal 30 menit tanpa biaya dengan konfirmasi terlebih dahulu ke admin operasional.',
                '**Grace Period**: Up to 30 minutes grace period at no additional charge with advance notice to our dispatch team.'
              ),
              t(
                '**Jam ke-1 hingga ke-3**: Dikenakan biaya tambahan 10% dari tarif sewa harian per jam.',
                '**1st to 3rd hour**: Charged at 10% of the daily rental rate per hour.'
              ),
              t(
                '**Keterlambatan 4 jam atau lebih**: Dikenakan biaya penuh sewa 1 hari (24 jam) karena mengganggu ketersediaan penyewa berikutnya.',
                '**Over 4 hours late**: Billed as a full 1-day rental (24h) to protect the schedule for the next incoming reservation.'
              ),
            ]}
          />
        </InfoSection>
      </ContentWrap>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
});
