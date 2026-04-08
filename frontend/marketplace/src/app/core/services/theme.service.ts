import { Injectable } from '@angular/core';
import { updatePrimaryPalette, usePreset } from '@primeuix/themes';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  async applySellerTheme(preset: string | null | undefined, primaryColor: string | null | undefined): Promise<void> {
    const resolvedPreset = preset || 'nora';
    const resolvedPrimary = primaryColor || 'amber';

    let themePreset;
    switch (resolvedPreset) {
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
      50: `{${resolvedPrimary}.50}`,
      100: `{${resolvedPrimary}.100}`,
      200: `{${resolvedPrimary}.200}`,
      300: `{${resolvedPrimary}.300}`,
      400: `{${resolvedPrimary}.400}`,
      500: `{${resolvedPrimary}.500}`,
      600: `{${resolvedPrimary}.600}`,
      700: `{${resolvedPrimary}.700}`,
      800: `{${resolvedPrimary}.800}`,
      900: `{${resolvedPrimary}.900}`,
      950: `{${resolvedPrimary}.950}`
    });
  }

  async restoreDefaultTheme(): Promise<void> {
    const nora = (await import('@primeuix/themes/nora')).default;
    usePreset(nora);
    updatePrimaryPalette({
      50: '{amber.50}',
      100: '{amber.100}',
      200: '{amber.200}',
      300: '{amber.300}',
      400: '{amber.400}',
      500: '{amber.500}',
      600: '{amber.600}',
      700: '{amber.700}',
      800: '{amber.800}',
      900: '{amber.900}',
      950: '{amber.950}'
    });
  }
}