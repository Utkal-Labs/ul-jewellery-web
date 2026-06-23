import {
  Component, Input, Output, EventEmitter, OnInit,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { FilterDef } from './report-types';

/**
 * Generic report filter card.
 *
 *  - Filters are described declaratively via `[filters]`.
 *  - State is mirrored into URL query params on each Proceed so that
 *    navigating away and back restores the filter automatically.
 *  - Emits `(proceed)` with the filter object on submit and on auto-restore.
 */
@Component({
  selector: 'app-report-filter-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule],
  template: `
    <form class="filter-card" [formGroup]="form" (ngSubmit)="emit()">
      <div class="filter-grid">
        @for (f of filters; track f.key) {
          <label [class]="'col-' + (f.span || 1)">
            <span>{{ f.label }}</span>

            @switch (f.type) {
              @case ('date') {
                <input type="date" [formControlName]="f.key" />
              }
              @case ('number') {
                <input type="number"
                       [formControlName]="f.key"
                       [min]="f.min ?? 0"
                       [step]="f.step ?? 1"
                       [placeholder]="f.placeholder ?? ''" />
              }
              @case ('select') {
                <select [formControlName]="f.key">
                  @for (o of (f.options ?? []); track o.value) {
                    <option [value]="o.value">{{ o.label }}</option>
                  }
                </select>
              }
              @default {
                <input type="text"
                       [formControlName]="f.key"
                       [placeholder]="f.placeholder ?? ''" />
              }
            }
          </label>
        }
      </div>

      <div class="filter-actions">
        <button type="button" class="btn ghost" (click)="onClear()">
          <mat-icon>refresh</mat-icon> Clear
        </button>
        <button type="submit" class="btn primary" [disabled]="loading">
          <mat-icon>{{ loading ? 'hourglass_empty' : 'search' }}</mat-icon>
          {{ loading ? 'Loading…' : 'Proceed' }}
        </button>
      </div>
    </form>
  `,
  styleUrls: ['./report-filter-card.component.scss'],
})
export class ReportFilterCardComponent implements OnInit {
  @Input({ required: true }) filters!: FilterDef[];
  @Input() loading = false;
  /**
   * If true (default), the filter writes itself into the URL query string
   * on each Proceed and reads it back on init. Set to false for transient
   * filters that shouldn't bookmark.
   */
  @Input() persistInUrl = true;
  @Input() autoRunOnInit = true;

  @Output() proceed = new EventEmitter<Record<string, any>>();

  form!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
  ) {}

  ngOnInit() {
    const qp = this.route.snapshot.queryParamMap;
    const initial: Record<string, any> = {};
    for (const f of this.filters) {
      const urlVal = this.persistInUrl ? qp.get(f.key) : null;
      initial[f.key] = urlVal != null
        ? this.coerce(urlVal, f)
        : (f.defaultValue ?? this.empty(f));
    }
    this.form = this.fb.group(initial);

    if (this.autoRunOnInit && (this.persistInUrl && qp.keys.length || this.hasAnyValue())) {
      this.emit();
    }
  }

  emit() {
    const v = this.form.getRawValue();
    if (this.persistInUrl) this.writeUrl(v);
    this.proceed.emit(v);
  }

  onClear() {
    const reset: Record<string, any> = {};
    for (const f of this.filters) reset[f.key] = f.defaultValue ?? this.empty(f);
    this.form.reset(reset);
    if (this.persistInUrl) {
      this.router.navigate([], { relativeTo: this.route, queryParams: {}, replaceUrl: true });
    }
    this.proceed.emit({ __cleared__: true });
  }

  private writeUrl(v: Record<string, any>) {
    const params: Record<string, string> = {};
    for (const [k, val] of Object.entries(v)) {
      if (val !== '' && val !== null && val !== undefined && val !== 0) {
        params[k] = String(val);
      }
    }
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: params,
      replaceUrl: true,
    });
  }

  private coerce(raw: string, f: FilterDef): string | number {
    return f.type === 'number' ? +raw : raw;
  }
  private empty(f: FilterDef): string | number {
    return f.type === 'number' ? 0 : '';
  }
  private hasAnyValue(): boolean {
    return Object.values(this.form.getRawValue()).some(v => v !== '' && v !== 0 && v != null);
  }
}
