import { useState, useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar,
} from 'recharts';
import type { Config, YearData } from './types';
import { calculate } from './calculations';
import './App.css';

const defaultConfig: Config = {
  propertyPrice: 4_000_000,
  mortgageRate: 5.0,
  mortgageTerm: 30,
  propertyGrowthRate: 3.0,
  monthlyRent: 12_000,
  rentGrowthRate: 3.0,
  vacancyMonths: 1,
  maintenanceFund: 2_500,
  maintenanceGrowthRate: 2.0,
  insuranceYearly: 3_000,
  propertyTax: 1_500,
  stockReturnRate: 8.0,
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
  return (
    <div className="input-field">
      <label>{label}</label>
      <div className="input-wrapper">
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
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
  const [config, setConfig] = useState<Config>(defaultConfig);
  const [activeTab, setActiveTab] = useState<'chart' | 'table' | 'cashflow'>('chart');

  const update = <K extends keyof Config>(key: K, value: Config[K]) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  const data: YearData[] = useMemo(() => calculate(config), [config]);

  const chartData = useMemo(() => data.map((d) => ({
    year: d.year,
    'Výtěžek z prodeje nemovitosti': Math.round(d.propertyEquity),
    'Hodnota akcií': Math.round(d.stockNetWorth),
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
        <p className="subtitle">Vyplatí se koupit byt na hypotéku a pronajímat, nebo investovat do akcií?</p>
      </header>

      <div className="layout">
        <aside className="sidebar">
          <section>
            <h3>Nemovitost</h3>
            <InputField label="Cena nemovitosti" value={config.propertyPrice} onChange={(v) => update('propertyPrice', v)} step={100000} suffix="Kč" min={0} />
            <InputField label="Úrok hypotéky" value={config.mortgageRate} onChange={(v) => update('mortgageRate', v)} step={0.1} suffix="% p.a." min={0} max={15} />
            <InputField label="Doba splácení" value={config.mortgageTerm} onChange={(v) => update('mortgageTerm', v)} step={1} suffix="let" min={1} max={40} />
            <InputField label="Růst ceny nemovitosti" value={config.propertyGrowthRate} onChange={(v) => update('propertyGrowthRate', v)} step={0.5} suffix="% ročně" min={-5} max={15} />
          </section>

          <section>
            <h3>Pronájem</h3>
            <InputField label="Měsíční nájem" value={config.monthlyRent} onChange={(v) => update('monthlyRent', v)} step={500} suffix="Kč" min={0} />
            <InputField label="Růst nájmu" value={config.rentGrowthRate} onChange={(v) => update('rentGrowthRate', v)} step={0.5} suffix="% ročně" min={0} max={15} />
            <InputField label="Prázdné měsíce za rok" value={config.vacancyMonths} onChange={(v) => update('vacancyMonths', v)} step={0.5} suffix="měs." min={0} max={12} />
          </section>

          <section>
            <h3>Náklady</h3>
            <InputField label="Fond oprav (měsíčně)" value={config.maintenanceFund} onChange={(v) => update('maintenanceFund', v)} step={100} suffix="Kč" min={0} />
            <InputField label="Růst fondu oprav" value={config.maintenanceGrowthRate} onChange={(v) => update('maintenanceGrowthRate', v)} step={0.5} suffix="% ročně" min={0} max={15} />
            <InputField label="Pojištění (ročně)" value={config.insuranceYearly} onChange={(v) => update('insuranceYearly', v)} step={500} suffix="Kč" min={0} />
            <InputField label="Daň z nemovitosti (ročně)" value={config.propertyTax} onChange={(v) => update('propertyTax', v)} step={100} suffix="Kč" min={0} />
          </section>

          <section>
            <h3>Akcie</h3>
            <InputField label="Průměrný roční výnos" value={config.stockReturnRate} onChange={(v) => update('stockReturnRate', v)} step={0.5} suffix="%" min={-10} max={30} />
          </section>

          <section>
            <h3>Horizont</h3>
            <InputField label="Investiční horizont" value={config.years} onChange={(v) => update('years', v)} step={1} suffix="let" min={1} max={40} />
          </section>
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
              <div className="card-detail">Investováno celkem: {formatCZK(lastYear.totalStockInvested)}</div>
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
