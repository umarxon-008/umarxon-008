"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store";

export function useAuth() {
  const { user, isLoading, setUser, clearUser, setLoading } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    setLoading(true);
    fetch("/api/auth")
      .then((r) => r.json())
      .then((data) => {
        if (data.user) setUser(data.user);
        else clearUser();
      })
      .catch(() => clearUser())
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const logout = async () => {
    await fetch("/api/auth?action=logout", { method: "POST" });
    clearUser();
    router.push("/login");
  };

  return { user, isLoading, logout };
}
