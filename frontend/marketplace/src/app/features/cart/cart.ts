import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { MessageModule } from 'primeng/message';
import { CartService } from '../../core/services/cart.service';
import { OrderService } from '../../core/services/order.service';
import { Cart, CartItem } from '../../core/models/cart.model';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ButtonModule, InputNumberModule, MessageModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cart.html'
})
export class CartComponent implements OnInit {
  cart: Cart | null = null;
  loading = false;
  checkoutLoading = false;
  errorMessage = '';

  constructor(
    private cartService: CartService,
    private orderService: OrderService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadCart();
  }

  loadCart(): void {
    this.loading = true;
    this.cartService.getCart().subscribe({
      next: cart => {
        this.cart = cart;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  updateQuantity(item: CartItem, quantity: number): void {
    if (quantity < 1) return;
    this.cartService.updateItem(item.id, { quantity }).subscribe({
      next: cart => {
        this.cart = cart;
        this.cdr.markForCheck();
      }
    });
  }

  removeItem(item: CartItem): void {
    this.cartService.removeItem(item.id).subscribe({
      next: cart => {
        this.cart = cart;
        this.cdr.markForCheck();
      }
    });
  }

  getTotal(): number {
    if (!this.cart) return 0;
    return this.cart.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  }

  checkout(): void {
    this.checkoutLoading = true;
    this.errorMessage = '';
    this.orderService.checkout().subscribe({
      next: () => {
        this.checkoutLoading = false;
        this.cartService.clearCount();
        this.router.navigate(['/orders']);
      },
      error: err => {
        this.checkoutLoading = false;
        if (err.status === 409) {
          this.errorMessage = 'Some items have insufficient stock. Please review your cart and try again.';
        } else if (err.status === 400) {
          this.errorMessage = 'Your cart is empty.';
        } else {
          this.errorMessage = 'Checkout failed. Please try again.';
        }
        this.loadCart();
        this.cdr.markForCheck();
      }
    });
  }
}
