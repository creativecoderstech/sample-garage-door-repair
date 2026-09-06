import type { GarageContentKind } from "@workspace/api-client-react";
import { ContentManager } from "@/components/admin-content/content-manager";

export default function AdminContentPage({ kind }: { kind: GarageContentKind }) {
  return <ContentManager kind={kind} />;
}