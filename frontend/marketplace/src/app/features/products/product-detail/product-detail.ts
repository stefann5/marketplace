import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { InputNumberModule } from 'primeng/inputnumber';
import { DataViewModule } from 'primeng/dataview';
import { RatingModule } from 'primeng/rating';
import { TextareaModule } from 'primeng/textarea';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { ProductService } from '../../../core/services/product.service';
import { CartService } from '../../../core/services/cart.service';
import { AuthService } from '../../../core/services/auth.service';
import { ReviewService } from '../../../core/services/review.service';
import { Product } from '../../../core/models/product.model';
import { Cart } from '../../../core/models/cart.model';
import { Review, ReviewRequest } from '../../../core/models/review.model';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ButtonModule, TagModule, InputNumberModule,
    DataViewModule, RatingModule, TextareaModule, ToastModule
  ],
  providers: [MessageService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './product-detail.html'
})
export class ProductDetailComponent implements OnInit, OnDestroy {
  product: Product | null = null;
  selectedImageIndex = 0;
  addingToCart = false;
  cart: Cart | null = null;
  private cartSub?: Subscription;

  reviews: Review[] = [];
  reviewsTotalRecords = 0;
  reviewsPage = 0;
  reviewsRows = 5;

  myReview: Review | null = null;
  reviewRating = 0;
  reviewComment = '';
  submittingReview = false;
  reviewFormError = '';
  isEditMode = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private productService: ProductService,
    private cartService: CartService,
    public authService: AuthService,
    private reviewService: ReviewService,
    private messageService: MessageService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.cartSub = this.cartService.cartState$.subscribe(cart => {
      this.cart = cart;
      this.cdr.markForCheck();
    });
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.productService.getById(id).subscribe({
        next: p => {
          this.product = p;
          this.loadReviews();
          this.loadMyReview();
          this.cdr.markForCheck();
        },
        error: () => this.router.navigate(['/products'])
      });
    }
  }

  loadReviews(): void {
    if (!this.product) return;
    this.reviewService.getReviews(this.product.id, this.reviewsPage, this.reviewsRows).subscribe({
      next: page => {
        this.reviews = page.content;
        this.reviewsTotalRecords = page.totalElements;
        this.cdr.markForCheck();
      }
    });
  }

  onReviewPageChange(event: any): void {
    this.reviewsPage = Math.floor((event.first ?? 0) / this.reviewsRows);
    this.loadReviews();
  }

  loadMyReview(): void {
    if (!this.product || !this.authService.isLoggedIn() || this.authService.getUserRole() !== 'BUYER') return;
    this.reviewService.getMyReview(this.product.id).subscribe({
      next: review => {
        this.myReview = review;
        this.reviewRating = review.rating;
        this.reviewComment = review.comment ?? '';
        this.isEditMode = true;
        this.cdr.markForCheck();
      },
      error: () => {
        this.myReview = null;
        this.isEditMode = false;
        this.cdr.markForCheck();
      }
    });
  }

  submitReview(): void {
    if (!this.product || this.submittingReview || this.reviewRating < 1) return;
    this.submittingReview = true;
    this.reviewFormError = '';

    const request: ReviewRequest = {
      rating: this.reviewRating,
      ...(this.reviewComment.trim() && { comment: this.reviewComment.trim() })
    };

    const obs = this.isEditMode && this.myReview
      ? this.reviewService.updateReview(this.myReview.id, request)
      : this.reviewService.createReview(this.product.id, request);

    obs.subscribe({
      next: review => {
        this.myReview = review;
        this.reviewRating = review.rating;
        this.reviewComment = review.comment ?? '';
        this.isEditMode = true;
        this.submittingReview = false;
        this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Review saved' });
        this.reviewsPage = 0;
        this.loadReviews();
        this.productService.getById(this.product!.id).subscribe(p => {
          this.product = p;
          this.cdr.markForCheck();
        });
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.submittingReview = false;
        if (err.status === 403) {
          this.reviewFormError = 'You must purchase this product before reviewing.';
        } else if (err.status === 409) {
          this.reviewFormError = 'You have already reviewed this product.';
          this.loadMyReview();
        } else {
          this.reviewFormError = 'Failed to save review. Please try again.';
        }
        this.cdr.markForCheck();
      }
    });
  }

  getStarArray(rating: number): boolean[] {
    return Array.from({ length: 5 }, (_, i) => i < rating);
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

  addToCart(): void {
    if (!this.product || this.addingToCart) return;
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }
    this.addingToCart = true;
    this.cartService.addItem({
      productId: this.product.id,
      tenantId: this.product.tenantId,
      quantity: 1,
      unitPrice: this.product.price
    }).subscribe({
      next: () => {
        this.addingToCart = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.addingToCart = false;
        this.cdr.markForCheck();
      }
    });
  }

  getCartQuantity(): number {
    if (!this.product) return 0;
    return this.cart?.items.find(i => i.productId === this.product!.id)?.quantity ?? 0;
  }

  changeQuantity(delta: number): void {
    if (!this.product) return;
    const item = this.cart?.items.find(i => i.productId === this.product!.id);
    if (!item) return;
    const newQty = item.quantity + delta;
    if (newQty < 1) {
      this.cartService.removeItem(item.id).subscribe();
    } else {
      this.cartService.updateItem(item.id, { quantity: newQty }).subscribe();
    }
  }

  onManualQuantity(value: number | null): void {
    if (!this.product || value == null) return;
    const item = this.cart?.items.find(i => i.productId === this.product!.id);
    if (!item) return;
    if (value < 1) {
      this.cartService.removeItem(item.id).subscribe();
    } else {
      this.cartService.updateItem(item.id, { quantity: value }).subscribe();
    }
  }

  ngOnDestroy(): void {
    this.cartSub?.unsubscribe();
  }
}
