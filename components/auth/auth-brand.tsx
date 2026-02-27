import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import Image from "next/image";

type AuthBrandProps = {
  className?: string;
};

export function AuthBrand({ className }: AuthBrandProps) {
  return (
    <div className={cn("flex items-center justify-center gap-3", className)}>
      <Image
        src="/images/logo/b-mkm-blue.png"
        alt="Logo"
        width={78.4}
        height={40}
      />
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
