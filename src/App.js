import React from 'react';
import './App.css';
import zhTranslationsUrl from './i18n/zh-cn.properties';
import enTranslationsUrl from './i18n/en-US.properties';

const parseProperties = (content) => {
  const lines = content.split(/\r?\n/);
  const parsed = {};

  lines.forEach((line) => {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('!')) {
      return;
    }

    const separatorIndex = trimmed.search(/[:=]/);

    if (separatorIndex === -1) {
      parsed[trimmed] = '';
      return;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();
    parsed[key] = value;
  });

  return parsed;
};

function App() {
  const [locale, setLocale] = React.useState('zh-CN');
  const [translations, setTranslations] = React.useState({});
  const [i18nReady, setI18nReady] = React.useState(false);
  const [annualWageIncome, setAnnualWageIncome] = React.useState('');
  const [annualOneTimeBonus, setAnnualOneTimeBonus] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [results, setResults] = React.useState(null);

  React.useEffect(() => {
    let isMounted = true;

    const loadTranslations = async () => {
      try {
        const [zhText, enText] = await Promise.all([
          fetch(zhTranslationsUrl).then((response) => response.text()),
          fetch(enTranslationsUrl).then((response) => response.text())
        ]);

        if (!isMounted) {
          return;
        }

        setTranslations({
          'zh-CN': parseProperties(zhText),
          'en-US': parseProperties(enText)
        });
      } finally {
        if (isMounted) {
          setI18nReady(true);
        }
      }
    };

    loadTranslations();

    return () => {
      isMounted = false;
    };
  }, []);

  const t = translations[locale] || {};
  const tt = (key) => t[key] || key;

  const percentFormatter = React.useMemo(() => {
    return new Intl.NumberFormat(locale, {
      style: 'percent',
      maximumFractionDigits: 2
    });
  }, [locale]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setResults(null);

    const wage = Number(annualWageIncome);
    const bonus = Number(annualOneTimeBonus);

    if (!Number.isFinite(wage) || !Number.isFinite(bonus) || wage < 0 || bonus < 0) {
      setError(tt('errorRequired'));
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/v1/simulate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify({
          annualWageIncome: wage,
          annualOneTimeBonus: bonus
        })
      });

      if (!response.ok) {
        throw new Error('Request failed');
      }

      const data = await response.json();
      setResults(data.results || null);
    } catch (err) {
      setError(tt('errorNetwork'));
    } finally {
      setLoading(false);
    }
  };

  const renderTraceLog = (traceLog) => {
    if (!traceLog || !Array.isArray(traceLog.subLogs)) {
      return null;
    }

    return (
      <div className="trace-log">
        <div className="trace-title">{tt('traceLog')}</div>
        <div className="trace-list">
          {traceLog.subLogs.map((log, index) => (
            <div className="trace-card" key={`${log.header || 'log'}-${index}`}>
              {log.header && <div className="trace-header">{log.header}</div>}
              {Array.isArray(log.body) && (
                <ul className="trace-body">
                  {log.body.map((item, itemIndex) => (
                    <li className="trace-row" key={`${item.label || 'item'}-${itemIndex}`}>
                      <span>{item.label}</span>
                      <span>{item.amount}</span>
                    </li>
                  ))}
                </ul>
              )}
              {log.footer && <div className="trace-footer">{log.footer}</div>}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderTaxItems = (items) => {
    if (!Array.isArray(items)) {
      return null;
    }

    return (
      <div className="items-list">
        {items.map((item, index) => (
          <div className="item-card" key={`${item.taxBaseAmount || 'item'}-${index}`}>
            <div className="item-row">
              <span>{tt('taxBaseAmount')}</span>
              <span>{item.taxBaseAmount}</span>
            </div>
            <div className="item-row">
              <span>{tt('taxAmount')}</span>
              <span>{item.taxAmount}</span>
            </div>
            <div className="item-row">
              <span>{tt('taxRate')}</span>
              <span>{percentFormatter.format(item.taxRate || 0)}</span>
            </div>
            {renderTraceLog(item.traceLog)}
          </div>
        ))}
      </div>
    );
  };

  const renderResultBlock = (title, result) => {
    if (!result) {
      return null;
    }

    return (
      <section className="result-card">
        <div className="result-header">
          <h3>{title}</h3>
          <div className="result-total">
            <span>{tt('totalTaxAmount')}</span>
            <strong>{result.totalTaxAmount}</strong>
          </div>
        </div>
        <div className="result-body">
          <div className="result-section-title">{tt('itemsTitle')}</div>
          {renderTaxItems(result.items)}
        </div>
      </section>
    );
  };

  return (
    <div className="app">
      <header className="hero">
        <div className="hero-content">
          <div className="hero-top">
            <span className="pill">IIT</span>
            <div className="language-switch">
              <label htmlFor="language">{t.languageLabel}</label>
              <select
                id="language"
                value={locale}
                onChange={(event) => setLocale(event.target.value)}
              >
                <option value="zh-CN">中文</option>
                <option value="en-US">English</option>
              </select>
            </div>
          </div>
          <h1>{tt('appTitle')}</h1>
          <p>{tt('appSubtitle')}</p>
        </div>
      </header>

      <main className="container">
        <section className="panel">
          <h2>{tt('formTitle')}</h2>
          <form className="input-grid" onSubmit={handleSubmit}>
            <label className="field">
              <span>{tt('wageLabel')}</span>
              <input
                type="number"
                min="0"
                step="1"
                value={annualWageIncome}
                placeholder={tt('wagePlaceholder')}
                onChange={(event) => setAnnualWageIncome(event.target.value)}
                required
              />
            </label>
            <label className="field">
              <span>{tt('bonusLabel')}</span>
              <input
                type="number"
                min="0"
                step="1"
                value={annualOneTimeBonus}
                placeholder={tt('bonusPlaceholder')}
                onChange={(event) => setAnnualOneTimeBonus(event.target.value)}
                required
              />
            </label>
            <button className="primary" type="submit" disabled={loading}>
              {loading ? tt('calculating') : tt('calculate')}
            </button>
          </form>
          {!i18nReady && <div className="status">{tt('loadingTranslations')}</div>}
          {error && <div className="status error">{error}</div>}
        </section>

        <section className="panel results" aria-live="polite">
          <h2>{tt('resultsTitle')}</h2>
          {!results && <p className="placeholder">{tt('appSubtitle')}</p>}
          {results && (
            <div className="results-grid">
              {renderResultBlock(tt('oneTimeTitle'), results.ONE_TIME_TAXATION)}
              {renderResultBlock(tt('integratedTitle'), results.INTEGRATED_TAXATION)}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;
