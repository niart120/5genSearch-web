import { Header } from '@/components/layout/header';

function App() {
  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <Header />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-screen-xl px-4 py-4 lg:px-6">{/* content */}</div>
      </main>
    </div>
  );
}

export default App;
