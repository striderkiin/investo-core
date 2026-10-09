import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { LegalDocument } from './LegalDocument';

describe('LegalDocument', () => {
  it('renders headings, paragraphs, lists, bold and links', () => {
    const { container } = render(
      <LegalDocument text={'Intro with **bold** words.\n\n## 1. Rules\n\n- First\n- Second\n\nSee the [Terms](/terms).'} />
    );
    expect(container.querySelector('h2')?.textContent).toBe('1. Rules');
    expect(container.querySelectorAll('li')).toHaveLength(2);
    expect(container.querySelector('strong')?.textContent).toBe('bold');
    expect(container.querySelector('a')?.getAttribute('href')).toBe('/terms');
  });

  it('never renders HTML or unsafe links', () => {
    const { container } = render(<LegalDocument text={'<img src=x onerror=alert(1)> and [click](javascript:alert(1))'} />);
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('a')).toBeNull();
    expect(container.textContent).toContain('<img src=x onerror=alert(1)>');
  });
});
