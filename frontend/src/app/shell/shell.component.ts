import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { AuthService } from '../core/auth/auth.service';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatIconModule, MatButtonModule],
  template: `
    <div class="app-menubar">
      <span class="app-title">Jewellery Management System</span>
      <nav class="nav-links">
        <a routerLink="/stone-purchase" routerLinkActive="active"
           [routerLinkActiveOptions]="{ exact: true }">Stone Purchase</a>
        <a routerLink="/reports" routerLinkActive="active">
          <mat-icon class="nav-icon">assessment</mat-icon>Reports
        </a>
      </nav>
      <span class="spacer"></span>
      <span class="user-info">{{ auth.currentUser()?.username }}</span>
      <button mat-icon-button (click)="auth.logout()" title="Logout" aria-label="Logout">
        <mat-icon>logout</mat-icon>
      </button>
    </div>
    <div class="app-body">
      <router-outlet />
    </div>
  `,
  styles: [`
    :host { display: flex; flex-direction: column; height: 100vh; overflow: hidden; }
    .app-menubar {
      background: #4f46e5;
      color: white;
      height: 32px;
      min-height: 32px;
      padding: 0 12px;
      display: flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;
      box-shadow: 0 1px 3px rgba(0,0,0,.18);
    }
    .app-title {
      font-weight: 600;
      font-size: 12.5px;
      letter-spacing: -0.01em;
      font-family: 'Inter', system-ui, sans-serif;
    }
    .spacer { flex: 1; }
    .nav-links {
      display: flex;
      gap: 4px;
      margin-left: 16px;
    }
    .nav-links a {
      color: rgba(255,255,255,0.85);
      text-decoration: none;
      padding: 4px 10px;
      border-radius: 4px;
      font-size: 12px;
      font-family: 'Inter', system-ui, sans-serif;
      transition: background 0.12s, color 0.12s;
    }
    .nav-links a:hover { background: rgba(255,255,255,0.12); color: white; }
    .nav-links a.active { background: rgba(255,255,255,0.18); color: white; }
    .nav-links a { display: inline-flex; align-items: center; gap: 4px; }
    .nav-icon { font-size: 14px; width: 14px; height: 14px; line-height: 14px; }
    .user-info {
      font-size: 11.5px;
      opacity: 0.85;
      font-family: 'Inter', system-ui, sans-serif;
    }
    button[mat-icon-button] {
      width: 28px; height: 28px; line-height: 28px;
      color: white; opacity: 0.8;
    }
    button[mat-icon-button]:hover { opacity: 1; background: rgba(255,255,255,.12); border-radius: 4px; }
    .app-body {
      flex: 1;
      background: #f1f5f9;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
  `],
})
export class ShellComponent {
  constructor(public auth: AuthService) {}
}
