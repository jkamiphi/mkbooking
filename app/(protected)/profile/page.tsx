import { ProfileContent } from "./profile-content";

export const metadata = {
  title: "Perfil - MK Booking",
  description: "Administra tu perfil",
};

export default function ProfilePage() {
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-neutral-900 dark:text-white mb-6">
        Perfil
      </h1>
      <ProfileContent />
    </div>
  );
}
