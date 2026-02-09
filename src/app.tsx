import { useState } from 'react';
import { Header } from '@/components/layout/header';
import { ResponsiveContainer } from '@/components/layout/responsive-container';
import { Toaster } from '@/components/ui/toast';

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <Header onMenuClick={() => setSidebarOpen(true)} />
      <ResponsiveContainer
        sidebarContent={<p className="text-sm text-muted-foreground">DS settings (Phase 3)</p>}
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
