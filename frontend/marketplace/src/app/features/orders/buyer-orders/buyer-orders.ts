import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { PaginatorModule } from 'primeng/paginator';
import { OrderService } from '../../../core/services/order.service';
import { ProductService } from '../../../core/services/product.service';
import { Order } from '../../../core/models/order.model';
import { Product } from '../../../core/models/product.model';

@Component({
  selector: 'app-buyer-orders',
  standalone: true,
  imports: [CommonModule, ButtonModule, TagModule, PaginatorModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './buyer-orders.html'
})
export class BuyerOrdersComponent implements OnInit {
  orders: Order[] = [];
  productMap: Record<string, Product> = {};
  loading = false;

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

  loadOrders(): void {
    this.loading = true;
    this.orderService.getBuyerOrders(this.page, this.pageSize).subscribe({
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

  onPageChange(event: any): void {
    this.page = event.page;
    this.pageSize = event.rows;
    this.loadOrders();
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

  getStatusSeverity(status: string): 'info' | 'success' {
    return status === 'FULFILLED' ? 'success' : 'info';
  }
}
