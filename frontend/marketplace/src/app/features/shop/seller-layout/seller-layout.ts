import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterOutlet } from '@angular/router';
import { NavbarComponent } from '../../../core/layout/navbar';
import { SellerService } from '../../../core/services/seller.service';
import { ThemeService } from '../../../core/services/theme.service';

@Component({
  selector: 'app-seller-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, NavbarComponent],
  templateUrl: './seller-layout.html'
})
export class SellerLayoutComponent implements OnInit, OnDestroy {
  slug = '';
  tenantId: string | undefined;
  companyName: string | undefined;
  loading = true;
  private destroyed = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private sellerService: SellerService,
    private themeService: ThemeService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const slug = this.route.snapshot.paramMap.get('slug');
    if (!slug) {
      this.router.navigate(['/products']);
      return;
    }

    this.slug = slug;
    this.sellerService.getBySlug(slug).subscribe({
      next: (seller) => {
        this.themeService
          .applySellerTheme(seller.theme?.preset, seller.theme?.primaryColor)
          .finally(() => {
            setTimeout(() => {
              if (this.destroyed) return;
              this.tenantId = seller.tenantId;
              this.companyName = seller.companyName;
              this.loading = false;
              this.cdr.markForCheck();
            }, 0);
          });
      },
      error: () => {
        this.router.navigate(['/products']);
      }
    });
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.themeService.restoreDefaultTheme();
  }
}