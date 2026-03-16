import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground [a&]:hover:bg-primary/90",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90",
        outline: "text-foreground",
        success:
          "border-transparent bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
        warning:
          "border-transparent bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
        destructive:
          "border-transparent bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
        info: "border-transparent bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
