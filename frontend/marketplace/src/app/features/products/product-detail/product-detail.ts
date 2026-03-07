import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { ProductService } from '../../../core/services/product.service';
import { Product } from '../../../core/models/product.model';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [CommonModule, ButtonModule, TagModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './product-detail.html'
})
export class ProductDetailComponent implements OnInit {
  product: Product | null = null;
  selectedImageIndex = 0;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private productService: ProductService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.productService.getById(id).subscribe({
        next: p => {
          this.product = p;
          this.cdr.markForCheck();
        },
        error: () => this.router.navigate(['/products'])
      });
    }
  }

  goBack(): void {
    this.router.navigate(['/products']);
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
