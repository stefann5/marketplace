import { Component, Input, OnInit, OnDestroy } from '@angular/core';
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
  templateUrl: './navbar.html'
})
export class NavbarComponent implements OnInit, OnDestroy {
  @Input() tenantId: string | undefined;

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
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loggedIn = this.authService.isLoggedIn();
    this.userRole = this.authService.getUserRole();

    this.categoryService.getTreeNodes().subscribe(nodes => {
      this.categoryNodes = this.makeAllSelectable(nodes);
    });
    this.cartSub = this.cartService.itemCount$.subscribe(count => {
      this.cartItemCount = count;
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

  logout(): void {
    this.cartService.clearCount();
    this.loggedIn = false;
    this.userRole = null;
    this.authService.logout();
  }

  goHome(): void {
    this.router.navigate(['/products']);
  }

  onSearch(): void {
    if (this.searchQuery.trim()) {
      const queryParams: any = { name: this.searchQuery.trim() };
      if (this.tenantId) queryParams.tenantId = this.tenantId;
      this.router.navigate(['/products/search'], { queryParams });
    }
  }

  onCategorySelect(event: any): void {
    this.drawerVisible = false;
    const queryParams: any = { categoryId: event.node.data };
    if (this.tenantId) queryParams.tenantId = this.tenantId;
    this.router.navigate(['/products/search'], { queryParams });
  }

  private makeAllSelectable(nodes: TreeNode[]): TreeNode[] {
    return nodes.map(node => ({
      ...node,
      selectable: true,
      children: node.children ? this.makeAllSelectable(node.children) : undefined
    }));
  }
}
