import { BottomNav } from "@/components/layout/bottom-nav";
import { SideNav } from "@/components/layout/side-nav";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <SideNav />
      <div className="lg:pl-72">
        <main className="max-w-lg md:max-w-3xl lg:max-w-5xl mx-auto pb-24 lg:pb-12">
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
