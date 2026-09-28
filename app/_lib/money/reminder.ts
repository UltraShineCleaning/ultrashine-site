import type { JobberInvoice } from '../jobberClient';

/**
 * The message Money → "Copy reminder" puts on the clipboard. The owner pastes
 * it to the client themselves — nothing is sent automatically.
 *
 * Kept factual: we don't know how each client pays, so it offers to resend
 * the invoice rather than promising a payment link. No owner names.
 */
const money = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

/** "Sep 16" — read in UTC because Jobber sends due dates as midnight UTC. */
export function shortDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

export function reminderText(inv: JobberInvoice): string {
  const first = inv.clientName.trim().split(/\s+/)[0] || 'there';
  const num = inv.invoiceNumber ? `invoice #${inv.invoiceNumber}` : 'your invoice';
  const due = shortDate(inv.dueDate);
  const bal = money(inv.balance);
  const amount = inv.paid > 0 && inv.paid < inv.total ? ` (${bal} left after your payment — thank you for that!)` : ` (${bal})`;
  return `Hi ${first}! Just a friendly reminder that ${num}${amount} from Ultra Shine Cleaning ${due ? `was due ${due}` : 'is still open'}. If you'd like us to resend it, just reply here. Thank you so much!`;
}
