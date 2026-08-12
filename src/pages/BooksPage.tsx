import { useEffect, useMemo, useState } from "react";
import {
  Alert, Box, Button, Container, Grid, InputAdornment, Pagination, Snackbar,
  Stack, TextField, Typography,
} from "@mui/material";
import { ArrowDownwardRounded, SearchRounded, VerifiedRounded } from "@mui/icons-material";
import { getBooks } from "../api/books";
import BookCard from "../components/BookCard";
import LoadingGrid from "../components/LoadingGrid";
import { useCartStore } from "../store/cartStore";
import type { Book } from "../types";
import { apiError } from "../utils/format";

export default function BooksPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [added, setAdded] = useState("");
  const [request, setRequest] = useState(0);
  const addToCart = useCartStore((s) => s.addToCart);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      setLoading(true);
      setError("");
      void getBooks(page, 12)
        .then((data) => {
          if (!active) return;
          setBooks(data.content);
          setTotalPages(Math.max(data.totalPages, 1));
          setTotalElements(data.totalElements);
        })
        .catch((err) => active && setError(apiError(err)))
        .finally(() => active && setLoading(false));
    }, 0);
    return () => { active = false; window.clearTimeout(timer); };
  }, [page, request]);

  const visible = useMemo(() => {
    const search = query.trim().toLowerCase();
    if (!search) return books;
    return books.filter((book) => [book.title, book.author, book.isbn].some((value) => value?.toLowerCase().includes(search)));
  }, [books, query]);

  function handleAdd(book: Book) {
    addToCart(book);
    setAdded(book.title);
  }

  return (
    <>
      <Box sx={{ bgcolor: "primary.main", color: "white", overflow: "hidden", position: "relative" }}>
        <Box sx={{ position: "absolute", width: 620, height: 620, border: "1px solid rgba(255,255,255,.10)", borderRadius: "50%", right: -180, top: -330 }} />
        <Box sx={{ position: "absolute", width: 430, height: 430, bgcolor: "secondary.main", opacity: .12, borderRadius: "50%", right: 40, bottom: -360 }} />
        <Container maxWidth="xl" sx={{ py: { xs: 8, md: 12 }, position: "relative" }}>
          <Grid container spacing={5} alignItems="center">
            <Grid size={{ xs: 12, md: 8 }}>
              <Typography variant="overline" sx={{ color: "secondary.light", letterSpacing: ".2em", fontWeight: 800 }}>Stories worth keeping</Typography>
              <Typography variant="h1" sx={{ fontSize: { xs: 46, sm: 64, md: 82 }, maxWidth: 850, mt: 1, lineHeight: .98 }}>Find your next unforgettable read.</Typography>
              <Typography sx={{ mt: 3, maxWidth: 620, color: "rgba(255,255,255,.72)", fontSize: { xs: 17, md: 19 } }}>
                A considered collection of books from voices that inform, delight, and stay with you.
              </Typography>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2} mt={4} alignItems={{ sm: "center" }}>
                <Button color="secondary" variant="contained" size="large" href="#collection" endIcon={<ArrowDownwardRounded />}>Explore the collection</Button>
                <Stack direction="row" spacing={1} alignItems="center"><VerifiedRounded sx={{ color: "secondary.light" }} /><Typography variant="body2">{totalElements || "A growing library"} titles · Secure M-Pesa</Typography></Stack>
              </Stack>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }} sx={{ display: { xs: "none", md: "block" } }}>
              <Box sx={{ width: 245, height: 340, mx: "auto", bgcolor: "secondary.main", p: 3, transform: "rotate(6deg)", boxShadow: "22px 26px 0 rgba(0,0,0,.18)", borderRadius: "4px 14px 14px 4px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <Typography color="primary.dark" variant="overline" fontWeight={900}>Reader's pick</Typography>
                <Typography variant="h3" color="primary.dark">A shelf full of possibility.</Typography>
                <Typography color="primary.dark" fontWeight={800}>Leila Sinor Books</Typography>
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      <Container id="collection" maxWidth="xl" sx={{ py: { xs: 6, md: 9 } }}>
        <Stack direction={{ xs: "column", md: "row" }} alignItems={{ md: "end" }} justifyContent="space-between" spacing={3} mb={4}>
          <Box>
            <Typography variant="overline" color="secondary.dark" fontWeight={800} letterSpacing=".15em">The collection</Typography>
            <Typography variant="h3" sx={{ fontSize: { xs: 36, md: 48 } }}>Books for curious minds</Typography>
          </Box>
          <TextField
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search this page by title, author or ISBN"
            sx={{ width: { xs: "100%", md: 370 }, "& .MuiOutlinedInput-root": { bgcolor: "background.paper" } }}
            slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchRounded /></InputAdornment> } }}
          />
        </Stack>

        {error && <Alert severity="error" action={<Button color="inherit" onClick={() => setRequest((value) => value + 1)}>Retry</Button>} sx={{ mb: 3 }}>{error}</Alert>}
        {loading ? <LoadingGrid /> : visible.length ? (
          <Grid container spacing={3}>
            {visible.map((book) => <Grid key={book.id} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}><BookCard book={book} onAddToCart={handleAdd} /></Grid>)}
          </Grid>
        ) : (
          <Box textAlign="center" py={10}><Typography variant="h5">No books found</Typography><Typography color="text.secondary" mt={1}>Try a different search, or check back as the collection grows.</Typography></Box>
        )}
        {!query && totalPages > 1 && <Stack alignItems="center" mt={5}><Pagination count={totalPages} page={page + 1} onChange={(_, value) => { setPage(value - 1); window.scrollTo({ top: 600, behavior: "smooth" }); }} color="primary" /></Stack>}
      </Container>
      <Snackbar open={Boolean(added)} autoHideDuration={2500} onClose={() => setAdded("")} message={`“${added}” added to your bag`} />
    </>
  );
}
