import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { Subscription, forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ChatService } from '../../core/services/chat.service';
import { ProductService } from '../../core/services/product.service';
import { CartService } from '../../core/services/cart.service';
import { ChatMessage, ChatSessionDetail, ChatSessionSummary } from '../../core/models/chat.model';
import { Product } from '../../core/models/product.model';
import { Cart } from '../../core/models/cart.model';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ButtonModule, InputTextModule, TextareaModule,
    ProgressSpinnerModule, ConfirmDialogModule, ToastModule
  ],
  providers: [ConfirmationService, MessageService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './chat.html'
})
export class ChatComponent implements OnInit, OnDestroy {
  @ViewChild('messagesContainer') messagesContainer?: ElementRef<HTMLDivElement>;

  sessions: ChatSessionSummary[] = [];
  activeSession: ChatSessionDetail | null = null;
  productCache = new Map<string, Product>();
  inputText = '';
  sending = false;
  loadingSession = false;
  cart: Cart | null = null;
  private cartSub?: Subscription;

  constructor(
    private chatService: ChatService,
    private productService: ProductService,
    private cartService: CartService,
    private confirmationService: ConfirmationService,
    private messageService: MessageService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadSessions();
    this.cartSub = this.cartService.cartState$.subscribe(cart => {
      this.cart = cart;
      this.cdr.markForCheck();
    });
    this.cartService.refreshCount();
  }

  ngOnDestroy(): void {
    this.cartSub?.unsubscribe();
  }

  loadSessions(): void {
    this.chatService.listSessions().subscribe(sessions => {
      this.sessions = sessions;
      this.cdr.markForCheck();
    });
  }

  newChat(): void {
    this.activeSession = null;
    this.inputText = '';
    this.cdr.markForCheck();
  }

  selectSession(id: string): void {
    if (this.activeSession?.id === id) return;
    this.loadingSession = true;
    this.activeSession = null;
    this.cdr.markForCheck();
    this.chatService.getSession(id).subscribe({
      next: session => {
        this.activeSession = session;
        this.loadingSession = false;
        this.fetchMissingProducts(session.messages);
        this.cdr.markForCheck();
        this.scrollToBottom();
      },
      error: () => {
        this.loadingSession = false;
        this.cdr.markForCheck();
      }
    });
  }

  deleteSession(event: Event, id: string): void {
    event.stopPropagation();
    this.confirmationService.confirm({
      target: event.target as EventTarget,
      message: 'Delete this chat?',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonProps: { severity: 'danger' },
      accept: () => {
        this.chatService.deleteSession(id).subscribe(() => {
          this.sessions = this.sessions.filter(s => s.id !== id);
          if (this.activeSession?.id === id) {
            this.activeSession = null;
          }
          this.cdr.markForCheck();
        });
      }
    });
  }

  sendMessage(): void {
    const text = this.inputText.trim();
    if (!text || this.sending) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: text,
      productIds: [],
      createdAt: new Date().toISOString()
    };

    if (this.activeSession) {
      this.activeSession.messages.push(userMessage);
      this.sending = true;
      this.inputText = '';
      this.cdr.markForCheck();
      this.scrollToBottom();
      this.dispatchMessage(this.activeSession.id, text);
    } else {
      this.sending = true;
      this.inputText = '';
      this.cdr.markForCheck();
      this.chatService.createSession().subscribe(session => {
        session.messages = [userMessage];
        this.activeSession = session;
        this.sessions = [
          { id: session.id, title: session.title, createdAt: session.createdAt, updatedAt: session.updatedAt },
          ...this.sessions
        ];
        this.cdr.markForCheck();
        this.scrollToBottom();
        this.dispatchMessage(session.id, text);
      });
    }
  }

  private dispatchMessage(sessionId: string, text: string): void {
    this.chatService.sendMessage(sessionId, text).subscribe({
      next: response => {
        if (!this.activeSession || this.activeSession.id !== sessionId) {
          this.sending = false;
          this.cdr.markForCheck();
          return;
        }
        for (const product of response.products) {
          this.productCache.set(product.id, this.toProduct(product));
        }
        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: response.message,
          productIds: response.products.map(p => p.id),
          createdAt: new Date().toISOString()
        };
        this.activeSession.messages.push(assistantMessage);
        this.activeSession.updatedAt = assistantMessage.createdAt;
        const summary = this.sessions.find(s => s.id === sessionId);
        if (summary) {
          summary.updatedAt = assistantMessage.createdAt;
          this.sessions = [summary, ...this.sessions.filter(s => s.id !== sessionId)];
        }
        this.fetchMissingProducts([assistantMessage]);
        this.sending = false;
        this.cdr.markForCheck();
        this.scrollToBottom();
      },
      error: err => {
        this.sending = false;
        const detail = typeof err?.error?.detail === 'string'
          ? err.error.detail
          : 'Failed to get a response. Please try again.';
        this.messageService.add({
          severity: err?.status === 429 ? 'warn' : 'error',
          summary: err?.status === 429 ? 'Rate limited' : 'Error',
          detail,
          life: 6000
        });
        this.cdr.markForCheck();
      }
    });
  }

  private fetchMissingProducts(messages: ChatMessage[]): void {
    const missing = new Set<string>();
    for (const msg of messages) {
      for (const id of msg.productIds) {
        if (!this.productCache.has(id)) missing.add(id);
      }
    }
    if (missing.size === 0) return;
    const requests = Array.from(missing).map(id =>
      this.productService.getById(id).pipe(catchError(() => of(null)))
    );
    forkJoin(requests).subscribe(results => {
      for (const product of results) {
        if (product) this.productCache.set(product.id, product);
      }
      this.cdr.markForCheck();
    });
  }

  private toProduct(summary: import('../../core/models/chat.model').ChatProductSummary): Product {
    return {
      id: summary.id,
      tenantId: summary.tenantId,
      name: summary.name,
      description: summary.description ?? '',
      price: summary.price,
      stock: summary.stock,
      categoryId: summary.categoryId,
      imageUrls: summary.imageUrls,
      averageRating: summary.averageRating,
      reviewCount: summary.reviewCount,
      purchaseCount: 0,
      createdAt: '',
      updatedAt: ''
    };
  }

  getProduct(id: string): Product | undefined {
    return this.productCache.get(id);
  }

  viewProduct(id: string): void {
    this.router.navigate(['/products', id], {
      queryParams: { returnUrl: this.router.url }
    });
  }

  addToCart(event: Event, productId: string): void {
    event.stopPropagation();
    const product = this.productCache.get(productId);
    if (!product || !product.tenantId) return;
    this.cartService.addItem({
      productId: product.id,
      tenantId: product.tenantId,
      quantity: 1,
      unitPrice: product.price,
      categoryId: product.categoryId
    }).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Added to cart', detail: product.name, life: 2000 });
      }
    });
  }

  getCartQuantity(productId: string): number {
    return this.cart?.items.find(i => i.productId === productId)?.quantity ?? 0;
  }

  changeQuantity(event: Event, productId: string, delta: number): void {
    event.stopPropagation();
    const item = this.cart?.items.find(i => i.productId === productId);
    if (!item) return;
    const newQty = item.quantity + delta;
    if (newQty < 1) {
      this.cartService.removeItem(item.id).subscribe();
    } else {
      this.cartService.updateItem(item.id, { quantity: newQty }).subscribe();
    }
  }

  onInputKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  trackBySessionId(_index: number, item: ChatSessionSummary): string {
    return item.id;
  }

  trackByMessage(index: number, _item: ChatMessage): number {
    return index;
  }

  trackByProductId(_index: number, id: string): string {
    return id;
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      const el = this.messagesContainer?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    }, 0);
  }
}
