import { Tabs } from 'expo-router';

import { FloatingNav } from '@/components/ui/FloatingNav';

// Home, Care, Wellbeing and Report are tabs: switching keeps each screen mounted and slides
// between them in place, instead of pushing a new page onto the stack.
export default function TabsLayout() {
  return (
    <Tabs
      tabBar={props => <FloatingNav {...props} />}
      screenOptions={{ headerShown: false, animation: 'shift' }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="care" />
      <Tabs.Screen name="wellbeing" />
      <Tabs.Screen name="result" />
    </Tabs>
  );
}
