import { Sparkles } from "lucide-react";
import { UserZoneNav } from "@/components/user/user-zone-nav";
import { ProfileContent } from "./profile-content";

export const metadata = {
  title: "Perfil - MK Booking",
  description: "Administra tu perfil",
};

export default function ProfilePage() {
  return (
    <div className="relative mx-auto max-w-4xl px-6 pb-12">
      <div className="mb-8 flex items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0359A8] text-white shadow-lg shadow-[#0359A8]/30">
          <Sparkles className="h-6 w-6" />
        </span>
        <div>
          <h1 className="text-3xl font-bold text-neutral-900">Mi Perfil</h1>
          <p className="text-sm text-neutral-500">
            Administra tu información personal y preferencias
          </p>
        </div>
      </div>

      <UserZoneNav />
      <ProfileContent />
    </div>
  );
}
