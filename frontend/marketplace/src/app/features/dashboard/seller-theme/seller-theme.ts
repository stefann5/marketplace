import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { FloatLabelModule } from 'primeng/floatlabel';
import { ToastModule } from 'primeng/toast';
import { CardModule } from 'primeng/card';
import { SellerService } from '../../../core/services/seller.service';
import { SellerTheme, ThemeRequest } from '../../../core/models/seller.model';
import { updatePrimaryPalette } from '@primeuix/themes';

@Component({
  selector: 'app-seller-theme',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule, SelectModule, InputTextModule, FloatLabelModule, ToastModule, CardModule],
  providers: [MessageService],
  templateUrl: './seller-theme.html'
})
export class SellerThemeComponent implements OnInit {
  theme: ThemeRequest = { preset: 'amber' };
  loading = false;
  saving = false;

  presetOptions = [
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

  constructor(private sellerService: SellerService, private messageService: MessageService) {}

  ngOnInit(): void {
    this.loading = true;
    this.sellerService.getTheme().subscribe({
      next: (t) => {
        this.theme = {
          preset: t.preset || 'amber',
          primaryColor: t.primaryColor || undefined,
          fontFamily: t.fontFamily || undefined,
          borderRadius: t.borderRadius || undefined
        };
        this.loading = false;
      },
      error: () => this.loading = false
    });
  }

  onPresetChange(): void {
    this.applyPreview(this.theme.preset);
  }

  applyPreview(preset: string): void {
    updatePrimaryPalette({
      50: `{${preset}.50}`,
      100: `{${preset}.100}`,
      200: `{${preset}.200}`,
      300: `{${preset}.300}`,
      400: `{${preset}.400}`,
      500: `{${preset}.500}`,
      600: `{${preset}.600}`,
      700: `{${preset}.700}`,
      800: `{${preset}.800}`,
      900: `{${preset}.900}`,
      950: `{${preset}.950}`
    });
  }

  save(): void {
    this.saving = true;
    this.sellerService.updateTheme(this.theme).subscribe({
      next: () => {
        this.saving = false;
        this.messageService.add({ severity: 'success', summary: 'Theme saved' });
      },
      error: () => {
        this.saving = false;
        this.messageService.add({ severity: 'error', summary: 'Failed to save theme' });
      }
    });
  }
}
