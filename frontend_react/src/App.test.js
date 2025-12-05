import { render, screen } from '@testing-library/react';
import App from './App';

test('renders Nokia 7360 title', () => {
  render(<App />);
  const el = screen.getByText(/OLT RX-signal Monitor/i);
  expect(el).toBeInTheDocument();
});
