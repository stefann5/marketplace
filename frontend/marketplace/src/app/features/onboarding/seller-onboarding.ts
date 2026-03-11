import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MessageService } from 'primeng/api';
import { StepperModule } from 'primeng/stepper';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { FloatLabelModule } from 'primeng/floatlabel';
import { FileUploadModule } from 'primeng/fileupload';
import { ToastModule } from 'primeng/toast';
import { CardModule } from 'primeng/card';
import { SellerService } from '../../../core/services/seller.service';

@Component({
  selector: 'app-seller-onboarding',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    StepperModule,
    ButtonModule,
    InputTextModule,
    TextareaModule,
    FloatLabelModule,
    FileUploadModule,
    ToastModule,
    CardModule
  ],
  providers: [MessageService],
  templateUrl: './seller-onboarding.html'
})
export class SellerOnboardingComponent {
  profileForm: FormGroup;
  documents: File[] = [];
  logo: File | null = null;
  logoPreview: string | null = null;
  loading = false;

  constructor(
    private fb: FormBuilder,
    private sellerService: SellerService,
    private router: Router,
    private messageService: MessageService
  ) {
    this.profileForm = this.fb.group({
      companyName: ['', Validators.required],
      description: ['', Validators.required],
      contactPhone: ['', Validators.required],
      contactEmail: ['', [Validators.required, Validators.email]],
      contactAddress: ['']
    });
  }

  onLogoSelect(event: any): void {
    const file = event.files?.[0];
    if (file) {
      this.logo = file;
      const reader = new FileReader();
      reader.onload = () => this.logoPreview = reader.result as string;
      reader.readAsDataURL(file);
    }
  }

  onLogoRemove(): void {
    this.logo = null;
    this.logoPreview = null;
  }

  onDocumentsSelect(event: any): void {
    this.documents = [...this.documents, ...event.files];
  }

  onDocumentRemove(event: any): void {
    this.documents = this.documents.filter(d => d !== event.file);
  }

  onDocumentsClear(): void {
    this.documents = [];
  }

  submit(): void {
    if (this.profileForm.invalid) return;

    this.loading = true;
    const formData = new FormData();
    const profile = this.profileForm.value;

    formData.append('companyName', profile.companyName);
    formData.append('description', profile.description);
    formData.append('contactPhone', profile.contactPhone);
    formData.append('contactEmail', profile.contactEmail);
    if (profile.contactAddress) {
      formData.append('contactAddress', profile.contactAddress);
    }
    if (this.logo) {
      formData.append('logo', this.logo);
    }
    this.documents.forEach(doc => formData.append('documents', doc));

    this.sellerService.register(formData).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Onboarding Complete',
          detail: 'Your seller profile has been submitted for review.',
          life: 5000
        });
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 2000);
      },
      error: (err) => {
        this.loading = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Submission Failed',
          detail: err.error?.error || 'Could not submit your profile.'
        });
      }
    });
  }
}
