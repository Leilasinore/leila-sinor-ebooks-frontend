import { api } from "./client";
import type { CreateOrderRequest, OrderResponse, PagedResponse } from "../types";

export async function createOrder(payload: CreateOrderRequest): Promise<OrderResponse> {
  const res = await api.post("/api/orders", payload);
  return res.data;
}

export async function getOrder(id: number): Promise<OrderResponse> {
  const res = await api.get(`/api/orders/${id}`);
  return res.data;
}

export async function getOrders(page = 0, size = 10): Promise<PagedResponse<OrderResponse>> {
  const res = await api.get("/api/orders", { params: { page, size, sort: "createdAt,desc" } });
  return res.data;
}
