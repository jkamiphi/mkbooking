import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface HomeFooterProps {
  showPrices: boolean;
  className?: string;
}

export function HomeFooter({ showPrices, className }: HomeFooterProps) {
  return (
    <footer className={cn("mt-16 border-t border-neutral-200/80 bg-white/70", className)}>
      <div className="mx-auto w-full max-w-7xl px-6 py-10">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <Image src="/images/logo/b-mkm-blue.png" alt="Logo" width={78.4} height={40} />
            <p className="mt-2 max-w-md text-sm text-neutral-600">
              Marketplace OOH en Panamá para descubrir, reservar y operar
              campañas con una experiencia simple.
            </p>
          </div>

          <nav className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-neutral-600">
            <Link href="/s/all" className="hover:text-neutral-900">
              Catálogo
            </Link>
            {showPrices ? (
              <Link href="/profile" className="hover:text-neutral-900">
                Mi panel
              </Link>
            ) : (
              <Link href="/login" className="hover:text-neutral-900">
                Iniciar sesión
              </Link>
            )}
            {!showPrices ? (
              <Link href="/register" className="hover:text-neutral-900">
                Crear cuenta
              </Link>
            ) : null}
            <a href="mailto:hola@mkbooking.com" className="hover:text-neutral-900">
              Contacto
            </a>
          </nav>
        </div>

        <div className="mt-6 flex flex-col gap-2 border-t border-neutral-200/80 pt-4 text-xs text-neutral-500 md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} MKM Booking.</p>
          <p>hola@mkbooking.com · +507 6000-0000 · Panamá</p>
        </div>
      </div>
    </footer>
  );
}
