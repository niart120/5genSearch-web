import { useState } from 'react';
import { Header } from '@/components/layout/header';
import { ResponsiveContainer } from '@/components/layout/responsive-container';
import { Toaster } from '@/components/ui/toast';
import { DsConfigForm, GameStartConfigForm } from '@/features/ds-config';

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const sidebarContent = (
    <div className="space-y-6">
      <DsConfigForm />
      <GameStartConfigForm />
    </div>
  );

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <Header onMenuClick={() => setSidebarOpen(true)} />
      <ResponsiveContainer
        sidebarContent={sidebarContent}
        sidebarOpen={sidebarOpen}
        onSidebarOpenChange={setSidebarOpen}
      >
        {/* Phase 3: feature pages */}
      </ResponsiveContainer>
      <Toaster />
    </div>
  );
}

export default App;
