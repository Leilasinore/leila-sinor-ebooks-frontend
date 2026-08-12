export type Book = {
  id: number;
  title: string;
  author: string;
  price: number;
  stockQuantity: number;
  isbn: string;
  publicationYear: number;
};

export type PagedResponse<T> = {
  content: T[];
  totalPages: number;
  totalElements: number;
  number: number;
  size: number;
  first: boolean;
  last: boolean;
};

export type OrderItemRequest = {
  bookId: number;
  quantity: number;
};

export type CreateOrderRequest = {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  items: OrderItemRequest[];
};

export type OrderItemResponse = {
  id: number;
  quantity: number;
  priceAtPurchase: number;
  book: Book;
};

export type OrderResponse = {
  id: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  totalAmount: number;
  status: "PENDING" | "PAYMENT_PROCESSING" | "PAID" | "FAILED" | "CANCELLED";
  items: OrderItemResponse[];
  createdAt: string;
  updatedAt: string;
};

export type InitiatePaymentRequest = {
  orderId: number;
  phoneNumber: string;
};

export type PaymentResponse = {
  id: number;
  orderId: number;
  amount: number;
  phoneNumber: string;
  status: "INITIATED" | "SUCCESS" | "FAILED";
  mpesaReceiptNumber?: string;
  merchantRequestId?: string;
  checkoutRequestId?: string;
  resultCode?: string;
  resultDescription?: string;
  createdAt: string;
  updatedAt: string;
};