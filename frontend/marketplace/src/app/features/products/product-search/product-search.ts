import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { DataViewModule } from 'primeng/dataview';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { SelectModule } from 'primeng/select';
import { SelectButtonModule } from 'primeng/selectbutton';
import { SliderModule } from 'primeng/slider';
import { TreeModule } from 'primeng/tree';
import { InputNumberModule } from 'primeng/inputnumber';
import { TreeNode } from 'primeng/api';
import { ProductService } from '../../../core/services/product.service';
import { CategoryService } from '../../../core/services/category.service';
import { CartService } from '../../../core/services/cart.service';
import { AuthService } from '../../../core/services/auth.service';
import { Product } from '../../../core/models/product.model';
import { Cart } from '../../../core/models/cart.model';

interface SortOption {
  label: string;
  value: string;
}

@Component({
  selector: 'app-product-search',
  standalone: true,
  imports: [
    CommonModule, FormsModule, DataViewModule, ButtonModule, TagModule,
    SelectModule, SelectButtonModule, SliderModule, TreeModule, InputNumberModule
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './product-search.html'
})
export class ProductSearchComponent implements OnInit, OnDestroy {
  @Input() forcedTenantId: string | undefined;
  @Input() sellerSlug: string | undefined;
  @Input() useSellerRoutes = false;

  products: Product[] = [];
  totalRecords = 0;
  rows = 20;
  page = 0;
  layout: 'list' | 'grid' = 'grid';
  layoutOptions: string[] = ['list', 'grid'];
  categoryMap = new Map<number, string>();
  cart: Cart | null = null;
  private cartSub?: Subscription;

  searchName = '';
  selectedCategoryNode: TreeNode | null = null;
  priceRange: [number, number] = [0, 10000];
  minRating: number | null = null;
  tenantId: string | undefined;

  sortOptions: SortOption[] = [
    { label: 'Rating (High to Low)', value: 'rating_desc' },
    { label: 'Rating (Low to High)', value: 'rating_asc' },
    { label: 'Price (Low to High)', value: 'price_asc' },
    { label: 'Price (High to Low)', value: 'price_desc' },
    { label: 'Newest First', value: 'date_desc' },
    { label: 'Oldest First', value: 'date_asc' }
  ];
  selectedSort: SortOption = this.sortOptions[0];

  categoryNodes: TreeNode[] = [];
  private pendingCategoryId: number | null = null;
  ratingOptions = [
    { label: 'Any', value: null },
    { label: '4+ Stars', value: 4 },
    { label: '3+ Stars', value: 3 },
    { label: '2+ Stars', value: 2 },
    { label: '1+ Stars', value: 1 }
  ];

  constructor(
    private productService: ProductService,
    private categoryService: CategoryService,
    private cartService: CartService,
    private authService: AuthService,
    private route: ActivatedRoute,
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
    this.route.queryParams.subscribe(params => {
      this.searchName = params['name'] ?? '';
      this.tenantId = params['tenantId'] ?? undefined;
      if (this.forcedTenantId) this.tenantId = this.forcedTenantId;

      if (params['categoryId']) {
        const catId = Number(params['categoryId']);
        this.pendingCategoryId = Number.isFinite(catId) ? catId : null;
      } else {
        this.pendingCategoryId = null;
        this.selectedCategoryNode = null;
      }

      if (this.pendingCategoryId !== null && this.categoryNodes.length > 0) {
        this.selectedCategoryNode = this.findNodeByKey(this.categoryNodes, String(this.pendingCategoryId));
      }

      this.page = 0;
      this.loadProducts();
      this.cdr.markForCheck();
    });

    this.categoryService.getTreeNodes().subscribe(nodes => {
      this.categoryNodes = this.makeAllSelectable(nodes);
      if (this.pendingCategoryId !== null) {
        this.selectedCategoryNode = this.findNodeByKey(this.categoryNodes, String(this.pendingCategoryId));
        this.page = 0;
        this.loadProducts();
      }
      this.cdr.markForCheck();
    });
  }

  loadProducts(): void {
    const [sortBy, sortDirection] = this.selectedSort.value.split('_');
    this.productService.search({
      name: this.searchName || undefined,
      categoryId: this.selectedCategoryNode?.data ?? undefined,
      minPrice: this.priceRange[0] > 0 ? this.priceRange[0] : undefined,
      maxPrice: this.priceRange[1] < 10000 ? this.priceRange[1] : undefined,
      minRating: this.minRating ?? undefined,
      tenantId: this.tenantId,
      sortBy,
      sortDirection,
      page: this.page,
      size: this.rows
    }).subscribe(res => {
      this.products = res.content;
      this.totalRecords = res.totalElements;
      this.cdr.markForCheck();
    });
  }

  onPageChange(event: any): void {
    this.page = event.first / this.rows;
    this.loadProducts();
  }

  onSortChange(): void {
    this.page = 0;
    this.loadProducts();
  }

  applyFilters(): void {
    this.page = 0;
    this.loadProducts();
  }

  clearFilters(): void {
    this.selectedCategoryNode = null;
    this.priceRange = [0, 10000];
    this.minRating = null;
    this.page = 0;
    this.loadProducts();
  }

  onCategorySelect(event: any): void {
    this.selectedCategoryNode = event.node;
    this.applyFilters();
  }

  onCategoryUnselect(): void {
    this.selectedCategoryNode = null;
    this.applyFilters();
  }

  viewProduct(id: string): void {
    if (this.useSellerRoutes && this.sellerSlug) {
      this.router.navigate(['/shop', this.sellerSlug, 'product', id], {
        queryParams: this.route.snapshot.queryParams
      });
      return;
    }
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

  get resultStart(): number {
    return this.totalRecords === 0 ? 0 : this.page * this.rows + 1;
  }

  get resultEnd(): number {
    return Math.min((this.page + 1) * this.rows, this.totalRecords);
  }

  private findNodeByKey(nodes: TreeNode[], key: string): TreeNode | null {
    for (const node of nodes) {
      if (node.key === key) return node;
      if (node.children) {
        const found = this.findNodeByKey(node.children, key);
        if (found) return found;
      }
    }
    return null;
  }

  private makeAllSelectable(nodes: TreeNode[]): TreeNode[] {
    return nodes.map(node => ({
      ...node,
      selectable: true,
      children: node.children ? this.makeAllSelectable(node.children) : undefined
    }));
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

  ngOnDestroy(): void {
    this.cartSub?.unsubscribe();
  }
}
