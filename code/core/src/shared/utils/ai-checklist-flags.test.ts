import { resolve } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SupportedBuilder, SupportedFramework, SupportedRenderer } from 'storybook/internal/types';

const { mockCacheStore, mockCache, mockSupportsAISetupFeature } = vi.hoisted(() => {
  const store = new Map<string, unknown>();
  return {
    mockCacheStore: store,
    mockCache: {
      get: async (key: string) => store.get(key),
      set: async (key: string, value: unknown) => {
        store.set(key, value);
      },
    },
    mockSupportsAISetupFeature: vi.fn(),
  };
});

vi.mock('storybook/internal/common', () => ({
  cache: mockCache,
  supportsAISetupFeature: mockSupportsAISetupFeature,
}));

describe('ai-checklist-flags', () => {
  beforeEach(() => {
    globalThis.STORYBOOK_GLOBALS = {
      STORYBOOK_RENDERER: SupportedRenderer.REACT,
      STORYBOOK_BUILDER: SupportedBuilder.VITE,
      STORYBOOK_FRAMEWORK: SupportedFramework.REACT_VITE,
    };
    mockCacheStore.clear();
    mockSupportsAISetupFeature.mockImplementation((renderer, builder, framework) => {
      if (framework === SupportedFramework.REACT_NATIVE_WEB_VITE) {
        return false;
      }
      return renderer === SupportedRenderer.REACT && builder === SupportedBuilder.VITE;
    });
  });

  afterEach(() => {
    mockCacheStore.clear();
    mockSupportsAISetupFeature.mockReset();
    vi.clearAllMocks();
    vi.resetModules();
    delete (globalThis as Record<string, unknown>).STORYBOOK_GLOBALS;
  });

  describe('hasAiInitOptIn', () => {
    it('returns true when nothing is cached', async () => {
      const { hasAiInitOptIn } = await import('./ai-checklist-flags.ts');
      expect(await hasAiInitOptIn('/some/project/.storybook')).toBe(true);
    });

    it('returns true when the cached configDir is for a different project', async () => {
      mockCacheStore.set('ai-init-opt-in', {
        timestamp: Date.now(),
        configDir: resolve('/repo/apps/web/.storybook'),
      });
      const { hasAiInitOptIn } = await import('./ai-checklist-flags.ts');
      expect(await hasAiInitOptIn('/repo/packages/ui/.storybook')).toBe(true);
    });

    it('returns true when the cached entry lacks a configDir field', async () => {
      // Defensive — should never happen in practice because the CLI always
      // writes configDir, but a corrupted cache shouldn't unlock this flag.
      mockCacheStore.set('ai-init-opt-in', { timestamp: Date.now() });
      const { hasAiInitOptIn } = await import('./ai-checklist-flags.ts');
      expect(await hasAiInitOptIn('/any/project/.storybook')).toBe(true);
    });

    it('returns true when the cached configDir matches the resolved input', async () => {
      mockCacheStore.set('ai-init-opt-in', {
        timestamp: Date.now(),
        configDir: resolve('/repo/apps/web/.storybook'),
        answer: true,
      });
      const { hasAiInitOptIn } = await import('./ai-checklist-flags.ts');
      expect(await hasAiInitOptIn('/repo/apps/web/.storybook')).toBe(true);
    });

    it('returns false when the cached entry is for this project and indicates user opt-out', async () => {
      // Defensive — should never happen in practice because the CLI always
      // writes configDir, but a corrupted cache shouldn't unlock this flag.
      mockCacheStore.set('ai-init-opt-in', {
        timestamp: Date.now(),
        configDir: resolve('/repo/apps/web/.storybook'),
        answer: false,
      });
      const { hasAiInitOptIn } = await import('./ai-checklist-flags.ts');
      expect(await hasAiInitOptIn('/repo/apps/web/.storybook')).toBe(false);
    });

    it('returns false when AI setup is unsupported for the current project context', async () => {
      globalThis.STORYBOOK_GLOBALS = {
        STORYBOOK_RENDERER: SupportedRenderer.VUE3,
        STORYBOOK_BUILDER: SupportedBuilder.VITE,
        STORYBOOK_FRAMEWORK: SupportedFramework.VUE3_VITE,
      };
      const { hasAiInitOptIn } = await import('./ai-checklist-flags.ts');
      expect(await hasAiInitOptIn('/repo/apps/web/.storybook')).toBe(false);
    });

    it('returns false when AI setup is unsupported for react-native-web-vite even with react+vite', async () => {
      globalThis.STORYBOOK_GLOBALS = {
        STORYBOOK_RENDERER: SupportedRenderer.REACT,
        STORYBOOK_BUILDER: SupportedBuilder.VITE,
        STORYBOOK_FRAMEWORK: SupportedFramework.REACT_NATIVE_WEB_VITE,
      };

      const { hasAiInitOptIn } = await import('./ai-checklist-flags.ts');
      expect(await hasAiInitOptIn('/repo/apps/mobile/.storybook')).toBe(false);
    });

    it('returns false when the renderer is not react', async () => {
      globalThis.STORYBOOK_GLOBALS = {
        STORYBOOK_RENDERER: SupportedRenderer.ANGULAR,
        STORYBOOK_BUILDER: SupportedBuilder.VITE,
        STORYBOOK_FRAMEWORK: SupportedFramework.ANGULAR,
      };

      const { hasAiInitOptIn } = await import('./ai-checklist-flags.ts');
      expect(await hasAiInitOptIn('/repo/apps/angular/.storybook')).toBe(false);
    });

    it('returns false when the builder is not vite', async () => {
      globalThis.STORYBOOK_GLOBALS = {
        STORYBOOK_RENDERER: SupportedRenderer.REACT,
        STORYBOOK_BUILDER: SupportedBuilder.WEBPACK5,
        STORYBOOK_FRAMEWORK: SupportedFramework.REACT_WEBPACK5,
      };

      const { hasAiInitOptIn } = await import('./ai-checklist-flags.ts');
      expect(await hasAiInitOptIn('/repo/apps/react-webpack/.storybook')).toBe(false);
    });
  });

  describe('hasAiSetupRun', () => {
    it('returns false when nothing is cached', async () => {
      const { hasAiSetupRun } = await import('./ai-checklist-flags.ts');
      expect(await hasAiSetupRun('/some/project/.storybook')).toBe(false);
    });

    it('returns true when the cached configDir matches', async () => {
      mockCacheStore.set('ai-setup-ran', {
        timestamp: Date.now(),
        configDir: resolve('/repo/apps/web/.storybook'),
      });
      const { hasAiSetupRun } = await import('./ai-checklist-flags.ts');
      expect(await hasAiSetupRun('/repo/apps/web/.storybook')).toBe(true);
    });

    it('returns false when the cached configDir is for a sibling monorepo project', async () => {
      // Regression: running `storybook ai setup` in one repo must not flip
      // another repo's checklist to "done".
      mockCacheStore.set('ai-setup-ran', {
        timestamp: Date.now(),
        configDir: resolve('/repo/apps/web/.storybook'),
      });
      const { hasAiSetupRun } = await import('./ai-checklist-flags.ts');
      expect(await hasAiSetupRun('/repo/packages/ui/.storybook')).toBe(false);
    });

    it('treats relative input as resolved against cwd', async () => {
      mockCacheStore.set('ai-setup-ran', {
        timestamp: Date.now(),
        configDir: resolve('.storybook'),
      });
      const { hasAiSetupRun } = await import('./ai-checklist-flags.ts');
      expect(await hasAiSetupRun('.storybook')).toBe(true);
    });

    it('returns false when the cached entry lacks a configDir field', async () => {
      mockCacheStore.set('ai-setup-ran', { timestamp: Date.now() });
      const { hasAiSetupRun } = await import('./ai-checklist-flags.ts');
      expect(await hasAiSetupRun('/any/project/.storybook')).toBe(false);
    });
  });

  describe('getAiSetupRunId', () => {
    it('returns undefined when nothing is cached', async () => {
      const { getAiSetupRunId } = await import('./ai-checklist-flags.ts');
      expect(await getAiSetupRunId('/some/project/.storybook')).toBeUndefined();
    });

    it('returns the runId when the cached configDir matches', async () => {
      mockCacheStore.set('ai-setup-ran', {
        timestamp: Date.now(),
        configDir: resolve('/repo/apps/web/.storybook'),
        runId: 'abc123',
      });
      const { getAiSetupRunId } = await import('./ai-checklist-flags.ts');
      expect(await getAiSetupRunId('/repo/apps/web/.storybook')).toBe('abc123');
    });

    it('returns undefined when the cached configDir is for a different project', async () => {
      mockCacheStore.set('ai-setup-ran', {
        timestamp: Date.now(),
        configDir: resolve('/repo/apps/web/.storybook'),
        runId: 'abc123',
      });
      const { getAiSetupRunId } = await import('./ai-checklist-flags.ts');
      expect(await getAiSetupRunId('/repo/packages/ui/.storybook')).toBeUndefined();
    });
  });
});
