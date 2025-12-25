import { describe, it, expect, beforeEach } from 'vitest';
import { useUserStore } from './userStore';

describe('userStore', () => {
  beforeEach(() => {
    useUserStore.setState({
      id: '',
      name: '',
      iconUrl: '',
    });
  });

  it('should initialize with empty state', () => {
    const state = useUserStore.getState();
    expect(state.id).toBe('');
    expect(state.name).toBe('');
    expect(state.iconUrl).toBe('');
  });

  it('should set name', () => {
    useUserStore.getState().setName('TestUser');
    expect(useUserStore.getState().name).toBe('TestUser');
  });

  it('should set icon URL', () => {
    useUserStore.getState().setIconUrl('https://example.com/icon.png');
    expect(useUserStore.getState().iconUrl).toBe('https://example.com/icon.png');
  });

  it('should initialize user with generated ID and name', () => {
    useUserStore.getState().initialize();
    const state = useUserStore.getState();

    expect(state.id).not.toBe('');
    expect(state.name).toMatch(/^Guest_/);
  });
});
