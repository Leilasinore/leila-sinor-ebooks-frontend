import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert, Box, Button, Card, CardContent, CircularProgress, Container, Divider,
  Grid, LinearProgress, Stack, TextField, Typography,
} from "@mui/material";
import { ArrowBackRounded, CheckCircleOutlineRounded, LockOutlined, PhoneIphoneRounded } from "@mui/icons-material";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { initiatePayment } from "../api/payments";
import { getOrder } from "../api/orders";
import type { OrderResponse, PaymentResponse } from "../types";
import { useCartStore } from "../store/cartStore";
import StatusChip from "../components/StatusChip";
import PageHeader from "../components/PageHeader";
import { apiError, money } from "../utils/format";

type LocationState = { order?: OrderResponse; customerPhone?: string };

export default function CheckoutPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const clearCart = useCartStore((s) => s.clearCart);
  const state = location.state as LocationState | null;
  const storedOrder = sessionStorage.getItem("currentOrder");
  const initialOrder = state?.order || (storedOrder ? JSON.parse(storedOrder) as OrderResponse : null);
  const [order] = useState<OrderResponse | null>(initialOrder);
  const [phoneNumber, setPhoneNumber] = useState(state?.customerPhone || sessionStorage.getItem("customerPhone") || "");
  const [payment, setPayment] = useState<PaymentResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [polling, setPolling] = useState(false);
  const [error, setError] = useState("");
  const pollCount = useRef(0);
  const validPhone = /^254[17]\d{8}$/.test(phoneNumber);
  const total = useMemo(() => order?.totalAmount ?? 0, [order]);

  useEffect(() => {
    if (!order) navigate("/cart", { replace: true });
  }, [order, navigate]);

  useEffect(() => {
    if (!polling || !order) return;
    const interval = window.setInterval(async () => {
      try {
        pollCount.current += 1;
        const latestOrder = await getOrder(order.id);
        if (latestOrder.status === "PAID") {
          window.clearInterval(interval);
          setPolling(false);
          const successPayment = { ...payment, orderId: order.id, amount: total, phoneNumber, status: "SUCCESS" as const };
          sessionStorage.setItem("currentPayment", JSON.stringify(successPayment));
          clearCart();
          navigate("/success", { replace: true, state: { payment: successPayment, order: latestOrder } });
        } else if (latestOrder.status === "FAILED" || latestOrder.status === "CANCELLED") {
          window.clearInterval(interval);
          setPolling(false);
          setError("The payment was not completed. You can safely try again.");
        } else if (pollCount.current >= 40) {
          window.clearInterval(interval);
          setPolling(false);
          setError("Confirmation is taking longer than expected. Check your M-Pesa messages, then try again or contact support with your order number.");
        }
      } catch {
        if (pollCount.current >= 40) {
          window.clearInterval(interval);
          setPolling(false);
          setError("We could not confirm the payment status. Your order is saved; please check again shortly.");
        }
      }
    }, 3000);
    return () => window.clearInterval(interval);
  }, [polling, order, payment, phoneNumber, total, clearCart, navigate]);

  async function handlePromptPayment() {
    if (!order || !validPhone) return;
    try {
      setLoading(true);
      setError("");
      const response = await initiatePayment({ orderId: order.id, phoneNumber });
      const createdPayment = { ...response, orderId: response.orderId ?? order.id, amount: total, phoneNumber };
      setPayment(createdPayment);
      sessionStorage.setItem("currentPayment", JSON.stringify(createdPayment));
      pollCount.current = 0;
      setPolling(true);
    } catch (err) {
      setError(apiError(err));
    } finally {
      setLoading(false);
    }
  }

  if (!order) return null;

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 5, md: 8 } }}>
      <PageHeader eyebrow="Secure checkout" title="Pay with M-Pesa" description="We’ll send an STK push to your phone. Enter your PIN on the secure M-Pesa prompt to complete the order." />
      <Grid container spacing={4} alignItems="start">
        <Grid size={{ xs: 12, md: 7 }}>
          <Card>
            {polling && <LinearProgress color="secondary" />}
            <CardContent sx={{ p: { xs: 3, md: 5 } }}>
              <Stack direction="row" spacing={2} alignItems="center" mb={4}>
                <Box sx={{ width: 52, height: 52, borderRadius: "50%", bgcolor: "success.main", color: "white", display: "grid", placeItems: "center" }}><PhoneIphoneRounded /></Box>
                <Box><Typography variant="h5">M-Pesa STK Push</Typography><Typography variant="body2" color="text.secondary">Powered by Safaricom Daraja</Typography></Box>
              </Stack>
              {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
              {polling && <Alert severity="info" icon={<CheckCircleOutlineRounded />} sx={{ mb: 3 }}>Prompt sent. Check your phone and enter your M-Pesa PIN. This page will update automatically.</Alert>}
              <TextField
                fullWidth label="M-Pesa phone number" value={phoneNumber}
                onChange={(event) => setPhoneNumber(event.target.value.replace(/\D/g, ""))}
                helperText="Use 2547XXXXXXXX or 2541XXXXXXXX"
                error={Boolean(phoneNumber) && !validPhone}
                disabled={polling}
              />
              <Button fullWidth size="large" variant="contained" color="success" onClick={handlePromptPayment} disabled={!validPhone || loading || polling} startIcon={loading || polling ? <CircularProgress size={20} color="inherit" /> : <PhoneIphoneRounded />} sx={{ mt: 3 }}>
                {loading ? "Sending prompt…" : polling ? "Waiting for confirmation…" : `Pay ${money(total)}`}
              </Button>
              <Stack direction="row" spacing={1} justifyContent="center" mt={2} color="text.secondary"><LockOutlined fontSize="small" /><Typography variant="caption">Your PIN is entered only on your phone and is never shared with us.</Typography></Stack>
            </CardContent>
          </Card>
          <Button component={Link} to="/cart" startIcon={<ArrowBackRounded />} sx={{ mt: 2 }} disabled={polling}>Back to bag</Button>
        </Grid>
        <Grid size={{ xs: 12, md: 5 }}>
          <Card><CardContent sx={{ p: 3 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center"><Typography variant="h5">Order #{order.id}</Typography><StatusChip status={order.status} /></Stack>
            <Typography variant="body2" color="text.secondary" mt={1}>{order.customerName} · {order.customerEmail}</Typography>
            <Divider sx={{ my: 2.5 }} />
            <Stack spacing={2}>{order.items?.map((item) => <Stack key={item.id || item.book.id} direction="row" justifyContent="space-between"><Box><Typography fontWeight={700}>{item.book.title}</Typography><Typography variant="caption" color="text.secondary">Qty {item.quantity}</Typography></Box><Typography fontWeight={700}>{money(item.priceAtPurchase * item.quantity)}</Typography></Stack>)}</Stack>
            <Divider sx={{ my: 2.5 }} />
            <Stack direction="row" justifyContent="space-between"><Typography variant="h6">Total</Typography><Typography variant="h5" color="primary">{money(total)}</Typography></Stack>
            {payment && <Stack direction="row" justifyContent="space-between" alignItems="center" mt={2}><Typography variant="body2" color="text.secondary">Payment</Typography><StatusChip status={payment.status} /></Stack>}
          </CardContent></Card>
        </Grid>
      </Grid>
    </Container>
  );
}
