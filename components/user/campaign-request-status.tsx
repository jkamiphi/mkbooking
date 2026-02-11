import type { CampaignRequestStatus } from "@prisma/client";
import { Badge } from "@/components/ui/badge";

const CAMPAIGN_REQUEST_STATUS_CONFIG: Record<
  CampaignRequestStatus,
  {
    label: string;
    variant: "info" | "warning" | "success" | "destructive";
  }
> = {
  NEW: { label: "Nueva", variant: "info" },
  IN_REVIEW: { label: "En revisión", variant: "warning" },
  PROPOSAL_SENT: { label: "Propuesta enviada", variant: "info" },
  CONFIRMED: { label: "Confirmada", variant: "success" },
  REJECTED: { label: "Rechazada", variant: "destructive" },
};

export function getCampaignRequestStatusConfig(status: CampaignRequestStatus) {
  return CAMPAIGN_REQUEST_STATUS_CONFIG[status];
}

export function CampaignRequestStatusBadge({
  status,
}: {
  status: CampaignRequestStatus;
}) {
  const config = getCampaignRequestStatusConfig(status);
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
