import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { guestGuard } from './core/guards/guest.guard';
import { sellerGuard } from './core/guards/seller.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/home/home').then(m => m.HomeComponent),
    canActivate: [authGuard]
  },
  {
    path: 'products',
    loadComponent: () => import('./features/products/product-list/product-list').then(m => m.ProductListComponent)
  },
  {
    path: 'products/:id',
    loadComponent: () => import('./features/products/product-detail/product-detail').then(m => m.ProductDetailComponent)
  },
  {
    path: 'dashboard/products',
    loadComponent: () => import('./features/dashboard/seller-product-list/seller-product-list').then(m => m.SellerProductListComponent),
    canActivate: [authGuard, sellerGuard]
  },
  {
    path: 'dashboard/products/new',
    loadComponent: () => import('./features/dashboard/seller-product-form/seller-product-form').then(m => m.SellerProductFormComponent),
    canActivate: [authGuard, sellerGuard]
  },
  {
    path: 'dashboard/products/:id/edit',
    loadComponent: () => import('./features/dashboard/seller-product-form/seller-product-form').then(m => m.SellerProductFormComponent),
    canActivate: [authGuard, sellerGuard]
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
