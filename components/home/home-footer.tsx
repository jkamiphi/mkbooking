import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface HomeFooterProps {
  showPrices: boolean;
  className?: string;
  fullWidth?: boolean;
}

export function HomeFooter({
  showPrices,
  className,
  fullWidth = false,
}: HomeFooterProps) {
  return (
    <footer
      className={cn(
        "mt-16 border-t border-mkmedia-blue/20 bg-linear-to-r from-mkmedia-blue/8 via-white to-mkmedia-yellow/15",
        className,
      )}
    >
      <div
        className={cn(
          "w-full py-10",
          fullWidth
            ? "px-4 sm:px-6 lg:px-8 2xl:px-10"
            : "mx-auto max-w-7xl px-6",
        )}
      >
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <Image
              src="/images/logo/b-mkm-blue.png"
              alt="Logo"
              width={78.4}
              height={40}
            />
            <p className="mt-2 max-w-md text-sm text-neutral-600">
              Conectamos marcas, agencias y propietarios de espacios
              publicitarios en Panamá. Descubre, reserva y opera campañas OOH en
              un solo lugar.
            </p>
          </div>

          <nav className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-neutral-600">
            <Link href="/s/all" className="hover:text-mkmedia-blue">
              Catálogo
            </Link>
            {showPrices ? (
              <Link href="/profile" className="hover:text-mkmedia-blue">
                Mi panel
              </Link>
            ) : (
              <Link href="/login" className="hover:text-mkmedia-blue">
                Iniciar sesión
              </Link>
            )}
            {!showPrices ? (
              <Link href="/register" className="hover:text-mkmedia-blue">
                Crear cuenta
              </Link>
            ) : null}
            <a
              href="mailto:hola@mkbooking.com"
              className="hover:text-mkmedia-blue"
            >
              Contacto
            </a>
          </nav>
        </div>

        <div className="mt-6 flex flex-col gap-2 border-t border-mkmedia-blue/15 pt-4 text-xs text-neutral-500 md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} Grupo MK MEDIA.</p>
          <p>hola@grupomkmedia.com · +507 6000-0000 · Panamá</p>
        </div>
      </div>
    </footer>
  );
}
