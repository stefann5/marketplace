import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin, Subscription } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { InputNumberModule } from 'primeng/inputnumber';
import { SkeletonModule } from 'primeng/skeleton';
import { TabsModule } from 'primeng/tabs';
import { AnalyticsService } from '../../core/services/analytics.service';
import { ProductService } from '../../core/services/product.service';
import { CategoryService } from '../../core/services/category.service';
import { CartService } from '../../core/services/cart.service';
import { AuthService } from '../../core/services/auth.service';
import { SellerService } from '../../core/services/seller.service';
import { Product } from '../../core/models/product.model';
import { Cart } from '../../core/models/cart.model';
import { SellerProfile } from '../../core/models/seller.model';

interface CategoryRow {
  categoryId: number;
  categoryName: string;
  products: Product[];
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule, TagModule, InputNumberModule, SkeletonModule, TabsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './home.html'
})
export class HomeComponent implements OnInit, OnDestroy {
  categoryRows: CategoryRow[] = [];
  loading = true;
  cart: Cart | null = null;

  sellers: SellerProfile[] = [];
  sellersLoading = true;
  logoErrors = new Set<string>();

  private cartSub?: Subscription;

  constructor(
    private analyticsService: AnalyticsService,
    private productService: ProductService,
    private categoryService: CategoryService,
    private cartService: CartService,
    private authService: AuthService,
    private sellerService: SellerService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const role = this.authService.getUserRole();
    if (role === 'SELLER') {
      this.router.navigate(['/dashboard/products']);
      return;
    }
    if (role === 'ADMIN') {
      this.router.navigate(['/admin/sellers']);
      return;
    }

    this.cartSub = this.cartService.cartState$.subscribe(cart => {
      this.cart = cart;
      this.cdr.markForCheck();
    });

    this.loadCategories();
    this.loadSellers();
  }

  ngOnDestroy(): void {
    this.cartSub?.unsubscribe();
  }

  private loadCategories(): void {
    forkJoin({
      topCategories: this.analyticsService.getTopCategories(5),
      categoryMap: this.categoryService.getCategoryMap()
    }).subscribe(({ topCategories, categoryMap }) => {
      if (topCategories.length === 0) {
        this.loading = false;
        this.cdr.markForCheck();
        return;
      }

      const productRequests = topCategories.map(tc =>
        this.productService.search({
          categoryId: tc.categoryId,
          sortBy: 'rating',
          sortDirection: 'desc',
          page: 0,
          size: 6
        })
      );

      forkJoin(productRequests).subscribe(pages => {
        this.categoryRows = topCategories
          .map((tc, i) => ({
            categoryId: tc.categoryId,
            categoryName: categoryMap.get(tc.categoryId) ?? `Category ${tc.categoryId}`,
            products: pages[i].content
          }))
          .filter(row => row.products.length > 0);
        this.loading = false;
        this.cdr.markForCheck();
      });
    });
  }

  private loadSellers(): void {
    this.sellerService.getAll().subscribe({
      next: (sellers) => {
        this.sellers = sellers;
        this.sellersLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.sellersLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  visitShop(seller: SellerProfile): void {
    this.router.navigate(['/shop', seller.slug]);
  }

  onLogoError(sellerId: string): void {
    this.logoErrors.add(sellerId);
  }

  hasLogoError(sellerId: string): boolean {
    return this.logoErrors.has(sellerId);
  }

  viewProduct(id: string): void {
    this.router.navigate(['/products', id]);
  }

  seeMore(categoryId: number): void {
    this.router.navigate(['/products/search'], { queryParams: { categoryId } });
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
      unitPrice: product.price,
      categoryId: product.categoryId
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
}
