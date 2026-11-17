"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface TopBarProps {
  title?: string;
  showBack?: boolean;
  backHref?: string;
  rightSlot?: React.ReactNode;
  className?: string;
  transparent?: boolean;
}

export function TopBar({
  title,
  showBack,
  backHref,
  rightSlot,
  className,
  transparent,
}: TopBarProps) {
  const router = useRouter();

  const handleBack = () => {
    if (backHref) router.push(backHref);
    else router.back();
  };

  return (
    <header
      className={cn(
        "sticky top-16 z-40 flex items-center h-14 px-4 gap-3",
        !transparent &&
          "bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-100 dark:border-slate-800",
        className
      )}
    >
      {showBack && (
        <Button variant="ghost" size="icon" onClick={handleBack} className="-ml-2">
          <ArrowLeft className="h-5 w-5" />
        </Button>
      )}
      {title && (
        <h1 className="flex-1 text-base font-semibold text-slate-900 dark:text-white truncate">
          {title}
        </h1>
      )}
      {!title && <div className="flex-1" />}
      {rightSlot}
    </header>
  );
}
