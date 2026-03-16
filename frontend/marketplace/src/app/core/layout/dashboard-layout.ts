import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { AuthService } from '../services/auth.service';
import { SellerService } from '../services/seller.service';
import { updatePrimaryPalette, usePreset } from '@primeuix/themes';

@Component({
  selector: 'app-dashboard-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ButtonModule],
  templateUrl: './dashboard-layout.html'
})
export class DashboardLayoutComponent implements OnInit, OnDestroy {
  shopSlug: string | null = null;

  constructor(
    public authService: AuthService,
    private sellerService: SellerService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.sellerService.getMyProfile().subscribe({
      next: (profile) => {
        queueMicrotask(() => {
          this.shopSlug = profile.slug;
          if (profile.theme) {
            this.applyTheme(profile.theme.preset || 'nora', profile.theme.primaryColor || 'amber');
          }
          this.cdr.detectChanges();
        });
      }
    });
  }

  ngOnDestroy(): void {
    this.restoreDefault();
  }

  private async applyTheme(preset: string, primaryColor: string): Promise<void> {
    let themePreset;
    switch (preset) {
      case 'aura':
        themePreset = (await import('@primeuix/themes/aura')).default;
        break;
      case 'material':
        themePreset = (await import('@primeuix/themes/material')).default;
        break;
      case 'lara':
        themePreset = (await import('@primeuix/themes/lara')).default;
        break;
      case 'nora':
      default:
        themePreset = (await import('@primeuix/themes/nora')).default;
        break;
    }
    usePreset(themePreset);
    updatePrimaryPalette({
      50: `{${primaryColor}.50}`,
      100: `{${primaryColor}.100}`,
      200: `{${primaryColor}.200}`,
      300: `{${primaryColor}.300}`,
      400: `{${primaryColor}.400}`,
      500: `{${primaryColor}.500}`,
      600: `{${primaryColor}.600}`,
      700: `{${primaryColor}.700}`,
      800: `{${primaryColor}.800}`,
      900: `{${primaryColor}.900}`,
      950: `{${primaryColor}.950}`
    });
  }

  private async restoreDefault(): Promise<void> {
    const nora = (await import('@primeuix/themes/nora')).default;
    usePreset(nora);
    updatePrimaryPalette({
      50: '{amber.50}', 100: '{amber.100}', 200: '{amber.200}',
      300: '{amber.300}', 400: '{amber.400}', 500: '{amber.500}',
      600: '{amber.600}', 700: '{amber.700}', 800: '{amber.800}',
      900: '{amber.900}', 950: '{amber.950}'
    });
  }

  logout(): void {
    this.authService.logout();
  }
}
