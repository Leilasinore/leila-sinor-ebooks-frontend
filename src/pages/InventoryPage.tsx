import { useCallback, useEffect, useState } from "react";
import {
  Alert, Box, Button, Card, Chip, CircularProgress, Container, Dialog, DialogActions,
  DialogContent, DialogTitle, IconButton, Pagination, Stack, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, TextField, Tooltip, Typography,
} from "@mui/material";
import { AddRounded, DeleteOutlineRounded, EditOutlined, Inventory2Outlined, RefreshRounded } from "@mui/icons-material";
import { createBook, deleteBook, getBooks, updateBook } from "../api/books";
import type { Book, BookPayload } from "../types";
import PageHeader from "../components/PageHeader";
import { apiError, money } from "../utils/format";

const emptyBook: BookPayload = { title: "", author: "", price: 0, stockQuantity: 0, isbn: "", publicationYear: new Date().getFullYear() };

export default function InventoryPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [editing, setEditing] = useState<Book | null | undefined>(undefined);
  const [form, setForm] = useState<BookPayload>(emptyBook);
  const [deleting, setDeleting] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true); setError("");
      const data = await getBooks(page, 10);
      setBooks(data.content); setTotalPages(Math.max(data.totalPages, 1)); setTotal(data.totalElements);
    } catch (err) { setError(apiError(err)); }
    finally { setLoading(false); }
  }, [page]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  function openCreate() { setForm(emptyBook); setEditing(null); }
  function openEdit(book: Book) {
    setForm({ title: book.title, author: book.author, price: book.price, stockQuantity: book.stockQuantity, isbn: book.isbn, publicationYear: book.publicationYear });
    setEditing(book);
  }

  async function save() {
    try {
      setSaving(true); setError("");
      if (editing) await updateBook(editing.id, form); else await createBook(form);
      setEditing(undefined); await load();
    } catch (err) { setError(apiError(err)); }
    finally { setSaving(false); }
  }

  async function confirmDelete() {
    if (!deleting) return;
    try { setSaving(true); await deleteBook(deleting.id); setDeleting(null); await load(); }
    catch (err) { setError(apiError(err)); }
    finally { setSaving(false); }
  }

  const valid = form.title.trim() && form.author.trim() && form.price >= 0 && form.stockQuantity >= 0;

  return (
    <Container maxWidth="xl" sx={{ py: { xs: 5, md: 8 } }}>
      <PageHeader eyebrow="Book management" title="Inventory" description={`Manage ${total} title(s), pricing, publication details and available stock.`} action={<Stack direction="row" spacing={1}><Tooltip title="Refresh"><IconButton onClick={() => void load()}><RefreshRounded /></IconButton></Tooltip><Button variant="contained" startIcon={<AddRounded />} onClick={openCreate}>Add book</Button></Stack>} />
      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
      <Card>
        {loading ? <Box py={10} textAlign="center"><CircularProgress /></Box> : (
          <TableContainer>
            <Table>
              <TableHead><TableRow><TableCell>Book</TableCell><TableCell>ISBN</TableCell><TableCell>Published</TableCell><TableCell>Price</TableCell><TableCell>Stock</TableCell><TableCell align="right">Actions</TableCell></TableRow></TableHead>
              <TableBody>
                {books.map((book) => (
                  <TableRow key={book.id} hover>
                    <TableCell><Stack direction="row" spacing={1.5} alignItems="center"><Box sx={{ width: 38, height: 48, bgcolor: "primary.main", color: "secondary.light", borderRadius: 1, display: "grid", placeItems: "center" }}><Inventory2Outlined fontSize="small" /></Box><Box><Typography fontWeight={800}>{book.title}</Typography><Typography variant="body2" color="text.secondary">{book.author}</Typography></Box></Stack></TableCell>
                    <TableCell>{book.isbn || "—"}</TableCell><TableCell>{book.publicationYear || "—"}</TableCell><TableCell sx={{ fontWeight: 800 }}>{money(book.price)}</TableCell>
                    <TableCell><Chip size="small" label={book.stockQuantity} color={book.stockQuantity === 0 ? "error" : book.stockQuantity < 5 ? "warning" : "success"} variant="outlined" /></TableCell>
                    <TableCell align="right"><Tooltip title="Edit"><IconButton onClick={() => openEdit(book)}><EditOutlined /></IconButton></Tooltip><Tooltip title="Delete"><IconButton color="error" onClick={() => setDeleting(book)}><DeleteOutlineRounded /></IconButton></Tooltip></TableCell>
                  </TableRow>
                ))}
                {!books.length && <TableRow><TableCell colSpan={6} align="center" sx={{ py: 8 }}>No books in inventory yet.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Card>
      {totalPages > 1 && <Stack alignItems="center" mt={4}><Pagination count={totalPages} page={page + 1} onChange={(_, value) => setPage(value - 1)} color="primary" /></Stack>}

      <Dialog open={editing !== undefined} onClose={() => !saving && setEditing(undefined)} fullWidth maxWidth="sm">
        <DialogTitle>{editing ? "Edit book" : "Add a new book"}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField required autoFocus label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <TextField required label="Author" value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} />
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField fullWidth label="ISBN" value={form.isbn} onChange={(e) => setForm({ ...form, isbn: e.target.value })} />
              <TextField fullWidth type="number" label="Publication year" value={form.publicationYear} onChange={(e) => setForm({ ...form, publicationYear: Number(e.target.value) })} />
            </Stack>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField required fullWidth type="number" label="Price (KSh)" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} slotProps={{ htmlInput: { min: 0, step: "0.01" } }} />
              <TextField required fullWidth type="number" label="Stock quantity" value={form.stockQuantity} onChange={(e) => setForm({ ...form, stockQuantity: Number(e.target.value) })} slotProps={{ htmlInput: { min: 0 } }} />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions><Button onClick={() => setEditing(undefined)} disabled={saving}>Cancel</Button><Button variant="contained" onClick={save} disabled={!valid || saving}>{saving ? "Saving…" : editing ? "Save changes" : "Add book"}</Button></DialogActions>
      </Dialog>

      <Dialog open={Boolean(deleting)} onClose={() => !saving && setDeleting(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Delete this book?</DialogTitle><DialogContent><Typography color="text.secondary">“{deleting?.title}” will be permanently removed from the catalogue. Existing order records may still reference it.</Typography></DialogContent>
        <DialogActions><Button onClick={() => setDeleting(null)}>Keep book</Button><Button color="error" variant="contained" onClick={confirmDelete} disabled={saving}>Delete</Button></DialogActions>
      </Dialog>
    </Container>
  );
}
