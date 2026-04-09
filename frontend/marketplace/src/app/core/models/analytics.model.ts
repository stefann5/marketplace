export interface RevenueSummary {
  totalRevenue: number;
  todayRevenue: number;
  weekRevenue: number;
  monthRevenue: number;
  yearRevenue: number;
  monthOverMonthChange: number;
}

export interface RevenueChart {
  labels: string[];
  values: number[];
}

export interface OrderSummary {
  totalOrders: number;
  fulfilledOrders: number;
  unfulfilledOrders: number;
  trendLabels: string[];
  trendValues: number[];
}

export interface TopProduct {
  productId: string;
  unitsSold: number;
  revenue: number;
}

export interface ProductView {
  productId: string;
  productName: string;
  viewCount: number;
}

export interface SearchTerm {
  term: string;
  count: number;
}

export interface TopCategory {
  categoryId: number;
  totalUnitsSold: number;
  totalRevenue: number;
}
