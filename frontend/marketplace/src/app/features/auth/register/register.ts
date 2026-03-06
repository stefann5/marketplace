import { Component } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { FloatLabelModule } from 'primeng/floatlabel';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { SelectButtonModule } from 'primeng/selectbutton';
import { ToastModule } from 'primeng/toast';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    InputTextModule,
    PasswordModule,
    ButtonModule,
    FloatLabelModule,
    SelectButtonModule,
    CardModule,
    ToastModule
  ],
  providers: [MessageService],
  templateUrl: './register.html'
})
export class RegisterComponent {
  registerForm: FormGroup;
  loading = false;

  roleOptions = [
    { label: 'Buy', value: 'BUYER' },
    { label: 'Sell', value: 'SELLER' }
  ];

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private messageService: MessageService
  ) {
    this.registerForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
      confirmPassword: ['', Validators.required],
      role: ['BUYER', Validators.required]
    }, { validators: this.passwordMatchValidator });
  }

  private passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('password')?.value;
    const confirmPassword = control.get('confirmPassword')?.value;
    return password === confirmPassword ? null : { passwordMismatch: true };
  }

  onSubmit(): void {
    if (this.registerForm.invalid) return;

    this.loading = true;
    const { email, password, confirmPassword, role } = this.registerForm.value;

    this.authService.register(email, password, confirmPassword, role).subscribe({
      next: (res) => {
        if (res.sellerStatus === 'PENDING') {
          this.loading = false;
          this.messageService.add({
            severity: 'info',
            summary: 'Account Created',
            detail: 'Your seller account is pending admin approval. You can log in once approved.',
            life: 5000
          });
          setTimeout(() => this.router.navigate(['/login']), 3000);
        } else {
          this.authService.storeTokens(res);
          this.router.navigate(['/']);
        }
      },
      error: (err) => {
        this.loading = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Registration Failed',
          detail: err.error?.error || 'Could not create account.'
        });
      }
    });
  }
}
