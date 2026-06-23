import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NgClass } from '@angular/common';

export type CrudMode = 'view' | 'add' | 'edit';

@Component({
  selector: 'app-crud-toolbar',
  standalone: true,
  imports: [MatButtonModule, MatIconModule, MatTooltipModule, NgClass],
  template: `
    <div class="crud-toolbar" role="toolbar" aria-label="Record actions">
      <!-- Record group -->
      <button class="tb-btn" (click)="new.emit()" [disabled]="mode === 'add' || mode === 'edit'"
              matTooltip="New (F2)" aria-label="New record">
        <mat-icon>add</mat-icon><span>New</span>
      </button>
      <button class="tb-btn" (click)="modify.emit()" [disabled]="mode !== 'view'"
              matTooltip="Modify (F3)" aria-label="Modify record">
        <mat-icon>edit</mat-icon><span>Modify</span>
      </button>
      <button class="tb-btn danger-btn" (click)="delete.emit()" [disabled]="mode !== 'view'"
              matTooltip="Delete (F4)" aria-label="Delete record">
        <mat-icon>delete_outline</mat-icon><span>Delete</span>
      </button>

      <div class="tb-sep"></div>

      <!-- Navigation group -->
      <button class="tb-btn" (click)="top.emit()" [disabled]="mode !== 'view'"
              matTooltip="First record" aria-label="First record">
        <mat-icon>first_page</mat-icon>
      </button>
      <button class="tb-btn" (click)="prior.emit()" [disabled]="mode !== 'view'"
              matTooltip="Previous record" aria-label="Previous record">
        <mat-icon>chevron_left</mat-icon>
      </button>
      <button class="tb-btn" (click)="next.emit()" [disabled]="mode !== 'view'"
              matTooltip="Next record" aria-label="Next record">
        <mat-icon>chevron_right</mat-icon>
      </button>
      <button class="tb-btn" (click)="last.emit()" [disabled]="mode !== 'view'"
              matTooltip="Last record" aria-label="Last record">
        <mat-icon>last_page</mat-icon>
      </button>

      <div class="tb-sep"></div>

      <!-- Seek -->
      <button class="tb-btn" (click)="seek.emit()" [disabled]="mode !== 'view'"
              matTooltip="Search (F7)" aria-label="Search">
        <mat-icon>search</mat-icon><span>Seek</span>
      </button>

      <div class="tb-sep"></div>

      <!-- Save / Discard -->
      <button class="tb-btn save-btn" (click)="save.emit()" [disabled]="mode === 'view' || saving"
              matTooltip="Save (F10)" aria-label="Save">
        <mat-icon>save</mat-icon><span>{{ saving ? 'Saving…' : 'Save' }}</span>
      </button>
      <button class="tb-btn" (click)="discard.emit()" [disabled]="mode === 'view'"
              matTooltip="Discard (Esc)" aria-label="Discard changes">
        <mat-icon>undo</mat-icon><span>Discard</span>
      </button>

      <div class="tb-sep"></div>

      <!-- Print / Close / Cancel -->
      <button class="tb-btn" (click)="print.emit()" [disabled]="mode !== 'view'"
              matTooltip="Print" aria-label="Print">
        <mat-icon>print</mat-icon><span>Print</span>
      </button>
      <button class="tb-btn" (click)="close.emit()"
              matTooltip="Back to menu" aria-label="Back to menu">
        <mat-icon>arrow_back</mat-icon><span>Back</span>
      </button>
      <button class="tb-btn danger-btn" (click)="cancel.emit()" [disabled]="mode !== 'view'"
              matTooltip="Cancel voucher" aria-label="Cancel voucher">
        <mat-icon>block</mat-icon><span>Cancel</span>
      </button>
    </div>
  `,
  styles: [`
    :host { display: block; flex-shrink: 0; }
    .crud-toolbar {
      display: flex;
      align-items: center;
      background: #ffffff;
      border-bottom: 1px solid #e2e8f0;
      padding: 0 10px;
      gap: 1px;
      height: 34px;
    }
    .tb-btn {
      display: flex;
      flex-direction: row;
      align-items: center;
      justify-content: center;
      gap: 4px;
      background: transparent;
      border: 1px solid transparent;
      border-radius: 5px;
      cursor: pointer;
      padding: 0 8px;
      height: 26px;
      font-size: 11.5px;
      font-family: 'Inter', system-ui, sans-serif;
      color: #475569;
      white-space: nowrap;
      transition: background 0.12s, color 0.12s, border-color 0.12s;
      outline: none;
    }
    .tb-btn:focus-visible {
      border-color: #4f46e5;
      box-shadow: 0 0 0 2px #eef2ff;
    }
    .tb-btn:hover:not([disabled]) {
      background: #f1f5f9;
      color: #1e293b;
    }
    .tb-btn:active:not([disabled]) {
      background: #eef2ff;
      color: #4f46e5;
    }
    .tb-btn[disabled] {
      color: #cbd5e1;
      cursor: default;
    }
    .tb-btn mat-icon {
      font-size: 15px;
      height: 15px;
      width: 15px;
      line-height: 15px;
      flex-shrink: 0;
    }
    .tb-btn img { display: none; }
    .tb-sep {
      width: 1px;
      background: #e2e8f0;
      height: 18px;
      margin: 0 4px;
      flex-shrink: 0;
    }
    .tb-btn.save-btn:not([disabled]) {
      background: #4f46e5;
      color: white;
      border-color: #4338ca;
    }
    .tb-btn.save-btn:not([disabled]):hover {
      background: #4338ca;
    }
    .tb-btn.save-btn:not([disabled]):focus-visible {
      box-shadow: 0 0 0 2px #eef2ff;
    }
    .tb-btn.danger-btn:not([disabled]):hover {
      background: #fef2f2;
      color: #dc2626;
    }
  `],
})
export class CrudToolbarComponent {
  @Input() mode: CrudMode = 'view';
  @Input() saving = false;
  @Output() new = new EventEmitter<void>();
  @Output() modify = new EventEmitter<void>();
  @Output() delete = new EventEmitter<void>();
  @Output() top = new EventEmitter<void>();
  @Output() prior = new EventEmitter<void>();
  @Output() next = new EventEmitter<void>();
  @Output() last = new EventEmitter<void>();
  @Output() seek = new EventEmitter<void>();
  @Output() save = new EventEmitter<void>();
  @Output() discard = new EventEmitter<void>();
  @Output() print = new EventEmitter<void>();
  @Output() close = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();
}
