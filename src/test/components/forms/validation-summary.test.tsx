import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ValidationSummary } from '@/components/forms/validation-summary';

describe('ValidationSummary', () => {
  const messages = { RANGE: undefined, OTHER: 'Other error' };
  it('入力欄側のエラーのみなら空の一覧も表示しない', () => {
    const { container } = render(<ValidationSummary errors={['RANGE']} messages={messages} />);
    expect(container).toBeEmptyDOMElement();
  });
  it('入力欄側のエラーを省いても別のエラーは残す', () => {
    render(<ValidationSummary errors={['RANGE', 'OTHER']} messages={messages} />);
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
    expect(screen.getByText('Other error')).toBeInTheDocument();
  });
});
