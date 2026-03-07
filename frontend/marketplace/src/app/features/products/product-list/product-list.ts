import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataViewModule } from 'primeng/dataview';
import { SelectButtonModule } from 'primeng/selectbutton';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { ProductService } from '../../../core/services/product.service';
import { CategoryService } from '../../../core/services/category.service';
import { Product } from '../../../core/models/product.model';

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [CommonModule, FormsModule, DataViewModule, SelectButtonModule, ButtonModule, TagModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './product-list.html'
})
export class ProductListComponent implements OnInit {
  products: Product[] = [];
  totalRecords = 0;
  rows = 12;
  first = 0;
  layout: 'list' | 'grid' = 'grid';
  layoutOptions: string[] = ['list', 'grid'];
  categoryMap = new Map<number, string>();

  constructor(
    private productService: ProductService,
    private categoryService: CategoryService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.categoryService.getCategoryMap().subscribe(map => {
      this.categoryMap = map;
      this.cdr.markForCheck();
    });
    this.loadProducts(0);
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
}
