import { Badge } from "@/components/ui/badge";

export type LicenseStatus = "ACTIVE" | "SUSPENDED" | "EXPIRED";
export type AuditStatus =
  | "SUCCESS"
  | "MISMATCH_DOMAIN"
  | "MISMATCH_PATH"
  | "MISMATCH_TELEGRAM"
  | "SUSPENDED"
  | "EXPIRED";

export function LicenseStatusBadge({ status }: { status: LicenseStatus }) {
  if (status === "ACTIVE") {
    return <Badge variant="success">ACTIVE</Badge>;
  }

  if (status === "SUSPENDED") {
    return <Badge variant="danger">SUSPENDED</Badge>;
  }

  return <Badge variant="warning">EXPIRED</Badge>;
}

export function AuditStatusBadge({
  status,
}: {
  status: AuditStatus | string;
}) {
  if (status === "SUCCESS") {
    return <Badge variant="success">SUCCESS</Badge>;
  }

  if (status === "SUSPENDED" || status === "EXPIRED") {
    return <Badge variant="warning">{status}</Badge>;
  }

  return <Badge variant="danger">{status}</Badge>;
}
