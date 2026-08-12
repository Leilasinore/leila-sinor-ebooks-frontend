import { api } from "./client";
import type { InitiatePaymentRequest, PaymentResponse, PagedResponse } from "../types";

export async function initiatePayment(payload: InitiatePaymentRequest): Promise<PaymentResponse> {
  const res = await api.post("/api/payments/initiate", payload);
  return res.data;
}

export async function getPaymentById(id: number): Promise<PaymentResponse> {
  const res = await api.get(`/api/payments/${id}`);
  return res.data;
}

export async function getPayments(page = 0, size = 5): Promise<PagedResponse<PaymentResponse>> {
  const res = await api.get("/api/payments", {
    params: { page, size },
  });
  return res.data;
}