import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';

const DemoPage: React.FC = () => {
  const [revenueCount, setRevenueCount] = useState(0);
  const [revenueStarted, setRevenueStarted] = useState(false);
  const dailyNumbersRef = useRef<HTMLElement>(null);

  // Scroll-triggered fade-in effect
  useEffect(() => {
    const sections = document.querySelectorAll('[data-fadein]');

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
          }
        });
      },
      { threshold: 0.1 }
    );

    sections.forEach((section) => {
      observer.observe(section);
    });

    return () => {
      sections.forEach((section) => {
        observer.unobserve(section);
      });
    };
  }, []);

  // Animated revenue counter
  useEffect(() => {
    if (!dailyNumbersRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !revenueStarted) {
            setRevenueStarted(true);
          }
        });
      },
      { threshold: 0.3 }
    );

    observer.observe(dailyNumbersRef.current);

    return () => {
      if (dailyNumbersRef.current) {
        observer.unobserve(dailyNumbersRef.current);
      }
    };
  }, [revenueStarted]);

  // Revenue count-up animation
  useEffect(() => {
    if (!revenueStarted) return;

    const targetValue = 347.94;
    const duration = 1500;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease-out cubic for smooth deceleration
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const currentValue = targetValue * easeOut;

      setRevenueCount(currentValue);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [revenueStarted]);

  const formatRevenue = (value: number) => {
    return `$${value.toFixed(2)}`;
  };

  return (
    <>
      <style>{`
        @keyframes amberPulse {
          0%, 100% {
            box-shadow: 0 0 20px rgba(250, 179, 135, 0.3);
          }
          50% {
            box-shadow: 0 0 40px rgba(250, 179, 135, 0.5);
          }
        }

        .amber-pulse {
          animation: amberPulse 3s ease-in-out infinite;
        }

        .flow-arrow {
          display: none;
        }

        [data-fadein] {
          opacity: 0;
          transform: translateY(24px);
          transition: opacity 0.6s ease, transform 0.6s ease;
        }

        [data-fadein].visible {
          opacity: 1;
          transform: translateY(0);
        }

        @media (min-width: 768px) {
          .flow-arrow {
            display: block;
          }
        }

        @media (min-width: 1024px) {
          .ticket-layout-responsive {
            grid-template-columns: 1fr 1fr !important;
          }
          .sticker-layout-responsive {
            grid-template-columns: 1fr 1fr !important;
          }
        }
      `}</style>

      <div style={styles.container}>
        {/* 1. Hero / Intro */}
        <section style={styles.heroSection} data-fadein className="visible">
          <div style={styles.heroContent}>
            <div style={styles.badgePill}>LIVE DEMO APP</div>
            <h1 style={styles.heroTitle}>How LA 2 Oil & Lube Works</h1>
            <p style={styles.heroSubtitle}>
              From customer pull-in to windshield sticker — every step, every second.
            </p>
          </div>
        </section>

        {/* 2. Flow Diagram */}
        <section style={styles.section} data-fadein>
          <h2 style={styles.sectionTitle}>THE COMPLETE FLOW</h2>
          <div style={styles.flowGrid}>
            <div style={styles.flowCard}>
              <div style={styles.stepBadge}>01</div>
              <div style={styles.flowIcon}>🔍</div>
              <div style={styles.flowCardTitle}>Customer Search</div>
              <div style={styles.flowCardDescription}>
                Name, phone, or plate — instant lookup
              </div>
            </div>

            <div style={styles.flowArrow} className="flow-arrow">→</div>

            <div style={styles.flowCard}>
              <div style={styles.stepBadge}>02</div>
              <div style={styles.flowIcon}>📋</div>
              <div style={styles.flowCardTitle}>Vehicle + History</div>
              <div style={styles.flowCardDescription}>Full service timeline in one tap</div>
            </div>

            <div style={styles.flowArrow} className="flow-arrow">→</div>

            <div style={styles.flowCard}>
              <div style={styles.stepBadge}>03</div>
              <div style={styles.flowIcon}>📍</div>
              <div style={styles.flowCardTitle}>Mileage Input</div>
              <div style={styles.flowCardDescription}>Triggers the recommendation engine</div>
            </div>

            <div style={styles.flowArrow} className="flow-arrow">→</div>

            <div style={{ ...styles.flowCard, ...styles.flowCardHighlight }} className="amber-pulse">
              <div style={styles.stepBadge}>04</div>
              <div style={{ ...styles.flowIcon, color: 'var(--amber)' }}>⚡</div>
              <div style={styles.flowCardTitle}>Auto-Recommendations</div>
              <div style={styles.flowCardDescription}>
                Smart upsells based on intervals
              </div>
            </div>

            <div style={styles.flowArrow} className="flow-arrow">→</div>

            <div style={styles.flowCard}>
              <div style={styles.stepBadge}>05</div>
              <div style={styles.flowIcon}>🛠</div>
              <div style={styles.flowCardTitle}>Service Selection</div>
              <div style={styles.flowCardDescription}>
                Live ticket updates, tax calculated
              </div>
            </div>

            <div style={styles.flowArrow} className="flow-arrow">→</div>

            <div style={styles.flowCard}>
              <div style={styles.stepBadge}>06</div>
              <div style={styles.flowIcon}>✅</div>
              <div style={styles.flowCardTitle}>Payment + Sticker</div>
              <div style={styles.flowCardDescription}>
                Invoice, sticker, next visit mileage
              </div>
            </div>
          </div>
        </section>

        {/* 3. The Recommendation Engine */}
        <section style={styles.section} data-fadein>
          <h2 style={styles.sectionTitle}>THE RECOMMENDATION ENGINE</h2>
          <div style={styles.engineCard}>
            <pre style={styles.formulaPre}>{`DEBRA FONTENOT — 2015 Honda Civic

Current Mileage:    115,000 mi
Last Service:        98,700 mi
─────────────────────────────
Delta:               16,300 mi

Cabin Air Filter interval:   15,000 mi
Threshold (85%):             12,750 mi

16,300 > 12,750  →  `}<span style={styles.recommendedText}>⚡ RECOMMENDED</span></pre>
          </div>

          <div style={styles.recommendationChips}>
            <div style={styles.chip}>Cabin Air Filter — 16,300 mi overdue</div>
            <div style={styles.chip}>Air Filter — 16,300 mi overdue</div>
            <div style={styles.chip}>Transmission Flush — 16,300 mi overdue</div>
            <div style={styles.chip}>Coolant Flush — 16,300 mi overdue</div>
          </div>

          <p style={styles.engineCaption}>
            One-tap 'Add to Ticket' on each — money that would've walked out.
          </p>
        </section>

        {/* 4. Live Ticket Builder */}
        <section style={styles.section} data-fadein>
          <h2 style={styles.sectionTitle}>THE TICKET BUILDS LIVE</h2>
          <div style={styles.ticketLayout} className="ticket-layout-responsive">
            <div style={styles.ticketCallout}>
              <p style={styles.calloutText}>
                No calculator. No forgotten services. The math is always right.
              </p>
            </div>

            <div style={styles.ticketCard}>
              <div style={styles.ticketLine}>
                <span>High-Mileage Oil Change</span>
                <span style={styles.ticketPrice}>$64.99</span>
              </div>
              <div style={styles.ticketLine}>
                <span>Cabin Air Filter</span>
                <span style={styles.ticketPrice}>$29.99</span>
              </div>
              <div style={styles.ticketLine}>
                <span>Air Filter</span>
                <span style={styles.ticketPrice}>$24.99</span>
              </div>

              <div style={styles.ticketDivider} />

              <div style={styles.ticketSubtotal}>
                <span>Subtotal</span>
                <span style={styles.ticketSubtotalValue}>$119.97</span>
              </div>
              <div style={styles.ticketSubtotal}>
                <span>Tax (8.5%)</span>
                <span style={styles.ticketSubtotalValue}>$10.20</span>
              </div>

              <div style={styles.ticketTotal}>
                <span>TOTAL</span>
                <span style={styles.ticketTotalValue}>$130.17</span>
              </div>
            </div>
          </div>
        </section>

        {/* 5. The Sticker */}
        <section style={styles.section} data-fadein>
          <h2 style={styles.sectionTitle}>THE WINDSHIELD STICKER</h2>
          <div style={styles.stickerLayout} className="sticker-layout-responsive">
            <div style={styles.stickerPreview}>
              <div style={styles.sticker}>
                <div style={styles.stickerHeader}>LA 2 Oil & Lube</div>
                <div style={styles.stickerAddress}>
                  1040 Sterlington Hwy, Farmerville, LA
                </div>

                <div style={styles.stickerDivider} />

                <div style={styles.stickerRow}>
                  <span style={styles.stickerLabel}>DATE:</span>
                  <span style={styles.stickerValue}>05/29/2026</span>
                </div>
                <div style={styles.stickerRow}>
                  <span style={styles.stickerLabel}>MILEAGE:</span>
                  <span style={styles.stickerValue}>115,000 mi</span>
                </div>
                <div style={styles.stickerRow}>
                  <span style={styles.stickerLabel}>OIL:</span>
                  <span style={styles.stickerValue}>High-Mileage</span>
                </div>

                <div style={styles.stickerDividerDashed} />

                <div style={styles.nextServiceSection}>
                  <div style={styles.nextServiceLabel}>NEXT SERVICE AT:</div>
                  <div style={styles.nextServiceMileage}>120,000 mi</div>
                </div>

                <div style={styles.stickerDividerDashed} />

                <div style={styles.stickerFooter}>
                  Thank you for your
                  <br />
                  business!
                </div>
              </div>
            </div>

            <div style={styles.annotationsColumn}>
              <div style={styles.annotation}>
                <span style={styles.annotationArrow}>→</span> Oil type drives the interval
                (5,000 mi for High-Mileage)
              </div>
              <div style={styles.annotation}>
                <span style={styles.annotationArrow}>→</span> Tech enters mileage once —
                everything calculates
              </div>
              <div style={styles.annotation}>
                <span style={styles.annotationArrow}>→</span> Customer sees this every day
                they drive
              </div>
            </div>
          </div>
        </section>

        {/* 6. Daily Numbers */}
        <section style={styles.section} data-fadein ref={dailyNumbersRef}>
          <h2 style={styles.sectionTitle}>END OF DAY, AT A GLANCE</h2>
          <div style={styles.statsGrid}>
            <div style={styles.statCard}>
              <div style={styles.statLabel}>Revenue Today</div>
              <div style={styles.statValue}>{formatRevenue(revenueCount)}</div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statLabel}>Cars Served</div>
              <div style={styles.statValue}>4</div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statLabel}>Avg Ticket</div>
              <div style={styles.statValue}>$86.99</div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statLabel}>Payment Split</div>
              <div style={styles.statValue}>3 Cash / 1 Card</div>
            </div>
          </div>
          <p style={styles.statsCaption}>
            Updates live as tickets complete. No end-of-day counting.
          </p>
        </section>

        {/* 7. CTA Footer */}
        <section style={styles.ctaSection} data-fadein>
          <h2 style={styles.ctaTitle}>Ready to see it run?</h2>
          <p style={styles.ctaSubtitle}>
            Walk the full Debra Fontenot demo — check-in to sticker in under 2 minutes.
          </p>
          <Link to="/shop" style={styles.ctaButton}>
            Open the Live Demo →
          </Link>
          <Link to="/" style={styles.backLink}>
            ← Back to home
          </Link>
        </section>
      </div>
    </>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    backgroundColor: 'var(--bg)',
    color: 'var(--text)',
    paddingBottom: '80px',
  },

  // Hero Section
  heroSection: {
    width: '100%',
    padding: '120px 24px 80px',
    background:
      'radial-gradient(ellipse at 50% 0%, rgba(250, 179, 135, 0.12) 0%, transparent 70%)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroContent: {
    maxWidth: '800px',
    textAlign: 'center' as const,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '24px',
    alignItems: 'center',
  },
  badgePill: {
    backgroundColor: 'var(--accent-bg-strong)',
    color: 'var(--amber)',
    padding: '8px 20px',
    borderRadius: '20px',
    fontSize: '0.85rem',
    fontWeight: 700,
    letterSpacing: '0.05em',
    border: '1px solid var(--amber)',
  },
  heroTitle: {
    fontSize: '2.5rem',
    fontWeight: 700,
    color: 'var(--text)',
    margin: 0,
    lineHeight: 1.2,
  },
  heroSubtitle: {
    fontSize: '1.1rem',
    color: 'var(--muted)',
    margin: 0,
    lineHeight: 1.6,
  },

  // Section Styles
  section: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '80px 24px',
  },
  sectionTitle: {
    fontSize: '0.875rem',
    fontWeight: 700,
    color: 'var(--muted)',
    letterSpacing: '0.1em',
    textTransform: 'uppercase' as const,
    marginBottom: '32px',
    textAlign: 'center' as const,
  },

  // Flow Diagram
  flowGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
    gap: '16px',
    alignItems: 'center',
  },
  flowCard: {
    backgroundColor: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: '12px',
    padding: '24px',
    textAlign: 'center' as const,
    minHeight: '180px',
    display: 'flex',
    flexDirection: 'column' as const,
    justifyContent: 'center',
    gap: '12px',
    position: 'relative' as const,
  },
  stepBadge: {
    position: 'absolute' as const,
    top: '12px',
    left: '12px',
    fontFamily: 'Consolas, Monaco, "Courier New", monospace',
    fontSize: '11px',
    color: 'var(--muted)',
    fontWeight: 600,
  },
  flowCardHighlight: {
    border: '2px solid var(--amber)',
    backgroundColor: 'var(--accent-bg-soft)',
  },
  flowIcon: {
    fontSize: '2rem',
    lineHeight: 1,
  },
  flowCardTitle: {
    fontSize: '1rem',
    fontWeight: 700,
    color: 'var(--text)',
  },
  flowCardDescription: {
    fontSize: '0.875rem',
    color: 'var(--muted)',
    lineHeight: 1.4,
  },
  flowArrow: {
    fontSize: '1.5rem',
    color: 'var(--muted)',
    textAlign: 'center' as const,
  },

  // Recommendation Engine
  engineCard: {
    background: 'linear-gradient(135deg, rgba(250, 179, 135, 0.06) 0%, var(--surface) 60%)',
    border: '1px solid var(--border)',
    borderLeft: '3px solid var(--amber)',
    borderRadius: '12px',
    padding: '32px',
    marginBottom: '32px',
    overflowX: 'auto' as const,
    boxShadow: '0 0 32px rgba(250, 179, 135, 0.08)',
  },
  formulaPre: {
    fontFamily: 'Consolas, Monaco, "Courier New", monospace',
    fontSize: '0.95rem',
    lineHeight: 1.8,
    color: 'var(--text)',
    margin: 0,
    whiteSpace: 'pre' as const,
  },
  recommendedText: {
    color: 'var(--amber)',
    fontWeight: 700,
  },
  recommendationChips: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '12px',
    justifyContent: 'center',
    marginBottom: '24px',
  },
  chip: {
    backgroundColor: 'var(--accent-bg-soft)',
    border: '1px solid var(--amber)',
    color: 'var(--amber)',
    padding: '8px 16px',
    borderRadius: '20px',
    fontSize: '0.875rem',
    fontWeight: 600,
  },
  engineCaption: {
    textAlign: 'center' as const,
    fontSize: '1rem',
    fontStyle: 'italic' as const,
    color: 'var(--muted)',
    margin: 0,
  },

  // Live Ticket Builder
  ticketLayout: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: '32px',
    alignItems: 'center',
  },
  ticketCallout: {
    textAlign: 'center' as const,
  },
  calloutText: {
    fontSize: '1.25rem',
    fontWeight: 700,
    color: 'var(--text)',
    lineHeight: 1.5,
    margin: 0,
  },
  ticketCard: {
    backgroundColor: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: '12px',
    padding: '32px',
    maxWidth: '400px',
    margin: '0 auto',
    width: '100%',
  },
  ticketLine: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 0',
    fontSize: '0.95rem',
    color: 'var(--text)',
  },
  ticketPrice: {
    fontFamily: 'Consolas, Monaco, "Courier New", monospace',
    fontWeight: 600,
  },
  ticketDivider: {
    height: '1px',
    backgroundColor: 'var(--border)',
    margin: '16px 0',
  },
  ticketSubtotal: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 0',
    fontSize: '0.9rem',
    color: 'var(--muted)',
  },
  ticketSubtotalValue: {
    fontFamily: 'Consolas, Monaco, "Courier New", monospace',
  },
  ticketTotal: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 0 0',
    fontSize: '1.125rem',
    fontWeight: 700,
    color: 'var(--text)',
    marginTop: '8px',
  },
  ticketTotalValue: {
    fontFamily: 'Consolas, Monaco, "Courier New", monospace',
    fontSize: '1.5rem',
    color: 'var(--amber)',
  },

  // Sticker Section
  stickerLayout: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: '48px',
    alignItems: 'center',
  },
  stickerPreview: {
    display: 'flex',
    justifyContent: 'center',
  },
  sticker: {
    backgroundColor: '#ffffff',
    border: '2px solid #333333',
    borderRadius: '8px',
    padding: '24px',
    maxWidth: '380px',
    width: '100%',
    fontFamily: 'Consolas, Monaco, "Courier New", monospace',
    color: '#000000',
    fontSize: '0.9rem',
    lineHeight: 1.6,
  },
  stickerHeader: {
    textAlign: 'center' as const,
    fontSize: '1.125rem',
    fontWeight: 'bold' as const,
    marginBottom: '4px',
  },
  stickerAddress: {
    textAlign: 'center' as const,
    fontSize: '0.85rem',
    marginBottom: '16px',
  },
  stickerDivider: {
    height: '1px',
    backgroundColor: '#333333',
    marginTop: '16px',
    marginBottom: '16px',
  },
  stickerDividerDashed: {
    borderTop: '1px dashed #666666',
    marginTop: '16px',
    marginBottom: '16px',
  },
  stickerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '8px',
  },
  stickerLabel: {
    fontWeight: 'bold' as const,
  },
  stickerValue: {
    textAlign: 'right' as const,
  },
  nextServiceSection: {
    textAlign: 'center' as const,
  },
  nextServiceLabel: {
    fontSize: '0.95rem',
    fontWeight: 'bold' as const,
    color: '#fab387',
    marginBottom: '8px',
  },
  nextServiceMileage: {
    fontSize: '1.5rem',
    fontWeight: 'bold' as const,
    color: '#fab387',
  },
  stickerFooter: {
    textAlign: 'center' as const,
    fontSize: '0.85rem',
    fontStyle: 'italic' as const,
  },
  annotationsColumn: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '24px',
  },
  annotation: {
    backgroundColor: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    padding: '16px',
    fontSize: '0.95rem',
    color: 'var(--text)',
    lineHeight: 1.6,
  },
  annotationArrow: {
    color: 'var(--amber)',
    fontWeight: 700,
    marginRight: '8px',
  },

  // Daily Numbers
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '24px',
    marginBottom: '24px',
  },
  statCard: {
    backgroundColor: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: '12px',
    padding: '24px',
    textAlign: 'center' as const,
  },
  statLabel: {
    fontSize: '0.875rem',
    color: 'var(--muted)',
    marginBottom: '12px',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  },
  statValue: {
    fontSize: '1.75rem',
    fontWeight: 700,
    color: 'var(--amber)',
    fontFamily: 'Consolas, Monaco, "Courier New", monospace',
  },
  statsCaption: {
    textAlign: 'center' as const,
    fontSize: '1rem',
    color: 'var(--muted)',
    margin: 0,
  },

  // CTA Section
  ctaSection: {
    maxWidth: '700px',
    margin: '0 auto',
    padding: '80px 24px',
    textAlign: 'center' as const,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '24px',
    alignItems: 'center',
    background: 'linear-gradient(180deg, var(--bg) 0%, rgba(250, 179, 135, 0.04) 100%)',
    borderTop: '1px solid rgba(250, 179, 135, 0.2)',
  },
  ctaTitle: {
    fontSize: '1.75rem',
    fontWeight: 700,
    color: 'var(--text)',
    margin: 0,
  },
  ctaSubtitle: {
    fontSize: '1.125rem',
    color: 'var(--muted)',
    margin: 0,
    lineHeight: 1.6,
  },
  ctaButton: {
    display: 'inline-block',
    backgroundColor: 'var(--amber)',
    color: 'var(--text-on-accent)',
    padding: '18px 48px',
    borderRadius: '8px',
    fontSize: '1.125rem',
    fontWeight: 700,
    textDecoration: 'none',
    transition: 'background-color 0.2s, box-shadow 0.2s',
    cursor: 'pointer',
    border: 'none',
  },
  backLink: {
    fontSize: '0.95rem',
    color: 'var(--muted)',
    textDecoration: 'none',
    transition: 'color 0.2s',
  },
};

export default DemoPage;
