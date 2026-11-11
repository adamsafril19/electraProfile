import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  Platform,
} from 'react-native';
import Svg, {
  Path,
  Defs,
  LinearGradient,
  Stop,
  Circle,
  Line,
  G,
  Text as SvgText,
  Rect,
} from 'react-native-svg';
import {
  TrendingUp,
  CircleDollarSign,
  Calendar,
  Layers,
  ArrowUpRight,
  Sparkles,
  BarChart2,
  Activity,
} from 'lucide-react-native';
import { FinanceSummary, AdminSummary } from '../../services/adminApi';
import { T, shadow } from './theme';
import { rp, rpShort, fmtDate } from './ui';

interface Props {
  summary: AdminSummary;
  finance: FinanceSummary | null;
}

type MetricType = 'REVENUE' | 'BOOKINGS';
type RangeType = '7D' | '14D' | '30D';

export const RevenueBookingChart: React.FC<Props> = ({ summary, finance }) => {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const [metric, setMetric] = useState<MetricType>('REVENUE');
  const [range, setRange] = useState<RangeType>('14D');
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  // Prepare Daily Data Series
  const chartData = useMemo(() => {
    const daysCount = range === '7D' ? 7 : range === '14D' ? 14 : 30;

    // Use finance series if available, otherwise generate from last7Days
    const finSeries = finance?.series || [];
    const last7 = summary.last7Days || [];

    // Build timeline of dates ending today
    const points: { date: string; revenue: number; bookings: number; label: string }[] = [];
    const today = new Date();

    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const dayLabel = `${d.getDate()}/${d.getMonth() + 1}`;

      // Find matching in finance
      const matchFin = finSeries.find((s) => s.label === dateStr);
      const matchBkg = last7.find((s) => s.date === dateStr);

      const rev = matchFin ? matchFin.income : (matchBkg?.count || 0) * 850000;
      const bkg = matchBkg ? matchBkg.count : matchFin ? Math.max(1, Math.round(matchFin.income / 850000)) : 0;

      points.push({
        date: dateStr,
        label: dayLabel,
        revenue: rev,
        bookings: bkg,
      });
    }

    return points;
  }, [summary, finance, range]);

  const activeMetricValues = useMemo(() => {
    return chartData.map((p) => (metric === 'REVENUE' ? p.revenue : p.bookings));
  }, [chartData, metric]);

  const maxValue = useMemo(() => {
    return Math.max(1, ...activeMetricValues);
  }, [activeMetricValues]);

  const totalPeriod = useMemo(() => {
    return activeMetricValues.reduce((a, b) => a + b, 0);
  }, [activeMetricValues]);

  const avgPeriod = useMemo(() => {
    return chartData.length > 0 ? Math.round(totalPeriod / chartData.length) : 0;
  }, [totalPeriod, chartData]);

  // Selected item (defaults to last item if none hovered)
  const selectedPoint = activeIdx !== null ? chartData[activeIdx] : chartData[chartData.length - 1];

  // SVG Chart Dimensions
  const svgWidth = isMobile ? 320 : 680;
  const svgHeight = 200;
  const paddingX = 28;
  const paddingTop = 24;
  const paddingBottom = 30;

  const innerW = svgWidth - paddingX * 2;
  const innerH = svgHeight - paddingTop - paddingBottom;

  // Build SVG Path points
  const coords = useMemo(() => {
    if (chartData.length <= 1) return [];
    const stepX = innerW / (chartData.length - 1);

    return chartData.map((p, idx) => {
      const val = metric === 'REVENUE' ? p.revenue : p.bookings;
      const x = paddingX + idx * stepX;
      const y = paddingTop + innerH - (val / maxValue) * innerH;
      return { x, y, point: p, index: idx };
    });
  }, [chartData, metric, maxValue, innerW, innerH, paddingX, paddingTop]);

  // Cubic Bezier curve path
  const curvePath = useMemo(() => {
    if (coords.length === 0) return '';
    let d = `M ${coords[0].x} ${coords[0].y}`;

    for (let i = 0; i < coords.length - 1; i++) {
      const p0 = coords[i === 0 ? i : i - 1];
      const p1 = coords[i];
      const p2 = coords[i + 1];
      const p3 = coords[i + 2] || p2;

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }
    return d;
  }, [coords]);

  const areaPath = useMemo(() => {
    if (coords.length === 0) return '';
    const lastX = coords[coords.length - 1].x;
    const firstX = coords[0].x;
    const bottomY = paddingTop + innerH;
    return `${curvePath} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
  }, [curvePath, coords, paddingTop, innerH]);

  const activeCoord = activeIdx !== null ? coords[activeIdx] : coords[coords.length - 1];

  return (
    <View style={[styles.card, shadow]}>
      {/* 1. Header Toolbar */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.iconCircle}>
            {metric === 'REVENUE' ? (
              <CircleDollarSign size={18} color="#03579D" />
            ) : (
              <BarChart2 size={18} color="#03579D" />
            )}
          </View>
          <View>
            <View style={styles.tagRow}>
              <Text style={styles.tagText}>VISUALISASI PERFORMA HARIAN</Text>
              <View style={styles.liveBadge}>
                <View style={styles.pulseDot} />
                <Text style={styles.liveBadgeText}>Real-time Sync</Text>
              </View>
            </View>
            <Text style={styles.title}>
              {metric === 'REVENUE' ? 'Tren Pertumbuhan Pendapatan Sewa' : 'Tren Volume Pemesanan Masuk'}
            </Text>
          </View>
        </View>

        {/* Controls: Metric Toggle & Range Toggle */}
        <View style={styles.controlsRow}>
          {/* Metric Selector */}
          <View style={styles.metricToggle}>
            <TouchableOpacity
              style={[styles.toggleBtn, metric === 'REVENUE' && styles.toggleBtnActive]}
              onPress={() => setMetric('REVENUE')}
            >
              <Text style={[styles.toggleText, metric === 'REVENUE' && styles.toggleTextActive]}>
                Omzet (Rp)
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, metric === 'BOOKINGS' && styles.toggleBtnActive]}
              onPress={() => setMetric('BOOKINGS')}
            >
              <Text style={[styles.toggleText, metric === 'BOOKINGS' && styles.toggleTextActive]}>
                Booking (Qty)
              </Text>
            </TouchableOpacity>
          </View>

          {/* Timeframe Selector */}
          <View style={styles.rangeToggle}>
            {(['7D', '14D', '30D'] as const).map((r) => (
              <TouchableOpacity
                key={r}
                style={[styles.rangeBtn, range === r && styles.rangeBtnActive]}
                onPress={() => setRange(r)}
              >
                <Text style={[styles.rangeText, range === r && styles.rangeTextActive]}>{r}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      {/* 2. KPI Ribbon Highlight Cards */}
      <View style={styles.highlightRibbon}>
        <View style={styles.highlightBox}>
          <Text style={styles.highlightLabel}>TOTAL PERIODE {range}</Text>
          <Text style={styles.highlightVal}>
            {metric === 'REVENUE' ? rp(totalPeriod) : `${totalPeriod} Booking`}
          </Text>
        </View>

        <View style={styles.highlightDivider} />

        <View style={styles.highlightBox}>
          <Text style={styles.highlightLabel}>RATA-RATA HARIAN</Text>
          <Text style={[styles.highlightVal, { color: '#03579D' }]}>
            {metric === 'REVENUE' ? rp(avgPeriod) : `${avgPeriod} unit/hr`}
          </Text>
        </View>

        <View style={styles.highlightDivider} />

        <View style={styles.highlightBox}>
          <Text style={styles.highlightLabel}>TITIK TERPILIH ({selectedPoint?.label || 'Hari Ini'})</Text>
          <Text style={[styles.highlightVal, { color: '#059669' }]}>
            {metric === 'REVENUE'
              ? rp(selectedPoint?.revenue || 0)
              : `${selectedPoint?.bookings || 0} Booking`}
          </Text>
        </View>
      </View>

      {/* 3. Interactive SVG Chart Canvas */}
      <View style={styles.chartCanvasWrap}>
        <Svg width="100%" height={svgHeight} viewBox={`0 0 ${svgWidth} ${svgHeight}`}>
          <Defs>
            <LinearGradient id="blueGradient" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#0EA5E9" stopOpacity="0.45" />
              <Stop offset="80%" stopColor="#0284C7" stopOpacity="0.06" />
              <Stop offset="100%" stopColor="#0284C7" stopOpacity="0.0" />
            </LinearGradient>
            <LinearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0%" stopColor="#03579D" />
              <Stop offset="50%" stopColor="#0EA5E9" />
              <Stop offset="100%" stopColor="#38BDF8" />
            </LinearGradient>
          </Defs>

          {/* Horizontal Reference Grid Lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
            const y = paddingTop + innerH * (1 - pct);
            const val = Math.round(maxValue * pct);
            return (
              <G key={i}>
                <Line
                  x1={paddingX}
                  y1={y}
                  x2={svgWidth - paddingX}
                  y2={y}
                  stroke="#E2E8F0"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
                <SvgText
                  x={paddingX - 6}
                  y={y + 3}
                  fontSize="9.5"
                  fontWeight="600"
                  fill="#94A3B8"
                  textAnchor="end"
                >
                  {metric === 'REVENUE' ? rpShort(val) : String(val)}
                </SvgText>
              </G>
            );
          })}

          {/* Gradient Area Fill */}
          {areaPath ? <Path d={areaPath} fill="url(#blueGradient)" /> : null}

          {/* Smooth Curved Line */}
          {curvePath ? (
            <Path
              d={curvePath}
              fill="none"
              stroke="url(#lineGrad)"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : null}

          {/* Active Highlight Vertical Crosshair */}
          {activeCoord && (
            <Line
              x1={activeCoord.x}
              y1={paddingTop}
              x2={activeCoord.x}
              y2={paddingTop + innerH}
              stroke="#0EA5E9"
              strokeWidth="1.5"
              strokeDasharray="3 3"
            />
          )}

          {/* Interactive Node Circles & Touch Zones */}
          {coords.map((c, i) => {
            const isSel = (activeIdx === null && i === coords.length - 1) || activeIdx === i;
            return (
              <G key={c.point.date}>
                {isSel && (
                  <Circle
                    cx={c.x}
                    cy={c.y}
                    r="8"
                    fill="#38BDF8"
                    opacity="0.3"
                  />
                )}
                <Circle
                  cx={c.x}
                  cy={c.y}
                  r={isSel ? "5.5" : "3.5"}
                  fill={isSel ? "#0284C7" : "#FFFFFF"}
                  stroke="#0284C7"
                  strokeWidth={isSel ? "3" : "2"}
                />
              </G>
            );
          })}

          {/* X Axis Date Labels */}
          {coords.map((c, i) => {
            // Show every Nth label to prevent clutter on small screens
            const step = range === '30D' ? 5 : range === '14D' ? 2 : 1;
            if (i % step !== 0 && i !== coords.length - 1) return null;

            return (
              <SvgText
                key={`lbl-${c.point.date}`}
                x={c.x}
                y={paddingTop + innerH + 18}
                fontSize="10"
                fontWeight="700"
                fill={activeIdx === i ? '#03579D' : '#64748B'}
                textAnchor="middle"
              >
                {c.point.label}
              </SvgText>
            );
          })}
        </Svg>

        {/* Interactive Clickable Invisible Pillars for Web/Touch */}
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          <View style={styles.touchPillarsWrap}>
            {coords.map((c, idx) => (
              <TouchableOpacity
                key={`touch-${idx}`}
                style={styles.touchPillar}
                activeOpacity={1}
                onPress={() => setActiveIdx(idx)}
                {...(Platform.OS === 'web'
                  ? {
                      onMouseEnter: () => setActiveIdx(idx),
                    }
                  : {})}
              />
            ))}
          </View>
        </View>
      </View>

      {/* 4. Interactive Tooltip Legend at Bottom */}
      <View style={styles.chartFooter}>
        <View style={styles.tooltipCard}>
          <View style={styles.tooltipIcon}>
            <Sparkles size={14} color="#0284C7" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.tooltipDate}>
              Tanggal: {fmtDate(selectedPoint?.date || '')} ({selectedPoint?.label})
            </Text>
            <Text style={styles.tooltipHighlight}>
              Omzet: <Text style={styles.bold}>{rp(selectedPoint?.revenue || 0)}</Text> • Pemesanan:{' '}
              <Text style={styles.bold}>{selectedPoint?.bookings || 0} Unit</Text>
            </Text>
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
    flexWrap: 'wrap',
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
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tagText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#03579D',
    letterSpacing: 0.8,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingVertical: 1,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  liveBadgeText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#059669',
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  metricToggle: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    padding: 3,
    gap: 2,
  },
  toggleBtn: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  toggleBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  toggleText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#64748B',
  },
  toggleTextActive: {
    color: '#03579D',
    fontWeight: '800',
  },
  rangeToggle: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    padding: 3,
    gap: 2,
  },
  rangeBtn: {
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  rangeBtnActive: {
    backgroundColor: '#03579D',
  },
  rangeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  rangeTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },

  // Highlight Ribbon
  highlightRibbon: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  highlightBox: {
    flex: 1,
    gap: 2,
  },
  highlightLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  highlightVal: {
    fontSize: 14.5,
    fontWeight: '900',
    color: '#0F172A',
  },
  highlightDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 12,
  },

  // Chart Canvas
  chartCanvasWrap: {
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
  },
  touchPillarsWrap: {
    flexDirection: 'row',
    height: '100%',
    width: '100%',
  },
  touchPillar: {
    flex: 1,
    height: '100%',
  },

  // Footer Tooltip
  chartFooter: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 10,
  },
  tooltipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F0F9FF',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  tooltipIcon: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tooltipDate: {
    fontSize: 11,
    fontWeight: '700',
    color: '#03579D',
  },
  tooltipHighlight: {
    fontSize: 12,
    color: '#334155',
    marginTop: 1,
  },
  bold: {
    fontWeight: '800',
    color: '#0F172A',
  },
});
