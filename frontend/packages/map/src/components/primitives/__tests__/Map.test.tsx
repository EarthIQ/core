import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { Map } from '../Map';

describe('Map', () => {
  it('renders without crashing', () => {
    const { container } = render(
      <Map
        initialViewState={{
          longitude: 0,
          latitude: 0,
          zoom: 2
        }}
      />
    );
    
    expect(container.querySelector('.map-container')).toBeInTheDocument();
  });

  it('calls onLoad when map loads', async () => {
    const onLoad = vi.fn();
    
    render(
      <Map
        initialViewState={{
          longitude: 0,
          latitude: 0,
          zoom: 2
        }}
        onLoad={onLoad}
      />
    );
    
    // Map load is async
    await waitFor(() => {
      expect(onLoad).toHaveBeenCalled();
    }, { timeout: 1000 });
  });

  it('renders children when loaded', async () => {
    render(
      <Map
        initialViewState={{
          longitude: 0,
          latitude: 0,
          zoom: 2
        }}
      >
        <div data-testid="child">Child Content</div>
      </Map>
    );
    
    await waitFor(() => {
      expect(screen.getByTestId('child')).toBeInTheDocument();
    });
  });
});