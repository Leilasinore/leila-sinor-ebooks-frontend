import { useEffect, useState } from "react";
import { getBooks } from "../api/books";
import BookCard from "../components/BookCard";
import { useCartStore } from "../store/cartStore";
import type { Book } from "../types";

export default function BooksPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const addToCart = useCartStore((s) => s.addToCart);

  useEffect(() => {
    async function loadBooks() {
      try {
        const data = await getBooks();
        setBooks(data.content);
      } finally {
        setLoading(false);
      }
    }

    loadBooks();
  }, []);

  if (loading) return <p>Loading books...</p>;

  return (
    <div>
      <h1>Books</h1>
      <div className="grid">
        {books.map((book) => (
          <BookCard key={book.id} book={book} onAddToCart={addToCart} />
        ))}
      </div>
    </div>
  );
}