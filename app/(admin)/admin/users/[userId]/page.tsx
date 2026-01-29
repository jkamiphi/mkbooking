import { UserDetailContent } from "./user-detail-content";

export const metadata = {
  title: "User Details - Admin",
  description: "View and manage user details",
};

interface UserDetailPageProps {
  params: Promise<{
    userId: string;
  }>;
}

export default async function UserDetailPage({ params }: UserDetailPageProps) {
  const { userId } = await params;

  return (
    <div className="space-y-6">
      <UserDetailContent userId={userId} />
    </div>
  );
}
