import { cn } from "@/lib/utils";
import Link from "next/link";
import Image from "next/image";

type AuthBrandProps = {
  className?: string;
};

export function AuthBrand({ className }: AuthBrandProps) {
  return (
    <div className={cn("space-y-4 text-center", className)}>
      <div className="inline-flex items-center rounded-full border border-mkmedia-blue/20 bg-mkmedia-blue/8 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-mkmedia-blue [font-family:var(--font-mkmedia)]">
        MK MEDIA
      </div>
      <div className="flex items-center justify-center gap-3">
        <Image
          src="/images/logo/b-mkm-blue.png"
          alt="Logo MK MEDIA"
          width={96}
          height={49}
        />
      </div>
      <div className="space-y-1">
        <p className="text-lg font-semibold text-neutral-950">
          Acceso unificado para marcas, agencias y espacios publicitarios.
        </p>
        <p className="text-sm text-neutral-500">
          Crea tu cuenta primero. Configura tu operacion despues.
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
      <Link href="/" className="font-medium text-mkmedia-blue hover:underline">
        Regresar al home
      </Link>
    </p>
  );
}
