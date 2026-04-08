import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { SellerService } from '../../../core/services/seller.service';
import { SellerProfile } from '../../../core/models/seller.model';

@Component({
  selector: 'app-public-seller-list',
  standalone: true,
  imports: [CommonModule, ButtonModule],
  templateUrl: './seller-list.html'
})
export class PublicSellerListComponent implements OnInit {
  sellers: SellerProfile[] = [];
  loading = true;
  logoErrors = new Set<string>();

  constructor(
    private sellerService: SellerService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.sellerService.getAll().subscribe({
      next: (sellers) => {
        this.sellers = sellers;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  visitShop(seller: SellerProfile): void {
    this.router.navigate(['/shop', seller.slug]);
  }

  onLogoError(sellerId: string): void {
    this.logoErrors.add(sellerId);
  }

  hasLogoError(sellerId: string): boolean {
    return this.logoErrors.has(sellerId);
  }
}
