import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { DataViewModule } from 'primeng/dataview';
import { NavbarComponent } from '../../core/layout/navbar';
import { SellerService } from '../../core/services/seller.service';
import { ProductService } from '../../core/services/product.service';
import { SellerProfile } from '../../core/models/seller.model';
import { Product } from '../../core/models/product.model';
import { updatePrimaryPalette, usePreset } from '@primeuix/themes';

@Component({
  selector: 'app-seller-shop',
  standalone: true,
  imports: [CommonModule, ButtonModule, TagModule, DataViewModule, NavbarComponent],
  templateUrl: './seller-shop.html'
})
export class SellerShopComponent implements OnInit, OnDestroy {
  seller: SellerProfile | null = null;
  navbarTenantId: string | undefined;
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
        this.navbarTenantId = seller.tenantId;
        this.logoLoadFailed = false;
        if (seller.theme) {
          this.applyTheme(seller.theme.preset || 'nora', seller.theme.primaryColor || 'amber');
        }
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

  ngOnDestroy(): void {
    this.restoreDefault();
  }

  private async applyTheme(preset: string, primaryColor: string): Promise<void> {
    let themePreset;
    switch (preset) {
      case 'aura':
        themePreset = (await import('@primeuix/themes/aura')).default;
        break;
      case 'material':
        themePreset = (await import('@primeuix/themes/material')).default;
        break;
      case 'lara':
        themePreset = (await import('@primeuix/themes/lara')).default;
        break;
      case 'nora':
      default:
        themePreset = (await import('@primeuix/themes/nora')).default;
        break;
    }
    usePreset(themePreset);
    updatePrimaryPalette({
      50: `{${primaryColor}.50}`,
      100: `{${primaryColor}.100}`,
      200: `{${primaryColor}.200}`,
      300: `{${primaryColor}.300}`,
      400: `{${primaryColor}.400}`,
      500: `{${primaryColor}.500}`,
      600: `{${primaryColor}.600}`,
      700: `{${primaryColor}.700}`,
      800: `{${primaryColor}.800}`,
      900: `{${primaryColor}.900}`,
      950: `{${primaryColor}.950}`
    });
  }

  private async restoreDefault(): Promise<void> {
    const nora = (await import('@primeuix/themes/nora')).default;
    usePreset(nora);
    updatePrimaryPalette({
      50: '{amber.50}', 100: '{amber.100}', 200: '{amber.200}',
      300: '{amber.300}', 400: '{amber.400}', 500: '{amber.500}',
      600: '{amber.600}', 700: '{amber.700}', 800: '{amber.800}',
      900: '{amber.900}', 950: '{amber.950}'
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
    this.router.navigate(['/products', product.id]);
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