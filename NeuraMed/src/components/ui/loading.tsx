import { cn } from "@/lib/utils";

interface LoadingProps {
  className?: string;
  text?: string;
  size?: "sm" | "md" | "lg";
}

export function LoadingSpinner({ className, text, size = "md" }: LoadingProps) {
  const sizes = { sm: "h-5 w-5", md: "h-8 w-8", lg: "h-12 w-12" };
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3", className)}>
      <div
        className={cn(
          "animate-spin rounded-full border-3 border-primary-100 border-t-primary-500",
          sizes[size]
        )}
        style={{ borderWidth: "3px" }}
      />
      {text && <p className="text-sm text-slate-500">{text}</p>}
    </div>
  );
}

export function LoadingPage({ text = "Yuklanmoqda..." }: { text?: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <LoadingSpinner size="lg" text={text} />
    </div>
  );
}

export function LoadingCard() {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5 animate-pulse">
      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/3 mb-3" />
      <div className="h-3 bg-slate-100 dark:bg-slate-600 rounded w-full mb-2" />
      <div className="h-3 bg-slate-100 dark:bg-slate-600 rounded w-4/5" />
    </div>
  );
}
