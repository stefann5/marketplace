import { Component, OnInit, OnDestroy } from '@angular/core';
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
  drawerVisible = false;
  categoryNodes: TreeNode[] = [];
  searchQuery = '';
  cartItemCount = 0;
  private cartSub?: Subscription;

  constructor(
    public authService: AuthService,
    private categoryService: CategoryService,
    private cartService: CartService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.categoryService.getTreeNodes().subscribe(nodes => {
      this.categoryNodes = this.makeAllSelectable(nodes);
    });
    this.cartSub = this.cartService.itemCount$.subscribe(count => {
      this.cartItemCount = count;
    });
    if (this.authService.isLoggedIn() && this.authService.getUserRole() === 'BUYER') {
      this.cartService.refreshCount();
    }
  }

  ngOnDestroy(): void {
    this.cartSub?.unsubscribe();
  }

  toggleDrawer(): void {
    this.drawerVisible = !this.drawerVisible;
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }

  logout(): void {
    this.cartService.clearCount();
    this.authService.logout();
  }

  goHome(): void {
    this.router.navigate(['/products']);
  }

  onSearch(): void {
    if (this.searchQuery.trim()) {
      this.router.navigate(['/products/search'], { queryParams: { name: this.searchQuery.trim() } });
    }
  }

  onCategorySelect(event: any): void {
    this.drawerVisible = false;
    this.router.navigate(['/products/search'], { queryParams: { categoryId: event.node.data } });
  }

  private makeAllSelectable(nodes: TreeNode[]): TreeNode[] {
    return nodes.map(node => ({
      ...node,
      selectable: true,
      children: node.children ? this.makeAllSelectable(node.children) : undefined
    }));
  }
}
