import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

function renderTabs() {
  return render(
    <Tabs defaultValue="tab1">
      <TabsList>
        <TabsTrigger value="tab1">Tab 1</TabsTrigger>
        <TabsTrigger value="tab2">Tab 2</TabsTrigger>
      </TabsList>
      <TabsContent value="tab1">Content 1</TabsContent>
      <TabsContent value="tab2">Content 2</TabsContent>
    </Tabs>
  );
}

describe('Tabs', () => {
  it('タブリストが描画される', () => {
    renderTabs();
    expect(screen.getByRole('tablist')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Tab 1' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Tab 2' })).toBeInTheDocument();
  });

  it('デフォルトタブのコンテンツが表示される', () => {
    renderTabs();
    expect(screen.getByText('Content 1')).toBeInTheDocument();
  });

  it('タブ切り替えでコンテンツが切り替わる', async () => {
    const user = userEvent.setup();
    renderTabs();
    await user.click(screen.getByRole('tab', { name: 'Tab 2' }));
    expect(screen.getByText('Content 2')).toBeInTheDocument();
  });

  it('キーボード操作でタブ切り替えできる', async () => {
    const user = userEvent.setup();
    renderTabs();
    await user.click(screen.getByRole('tab', { name: 'Tab 1' }));
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Tab 2' })).toHaveFocus();
  });
});
