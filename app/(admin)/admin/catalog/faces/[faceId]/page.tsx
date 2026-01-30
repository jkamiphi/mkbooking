import { CatalogFaceDetail } from "./face-detail";

export const metadata = {
  title: "Catalog Face - Admin",
  description: "Manage catalog face",
};

export default async function CatalogFacePage({
  params,
}: {
  params: Promise<{ faceId: string }>;
}) {
  const { faceId } = await params;
  return <CatalogFaceDetail faceId={faceId} />;
}
