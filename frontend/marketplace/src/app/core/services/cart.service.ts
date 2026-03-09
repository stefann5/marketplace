import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AddCartItemRequest, Cart, CartItem, UpdateCartItemRequest } from '../models/cart.model';

@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly apiUrl = `${environment.apiUrl}/api/cart`;
  private cartItemCount$ = new BehaviorSubject<number>(0);
  private cart$ = new BehaviorSubject<Cart | null>(null);

  constructor(private http: HttpClient) {}

  get itemCount$(): Observable<number> {
    return this.cartItemCount$.asObservable();
  }

  get cartState$(): Observable<Cart | null> {
    return this.cart$.asObservable();
  }

  getCartItemByProductId(productId: string): CartItem | undefined {
    return this.cart$.value?.items.find(i => i.productId === productId);
  }

  getCart(): Observable<Cart> {
    return this.http.get<Cart>(this.apiUrl).pipe(
      tap(cart => this.updateState(cart))
    );
  }

  addItem(request: AddCartItemRequest): Observable<Cart> {
    return this.http.post<Cart>(`${this.apiUrl}/items`, request).pipe(
      tap(cart => this.updateState(cart))
    );
  }

  updateItem(itemId: string, request: UpdateCartItemRequest): Observable<Cart> {
    return this.http.put<Cart>(`${this.apiUrl}/items/${itemId}`, request).pipe(
      tap(cart => this.updateState(cart))
    );
  }

  removeItem(itemId: string): Observable<Cart> {
    return this.http.delete<Cart>(`${this.apiUrl}/items/${itemId}`).pipe(
      tap(cart => this.updateState(cart))
    );
  }

  refreshCount(): void {
    this.http.get<Cart>(this.apiUrl).subscribe({
      next: cart => this.updateState(cart),
      error: () => {
        this.cartItemCount$.next(0);
        this.cart$.next(null);
      }
    });
  }

  clearCount(): void {
    this.cartItemCount$.next(0);
    this.cart$.next(null);
  }

  private updateState(cart: Cart): void {
    this.cart$.next(cart);
    const total = cart.items.reduce((sum, item) => sum + item.quantity, 0);
    this.cartItemCount$.next(total);
  }
}
