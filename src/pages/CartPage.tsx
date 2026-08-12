import { useMemo, useState } from "react";
import {
  Alert, Box, Button, Card, CardContent, CircularProgress, Container, Divider, Grid,
  IconButton, Stack, TextField, Typography,
} from "@mui/material";
import {
  AddRounded, ArrowBackRounded, ArrowForwardRounded, DeleteOutlineRounded,
  LocalShippingOutlined, LockOutlined, RemoveRounded, ShoppingBagOutlined,
} from "@mui/icons-material";
import { Link, useNavigate } from "react-router-dom";
import { createOrder } from "../api/orders";
import { useCartStore } from "../store/cartStore";
import PageHeader from "../components/PageHeader";
import { apiError, money } from "../utils/format";

export default function CartPage() {
  const navigate = useNavigate();
  const { items, removeFromCart, updateQuantity } = useCartStore();
  const [form, setForm] = useState({ customerName: "", customerEmail: "", customerPhone: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const total = useMemo(() => items.reduce((sum, item) => sum + item.book.price * item.quantity, 0), [items]);
  const valid = form.customerName.trim() && /\S+@\S+\.\S+/.test(form.customerEmail) && /^254[17]\d{8}$/.test(form.customerPhone);

  async function handleCreateOrder() {
    if (!items.length || !valid) return;
    try {
      setSubmitting(true);
      setError("");
      const order = await createOrder({ ...form, items: items.map((item) => ({ bookId: item.book.id, quantity: item.quantity })) });
      sessionStorage.setItem("currentOrder", JSON.stringify(order));
      sessionStorage.setItem("customerPhone", form.customerPhone);
      navigate("/checkout", { state: { order, customerPhone: form.customerPhone } });
    } catch (err) {
      setError(apiError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Container maxWidth="xl" sx={{ py: { xs: 5, md: 8 } }}>
      <PageHeader eyebrow="Your selection" title="Shopping bag" description={items.length ? `${items.reduce((sum, item) => sum + item.quantity, 0)} item(s) reserved while you complete your order.` : "Your next great read is only a shelf away."} />
      {!items.length ? (
        <Card sx={{ textAlign: "center", py: 8 }}>
          <CardContent><ShoppingBagOutlined sx={{ fontSize: 60, color: "text.disabled" }} /><Typography variant="h4" mt={2}>Your bag is empty</Typography><Typography color="text.secondary" mt={1} mb={3}>Browse the collection and find something wonderful.</Typography><Button component={Link} to="/" variant="contained" startIcon={<ArrowBackRounded />}>Browse books</Button></CardContent>
        </Card>
      ) : (
        <Grid container spacing={4} alignItems="start">
          <Grid size={{ xs: 12, lg: 8 }}>
            <Card>
              <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                <Stack divider={<Divider flexItem />} spacing={0}>
                  {items.map((item) => (
                    <Stack key={item.book.id} direction={{ xs: "column", sm: "row" }} alignItems={{ sm: "center" }} spacing={2.5} py={2}>
                      <Box sx={{ width: 68, height: 92, bgcolor: "primary.main", color: "secondary.light", borderRadius: 1.5, display: "grid", placeItems: "center", flexShrink: 0 }}><Typography fontFamily="Georgia" textAlign="center" px={1} lineHeight={1.05}>{item.book.title}</Typography></Box>
                      <Box flexGrow={1}><Typography fontWeight={800}>{item.book.title}</Typography><Typography variant="body2" color="text.secondary">by {item.book.author}</Typography><Typography color="primary" fontWeight={800} mt={.5}>{money(item.book.price)}</Typography></Box>
                      <Stack direction="row" alignItems="center" spacing={.5}>
                        <IconButton size="small" aria-label="Decrease quantity" onClick={() => updateQuantity(item.book.id, item.quantity - 1)}><RemoveRounded /></IconButton>
                        <Typography fontWeight={800} minWidth={28} textAlign="center">{item.quantity}</Typography>
                        <IconButton size="small" aria-label="Increase quantity" disabled={item.quantity >= item.book.stockQuantity} onClick={() => updateQuantity(item.book.id, item.quantity + 1)}><AddRounded /></IconButton>
                      </Stack>
                      <Typography fontWeight={800} minWidth={110} textAlign={{ sm: "right" }}>{money(item.book.price * item.quantity)}</Typography>
                      <IconButton color="error" aria-label={`Remove ${item.book.title}`} onClick={() => removeFromCart(item.book.id)}><DeleteOutlineRounded /></IconButton>
                    </Stack>
                  ))}
                </Stack>
              </CardContent>
            </Card>
            <Button component={Link} to="/" startIcon={<ArrowBackRounded />} sx={{ mt: 2 }}>Continue shopping</Button>
          </Grid>
          <Grid size={{ xs: 12, lg: 4 }}>
            <Card sx={{ position: { lg: "sticky" }, top: 100 }}>
              <CardContent sx={{ p: { xs: 2.5, md: 3.5 } }}>
                <Typography variant="h5">Order details</Typography>
                <Typography variant="body2" color="text.secondary" mt={.5}>Tell us where to send your order confirmation.</Typography>
                {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
                <Stack spacing={2} mt={3}>
                  <TextField required fullWidth label="Full name" value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} />
                  <TextField required fullWidth type="email" label="Email address" value={form.customerEmail} onChange={(e) => setForm({ ...form, customerEmail: e.target.value })} />
                  <TextField required fullWidth label="M-Pesa phone" value={form.customerPhone} onChange={(e) => setForm({ ...form, customerPhone: e.target.value.replace(/\D/g, "") })} helperText="Format: 2547XXXXXXXX or 2541XXXXXXXX" error={Boolean(form.customerPhone) && !/^254[17]\d{8}$/.test(form.customerPhone)} />
                </Stack>
                <Divider sx={{ my: 3 }} />
                <Stack direction="row" justifyContent="space-between"><Typography color="text.secondary">Subtotal</Typography><Typography fontWeight={800}>{money(total)}</Typography></Stack>
                <Stack direction="row" justifyContent="space-between" mt={1}><Typography color="text.secondary">Delivery</Typography><Typography color="success.main" fontWeight={800}>Digital / Free</Typography></Stack>
                <Stack direction="row" justifyContent="space-between" mt={2}><Typography variant="h6">Total</Typography><Typography variant="h5" color="primary">{money(total)}</Typography></Stack>
                <Button fullWidth variant="contained" size="large" endIcon={submitting ? <CircularProgress size={20} color="inherit" /> : <ArrowForwardRounded />} disabled={!valid || submitting} onClick={handleCreateOrder} sx={{ mt: 3 }}>Continue to payment</Button>
                <Stack direction="row" justifyContent="center" spacing={2} mt={2} color="text.secondary"><Stack direction="row" spacing={.5}><LockOutlined fontSize="small" /><Typography variant="caption">Secure</Typography></Stack><Stack direction="row" spacing={.5}><LocalShippingOutlined fontSize="small" /><Typography variant="caption">Instant confirmation</Typography></Stack></Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </Container>
  );
}
