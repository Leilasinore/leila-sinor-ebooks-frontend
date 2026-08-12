import { Box, Button, Card, CardContent, Container, Divider, Stack, Typography } from "@mui/material";
import { CheckRounded, HomeRounded, ReceiptLongOutlined } from "@mui/icons-material";
import { Link, useLocation } from "react-router-dom";
import type { OrderResponse, PaymentResponse } from "../types";
import StatusChip from "../components/StatusChip";
import { money } from "../utils/format";

type LocationState = { payment?: PaymentResponse; order?: OrderResponse };

export default function SuccessPage() {
  const state = useLocation().state as LocationState | null;
  const storedPayment = sessionStorage.getItem("currentPayment");
  const storedOrder = sessionStorage.getItem("currentOrder");
  const payment = state?.payment || (storedPayment ? JSON.parse(storedPayment) as PaymentResponse : null);
  const order = state?.order || (storedOrder ? JSON.parse(storedOrder) as OrderResponse : null);

  if (!payment) {
    return <Container maxWidth="sm" sx={{ py: 10, textAlign: "center" }}><Typography variant="h4">No recent payment found</Typography><Button component={Link} to="/" sx={{ mt: 3 }}>Return to the bookshop</Button></Container>;
  }

  return (
    <Container maxWidth="sm" sx={{ py: { xs: 6, md: 10 } }}>
      <Card sx={{ overflow: "visible" }}>
        <CardContent sx={{ p: { xs: 3, md: 5 }, textAlign: "center" }}>
          <Box sx={{ width: 82, height: 82, borderRadius: "50%", bgcolor: "success.main", color: "white", display: "grid", placeItems: "center", mx: "auto", mt: -9, boxShadow: "0 12px 30px rgba(45,125,91,.3)" }}><CheckRounded sx={{ fontSize: 48 }} /></Box>
          <Typography variant="overline" color="success.main" fontWeight={900} letterSpacing=".15em" sx={{ display: "block", mt: 3 }}>Payment received</Typography>
          <Typography variant="h3" mt={.5}>Thank you!</Typography>
          <Typography color="text.secondary" mt={1}>Your order is confirmed. We’ve saved the details below for your records.</Typography>
          <Divider sx={{ my: 4 }} />
          <Stack spacing={2.2} textAlign="left">
            <Stack direction="row" justifyContent="space-between"><Typography color="text.secondary">Order number</Typography><Typography fontWeight={800}>#{payment.orderId || order?.id}</Typography></Stack>
            <Stack direction="row" justifyContent="space-between"><Typography color="text.secondary">Amount paid</Typography><Typography fontWeight={800}>{money(payment.amount || order?.totalAmount)}</Typography></Stack>
            <Stack direction="row" justifyContent="space-between"><Typography color="text.secondary">Phone</Typography><Typography fontWeight={800}>{payment.phoneNumber || order?.customerPhone}</Typography></Stack>
            <Stack direction="row" justifyContent="space-between"><Typography color="text.secondary">Status</Typography><StatusChip status={payment.status} /></Stack>
            <Stack direction="row" justifyContent="space-between"><Typography color="text.secondary">M-Pesa receipt</Typography><Typography fontWeight={800}>{payment.mpesaReceiptNumber || "Pending sync"}</Typography></Stack>
          </Stack>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} mt={4}>
            <Button fullWidth component={Link} to="/" variant="contained" startIcon={<HomeRounded />}>Continue shopping</Button>
            <Button fullWidth component={Link} to="/manage/orders" variant="outlined" startIcon={<ReceiptLongOutlined />}>View orders</Button>
          </Stack>
        </CardContent>
      </Card>
    </Container>
  );
}
