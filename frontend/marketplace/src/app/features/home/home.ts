import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-home',
  standalone: true,
  templateUrl: './home.html'
})
export class HomeComponent implements OnInit {
  constructor(private router: Router, private authService: AuthService) {}

  ngOnInit(): void {
    const role = this.authService.getUserRole();
    if (role === 'SELLER') {
      this.router.navigate(['/dashboard/products']);
    } else {
      this.router.navigate(['/products']);
    }
  }
}
