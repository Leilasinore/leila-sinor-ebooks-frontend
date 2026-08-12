import { api } from "./client";
import type { Book, PagedResponse } from "../types";

export async function getBooks(page = 0, size = 12): Promise<PagedResponse<Book>> {
  const res = await api.get("/api/books", {
    params: { page, size },
  });
  return res.data;
}