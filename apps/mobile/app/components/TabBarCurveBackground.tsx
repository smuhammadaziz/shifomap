import React, { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';

/** Extra top space for the wide center cradle around AI. */
export const TAB_BAR_NOTCH_LIFT = 24;
/** Half-width of the curved pocket (each side from center). */
export const TAB_BAR_NOTCH_HALF = 68;

type Props = {
  height: number;
  fill: string;
  isDark: boolean;
};

/** Wide smooth center cradle — border wraps the AI circle. */
function buildTabBarPath(width: number, totalHeight: number): string {
  const cx = width / 2;
  const shoulderY = TAB_BAR_NOTCH_LIFT;
  const peakY = 5;
  const half = TAB_BAR_NOTCH_HALF;
  const pull = 40;

  return [
    `M 0 ${totalHeight}`,
    `L 0 ${shoulderY + 12}`,
    `C 0 ${shoulderY} 12 ${shoulderY} 24 ${shoulderY}`,
    `L ${cx - half} ${shoulderY}`,
    `C ${cx - pull} ${shoulderY} ${cx - 24} ${peakY} ${cx} ${peakY}`,
    `C ${cx + 24} ${peakY} ${cx + pull} ${shoulderY} ${cx + half} ${shoulderY}`,
    `L ${width - 24} ${shoulderY}`,
    `C ${width - 12} ${shoulderY} ${width} ${shoulderY} ${width} ${shoulderY + 12}`,
    `L ${width} ${totalHeight}`,
    'Z',
  ].join(' ');
}

export default function TabBarCurveBackground({ height, fill, isDark }: Props) {
  const { width } = useWindowDimensions();

  const d = useMemo(() => buildTabBarPath(width, height), [width, height]);

  return (
    <Svg width={width} height={height} style={{ position: 'absolute', left: 0, top: 0 }}>
      <Defs>
        <LinearGradient id="tabBarSheen" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={isDark ? '#27272a' : '#ffffff'} stopOpacity="1" />
          <Stop offset="1" stopColor={isDark ? '#18181b' : '#f8fafc'} stopOpacity="1" />
        </LinearGradient>
      </Defs>
      <Path d={d} fill={isDark ? fill : 'url(#tabBarSheen)'} />
    </Svg>
  );
}
