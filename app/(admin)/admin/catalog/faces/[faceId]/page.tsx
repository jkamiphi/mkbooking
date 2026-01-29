import { CatalogFaceDetail } from "./face-detail";

export const metadata = {
  title: "Catalog Face - Admin",
  description: "Manage catalog face",
};

export default function CatalogFacePage({
  params,
}: {
  params: { faceId: string };
}) {
  return <CatalogFaceDetail faceId={params.faceId} />;
}
