import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Defs, G, LinearGradient as SvgLinearGradient, Path, Stop } from 'react-native-svg';

import type { FaceFrameState } from '@/types/vision';
import { fontFamily } from '@/theme/fonts';

const DEFAULT_WIDTH = 300;
const DEFAULT_HEIGHT = 390;
// Stroke widths are in screen pixels. The web mesh was tuned on a ~1100 px wide preview
// where one viewBox unit was ~3.5 px; drawing in real pixels keeps that look on phones.
const STROKE_SCALE = 3.5;
const DEPTH_BUCKETS = 5;
const PROGRESS_RADIUS = 21;
const PROGRESS_CIRCUMFERENCE = 2 * Math.PI * PROGRESS_RADIUS;

const connectionsToPath = (
  connections: FaceFrameState['connections'] | undefined,
  landmarks: FaceFrameState['landmarks'],
  width: number,
  height: number,
) => (connections ?? []).reduce((path, [startIndex, endIndex]) => {
  const start = landmarks[startIndex];
  const end = landmarks[endIndex];
  if (!start || !end) return path;
  return `${path}M ${(start.x * width).toFixed(1)} ${(start.y * height).toFixed(1)} L ${(end.x * width).toFixed(1)} ${(end.y * height).toFixed(1)} `;
}, '');

/** `minimal` draws only the face mesh, for screens that supply their own scanning chrome. */
export function FaceMeshOverlay({ frame, minimal = false }: { frame: FaceFrameState; minimal?: boolean }) {
  const [reduceMotion, setReduceMotion] = useState(false);
  const [meshOpacity] = useState(() => new Animated.Value(0));
  const [scanPosition] = useState(() => new Animated.Value(0));
  const [size, setSize] = useState({ width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT });
  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    if (width > 0 && height > 0 && (width !== size.width || height !== size.height)) setSize({ width, height });
  };
  const VIEW_WIDTH = size.width;
  const VIEW_HEIGHT = size.height;

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (frame.phase === 'searching') meshOpacity.setValue(0);
    else Animated.timing(meshOpacity, { toValue: 1, duration: reduceMotion ? 1 : 320, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();

  }, [frame.phase, meshOpacity, reduceMotion]);

  useEffect(() => {
    if (minimal || reduceMotion || frame.phase === 'complete' || frame.phase === 'unavailable') return;
    scanPosition.setValue(0);
    const scan = Animated.loop(Animated.timing(scanPosition, {
      toValue: 1,
      duration: frame.phase === 'searching' ? 2200 : 1750,
      easing: Easing.inOut(Easing.sin),
      useNativeDriver: true,
    }));
    scan.start();
    return () => scan.stop();
  }, [frame.phase, minimal, reduceMotion, scanPosition]);

  const depthPaths = useMemo(() => {
    const paths = Array.from({ length: DEPTH_BUCKETS }, () => '');
    for (const [startIndex, endIndex] of frame.connections) {
      const start = frame.landmarks[startIndex];
      const end = frame.landmarks[endIndex];
      if (!start || !end) continue;
      const averageDepth = (start.z + end.z) / 2;
      const normalizedDepth = Math.max(0, Math.min(0.999, (averageDepth + 0.14) / 0.2));
      const bucket = Math.floor(normalizedDepth * DEPTH_BUCKETS);
      paths[bucket] += `M ${(start.x * VIEW_WIDTH).toFixed(1)} ${(start.y * VIEW_HEIGHT).toFixed(1)} L ${(end.x * VIEW_WIDTH).toFixed(1)} ${(end.y * VIEW_HEIGHT).toFixed(1)} `;
    }
    return paths;
  }, [frame.connections, frame.landmarks, VIEW_WIDTH, VIEW_HEIGHT]);

  const completed = frame.phase === 'complete';
  const nodeRadius = (completed ? 0.62 : 0.48) * STROKE_SCALE * 0.6;
  // All landmark dots in one path: one native SVG node instead of 478 re-rendered circles.
  const nodePath = useMemo(() => frame.landmarks.reduce((path, { x, y }) =>
    `${path}M ${(x * VIEW_WIDTH - nodeRadius).toFixed(1)} ${(y * VIEW_HEIGHT).toFixed(1)} a ${nodeRadius} ${nodeRadius} 0 1 0 ${nodeRadius * 2} 0 a ${nodeRadius} ${nodeRadius} 0 1 0 ${-nodeRadius * 2} 0 `, ''),
  [frame.landmarks, nodeRadius, VIEW_WIDTH, VIEW_HEIGHT]);
  const contourPath = useMemo(
    () => connectionsToPath(frame.contourConnections, frame.landmarks, VIEW_WIDTH, VIEW_HEIGHT),
    [frame.contourConnections, frame.landmarks, VIEW_WIDTH, VIEW_HEIGHT],
  );
  const irisPath = useMemo(
    () => connectionsToPath(frame.irisConnections, frame.landmarks, VIEW_WIDTH, VIEW_HEIGHT),
    [frame.irisConnections, frame.landmarks, VIEW_WIDTH, VIEW_HEIGHT],
  );
  const scanTranslate = scanPosition.interpolate({ inputRange: [0, 1], outputRange: [VIEW_HEIGHT * 0.07, VIEW_HEIGHT * 0.88] });
  const hasMesh = frame.landmarks.length > 0;
  const progress = Math.max(0, Math.min(100, frame.progress));
  const showProgress = hasMesh && frame.phase !== 'searching' && frame.phase !== 'unavailable';

  return (
      <View style={styles.container} onLayout={onLayout} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {minimal ? null : <View style={[styles.ambientHalo, completed && styles.ambientHaloComplete]} />}
      {minimal ? null : <CornerBrackets complete={completed} />}

      <Animated.View style={[StyleSheet.absoluteFill, { opacity: meshOpacity }]}> 
        <Svg width="100%" height="100%" viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}>
          <Defs>
            <SvgLinearGradient id="meshGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#E8FFF8" />
              <Stop offset="48%" stopColor="#B9FFEE" />
              <Stop offset="100%" stopColor="#F2FFF9" />
            </SvgLinearGradient>
          </Defs>

          {depthPaths.map((path, index) => !path ? null : (
            <G key={`depth-${index}`}>
              <Path d={path} fill="none" stroke="#C8FFF1" strokeOpacity={0.03 + index * 0.015} strokeWidth={(1.05 + index * 0.11) * STROKE_SCALE} strokeLinecap="round" />
              <Path d={path} fill="none" stroke="url(#meshGradient)" strokeOpacity={completed ? 0.78 : 0.42 + index * 0.08} strokeWidth={(0.26 + index * 0.055) * STROKE_SCALE} strokeLinecap="round" />
            </G>
          ))}

          {hasMesh ? (
            <Path d={nodePath} fill="#58E8BD" fillOpacity={0.88} opacity={completed ? 0.88 : 0.72} />
          ) : null}
          {contourPath ? (
            <Path d={contourPath} fill="none" stroke="#E4FFF7" strokeOpacity={completed ? 0.9 : 0.76} strokeWidth={(completed ? 0.62 : 0.5) * STROKE_SCALE} strokeLinecap="round" strokeLinejoin="round" />
          ) : null}
          {irisPath ? (
            <Path d={irisPath} fill="none" stroke="#64EBC4" strokeOpacity={0.96} strokeWidth={0.76 * STROKE_SCALE} strokeLinecap="round" />
          ) : null}
        </Svg>
      </Animated.View>

      {!minimal && !reduceMotion && !completed && frame.phase !== 'unavailable' ? (
        <Animated.View style={[styles.scanBand, { transform: [{ translateY: scanTranslate }] }]}>
          <ExpoLinearGradient colors={['transparent', 'rgba(211,255,250,0.04)', 'rgba(218,255,255,0.22)', 'rgba(211,255,250,0.04)', 'transparent']} locations={[0, 0.35, 0.5, 0.65, 1]} style={styles.scanBandGradient} />
          <View style={styles.scanCore} />
        </Animated.View>
      ) : null}

      {showProgress && !minimal ? <ProgressRing progress={progress} complete={completed} /> : null}
    </View>
  );
}

function ProgressRing({ progress, complete }: { progress: number; complete: boolean }) {
  return (
    <View style={styles.progressRing} pointerEvents="none">
      <Svg width="100%" height="100%" viewBox="0 0 52 52" style={styles.progressSvg}>
        <Circle cx="26" cy="26" r={PROGRESS_RADIUS} fill="rgba(0,18,22,0.66)" stroke="rgba(218,255,255,0.18)" strokeWidth="1" />
        <Circle
          cx="26"
          cy="26"
          r={PROGRESS_RADIUS}
          fill="none"
          stroke="#55D6A0"
          strokeWidth="2.25"
          strokeLinecap="round"
          strokeDasharray={`${PROGRESS_CIRCUMFERENCE} ${PROGRESS_CIRCUMFERENCE}`}
          strokeDashoffset={PROGRESS_CIRCUMFERENCE * (1 - progress / 100)}
        />
      </Svg>
      <Text style={[styles.progressText, complete && styles.progressTextComplete]}>{Math.round(progress)}%</Text>
    </View>
  );
}

function CornerBrackets({ complete }: { complete: boolean }) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={[styles.corner, styles.cornerTopLeft, complete && styles.cornerComplete]} />
      <View style={[styles.corner, styles.cornerTopRight, complete && styles.cornerComplete]} />
      <View style={[styles.corner, styles.cornerBottomLeft, complete && styles.cornerComplete]} />
      <View style={[styles.corner, styles.cornerBottomRight, complete && styles.cornerComplete]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, overflow: 'visible' },
  ambientHalo: { position: 'absolute', left: '5%', right: '5%', top: 10, bottom: 4, borderRadius: 170, backgroundColor: 'rgba(99,235,198,0.012)' },
  ambientHaloComplete: { backgroundColor: 'rgba(99,235,198,0.022)' },
  corner: { position: 'absolute', width: 27, height: 27, borderColor: '#B9FFF0', opacity: 0.9 },
  cornerComplete: { borderColor: '#55D6A0', opacity: 1 },
  cornerTopLeft: { left: '7%', top: 17, borderLeftWidth: 2, borderTopWidth: 2, borderTopLeftRadius: 11 },
  cornerTopRight: { right: '7%', top: 17, borderRightWidth: 2, borderTopWidth: 2, borderTopRightRadius: 11 },
  cornerBottomLeft: { left: '7%', bottom: 9, borderLeftWidth: 2, borderBottomWidth: 2, borderBottomLeftRadius: 11 },
  cornerBottomRight: { right: '7%', bottom: 9, borderRightWidth: 2, borderBottomWidth: 2, borderBottomRightRadius: 11 },
  scanBand: { position: 'absolute', left: 0, right: 0, top: 0, height: 42 },
  scanBandGradient: { position: 'absolute', inset: 0 },
  scanCore: { position: 'absolute', left: 0, right: 0, top: 20, height: 0.75, backgroundColor: '#D9FFFF', shadowColor: '#9FFFE8', shadowOpacity: 0.68, shadowRadius: 5, elevation: 3 },
  progressRing: { position: 'absolute', right: '9%', top: 58, width: 52, height: 52, alignItems: 'center', justifyContent: 'center', shadowColor: '#55D6A0', shadowOpacity: 0.22, shadowRadius: 7, elevation: 4 },
  progressSvg: { position: 'absolute', transform: [{ rotate: '-90deg' }] },
  progressText: { color: '#DFFFFF', fontSize: 10, fontFamily: fontFamily(700), fontVariant: ['tabular-nums'], letterSpacing: -0.25 },
  progressTextComplete: { color: '#D9FFF1' },
});
