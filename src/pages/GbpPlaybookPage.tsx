import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { SHOP } from '../config/shopBrand';
import '../styles/publicLanding.css';

const STORAGE_KEY = 'la2lube-gbp-checklist';

type CheckItem = { id: string; label: string };

const gbpSections: { title: string; items: CheckItem[] }[] = [
  {
    title: 'Claim & verify Google Business Profile',
    items: [
      { id: 'gbp-1', label: 'Search Google for your shop name — claim or create the listing' },
      { id: 'gbp-2', label: 'Use exact legal business name (no keyword stuffing)' },
      { id: 'gbp-3', label: 'NAP matches everywhere: ' + SHOP.fullAddress + ' · ' + SHOP.phoneDisplay },
      { id: 'gbp-4', label: 'Primary category: Oil change service (add Quick lube, Auto repair as secondary if accurate)' },
      { id: 'gbp-5', label: 'Verify via postcard or video — complete verification' },
      { id: 'gbp-6', label: 'Set service area: ' + SHOP.city + ' + ' + SHOP.parish },
    ],
  },
  {
    title: 'Photos that convert (real, not stock)',
    items: [
      { id: 'ph-1', label: 'Exterior sign and entrance — daylight' },
      { id: 'ph-2', label: 'Bay floor with a vehicle in service (blur plates if needed)' },
      { id: 'ph-3', label: 'Waiting area — clean, drinks, A/C visible' },
      { id: 'ph-4', label: 'Team photo — names in caption' },
      { id: 'ph-5', label: 'Owner at counter or greeting customers' },
    ],
  },
  {
    title: 'Review engine (systematic)',
    items: [
      { id: 'rv-1', label: 'Ask happy customers in person: “Would you mind leaving us a Google review?”' },
      { id: 'rv-2', label: 'Send SMS within 24h with direct review link (replace URL in shopBrand.ts first)' },
      { id: 'rv-3', label: 'Respond to every review within 48h — thank specifics, address concerns' },
      { id: 'rv-4', label: 'Never incentivize reviews with discounts (against Google policy)' },
    ],
  },
];

const reviewScripts = {
  inPerson:
    '“We’re a small shop — Google reviews help neighbors find us. If we earned five stars today, would you mind tapping a quick review? I can text you the link.”',
  sms: `Hi — thanks for visiting ${SHOP.name} today. If we took good care of you, a Google review helps other ${SHOP.parish} drivers find us: [YOUR_REVIEW_LINK]`,
};

function loadChecked(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Record<string, boolean>;
  } catch {
    /* ignore */
  }
  return {};
}

export default function GbpPlaybookPage() {
  const [checked, setChecked] = useState<Record<string, boolean>>(loadChecked);

  useEffect(() => {
    document.title = `Get found online | ${SHOP.name}`;
    return () => {
      document.title = SHOP.name;
    };
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(checked));
  }, [checked]);

  const toggle = (id: string) => {
    setChecked((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="public-landing">
      <header className="pl-topbar">
        <Link to="/" className="pl-logo" style={{ textDecoration: 'none' }}>
          ← Back to site
        </Link>
        <Link className="pl-btn pl-btn-secondary" to="/shop" style={{ minHeight: '44px', padding: '0 16px' }}>
          Shop app
        </Link>
      </header>

      <div className="pl-container" style={{ paddingBottom: '48px' }}>
        <section className="pl-hero" style={{ textAlign: 'left' }}>
          <span className="pl-badge">Phase 1 — Starting from zero online</span>
          <h1 style={{ maxWidth: 'none', textAlign: 'left' }}>Google Business Profile & reviews playbook</h1>
          <p className="pl-hero-sub" style={{ marginLeft: 0, maxWidth: '52ch', textAlign: 'left' }}>
            Work through this checklist before you expect the website to carry weight. Your Profile is often the first
            thing locals see — sometimes before a website exists at all.
          </p>
        </section>

        {gbpSections.map((section) => (
          <section key={section.title} className="pl-section" style={{ paddingTop: '24px' }}>
            <h2>{section.title}</h2>
            <div className="pl-card" style={{ marginTop: '16px' }}>
              {section.items.map((item) => (
                <label
                  key={item.id}
                  className="pl-gbp-item"
                  style={{
                    display: 'flex',
                    gap: '12px',
                    alignItems: 'flex-start',
                    padding: '12px 0',
                    borderBottom: '1px solid var(--pl-border)',
                    cursor: 'pointer',
                    fontSize: '0.95rem',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={!!checked[item.id]}
                    onChange={() => toggle(item.id)}
                    style={{ marginTop: '4px', width: '18px', height: '18px', accentColor: 'var(--pl-gold)' }}
                  />
                  <span>{item.label}</span>
                </label>
              ))}
            </div>
          </section>
        ))}

        <section className="pl-section">
          <h2>Review request scripts</h2>
          <p className="pl-section-lead">Copy, adapt to your voice, stay authentic.</p>
          <div className="pl-card">
            <p style={{ fontWeight: 700, marginBottom: '8px', color: 'var(--pl-gold)' }}>In person</p>
            <p style={{ color: 'var(--pl-muted)', fontSize: '0.95rem' }}>{reviewScripts.inPerson}</p>
            <p style={{ fontWeight: 700, margin: '20px 0 8px', color: 'var(--pl-gold)' }}>SMS template</p>
            <p style={{ color: 'var(--pl-muted)', fontSize: '0.95rem', whiteSpace: 'pre-wrap' }}>{reviewScripts.sms}</p>
          </div>
        </section>

        <section className="pl-section">
          <h2>Next step</h2>
          <p className="pl-section-lead">
            When your Profile has photos and a few real reviews, your public site (pricing + story) reinforces trust.
          </p>
          <div className="pl-hero-cta" style={{ justifyContent: 'flex-start' }}>
            <Link className="pl-btn pl-btn-primary" to="/">
              View customer-facing site
            </Link>
            <Link className="pl-btn pl-btn-secondary" to="/shop">
              Open shop app
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
