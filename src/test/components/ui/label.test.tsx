import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Label } from '@/components/ui/label';

describe('Label', () => {
  it('デフォルトで描画される', () => {
    render(<Label>Username</Label>);
    expect(screen.getByText('Username')).toBeInTheDocument();
  });

  it('htmlFor 属性で関連付けられる', () => {
    render(
      <>
        <Label htmlFor="email">Email</Label>
        <input id="email" />
      </>
    );
    const label = screen.getByText('Email');
    expect(label).toHaveAttribute('for', 'email');
  });
});
