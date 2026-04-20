import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import RealityCheckPanel from '@/components/RealityCheckPanel';
import { MOCK_ANALYSES } from '@/lib/pulzus-mock-analyses';
import { CountryProvider } from '@/lib/country-context';

const DEMO_URLS = Object.keys(MOCK_ANALYSES);

function renderPanel() {
  return render(
    <CountryProvider>
      <RealityCheckPanel />
    </CountryProvider>,
  );
}

describe('RealityCheckPanel', () => {
  it('shows the unknown URL message with clickable demo links', async () => {
    renderPanel();

    fireEvent.change(screen.getByLabelText(/Cikklink/i), {
      target: { value: 'https://example.com/unknown-story' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Elemzés megnyitása/i }));

    expect(await screen.findByText(/jelenleg nem érhető el elemzés/i)).toBeInTheDocument();
    for (const url of DEMO_URLS) {
      expect(screen.getByRole('button', { name: url })).toBeInTheDocument();
    }
  });

  it('renders the major analysis cards for a supported URL', async () => {
    renderPanel();

    fireEvent.change(screen.getByLabelText(/Cikklink/i), {
      target: { value: DEMO_URLS[0] },
    });
    fireEvent.click(screen.getByRole('button', { name: /Elemzés megnyitása/i }));

    expect(await screen.findByText('TORZÍTOTT')).toBeInTheDocument();
    expect(screen.getByText(/Cím elemzés/i)).toBeInTheDocument();
    expect(screen.getByText(/Pszichológiai elemzés/i)).toBeInTheDocument();
    expect(screen.getByText(/Manipuláció index/i)).toBeInTheDocument();
    expect(screen.getByText(/Narratíva-lánc/i)).toBeInTheDocument();
    expect(screen.getByText(/Célközönség elemzés/i)).toBeInTheDocument();
  });

  it('supports the positive feedback flow', async () => {
    renderPanel();

    fireEvent.change(screen.getByLabelText(/Cikklink/i), {
      target: { value: DEMO_URLS[4] },
    });
    fireEvent.click(screen.getByRole('button', { name: /Elemzés megnyitása/i }));

    fireEvent.click(await screen.findByRole('button', { name: /Igen, helyes/i }));

    expect(screen.getByText(/Köszönjük a visszajelzést/i)).toBeInTheDocument();
  });

  it('supports the negative feedback flow with a reason selector', async () => {
    renderPanel();

    fireEvent.change(screen.getByLabelText(/Cikklink/i), {
      target: { value: DEMO_URLS[1] },
    });
    fireEvent.click(screen.getByRole('button', { name: /Elemzés megnyitása/i }));

    fireEvent.click(await screen.findByRole('button', { name: /Nem, téves/i }));

    fireEvent.change(screen.getByLabelText(/Visszajelzés indoka/i), {
      target: { value: 'Hiányos kontextus' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^Küldés$/i }));

    expect(screen.getByText(/Köszönjük a visszajelzést/i)).toBeInTheDocument();
  });
});
