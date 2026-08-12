import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { getPayments } from "../api/payments";
import type { OrderResponse, PaymentResponse } from "../types";

type LocationState = {
  payment?: PaymentResponse;
  order?: OrderResponse;
};

export default function SuccessPage() {
  const location = useLocation();
  const state = location.state as LocationState | null;

  const storedPayment = sessionStorage.getItem("currentPayment");
  const payment: PaymentResponse | null =
    state?.payment || (storedPayment ? JSON.parse(storedPayment) : null);

  const [recentPayments, setRecentPayments] = useState<PaymentResponse[]>([]);

  useEffect(() => {
    async function loadPayments() {
      try {
        const data = await getPayments(0, 5);
        setRecentPayments(data.content);
      } catch (error) {
        console.error(error);
      }
    }

    loadPayments();
  }, []);

  if (!payment) {
    return <p>No payment data found.</p>;
  }

  return (
    <div>
      <h1>Payment Successful</h1>
      <div className="card">
        <p><strong>Order ID:</strong> {payment.orderId}</p>
        <p><strong>Payment Status:</strong> {payment.status}</p>
        <p><strong>Amount:</strong> KSh {payment.amount}</p>
        <p><strong>Phone Number:</strong> {payment.phoneNumber}</p>
        <p><strong>M-Pesa Receipt Number:</strong> {payment.mpesaReceiptNumber || "Not available yet"}</p>
      </div>

      <h2>Recent Payments</h2>
      <div className="card">
        <table width="100%">
          <thead>
            <tr>
              <th align="left">Payment ID</th>
              <th align="left">Order ID</th>
              <th align="left">Amount</th>
              <th align="left">Status</th>
              <th align="left">M-Pesa Receipt</th>
            </tr>
          </thead>
          <tbody>
            {recentPayments.map((p) => (
              <tr key={p.id}>
                <td>{p.id}</td>
                <td>{p.orderId}</td>
                <td>KSh {p.amount}</td>
                <td>{p.status}</td>
                <td>{p.mpesaReceiptNumber || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}