import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Linking,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Zap,
  BatteryCharging,
  MapPin,
  Star,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  ShieldAlert,
  Home,
  CheckCircle2,
  Quote,
  MessageCircle,
} from 'lucide-react-native';
import { COLORS } from '../constants/colors';

// -------------------------------------------------------------
// 1. SEKSI EKOSISTEM CHARGING & ANTI-RANGE ANXIETY
// -------------------------------------------------------------
export const ChargingEcosystemSection: React.FC = () => {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const features = [
    {
      icon: Home,
      title: 'Portable Charger 2.2 kW (Included)',
      tag: 'Bisa di Hotel & Villa',
      desc: 'Setiap unit dilengkapi kabel pengisian portabel 2.2 kW. Cukup colokkan ke stopkontak berarde standar saat Anda beristirahat di malam hari.',
    },
    {
      icon: BatteryCharging,
      title: 'Ultra Fast Charging (CCS2 & GB/T)',
      tag: '25–40 Menit 80%',
      desc: 'Kompatibilitas penuh di stasiun SPKLU DC Fast Charging seluruh jalur utama. Adaptor resmi terpasang siap pakai tanpa biaya sewa tambahan.',
    },
    {
      icon: ShieldAlert,
      title: 'Roadside Assistance & Derek 24/7',
      tag: 'Jaminan Bebas Mogok',
      desc: 'Tim mekanik dan armada derek darurat siap meluncur ke lokasi Anda 24 jam jika kapasitas baterai menipis sebelum mencapai titik pengisian.',
    },
  ];

  return (
    <View style={styles.chargingWrap}>
      <View style={styles.sectionHeaderCentered}>
        <View style={styles.eyebrowRow}>
          <Text style={styles.eyebrowText}>EKOSISTEM MOBIL LISTRIK BEBAS CEMAS</Text>
          <View style={styles.eyebrowLine} />
        </View>
        <Text style={styles.editorialTitle}>
          Jelajahi Setiap Sudut <Text style={styles.editorialTitleAccent}>Tanpa Khawatir Baterai</Text>
        </Text>
        <Text style={styles.sectionSubtitleCentered}>
          Kami pastikan pengalaman berkendara mobil listrik Anda semudah dan senyaman mobil konvensional dengan dukungan infrastruktur pengisian lengkap.
        </Text>
      </View>

      <View style={styles.chargingGrid}>
        {features.map((item, idx) => {
          const Icon = item.icon;
          return (
            <View key={idx} style={[styles.chargingCard, isMobile && { minWidth: '100%' }]}>
              <View style={styles.chargingCardTop}>
                <View style={styles.chargingIconBox}>
                  <Icon size={24} color="#0284C7" />
                </View>
                <View style={styles.chargingTag}>
                  <Text style={styles.chargingTagText}>{item.tag}</Text>
                </View>
              </View>
              <Text style={styles.chargingTitle}>{item.title}</Text>
              <Text style={styles.chargingDesc}>{item.desc}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

// -------------------------------------------------------------
// 2. SEKSI TESTIMONI & BUKTI SOSIAL (SOCIAL PROOF)
// -------------------------------------------------------------
export const TestimonialsSection: React.FC = () => {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const reviews = [
    {
      name: 'Sarah Jenkins',
      role: 'Wisatawan Keluarga • Australia',
      vehicle: 'BYD M6 Superior (7-Seater)',
      text: 'Menyewa BYD M6 untuk keluarga berenam selama 5 hari di Bali adalah keputusan terbaik. Mobil sangat senyap, kabin luas, dan baterai cukup untuk rute Seminyak - Kintamani bolak-balik tanpa perlu panik cas di jalan.',
      rating: 5,
    },
    {
      name: 'Bpk. Hendra Gunawan',
      role: 'Perjalanan Bisnis Korporat • Jakarta',
      vehicle: 'Hyundai Ioniq 5 Signature',
      text: 'Layanan serah terima tepat waktu di Bandara Ngurah Rai dengan baterai 98%. Kondisi unit wangi dan sangat prima. Komunikasi admin via WhatsApp sangat responsif dan transparan tanpa ada biaya siluman.',
      rating: 5,
    },
    {
      name: 'Kadek Dwi Putra',
      role: 'Road Trip Liburan • Denpasar',
      vehicle: 'Wuling Binguo EV 410 km',
      text: 'Paling hemat! Biaya listrik jauh lebih murah dibanding bensin, apalagi bisa pakai colokan villa tempat kami menginap di Ubud. Pasti akan sewa di Electra lagi untuk liburan berikutnya.',
      rating: 5,
    },
  ];

  return (
    <View style={styles.testimonialWrap}>
      <View style={styles.sectionHeaderCentered}>
        <View style={styles.ratingBadge}>
          <View style={styles.starRow}>
            {[1, 2, 3, 4, 5].map((s) => (
              <Star key={s} size={15} color="#F59E0B" fill="#F59E0B" />
            ))}
          </View>
          <Text style={styles.ratingBadgeText}>4.9 / 5.0 dari 1.200+ Perjalanan Puas</Text>
        </View>

        <Text style={styles.editorialTitle}>
          Cerita Nyata dari <Text style={styles.editorialTitleAccent}>Penyewa Setia Electra</Text>
        </Text>
        <Text style={styles.sectionSubtitleCentered}>
          Kepuasan dan kenyamanan perjalanan Anda adalah standar utama yang kami jaga di setiap unit yang beroperasi.
        </Text>
      </View>

      <View style={styles.reviewGrid}>
        {reviews.map((r, idx) => (
          <View key={idx} style={[styles.reviewCard, isMobile && { minWidth: '100%' }]}>
            <View style={styles.reviewQuoteIcon}>
              <Quote size={24} color="rgba(11, 114, 201, 0.2)" />
            </View>

            <View style={styles.reviewStars}>
              {Array.from({ length: r.rating }).map((_, i) => (
                <Star key={i} size={14} color="#F59E0B" fill="#F59E0B" />
              ))}
            </View>

            <Text style={styles.reviewText}>"{r.text}"</Text>

            <View style={styles.reviewAuthor}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarLetter}>{r.name[0]}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.authorName}>{r.name}</Text>
                <Text style={styles.authorRole}>{r.role}</Text>
                <Text style={styles.authorVehicle}>{r.vehicle}</Text>
              </View>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

// -------------------------------------------------------------
// 3. SEKSI FAQ INTERAKTIF (ACCORDION)
// -------------------------------------------------------------
export const FaqSection: React.FC = () => {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const faqs = [
    {
      q: 'Apakah sewa lepas kunci memerlukan deposit jaminan?',
      a: 'Ya, deposit jaminan berlaku untuk opsi Lepas Kunci (Rp500.000 untuk City Car, Rp1.000.000 untuk SUV/MPV). Deposit akan dikembalikan penuh via transfer H+1 hingga H+3 hari kerja setelah unit dikembalikan dalam kondisi baik dan kelengkapan charger utuh.',
    },
    {
      q: 'Bagaimana jika baterai menipis saat berada di tengah perjalanan?',
      a: 'Seluruh armada diserahkan dengan baterai 80%–100%. Di dasbor mobil tersedia indikator jarak tempuh sisa. Jika darurat, Anda dapat menghubungi Layanan Bantuan Darurat 24 Jam kami melalui WhatsApp atau Call Center untuk panduan SPKLU terdekat atau pengiriman unit derek darurat.',
    },
    {
      q: 'Apakah bisa serah terima langsung di terminal kedatangan Bandara?',
      a: 'Bisa, gratis dan tepat waktu! Petugas kami akan menunggu di area penjemputan Bandara I Gusti Ngurah Rai (Kedatangan Domestik / Internasional) dengan membawa papan nama Anda.',
    },
    {
      q: 'Apa saja persyaratan dokumen untuk sewa lepas kunci?',
      a: 'Syarat mudah dan cepat: Cukup kirimkan foto KTP/Paspor yang masih berlaku, SIM A resmi, dan bukti tiket kedatangan atau reservasi penginapan (hotel/villa) via WhatsApp terenkripsi.',
    },
    {
      q: 'Apakah mobil listrik Electra bebas aturan ganjil-genap?',
      a: 'Benar 100%. Sesuai Pergub dan regulasi pemerintah, seluruh kendaraan listrik murni (EV) berplat lisensi lis biru bebas melintas di seluruh koridor ganjil-genap setiap hari tanpa batasan.',
    },
  ];

  return (
    <View style={styles.faqWrap}>
      <View style={styles.sectionHeaderCentered}>
        <View style={styles.eyebrowRow}>
          <Text style={styles.eyebrowText}>PERTANYAAN UMUM SEPUTAR SEWA EV</Text>
          <View style={styles.eyebrowLine} />
        </View>
        <Text style={styles.editorialTitle}>
          Semua yang Perlu Anda Ketahui <Text style={styles.editorialTitleAccent}>Sebelum Berangkat</Text>
        </Text>
        <Text style={styles.sectionSubtitleCentered}>
          Jawaban transparan untuk kenyamanan dan kelancaran proses sewa mobil listrik Anda.
        </Text>
      </View>

      <View style={styles.faqContainer}>
        {faqs.map((f, idx) => {
          const isOpen = openIdx === idx;
          return (
            <View key={idx} style={[styles.faqCard, isOpen && styles.faqCardOpen]}>
              <TouchableOpacity
                style={styles.faqQuestionRow}
                onPress={() => setOpenIdx(isOpen ? null : idx)}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityState={{ expanded: isOpen }}
              >
                <Text style={[styles.faqQuestionText, isOpen && styles.faqQuestionTextOpen]}>
                  {f.q}
                </Text>
                <View style={[styles.faqChevronBox, isOpen && styles.faqChevronBoxOpen]}>
                  {isOpen ? <ChevronUp size={18} color="#0B72C9" /> : <ChevronDown size={18} color="#64748B" />}
                </View>
              </TouchableOpacity>

              {isOpen && (
                <View style={styles.faqAnswerBox}>
                  <Text style={styles.faqAnswerText}>{f.a}</Text>
                </View>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
};

// -------------------------------------------------------------
// 4. SEKSI BANNER CTA PENUTUP (PRE-FOOTER)
// -------------------------------------------------------------
export const FinalCtaBanner: React.FC = () => {
  const router = useRouter();

  const handleOpenWA = () => {
    const url = 'https://wa.me/6281234567890?text=Halo%20Admin%20Electra%2C%20saya%20ingin%20reservasi%20sewa%20mobil%20listrik';
    if (Platform.OS === 'web') {
      window.open(url, '_blank');
    } else {
      Linking.openURL(url);
    }
  };

  return (
    <View style={styles.ctaBanner}>
      <View style={styles.ctaGlow1} pointerEvents="none" />
      <View style={styles.ctaGlow2} pointerEvents="none" />
      <View style={styles.ctaInner}>
        <View style={styles.ctaTag}>
          <CheckCircle2 size={15} color="#38BDF8" />
          <Text style={styles.ctaTagText}>KONFIRMASI CEPAT 5 MENIT VIA WHATSAPP</Text>
        </View>

        <Text style={styles.ctaHeading}>
          Siap Menikmati Perjalanan Ramah Lingkungan Bersama Electra?
        </Text>

        <Text style={styles.ctaDesc}>
          Amankan unit mobil listrik pilihan Anda sekarang juga. Baterai prima 100%, pengantaran tepat waktu di bandara, dan bantuan siaga 24 jam.
        </Text>

        <View style={styles.ctaBtnRow}>
          <TouchableOpacity style={styles.ctaPrimaryBtn} onPress={handleOpenWA} activeOpacity={0.85}>
            <MessageCircle size={18} color="#FFFFFF" />
            <Text style={styles.ctaPrimaryBtnText}>Reservasi Instan via WhatsApp</Text>
            <ArrowRight size={16} color="#FFFFFF" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.ctaSecondaryBtn} onPress={() => router.push('/armada')} activeOpacity={0.85}>
            <Text style={styles.ctaSecondaryBtnText}>Lihat Katalog Lengkap</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

// -------------------------------------------------------------
// STYLES
// -------------------------------------------------------------
const styles = StyleSheet.create({
  // Common Section Header
  sectionHeaderCentered: {
    alignItems: 'center',
    marginBottom: 40,
    maxWidth: 820,
    alignSelf: 'center',
    paddingHorizontal: 16,
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  eyebrowText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0B72C9',
    letterSpacing: 1.5,
  },
  eyebrowLine: {
    width: 36,
    height: 1.5,
    backgroundColor: '#0B72C9',
  },
  editorialTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: '#0B1C30',
    textAlign: 'center',
    lineHeight: 42,
    marginBottom: 12,
    ...(Platform.OS === 'web' ? ({ fontFamily: "'Fraunces', 'Playfair Display', Georgia, serif" } as any) : {}),
  },
  editorialTitleAccent: {
    color: '#0B72C9',
  },
  sectionSubtitleCentered: {
    fontSize: 15,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 25,
  },

  // Charging Section
  chargingWrap: {
    paddingVertical: 56,
  },
  chargingGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
  },
  chargingCard: {
    flex: 1,
    minWidth: 280,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 28,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#03192A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  chargingCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  chargingIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chargingTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  chargingTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D',
  },
  chargingTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0B1C30',
    marginBottom: 10,
    lineHeight: 24,
  },
  chargingDesc: {
    fontSize: 13.5,
    color: '#64748B',
    lineHeight: 22,
  },

  // Testimonials Section
  testimonialWrap: {
    paddingVertical: 56,
    backgroundColor: '#F8FAFC',
    borderRadius: 24,
    marginVertical: 16,
    paddingHorizontal: 20,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  starRow: {
    flexDirection: 'row',
    gap: 2,
  },
  ratingBadgeText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#334155',
  },
  reviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
  },
  reviewCard: {
    flex: 1,
    minWidth: 280,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 26,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#03192A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  reviewQuoteIcon: {
    marginBottom: 10,
  },
  reviewStars: {
    flexDirection: 'row',
    gap: 3,
    marginBottom: 12,
  },
  reviewText: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 23,
    fontStyle: 'italic',
    marginBottom: 20,
    flex: 1,
  },
  reviewAuthor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 14,
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0B72C9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 16,
  },
  authorName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0B1C30',
  },
  authorRole: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 1,
  },
  authorVehicle: {
    fontSize: 11,
    color: '#0284C7',
    fontWeight: '600',
    marginTop: 2,
  },

  // FAQ Section
  faqWrap: {
    paddingVertical: 56,
  },
  faqContainer: {
    maxWidth: 820,
    width: '100%',
    alignSelf: 'center',
    gap: 12,
  },
  faqCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  faqCardOpen: {
    borderColor: '#BAE6FD',
    backgroundColor: '#F8FAFC',
  },
  faqQuestionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 20,
    gap: 14,
  },
  faqQuestionText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    flex: 1,
    lineHeight: 22,
  },
  faqQuestionTextOpen: {
    color: '#0B72C9',
  },
  faqChevronBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  faqChevronBoxOpen: {
    backgroundColor: '#E0F2FE',
  },
  faqAnswerBox: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  faqAnswerText: {
    fontSize: 13.5,
    color: '#475569',
    lineHeight: 22,
  },

  // Final CTA Banner
  ctaBanner: {
    marginVertical: 48,
    borderRadius: 24,
    backgroundColor: '#03192A',
    paddingVertical: 56,
    paddingHorizontal: 24,
    overflow: 'hidden',
    position: 'relative',
  },
  ctaGlow1: {
    position: 'absolute',
    top: -100,
    right: -100,
    width: 340,
    height: 340,
    borderRadius: 170,
    backgroundColor: 'rgba(11, 114, 201, 0.35)',
  },
  ctaGlow2: {
    position: 'absolute',
    bottom: -100,
    left: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
  },
  ctaInner: {
    maxWidth: 760,
    alignSelf: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  ctaTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    marginBottom: 20,
  },
  ctaTagText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#38BDF8',
    letterSpacing: 1,
  },
  ctaHeading: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 42,
    marginBottom: 16,
    ...(Platform.OS === 'web' ? ({ fontFamily: "'Fraunces', 'Playfair Display', Georgia, serif" } as any) : {}),
  },
  ctaDesc: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    lineHeight: 25,
    marginBottom: 28,
  },
  ctaBtnRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    justifyContent: 'center',
  },
  ctaPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#0B72C9',
    paddingVertical: 14,
    paddingHorizontal: 26,
    borderRadius: 50,
    shadowColor: '#0B72C9',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 4,
  },
  ctaPrimaryBtnText: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  ctaSecondaryBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    paddingVertical: 14,
    paddingHorizontal: 26,
    borderRadius: 50,
  },
  ctaSecondaryBtnText: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
