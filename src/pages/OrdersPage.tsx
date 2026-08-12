import { useCallback, useEffect, useState } from "react";
import {
  Alert, Box, Button, Card, CircularProgress, Container, Dialog, DialogContent,
  DialogTitle, IconButton, Pagination, Stack, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Tooltip, Typography,
} from "@mui/material";
import { CloseRounded, PaymentsOutlined, RefreshRounded, VisibilityOutlined } from "@mui/icons-material";
import { Link } from "react-router-dom";
import { getOrders } from "../api/orders";
import type { OrderResponse } from "../types";
import PageHeader from "../components/PageHeader";
import StatusChip from "../components/StatusChip";
import { apiError, dateTime, money } from "../utils/format";

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<OrderResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try { setLoading(true); setError(""); const data = await getOrders(page, 10); setOrders(data.content); setTotalPages(Math.max(data.totalPages, 1)); setTotal(data.totalElements); }
    catch (err) { setError(apiError(err)); } finally { setLoading(false); }
  }, [page]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  return (
    <Container maxWidth="xl" sx={{ py: { xs: 5, md: 8 } }}>
      <PageHeader eyebrow="Operations" title="Orders" description={`Track ${total} customer order(s), payment progress, and purchased titles.`} action={<Tooltip title="Refresh orders"><IconButton onClick={() => void load()}><RefreshRounded /></IconButton></Tooltip>} />
      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
      <Card>
        {loading ? <Box py={10} textAlign="center"><CircularProgress /></Box> : <TableContainer><Table>
          <TableHead><TableRow><TableCell>Order</TableCell><TableCell>Customer</TableCell><TableCell>Created</TableCell><TableCell>Items</TableCell><TableCell>Total</TableCell><TableCell>Status</TableCell><TableCell align="right">View</TableCell></TableRow></TableHead>
          <TableBody>{orders.map((order) => <TableRow key={order.id} hover>
            <TableCell sx={{ fontWeight: 800 }}>#{order.id}</TableCell>
            <TableCell><Typography fontWeight={700}>{order.customerName}</Typography><Typography variant="caption" color="text.secondary">{order.customerEmail}</Typography></TableCell>
            <TableCell>{dateTime(order.createdAt)}</TableCell><TableCell>{order.items?.reduce((sum, item) => sum + item.quantity, 0) || 0}</TableCell>
            <TableCell sx={{ fontWeight: 800 }}>{money(order.totalAmount)}</TableCell><TableCell><StatusChip status={order.status} /></TableCell>
            <TableCell align="right"><Tooltip title="Order details"><IconButton onClick={() => setSelected(order)}><VisibilityOutlined /></IconButton></Tooltip></TableCell>
          </TableRow>)}
          {!orders.length && <TableRow><TableCell colSpan={7} align="center" sx={{ py: 8 }}>No orders have been placed yet.</TableCell></TableRow>}
          </TableBody>
        </Table></TableContainer>}
      </Card>
      {totalPages > 1 && <Stack alignItems="center" mt={4}><Pagination count={totalPages} page={page + 1} onChange={(_, value) => setPage(value - 1)} color="primary" /></Stack>}
      <Dialog open={Boolean(selected)} onClose={() => setSelected(null)} fullWidth maxWidth="sm">
        <DialogTitle><Stack direction="row" justifyContent="space-between" alignItems="center"><Box>Order #{selected?.id}</Box><IconButton onClick={() => setSelected(null)}><CloseRounded /></IconButton></Stack></DialogTitle>
        <DialogContent>
          {selected && <Stack spacing={3}>
            <Stack direction="row" justifyContent="space-between"><Box><Typography fontWeight={800}>{selected.customerName}</Typography><Typography variant="body2" color="text.secondary">{selected.customerEmail}<br />{selected.customerPhone}</Typography></Box><StatusChip status={selected.status} /></Stack>
            <Box>{selected.items?.map((item) => <Stack key={item.id || item.book.id} direction="row" justifyContent="space-between" sx={{ py: 1.5, borderBottom: 1, borderColor: "divider" }}><Box><Typography fontWeight={700}>{item.book.title}</Typography><Typography variant="caption" color="text.secondary">{item.quantity} × {money(item.priceAtPurchase)}</Typography></Box><Typography fontWeight={800}>{money(item.quantity * item.priceAtPurchase)}</Typography></Stack>)}</Box>
            <Stack direction="row" justifyContent="space-between"><Typography variant="h6">Order total</Typography><Typography variant="h5" color="primary">{money(selected.totalAmount)}</Typography></Stack>
            {(selected.status === "PENDING" || selected.status === "FAILED") && <Button component={Link} to="/checkout" state={{ order: selected, customerPhone: selected.customerPhone }} variant="contained" startIcon={<PaymentsOutlined />}>Collect M-Pesa payment</Button>}
          </Stack>}
        </DialogContent>
      </Dialog>
    </Container>
  );
}
