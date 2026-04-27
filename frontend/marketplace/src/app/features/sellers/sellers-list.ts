import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { SkeletonModule } from 'primeng/skeleton';
import { SellerService } from '../../core/services/seller.service';
import { SellerProfile } from '../../core/models/seller.model';

@Component({
  selector: 'app-sellers-list',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    ButtonModule, InputTextModule, IconFieldModule, InputIconModule, SkeletonModule
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './sellers-list.html'
})
export class SellersListComponent implements OnInit {
  sellers: SellerProfile[] = [];
  filteredSellers: SellerProfile[] = [];
  loading = true;
  searchQuery = '';
  logoErrors = new Set<string>();

  constructor(
    private sellerService: SellerService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.sellerService.getAllCached().subscribe({
      next: sellers => {
        this.sellers = sellers;
        this.applyFilter();
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  applyFilter(): void {
    const q = this.searchQuery.trim().toLowerCase();
    if (!q) {
      this.filteredSellers = this.sellers;
      return;
    }
    this.filteredSellers = this.sellers.filter(s =>
      s.companyName.toLowerCase().includes(q) ||
      s.description?.toLowerCase().includes(q)
    );
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
