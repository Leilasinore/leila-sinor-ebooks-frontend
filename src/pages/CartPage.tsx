import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createOrder } from "../api/orders";
import { useCartStore } from "../store/cartStore";

export default function CartPage() {
  const navigate = useNavigate();
  const { items, removeFromCart, updateQuantity } = useCartStore();

  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const total = useMemo(
    () => items.reduce((sum, item) => sum + item.book.price * item.quantity, 0),
    [items]
  );

  async function handleCreateOrder() {
    if (!items.length) return alert("Cart is empty");

    try {
      setSubmitting(true);

      const order = await createOrder({
        customerName,
        customerEmail,
        customerPhone,
        items: items.map((item) => ({
          bookId: item.book.id,
          quantity: item.quantity,
        })),
      });

      sessionStorage.setItem("currentOrder", JSON.stringify(order));
      sessionStorage.setItem("customerPhone", customerPhone);

      navigate("/checkout", {
        state: { order, customerPhone },
      });
    } catch (error) {
      console.error(error);
      alert("Failed to create order");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="two-col">
      <section>
        <h1>Cart</h1>

        {items.map((item) => (
          <div key={item.book.id} className="cart-row">
            <div>
              <strong>{item.book.title}</strong>
              <p>{item.book.author}</p>
            </div>

            <div>
              <button onClick={() => updateQuantity(item.book.id, item.quantity - 1)}>-</button>
              <span style={{ margin: "0 10px" }}>{item.quantity}</span>
              <button onClick={() => updateQuantity(item.book.id, item.quantity + 1)}>+</button>
            </div>

            <div>KSh {item.book.price * item.quantity}</div>

            <button onClick={() => removeFromCart(item.book.id)}>Remove</button>
          </div>
        ))}
      </section>

      <aside className="sidebar">
        <h2>Order Summary</h2>
        <p>Total: <strong>KSh {total}</strong></p>

        <h3>Customer Details</h3>
        <input
          placeholder="Full name"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
        />
        <input
          placeholder="Email"
          value={customerEmail}
          onChange={(e) => setCustomerEmail(e.target.value)}
        />
        <input
          placeholder="2547XXXXXXXX"
          value={customerPhone}
          onChange={(e) => setCustomerPhone(e.target.value)}
        />

        <button onClick={handleCreateOrder} disabled={submitting}>
          {submitting ? "Creating Order..." : "Create Order"}
        </button>
      </aside>
    </div>
  );
}