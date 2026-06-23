import { Directive, ElementRef, HostListener } from '@angular/core';

const FOCUSABLE = [
  'input:not([disabled]):not([tabindex="-1"])',
  'select:not([disabled]):not([tabindex="-1"])',
  'textarea:not([disabled]):not([tabindex="-1"])',
  'button:not([disabled]):not([tabindex="-1"])',
].join(', ');

/**
 * Prevents the browser from tabbing between the day/month/year sub-parts of a
 * date input.  Instead, Tab/Shift+Tab jump directly to the next/previous
 * focusable element in the page, matching the behaviour of every other input.
 */
@Directive({
  selector: 'input[type="date"]',
  standalone: true,
})
export class DateTabDirective {
  constructor(private el: ElementRef<HTMLInputElement>) {}

  @HostListener('keydown', ['$event'])
  onKeydown(event: KeyboardEvent) {
    if (event.key !== 'Tab') return;
    event.preventDefault();

    const all = Array.from(document.querySelectorAll<HTMLElement>(FOCUSABLE));
    const idx = all.indexOf(this.el.nativeElement);

    if (event.shiftKey) {
      if (idx > 0) all[idx - 1].focus();
    } else {
      if (idx < all.length - 1) all[idx + 1].focus();
    }
  }
}
