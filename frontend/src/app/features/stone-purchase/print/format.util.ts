// Helpers for the Stone Purchase Voucher report.
// Indian number formatting + amount-to-words conversion.

/** 1234567.5 → "12,34,567.50" (Indian comma grouping, 2 decimals) */
export function inrNumber(n: number | null | undefined, decimals = 2): string {
  const v = Number(n ?? 0);
  if (!isFinite(v)) return '0.00';
  const sign = v < 0 ? '-' : '';
  const [intPart, decPart] = Math.abs(v).toFixed(decimals).split('.');
  let lastThree = intPart.slice(-3);
  const rest = intPart.slice(0, -3);
  if (rest.length) lastThree = ',' + lastThree;
  const grouped = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + lastThree;
  return sign + grouped + (decPart ? '.' + decPart : '');
}

/** ISO date / Date → "DD/MM/YYYY" */
export function ddmmyyyy(d: Date | string | null | undefined): string {
  if (!d) return '';
  const date = typeof d === 'string' ? new Date(d) : d;
  if (isNaN(date.getTime())) return '';
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

// ── Amount in Indian English words ────────────────────────────────────────
// 1400 → "Rupees One Thousand Four Hundred Only"
// 1400.50 → "Rupees One Thousand Four Hundred and Paise Fifty Only"

const ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen',
  'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen',
];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function twoDigits(n: number): string {
  if (n < 20) return ONES[n];
  const t = Math.floor(n / 10);
  const o = n % 10;
  return TENS[t] + (o ? ' ' + ONES[o] : '');
}

function threeDigits(n: number): string {
  const h = Math.floor(n / 100);
  const r = n % 100;
  const parts: string[] = [];
  if (h) parts.push(ONES[h] + ' Hundred');
  if (r) parts.push(twoDigits(r));
  return parts.join(' ');
}

/** Convert a non-negative integer ≤ 999,99,99,999 to Indian-system words. */
function intToIndianWords(n: number): string {
  if (n === 0) return 'Zero';
  const crore   = Math.floor(n / 10000000); n %= 10000000;
  const lakh    = Math.floor(n / 100000);   n %= 100000;
  const thousand = Math.floor(n / 1000);    n %= 1000;
  const rest    = n;
  const parts: string[] = [];
  if (crore)    parts.push(twoDigits(crore) + ' Crore');
  if (lakh)     parts.push(twoDigits(lakh)  + ' Lakh');
  if (thousand) parts.push(twoDigits(thousand) + ' Thousand');
  if (rest)     parts.push(threeDigits(rest));
  return parts.join(' ').trim();
}

/** 1400.50 → "Rupees One Thousand Four Hundred and Paise Fifty Only" */
export function amountInWords(amount: number | null | undefined): string {
  const v = Math.abs(Number(amount ?? 0));
  const rupees = Math.floor(v);
  const paise  = Math.round((v - rupees) * 100);
  const rupeeWords = intToIndianWords(rupees);
  if (paise === 0) return `Rupees ${rupeeWords} Only`;
  return `Rupees ${rupeeWords} and Paise ${twoDigits(paise)} Only`;
}

/** UOM integer/string → display unit */
export function uomLabel(uom: string | number | null | undefined): string {
  const map: Record<string, string> = {
    '1': 'Ct', '2': 'Gm', '3': 'Rt', '4': 'Cn',
    'Ct.': 'Ct', 'Gm.': 'Gm', 'Rt.': 'Rt', 'Cn.': 'Cn',
    'Ct': 'Ct', 'Gm': 'Gm', 'Rt': 'Rt', 'Cn': 'Cn',
  };
  const key = String(uom ?? '').trim();
  return map[key] ?? key;
}
