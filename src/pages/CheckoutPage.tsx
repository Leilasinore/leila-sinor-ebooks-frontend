import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getPaymentById, initiatePayment } from "../api/payments";
import type { OrderResponse, PaymentResponse } from "../types";
import { useCartStore } from "../store/cartStore";

type LocationState = {
  order?: OrderResponse;
  customerPhone?: string;
};

export default function CheckoutPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const clearCart = useCartStore((s) => s.clearCart);

  const state = location.state as LocationState | null;
  const storedOrder = sessionStorage.getItem("currentOrder");
  const initialOrder = state?.order || (storedOrder ? JSON.parse(storedOrder) : null);

  const [order] = useState<OrderResponse | null>(initialOrder);
  const [phoneNumber, setPhoneNumber] = useState(
    state?.customerPhone || sessionStorage.getItem("customerPhone") || ""
  );
  const [payment, setPayment] = useState<PaymentResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [pollingMessage, setPollingMessage] = useState("");

  const total = useMemo(() => order?.totalAmount ?? 0, [order]);

  useEffect(() => {
    if (!order) {
      navigate("/cart");
    }
  }, [order, navigate]);

  async function handlePromptPayment() {
    if (!order) return;

    try {
      setLoading(true);
      const createdPayment = await initiatePayment({
        orderId: order.id,
        phoneNumber,
      });

      setPayment(createdPayment);
      sessionStorage.setItem("currentPayment", JSON.stringify(createdPayment));
      setPollingMessage("STK push sent to your phone. Waiting for confirmation...");

      const interval = setInterval(async () => {
        try {
          const latest = await getPaymentById(createdPayment.id);
          setPayment(latest);
          sessionStorage.setItem("currentPayment", JSON.stringify(latest));

          if (latest.status === "SUCCESS") {
            clearInterval(interval);
            clearCart();
            navigate("/success", { state: { payment: latest, order } });
          }

          if (latest.status === "FAILED") {
            clearInterval(interval);
            setPollingMessage(latest.resultDescription || "Payment failed");
          }
        } catch (err) {
          console.error(err);
        }
      }, 3000);
    } catch (error) {
      console.error(error);
      alert("Failed to initiate payment");
    } finally {
      setLoading(false);
    }
  }

  if (!order) return null;

  return (
    <div className="checkout-page">
      <h1>Checkout</h1>

      <div className="card">
        <p><strong>Order ID:</strong> {order.id}</p>
        <p><strong>Total Amount:</strong> KSh {total}</p>
        <p><strong>Customer Phone:</strong> {phoneNumber}</p>
      </div>

      <div className="card">
        <h2>M-Pesa Payment</h2>
        <input
          placeholder="2547XXXXXXXX"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
        />
        <button onClick={handlePromptPayment} disabled={loading}>
          {loading ? "Prompting Payment..." : "Prompt M-Pesa Payment"}
        </button>

        {pollingMessage && <p style={{ marginTop: 12 }}>{pollingMessage}</p>}
        {payment && <p><strong>Payment Status:</strong> {payment.status}</p>}
      </div>
    </div>
  );
}