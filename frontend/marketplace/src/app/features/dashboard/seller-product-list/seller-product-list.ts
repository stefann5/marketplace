import { ChangeDetectionStrategy, ChangeDetectorRef, Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ProductService } from '../../../core/services/product.service';
import { Product } from '../../../core/models/product.model';

@Component({
  selector: 'app-seller-product-list',
  standalone: true,
  imports: [CommonModule, TableModule, ButtonModule, ToastModule, ConfirmDialogModule],
  providers: [ConfirmationService, MessageService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './seller-product-list.html'
})
export class SellerProductListComponent {
  products: Product[] = [];
  totalRecords = 0;
  rows = 10;
  loading = true;

  constructor(
    private productService: ProductService,
    private router: Router,
    private confirmationService: ConfirmationService,
    private messageService: MessageService,
    private cdr: ChangeDetectorRef
  ) {}

  loadProducts(page: number): void {
    this.loading = true;
    this.productService.getSellerProducts(page, this.rows).subscribe({
      next: res => {
        this.products = res.content;
        this.totalRecords = res.totalElements;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  onPageChange(event: any): void {
    this.loadProducts(event.first / event.rows);
  }

  addProduct(): void {
    this.router.navigate(['/dashboard/products/new']);
  }

  editProduct(id: string): void {
    this.router.navigate(['/dashboard/products', id, 'edit']);
  }

  confirmDelete(event: Event, product: Product): void {
    this.confirmationService.confirm({
      target: event.target as EventTarget,
      message: `Are you sure you want to delete "${product.name}"?`,
      header: 'Confirm Delete',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonProps: { label: 'Delete', severity: 'danger' },
      rejectButtonProps: { label: 'Cancel', severity: 'secondary', outlined: true },
      accept: () => {
        this.productService.delete(product.id).subscribe({
          next: () => {
            this.messageService.add({ severity: 'success', summary: 'Deleted', detail: 'Product deleted' });
            this.loadProducts(0);
          },
          error: () => {
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to delete product' });
          }
        });
      }
    });
  }
}
