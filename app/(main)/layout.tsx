import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { DevPlanSwitch } from '@/components/dev-plan-switch';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const isDev = process.env.NODE_ENV === 'development';

  return (
    <div className="flex min-h-full flex-col">
      <Header />
      <main className="flex flex-1 flex-col">
        <div className="mx-auto w-full max-w-6xl flex-1 flex flex-col px-6 py-8">
          {children}
        </div>
      </main>
      <Footer />
      {isDev && <DevPlanSwitch />}
    </div>
  );
}
