import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ProductSearchComponent } from '../../products/product-search/product-search';
import { SellerService } from '../../../core/services/seller.service';

@Component({
  selector: 'app-seller-search',
  standalone: true,
  imports: [CommonModule, ProductSearchComponent],
  templateUrl: './seller-search.html'
})
export class SellerSearchComponent implements OnInit {
  slug = '';
  tenantId: string | undefined;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private sellerService: SellerService
  ) {}

  ngOnInit(): void {
    const slug = this.route.parent?.snapshot.paramMap.get('slug') || this.route.snapshot.paramMap.get('slug');
    if (!slug) {
      this.router.navigate(['/products/search']);
      return;
    }

    this.slug = slug;
    const routeTenantId = this.route.snapshot.queryParamMap.get('tenantId');
    if (routeTenantId) {
      this.tenantId = routeTenantId;
      return;
    }

    this.sellerService.getBySlug(slug).subscribe({
      next: (seller) => {
        this.tenantId = seller.tenantId;
      },
      error: () => {
        this.router.navigate(['/products/search']);
      }
    });
  }
}