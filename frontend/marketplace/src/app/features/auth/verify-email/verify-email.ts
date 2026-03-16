import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { FloatLabelModule } from 'primeng/floatlabel';
import { InputTextModule } from 'primeng/inputtext';
import { ToastModule } from 'primeng/toast';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, InputTextModule, ButtonModule, FloatLabelModule, CardModule, ToastModule],
  providers: [MessageService],
  templateUrl: './verify-email.html'
})
export class VerifyEmailComponent implements OnInit {
  form: FormGroup;
  loading = false;
  resending = false;
  nextUrl = '/login';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router,
    private messageService: MessageService
  ) {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      code: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6)]]
    });
  }

  ngOnInit(): void {
    const email = this.route.snapshot.queryParamMap.get('email');
    const next = this.route.snapshot.queryParamMap.get('next');
    if (email) {
      this.form.patchValue({ email });
    }
    if (next) {
      this.nextUrl = next;
    }
  }

  submit(): void {
    if (this.form.invalid) return;
    this.loading = true;
    const { email, code } = this.form.value;
    this.authService.verifyEmail(email, code).subscribe({
      next: () => {
        this.loading = false;
        this.messageService.add({ severity: 'success', summary: 'Email verified' });
        setTimeout(() => {
          if (this.nextUrl === '/onboarding') {
            this.router.navigate(['/onboarding'], { queryParams: { email } });
            return;
          }
          this.router.navigate([this.nextUrl]);
        }, 300);
      },
      error: (err) => {
        this.loading = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Verification failed',
          detail: err.error?.error || 'Invalid or expired code.'
        });
      }
    });
  }

  resend(): void {
    const email = this.form.get('email')?.value;
    if (!email) return;
    this.resending = true;
    this.authService.resendVerification(email).subscribe({
      next: () => {
        this.resending = false;
        this.messageService.add({ severity: 'info', summary: 'Code resent' });
      },
      error: (err) => {
        this.resending = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Could not resend code',
          detail: err.error?.error || 'Please try again.'
        });
      }
    });
  }
}
