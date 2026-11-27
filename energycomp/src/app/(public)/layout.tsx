import { PublicHeader } from '@/components/public/public-header';
import { PublicFooter } from '@/components/public/public-footer';
import { readSessionToken } from '@/server/auth/session';

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const loggedIn = Boolean(await readSessionToken());
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <PublicHeader loggedIn={loggedIn} />
      <main id="main" className="flex-1">
        {children}
      </main>
      <PublicFooter />
    </div>
  );
}
