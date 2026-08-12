import axios from "axios";

export const money = (value?: number) =>
  `KSh ${Number(value || 0).toLocaleString("en-KE", { maximumFractionDigits: 2 })}`;

export const dateTime = (value?: string) =>
  value ? new Intl.DateTimeFormat("en-KE", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "—";

export function apiError(error: unknown) {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string; detail?: string; error?: string } | undefined;
    return data?.message || data?.detail || data?.error || (error.code === "ECONNABORTED" ? "The request timed out. Please try again." : error.message);
  }
  return error instanceof Error ? error.message : "Something went wrong. Please try again.";
}
