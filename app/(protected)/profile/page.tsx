import { ProfileContent } from "./profile-content";

export const metadata = {
  title: "Profile - MK Booking",
  description: "Manage your profile",
};

export default function ProfilePage() {
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-neutral-900 dark:text-white mb-6">
        Profile
      </h1>
      <ProfileContent />
    </div>
  );
}
