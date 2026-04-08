import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { guestGuard } from './core/guards/guest.guard';
import { sellerGuard } from './core/guards/seller.guard';
import { buyerGuard } from './core/guards/buyer.guard';
import { adminGuard } from './core/guards/admin.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/home/home').then(m => m.HomeComponent),
  },
  {
    path: 'products',
    loadComponent: () => import('./core/layout/buyer-layout').then(m => m.BuyerLayoutComponent),
    children: [
      {
        path: '',
        loadComponent: () => import('./features/products/product-list/product-list').then(m => m.ProductListComponent)
      },
      {
        path: 'search',
        loadComponent: () => import('./features/products/product-search/product-search').then(m => m.ProductSearchComponent)
      },
      {
        path: ':id',
        loadComponent: () => import('./features/products/product-detail/product-detail').then(m => m.ProductDetailComponent)
      }
    ]
  },
  {
    path: 'cart',
    loadComponent: () => import('./core/layout/buyer-layout').then(m => m.BuyerLayoutComponent),
    canActivate: [authGuard, buyerGuard],
    children: [
      {
        path: '',
        loadComponent: () => import('./features/cart/cart').then(m => m.CartComponent)
      }
    ]
  },
  {
    path: 'orders',
    loadComponent: () => import('./core/layout/buyer-layout').then(m => m.BuyerLayoutComponent),
    canActivate: [authGuard, buyerGuard],
    children: [
      {
        path: '',
        loadComponent: () => import('./features/orders/buyer-orders/buyer-orders').then(m => m.BuyerOrdersComponent)
      }
    ]
  },
  {
    path: 'onboarding',
    loadComponent: () => import('./features/onboarding/seller-onboarding').then(m => m.SellerOnboardingComponent)
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./core/layout/dashboard-layout').then(m => m.DashboardLayoutComponent),
    canActivate: [authGuard, sellerGuard],
    children: [
      { path: '', redirectTo: 'products', pathMatch: 'full' },
      {
        path: 'products',
        loadComponent: () => import('./features/dashboard/seller-product-list/seller-product-list').then(m => m.SellerProductListComponent)
      },
      {
        path: 'products/new',
        loadComponent: () => import('./features/dashboard/seller-product-form/seller-product-form').then(m => m.SellerProductFormComponent)
      },
      {
        path: 'products/:id/edit',
        loadComponent: () => import('./features/dashboard/seller-product-form/seller-product-form').then(m => m.SellerProductFormComponent)
      },
      {
        path: 'orders',
        loadComponent: () => import('./features/dashboard/seller-orders/seller-orders').then(m => m.SellerOrdersComponent)
      },
      {
        path: 'theme',
        loadComponent: () => import('./features/dashboard/seller-theme/seller-theme').then(m => m.SellerThemeComponent)
      }
    ]
  },
  {
    path: 'admin',
    loadComponent: () => import('./features/admin/admin-layout').then(m => m.AdminLayoutComponent),
    canActivate: [authGuard, adminGuard],
    children: [
      { path: '', redirectTo: 'sellers', pathMatch: 'full' },
      {
        path: 'sellers',
        loadComponent: () => import('./features/admin/seller-list/seller-list').then(m => m.SellerListComponent)
      },
      {
        path: 'sellers/:id',
        loadComponent: () => import('./features/admin/seller-detail/seller-detail').then(m => m.SellerDetailComponent)
      }
    ]
  },
  {
    path: 'shop/:slug',
    loadComponent: () => import('./features/shop/seller-layout/seller-layout').then(m => m.SellerLayoutComponent),
    children: [
      {
        path: '',
        loadComponent: () => import('./features/shop/seller-shop').then(m => m.SellerShopComponent)
      },
      {
        path: 'search',
        loadComponent: () => import('./features/shop/seller-search/seller-search').then(m => m.SellerSearchComponent)
      },
      {
        path: 'product/:id',
        loadComponent: () => import('./features/products/product-detail/product-detail').then(m => m.ProductDetailComponent)
      }
    ]
  },
  {
    path: 'verify-email',
    loadComponent: () => import('./features/auth/verify-email/verify-email').then(m => m.VerifyEmailComponent),
    canActivate: [guestGuard]
  },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login').then(m => m.LoginComponent),
    canActivate: [guestGuard]
  },
  {
    path: 'register',
    loadComponent: () => import('./features/auth/register/register').then(m => m.RegisterComponent),
    canActivate: [guestGuard]
  },
  {
    path: '**',
    redirectTo: ''
  }
];
