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
        "flex items-center gap-2 px-4 pt-6 pb-1",
        className
      )}
    >
      {showBack && (
        <Button variant="outline" size="icon" onClick={handleBack} className="h-11 w-11 shrink-0 rounded-2xl" aria-label="←">
          <ArrowLeft className="h-5 w-5" />
        </Button>
      )}
      {title && (
        <h1 className="flex-1 truncate text-2xl font-bold text-slate-900 dark:text-white">
          {title}
        </h1>
      )}
      {!title && <div className="flex-1" />}
      {rightSlot}
    </header>
  );
}
