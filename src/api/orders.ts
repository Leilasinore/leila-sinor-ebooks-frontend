import { api } from "./client";
import type { CreateOrderRequest, OrderResponse } from "../types";

export async function createOrder(payload: CreateOrderRequest): Promise<OrderResponse> {
  const res = await api.post("/api/orders", payload);
  return res.data;
}