import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { NavbarComponent } from '../../core/layout/navbar';
import { SellerService } from '../../core/services/seller.service';
import { ProductService } from '../../core/services/product.service';
import { SellerProfile } from '../../core/models/seller.model';
import { Product } from '../../core/models/product.model';
import { updatePrimaryPalette } from '@primeuix/themes';

@Component({
  selector: 'app-seller-shop',
  standalone: true,
  imports: [CommonModule, ButtonModule, CardModule, TagModule, NavbarComponent],
  templateUrl: './seller-shop.html'
})
export class SellerShopComponent implements OnInit, OnDestroy {
  seller: SellerProfile | null = null;
  products: Product[] = [];
  loading = true;
  private originalPreset = 'amber';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private sellerService: SellerService,
    private productService: ProductService
  ) {}

  ngOnInit(): void {
    const slug = this.route.snapshot.paramMap.get('slug')!;
    this.sellerService.getBySlug(slug).subscribe({
      next: (seller) => {
        this.seller = seller;
        if (seller.theme) {
          this.applyTheme(seller.theme.preset || 'amber');
        }
        this.loadProducts(seller.tenantId);
      },
      error: () => {
        this.loading = false;
        this.router.navigate(['/products']);
      }
    });
  }

  ngOnDestroy(): void {
    this.applyTheme(this.originalPreset);
  }

  private applyTheme(preset: string): void {
    updatePrimaryPalette({
      50: `{${preset}.50}`,
      100: `{${preset}.100}`,
      200: `{${preset}.200}`,
      300: `{${preset}.300}`,
      400: `{${preset}.400}`,
      500: `{${preset}.500}`,
      600: `{${preset}.600}`,
      700: `{${preset}.700}`,
      800: `{${preset}.800}`,
      900: `{${preset}.900}`,
      950: `{${preset}.950}`
    });
  }

  private loadProducts(tenantId: string): void {
    this.productService.search({ page: 0, size: 50 }).subscribe({
      next: (page) => {
        this.products = page.content.filter(p => p.tenantId === tenantId);
        this.loading = false;
      },
      error: () => this.loading = false
    });
  }

  viewProduct(product: Product): void {
    this.router.navigate(['/products', product.id]);
  }
}
