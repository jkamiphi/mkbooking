import { CatalogFaceDetail } from "./face-detail";

export const metadata = {
  title: "Cara del Catálogo - Admin",
  description: "Gestionar cara del catálogo",
};

export default async function CatalogFacePage({
  params,
}: {
  params: Promise<{ faceId: string }>;
}) {
  const { faceId } = await params;
  return <CatalogFaceDetail faceId={faceId} />;
}
