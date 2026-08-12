import { useCallback, useEffect, useState } from "react";
import {
  Alert, Box, Card, CircularProgress, Container, IconButton, Pagination, Stack,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tooltip, Typography,
} from "@mui/material";
import { RefreshRounded } from "@mui/icons-material";
import { getPayments } from "../api/payments";
import type { PaymentResponse } from "../types";
import PageHeader from "../components/PageHeader";
import StatusChip from "../components/StatusChip";
import { apiError, dateTime, money } from "../utils/format";

export default function PaymentsPage() {
  const [payments, setPayments] = useState<PaymentResponse[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try { setLoading(true); setError(""); const data = await getPayments(page, 10); setPayments(data.content); setTotalPages(Math.max(data.totalPages, 1)); setTotal(data.totalElements); }
    catch (err) { setError(apiError(err)); } finally { setLoading(false); }
  }, [page]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  return (
    <Container maxWidth="xl" sx={{ py: { xs: 5, md: 8 } }}>
      <PageHeader eyebrow="M-Pesa ledger" title="Payments" description={`Monitor ${total} Daraja transaction(s), callback results, and receipt references.`} action={<Tooltip title="Refresh payments"><IconButton onClick={() => void load()}><RefreshRounded /></IconButton></Tooltip>} />
      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
      <Card>
        {loading ? <Box py={10} textAlign="center"><CircularProgress /></Box> : <TableContainer><Table>
          <TableHead><TableRow><TableCell>Payment</TableCell><TableCell>Created</TableCell><TableCell>Phone</TableCell><TableCell>Amount</TableCell><TableCell>Receipt</TableCell><TableCell>Result</TableCell><TableCell>Status</TableCell></TableRow></TableHead>
          <TableBody>{payments.map((payment, index) => <TableRow key={payment.id || index} hover>
            <TableCell sx={{ fontWeight: 800 }}>#{payment.id || "—"}</TableCell><TableCell>{dateTime(payment.createdAt)}</TableCell>
            <TableCell>{payment.phoneNumber || "—"}</TableCell><TableCell sx={{ fontWeight: 800 }}>{money(payment.amount)}</TableCell>
            <TableCell>{payment.mpesaReceiptNumber || "—"}</TableCell>
            <TableCell sx={{ maxWidth: 280 }}><Typography variant="body2" noWrap title={payment.resultDesc}>{payment.resultDesc || payment.message || "—"}</Typography></TableCell>
            <TableCell><StatusChip status={payment.status} /></TableCell>
          </TableRow>)}
          {!payments.length && <TableRow><TableCell colSpan={7} align="center" sx={{ py: 8 }}>No payments recorded yet.</TableCell></TableRow>}
          </TableBody>
        </Table></TableContainer>}
      </Card>
      {totalPages > 1 && <Stack alignItems="center" mt={4}><Pagination count={totalPages} page={page + 1} onChange={(_, value) => setPage(value - 1)} color="primary" /></Stack>}
    </Container>
  );
}
