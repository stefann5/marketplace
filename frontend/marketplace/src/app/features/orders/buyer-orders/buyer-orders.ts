import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { OrderService } from '../../../core/services/order.service';
import { ProductService } from '../../../core/services/product.service';
import { Order } from '../../../core/models/order.model';
import { Product } from '../../../core/models/product.model';

@Component({
  selector: 'app-buyer-orders',
  standalone: true,
  imports: [CommonModule, ButtonModule, TagModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './buyer-orders.html'
})
export class BuyerOrdersComponent implements OnInit {
  orders: Order[] = [];
  productMap: Record<string, Product> = {};
  loading = false;

  constructor(
    private orderService: OrderService,
    private productService: ProductService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loading = true;
    this.orderService.getBuyerOrders().subscribe({
      next: orders => {
        this.orders = orders;
        this.loadProductDetails(orders);
      },
      error: () => {
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  private loadProductDetails(orders: Order[]): void {
    const ids = [...new Set(orders.flatMap(o => o.items.map(i => i.productId)))];
    if (ids.length === 0) {
      this.loading = false;
      this.cdr.markForCheck();
      return;
    }
    forkJoin(ids.map(id => this.productService.getById(id))).subscribe({
      next: products => {
        products.forEach(p => this.productMap[p.id] = p);
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
