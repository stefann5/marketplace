import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { InputNumberModule } from 'primeng/inputnumber';
import { ProductService } from '../../../core/services/product.service';
import { CartService } from '../../../core/services/cart.service';
import { AuthService } from '../../../core/services/auth.service';
import { Product } from '../../../core/models/product.model';
import { Cart } from '../../../core/models/cart.model';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule, TagModule, InputNumberModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './product-detail.html'
})
export class ProductDetailComponent implements OnInit, OnDestroy {
  product: Product | null = null;
  selectedImageIndex = 0;
  addingToCart = false;
  cart: Cart | null = null;
  private cartSub?: Subscription;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private productService: ProductService,
    private cartService: CartService,
    public authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.cartSub = this.cartService.cartState$.subscribe(cart => {
      this.cart = cart;
      this.cdr.markForCheck();
    });
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.productService.getById(id).subscribe({
        next: p => {
          this.product = p;
          this.cdr.markForCheck();
        },
        error: () => this.router.navigate(['/products'])
      });
    }
  }

  goBack(): void {
    this.router.navigate(['/products']);
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

  addToCart(): void {
    if (!this.product || this.addingToCart) return;
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }
    this.addingToCart = true;
    this.cartService.addItem({
      productId: this.product.id,
      tenantId: this.product.tenantId,
      quantity: 1,
      unitPrice: this.product.price
    }).subscribe({
      next: () => {
        this.addingToCart = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.addingToCart = false;
        this.cdr.markForCheck();
      }
    });
  }

  getCartQuantity(): number {
    if (!this.product) return 0;
    return this.cart?.items.find(i => i.productId === this.product!.id)?.quantity ?? 0;
  }

  changeQuantity(delta: number): void {
    if (!this.product) return;
    const item = this.cart?.items.find(i => i.productId === this.product!.id);
    if (!item) return;
    const newQty = item.quantity + delta;
    if (newQty < 1) {
      this.cartService.removeItem(item.id).subscribe();
    } else {
      this.cartService.updateItem(item.id, { quantity: newQty }).subscribe();
    }
  }

  onManualQuantity(value: number | null): void {
    if (!this.product || value == null) return;
    const item = this.cart?.items.find(i => i.productId === this.product!.id);
    if (!item) return;
    if (value < 1) {
      this.cartService.removeItem(item.id).subscribe();
    } else {
      this.cartService.updateItem(item.id, { quantity: value }).subscribe();
    }
  }

  ngOnDestroy(): void {
    this.cartSub?.unsubscribe();
  }
}
