import { ProfileContent } from "./profile-content";

export const metadata = {
  title: "Perfil - MK Booking",
  description: "Administra tu perfil",
};

export default function ProfilePage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
          Mi perfil
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Administra tu informacion personal, tu organizacion activa y tus accesos
        </p>
      </div>
      <ProfileContent />
    </div>
  );
}
