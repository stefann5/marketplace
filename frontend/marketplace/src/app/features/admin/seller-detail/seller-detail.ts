import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { CardModule } from 'primeng/card';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageService, ConfirmationService } from 'primeng/api';
import { AdminService } from '../../../core/services/admin.service';
import { SellerProfile } from '../../../core/models/seller.model';
import { timeout } from 'rxjs';

@Component({
  selector: 'app-seller-detail',
  standalone: true,
  imports: [CommonModule, ButtonModule, TagModule, CardModule, ToastModule, ConfirmDialogModule],
  providers: [MessageService, ConfirmationService],
  templateUrl: './seller-detail.html'
})
export class SellerDetailComponent implements OnInit, OnDestroy {
  seller: SellerProfile | null = null;
  logoLoadFailed = false;
  loading = true;
  loadError = false;
  actionLoading = false;
  private destroyed = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private adminService: AdminService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadSeller();
  }

  loadSeller(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    setTimeout(() => {
      if (this.destroyed) return;
      this.loading = true;
      this.loadError = false;
      this.cdr.detectChanges();
    }, 0);

    this.adminService.getSellerDetail(id).pipe(
      timeout(10000)
    ).subscribe({
      next: (seller) => {
        setTimeout(() => {
          if (this.destroyed) return;
          this.seller = seller;
          this.logoLoadFailed = false;
          this.loading = false;
          this.loadError = false;
          this.cdr.detectChanges();
        }, 0);
      },
      error: () => {
        setTimeout(() => {
          if (this.destroyed) return;
          this.seller = null;
          this.loading = false;
          this.loadError = true;
          this.cdr.detectChanges();
        }, 0);
      }
    });
  }

  approve(): void {
    this.confirmationService.confirm({
      message: 'Approve this seller? They will be able to list products.',
      accept: () => {
        this.actionLoading = true;
        this.adminService.approveSeller(this.seller!.id).subscribe({
          next: () => {
            this.actionLoading = false;
            this.loadSeller();
            this.messageService.add({ severity: 'success', summary: 'Seller Approved' });
          },
          error: () => this.actionLoading = false
        });
      }
    });
  }

  reject(): void {
    this.confirmationService.confirm({
      message: 'Reject this seller application?',
      accept: () => {
        this.actionLoading = true;
        this.adminService.rejectSeller(this.seller!.id).subscribe({
          next: () => {
            this.actionLoading = false;
            this.loadSeller();
            this.messageService.add({ severity: 'warn', summary: 'Seller Rejected' });
          },
          error: () => this.actionLoading = false
        });
      }
    });
  }

  suspend(): void {
    this.confirmationService.confirm({
      message: 'Suspend this seller? They will not be able to operate.',
      accept: () => {
        this.actionLoading = true;
        this.adminService.suspendSeller(this.seller!.id).subscribe({
          next: () => {
            this.actionLoading = false;
            this.loadSeller();
            this.messageService.add({ severity: 'warn', summary: 'Seller Suspended' });
          },
          error: () => this.actionLoading = false
        });
      }
    });
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

  goBack(): void {
    this.router.navigate(['/admin/sellers']);
  }

  onLogoError(): void {
    this.logoLoadFailed = true;
  }

  ngOnDestroy(): void {
    this.destroyed = true;
  }
}
