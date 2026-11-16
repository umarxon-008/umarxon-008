"use client";

import { useEffect } from "react";
import { useProfileStore } from "@/store";
import type { UserProfile } from "@/types";

export function useProfile() {
  const { profile, isLoading, setProfile, setLoading } = useProfileStore();

  useEffect(() => {
    if (profile) return;
    setLoading(true);
    fetch("/api/profile")
      .then((r) => r.json())
      .then((data) => setProfile(data.data as UserProfile))
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const update = async (data: Partial<UserProfile>) => {
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      setProfile(profile ? { ...profile, ...data } : null);
    }
    return res.ok;
  };

  return { profile, isLoading, update };
}
