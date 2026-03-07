import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { TextareaModule } from 'primeng/textarea';
import { ButtonModule } from 'primeng/button';
import { FileUploadModule } from 'primeng/fileupload';
import { TreeSelectModule } from 'primeng/treeselect';
import { ToastModule } from 'primeng/toast';
import { MessageService, TreeNode } from 'primeng/api';
import { ProductService } from '../../../core/services/product.service';
import { CategoryService } from '../../../core/services/category.service';
import { ProductRequest } from '../../../core/models/product.model';

@Component({
  selector: 'app-seller-product-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, InputTextModule, InputNumberModule, TextareaModule, ButtonModule, FileUploadModule, TreeSelectModule, ToastModule],
  providers: [MessageService],
  templateUrl: './seller-product-form.html'
})
export class SellerProductFormComponent implements OnInit {
  form!: FormGroup;
  isEdit = false;
  productId: string | null = null;
  selectedFiles: File[] = [];
  existingImageUrls: string[] = [];
  categoryNodes: TreeNode[] = [];

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private productService: ProductService,
    private categoryService: CategoryService,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      name: ['', Validators.required],
      description: ['', Validators.required],
      price: [null, [Validators.required, Validators.min(0.01)]],
      stock: [0, [Validators.required, Validators.min(0)]],
      category: [null, Validators.required]
    });

    this.categoryService.getTreeNodes().subscribe(nodes => {
      this.categoryNodes = nodes;
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
        this.existingImageUrls = product.imageUrls;
        if (product.categoryId) {
          this.categoryService.getTreeNodes().subscribe(nodes => {
            const node = this.findNode(nodes, product.categoryId!);
            if (node) this.form.patchValue({ category: node });
          });
        }
      });
    }
  }

  onFilesSelect(event: any): void {
    if (event.files?.length) {
      this.selectedFiles = [...event.files];
    }
  }

  onSubmit(): void {
    if (this.form.invalid) return;

    const formValue = this.form.value;
    const request: ProductRequest = {
      name: formValue.name,
      description: formValue.description,
      price: formValue.price,
      stock: formValue.stock,
      categoryId: formValue.category?.data ?? null
    };
    const save$ = this.isEdit
      ? this.productService.update(this.productId!, request)
      : this.productService.create(request);

    save$.subscribe({
      next: product => {
        if (this.selectedFiles.length) {
          this.productService.uploadImages(product.id, this.selectedFiles).subscribe({
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

  private findNode(nodes: TreeNode[], id: number): TreeNode | null {
    for (const node of nodes) {
      if (node.data === id) return node;
      if (node.children) {
        const found = this.findNode(node.children, id);
        if (found) return found;
      }
    }
    return null;
  }
}
