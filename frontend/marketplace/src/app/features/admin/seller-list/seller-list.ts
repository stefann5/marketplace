import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { SelectModule } from 'primeng/select';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../../core/services/admin.service';
import { SellerProfile } from '../../../core/models/seller.model';

@Component({
  selector: 'app-seller-list',
  standalone: true,
  imports: [CommonModule, FormsModule, TableModule, ButtonModule, TagModule, SelectModule],
  templateUrl: './seller-list.html'
})
export class SellerListComponent implements OnInit {
  sellers: SellerProfile[] = [];
  loading = true;
  selectedStatus: string | null = null;

  statusOptions = [
    { label: 'All', value: null },
    { label: 'Pending', value: 'PENDING_APPROVAL' },
    { label: 'Active', value: 'ACTIVE' },
    { label: 'Rejected', value: 'REJECTED' },
    { label: 'Suspended', value: 'SUSPENDED' }
  ];

  constructor(private adminService: AdminService, private router: Router) {}

  ngOnInit(): void {
    this.loadSellers();
  }

  loadSellers(): void {
    this.loading = true;
    this.adminService.listSellers(this.selectedStatus || undefined).subscribe({
      next: (sellers) => {
        this.sellers = sellers;
        this.loading = false;
      },
      error: () => this.loading = false
    });
  }

  onStatusFilterChange(): void {
    this.loadSellers();
  }

  viewDetail(seller: SellerProfile): void {
    this.router.navigate(['/admin/sellers', seller.id]);
  }

  getStatusSeverity(status: string): "success" | "info" | "warn" | "danger" | "secondary" | "contrast" | undefined {
    switch (status) {
      case 'ACTIVE': return 'success';
      case 'PENDING_APPROVAL': return 'warn';
      case 'REJECTED': return 'danger';
      case 'SUSPENDED': return 'secondary';
      default: return 'info';
    }
  }

  getStatusLabel(status: string): string {
    return status.replace('_', ' ');
  }
}
