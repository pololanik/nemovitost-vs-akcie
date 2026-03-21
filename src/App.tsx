import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar,
} from 'recharts';
import type { Config, YearData } from './types';
import { calculate } from './calculations';
import { queryToConfig, buildShareUrl } from './urlConfig';
import './App.css';

const defaultConfig: Config = {
  propertyPrice: 4_000_000,
  downPayment: 0,
  mortgageRate: 4.5,           // aktuální sazba CZ ~4.5%, historický průměr 4.2%
  mortgageTerm: 30,
  propertyGrowthRate: 4.0,     // historický průměr ČR ~4.1% za 20 let
  acquisitionCost: 100_000,    // provize RK, právní služby, odhad apod.
  monthlyRent: 13_000,         // ~3.9% hrubý yield, odpovídá regionům ČR
  rentGrowthRate: 4.0,         // historický průměr ČR ~4.1%, Praha ~7%
  vacancyMonths: 1,
  maintenanceFund: 2_000,      // ~30 Kč/m² pro 65m² byt
  maintenanceGrowthRate: 3.0,  // blíže inflaci
  insuranceYearly: 3_500,      // pojištění nemovitosti + domácnosti
  propertyTax: 1_200,          // typický byt 60-70m²
  stockReturnRate: 8.0,        // MSCI World ~8.2%, S&P 500 ~9.8%
  years: 30,
};

function formatCZK(value: number): string {
  return new Intl.NumberFormat('cs-CZ', {
    style: 'currency',
    currency: 'CZK',
    maximumFractionDigits: 0,
  }).format(value);
}

function InputField({
  label, value, onChange, step, suffix, min, max,
}: {
  label: string; value: number; onChange: (v: number) => void;
  step?: number; suffix?: string; min?: number; max?: number;
}) {
  const [text, setText] = useState(String(value));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setText(String(value));
  }, [value, focused]);

  return (
    <div className="input-field">
      <label>{label}</label>
      <div className="input-wrapper">
        <input
          type="number"
          value={focused ? text : value}
          onChange={(e) => {
            setText(e.target.value);
            if (e.target.value !== '') onChange(Number(e.target.value));
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            if (text === '') onChange(min ?? 0);
          }}
          step={step || 1}
          min={min}
          max={max}
        />
        {suffix && <span className="suffix">{suffix}</span>}
      </div>
    </div>
  );
}

function App() {
  const [config, setConfig] = useState<Config>(() =>
    queryToConfig(window.location.search, defaultConfig)
  );
  const [activeTab, setActiveTab] = useState<'chart' | 'table' | 'cashflow'>('chart');
  const [copied, setCopied] = useState(false);

  // Sync config changes to URL (without page reload)
  useEffect(() => {
    const url = buildShareUrl(config, defaultConfig);
    window.history.replaceState(null, '', url);
  }, [config]);

  const update = <K extends keyof Config>(key: K, value: Config[K]) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  const handleShare = useCallback(() => {
    const url = buildShareUrl(config, defaultConfig);
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [config]);

  const data: YearData[] = useMemo(() => calculate(config), [config]);

  const chartData = useMemo(() => data.map((d) => ({
    year: d.year,
    'Výtěžek z prodeje nemovitosti': Math.round(d.propertyEquity),
    'Hodnota akcií': Math.round(d.stockNetWorth),
    'Vlastní vklad celkem': Math.round(d.totalPropertyCosts),
    'Hodnota nemovitosti': Math.round(d.propertyValue),
    'Zbývající hypotéka': Math.round(d.remainingMortgage),
  })), [data]);

  const cashflowData = useMemo(() => data.map((d) => ({
    year: d.year,
    'Měsíční doplatek': Math.round(d.monthlyTopUp),
    'Příjem z nájmu': Math.round(d.monthlyRentIncome),
    'Splátka hypotéky': Math.round(d.monthlyMortgage),
    'Fond oprav': Math.round(d.monthlyMaintenanceFund),
  })), [data]);

  const lastYear = data[data.length - 1];
  const difference = lastYear.propertyEquity - lastYear.stockNetWorth;

  return (
    <div className="app">
      <header>
        <h1>Nemovitost vs. Akcie</h1>
      </header>

      <div className="layout">
        <aside className="sidebar">
          <section>
            <h3>Nemovitost</h3>
            <InputField label="Cena nemovitosti" value={config.propertyPrice} onChange={(v) => update('propertyPrice', v)} step={100000} suffix="Kč" min={0} />
            <InputField label="Vlastní vklad" value={config.downPayment} onChange={(v) => update('downPayment', v)} step={100000} suffix="Kč" min={0} max={config.propertyPrice} />
            {config.downPayment > 0 && (
              <div className="info-note">
                Hypotéka: {formatCZK(config.propertyPrice - config.downPayment)} ({Math.round((1 - config.downPayment / config.propertyPrice) * 100)}% ceny)
              </div>
            )}
            <InputField label="Úrok hypotéky" value={config.mortgageRate} onChange={(v) => update('mortgageRate', v)} step={0.1} suffix="% p.a." min={0} max={15} />
            <InputField label="Doba splácení" value={config.mortgageTerm} onChange={(v) => update('mortgageTerm', v)} step={1} suffix="let" min={1} max={40} />
            <InputField label="Růst ceny nemovitosti" value={config.propertyGrowthRate} onChange={(v) => update('propertyGrowthRate', v)} step={0.1} suffix="% ročně" min={-5} max={15} />
            <InputField label="Náklady na koupi (provize aj.)" value={config.acquisitionCost} onChange={(v) => update('acquisitionCost', v)} step={10000} suffix="Kč" min={0} />
          </section>

          <section>
            <h3>Pronájem</h3>
            <InputField label="Měsíční nájem" value={config.monthlyRent} onChange={(v) => update('monthlyRent', v)} step={500} suffix="Kč" min={0} />
            <InputField label="Růst nájmu" value={config.rentGrowthRate} onChange={(v) => update('rentGrowthRate', v)} step={0.1} suffix="% ročně" min={0} max={15} />
            <InputField label="Prázdné měsíce za rok" value={config.vacancyMonths} onChange={(v) => update('vacancyMonths', v)} step={0.1} suffix="měs." min={0} max={12} />
          </section>

          <section>
            <h3>Náklady</h3>
            <InputField label="Fond oprav (měsíčně)" value={config.maintenanceFund} onChange={(v) => update('maintenanceFund', v)} step={100} suffix="Kč" min={0} />
            <InputField label="Růst fondu oprav" value={config.maintenanceGrowthRate} onChange={(v) => update('maintenanceGrowthRate', v)} step={0.1} suffix="% ročně" min={0} max={15} />
            <InputField label="Pojištění (ročně)" value={config.insuranceYearly} onChange={(v) => update('insuranceYearly', v)} step={500} suffix="Kč" min={0} />
            <InputField label="Daň z nemovitosti (ročně)" value={config.propertyTax} onChange={(v) => update('propertyTax', v)} step={100} suffix="Kč" min={0} />
          </section>

          <section>
            <h3>Akcie</h3>
            <InputField label="Průměrný roční výnos" value={config.stockReturnRate} onChange={(v) => update('stockReturnRate', v)} step={0.1} suffix="%" min={-10} max={30} />
          </section>

          <section>
            <h3>Horizont</h3>
            <InputField label="Investiční horizont" value={config.years} onChange={(v) => update('years', v)} step={1} suffix="let" min={1} max={40} />
          </section>

          <button className="share-btn" onClick={handleShare}>
            {copied ? 'Zkopírováno!' : 'Sdílet konfiguraci'}
          </button>
        </aside>

        <main className="content">
          <div className="summary-cards">
            <div className="card">
              <div className="card-label">Výtěžek z prodeje nemovitosti</div>
              <div className="card-value property">{formatCZK(lastYear.propertyEquity)}</div>
              <div className="card-detail">Hodnota: {formatCZK(lastYear.propertyValue)} − Hypotéka: {formatCZK(lastYear.remainingMortgage)}</div>
            </div>
            <div className="card">
              <div className="card-label">Hodnota akcií</div>
              <div className="card-value stock">{formatCZK(lastYear.stockNetWorth)}</div>
              <div className="card-detail">
                Investováno celkem: {formatCZK(lastYear.totalStockInvested)}
                {config.downPayment > 0 && <> (z toho počáteční vklad: {formatCZK(config.downPayment)})</>}
              </div>
            </div>
            <div className="card">
              <div className="card-label">Rozdíl ve prospěch</div>
              <div className={`card-value ${difference > 0 ? 'property' : 'stock'}`}>
                {difference > 0 ? 'Nemovitosti' : 'Akcií'}: {formatCZK(Math.abs(difference))}
              </div>
              <div className="card-detail">
                Aktuální doplatek v roce {config.years}: {formatCZK(lastYear.monthlyTopUp)}/měs.
              </div>
            </div>
          </div>

          <div className="tabs">
            <button className={activeTab === 'chart' ? 'active' : ''} onClick={() => setActiveTab('chart')}>Srovnání</button>
            <button className={activeTab === 'cashflow' ? 'active' : ''} onClick={() => setActiveTab('cashflow')}>Cash Flow</button>
            <button className={activeTab === 'table' ? 'active' : ''} onClick={() => setActiveTab('table')}>Tabulka</button>
          </div>

          {activeTab === 'chart' && (
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={420}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                  <XAxis dataKey="year" label={{ value: 'Rok', position: 'bottom', offset: -5 }} />
                  <YAxis tickFormatter={(v: number) => `${(v / 1_000_000).toFixed(1)}M`} />
                  <Tooltip formatter={(value) => formatCZK(Number(value))} />
                  <Legend verticalAlign="top" />
                  <Line type="monotone" dataKey="Výtěžek z prodeje nemovitosti" stroke="#e67e22" strokeWidth={3} dot={false} />
                  <Line type="monotone" dataKey="Hodnota akcií" stroke="#2ecc71" strokeWidth={3} dot={false} />
                  <Line type="monotone" dataKey="Vlastní vklad celkem" stroke="#3498db" strokeWidth={2} strokeDasharray="4 4" dot={false} />
                  <Line type="monotone" dataKey="Hodnota nemovitosti" stroke="#e67e22" strokeWidth={1} strokeDasharray="5 5" dot={false} />
                  <Line type="monotone" dataKey="Zbývající hypotéka" stroke="#e74c3c" strokeWidth={1} strokeDasharray="5 5" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {activeTab === 'cashflow' && (
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={420}>
                <BarChart data={cashflowData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                  <XAxis dataKey="year" label={{ value: 'Rok', position: 'bottom', offset: -5 }} />
                  <YAxis tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(value) => formatCZK(Number(value))} />
                  <Legend verticalAlign="top" />
                  <Bar dataKey="Splátka hypotéky" fill="#e74c3c" />
                  <Bar dataKey="Fond oprav" fill="#f39c12" />
                  <Bar dataKey="Příjem z nájmu" fill="#2ecc71" />
                  <Bar dataKey="Měsíční doplatek" fill="#9b59b6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {activeTab === 'table' && (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Rok</th>
                    <th>Hodnota nemovitosti</th>
                    <th>Zbývající hypotéka</th>
                    <th>Výtěžek z prodeje</th>
                    <th>Měs. doplatek</th>
                    <th>Hodnota akcií</th>
                    <th>Rozdíl (nemovitost − akcie)</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((d) => (
                    <tr key={d.year}>
                      <td>{d.year}</td>
                      <td>{formatCZK(d.propertyValue)}</td>
                      <td>{formatCZK(d.remainingMortgage)}</td>
                      <td>{formatCZK(d.propertyEquity)}</td>
                      <td>{formatCZK(d.monthlyTopUp)}</td>
                      <td>{formatCZK(d.stockNetWorth)}</td>
                      <td className={d.propertyEquity - d.stockNetWorth > 0 ? 'positive' : 'negative'}>
                        {formatCZK(d.propertyEquity - d.stockNetWorth)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="explanation">
            <h3>Jak to funguje?</h3>
            <p>
              Kalkulačka porovnává dva scénáře: <strong>(1)</strong> Koupíte nemovitost na 100% hypotéku (ručíte stávající nemovitostí),
              pronajímáte ji, ale nájem nepokryje všechny náklady — rozdíl doplácíte. <strong>(2)</strong> Místo doplatku investujete
              stejnou částku do akcií. Jak nájem roste (ale splátka hypotéky zůstává stejná), doplatek se snižuje — a tedy i měsíční
              investice do akcií klesá. Graf ukazuje, která varianta vede k vyššímu čistému jmění.
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
