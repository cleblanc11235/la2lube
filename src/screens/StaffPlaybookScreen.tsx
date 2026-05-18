import React from 'react';
import { SHOP } from '../config/shopBrand';

export default function StaffPlaybookScreen() {
  return (
    <div style={styles.wrap}>
      <h1 style={styles.title}>Staff guide — honesty & fair value</h1>
      <p style={styles.lead}>
        Louisiana reviewers reward <strong>speed</strong>, <strong>honesty</strong>, and <strong>fair</strong> pricing.
        Upselling is the #1 complaint at chains — our edge is recommendations customers believe.
      </p>

      <section style={styles.card}>
        <h2 style={styles.h2}>Opening line (check-in)</h2>
        <ul style={styles.list}>
          <li>“We’ll get you in and out in about 15 minutes for an oil change — I’ll confirm the package and price before we start.”</li>
          <li>“If something can wait, we’ll say so. We don’t get paid to upsell you.”</li>
        </ul>
      </section>

      <section style={styles.card}>
        <h2 style={styles.h2}>Presenting recommendations</h2>
        <ul style={styles.list}>
          <li>Show the dipstick, filter, or readout — tie advice to <em>what you saw</em>, not quotas.</li>
          <li>Offer priority: safety first, then manufacturer intervals, then “nice to have.”</li>
          <li>If they decline, thank them and move on — no second pitch.</li>
        </ul>
      </section>

      <section style={styles.card}>
        <h2 style={styles.h2}>Bundled value (without sounding salesy)</h2>
        <p style={styles.p}>
          Mention included value naturally: “Fluid top-off and tire pressure are part of the visit.” Refer to waiting-area
          amenities if {SHOP.name} provides them.
        </p>
      </section>

      <section style={styles.card}>
        <h2 style={styles.h2}>Lagniappe Club</h2>
        <p style={styles.p}>{SHOP.lagniappeClub}</p>
      </section>

      <section style={styles.card}>
        <h2 style={styles.h2}>When a customer is upset about price</h2>
        <ul style={styles.list}>
          <li>Repeat the line items and show the menu price — no surprises.</li>
          <li>Offer to prioritize: “We can do oil today and schedule filters next visit if that helps.”</li>
        </ul>
      </section>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    maxWidth: '640px',
    margin: '0 auto',
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: 700,
    marginBottom: '12px',
    color: 'var(--text)',
  },
  lead: {
    color: 'var(--muted)',
    marginBottom: '24px',
    lineHeight: 1.6,
  },
  card: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-card)',
    padding: '20px',
    marginBottom: '16px',
  },
  h2: {
    fontSize: '1.05rem',
    fontWeight: 700,
    color: 'var(--amber)',
    marginBottom: '12px',
  },
  list: {
    margin: 0,
    paddingLeft: '20px',
    color: 'var(--text)',
    lineHeight: 1.6,
  },
  p: {
    margin: 0,
    color: 'var(--text)',
    lineHeight: 1.6,
  },
};
