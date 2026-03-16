"use client";

import Image from "next/image";
import Link from "next/link";
import { UserHeaderActions } from "@/components/layout/user-header-actions";
import { cn } from "@/lib/utils";

interface HomeHeaderProps {
  user: {
    email: string;
    name: string | null;
  } | null;
}

export function HomeHeader({ user }: HomeHeaderProps) {
  return (
    <header
      className={cn(
        "sticky top-0 z-40 flex w-full items-center justify-between px-4 py-3 transition-all duration-200 sm:px-6 lg:px-8 2xl:px-10 border-b border-transparent bg-transparent backdrop-blur-0",
      )}
    >
      <Link href="/" className="flex items-center gap-2">
        <Image
          src="/images/logo/b-mkm-blue.png"
          alt="Logo"
          width={78.4}
          height={40}
        />
      </Link>

      <div className="flex items-center gap-2">
        {user ? (
          <UserHeaderActions user={user} />
        ) : (
          <>
            <Link
              href="/login"
              className="rounded-md border border-neutral-200 bg-white/80 px-3 py-2 text-sm font-semibold text-neutral-900 shadow-sm hover:bg-white"
            >
              Iniciar sesión
            </Link>
            <Link
              href="/register"
              className="rounded-md bg-[#0359A8] px-3 py-2 text-sm font-semibold text-white shadow-lg shadow-[#0359A8]/30 hover:bg-[#024a8c]"
            >
              Crear cuenta
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
