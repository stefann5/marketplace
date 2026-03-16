import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { ToastModule } from 'primeng/toast';
import { CardModule } from 'primeng/card';
import { ColorPickerModule } from 'primeng/colorpicker';
import { SellerService } from '../../../core/services/seller.service';
import { ThemeRequest } from '../../../core/models/seller.model';
import { updatePrimaryPalette, usePreset } from '@primeuix/themes';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-seller-theme',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule, SelectModule, ToastModule, CardModule, ColorPickerModule],
  providers: [MessageService],
  templateUrl: './seller-theme.html'
})
export class SellerThemeComponent implements OnInit {
  theme: ThemeRequest = { preset: 'nora' };
  loading = false;
  saving = false;

  presetOptions = [
    { label: 'Aura', value: 'aura' },
    { label: 'Material', value: 'material' },
    { label: 'Lara', value: 'lara' },
    { label: 'Nora', value: 'nora' }
  ];

  colorOptions = [
    { label: 'Amber', value: 'amber' },
    { label: 'Blue', value: 'blue' },
    { label: 'Green', value: 'green' },
    { label: 'Indigo', value: 'indigo' },
    { label: 'Purple', value: 'purple' },
    { label: 'Red', value: 'red' },
    { label: 'Teal', value: 'teal' },
    { label: 'Orange', value: 'orange' },
    { label: 'Cyan', value: 'cyan' },
    { label: 'Pink', value: 'pink' },
    { label: 'Emerald', value: 'emerald' },
    { label: 'Violet', value: 'violet' }
  ];

  constructor(
    private sellerService: SellerService,
    private messageService: MessageService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loading = true;
    this.sellerService.getTheme()
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (t) => {
          this.theme = {
            preset: t.preset || 'nora',
            primaryColor: t.primaryColor || undefined
          };
        }
      });
  }

  onPresetChange(): void {
    this.applyPreview();
  }

  onColorChange(): void {
    this.applyPreview();
  }

  async applyPreview(): Promise<void> {
    let themePreset;
    switch (this.theme.preset) {
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
    const color = this.theme.primaryColor || 'amber';
    updatePrimaryPalette({
      50: `{${color}.50}`,
      100: `{${color}.100}`,
      200: `{${color}.200}`,
      300: `{${color}.300}`,
      400: `{${color}.400}`,
      500: `{${color}.500}`,
      600: `{${color}.600}`,
      700: `{${color}.700}`,
      800: `{${color}.800}`,
      900: `{${color}.900}`,
      950: `{${color}.950}`
    });
  }

  save(): void {
    this.saving = true;
    this.sellerService.updateTheme(this.theme)
      .pipe(
        finalize(() => {
          this.saving = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: () => {
          this.messageService.add({ severity: 'success', summary: 'Theme saved' });
        },
        error: () => {
          this.messageService.add({ severity: 'error', summary: 'Failed to save theme' });
        }
      });
  }
}