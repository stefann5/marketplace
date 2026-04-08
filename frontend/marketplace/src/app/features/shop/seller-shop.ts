import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { DataViewModule } from 'primeng/dataview';
import { SellerService } from '../../core/services/seller.service';
import { ProductService } from '../../core/services/product.service';
import { SellerProfile } from '../../core/models/seller.model';
import { Product } from '../../core/models/product.model';

@Component({
  selector: 'app-seller-shop',
  standalone: true,
  imports: [CommonModule, ButtonModule, TagModule, DataViewModule],
  templateUrl: './seller-shop.html'
})
export class SellerShopComponent implements OnInit {
  seller: SellerProfile | null = null;
  logoLoadFailed = false;
  products: Product[] = [];
  loading = true;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private sellerService: SellerService,
    private productService: ProductService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const slug = this.route.snapshot.paramMap.get('slug')!;
    this.sellerService.getBySlug(slug).subscribe({
      next: (seller) => {
        this.seller = seller;
        this.logoLoadFailed = false;
        this.loadProducts();
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.cdr.detectChanges();
        this.router.navigate(['/products']);
      }
    });
  }

  loadProducts(): void {
    if (!this.seller) return;
    this.productService.search({
      tenantId: this.seller.tenantId,
      page: 0,
      size: 100
    }).subscribe({
      next: (page) => {
        this.products = page.content;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  onLogoError(): void {
    this.logoLoadFailed = true;
  }

  viewProduct(product: Product): void {
    if (!this.seller) return;
    this.router.navigate(['/shop', this.seller.slug, 'product', product.id]);
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