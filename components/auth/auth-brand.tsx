import { cn } from "@/lib/utils";
import Link from "next/link";
import Image from "next/image";

type AuthBrandProps = {
  className?: string;
};

export function AuthBrand({ className }: AuthBrandProps) {
  return (
    <div className={cn("space-y-4 text-center", className)}>
      <div className="flex items-center justify-center gap-3">
        <Image
          src="/images/logo/b-mkm-blue.png"
          alt="Logo MK MEDIA"
          width={96}
          height={49}
        />
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
      <Link href="/" className="font-medium text-mkmedia-blue hover:underline">
        Regresar al home
      </Link>
    </p>
  );
}
