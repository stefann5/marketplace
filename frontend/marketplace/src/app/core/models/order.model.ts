export interface OrderItem {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: number;
}

export interface Order {
  id: string;
  tenantId: string;
  status: 'PURCHASED' | 'FULFILLED';
  total: number;
  items: OrderItem[];
  createdAt: string;
}
