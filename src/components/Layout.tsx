import { Link, Outlet } from "react-router-dom";
import { useCartStore } from "../store/cartStore";

export default function Layout() {
  const items = useCartStore((s) => s.items);
  const count = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="app-shell">
      <header className="topbar">
        <Link to="/books" className="brand">
          Leila Sinor Ebooks
        </Link>

        <nav className="nav-actions">
          <Link to="/books">Books</Link>
          <Link to="/cart">Cart ({count})</Link>
        </nav>
      </header>

      <main className="container">
        <Outlet />
      </main>
    </div>
  );
}