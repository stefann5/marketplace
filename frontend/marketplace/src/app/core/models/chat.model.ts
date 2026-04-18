export interface ChatProductSummary {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  price: number;
  stock: number;
  categoryId: number | null;
  imageUrls: string[];
  averageRating: number;
  reviewCount: number;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  productIds: string[];
  createdAt: string;
}

export interface ChatSessionSummary {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatSessionDetail extends ChatSessionSummary {
  messages: ChatMessage[];
}

export interface SendMessageResponse {
  sessionId: string;
  message: string;
  products: ChatProductSummary[];
}
