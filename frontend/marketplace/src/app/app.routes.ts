import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { guestGuard } from './core/guards/guest.guard';
import { sellerGuard } from './core/guards/seller.guard';

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
        path: ':id',
        loadComponent: () => import('./features/products/product-detail/product-detail').then(m => m.ProductDetailComponent)
      }
    ]
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
      }
    ]
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
