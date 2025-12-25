import { describe, it, expect } from 'vitest';
import { render, screen } from '@/test/test-utils';
import Loading from './Loading';

describe('Loading', () => {
  it('should render with default props', () => {
    render(<Loading />);
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('should render with text', () => {
    render(<Loading text="読み込み中..." />);
    expect(screen.getByText('読み込み中...')).toBeInTheDocument();
  });

  it('should apply small size class', () => {
    render(<Loading size="sm" />);
    const spinner = document.querySelector('.h-4.w-4');
    expect(spinner).toBeInTheDocument();
  });

  it('should apply large size class', () => {
    render(<Loading size="lg" />);
    const spinner = document.querySelector('.h-12.w-12');
    expect(spinner).toBeInTheDocument();
  });
});
