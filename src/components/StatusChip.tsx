import { Chip } from "@mui/material";

const colors = {
  SUCCESS: "success", PAID: "success", INITIATED: "warning",
  PAYMENT_PROCESSING: "warning", PENDING: "warning",
  FAILED: "error", CANCELLED: "default",
} as const;

export default function StatusChip({ status }: { status: string }) {
  const color = colors[status as keyof typeof colors] || "default";
  return <Chip size="small" label={status.replaceAll("_", " ")} color={color} variant="outlined" />;
}
