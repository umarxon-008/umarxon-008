"use client";

import { useT } from "@/i18n/client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, Clock, ArrowRight, Loader2, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Disclaimer } from "@/components/ui/disclaimer";
import { useMedSearchStore } from "@/store";
import { useDebounce } from "@/hooks/use-debounce";

interface SearchResult {
  rxcui: string;
  name: string;
  tty: string;
}

const ttyLabel: Record<string, string> = {
  IN: "Generik",
  BN: "Brend",
  SCD: "Kombinatsiya",
  PIN: "Faollik",
  GPCK: "Paket",
};

const popularDrugs = [
  "Paracetamol",
  "Ibuprofen",
  "Amoxicillin",
  "Metformin",
  "Atorvastatin",
  "Omeprazole",
  "Ciprofloxacin",
  "Aspirin",
];

export function MedicationSearchClient() {
  const t = useT();
  const router = useRouter();
  const { recentSearches, addSearch } = useMedSearchStore();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debouncedQuery = useDebounce(query, 400);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (debouncedQuery.length < 2) {
      setResults([]);
      return;
    }

    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    setLoading(true);
    setError(null);

    fetch(`/api/medications/search?q=${encodeURIComponent(debouncedQuery)}`, {
      signal: abortRef.current.signal,
    })
      .then((r) => r.json())
      .then((data) => {
        setResults(data.results ?? []);
        setLoading(false);
      })
      .catch((e) => {
        if (e.name !== "AbortError") {
          setError(t("Qidirishda xatolik yuz berdi"));
          setLoading(false);
        }
      });
  }, [debouncedQuery]);

  const goToMed = (name: string, rxcui?: string) => {
    addSearch(name);
    const path = rxcui
      ? `/medications/${rxcui}?name=${encodeURIComponent(name)}`
      : `/medications/search?name=${encodeURIComponent(name)}`;
    router.push(path);
  };

  return (
    <div className="px-4 py-5 space-y-5">
      <Disclaimer compact />

      {/* Search input */}
      <div className="relative">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("Masalan: paracetamol, ibuprofen...")}
          leftIcon={loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          className="text-base py-4"
          autoFocus
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-500">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {/* Search results */}
      {results.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-slate-500 font-medium">{t("Qidiruv natijalari")}</p>
          {results.map((r) => (
            <Card
              key={r.rxcui}
              className="cursor-pointer hover:shadow-md transition-all hover:border-primary-200"
              onClick={() => goToMed(r.name, r.rxcui)}
            >
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center shrink-0">
                  <span className="text-primary-600 font-bold text-xs">
                    {r.name.slice(0, 2).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 dark:text-white capitalize">
                    {r.name.toLowerCase()}
                  </p>
                  {ttyLabel[r.tty] && (
                    <Badge variant="outline" className="mt-0.5 text-[10px]">
                      {t(ttyLabel[r.tty])}
                    </Badge>
                  )}
                </div>
                <ArrowRight className="h-4 w-4 text-slate-300 shrink-0" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* No results */}
      {query.length >= 2 && !loading && results.length === 0 && !error && (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-sm text-slate-500">
              {t("\"")}{query}{t("\" bo'yicha natija topilmadi")}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {t("Inglizcha nom bilan ham qidirib ko'ring")}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Recent searches */}
      {query.length < 2 && recentSearches.length > 0 && (
        <div>
          <p className="text-xs text-slate-500 font-medium mb-2">{t("So'nggi qidiruvlar")}</p>
          <div className="space-y-1.5">
            {recentSearches.slice(0, 5).map((s) => (
              <button
                key={s}
                onClick={() => goToMed(s)}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left"
              >
                <Clock className="h-4 w-4 text-slate-300 shrink-0" />
                <span className="text-sm text-slate-600 dark:text-slate-300 capitalize flex-1">
                  {s.toLowerCase()}
                </span>
                <ArrowRight className="h-3.5 w-3.5 text-slate-300" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Popular drugs */}
      {query.length < 2 && (
        <div>
          <p className="text-xs text-slate-500 font-medium mb-2">{t("Ko'p qidiriladigan dorilar")}</p>
          <div className="flex flex-wrap gap-2">
            {popularDrugs.map((drug) => (
              <button
                key={drug}
                onClick={() => goToMed(drug)}
                className="text-xs px-3 py-1.5 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-primary-300 hover:text-primary-600 transition-colors"
              >
                {drug}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
