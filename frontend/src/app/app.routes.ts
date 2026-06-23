import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/login/login.component').then(m => m.LoginComponent),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./shell/shell.component').then(m => m.ShellComponent),
    children: [
      { path: '', redirectTo: 'stone-purchase', pathMatch: 'full' },
      {
        path: 'stone-purchase',
        loadComponent: () => import('./features/stone-purchase/stone-purchase.component')
          .then(m => m.StonePurchaseComponent),
      },
      {
        path: 'stone-purchase/:vounum/print',
        loadComponent: () =>
          import('./features/stone-purchase/print/stone-purchase-print.component')
            .then(m => m.StonePurchasePrintComponent),
      },
      {
        path: 'reports',
        loadComponent: () =>
          import('./features/reports/reports.component').then(m => m.ReportsComponent),
        children: [
          {
            path: 'stone-purchase-register',
            loadComponent: () =>
              import('./features/reports/stone-purchase-register/stone-purchase-register.component')
                .then(m => m.StonePurchaseRegisterComponent),
          },
          {
            path: 'stone-master-list',
            loadComponent: () =>
              import('./features/reports/stone-master-list/stone-master-list.component')
                .then(m => m.StoneMasterListComponent),
          },
          {
            path: 'stone-balance',
            loadComponent: () =>
              import('./features/reports/stone-balance/stone-balance.component')
                .then(m => m.StoneBalanceComponent),
          },
          {
            path: 'customer-ledger',
            loadComponent: () =>
              import('./features/reports/customer-ledger/customer-ledger.component')
                .then(m => m.CustomerLedgerComponent),
          },
        ],
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
