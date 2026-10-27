import { createContext, useContext } from 'react';

// Only Screen opts into the new theme. The full-screen face camera stays outside
// this provider, preserving its original AppText, Button and icon appearance.
export const RedesignContext = createContext({ enabled: false, hero: false });
export const useRedesign = () => useContext(RedesignContext);
