import type { Book } from "../types";

type Props = {
  book: Book;
  onAddToCart: (book: Book) => void;
};

export default function BookCard({ book, onAddToCart }: Props) {
  return (
    <div className="card">
      <div className="book-cover-placeholder">{book.title}</div>
      <h3>{book.title}</h3>
      <p>{book.author}</p>
      <p className="price">KSh {book.price}</p>
      <button onClick={() => onAddToCart(book)}>Add to Cart</button>
    </div>
  );
}