import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { MessageModule } from 'primeng/message';
import { CartService } from '../../core/services/cart.service';
import { OrderService } from '../../core/services/order.service';
import { ProductService } from '../../core/services/product.service';
import { SellerService } from '../../core/services/seller.service';
import { Cart, CartItem } from '../../core/models/cart.model';
import { Product } from '../../core/models/product.model';
import { SellerProfile } from '../../core/models/seller.model';

interface SellerGroup {
  tenantId: string;
  sellerName: string;
  sellerSlug: string | null;
  items: CartItem[];
  subtotal: number;
}

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ButtonModule, InputNumberModule, MessageModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cart.html'
})
export class CartComponent implements OnInit {
  cart: Cart | null = null;
  productMap: Record<string, Product> = {};
  sellerMap = new Map<string, SellerProfile>();
  sellerGroups: SellerGroup[] = [];
  loading = false;
  checkoutLoading = false;
  errorMessage = '';
  returnUrl: string | null = null;

  constructor(
    private cartService: CartService,
    private orderService: OrderService,
    private productService: ProductService,
    private sellerService: SellerService,
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    this.sellerService.getTenantMap().subscribe(map => {
      this.sellerMap = map;
      this.rebuildSellerGroups();
      this.cdr.markForCheck();
    });
    this.loadCart();
  }

  private rebuildSellerGroups(): void {
    if (!this.cart) {
      this.sellerGroups = [];
      return;
    }
    const groups = new Map<string, SellerGroup>();
    for (const item of this.cart.items) {
      let group = groups.get(item.tenantId);
      if (!group) {
        const seller = this.sellerMap.get(item.tenantId);
        group = {
          tenantId: item.tenantId,
          sellerName: seller?.companyName ?? 'Unknown seller',
          sellerSlug: seller?.slug ?? null,
          items: [],
          subtotal: 0
        };
        groups.set(item.tenantId, group);
      }
      group.items.push(item);
      group.subtotal += item.unitPrice * item.quantity;
    }
    this.sellerGroups = Array.from(groups.values())
      .sort((a, b) => a.sellerName.localeCompare(b.sellerName));
  }

  continueShopping(): void {
    if (this.returnUrl) {
      this.router.navigateByUrl(this.returnUrl);
    } else {
      this.router.navigate(['/']);
    }
  }

  loadCart(): void {
    this.loading = true;
    this.cartService.getCart().subscribe({
      next: cart => {
        this.cart = cart;
        this.rebuildSellerGroups();
        this.loadProductDetails(cart);
      },
      error: () => {
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  private loadProductDetails(cart: Cart): void {
    const newIds = cart.items
      .map(i => i.productId)
      .filter(id => !this.productMap[id]);
    if (newIds.length === 0) {
      this.loading = false;
      this.cdr.markForCheck();
      return;
    }
    forkJoin(newIds.map(id => this.productService.getById(id))).subscribe({
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

  updateQuantity(item: CartItem, quantity: number | null): void {
    if (!quantity || quantity < 1) {
      this.removeItem(item);
      return;
    }
    this.cartService.updateItem(item.id, { quantity }).subscribe({
      next: cart => {
        this.cart = cart;
        this.rebuildSellerGroups();
        this.cdr.markForCheck();
      }
    });
  }

  removeItem(item: CartItem): void {
    this.cartService.removeItem(item.id).subscribe({
      next: cart => {
        this.cart = cart;
        this.rebuildSellerGroups();
        this.cdr.markForCheck();
      }
    });
  }

  getTotal(): number {
    if (!this.cart) return 0;
    return this.cart.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  }

  checkout(): void {
    this.checkoutLoading = true;
    this.errorMessage = '';
    this.orderService.checkout().subscribe({
      next: () => {
        this.checkoutLoading = false;
        this.cartService.clearCount();
        this.router.navigate(['/orders']);
      },
      error: err => {
        this.checkoutLoading = false;
        if (err.status === 409) {
          this.errorMessage = 'Some items have insufficient stock. Please review your cart and try again.';
        } else if (err.status === 400) {
          this.errorMessage = 'Your cart is empty.';
        } else {
          this.errorMessage = 'Checkout failed. Please try again.';
        }
        this.loadCart();
        this.cdr.markForCheck();
      }
    });
  }
}
