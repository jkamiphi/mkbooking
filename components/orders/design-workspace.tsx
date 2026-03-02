import { CreativesModule, type CreativeLineItem } from "@/components/orders/creatives-module";

interface DesignWorkspaceProps {
  orderId: string;
  lineItems: CreativeLineItem[];
  mode: "designer" | "client" | "admin";
  readOnly?: boolean;
  allowReviewActions?: boolean;
}

export function DesignWorkspace({
  orderId,
  lineItems,
  mode,
  readOnly,
  allowReviewActions,
}: DesignWorkspaceProps) {
  return (
    <CreativesModule
      orderId={orderId}
      lineItems={lineItems}
      readOnly={readOnly}
      allowReviewActions={allowReviewActions}
      mode={mode}
    />
  );
}
