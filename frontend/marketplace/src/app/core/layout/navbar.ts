import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnInit, OnDestroy } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DrawerModule } from 'primeng/drawer';
import { TreeModule } from 'primeng/tree';
import { InputTextModule } from 'primeng/inputtext';
import { BadgeModule } from 'primeng/badge';
import { TreeNode } from 'primeng/api';
import { Subscription } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { CategoryService } from '../services/category.service';
import { CartService } from '../services/cart.service';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterLink,
    ButtonModule, DrawerModule, TreeModule, InputTextModule, InputIconModule, IconFieldModule, BadgeModule
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './navbar.html'
})
export class NavbarComponent implements OnInit, OnDestroy {
  @Input() tenantId: string | undefined;
  @Input() sellerSlug: string | undefined;
  @Input() brandLabel: string | undefined;

  drawerVisible = false;
  categoryNodes: TreeNode[] = [];
  searchQuery = '';
  cartItemCount = 0;
  loggedIn = false;
  userRole: string | null = null;
  private cartSub?: Subscription;

  constructor(
    public authService: AuthService,
    private categoryService: CategoryService,
    private cartService: CartService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loggedIn = this.authService.isLoggedIn();
    this.userRole = this.authService.getUserRole();

    this.categoryService.getTreeNodes().subscribe(nodes => {
      setTimeout(() => {
        this.categoryNodes = this.makeAllSelectable(nodes);
        this.cdr.markForCheck();
      }, 0);
    });
    this.cartSub = this.cartService.itemCount$.subscribe(count => {
      setTimeout(() => {
        this.cartItemCount = count;
        this.cdr.markForCheck();
      }, 0);
    });
    if (this.loggedIn && this.userRole === 'BUYER') {
      this.cartService.refreshCount();
    }
  }

  ngOnDestroy(): void {
    this.cartSub?.unsubscribe();
  }

  toggleDrawer(): void {
    this.drawerVisible = !this.drawerVisible;
  }

  onDrawerVisibleChange(visible: boolean): void {
    this.drawerVisible = visible;
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }

  goToCart(): void {
    const currentUrl = this.router.url;
    const queryParams = currentUrl.startsWith('/cart') ? {} : { returnUrl: currentUrl };
    this.router.navigate(['/cart'], { queryParams });
  }

  logout(): void {
    this.cartService.clearCount();
    this.loggedIn = false;
    this.userRole = null;
    this.authService.logout();
  }

  goHome(): void {
    const sellerSlug = this.resolveSellerSlug();
    if (sellerSlug) {
      this.router.navigate(['/shop', sellerSlug]);
      return;
    }
    this.router.navigate(['/']);
  }

  onSearch(): void {
    if (this.searchQuery.trim()) {
      const sellerSlug = this.resolveSellerSlug();
      const queryParams: any = { name: this.searchQuery.trim() };
      if (this.tenantId) queryParams.tenantId = this.tenantId;
      if (sellerSlug) {
        this.router.navigate(['/shop', sellerSlug, 'search'], { queryParams });
      } else {
        this.router.navigate(['/products/search'], { queryParams });
      }
    }
  }

  onCategorySelect(event: any): void {
    this.drawerVisible = false;
    const sellerSlug = this.resolveSellerSlug();
    const queryParams: any = { categoryId: event.node.data };
    if (this.tenantId) queryParams.tenantId = this.tenantId;
    if (sellerSlug) {
      this.router.navigate(['/shop', sellerSlug, 'search'], { queryParams });
    } else {
      this.router.navigate(['/products/search'], { queryParams });
    }
  }

  isInSellerShop(): boolean {
    return !!this.resolveSellerSlug();
  }

  goToMarketplace(): void {
    this.router.navigate(['/']);
  }

  private resolveSellerSlug(): string | undefined {
    if (this.sellerSlug) return this.sellerSlug;
    const match = this.router.url.match(/^\/shop\/([^/?#]+)/);
    return match ? decodeURIComponent(match[1]) : undefined;
  }

  private makeAllSelectable(nodes: TreeNode[]): TreeNode[] {
    return nodes.map(node => ({
      ...node,
      selectable: true,
      children: node.children ? this.makeAllSelectable(node.children) : undefined
    }));
  }
}
