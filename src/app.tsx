import { useState } from 'react';
import { Header } from '@/components/layout/header';
import { ResponsiveContainer } from '@/components/layout/responsive-container';
import { CategoryNav } from '@/components/layout/category-nav';
import { BottomNav } from '@/components/layout/bottom-nav';
import { FeatureTabs } from '@/components/layout/feature-tabs';
import { FeatureContent } from '@/components/layout/feature-content';
import { Toaster } from '@/components/ui/toast';
import { Tabs } from '@/components/ui/tabs';
import { DsConfigForm, GameStartConfigForm } from '@/features/ds-config';
import { useUiStore } from '@/stores/settings/ui';
import type { FeatureId } from '@/lib/navigation';

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const activeFeature = useUiStore((s) => s.activeFeature);
  const setActiveFeature = useUiStore((s) => s.setActiveFeature);

  const sidebarContent = (
    <div className="space-y-6">
      <DsConfigForm />
      <GameStartConfigForm />
    </div>
  );

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <Header onMenuClick={() => setSidebarOpen(true)} />
      <CategoryNav />
      <Tabs
        value={activeFeature}
        onValueChange={(v) => setActiveFeature(v as FeatureId)}
        className="flex flex-1 flex-col overflow-hidden"
      >
        <ResponsiveContainer
          sidebarContent={sidebarContent}
          sidebarOpen={sidebarOpen}
          onSidebarOpenChange={setSidebarOpen}
          topContent={<FeatureTabs />}
        >
          <FeatureContent />
        </ResponsiveContainer>
      </Tabs>
      <BottomNav />
      <Toaster />
    </div>
  );
}

export default App;
