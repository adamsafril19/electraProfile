import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Linking,
  Platform,
  useWindowDimensions,
  ActivityIndicator,
} from 'react-native';
import Head from 'expo-router/head';
import {
  Phone,
  PhoneCall,
  MessageCircle,
  Siren,
  Truck,
  BatteryCharging,
  BatteryWarning,
  Wrench,
  MapPin,
  Clock,
  ShieldCheck,
  Car,
  ChevronDown,
  ChevronUp,
  Compass,
  Copy,
  ExternalLink,
  Sparkles,
  LifeBuoy,
} from 'lucide-react-native';
import { COLORS } from '../constants/colors';
import { FadeIn } from '../components/FadeIn';
import { useLanguage } from '../context/LanguageContext';

type IssueCategory =
  | 'BATTERY_LOW'
  | 'FLAT_TIRE'
  | 'SYSTEM_12V'
  | 'BREAKDOWN'
  | 'ACCIDENT_REPLACEMENT'
  | 'SPKLU_GUIDE';

interface IssueOption {
  id: IssueCategory;
  label: string;
  sublabel: string;
  icon: React.ComponentType<any>;
}

const ISSUE_OPTIONS: IssueOption[] = [
  {
    id: 'BATTERY_LOW',
    label: 'Baterai Drop / Habis di Jalan',
    sublabel: 'Butuh unit mobile charging darurat atau derek ke SPKLU',
    icon: BatteryWarning,
  },
  {
    id: 'FLAT_TIRE',
    label: 'Ban Bocor / Pecah Ban',
    sublabel: 'Butuh perbaikan tambal ban darurat atau penggantian roda',
    icon: Wrench,
  },
  {
    id: 'SYSTEM_12V',
    label: 'Aki 12V Mati / Sistem Terkunci',
    sublabel: 'Layar tidak menyala, pintu terkunci, butuh jumper 12V',
    icon: BatteryCharging,
  },
  {
    id: 'BREAKDOWN',
    label: 'Mogok / Malfungsi Kelistrikan',
    sublabel: 'Kendaraan tidak dapat bergerak, butuh derek gendong',
    icon: Truck,
  },
  {
    id: 'ACCIDENT_REPLACEMENT',
    label: 'Kendala Berat / Mobil Pengganti',
    sublabel: 'Klaim SLA garansi penggantian unit dalam 60-90 menit',
    icon: Car,
  },
  {
    id: 'SPKLU_GUIDE',
    label: 'Panduan Stasiun SPKLU Terdekat',
    sublabel: 'Bantuan navigasi titik pengisian daya EV terdekat & soket sesuai',
    icon: Compass,
  },
];

interface FaqItem {
  q: string;
  a: string;
}

const EMERGENCY_FAQS: FaqItem[] = [
  {
    q: 'Apakah layanan derek darurat ini dikenakan biaya tambahan?',
    a: '100% BEBAS BIAYA. Seluruh penyewa resmi Electra dilindungi fasilitas Roadside Assistance darurat tanpa biaya derek gendong (flatbed), jumper aki 12V, maupun konsultasi dispatcher 24 jam.',
  },
  {
    q: 'Mengapa mobil listrik Electra hanya boleh dievakuasi dengan derek gendong (flatbed)?',
    a: 'Mobil listrik (EV) dilarang keras ditarik menggunakan derek tarik roda konvensional karena putaran roda dapat memicu induksi tegangan balik pada motor listrik magnet permanen dan merusak inverter. Electra hanya mengoperasikan armada derek gendong (flatbed) bersertifikasi demi keamanan penuh.',
  },
  {
    q: 'Bagaimana prosedur jika mobil listrik saya mogok dan tidak bisa langsung diperbaiki?',
    a: 'Kami memberikan Garansi Pengiriman Mobil Pengganti (Replacement Car) dengan SLA 60–90 menit untuk wilayah perkotaan. Anda akan menerima unit EV setara sehingga agenda liburan atau bisnis Anda tidak terganggu.',
  },
  {
    q: 'Bagaimana jika baterai EV saya menipis di area yang jauh dari SPKLU umum?',
    a: 'Segera tekan tombol SOS atau hubungi Hotline Dispatcher. Unit rescue darurat kami dilengkapi pengisi daya DC mobile darurat untuk menginjeksi daya baterai 10–20%, atau langsung dijemput dengan derek gendong ke SPKLU rekanan tercepat.',
  },
  {
    q: 'Berapa nomor telepon darurat yang bisa saya hubungi saat sinyal internet lemah?',
    a: 'Simpan nomor hotline darurat resmi Electra di ponsel Anda: 0812-3456-7890 (Direct Call Center 24 Jam nonstop).',
  },
];

export default function EmergencyScreen() {
  const { width } = useWindowDimensions();
  const { locale, t } = useLanguage();
  const isMobile = width < 768;
  const isDesktop = width >= 1024;

  const HOTLINE_PHONE = '081234567890';
  const HOTLINE_DISPLAY = '0812-3456-7890';
  const WA_NUMBER = '6281234567890';

  // SOS Form States
  const [selectedIssue, setSelectedIssue] = useState<IssueCategory>('BATTERY_LOW');
  const [locationText, setLocationText] = useState('');
  const [renterName, setRenterName] = useState('');
  const [vehicleIdentifier, setVehicleIdentifier] = useState('');
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [locationSuccess, setLocationSuccess] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const handleCallHotline = () => {
    const phoneUrl = `tel:${HOTLINE_PHONE}`;
    if (Platform.OS === 'web') {
      window.location.href = phoneUrl;
    } else {
      Linking.openURL(phoneUrl);
    }
  };

  const handleCopyPhone = () => {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(HOTLINE_PHONE);
      setCopiedPhone(true);
      setTimeout(() => setCopiedPhone(false), 2500);
    } else {
      setCopiedPhone(true);
      setTimeout(() => setCopiedPhone(false), 2500);
    }
  };

  const handleDetectGPS = () => {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.geolocation) {
      setIsDetectingLocation(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setIsDetectingLocation(false);
          const { latitude, longitude, accuracy } = pos.coords;
          const mapsLink = `https://maps.google.com/?q=${latitude.toFixed(6)},${longitude.toFixed(6)}`;
          setLocationText(`GPS: ${latitude.toFixed(5)}, ${longitude.toFixed(5)} (${mapsLink})`);
          setLocationSuccess(true);
        },
        (err) => {
          setIsDetectingLocation(false);
          alert(
            'Izin lokasi GPS belum diaktifkan di browser. Silakan ketik nama jalan, patokan, atau nama hotel Anda secara manual.'
          );
        },
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
      );
    } else {
      alert('Fitur deteksi GPS otomatis hanya tersedia di peramban yang mendukung geolokasi.');
    }
  };

  const handleSendSOSWhatsApp = () => {
    const issueObj = ISSUE_OPTIONS.find((i) => i.id === selectedIssue);
    const issueLabel = issueObj ? issueObj.label : 'Kendala Umum di Jalan';
    const now = new Date();
    const timeFormatted = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    const dateFormatted = now.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

    const lines = [
      '🚨 *SOS EMERGENCY DISPATCH - ELECTRA EV RESCUE*',
      '----------------------------------------',
      `• *Jenis Kendala*: ${issueLabel}`,
      `• *Lokasi / Patokan*: ${locationText.trim() || 'Lokasi saat ini (menunggu konfirmasi)'}`,
      renterName.trim() ? `• *Nama Pelapor*: ${renterName.trim()}` : null,
      vehicleIdentifier.trim() ? `• *Unit / No. Polisi*: ${vehicleIdentifier.trim()}` : null,
      `• *Waktu Kejadian*: ${dateFormatted}, ${timeFormatted} WITA`,
      '----------------------------------------',
      'Mohon segera kirimkan unit bantuan darurat / dispatcher ke lokasi saya.',
    ].filter(Boolean);

    const fullMessage = lines.join('\n');
    const waUrl = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(fullMessage)}`;

    if (Platform.OS === 'web') {
      window.open(waUrl, '_blank');
    } else {
      Linking.openURL(waUrl);
    }
  };

  const handleOpenGeneralWhatsApp = () => {
    const waUrl = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(
      'Halo Dispatcher Electra, saya memerlukan bantuan darurat dan informasi layanan roadside assistance.'
    )}`;
    if (Platform.OS === 'web') {
      window.open(waUrl, '_blank');
    } else {
      Linking.openURL(waUrl);
    }
  };

  return (
    <View style={styles.container}>
      <Head>
        <title>Layanan Darurat 24 Jam & Roadside Assistance EV | Electra</title>
        <meta
          name="description"
          content="Hotline darurat 24 jam nonstop, derek gendong flatbed gratis khusus mobil listrik, jumper aki 12V, mobile charging darurat, dan garansi mobil pengganti 60-90 menit."
        />
      </Head>

      {/* ========================================================
          1. HERO COMMAND CENTER (EDITORIAL DARK BLUE & CRIMSON)
          ======================================================== */}
      <View style={styles.heroSection}>
        {/* Glow Spheres */}
        <View style={styles.heroGlowRed} pointerEvents="none" />
        <View style={styles.heroGlowCyan} pointerEvents="none" />

        <View style={styles.heroInner}>
          <FadeIn>
            {/* Live Dispatcher Eyebrow Pill */}
            <View style={styles.heroEyebrowRow}>
              <View style={styles.liveRadarContainer}>
                <View style={styles.liveRadarPing} />
                <View style={styles.liveRadarDot} />
              </View>
              <Text style={styles.heroEyebrowText}>
                {t('PUSAT TANGGAP DARURAT 24/7 • ROADSIDE ASSISTANCE EV', '24/7 EMERGENCY DISPATCH • EV ROADSIDE ASSISTANCE')}
              </Text>
            </View>

            {/* Editorial Heading */}
            <Text
              style={[
                styles.heroTitle,
                isMobile && styles.heroTitleMobile,
                isDesktop && styles.heroTitleDesktop,
              ]}
            >
              {t('Ketenangan Penuh', 'Total Peace of Mind')} <Text style={styles.heroTitleAccent}>{t('di Setiap Kilometer', 'on Every Journey')}</Text>
            </Text>

            <Text style={[styles.heroSubtitle, isMobile && styles.heroSubtitleMobile]}>
              {t(
                'Tim evakuasi siaga 24 jam nonstop dengan standar keselamatan tegangan tinggi. Didukung armada derek gendong resmi (flatbed), unit mobile charging darurat, dan garansi pengiriman mobil pengganti tiba dalam 60–90 menit.',
                '24/7 rapid roadside assistance team trained in high-voltage safety standards. Supported by dedicated EV flatbed tow trucks, mobile DC emergency charging units, and replacement car delivery in 60-90 minutes.'
              )}
            </Text>
          </FadeIn>

          {/* ========================================================
              2. RED HOT DISPATCH HUB CARD (COMMAND BENTO)
              ======================================================== */}
          <FadeIn delay={100}>
            <View style={[styles.dispatchCard, isMobile && styles.dispatchCardMobile]}>
              {/* Header inside card */}
              <View style={styles.dispatchHeader}>
                <View style={styles.dispatchBadge}>
                  <Siren size={15} color="#FFFFFF" />
                  <Text style={styles.dispatchBadgeText}>{t('HOTLINE DISPATCHER SIAGA', 'DISPATCHER HOTLINE ON-DUTY')}</Text>
                </View>
                <View style={styles.dispatchStatusPill}>
                  <View style={styles.statusDotGreen} />
                  <Text style={styles.statusPillText}>{t('Rata-rata Respon < 2 Menit', 'Avg. Response < 2 Minutes')}</Text>
                </View>
              </View>

              {/* Main Phone Call Action */}
              <View style={styles.dispatchMainRow}>
                <View style={styles.dispatchPhoneCol}>
                  <Text style={styles.dispatchPhoneLabel}>{t('PANGGILAN DARURAT (CALL CENTER):', 'EMERGENCY CALL CENTER:')}</Text>
                  <View style={styles.phoneActionGroup}>
                    <Text style={[styles.dispatchPhoneText, isMobile && styles.dispatchPhoneTextMobile]}>
                      {HOTLINE_DISPLAY}
                    </Text>
                    <TouchableOpacity
                      style={styles.copyBtn}
                      onPress={handleCopyPhone}
                      accessibilityRole="button"
                      accessibilityLabel="Salin nomor hotline"
                    >
                      <Copy size={14} color="#94A3B8" />
                      <Text style={styles.copyBtnText}>
                        {copiedPhone ? t('Tersalin!', 'Copied!') : t('Salin', 'Copy')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.dispatchNoteText}>
                    {t('Bebas pulsa / tarif lokal • Jalur prioritas tanpa antrean operator robot', 'Toll-free / local rate • Direct human dispatcher priority line')}
                  </Text>
                </View>

                {/* Primary Dual Call Buttons */}
                <View style={[styles.dispatchBtnGroup, isMobile && styles.dispatchBtnGroupMobile]}>
                  <TouchableOpacity
                    style={styles.btnCallPrimary}
                    onPress={handleCallHotline}
                    activeOpacity={0.85}
                    accessibilityRole="link"
                  >
                    <PhoneCall size={18} color="#FFFFFF" />
                    <Text style={styles.btnCallPrimaryText}>{t('Hubungi Hotline Darurat', 'Call Emergency Hotline')}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.btnWaSecondary}
                    onPress={handleOpenGeneralWhatsApp}
                    activeOpacity={0.85}
                    accessibilityRole="link"
                  >
                    <MessageCircle size={18} color="#FFFFFF" />
                    <Text style={styles.btnWaSecondaryText}>{t('WhatsApp Dispatcher', 'WhatsApp Dispatcher')}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* 4 SLA Metrics Strip Inside Command Hub */}
              <View style={styles.slaStrip}>
                {[
                  { icon: Clock, title: '< 2 ' + t('Menit', 'Min'), sub: t('Respon Telepon', 'Phone Response') },
                  { icon: Truck, title: '30–45 ' + t('Mnt', 'Min'), sub: t('Tiba di Lokasi', 'On-Site Arrival') },
                  { icon: Car, title: '60–90 ' + t('Mnt', 'Min'), sub: t('Mobil Pengganti', 'Replacement Car') },
                  { icon: ShieldCheck, title: 'Rp 0', sub: t('Derek EV Resmi', 'Official EV Tow') },
                ].map((m, idx) => (
                  <View
                    key={m.sub}
                    style={[
                      styles.slaItem,
                      idx < 3 && styles.slaItemBorder,
                      isMobile && idx % 2 === 0 && { borderRightWidth: 1, borderRightColor: 'rgba(255,255,255,0.1)' },
                    ]}
                  >
                    <m.icon size={16} color="#38BDF8" style={{ marginBottom: 4 }} />
                    <Text style={styles.slaValue}>{m.title}</Text>
                    <Text style={styles.slaLabel}>{m.sub}</Text>
                  </View>
                ))}
              </View>
            </View>
          </FadeIn>
        </View>
      </View>

      {/* ========================================================
          3. INTERACTIVE SOS DISPATCH ASSISTANT (ZERO-PANIC FORM)
          ======================================================== */}
      <View style={styles.mainContent}>
        <View style={styles.contentWrap}>
          <FadeIn delay={150}>
            <View style={styles.sosCard}>
              <View style={styles.sosCardHeader}>
                <View style={styles.sosCardIconWrap}>
                  <LifeBuoy size={24} color="#03579D" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sosCardEyebrow}>{t('SISTEM LAPOR CEPAT (FAST SOS DISPATCH)', 'FAST SOS DISPATCH SYSTEM')}</Text>
                  <Text style={styles.sosCardTitle}>
                    {t('Kirim Sinyal Darurat & Koordinat GPS ke Tim Evakuasi', 'Send Emergency SOS & GPS Coordinates to Rescue Team')}
                  </Text>
                  <Text style={styles.sosCardSubtitle}>
                    Pilih jenis kendala dan sertakan lokasi Anda agar dispatcher dapat langsung
                    mengarahkan armada derek atau mobile unit terdekat.
                  </Text>
                </View>
              </View>

              {/* Step 1: Pilih Kendala */}
              <View style={styles.formSection}>
                <Text style={styles.formSectionLabel}>{t('1. PILIH KATEGORI KENDALA KENDARAAN', '1. SELECT VEHICLE ISSUE CATEGORY')}</Text>
                <View style={styles.issueGrid}>
                  {ISSUE_OPTIONS.map((item) => {
                    const isSelected = selectedIssue === item.id;
                    const IconComponent = item.icon;
                    return (
                      <TouchableOpacity
                        key={item.id}
                        style={[
                          styles.issueCard,
                          isSelected && styles.issueCardSelected,
                          isMobile && styles.issueCardMobile,
                        ]}
                        onPress={() => setSelectedIssue(item.id)}
                        activeOpacity={0.8}
                      >
                        <View
                          style={[
                            styles.issueIconWrap,
                            isSelected && styles.issueIconWrapSelected,
                          ]}
                        >
                          <IconComponent
                            size={18}
                            color={isSelected ? '#03579D' : '#64748B'}
                          />
                        </View>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text
                            style={[
                              styles.issueLabel,
                              isSelected && styles.issueLabelSelected,
                            ]}
                          >
                            {item.label}
                          </Text>
                          <Text style={styles.issueSublabel}>{item.sublabel}</Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Step 2: Lokasi Anda dengan GPS Detection */}
              <View style={styles.formSection}>
                <View style={styles.locationHeaderRow}>
                  <Text style={styles.formSectionLabel}>{t('2. TITIK LOKASI KEJADIAN / PATOKAN', '2. INCIDENT LOCATION / LANDMARK')}</Text>
                  {Platform.OS === 'web' && (
                    <TouchableOpacity
                      style={[
                        styles.gpsDetectBtn,
                        locationSuccess && styles.gpsDetectBtnSuccess,
                      ]}
                      onPress={handleDetectGPS}
                      disabled={isDetectingLocation}
                      activeOpacity={0.8}
                    >
                      {isDetectingLocation ? (
                        <ActivityIndicator size="small" color="#03579D" />
                      ) : (
                        <MapPin size={14} color={locationSuccess ? '#047857' : '#03579D'} />
                      )}
                      <Text
                        style={[
                          styles.gpsDetectBtnText,
                          locationSuccess && styles.gpsDetectBtnTextSuccess,
                        ]}
                      >
                        {isDetectingLocation
                          ? 'Mendeteksi Koordinat...'
                          : locationSuccess
                          ? t('✓ GPS Terdeteksi', '✓ GPS Detected')
                          : t('📍 Ambil Lokasi GPS Saya', '📍 Get My GPS Location')}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

                <TextInput
                  style={styles.locationInput}
                  value={locationText}
                  onChangeText={(val) => {
                    setLocationText(val);
                    if (!val) setLocationSuccess(false);
                  }}
                  placeholder="Ketik nama jalan, km jalan tol, nama hotel, atau klik tombol GPS di atas"
                  placeholderTextColor="#94A3B8"
                />
                <Text style={styles.locationHelpText}>
                  Tips: Jika berada di jalan tol, sebutkan arah tujuan dan angka kilometer pada tiang
                  patok terdekat.
                </Text>
              </View>

              {/* Step 3: Identitas Opsional */}
              <View style={styles.formSection}>
                <Text style={styles.formSectionLabel}>
                  {t('3. DATA PENYEWA & UNIT KENDARAAN (OPSIONAL)', '3. RENTER & VEHICLE DETAILS (OPTIONAL)')}
                </Text>
                <View style={styles.inputRow}>
                  <View style={styles.inputCol}>
                    <Text style={styles.inputLabel}>{t('Nama Penyewa', 'Renter Name')}</Text>
                    <TextInput
                      style={styles.textInput}
                      value={renterName}
                      onChangeText={setRenterName}
                      placeholder="Contoh: Budi Santoso"
                      placeholderTextColor="#94A3B8"
                    />
                  </View>
                  <View style={styles.inputCol}>
                    <Text style={styles.inputLabel}>{t('Nomor Polisi / Model EV', 'License Plate / EV Model')}</Text>
                    <TextInput
                      style={styles.textInput}
                      value={vehicleIdentifier}
                      onChangeText={setVehicleIdentifier}
                      placeholder="Contoh: DK 1234 EL / BYD Atto 3"
                      placeholderTextColor="#94A3B8"
                    />
                  </View>
                </View>
              </View>

              {/* Submit SOS Action Button */}
              <TouchableOpacity
                style={styles.sosSubmitBtn}
                onPress={handleSendSOSWhatsApp}
                activeOpacity={0.85}
              >
                <MessageCircle size={22} color="#FFFFFF" />
                <Text style={styles.sosSubmitBtnText}>
                  {t('KIRIM LAPORAN SOS KE DISPATCHER SEKARANG →', 'SEND SOS REPORT TO DISPATCHER NOW →')}
                </Text>
              </TouchableOpacity>
            </View>
          </FadeIn>

          {/* ========================================================
              4. 4 PROTOKOL EV ROADSIDE ASSISTANCE (STANDAR KESELAMATAN)
              ======================================================== */}
          <View style={styles.protocolSection}>
            <View style={styles.sectionHeadingCenter}>
              <View style={styles.pillTag}>
                <Sparkles size={13} color="#03579D" />
                <Text style={styles.pillTagText}>STANDAR KESELAMATAN KHUSUS EV</Text>
              </View>
              <Text style={styles.sectionTitleDark}>
                4 Jaminan Perlindungan Darurat Mobil Listrik
              </Text>
              <Text style={styles.sectionSubtitleDark}>
                Mengapa penanganan mobil listrik berbeda? Seluruh armada Electra dilindungi protokol
                resmi pabrikan untuk menjamin keamanan sistem kelistrikan bertegangan tinggi.
              </Text>
            </View>

            <View style={styles.protocolGrid}>
              {[
                {
                  icon: Truck,
                  badge: '100% BEBAS BIAYA',
                  title: 'Derek Gendong Khusus EV (Flatbed Only)',
                  desc: 'Mobil listrik dilarang ditarik dengan roda berputar karena dapat merusak motor listrik & inverter. Electra secara eksklusif menggunakan derek gendong (flatbed towing) gratis.',
                },
                {
                  icon: BatteryCharging,
                  badge: 'MOBILE CHARGING RESCUE',
                  title: 'Unit Suplai Baterai Darurat di Jalan',
                  desc: 'Baterai menipis sebelum sempat ke SPKLU? Tim rescue bergerak membawa generator DC quick charging bergerak untuk menyuntikkan daya 10-20% hingga aman mencapai charger terdekat.',
                },
                {
                  icon: Car,
                  badge: 'SLA 60–90 MENIT',
                  title: 'Garansi Pengiriman Mobil Pengganti',
                  desc: 'Jika unit mengalami malfungsi teknis yang memerlukan inspeksi bengkel lebih lanjut, kami mengantarkan unit mobil pengganti setara langsung ke lokasi Anda.',
                },
                {
                  icon: Wrench,
                  badge: 'SERTIFIKASI RESMI',
                  title: 'Teknisi High-Voltage & Jumper 12V',
                  desc: 'Dukungan mekanik bersertifikat penanganan kelistrikan tegangan tinggi (400V–800V) dan jumper aki 12V pendukung sistem komputer kendaraan.',
                },
              ].map((p, idx) => (
                <View
                  key={p.title}
                  style={[styles.protocolCard, isMobile && styles.protocolCardMobile]}
                >
                  <View style={styles.protocolTopRow}>
                    <View style={styles.protocolIconWrap}>
                      <p.icon size={22} color="#03579D" />
                    </View>
                    <View style={styles.protocolBadge}>
                      <Text style={styles.protocolBadgeText}>{p.badge}</Text>
                    </View>
                  </View>
                  <Text style={styles.protocolCardTitle}>{p.title}</Text>
                  <Text style={styles.protocolCardDesc}>{p.desc}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* ========================================================
              5. SOP 4 LANGKAH AMAN SAAT MENGALAMI KENDALA (GUIDELINE)
              ======================================================== */}
          <View style={styles.sopSection}>
            <View style={styles.sopCard}>
              <Text style={styles.sopEyebrow}>PANDUAN KESELAMATAN BERKENDARA</Text>
              <Text style={styles.sopTitle}>Langkah Aman Saat Terjadi Kendala di Jalan</Text>
              <Text style={styles.sopSubtitle}>
                Prioritaskan keselamatan diri dan penumpang dengan mengikuti prosedur standar berikut:
              </Text>

              <View style={styles.sopStepsGrid}>
                {[
                  {
                    step: '01',
                    title: 'Menepi ke Bahu Jalan',
                    desc: 'Arahkan mobil perlahan ke bahu jalan atau rest area terdekat yang rata, lalu nyalakan lampu hazard darurat.',
                  },
                  {
                    step: '02',
                    title: 'Pasang Segitiga Pengaman',
                    desc: 'Ambil segitiga pengaman di bagasi belakang dan letakkan 30–50 meter di belakang mobil sebagai penanda visual lalu lintas.',
                  },
                  {
                    step: '03',
                    title: 'Kirim Sinyal SOS / Telepon',
                    desc: 'Buka formulir SOS di halaman ini untuk kirim koordinat GPS via WhatsApp atau hubungi Hotline 0812-3456-7890.',
                  },
                  {
                    step: '04',
                    title: 'Tetap di Lokasi Aman',
                    desc: 'Tunggu di dalam kabin atau trotoar yang teduh. Tim dispatcher akan memantau dan memberi kabar posisi armada rescue secara berkala.',
                  },
                ].map((s) => (
                  <View key={s.step} style={styles.sopStepCol}>
                    <Text style={styles.sopStepNumber}>{s.step}</Text>
                    <Text style={styles.sopStepTitle}>{s.title}</Text>
                    <Text style={styles.sopStepDesc}>{s.desc}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          {/* ========================================================
              6. CAKUPAN WILAYAH LAYANAN RESPON CEPAT (COVERAGE)
              ======================================================== */}
          <View style={styles.coverageSection}>
            <View style={styles.coverageCard}>
              <View style={styles.coverageIcon}>
                <Compass size={28} color="#03579D" />
              </View>
              <Text style={styles.coverageTitle}>Wilayah Cakupan Respon Cepat Electra</Text>
              <Text style={styles.coverageDesc}>
                Pos siaga armada derek dan tim teknisi kami tersebar strategis di titik-titik krusial
                pariwisata dan bisnis:
              </Text>

              <View style={styles.coverageTagsWrap}>
                {[
                  'Bandara I Gusti Ngurah Rai',
                  'Kuta & Legian',
                  'Seminyak & Kerobokan',
                  'Canggu & Berawa',
                  'Nusa Dua & Tanjung Benoa',
                  'Jimbaran & Uluwatu',
                  'Sanur & Denpasar Kota',
                  'Ubud & Gianyar',
                  'Jalur Tol Bali Mandara',
                  'Jalur Tol Trans-Jawa & Jabodetabek',
                ].map((tag) => (
                  <View key={tag} style={styles.coverageTag}>
                    <MapPin size={12} color="#03579D" />
                    <Text style={styles.coverageTagText}>{tag}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          {/* ========================================================
              7. FAQ KHUSUS LAYANAN DARURAT (ACCORDION)
              ======================================================== */}
          <View style={styles.faqSection}>
            <View style={styles.sectionHeadingCenter}>
              <Text style={styles.sectionTitleDark}>Pertanyaan Seputar Layanan Darurat</Text>
              <Text style={styles.sectionSubtitleDark}>
                Semua yang perlu Anda ketahui mengenai jaminan ketenangan perjalanan bersama Electra.
              </Text>
            </View>

            <View style={styles.faqAccordionWrap}>
              {EMERGENCY_FAQS.map((faq, idx) => {
                const isOpen = openFaqIndex === idx;
                return (
                  <View key={faq.q} style={styles.faqItem}>
                    <TouchableOpacity
                      style={styles.faqQuestionBtn}
                      onPress={() => setOpenFaqIndex(isOpen ? null : idx)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.faqQuestionText, isOpen && styles.faqQuestionTextActive]}>
                        {faq.q}
                      </Text>
                      {isOpen ? (
                        <ChevronUp size={18} color="#03579D" />
                      ) : (
                        <ChevronDown size={18} color="#64748B" />
                      )}
                    </TouchableOpacity>
                    {isOpen && (
                      <View style={styles.faqAnswerWrap}>
                        <Text style={styles.faqAnswerText}>{faq.a}</Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        </View>
      </View>

      {/* ========================================================
          8. STICKY MOBILE EMERGENCY BAR (ALWAYS ACCESSIBLE)
          ======================================================== */}
      {isMobile && (
        <View style={styles.stickyMobileBar}>
          <TouchableOpacity
            style={styles.stickyCallBtn}
            onPress={handleCallHotline}
            activeOpacity={0.85}
          >
            <PhoneCall size={16} color="#FFFFFF" />
            <Text style={styles.stickyCallBtnText}>{t('Telepon', 'Call')} 0812-3456-7890</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.stickyWaBtn}
            onPress={handleSendSOSWhatsApp}
            activeOpacity={0.85}
          >
            <MessageCircle size={16} color="#FFFFFF" />
            <Text style={styles.stickyWaBtnText}>{t('Kirim SOS WA', 'Send SOS WA')}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    minHeight: '100%',
  },

  // 1. Hero Section
  heroSection: {
    backgroundColor: '#02121E',
    paddingTop: 56,
    paddingBottom: 64,
    paddingHorizontal: 20,
    position: 'relative',
    overflow: 'hidden',
  },
  heroGlowRed: {
    position: 'absolute',
    top: -100,
    right: '15%',
    width: 480,
    height: 480,
    borderRadius: 240,
    backgroundColor: 'rgba(220, 38, 38, 0.16)',
  },
  heroGlowCyan: {
    position: 'absolute',
    bottom: -60,
    left: '10%',
    width: 420,
    height: 420,
    borderRadius: 210,
    backgroundColor: 'rgba(2, 132, 199, 0.14)',
  },
  heroInner: {
    maxWidth: 1080,
    width: '100%',
    alignSelf: 'center',
    gap: 32,
    zIndex: 10,
  },
  heroEyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  liveRadarContainer: {
    width: 14,
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  liveRadarPing: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#EF4444',
    opacity: 0.6,
  },
  liveRadarDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  heroEyebrowText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FCA5A5',
    letterSpacing: 2,
  },
  heroTitle: {
    fontFamily:
      Platform.OS === 'web'
        ? "Fraunces, 'Playfair Display', Georgia, serif"
        : undefined,
    fontSize: 34,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.8,
    lineHeight: 44,
    marginBottom: 16,
  },
  heroTitleMobile: {
    fontSize: 28,
    lineHeight: 36,
  },
  heroTitleDesktop: {
    fontSize: 44,
    lineHeight: 52,
  },
  heroTitleAccent: {
    color: '#F87171',
    fontStyle: 'italic',
  },
  heroSubtitle: {
    fontSize: 15.5,
    color: '#CBD5E1',
    lineHeight: 25,
    maxWidth: 780,
  },
  heroSubtitleMobile: {
    fontSize: 14,
    lineHeight: 22,
  },

  // 2. Dispatch Hub Bento Card
  dispatchCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
    padding: 28,
    gap: 24,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.18,
    shadowRadius: 36,
    elevation: 8,
  },
  dispatchCardMobile: {
    padding: 18,
    gap: 20,
    borderRadius: 18,
  },
  dispatchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    paddingBottom: 16,
  },
  dispatchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#DC2626',
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 999,
  },
  dispatchBadgeText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  dispatchStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 999,
  },
  statusDotGreen: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#34D399',
  },
  statusPillText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#34D399',
  },
  dispatchMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 24,
  },
  dispatchPhoneCol: {
    flex: 1,
    minWidth: 260,
  },
  dispatchPhoneLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  phoneActionGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  dispatchPhoneText: {
    fontSize: 36,
    fontWeight: '900',
    color: '#F87171',
    letterSpacing: 1,
  },
  dispatchPhoneTextMobile: {
    fontSize: 28,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  copyBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#E2E8F0',
  },
  dispatchNoteText: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 6,
  },
  dispatchBtnGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  dispatchBtnGroupMobile: {
    width: '100%',
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  btnCallPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#DC2626',
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderRadius: 12,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 4,
  },
  btnCallPrimaryText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  btnWaSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: COLORS.whatsapp,
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderRadius: 12,
    shadowColor: COLORS.whatsapp,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 4,
  },
  btnWaSecondaryText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.3,
  },

  // SLA Strip inside Dispatch Card
  slaStrip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    paddingTop: 18,
  },
  slaItem: {
    flex: 1,
    minWidth: 120,
    alignItems: 'center',
    paddingVertical: 8,
  },
  slaItemBorder: {
    borderRightWidth: 1,
    borderRightColor: 'rgba(255, 255, 255, 0.08)',
  },
  slaValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  slaLabel: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },

  // 3. Main Content
  mainContent: {
    width: '100%',
    paddingVertical: 40,
    paddingHorizontal: 16,
  },
  contentWrap: {
    maxWidth: 1080,
    width: '100%',
    alignSelf: 'center',
    gap: 48,
  },

  // SOS Form Card
  sosCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 32,
    gap: 28,
    shadowColor: '#03192A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.06,
    shadowRadius: 28,
    elevation: 3,
  },
  sosCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 22,
  },
  sosCardIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sosCardEyebrow: {
    fontSize: 12,
    fontWeight: '800',
    color: '#03579D',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  sosCardTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 28,
  },
  sosCardSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
    lineHeight: 21,
  },

  // Form Sections
  formSection: {
    gap: 12,
  },
  formSectionLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#334155',
    letterSpacing: 0.8,
  },
  issueGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  issueCard: {
    flex: 1,
    minWidth: 260,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  issueCardMobile: {
    minWidth: '100%',
  },
  issueCardSelected: {
    backgroundColor: '#EFF6FF',
    borderColor: '#0284C7',
    borderWidth: 1.5,
  },
  issueIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  issueIconWrapSelected: {
    backgroundColor: '#DBEAFE',
    borderColor: '#93C5FD',
  },
  issueLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  issueLabelSelected: {
    color: '#03579D',
    fontWeight: '800',
  },
  issueSublabel: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 15,
  },

  // Location Field
  locationHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 10,
  },
  gpsDetectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: '#E0F2FE',
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  gpsDetectBtnSuccess: {
    backgroundColor: '#DCFCE7',
    borderColor: '#86EFAC',
  },
  gpsDetectBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#03579D',
  },
  gpsDetectBtnTextSuccess: {
    color: '#15803D',
  },
  locationInput: {
    minHeight: 48,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 13.5,
    color: '#0F172A',
  },
  locationHelpText: {
    fontSize: 11.5,
    color: '#64748B',
  },

  // Input Row
  inputRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  inputCol: {
    flex: 1,
    minWidth: 240,
    gap: 6,
  },
  inputLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#475569',
  },
  textInput: {
    height: 44,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 13,
    color: '#0F172A',
  },

  // SOS Submit Button
  sosSubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#DC2626',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 4,
    marginTop: 8,
  },
  sosSubmitBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.8,
    textAlign: 'center',
  },

  // 4. Protocols Section
  protocolSection: {
    gap: 28,
  },
  sectionHeadingCenter: {
    alignItems: 'center',
    textAlign: 'center',
    maxWidth: 680,
    alignSelf: 'center',
    gap: 8,
  },
  pillTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: '#E0F2FE',
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  pillTagText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#03579D',
    letterSpacing: 1.5,
  },
  sectionTitleDark: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    letterSpacing: -0.4,
  },
  sectionSubtitleDark: {
    fontSize: 14.5,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 23,
  },
  protocolGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 18,
  },
  protocolCard: {
    flex: 1,
    minWidth: 280,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 24,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 14,
    elevation: 2,
  },
  protocolCardMobile: {
    minWidth: '100%',
  },
  protocolTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  protocolIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  protocolBadge: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  protocolBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#03579D',
    letterSpacing: 0.5,
  },
  protocolCardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 22,
  },
  protocolCardDesc: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 20,
  },

  // 5. SOP Section
  sopSection: {
    width: '100%',
  },
  sopCard: {
    backgroundColor: '#0F172A',
    borderRadius: 24,
    padding: 32,
    gap: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  sopEyebrow: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#38BDF8',
    letterSpacing: 2,
  },
  sopTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  sopSubtitle: {
    fontSize: 14,
    color: '#94A3B8',
    lineHeight: 22,
    maxWidth: 720,
  },
  sopStepsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
    marginTop: 8,
  },
  sopStepCol: {
    flex: 1,
    minWidth: 200,
    gap: 8,
  },
  sopStepNumber: {
    fontSize: 28,
    fontWeight: '900',
    color: '#38BDF8',
    fontFamily:
      Platform.OS === 'web'
        ? "Fraunces, 'Playfair Display', Georgia, serif"
        : undefined,
  },
  sopStepTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  sopStepDesc: {
    fontSize: 12.5,
    color: '#94A3B8',
    lineHeight: 18,
  },

  // 6. Coverage Section
  coverageSection: {
    width: '100%',
  },
  coverageCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 28,
    alignItems: 'center',
    textAlign: 'center',
    gap: 12,
  },
  coverageIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverageTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
  },
  coverageDesc: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    maxWidth: 620,
    lineHeight: 22,
  },
  coverageTagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginTop: 10,
    maxWidth: 820,
  },
  coverageTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  coverageTagText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },

  // 7. FAQ Section
  faqSection: {
    gap: 24,
  },
  faqAccordionWrap: {
    maxWidth: 840,
    width: '100%',
    alignSelf: 'center',
    gap: 12,
  },
  faqItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  faqQuestionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 18,
    gap: 12,
  },
  faqQuestionText: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#1E293B',
    flex: 1,
  },
  faqQuestionTextActive: {
    color: '#03579D',
  },
  faqAnswerWrap: {
    paddingHorizontal: 18,
    paddingBottom: 18,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 12,
  },
  faqAnswerText: {
    fontSize: 13.5,
    color: '#475569',
    lineHeight: 22,
  },

  // 8. Sticky Mobile Emergency Bar
  stickyMobileBar: {
    position: 'fixed' as any,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(2, 18, 30, 0.95)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(239, 68, 68, 0.3)',
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: 'row',
    gap: 10,
    zIndex: 999,
  },
  stickyCallBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#DC2626',
    paddingVertical: 12,
    borderRadius: 10,
  },
  stickyCallBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  stickyWaBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.whatsapp,
    paddingVertical: 12,
    borderRadius: 10,
  },
  stickyWaBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
});
