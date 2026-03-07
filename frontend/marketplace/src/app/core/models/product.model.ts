export interface Product {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  categoryId: string | null;
  imageUrls: string[];
  averageRating: number;
  reviewCount: number;
  purchaseCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProductRequest {
  name: string;
  description: string;
  price: number;
  stock: number;
  categoryId?: string;
}

export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}
