export interface CartItem {
  id: string;
  productId: string;
  tenantId: string;
  quantity: number;
  unitPrice: number;
  categoryId: number | null;
}

export interface Cart {
  id: string;
  userId: string;
  items: CartItem[];
  updatedAt: string;
}

export interface AddCartItemRequest {
  productId: string;
  tenantId: string;
  quantity: number;
  unitPrice: number;
  categoryId: number | null;
}

export interface UpdateCartItemRequest {
  quantity: number;
}
