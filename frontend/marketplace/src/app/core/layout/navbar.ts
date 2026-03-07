import { Component, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DrawerModule } from 'primeng/drawer';
import { TreeModule } from 'primeng/tree';
import { InputTextModule } from 'primeng/inputtext';
import { TreeNode } from 'primeng/api';
import { AuthService } from '../services/auth.service';
import { CategoryService } from '../services/category.service';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterLink,
    ButtonModule, DrawerModule, TreeModule, InputTextModule, InputIconModule, IconFieldModule
  ],
  templateUrl: './navbar.html'
})
export class NavbarComponent implements OnInit {
  drawerVisible = false;
  categoryNodes: TreeNode[] = [];
  searchQuery = '';

  constructor(
    public authService: AuthService,
    private categoryService: CategoryService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.categoryService.getTreeNodes().subscribe(nodes => {
      this.categoryNodes = nodes;
    });
  }

  toggleDrawer(): void {
    this.drawerVisible = !this.drawerVisible;
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }

  logout(): void {
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
}
