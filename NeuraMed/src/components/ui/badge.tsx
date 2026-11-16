import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full text-xs font-medium px-2.5 py-0.5",
  {
    variants: {
      variant: {
        default: "bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400",
        normal: "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400",
        low: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
        high: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400",
        warning: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
        violet: "bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
        outline: "border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300",
        success: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
        emergency: "bg-red-600 text-white",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
