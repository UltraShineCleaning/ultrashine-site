'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import SiteHeader from '../_components/SiteHeader';
import SiteFooter from '../_components/SiteFooter';
import JsonLd from '../_components/JsonLd';
import styles from './page.module.css';

type FaqCategory = {
  id: string;
  label: string;
  title: string;
  questions: { q: string; a: string }[];
};

const CATEGORIES: FaqCategory[] = [
  {
    id: 'pricing',
    label: 'Pricing + Quotes',
    title: 'Pricing + quotes',
    questions: [
      {
        q: 'How much does cleaning cost?',
        a: "Every home is different — square footage, layout, number of bathrooms, condition, pets, kids, and lived-in level all change the price. That's why we don't publish a flat rate. Submit the quote form or call us, we come walk through your home, then send you a precise number. No surprises, no inflated estimates.",
      },
      {
        q: 'Why don\'t you list prices on your website?',
        a: "Because the honest answer is: it depends. A 2,000 sq ft Boca condo with no pets is a totally different job than a 4,500 sq ft Parkland home with two dogs and three kids. Companies that publish flat rates either overcharge the easy jobs or under-deliver on the hard ones. We'd rather see your space first and give you a real number.",
      },
      {
        q: 'Do you offer free estimates?',
        a: "Yes — always free, always no-obligation. We come walk through your home, ask questions, then send you a custom quote within an hour. You can take it or leave it.",
      },
      {
        q: 'Do you offer discounts for recurring cleanings?',
        a: "Yes. Bi-weekly is our most popular cadence and gets a discount over one-time pricing. Weekly is even more discounted. Talk to us when we quote — we'll show you the math.",
      },
      {
        q: 'What payment methods do you accept?',
        a: "After the cleaning we send a digital invoice. You can pay by credit/debit card via the invoice link, Zelle, or Venmo. We don't accept cash or checks.",
      },
    ],
  },
  {
    id: 'services',
    label: 'Our Services',
    title: 'Services + scope',
    questions: [
      {
        q: "What's the difference between Regular and Deep Cleaning?",
        a: "Regular Cleaning is ongoing maintenance — counters, sinks, appliance exteriors, bathrooms, dusting, vacuuming, tidying. Deep Cleaning includes all of that PLUS intensive work — ceiling fans, light fixtures, blinds slat-by-slat, scrubbing stovetops, cabinet fronts, grout, vacuum crevices, polish mirrors. First-time clients usually start with a Deep, then maintain with Regular.",
      },
      {
        q: 'How long does a clean take?',
        a: "Every home is different — square footage, layout, condition, pets, kids all change the timing. We give you a precise estimate when we walk through your space for the quote. No two homes get the same number.",
      },
      {
        q: 'How often should I have my home cleaned?',
        a: "Most clients choose bi-weekly — the sweet spot for cost vs. cleanliness. Weekly is ideal for active households (kids, pets, frequent cooking). Monthly works for tidy households who do their own light cleaning between visits. Deep cleans we recommend every 90 days on top of regular maintenance.",
      },
      {
        q: 'Do you do move-in or move-out cleanings?',
        a: "Yes. Move-In/Out is one of our 5 services. We do landlord-grade detail work — inside all cabinets, wall scuff spot-clean, blinds, window tracks, every appliance interior. Most clients get their full security deposit back.",
      },
      {
        q: 'Do you clean commercial spaces?',
        a: "Yes — offices, medical suites, salons, boutique retail. We do after-hours service so your team never sees us, COI on file, and net-30 invoicing for established accounts.",
      },
      {
        q: 'Do you do post-construction cleanup?',
        a: "Yes — drywall dust, paint specks, sticker residue, grout haze, protective film on appliances. We use HEPA vacuums + products formulated for new finishes. Several South Florida builders use us as their go-to post-construction partner.",
      },
      {
        q: 'Can I customize what gets cleaned?',
        a: "Of course. Tell us in advance what you want extra attention on or what to skip. Some clients book 'targeted deep' for just kitchen + bathrooms. Some want laundry folded or beds made. Tell us — we'll customize.",
      },
    ],
  },
  {
    id: 'team',
    label: 'Our Team',
    title: 'Our team',
    questions: [
      {
        q: 'Are your cleaners insured and bonded?',
        a: "Yes — we carry $2M general liability + workers comp + bonding. Email us and we can send a Certificate of Insurance naming you (or your property management) as additional insured.",
      },
      {
        q: 'Are your cleaners background-checked?',
        a: "Every team member, before they ever step into a client's home. We run criminal background checks + verify employment history. We've never had a complaint about trust or theft.",
      },
      {
        q: 'Are your cleaners W2 employees or contractors?',
        a: "W2 employees — not 1099 contractors. We pay them fairly, withhold taxes, provide benefits, and cover their bonding + insurance. Better-treated cleaners stay longer + do better work. It's the same reason we have low turnover.",
      },
      {
        q: 'Will the same person clean my home every time?',
        a: "For recurring clients — yes. We assign the same crew to your home long-term. They learn your space, your products, your preferences. If your usual cleaner is sick, we send someone trained on your specific home, never a random.",
      },
      {
        q: 'Do you speak Spanish?',
        a: "Yes — most of our team is bilingual English + Spanish. Many also speak Portuguese.",
      },
    ],
  },
  {
    id: 'logistics',
    label: 'Logistics',
    title: 'Booking + logistics',
    questions: [
      {
        q: 'Do I need to be home during the cleaning?',
        a: "No. Most clients give us a key code or hide a key — we lock up when we leave. Our team is bonded, insured, and background-checked. Some clients prefer to be home the first time, then leave the key after.",
      },
      {
        q: 'What time do you typically arrive?',
        a: "We give you a 1-hour arrival window when we schedule. Most cleans are between 8 AM and 4 PM weekdays. Commercial clients can request after-hours service (6 PM–7 AM).",
      },
      {
        q: 'What if I need to reschedule?',
        a: "Text us 24+ hours in advance and we'll reschedule — no fee. We're flexible. Just give us a heads up so the team can plan their day.",
      },
      {
        q: 'What if I\'m not happy with the cleaning?',
        a: "Tell us within 24 hours and we send the team back to fix it — at no charge. That's our 100% satisfaction guarantee. We'd rather come back twice than have you unhappy once.",
      },
      {
        q: 'Do you bring your own supplies?',
        a: "Yes — all cleaning chemicals, microfiber cloths, vacuums, mops. You don't need to provide anything. We use Method, Mrs Meyer's, ECOS, white vinegar — all kid + pet safe.",
      },
      {
        q: 'What if I have pets or allergies?',
        a: "All our products are pet + kid safe by default. If you have specific allergies or want us to use your own products, tell us in advance and we'll bring those instead. Let us know about any pets so the team is prepared.",
      },
    ],
  },
  {
    id: 'areas',
    label: 'Service Areas',
    title: 'Where we serve',
    questions: [
      {
        q: 'What cities do you serve?',
        a: "13 cities across Palm Beach + Broward counties: Boca Raton, Delray Beach, Boynton Beach, Lake Worth, West Palm Beach, Wellington, Parkland, Coral Springs, Fort Lauderdale, Coconut Creek, Deerfield Beach, Pompano Beach, and Margate.",
      },
      {
        q: "I'm in a city not on your list. Can you still clean for me?",
        a: "Call us anyway. We extend coverage based on demand — if you're close to one of our 13 cities we can usually route a crew. Submit a quote and we'll let you know.",
      },
      {
        q: 'Do you work in gated communities?',
        a: "Yes — many of our recurring clients are in gated/HOA communities. We have gate codes + association protocols on file for Boca West, Royal Palm, St. Andrews, Heron Bay, MiraLago, Parkland Golf, Polo Club, BallenIsles, Ibis, Mizner Country Club, and many more.",
      },
    ],
  },
];

export default function FaqPage() {
  const [open, setOpen] = useState<string | null>(null);

  // Schema markup: all categories flattened into one FAQPage entity.
  // Google can pick any question and show it as a rich snippet.
  const allQuestions = CATEGORIES.flatMap((c) => c.questions);
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: allQuestions.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  };

  return (
    <main>
      <JsonLd data={faqSchema} />
      <SiteHeader inPage={false} />

      {/* HERO */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <p className={styles.breadcrumb}>
            <Link href="/">Home</Link>
            <span> / </span>
            <span style={{ opacity: 0.8 }}>FAQ</span>
          </p>
          <p className={styles.eyebrow}>FREQUENTLY ASKED · {allQuestions.length} ANSWERS</p>
          <h1 className={styles.h1}>
            Answers, <em>before you ask</em>.
          </h1>
          <p className={styles.heroSub}>
            Everything we get asked the most — pricing, scope, our team,
            scheduling, service areas. If your question isn't here,
            text us at (561) 583-6694.
          </p>
        </div>
      </section>

      {/* JUMP NAV */}
      <div className={styles.jumpNav}>
        <div className={styles.jumpInner}>
          {CATEGORIES.map((c) => (
            <a key={c.id} href={`#${c.id}`} className={styles.jumpLink}>
              {c.label}
            </a>
          ))}
        </div>
      </div>

      {/* CATEGORIES */}
      {CATEGORIES.map((cat, ci) => (
        <section
          key={cat.id}
          id={cat.id}
          className={`${styles.section} ${ci % 2 === 1 ? styles.sectionAlt : ''}`}
        >
          <div className={styles.sectionWrap}>
            <p className={styles.sectionLabel}>{cat.label}</p>
            <h2 className={styles.sectionHead}>{cat.title}</h2>
            <div className={styles.faqList}>
              {cat.questions.map((q, i) => {
                const key = `${cat.id}-${i}`;
                const isOpen = open === key;
                return (
                  <motion.div
                    key={key}
                    className={`${styles.faqItem} ${isOpen ? styles.faqItemOpen : ''}`}
                    onClick={() => setOpen(isOpen ? null : key)}
                    layout
                  >
                    <div className={styles.faqQ}>
                      <span>{q.q}</span>
                      <span className={styles.faqQIcon}>+</span>
                    </div>
                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                          style={{ overflow: 'hidden' }}
                        >
                          <div className={styles.faqA}>{q.a}</div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>
      ))}

      {/* STILL HAVE QUESTIONS CTA */}
      <section className={styles.cta}>
        <div className={styles.ctaCard}>
          <h2 className={styles.ctaHead}>
            Still have <em>questions</em>?
          </h2>
          <p className={styles.ctaBody}>
            Text or call us anytime — we usually reply in under an hour
            during business hours, even faster for new client questions.
          </p>
          <div className={styles.ctaRow}>
            <a href="tel:5615836694" className="btn btn-coral">
              Call (561) 583-6694
            </a>
            <Link href="/quote" className="btn btn-secondary" style={{ color: 'var(--cream)', borderColor: 'var(--cream)' }}>
              Request Free Quote
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
