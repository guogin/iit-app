import { render, screen } from '@testing-library/react';
import App from './App';

test('renders IITDS title and calculate button', () => {
  render(<App />);
  const titleElement = screen.getByText(/IITDS/i);
  const buttonElement = screen.getByRole('button', { name: /计算|Calculate/i });
  expect(titleElement).toBeInTheDocument();
  expect(buttonElement).toBeInTheDocument();
});
