import Image from "next/image";
import Link from "next/link";
import { UserHeaderActions } from "@/components/layout/user-header-actions";

interface HomeHeaderProps {
  user:
    | {
        email: string;
        name: string | null;
      }
    | null;
}

export function HomeHeader({ user }: HomeHeaderProps) {
  return (
    <header className="relative mx-auto flex w-full max-w-7xl items-start justify-between px-6 pb-6 pt-6">
      <Link href="/" className="flex items-center gap-2">
        <Image src="/images/logo/b-mkm-blue.png" alt="Logo" width={78.4} height={40} />
      </Link>

      <div className="flex items-center gap-2">
        {user ? (
          <UserHeaderActions user={user} />
        ) : (
          <>
            <Link
              href="/login"
              className="rounded-full border border-neutral-200 bg-white/80 px-3 py-2 text-sm font-semibold text-neutral-900 shadow-sm hover:bg-white"
            >
              Iniciar sesión
            </Link>
            <Link
              href="/register"
              className="rounded-full bg-[#0359A8] px-3 py-2 text-sm font-semibold text-white shadow-lg shadow-[#0359A8]/30 hover:bg-[#024a8c]"
            >
              Crear cuenta
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
