import { AddonVitestService, type ProjectType } from 'storybook/internal/cli';
import {
  type JsPackageManager,
  supportsAISetupFeature,
  supportsOnboardingFeature,
} from 'storybook/internal/common';
import type {
  SupportedBuilder,
  SupportedFramework,
  SupportedRenderer,
} from 'storybook/internal/types';

export interface FeatureCompatibilityResult {
  compatible: boolean;
  reasons?: string[];
}

/** Service for validating feature compatibility with project configurations */
export class FeatureCompatibilityService {
  constructor(
    readonly packageManager: JsPackageManager,
    private readonly addonVitestService = new AddonVitestService(packageManager)
  ) {}

  /** Check if a project type supports onboarding */

  static supportsOnboarding(projectType: ProjectType): boolean {
    return supportsOnboardingFeature(projectType);
  }

  /** Check if AI-assisted setup (storybook ai setup) is supported for this project configuration */
  static supportsAISetupFeature(
    renderer: SupportedRenderer,
    builder: SupportedBuilder,
    framework: SupportedFramework | null
  ): boolean {
    return supportsAISetupFeature(renderer, builder, framework);
  }

  /**
   * Validate all compatibility checks for test feature
   *
   * @param packageManager - Package manager instance
   * @param framework - Detected framework (e.g., 'nextjs', 'react-vite')
   * @param builder - Detected builder (e.g. SupportedBuilder.Vite)
   * @param directory - Project root directory
   * @returns Compatibility result with reasons if incompatible
   */
  async validateTestFeatureCompatibility(
    framework: SupportedFramework | null | undefined,
    builder: SupportedBuilder,
    directory: string
  ): Promise<FeatureCompatibilityResult> {
    const compatibilityResult = await this.addonVitestService.validateCompatibility({
      framework,
      builder,
      projectRoot: directory,
    });

    if (!compatibilityResult.compatible) {
      return compatibilityResult;
    }

    return { compatible: true };
  }
}
