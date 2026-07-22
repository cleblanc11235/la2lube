import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { SHOP } from '../config/shopBrand';
import { serviceMenu } from '../data/mockData';
import '../styles/publicLanding.css';

const oilServices = serviceMenu.filter((s) => s.category === 'oilchange');

export default function PublicLandingPage() {
  useEffect(() => {
    document.title = `${SHOP.name} | ${SHOP.city}, ${SHOP.state} — Honest oil changes`;
    const desc = SHOP.metaDescription;
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'description');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', desc);

    const ensureMeta = (attr: string, key: string, content: string) => {
      let m = document.querySelector(`meta[${attr}="${key}"]`);
      if (!m) {
        m = document.createElement('meta');
        m.setAttribute(attr, key);
        document.head.appendChild(m);
      }
      m.setAttribute('content', content);
    };
    ensureMeta('property', 'og:title', `${SHOP.name} | ${SHOP.city}, ${SHOP.state}`);
    ensureMeta('property', 'og:description', desc);
    ensureMeta('property', 'og:type', 'business.business');
    ensureMeta('name', 'twitter:card', 'summary_large_image');

    const ld = {
      '@context': 'https://schema.org',
      '@type': 'AutomotiveRepair',
      name: SHOP.name,
      telephone: SHOP.phoneDisplay,
      address: {
        '@type': 'PostalAddress',
        streetAddress: SHOP.addressLine,
        addressLocality: SHOP.city,
        addressRegion: SHOP.state,
        postalCode: SHOP.zip,
        addressCountry: 'US',
      },
      areaServed: { '@type': 'AdministrativeArea', name: SHOP.parish },
      priceRange: '$$',
      openingHoursSpecification: [
        {
          '@type': 'OpeningHoursSpecification',
          dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
          opens: '08:00',
          closes: '17:00',
        },
        {
          '@type': 'OpeningHoursSpecification',
          dayOfWeek: 'Saturday',
          opens: '08:00',
          closes: '12:00',
        },
      ],
    };
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.setAttribute('data-la2lube-ld', '1');
    script.text = JSON.stringify(ld);
    document.head.appendChild(script);

    return () => {
      document.title = SHOP.name;
      document.head.querySelector('script[data-la2lube-ld="1"]')?.remove();
    };
  }, []);

  return (
    <div className="public-landing">
      <a href="#main-content" className="pl-skip-link">Skip to main content</a>
      <header className="pl-topbar">
        <span className="pl-logo">
          <img src="/LA2logo.png" alt="" className="pl-logo-mark" width={36} height={36} />
          {SHOP.name}
        </span>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <a className="pl-btn pl-btn-secondary" href={SHOP.phoneTel} style={{ minHeight: '44px', padding: '0 16px' }}>
            Call
          </a>
          {import.meta.env.DEV && (
            <Link className="pl-btn pl-btn-secondary" to="/shop" style={{ minHeight: '44px', padding: '0 16px' }}>
              Shop app
            </Link>
          )}
        </div>
      </header>

      <nav className="pl-subnav" aria-label="Page sections">
        <a href="#pricing">Services</a>
        <a href="#included">What&apos;s Included</a>
        <a href="#trust">Why Us</a>
        <a href="#reviews">Reviews</a>
        <a href="#contact">Contact</a>
      </nav>

      <div className="pl-container" id="main-content">
        <section className="pl-hero">
          <img src="/LA2logo.png" alt={SHOP.name} className="pl-hero-logo" width={180} height={180} />
          <h1>{SHOP.tagline}</h1>
          <p className="pl-hero-sub">
            {SHOP.city}, {SHOP.parish} — {SHOP.speedPromise}. {SHOP.ourPromise[0]}
          </p>
          <div className="pl-hero-cta">
            <a className="pl-btn pl-btn-primary" href={SHOP.phoneTel}>
              Call {SHOP.phoneDisplay}
            </a>
            <a className="pl-btn pl-btn-secondary" href={SHOP.googleMapsDirectionsUrl}>
              Directions
            </a>
          </div>
          <div className="pl-nap-block">
            <strong style={{ color: 'var(--pl-text)' }}>{SHOP.fullAddress}</strong>
            <br />
            {SHOP.hours.weekdays} · {SHOP.hours.saturday} · {SHOP.hours.sunday}
          </div>
        </section>

        <div className="pl-seasonal-banner">
          <strong>{SHOP.seasonalCallout.headline}</strong>
          <p>{SHOP.seasonalCallout.body}</p>
        </div>

        <section className="pl-section" id="pricing">
          <h2>Oil change prices — posted upfront</h2>
          <p className="pl-section-lead">
            Same menu we use at the counter. Taxes may apply. We&apos;ll confirm your total before any work.
          </p>
          <div className="pl-card" style={{ overflowX: 'auto' }}>
            <table className="pl-pricing-table">
              <thead>
                <tr>
                  <th>Service</th>
                  <th>Price</th>
                </tr>
              </thead>
              <tbody>
                {oilServices.map((s) => (
                  <tr key={s.id}>
                    <td>{s.name.replace(' Oil Change', '')}</td>
                    <td className="mono-money">${s.price.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="pl-section" id="included">
          <h2>What&apos;s included</h2>
          <p className="pl-section-lead">Straightforward value — no mystery fees for the basics.</p>
          <div className="pl-card">
            <ul className="pl-checklist">
              <li>Oil and filter per your vehicle spec (we use major brands: {SHOP.oilBrands.join(', ')}).</li>
              <li>Under-hood inspection, fluid levels, and top-off as needed.</li>
              <li>Tire pressure check.</li>
              <li>Clear explanation if we see something that can wait — or can&apos;t.</li>
            </ul>
          </div>
          <p className="pl-micro">{SHOP.bundledValue.join(' · ')}</p>
        </section>

        <section className="pl-section" id="trust">
          <h2>Why locals choose us over the chains</h2>
          <p className="pl-section-lead">
            {SHOP.certifications.join(' · ')}. The owner and crew live here — we can&apos;t hide behind a
            1-800 number.
          </p>
          <div className="pl-card">
            <p style={{ marginBottom: '16px' }}>
              <strong>{SHOP.ownerNames}</strong> · {SHOP.region} — family owned and operated.
            </p>
            <p style={{ color: 'var(--pl-muted)', fontSize: '0.95rem' }}>{SHOP.ownerStory}</p>
            <ul className="pl-checklist" style={{ marginTop: '20px' }}>
              {SHOP.ourPromise.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
          <div className="pl-review-card" id="reviews">
            <strong style={{ color: 'var(--pl-gold)' }}>Reviews</strong>
            <p style={{ marginTop: '8px', fontSize: '0.95rem' }}>
              We&apos;re building our Google reviews — if we earned five stars today, we&apos;d love yours.
            </p>
            <a className="pl-btn pl-btn-primary" href={SHOP.googleReviewUrl} style={{ marginTop: '16px' }}>
              Leave a Google review
            </a>
          </div>
        </section>
      </div>

      <footer className="pl-footer" id="contact">
        <iframe
          className="pl-map-embed"
          title={`Map to ${SHOP.name}`}
          src={`https://www.google.com/maps?q=${encodeURIComponent(SHOP.fullAddress)}&output=embed`}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
        <div className="pl-footer-links">
          {import.meta.env.DEV && (
            <>
              <Link to="/owner/launch">Shop owner: get found online</Link>
              <Link to="/shop">Staff: open shop app</Link>
              <Link to="/mvp">Shop OS MVP (demo)</Link>
            </>
          )}
          {SHOP.facebookUrl ? (
            <a href={SHOP.facebookUrl} target="_blank" rel="noreferrer">
              Facebook
            </a>
          ) : null}
        </div>
        <p>
          {SHOP.name} · {SHOP.fullAddress} · {SHOP.phoneDisplay} · {SHOP.city}, {SHOP.parish}, {SHOP.region}
        </p>
      </footer>

      <div className="pl-sticky-cta">
        <a className="pl-btn pl-btn-primary" href={SHOP.phoneTel}>
          Call
        </a>
        <a className="pl-btn pl-btn-secondary" href={SHOP.googleMapsDirectionsUrl}>
          Map
        </a>
      </div>
    </div>
  );
}
