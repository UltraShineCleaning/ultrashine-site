/**
 * Money tab — logic checks. Run: npm run test:money
 * Checks the reminder text the "Copy reminder" button puts on the clipboard:
 * it must be polite, factual and never name the owners.
 */
export {};
const P = require('path').resolve(__dirname, '../../app/_lib');
let pass = 0, fail = 0;
const ok = (c: any, name: string) => { if (c) { pass++; } else { fail++; console.log('  ✗', name); } };

const { reminderText } = require(`${P}/money/reminder`);
const base = { id: 'i1', invoiceNumber: '1042', clientName: 'Karen Williams', status: 'past_due', issuedDate: '2026-09-04T00:00:00Z', dueDate: '2026-09-16T00:00:00Z', total: 280, balance: 280, paid: 0, daysOverdue: 12 };

const t = reminderText(base);
ok(t.startsWith('Hi Karen!'), `first name only (${t})`);
ok(t.includes('invoice #1042 ($280)'), 'number + balance');
ok(t.includes('was due Sep 16'), 'due date in UTC, no off-by-one');
ok(t.includes('Ultra Shine Cleaning'), 'business name');
ok(!/tiago|francine/i.test(t), 'no owner names');
ok(!/link|pay online|card/i.test(t), 'no promise of a payment link we may not have');

const p = reminderText({ ...base, paid: 100, balance: 180 });
ok(p.includes('$180 left after your payment'), 'partial payment wording');
const n = reminderText({ ...base, invoiceNumber: null, dueDate: null, clientName: '' });
ok(n.startsWith('Hi there!') && n.includes('your invoice') && n.includes('is still open'), `fallbacks (${n})`);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
