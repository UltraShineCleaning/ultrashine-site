'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from '../page.module.css';

const FAQS = [
  {
    q: "What's the difference between Regular and Deep Cleaning?",
    a: "Regular Cleaning covers routine upkeep — kitchen counters, sinks, appliance exteriors, bathrooms, dusting, vacuuming, and tidying living areas. Deep Cleaning includes all regular tasks plus more intensive work — ceiling fan blades, light fixtures, blinds, furniture, scrubbing stovetops, cabinet fronts, tiles, vacuuming crevices, and polishing mirrors.",
  },
  {
    q: 'When should I choose Regular vs. Deep Cleaning?',
    a: "Choose Regular for ongoing maintenance (weekly or bi-weekly). Choose Deep if it's been a long time since your last professional clean, after renovations, before guests arrive, or anytime you want a more thorough reset of your space.",
  },
  {
    q: 'How can I pay?',
    a: "After the service, you'll receive an invoice by email or phone. Payment options include credit/debit card via the invoice link, Zelle, or Venmo. We do not accept cash or checks.",
  },
  {
    q: 'Why choose Ultra Shine Cleaning?',
    a: "We're a local, family-owned company serving Boca Raton and the surrounding areas of Palm Beach and Broward County. Our team is fully insured, professionally trained, and background-checked. We offer flexible scheduling, transparent pricing, and easy online booking.",
  },
  {
    q: 'What makes Ultra Shine Cleaning stand out?',
    a: 'We provide Regular, Deep, Move-In/Out, Commercial, and Post-Construction cleaning, follow detailed checklists for thoroughness, offer automated invoicing with multiple payment options, and employ vetted, insured teams for dependable service every visit.',
  },
  {
    q: 'Do you use pet-friendly products?',
    a: 'Yes. We use products that are safe for pets and will accommodate any specific sensitivities or preferences if you let us know in advance.',
  },
  {
    q: 'Do I have to be home during the cleaning?',
    a: "No, being home is optional. Many clients provide access instructions and return to a freshly cleaned home. We'll handle the rest.",
  },
  {
    q: 'Can you use my own cleaning products?',
    a: "If you prefer specific products or brands, tell us in advance and we'll use them. We can also provide a list of recommended products for you to purchase (used exclusively in your home), and we always bring additional supplies as needed.",
  },
  {
    q: 'How do you provide a quote?',
    a: "Estimates are based on your home's square footage, number of bedrooms and bathrooms, and the type of cleaning (Regular, Deep, Move-In/Out, etc.) — to produce a tailored, transparent price within an hour of your request.",
  },
];

export default function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className={styles.faq}>
      <div className={styles.faqGrid}>
        <div className={styles.faqHead}>
          <p className="eyebrow">COMMON QUESTIONS</p>
          <h2 className={`fraunces ${styles.sectionHeadline}`} style={{ fontSize: 64 }}>
            Answers,<br />before <em>you ask.</em>
          </h2>
          <p className={`fraunces ${styles.faqHeadBody}`}>
            Everything we wish every new client already knew. Don't see yours? Just text us — we answer fast.
          </p>
          <div
            className={styles.faqImage}
            style={{ backgroundImage: 'url(/images/flow_bathroom_sunset.jpg)' }}
          >
            <div className={styles.faqImageTag}>
              <div className={styles.photoTagEye}>DETAIL · CARE · TRUST</div>
              <div className={`fraunces ${styles.photoTagH}`}>Every corner.<br />Every visit.</div>
            </div>
          </div>
        </div>
        <div className={styles.faqList}>
          {FAQS.map((item, i) => {
            const open = openIndex === i;
            return (
              <motion.div
                key={i}
                className={`${styles.faqItem} ${open ? styles.faqItemOpen : ''}`}
                onClick={() => setOpenIndex(open ? null : i)}
                whileHover={{ y: -2 }}
                transition={{ duration: 0.2 }}
                layout
              >
                <div className={`fraunces ${styles.faqQ}`}>
                  <span>{item.q}</span>
                  <motion.span
                    className={styles.faqQIcon}
                    animate={{ rotate: open ? 180 : 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    {open ? '−' : '+'}
                  </motion.span>
                </div>
                <AnimatePresence initial={false}>
                  {open && (
                    <motion.div
                      key="content"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                      style={{ overflow: 'hidden' }}
                    >
                      <div className={styles.faqA}>{item.a}</div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
