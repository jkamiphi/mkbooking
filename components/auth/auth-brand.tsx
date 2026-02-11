import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

type AuthBrandProps = {
  className?: string;
};

export function AuthBrand({ className }: AuthBrandProps) {
  return (
    <div className={cn("flex items-center justify-center gap-3", className)}>
      <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#0359A8] text-white shadow-lg shadow-[#0359A8]/30">
        <Sparkles className="h-5 w-5" />
      </span>
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-neutral-500 dark:text-neutral-400">
          MK Booking
        </p>
        <p className="text-sm font-semibold text-neutral-900 dark:text-white">
          Catálogo OOH
        </p>
      </div>
    </div>
  );
}

type AuthHomeLinkProps = {
  className?: string;
};

export function AuthHomeLink({ className }: AuthHomeLinkProps) {
  return (
    <p className={cn("text-center text-sm text-muted-foreground", className)}>
      <Link href="/" className="font-medium text-primary hover:underline">
        Regresar al home
      </Link>
    </p>
  );
}
