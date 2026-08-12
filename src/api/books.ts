import { api } from "./client";
import type { Book, BookPayload, PagedResponse } from "../types";

export async function getBooks(page = 0, size = 12): Promise<PagedResponse<Book>> {
  const res = await api.get("/api/books", {
    params: { page, size, sort: "title,asc" },
  });
  return res.data;
}

export async function getBook(id: number): Promise<Book> {
  const res = await api.get(`/api/books/${id}`);
  return res.data;
}

export async function createBook(payload: BookPayload): Promise<Book> {
  const res = await api.post("/api/books", payload);
  return res.data;
}

export async function updateBook(id: number, payload: BookPayload): Promise<Book> {
  const res = await api.put(`/api/books/${id}`, payload);
  return res.data;
}

export async function deleteBook(id: number): Promise<void> {
  await api.delete(`/api/books/${id}`);
}
