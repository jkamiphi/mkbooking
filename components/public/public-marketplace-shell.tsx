import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, MapPin } from "lucide-react";
import { UserHeaderActions } from "@/components/layout/user-header-actions";
import { HomeFooter } from "@/components/home/home-footer";
import { cn } from "@/lib/utils";
import {
  brandPrimaryButtonClass,
  brandSoftButtonClass,
} from "@/components/public/brand-styles";

interface PublicMarketplaceShellProps {
  children: React.ReactNode;
  user: {
    email: string;
    name: string | null;
  } | null;
  showPrices: boolean;
  backHref: string;
  backLabel?: string;
  contextLabel?: string;
  contextMeta?: string;
  headerActions?: React.ReactNode;
  sectionLabel?: string;
  sectionHint?: string;
  className?: string;
  contentClassName?: string;
  footerClassName?: string;
}

export function PublicMarketplaceShell({
  children,
  user,
  showPrices,
  backHref,
  backLabel = "Volver",
  contextLabel,
  contextMeta,
  headerActions,
  sectionLabel = "MK MEDIA CATALOGO",
  sectionHint = "Explora espacios publicitarios en Panamá",
  className,
  contentClassName,
  footerClassName,
}: PublicMarketplaceShellProps) {
  return (
    <div
      className={cn(
        "flex min-h-screen flex-col bg-[linear-gradient(180deg,_#f6f9ff_0%,_#ffffff_38%,_#fffef7_100%)] text-neutral-900",
        className,
      )}
    >
      <header className="sticky top-0 z-30 border-b border-mkmedia-blue/15 bg-white/95 backdrop-blur">
        <div className="flex w-full items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8 2xl:px-10">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <Link
              href={backHref}
              className={cn(
                "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold",
                brandSoftButtonClass,
              )}
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">{backLabel}</span>
            </Link>

            <Link href="/" className="flex items-center gap-2" aria-label="Ir al inicio">
              <Image
                src="/images/logo/b-mkm-blue.png"
                alt="Logo MK MEDIA"
                width={78.4}
                height={40}
              />
            </Link>

            <span className="hidden rounded-full border border-mkmedia-blue/20 bg-mkmedia-blue/8 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-mkmedia-blue md:inline-flex [font-family:var(--font-mkmedia)]">
              MK MEDIA
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {contextLabel ? (
              <div className="hidden items-center gap-2 rounded-full border border-mkmedia-blue/20 bg-mkmedia-blue/8 px-3 py-1.5 md:inline-flex">
                <MapPin className="h-3.5 w-3.5 text-mkmedia-blue" />
                <span className="max-w-[220px] truncate text-sm font-semibold text-neutral-900">
                  {contextLabel}
                </span>
                {contextMeta ? (
                  <span className="max-w-[170px] truncate text-xs text-neutral-600">
                    {contextMeta}
                  </span>
                ) : null}
              </div>
            ) : null}

            {headerActions ? <div className="flex items-center">{headerActions}</div> : null}

            {user ? (
              <UserHeaderActions
                user={{
                  email: user.email,
                  name: user.name,
                }}
              />
            ) : (
              <Link
                href="/login"
                className={cn(
                  "rounded-full px-3 py-2 text-xs font-semibold sm:px-4 sm:text-sm",
                  brandPrimaryButtonClass,
                )}
              >
                Iniciar sesión
              </Link>
            )}
          </div>
        </div>
      </header>

      <div className="border-b border-mkmedia-blue/15 bg-linear-to-r from-mkmedia-blue/10 via-white to-mkmedia-yellow/20">
        <div className="flex w-full flex-col gap-1 px-4 py-2.5 sm:px-6 lg:px-8 2xl:px-10">
          <p className="text-xs uppercase tracking-[0.18em] text-mkmedia-blue [font-family:var(--font-mkmedia)]">
            {sectionLabel}
          </p>
          <p className="text-xs text-neutral-600">{sectionHint}</p>
        </div>
      </div>

      <div className={cn("flex flex-1 flex-col", contentClassName)}>{children}</div>
      <HomeFooter
        showPrices={showPrices}
        fullWidth
        className={cn("mt-0", footerClassName)}
      />
    </div>
  );
}
