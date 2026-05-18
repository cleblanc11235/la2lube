import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { mockCustomers, serviceMenu } from '../data/mockData';
import type { Service } from '../types';
import {
  aggregateCategory,
  hourlyBuckets,
  paymentTotals,
  subtotalForLines,
  TAX_RATE,
  taxForSubtotal,
  totalForTicket,
  type MvpTicket,
  type PaymentMethod,
  type TicketLine,
} from '../mvp/ledgerHelpers';
import '../styles/phase5mvp.css';

const STORAGE_KEY = 'la2lube-phase5-mvp-tickets';

function nextInvoiceNum(existing: MvpTicket[]): number {
  const max = existing.reduce((m, t) => Math.max(m, t.invoiceNum), 1000);
  return max + 1;
}

function seedTickets(): MvpTicket[] {
  const now = Date.now();
  const oil = (id: string) => serviceMenu.find((s) => s.id === id)!;
  return [
    {
      id: 'seed-1',
      invoiceNum: 1001,
      createdAt: now - 3 * 60 * 60 * 1000,
      customerName: 'James Martin',
      vehicleLabel: 'HND 2211 — 2019 Honda Accord',
      lines: [{ ...lineFromService(oil('oil-synthetic')) }],
      discount: 0,
      payment: 'card',
    },
    {
      id: 'seed-2',
      invoiceNum: 1002,
      createdAt: now - 2.5 * 60 * 60 * 1000,
      customerName: 'Mary Thompson',
      vehicleLabel: 'RAV 8844 — 2022 Toyota RAV4',
      lines: [
        { ...lineFromService(oil('oil-blend')) },
        { ...lineFromService(oil('addon-cabin')) },
      ],
      discount: 5,
      payment: 'cash',
    },
    {
      id: 'seed-3',
      invoiceNum: 1003,
      createdAt: now - 1.2 * 60 * 60 * 1000,
      customerName: 'David Brown',
      vehicleLabel: 'ESC 9901 — 2017 Ford Escape',
      lines: [
        { ...lineFromService(oil('oil-highmileage')) },
        { ...lineFromService(oil('addon-air')) },
      ],
      discount: 0,
      payment: 'fleet',
    },
  ];
}

function lineFromService(s: Service): TicketLine {
  return {
    serviceId: s.id,
    name: s.name,
    price: s.price,
    category: s.category,
  };
}

function loadTickets(): MvpTicket[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as MvpTicket[];
      if (Array.isArray(parsed) && parsed.length) return parsed;
    }
  } catch {
    /* ignore */
  }
  return seedTickets();
}

function saveTickets(t: MvpTicket[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(t));
}

export default function Phase5MvpPage() {
  const [tickets, setTickets] = useState<MvpTicket[]>(loadTickets);
  const [showNew, setShowNew] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [vehicleLabel, setVehicleLabel] = useState('');
  const [oilId, setOilId] = useState(serviceMenu.find((s) => s.category === 'oilchange')?.id ?? '');
  const [addonIds, setAddonIds] = useState<string[]>([]);
  const [discount, setDiscount] = useState('0');
  const [payment, setPayment] = useState<PaymentMethod>('card');

  useEffect(() => {
    saveTickets(tickets);
  }, [tickets]);

  const oilOptions = serviceMenu.filter((s) => s.category === 'oilchange');
  const addonOptions = serviceMenu.filter((s) => s.category === 'addon' && s.price > 0);

  const totals = useMemo(() => {
    const sales = tickets.reduce((s, t) => s + totalForTicket(t), 0);
    const count = tickets.length;
    const avg = count ? sales / count : 0;
    const subAll = tickets.reduce((s, t) => s + subtotalForLines(t.lines, t.discount), 0);
    const discAll = tickets.reduce((s, t) => s + t.discount, 0);
    const taxAll = tickets.reduce((s, t) => s + taxForSubtotal(subtotalForLines(t.lines, t.discount)), 0);
    const cat = aggregateCategory(tickets);
    const pay = paymentTotals(tickets);
    const buckets = hourlyBuckets(tickets);
    const maxB = Math.max(1, ...buckets);
    return { sales, count, avg, subAll, discAll, taxAll, cat, pay, buckets, maxB };
  }, [tickets]);

  const resetForm = () => {
    setCustomerName('');
    setVehicleLabel('');
    setOilId(oilOptions[0]?.id ?? '');
    setAddonIds([]);
    setDiscount('0');
    setPayment('card');
  };

  const submitTicket = () => {
    const lines: TicketLine[] = [];
    const oil = serviceMenu.find((s) => s.id === oilId);
    if (!oil) return;
    lines.push(lineFromService(oil));
    for (const id of addonIds) {
      const a = serviceMenu.find((s) => s.id === id);
      if (a) lines.push(lineFromService(a));
    }
    const d = Math.max(0, parseFloat(discount) || 0);
    const t: MvpTicket = {
      id: `t-${Date.now()}`,
      invoiceNum: nextInvoiceNum(tickets),
      createdAt: Date.now(),
      customerName: customerName.trim() || 'Walk-in',
      vehicleLabel: vehicleLabel.trim() || '—',
      lines,
      discount: d,
      payment,
    };
    setTickets((prev) => [...prev, t]);
    resetForm();
    setShowNew(false);
  };

  const clearDay = () => {
    if (confirm('Clear all tickets for this demo?')) {
      setTickets([]);
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  const fillFromCustomer = (name: string, vehicle: string) => {
    setCustomerName(name);
    setVehicleLabel(vehicle);
  };

  return (
    <div className="mvp-root">
      <header className="mvp-topbar">
        <div>
          <h1 className="mvp-title">Shop OS — day desk (MVP demo)</h1>
          <p className="mvp-sub">
            Bare-minimum layout inspired by classic shop dashboards (e.g. DataLube-style): one day, invoices, categories,
            payments. Not feature parity — a visualization for a single-bay shop.
          </p>
        </div>
        <nav className="mvp-nav">
          <Link to="/">Marketing site</Link>
          <Link to="/shop">Full shop demo</Link>
        </nav>
      </header>

      <section className="mvp-kpi-strip" aria-label="Today summary">
        <div className="mvp-kpi">
          <span className="mvp-kpi-label">Invoices</span>
          <span className="mvp-kpi-value">{totals.count}</span>
        </div>
        <div className="mvp-kpi">
          <span className="mvp-kpi-label">Total sales</span>
          <span className="mvp-kpi-value mono">${totals.sales.toFixed(2)}</span>
        </div>
        <div className="mvp-kpi">
          <span className="mvp-kpi-label">Avg ticket</span>
          <span className="mvp-kpi-value mono">${totals.avg.toFixed(2)}</span>
        </div>
        <div className="mvp-kpi mvp-kpi-muted">
          <span className="mvp-kpi-label">Demo note</span>
          <span className="mvp-kpi-value small">Stored in browser only</span>
        </div>
      </section>

      <div className="mvp-grid">
        <section className="mvp-panel mvp-log" aria-label="Transaction log">
          <div className="mvp-panel-head">
            <h2>Today&apos;s invoices</h2>
            <button type="button" className="mvp-btn mvp-btn-amber" onClick={() => setShowNew(true)}>
              New ticket
            </button>
          </div>
          <div className="mvp-table-wrap">
            <table className="mvp-table">
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Time</th>
                  <th>Customer</th>
                  <th>Vehicle</th>
                  <th>Pay</th>
                  <th className="right">Total</th>
                </tr>
              </thead>
              <tbody>
                {[...tickets]
                  .sort((a, b) => b.createdAt - a.createdAt)
                  .map((t) => (
                    <tr key={t.id}>
                      <td className="mono">{t.invoiceNum}</td>
                      <td className="mono">
                        {new Date(t.createdAt).toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </td>
                      <td>{t.customerName}</td>
                      <td className="muted">{t.vehicleLabel}</td>
                      <td>{t.payment.toUpperCase()}</td>
                      <td className="right mono">${totalForTicket(t).toFixed(2)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          {tickets.length === 0 && <p className="mvp-empty">No tickets yet — add one or reset seed data.</p>}
          <div className="mvp-log-footer">
            <span>
              Total sales (incl. tax): <strong className="mono">${totals.sales.toFixed(2)}</strong>
            </span>
            <button type="button" className="mvp-btn-ghost" onClick={clearDay}>
              Clear demo data
            </button>
          </div>
        </section>

        <aside className="mvp-sidebar">
          <div className="mvp-panel">
            <h3>Invoices per hour (demo)</h3>
            <div className="mvp-chart">
              {totals.buckets.map((n, i) => (
                <div key={i} className="mvp-bar-wrap" title={`${7 + i}:00 — ${n} cars`}>
                  <div className="mvp-bar" style={{ height: `${(n / totals.maxB) * 100}%` }} />
                  <span className="mvp-bar-label">{7 + i}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mvp-panel">
            <h3>Sales by category</h3>
            <table className="mvp-mini-table">
              <tbody>
                <tr>
                  <td>Oil changes</td>
                  <td className="right mono">${totals.cat.oil.toFixed(2)}</td>
                </tr>
                <tr>
                  <td>Fluids</td>
                  <td className="right mono">${totals.cat.fluid.toFixed(2)}</td>
                </tr>
                <tr>
                  <td>Filters &amp; add-ons</td>
                  <td className="right mono">${totals.cat.addon.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mvp-panel">
            <h3>Totals</h3>
            <table className="mvp-mini-table">
              <tbody>
                <tr>
                  <td>Subtotal</td>
                  <td className="right mono">${totals.subAll.toFixed(2)}</td>
                </tr>
                <tr>
                  <td>Discounts</td>
                  <td className="right mono">-${totals.discAll.toFixed(2)}</td>
                </tr>
                <tr>
                  <td>Tax ({(TAX_RATE * 100).toFixed(3)}%)</td>
                  <td className="right mono">${totals.taxAll.toFixed(2)}</td>
                </tr>
                <tr className="mvp-total-row">
                  <td>
                    <strong>Total</strong>
                  </td>
                  <td className="right mono">
                    <strong>${totals.sales.toFixed(2)}</strong>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </aside>
      </div>

      <section className="mvp-payments" aria-label="Payment breakdown">
        <h3>Payment methods</h3>
        <div className="mvp-pay-grid">
          <div className="mvp-pay-box">
            <span>Cash</span>
            <span className="mono">${totals.pay.cash.toFixed(2)}</span>
          </div>
          <div className="mvp-pay-box">
            <span>Check</span>
            <span className="mono">${totals.pay.check.toFixed(2)}</span>
          </div>
          <div className="mvp-pay-box">
            <span>Card</span>
            <span className="mono">${totals.pay.card.toFixed(2)}</span>
          </div>
          <div className="mvp-pay-box">
            <span>Fleet / house</span>
            <span className="mono">${totals.pay.fleet.toFixed(2)}</span>
          </div>
        </div>
        <p className="mvp-marquee" role="status">
          Staples only: ledger, categories, payments — add bay boards and marketing later.
        </p>
      </section>

      {showNew && (
        <div className="mvp-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="mvp-new-title">
          <div className="mvp-modal">
            <h2 id="mvp-new-title">Quick ticket</h2>
            <p className="mvp-modal-hint">Minimum path: customer → vehicle → oil + optional add-ons → pay.</p>

            <label className="mvp-label">
              Customer
              <input
                className="mvp-input"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Name"
              />
            </label>

            <div className="mvp-quick-pick">
              <span className="muted small">Quick fill from mock list:</span>
              {mockCustomers.slice(0, 3).map((c) => {
                const v = c.vehicles[0];
                const label = `${v.plate} — ${v.year} ${v.make} ${v.model}`;
                return (
                  <button
                    key={c.id}
                    type="button"
                    className="mvp-chip"
                    onClick={() => fillFromCustomer(c.name, label)}
                  >
                    {c.name}
                  </button>
                );
              })}
            </div>

            <label className="mvp-label">
              Vehicle
              <input
                className="mvp-input"
                value={vehicleLabel}
                onChange={(e) => setVehicleLabel(e.target.value)}
                placeholder="Plate — year make model"
              />
            </label>

            <label className="mvp-label">
              Oil change
              <select className="mvp-input" value={oilId} onChange={(e) => setOilId(e.target.value)}>
                {oilOptions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} (${s.price.toFixed(2)})
                  </option>
                ))}
              </select>
            </label>

            <fieldset className="mvp-fieldset">
              <legend>Add-ons (optional)</legend>
              <div className="mvp-addon-grid">
                {addonOptions.map((s) => (
                  <label key={s.id} className="mvp-check">
                    <input
                      type="checkbox"
                      checked={addonIds.includes(s.id)}
                      onChange={() =>
                        setAddonIds((prev) =>
                          prev.includes(s.id) ? prev.filter((x) => x !== s.id) : [...prev, s.id]
                        )
                      }
                    />
                    {s.name} (${s.price.toFixed(2)})
                  </label>
                ))}
              </div>
            </fieldset>

            <label className="mvp-label">
              Discount ($)
              <input
                className="mvp-input"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                inputMode="decimal"
              />
            </label>

            <fieldset className="mvp-fieldset">
              <legend>Payment</legend>
              {(['cash', 'card', 'check', 'fleet'] as const).map((p) => (
                <label key={p} className="mvp-radio">
                  <input
                    type="radio"
                    name="pay"
                    checked={payment === p}
                    onChange={() => setPayment(p)}
                  />
                  {p}
                </label>
              ))}
            </fieldset>

            <div className="mvp-modal-actions">
              <button type="button" className="mvp-btn-ghost" onClick={() => setShowNew(false)}>
                Cancel
              </button>
              <button type="button" className="mvp-btn mvp-btn-amber" onClick={submitTicket}>
                Complete sale
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
