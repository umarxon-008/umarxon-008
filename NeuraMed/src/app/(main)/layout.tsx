import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getHealthProfile } from "@/lib/modules/health-profile";
import { AppHeader } from "@/components/layout/app-header";
import { BottomNav } from "@/components/layout/bottom-nav";
import { SideNav } from "@/components/layout/side-nav";

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const user = await getSession();
  if (!user) redirect("/login");
  const contactPhone = user.role === "patient" ? (await getHealthProfile(user.id).catch(() => null))?.emergencyContact?.phone ?? null : null;
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <SideNav role={user.role} contactPhone={contactPhone} />
      <div className="lg:pl-72 flex min-h-screen flex-col">
        <AppHeader name={user.name || user.email || ""} role={user.role} contactPhone={contactPhone} />
        <main className="w-full flex-1 max-w-lg md:max-w-3xl lg:max-w-5xl mx-auto">
          {children}
        </main>
        <div className="h-24 lg:h-10" aria-hidden="true" />
      </div>
      <BottomNav role={user.role} />
    </div>
  );
}
