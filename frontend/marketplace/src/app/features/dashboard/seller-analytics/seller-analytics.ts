import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule, CurrencyPipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ChartModule } from 'primeng/chart';
import { TableModule } from 'primeng/table';
import { CardModule } from 'primeng/card';
import { SelectButtonModule } from 'primeng/selectbutton';
import { TagModule } from 'primeng/tag';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { AnalyticsService } from '../../../core/services/analytics.service';
import { ProductService } from '../../../core/services/product.service';
import {
  RevenueSummary,
  OrderSummary,
  TopProduct,
  ProductView,
  SearchTerm
} from '../../../core/models/analytics.model';

@Component({
  selector: 'app-seller-analytics',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ChartModule, TableModule,
    CardModule, SelectButtonModule, TagModule, ProgressSpinnerModule,
    CurrencyPipe, DecimalPipe
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './seller-analytics.html'
})
export class SellerAnalyticsComponent implements OnInit {
  revenueSummary: RevenueSummary | null = null;
  revenueChartData: any = null;
  revenueChartOptions: any = null;
  orderSummary: OrderSummary | null = null;
  orderChartData: any = null;
  orderChartOptions: any = null;
  topProducts: TopProduct[] = [];
  productViews: ProductView[] = [];
  searchTerms: SearchTerm[] = [];
  loading = true;

  chartPeriod = 'month';
  orderChartPeriod = 'year';
  periodOptions = [
    { label: '7 Days', value: 'week' },
    { label: '30 Days', value: 'month' },
    { label: '12 Months', value: 'year' },
    { label: 'All', value: 'all' }
  ];

  productSortBy = 'revenue';
  productSortOptions = [
    { label: 'Revenue', value: 'revenue' },
    { label: 'Units', value: 'units' }
  ];

  constructor(
    private analyticsService: AnalyticsService,
    private productService: ProductService,
    private cdr: ChangeDetectorRef
  ) {
    this.revenueChartOptions = {
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true } }
    };
    this.orderChartOptions = {
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
    };
  }

  ngOnInit(): void {
    this.loadAll();
  }

  loadAll(): void {
    forkJoin({
      revenue: this.analyticsService.getRevenueSummary(),
      revenueChart: this.analyticsService.getRevenueChart(this.chartPeriod),
      orders: this.analyticsService.getOrderSummary(this.orderChartPeriod),
      topProducts: this.analyticsService.getTopProducts(this.productSortBy),
      views: this.analyticsService.getProductViews(),
      terms: this.analyticsService.getSearchTerms()
    }).subscribe({
      next: (data) => {
        this.revenueSummary = data.revenue;
        this.revenueChartData = {
          labels: data.revenueChart.labels,
          datasets: [{
            label: 'Revenue',
            data: data.revenueChart.values,
            fill: false,
            borderColor: 'var(--p-primary-500)',
            tension: 0.4
          }]
        };
        this.orderSummary = data.orders;
        this.updateOrderChartData(data.orders);
        this.setTopProducts(data.topProducts);
        this.productViews = data.views;
        this.searchTerms = data.terms;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  private updateOrderChartData(summary: OrderSummary): void {
    this.orderChartData = {
      labels: summary.trendLabels,
      datasets: [{
        label: 'Orders',
        data: summary.trendValues,
        backgroundColor: 'var(--p-primary-400)'
      }]
    };
  }

  private setTopProducts(products: TopProduct[]): void {
    this.topProducts = products;
    const missing = products.filter(p => !p.productName).map(p => p.productId);
    if (missing.length === 0) return;
    forkJoin(missing.map(id =>
      this.productService.getById(id).pipe(catchError(() => of(null)))
    )).subscribe(results => {
      results.forEach((product, idx) => {
        if (!product) return;
        const target = this.topProducts.find(p => p.productId === missing[idx]);
        if (target) target.productName = product.name;
      });
      this.topProducts = [...this.topProducts];
      this.cdr.markForCheck();
    });
  }

  onPeriodChange(): void {
    this.analyticsService.getRevenueChart(this.chartPeriod).subscribe({
      next: chart => {
        this.revenueChartData = {
          labels: chart.labels,
          datasets: [{
            label: 'Revenue',
            data: chart.values,
            fill: false,
            borderColor: 'var(--p-primary-500)',
            tension: 0.4
          }]
        };
        this.cdr.markForCheck();
      }
    });
  }

  onOrderPeriodChange(): void {
    this.analyticsService.getOrderSummary(this.orderChartPeriod).subscribe({
      next: summary => {
        this.orderSummary = summary;
        this.updateOrderChartData(summary);
        this.cdr.markForCheck();
      }
    });
  }

  onProductSortChange(): void {
    this.analyticsService.getTopProducts(this.productSortBy).subscribe({
      next: products => {
        this.setTopProducts(products);
        this.cdr.markForCheck();
      }
    });
  }
}
