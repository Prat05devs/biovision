import { useWindowDimensions } from 'react-native';

/** Layouts respond to usable space and text size, rather than phone model names. */
export function useResponsiveLayout() {
  const { width, height, fontScale } = useWindowDimensions();
  return {
    compact: width < 360 || fontScale > 1.15,
    short: height < 500,
    landscape: width > height,
  };
}
