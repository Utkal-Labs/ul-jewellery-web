import { Component, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatCardModule],
  template: `
    <div class="login-wrapper">
      <mat-card class="login-card">
        <mat-card-header>
          <mat-card-title>Nimbus Jewellery Management</mat-card-title>
          <mat-card-subtitle>Please sign in to continue</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <form [formGroup]="form" (ngSubmit)="onLogin()">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Username</mat-label>
              <input matInput formControlName="username" autocomplete="username" />
            </mat-form-field>
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Password</mat-label>
              <input matInput type="password" formControlName="password" autocomplete="current-password" />
            </mat-form-field>
            @if (error()) {
              <p class="error-msg">{{ error() }}</p>
            }
            <button mat-raised-button color="primary" type="submit" [disabled]="form.invalid" class="full-width">
              Login
            </button>
          </form>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .login-wrapper { display:flex; justify-content:center; align-items:center; height:100vh; background:#003366; }
    .login-card { width:360px; padding:16px; }
    .full-width { width:100%; margin-bottom:12px; display:block; }
    .error-msg { color:red; font-size:13px; margin-bottom:8px; }
    mat-card-title { font-size:16px; color:#003366; }
  `],
})
export class LoginComponent {
  form = this.fb.group({
    username: ['', Validators.required],
    password: ['', Validators.required],
  });
  error = signal('');

  constructor(private fb: FormBuilder, private auth: AuthService) {}

  onLogin() {
    const { username, password } = this.form.value;
    this.auth.login(username!, password!).subscribe({
      error: () => this.error.set('Invalid username or password'),
    });
  }
}
