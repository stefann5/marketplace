import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { SelectButtonModule } from 'primeng/selectbutton';
import { PaginatorModule } from 'primeng/paginator';
import { OrderService } from '../../../core/services/order.service';
import { ProductService } from '../../../core/services/product.service';
import { Order } from '../../../core/models/order.model';
import { Product } from '../../../core/models/product.model';

@Component({
  selector: 'app-seller-orders',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule, TagModule, SelectButtonModule, PaginatorModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './seller-orders.html'
})
export class SellerOrdersComponent implements OnInit {
  orders: Order[] = [];
  productMap: Record<string, Product> = {};
  loading = false;
  statusFilter: string = 'ALL';
  statusOptions = [
    { label: 'All', value: 'ALL' },
    { label: 'Purchased', value: 'PURCHASED' },
    { label: 'Fulfilled', value: 'FULFILLED' }
  ];

  page = 0;
  pageSize = 10;
  totalRecords = 0;

  constructor(
    private orderService: OrderService,
    private productService: ProductService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadOrders();
  }

  onStatusChange(): void {
    this.page = 0;
    this.loadOrders();
  }

  onPageChange(event: any): void {
    this.page = event.page;
    this.pageSize = event.rows;
    this.loadOrders();
  }

  loadOrders(): void {
    this.loading = true;
    const status = this.statusFilter === 'ALL' ? undefined : this.statusFilter;
    this.orderService.getSellerOrders(status, this.page, this.pageSize).subscribe({
      next: pageResult => {
        this.orders = pageResult.content;
        this.totalRecords = pageResult.totalElements;
        this.loadProductDetails(pageResult.content);
      },
      error: () => {
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  private loadProductDetails(orders: Order[]): void {
    const ids = [...new Set(orders.flatMap(o => o.items.map(i => i.productId)))]
      .filter(id => !this.productMap[id]);
    if (ids.length === 0) {
      this.loading = false;
      this.cdr.markForCheck();
      return;
    }
    forkJoin(ids.map(id =>
      this.productService.getById(id).pipe(catchError(() => of(null)))
    )).subscribe({
      next: products => {
        products.forEach(p => { if (p) this.productMap[p.id] = p; });
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  fulfillOrder(order: Order): void {
    this.orderService.fulfillOrder(order.id).subscribe({
      next: updated => {
        const idx = this.orders.findIndex(o => o.id === updated.id);
        if (idx !== -1) this.orders[idx] = updated;
        this.cdr.markForCheck();
      }
    });
  }

  getStatusSeverity(status: string): 'info' | 'success' {
    return status === 'FULFILLED' ? 'success' : 'info';
  }
}
