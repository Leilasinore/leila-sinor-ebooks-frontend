import { AddShoppingCartRounded, MenuBookRounded } from "@mui/icons-material";
import { Box, Button, Card, CardContent, Chip, Stack, Typography } from "@mui/material";
import type { Book } from "../types";

type Props = { book: Book; onAddToCart: (book: Book) => void };

const covers = [
  ["#173E36", "#DDA276"], ["#9E5D3A", "#F0C89E"], ["#263D5C", "#A9C7D8"],
  ["#655246", "#D9C3AD"], ["#476757", "#E2B869"],
];

export default function BookCard({ book, onAddToCart }: Props) {
  const [ink, accent] = covers[book.id % covers.length];
  const unavailable = book.stockQuantity < 1;

  return (
    <Card sx={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden", transition: "transform .2s, box-shadow .2s", "&:hover": { transform: "translateY(-5px)", boxShadow: "0 22px 55px rgba(35,52,47,.13)" } }}>
      <Box sx={{ m: 1.5, mb: 0, height: 240, borderRadius: 2.5, bgcolor: ink, color: "white", p: 3, display: "flex", flexDirection: "column", justifyContent: "space-between", position: "relative", overflow: "hidden" }}>
        <Box sx={{ position: "absolute", width: 170, height: 170, borderRadius: "50%", bgcolor: accent, opacity: .22, right: -65, top: -55 }} />
        <MenuBookRounded sx={{ color: accent }} />
        <Box>
          <Typography variant="overline" sx={{ color: accent, letterSpacing: ".18em" }}>Leila Sinor Books</Typography>
          <Typography variant="h5" sx={{ color: "white", lineHeight: 1.15, mt: 1 }}>{book.title}</Typography>
          <Typography variant="body2" sx={{ opacity: .75, mt: 1 }}>by {book.author}</Typography>
        </Box>
      </Box>
      <CardContent sx={{ p: 2.5, pt: 2, display: "flex", flexDirection: "column", flexGrow: 1 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6" color="primary">KSh {Number(book.price).toLocaleString()}</Typography>
          <Chip size="small" label={unavailable ? "Out of stock" : `${book.stockQuantity} in stock`} color={unavailable ? "default" : book.stockQuantity < 5 ? "warning" : "success"} variant="outlined" />
        </Stack>
        <Typography variant="caption" color="text.secondary" sx={{ mb: 2 }}>ISBN {book.isbn || "Not listed"} · {book.publicationYear || "—"}</Typography>
        <Button fullWidth variant="contained" startIcon={<AddShoppingCartRounded />} disabled={unavailable} onClick={() => onAddToCart(book)} sx={{ mt: "auto" }}>
          {unavailable ? "Unavailable" : "Add to bag"}
        </Button>
      </CardContent>
    </Card>
  );
}
