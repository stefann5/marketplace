import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule, CurrencyPipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { ChartModule } from 'primeng/chart';
import { TableModule } from 'primeng/table';
import { CardModule } from 'primeng/card';
import { SelectButtonModule } from 'primeng/selectbutton';
import { TagModule } from 'primeng/tag';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { AnalyticsService } from '../../../core/services/analytics.service';
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
  periodOptions = [
    { label: '7 Days', value: 'week' },
    { label: '30 Days', value: 'month' },
    { label: '12 Months', value: 'year' }
  ];

  productSortBy = 'revenue';
  productSortOptions = [
    { label: 'Revenue', value: 'revenue' },
    { label: 'Units', value: 'units' }
  ];

  constructor(
    private analyticsService: AnalyticsService,
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
      orders: this.analyticsService.getOrderSummary(),
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
        this.orderChartData = {
          labels: data.orders.trendLabels,
          datasets: [{
            label: 'Orders',
            data: data.orders.trendValues,
            backgroundColor: 'var(--p-primary-400)'
          }]
        };
        this.topProducts = data.topProducts;
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

  onProductSortChange(): void {
    this.analyticsService.getTopProducts(this.productSortBy).subscribe({
      next: products => {
        this.topProducts = products;
        this.cdr.markForCheck();
      }
    });
  }
}
