import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { TextareaModule } from 'primeng/textarea';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { ProductService } from '../../../core/services/product.service';
import { ProductRequest } from '../../../core/models/product.model';

@Component({
  selector: 'app-seller-product-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, InputTextModule, InputNumberModule, TextareaModule, ButtonModule, ToastModule],
  providers: [MessageService],
  templateUrl: './seller-product-form.html'
})
export class SellerProductFormComponent implements OnInit {
  form!: FormGroup;
  isEdit = false;
  productId: string | null = null;
  selectedFile: File | null = null;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private productService: ProductService,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      name: ['', Validators.required],
      description: ['', Validators.required],
      price: [null, [Validators.required, Validators.min(0.01)]],
      stock: [0, [Validators.required, Validators.min(0)]]
    });

    this.productId = this.route.snapshot.paramMap.get('id');
    if (this.productId) {
      this.isEdit = true;
      this.productService.getById(this.productId).subscribe(product => {
        this.form.patchValue({
          name: product.name,
          description: product.description,
          price: product.price,
          stock: product.stock
        });
      });
    }
  }

  onFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      this.selectedFile = input.files[0];
    }
  }

  onSubmit(): void {
    if (this.form.invalid) return;

    const request: ProductRequest = this.form.value;
    const save$ = this.isEdit
      ? this.productService.update(this.productId!, request)
      : this.productService.create(request);

    save$.subscribe({
      next: product => {
        if (this.selectedFile) {
          this.productService.uploadImage(product.id, this.selectedFile).subscribe({
            next: () => this.router.navigate(['/dashboard/products']),
            error: () => {
              this.messageService.add({ severity: 'warn', summary: 'Saved', detail: 'Product saved but image upload failed' });
            }
          });
        } else {
          this.router.navigate(['/dashboard/products']);
        }
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to save product' });
      }
    });
  }

  cancel(): void {
    this.router.navigate(['/dashboard/products']);
  }
}
