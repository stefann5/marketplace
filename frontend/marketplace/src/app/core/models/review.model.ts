export interface Review {
  id: string;
  productId: string;
  userId: string;
  buyerName: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewRequest {
  rating: number;
  comment?: string;
}
