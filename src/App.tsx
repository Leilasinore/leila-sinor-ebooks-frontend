import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import BooksPage from "./pages/BooksPage";
import CartPage from "./pages/CartPage";
import CheckoutPage from "./pages/CheckoutPage";
import SuccessPage from "./pages/SuccessPage";
import InventoryPage from "./pages/InventoryPage";
import OrdersPage from "./pages/OrdersPage";
import PaymentsPage from "./pages/PaymentsPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<BooksPage />} />
        <Route path="books" element={<Navigate to="/" replace />} />
        <Route path="cart" element={<CartPage />} />
        <Route path="checkout" element={<CheckoutPage />} />
        <Route path="success" element={<SuccessPage />} />
        <Route path="manage/books" element={<InventoryPage />} />
        <Route path="manage/orders" element={<OrdersPage />} />
        <Route path="manage/payments" element={<PaymentsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}