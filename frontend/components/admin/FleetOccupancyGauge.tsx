import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions } from 'react-native';
import Svg, { Path, Circle, Defs, LinearGradient, Stop, G, Text as SvgText } from 'react-native-svg';
import {
  Car,
  Zap,
  ShieldCheck,
  Wrench,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Activity,
  CheckCircle2,
} from 'lucide-react-native';
import { AdminSummary } from '../../services/adminApi';
import { T, shadow } from './theme';

interface Props {
  fleet: AdminSummary['fleet'];
  onNavigate: (path: string) => void;
}

export const FleetOccupancyGauge: React.FC<Props> = ({ fleet, onNavigate }) => {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const total = fleet.total || 0;
  const active = fleet.active || 0;
  const inUse = fleet.inUse || 0;
  const available = fleet.available || 0;
  const maintenance = fleet.maintenance || 0;
  const inactive = fleet.inactive || 0;

  const occupancyPct = active > 0 ? Math.round((inUse / active) * 100) : 0;
  const availablePct = active > 0 ? Math.round((available / active) * 100) : 0;
  const maintenancePct = total > 0 ? Math.round((maintenance / total) * 100) : 0;

  // Arc Gauge Math (Semi-Circle from 180 deg to 360 deg)
  const radius = 64;
  const strokeWidth = 14;
  const circumference = Math.PI * radius; // Half-circle perimeter
  const strokeDashoffset = circumference - (occupancyPct / 100) * circumference;

  const gaugeColor =
    occupancyPct >= 70 ? '#10B981' : occupancyPct >= 40 ? '#0284C7' : '#F59E0B';
  const gaugeStatusText =
    occupancyPct >= 70
      ? 'Utilisasi Optimal (>70%)'
      : occupancyPct >= 40
      ? 'Kapasitas Normal (40-70%)'
      : 'Kapasitas Rendah (<40%)';
  const gaugeStatusColor =
    occupancyPct >= 70 ? '#059669' : occupancyPct >= 40 ? '#0369A1' : '#D97706';

  return (
    <View style={[styles.card, shadow]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.iconCircle}>
            <Activity size={18} color="#03579D" />
          </View>
          <View>
            <Text style={styles.headerTag}>UTILISASI &amp; EFISIENSI ARMADA</Text>
            <Text style={styles.title}>Meteran Okupansi Armada EV</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.btnArmada}
          onPress={() => onNavigate('/admin/armada')}
          activeOpacity={0.8}
        >
          <Text style={styles.btnArmadaText}>Kelola Armada</Text>
          <ArrowRight size={13} color="#03579D" />
        </TouchableOpacity>
      </View>

      {/* Main Visual: Gauge + Stats Grid */}
      <View style={[styles.contentRow, isMobile && styles.contentRowMobile]}>
        {/* Left: Semi-Circular SVG Speedometer Gauge */}
        <View style={styles.gaugeContainer}>
          <Svg width="180" height="110" viewBox="0 0 180 110">
            <Defs>
              <LinearGradient id="gaugeGrad" x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0%" stopColor="#0284C7" />
                <Stop offset="70%" stopColor="#0EA5E9" />
                <Stop offset="100%" stopColor="#10B981" />
              </LinearGradient>
            </Defs>

            {/* Background Track Arc */}
            <Path
              d="M 26 95 A 64 64 0 0 1 154 95"
              fill="none"
              stroke="#E2E8F0"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
            />

            {/* Active Colored Progress Arc */}
            <Path
              d="M 26 95 A 64 64 0 0 1 154 95"
              fill="none"
              stroke="url(#gaugeGrad)"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={`${circumference} ${circumference}`}
              strokeDashoffset={strokeDashoffset}
            />

            {/* Center Percentage Display */}
            <SvgText
              x="90"
              y="74"
              fontSize="28"
              fontWeight="900"
              fill="#0F172A"
              textAnchor="middle"
            >
              {`${occupancyPct}%`}
            </SvgText>
            <SvgText
              x="90"
              y="92"
              fontSize="9.5"
              fontWeight="800"
              fill="#64748B"
              textAnchor="middle"
              letterSpacing="0.8"
            >
              ON ROAD
            </SvgText>
          </Svg>

          <View style={[styles.statusBadge, { backgroundColor: `${gaugeStatusColor}15` }]}>
            <View style={[styles.statusDot, { backgroundColor: gaugeStatusColor }]} />
            <Text style={[styles.statusBadgeText, { color: gaugeStatusColor }]}>
              {gaugeStatusText}
            </Text>
          </View>
        </View>

        {/* Right: Breakdown Bars & Breakdown Tiles */}
        <View style={styles.breakdownCol}>
          {/* Multi-Segment Stacked Bar */}
          <View style={styles.stackedBarWrap}>
            <View style={styles.stackedBarHeader}>
              <Text style={styles.stackedBarLabel}>KOMPOSISI DISTRIBUSI ARMADA ({total} UNIT)</Text>
              <Text style={styles.stackedBarVal}>{active} Unit Aktif</Text>
            </View>
            <View style={styles.stackedBarTrack}>
              {inUse > 0 && (
                <View
                  style={[
                    styles.stackedBarSegment,
                    {
                      flex: inUse,
                      backgroundColor: '#0284C7',
                      borderTopLeftRadius: 6,
                      borderBottomLeftRadius: 6,
                    },
                  ]}
                />
              )}
              {available > 0 && (
                <View style={[styles.stackedBarSegment, { flex: available, backgroundColor: '#10B981' }]} />
              )}
              {maintenance > 0 && (
                <View style={[styles.stackedBarSegment, { flex: maintenance, backgroundColor: '#F59E0B' }]} />
              )}
              {inactive > 0 && (
                <View
                  style={[
                    styles.stackedBarSegment,
                    {
                      flex: inactive,
                      backgroundColor: '#CBD5E1',
                      borderTopRightRadius: 6,
                      borderBottomRightRadius: 6,
                    },
                  ]}
                />
              )}
            </View>
          </View>

          {/* 4 Interactive Status Mini Tiles */}
          <View style={styles.tilesGrid}>
            {/* Tile 1: On-Road */}
            <View style={[styles.miniTile, { backgroundColor: '#F0F9FF', borderColor: '#BAE6FD' }]}>
              <View style={styles.miniTileHead}>
                <View style={[styles.miniDot, { backgroundColor: '#0284C7' }]} />
                <Text style={styles.miniLabel}>Sedang Disewa</Text>
              </View>
              <Text style={[styles.miniVal, { color: '#0284C7' }]}>{inUse} Unit</Text>
              <Text style={styles.miniSub}>{occupancyPct}% dari unit aktif</Text>
            </View>

            {/* Tile 2: Siap Sewa */}
            <View style={[styles.miniTile, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}>
              <View style={styles.miniTileHead}>
                <View style={[styles.miniDot, { backgroundColor: '#10B981' }]} />
                <Text style={styles.miniLabel}>Siap di Pool</Text>
              </View>
              <Text style={[styles.miniVal, { color: '#059669' }]}>{available} Unit</Text>
              <Text style={styles.miniSub}>{availablePct}% ready sewa</Text>
            </View>

            {/* Tile 3: Maintenance */}
            <View style={[styles.miniTile, { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' }]}>
              <View style={styles.miniTileHead}>
                <View style={[styles.miniDot, { backgroundColor: '#D97706' }]} />
                <Text style={styles.miniLabel}>Perawatan</Text>
              </View>
              <Text style={[styles.miniVal, { color: '#D97706' }]}>{maintenance} Unit</Text>
              <Text style={styles.miniSub}>{maintenancePct}% sedang servis</Text>
            </View>

            {/* Tile 4: Nonaktif */}
            <View style={[styles.miniTile, { backgroundColor: '#F8FAFC', borderColor: '#E2E8F0' }]}>
              <View style={styles.miniTileHead}>
                <View style={[styles.miniDot, { backgroundColor: '#94A3B8' }]} />
                <Text style={styles.miniLabel}>Disembunyikan</Text>
              </View>
              <Text style={[styles.miniVal, { color: '#64748B' }]}>{inactive} Unit</Text>
              <Text style={styles.miniSub}>Nonaktif dari web</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTag: {
    fontSize: 10,
    fontWeight: '800',
    color: '#03579D',
    letterSpacing: 0.8,
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 1,
  },
  btnArmada: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  btnArmadaText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#03579D',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  contentRowMobile: {
    flexDirection: 'column',
  },
  gaugeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 180,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
    marginTop: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  breakdownCol: {
    flex: 1,
    gap: 14,
    width: '100%',
  },
  stackedBarWrap: {
    gap: 6,
  },
  stackedBarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stackedBarLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.6,
  },
  stackedBarVal: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  stackedBarTrack: {
    height: 12,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
    flexDirection: 'row',
    overflow: 'hidden',
  },
  stackedBarSegment: {
    height: '100%',
  },
  tilesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  miniTile: {
    flex: 1,
    minWidth: 120,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 2,
  },
  miniTileHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  miniDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  miniLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#475569',
  },
  miniVal: {
    fontSize: 14,
    fontWeight: '900',
  },
  miniSub: {
    fontSize: 9.5,
    color: '#64748B',
  },
});
