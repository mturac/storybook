import { SupportedBuilder, SupportedFramework, SupportedRenderer } from 'storybook/internal/types';

const ONBOARDING_PROJECT_TYPES = new Set([
  'react',
  'tanstack_react',
  'react_scripts',
  'react_native_web',
  'nextjs',
  'vue3',
  'angular',
]);

export function supportsOnboardingFeature(projectType: string): boolean {
  return ONBOARDING_PROJECT_TYPES.has(projectType);
}

export function supportsAISetupFeature(
  renderer: SupportedRenderer | undefined,
  builder: SupportedBuilder | undefined,
  framework: SupportedFramework | undefined
): boolean {
  if (framework === SupportedFramework.REACT_NATIVE_WEB_VITE) {
    return false;
  }
  return renderer === SupportedRenderer.REACT && builder === SupportedBuilder.VITE;
}
