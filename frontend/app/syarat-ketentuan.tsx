import React from 'react';
import { View, StyleSheet } from 'react-native';
import Head from 'expo-router/head';
import { BatteryCharging, FileCheck2, Timer, Wallet, ShieldCheck } from 'lucide-react-native';
import { Callout, CheckList, ContentWrap, InfoSection, PageHero, Paragraph, StepList } from '../components/ContentKit';

export default function TermsScreen() {
  return (
    <View style={styles.container}>
      <Head>
        <title>Syarat & Ketentuan Sewa Mobil Listrik | Electra</title>
        <meta name="description" content="Persyaratan dokumen, aturan baterai (SoC), deposit, dan ketentuan keterlambatan sewa mobil listrik Electra." />
      </Head>

      <PageHero
        eyebrow="TRANSPARANSI KEBIJAKAN OPERASIONAL"
        title="Syarat & Ketentuan Penyewaan"
        subtitle="Ketentuan transparan tanpa klausul tersembunyi demi kenyamanan, keselamatan, dan integritas armada kendaraan listrik mandiri."
        icon={ShieldCheck}
      />

      <ContentWrap>
        <InfoSection tag="PASAL 01" kicker="PERSYARATAN VERIFIKASI SEWA LEPAS KUNCI" title="Verifikasi Identitas Penyewa Retail & Wisatawan" icon={FileCheck2} tone="blue">
          <Paragraph>Sebagai langkah mitigasi keamanan armada, calon penyewa wajib melampirkan berkas verifikasi berikut sebelum serah terima unit dilakukan:</Paragraph>
          <CheckList
            items={[
              'e-KTP Asli (Foto jelas tanpa blur atau tertutup jari).',
              'SIM A Asli yang masih berlaku.',
              'Bukti Tiket Penerbangan / Kereta Api Pulang-Pergi (khusus wisatawan luar kota).',
              'Bukti Reservasi Hotel, Resort, atau Villa selama periode sewa kendaraan.',
              'Akun Media Sosial Aktif (LinkedIn / Instagram) untuk verifikasi domisili & identitas.',
            ]}
          />
        </InfoSection>

        <InfoSection tag="PASAL 02" kicker="STANDAR KESEHATAN BATERAI & STATE OF CHARGE (SOC)" title="Aturan Tingkat Daya Baterai Saat Serah Terima & Pengembalian" icon={BatteryCharging} tone="green" delay={70}>
          <Paragraph>Kendaraan listrik memerlukan perlakuan teknis khusus untuk menjaga keandalan sel baterai:</Paragraph>
          <StepList
            items={[
              '**Penyerahan Unit (Outbound)**: Kendaraan diserahkan kepada penyewa dengan tingkat daya baterai prima minimal **80% hingga 100%**.',
              '**Pengembalian Unit (Inbound)**: Penyewa wajib mengembalikan kendaraan dengan sisa baterai minimal **20% hingga 30%** guna mencegah *deep discharge* sel baterai.',
              '**Biaya Pemulihan Daya Baterai**: Apabila kendaraan dikembalikan dengan baterai di bawah 20%, dikenakan biaya pemulihan pengisian flat Rp 50.000 (10–19%) atau Rp 150.000 (di bawah 10%) yang dipotong langsung dari deposit jaminan.',
            ]}
          />
        </InfoSection>

        <InfoSection tag="PASAL 03" kicker="DEPOSIT JAMINAN KEAMANAN & PENGEMBALIAN" title="Besaran Deposit & Ketentuan Pengembalian" icon={Wallet} tone="amber" delay={140}>
          <CheckList
            color="#B45309"
            items={[
              'City Car (Wuling Air EV / Binguo EV): **Rp 500.000**',
              'Compact SUV & MPV (BYD Atto 3 / BYD M6): **Rp 1.000.000**',
            ]}
          />
          <Callout tone="amber">**Jadwal Pengembalian Dana**: Deposit ditransfer 100% penuh dalam kurun waktu **H+1 hingga maksimal H+3 hari kerja** pasca unit dikembalikan, setelah diverifikasi bebas tilang elektronik (ETLE) kepolisian dan kondisi fisik kendaraan.</Callout>
        </InfoSection>

        <InfoSection tag="PASAL 04" kicker="KETERLAMBATAN PENGEMBALIAN (OVERTIME)" title="Toleransi Waktu & Tarif Keterlambatan" icon={Timer} tone="red" delay={210}>
          <CheckList
            color="#B91C1C"
            items={[
              '**Grace Period**: Toleransi keterlambatan maksimal 30 menit tanpa biaya dengan konfirmasi terlebih dahulu ke admin operasional.',
              '**Jam ke-1 hingga ke-3**: Dikenakan biaya tambahan 10% dari tarif sewa harian per jam.',
              '**Keterlambatan 4 jam atau lebih**: Dikenakan biaya penuh sewa 1 hari (24 jam) karena mengganggu ketersediaan penyewa berikutnya.',
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
