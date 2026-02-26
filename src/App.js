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

const evaluateExpression = (expression) => {
  const trimmed = expression.trim();

  if (trimmed === '') {
    return NaN;
  }

  const tokens = [];
  let index = 0;

  while (index < trimmed.length) {
    const char = trimmed[index];

    if (char === ' ' || char === '\t' || char === '\n') {
      index += 1;
      continue;
    }

    if (char >= '0' && char <= '9' || char === '.') {
      let numberText = '';
      let dotCount = 0;

      while (index < trimmed.length) {
        const current = trimmed[index];

        if (current === '.') {
          dotCount += 1;
          if (dotCount > 1) {
            return NaN;
          }
          numberText += current;
          index += 1;
          continue;
        }

        if (current >= '0' && current <= '9') {
          numberText += current;
          index += 1;
          continue;
        }

        break;
      }

      if (numberText === '.' || numberText === '') {
        return NaN;
      }

      tokens.push({ type: 'number', value: Number(numberText) });
      continue;
    }

    if ('+-*/()'.includes(char)) {
      if (char === '(' || char === ')') {
        tokens.push({ type: 'paren', value: char });
      } else {
        tokens.push({ type: 'operator', value: char });
      }
      index += 1;
      continue;
    }

    return NaN;
  }

  const output = [];
  const operators = [];
  const precedence = {
    '+': 1,
    '-': 1,
    '*': 2,
    '/': 2,
    'u+': 3,
    'u-': 3
  };
  const rightAssociative = new Set(['u+', 'u-']);

  let previous = null;

  for (const token of tokens) {
    if (token.type === 'number') {
      output.push(token);
      previous = token;
      continue;
    }

    if (token.type === 'operator') {
      let op = token.value;
      const isUnary = !previous || previous.type === 'operator' || (previous.type === 'paren' && previous.value === '(');
      if (isUnary) {
        op = op === '-' ? 'u-' : 'u+';
      }

      while (operators.length) {
        const top = operators[operators.length - 1];
        if (top.type !== 'operator') {
          break;
        }
        const topOp = top.value;
        const isRight = rightAssociative.has(op);
        if ((isRight && precedence[op] < precedence[topOp]) || (!isRight && precedence[op] <= precedence[topOp])) {
          output.push(operators.pop());
          continue;
        }
        break;
      }

      operators.push({ type: 'operator', value: op });
      previous = { type: 'operator', value: op };
      continue;
    }

    if (token.type === 'paren' && token.value === '(') {
      operators.push(token);
      previous = token;
      continue;
    }

    if (token.type === 'paren' && token.value === ')') {
      let matched = false;
      while (operators.length) {
        const top = operators.pop();
        if (top.type === 'paren' && top.value === '(') {
          matched = true;
          break;
        }
        output.push(top);
      }

      if (!matched) {
        return NaN;
      }
      previous = token;
    }
  }

  while (operators.length) {
    const top = operators.pop();
    if (top.type === 'paren') {
      return NaN;
    }
    output.push(top);
  }

  const stack = [];
  for (const token of output) {
    if (token.type === 'number') {
      stack.push(token.value);
      continue;
    }

    if (token.type === 'operator') {
      if (token.value === 'u+' || token.value === 'u-') {
        if (stack.length < 1) {
          return NaN;
        }
        const value = stack.pop();
        stack.push(token.value === 'u-' ? -value : value);
        continue;
      }

      if (stack.length < 2) {
        return NaN;
      }
      const right = stack.pop();
      const left = stack.pop();

      switch (token.value) {
        case '+':
          stack.push(left + right);
          break;
        case '-':
          stack.push(left - right);
          break;
        case '*':
          stack.push(left * right);
          break;
        case '/':
          stack.push(left / right);
          break;
        default:
          return NaN;
      }
    }
  }

  if (stack.length !== 1) {
    return NaN;
  }

  return stack[0];
};

function App() {
  const [locale, setLocale] = React.useState('zh-CN');
  const [translations, setTranslations] = React.useState({});
  const [i18nReady, setI18nReady] = React.useState(false);
  const [annualWageIncome, setAnnualWageIncome] = React.useState('');
  const [annualOneTimeBonus, setAnnualOneTimeBonus] = React.useState('');
  const [serviceRemuneration, setServiceRemuneration] = React.useState('');
  const [royaltyFees, setRoyaltyFees] = React.useState('');
  const [authorsRemuneration, setAuthorsRemuneration] = React.useState('');
  const [specialDeductions, setSpecialDeductions] = React.useState('');
  const [additionalSpecialDeductions, setAdditionalSpecialDeductions] = React.useState('');
  const [otherDeductions, setOtherDeductions] = React.useState('');
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

  const handleAmountBlur = (value, setter) => {
    const trimmed = value.trim();

    if (trimmed === '') {
      return;
    }

    const evaluated = evaluateExpression(trimmed);
    if (Number.isFinite(evaluated)) {
      setter(String(evaluated));
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setResults(null);

    const parseAmount = (value, isRequired) => {
      const trimmed = value.trim();

      if (trimmed === '') {
        return isRequired ? NaN : 0;
      }

      return evaluateExpression(trimmed);
    };

    const wage = parseAmount(annualWageIncome, true);
    const bonus = parseAmount(annualOneTimeBonus, false);
    const service = parseAmount(serviceRemuneration, false);
    const royalty = parseAmount(royaltyFees, false);
    const authors = parseAmount(authorsRemuneration, false);
    const special = parseAmount(specialDeductions, false);
    const additional = parseAmount(additionalSpecialDeductions, false);
    const other = parseAmount(otherDeductions, false);

    const values = [wage, bonus, service, royalty, authors, special, additional, other];

    if (annualWageIncome.trim() === '' || values.some((value) => !Number.isFinite(value) || value < 0)) {
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
          annualOneTimeBonus: bonus,
          serviceRemuneration: service,
          royaltyFees: royalty,
          authorsRemuneration: authors,
          specialDeductions: special,
          additionalSpecialDeductions: additional,
          otherDeductions: other,
          locale
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
    if (!items) {
      return null;
    }

    const itemEntries = Array.isArray(items)
      ? items.map((item, index) => [`item-${index}`, item])
      : Object.entries(items);

    return (
      <div className="items-list">
        {itemEntries.map(([key, item], index) => (
          <div className="item-card" key={`${item.taxBaseAmount || key}-${index}`}>
            <div className="item-title">{tt(`item.${key}`)}</div>
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
              <label htmlFor="language">{tt('languageLabel')}</label>
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
                type="text"
                inputMode="decimal"
                value={annualWageIncome}
                placeholder={tt('wagePlaceholder')}
                onChange={(event) => setAnnualWageIncome(event.target.value)}
                onBlur={(event) => handleAmountBlur(event.target.value, setAnnualWageIncome)}
                required
              />
            </label>
            <label className="field">
              <span>{tt('bonusLabel')}</span>
              <input
                type="text"
                inputMode="decimal"
                value={annualOneTimeBonus}
                placeholder={tt('bonusPlaceholder')}
                onChange={(event) => setAnnualOneTimeBonus(event.target.value)}
                onBlur={(event) => handleAmountBlur(event.target.value, setAnnualOneTimeBonus)}
              />
            </label>
            <label className="field">
              <span>{tt('serviceRemunerationLabel')}</span>
              <input
                type="text"
                inputMode="decimal"
                value={serviceRemuneration}
                placeholder={tt('serviceRemunerationPlaceholder')}
                onChange={(event) => setServiceRemuneration(event.target.value)}
                onBlur={(event) => handleAmountBlur(event.target.value, setServiceRemuneration)}
              />
            </label>
            <label className="field">
              <span>{tt('royaltyFeesLabel')}</span>
              <input
                type="text"
                inputMode="decimal"
                value={royaltyFees}
                placeholder={tt('royaltyFeesPlaceholder')}
                onChange={(event) => setRoyaltyFees(event.target.value)}
                onBlur={(event) => handleAmountBlur(event.target.value, setRoyaltyFees)}
              />
            </label>
            <label className="field">
              <span>{tt('authorsRemunerationLabel')}</span>
              <input
                type="text"
                inputMode="decimal"
                value={authorsRemuneration}
                placeholder={tt('authorsRemunerationPlaceholder')}
                onChange={(event) => setAuthorsRemuneration(event.target.value)}
                onBlur={(event) => handleAmountBlur(event.target.value, setAuthorsRemuneration)}
              />
            </label>
            <label className="field">
              <span>{tt('specialDeductionsLabel')}</span>
              <input
                type="text"
                inputMode="decimal"
                value={specialDeductions}
                placeholder={tt('specialDeductionsPlaceholder')}
                onChange={(event) => setSpecialDeductions(event.target.value)}
                onBlur={(event) => handleAmountBlur(event.target.value, setSpecialDeductions)}
              />
            </label>
            <label className="field">
              <span>{tt('additionalSpecialDeductionsLabel')}</span>
              <input
                type="text"
                inputMode="decimal"
                value={additionalSpecialDeductions}
                placeholder={tt('additionalSpecialDeductionsPlaceholder')}
                onChange={(event) => setAdditionalSpecialDeductions(event.target.value)}
                onBlur={(event) => handleAmountBlur(event.target.value, setAdditionalSpecialDeductions)}
              />
            </label>
            <label className="field">
              <span>{tt('otherDeductionsLabel')}</span>
              <input
                type="text"
                inputMode="decimal"
                value={otherDeductions}
                placeholder={tt('otherDeductionsPlaceholder')}
                onChange={(event) => setOtherDeductions(event.target.value)}
                onBlur={(event) => handleAmountBlur(event.target.value, setOtherDeductions)}
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
