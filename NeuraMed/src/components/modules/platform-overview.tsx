/** Bosh sahifa uchun server tomonida yig'iladigan qisqa ma'lumot. */
export interface PlatformSummary {
  aiEnabled: boolean;
  trace: { total: number; verified: number; suspicious: { id: string; name: string }[] };
  connect: { doctors: number; upcoming: { id: string; doctor: string; specialty: string; date: string; time: string } | null; upcomingCount: number };
  threads: number;
  health: {
    score: number | null;
    scoreDoctor: string | null;
    cardShared: boolean;
  };
}
