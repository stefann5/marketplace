import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { DataViewModule } from 'primeng/dataview';
import { SelectButtonModule } from 'primeng/selectbutton';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { InputNumberModule } from 'primeng/inputnumber';
import { ProductService } from '../../../core/services/product.service';
import { CategoryService } from '../../../core/services/category.service';
import { CartService } from '../../../core/services/cart.service';
import { AuthService } from '../../../core/services/auth.service';
import { Product } from '../../../core/models/product.model';
import { Cart } from '../../../core/models/cart.model';

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [CommonModule, FormsModule, DataViewModule, SelectButtonModule, ButtonModule, TagModule, InputNumberModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './product-list.html'
})
export class ProductListComponent implements OnInit, OnDestroy {
  products: Product[] = [];
  totalRecords = 0;
  rows = 12;
  first = 0;
  layout: 'list' | 'grid' = 'grid';
  layoutOptions: string[] = ['list', 'grid'];
  categoryMap = new Map<number, string>();
  cart: Cart | null = null;
  private cartSub?: Subscription;

  constructor(
    private productService: ProductService,
    private categoryService: CategoryService,
    private cartService: CartService,
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.categoryService.getCategoryMap().subscribe(map => {
      this.categoryMap = map;
      this.cdr.markForCheck();
    });
    this.cartSub = this.cartService.cartState$.subscribe(cart => {
      this.cart = cart;
      this.cdr.markForCheck();
    });
    this.loadProducts(0);
  }

  ngOnDestroy(): void {
    this.cartSub?.unsubscribe();
  }

  loadProducts(page: number): void {
    this.productService.getAll(page, this.rows).subscribe(res => {
      this.products = res.content;
      this.totalRecords = res.totalElements;
      this.cdr.markForCheck();
    });
  }

  onPageChange(event: any): void {
    this.first = event.first;
    this.loadProducts(event.first / this.rows);
  }

  viewProduct(id: string): void {
    this.router.navigate(['/products', id]);
  }

  getCategoryName(categoryId: number | null): string {
    if (categoryId === null) return '';
    return this.categoryMap.get(categoryId) ?? '';
  }

  getStockSeverity(stock: number): 'success' | 'warn' | 'danger' {
    if (stock > 10) return 'success';
    if (stock > 0) return 'warn';
    return 'danger';
  }

  getStockLabel(stock: number): string {
    if (stock > 10) return 'In Stock';
    if (stock > 0) return 'Low Stock';
    return 'Out of Stock';
  }

  addToCart(event: Event, product: Product): void {
    event.stopPropagation();
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }
    this.cartService.addItem({
      productId: product.id,
      tenantId: product.tenantId,
      quantity: 1,
      unitPrice: product.price
    }).subscribe();
  }

  getCartQuantity(productId: string): number {
    return this.cart?.items.find(i => i.productId === productId)?.quantity ?? 0;
  }

  changeQuantity(event: Event, product: Product, delta: number): void {
    event.stopPropagation();
    const item = this.cart?.items.find(i => i.productId === product.id);
    if (!item) return;
    const newQty = item.quantity + delta;
    if (newQty < 1) {
      this.cartService.removeItem(item.id).subscribe();
    } else {
      this.cartService.updateItem(item.id, { quantity: newQty }).subscribe();
    }
  }

  onManualQuantity(event: any, product: Product, value: any): void {
    event?.originalEvent?.stopPropagation();
    const item = this.cart?.items.find(i => i.productId === product.id);
    if (!item || value == null) return;
    if (value < 1) {
      this.cartService.removeItem(item.id).subscribe();
    } else {
      this.cartService.updateItem(item.id, { quantity: value }).subscribe();
    }
  }

  isBuyer(): boolean {
    return this.authService.getUserRole() !== 'SELLER';
  }
}
