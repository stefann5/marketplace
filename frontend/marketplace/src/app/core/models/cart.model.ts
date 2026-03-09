export interface CartItem {
  id: string;
  productId: string;
  tenantId: string;
  quantity: number;
  unitPrice: number;
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
}

export interface UpdateCartItemRequest {
  quantity: number;
}
