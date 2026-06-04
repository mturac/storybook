import {
  extractFrameworkPackageName,
  frameworkPackages,
  frameworkToRenderer,
  getFrameworkName,
} from 'storybook/internal/common';
import type { SupportedFramework, SupportedRenderer } from 'storybook/internal/types';
import { type Options, SupportedBuilder } from 'storybook/internal/types';

export interface BuiltFrameworkGlobals {
  CHANNEL_OPTIONS?: Partial<Options> & {
    wsToken?: string;
  };
  STORYBOOK_BUILDER?: SupportedBuilder;
  STORYBOOK_FRAMEWORK?: SupportedFramework;
  STORYBOOK_RENDERER?: SupportedRenderer;
  STORYBOOK_NETWORK_ADDRESS?: string;
}

export const buildFrameworkGlobalsFromOptions = async (options: Options) => {
  const globals: BuiltFrameworkGlobals = {};

  const { builder: builderConfig, channelOptions } = await options.presets.apply('core');
  const builderName = typeof builderConfig === 'string' ? builderConfig : builderConfig?.name;
  const builder = Object.values(SupportedBuilder).find((builder) => builderName?.includes(builder));

  const frameworkName = await getFrameworkName(options);
  const frameworkPackageName = extractFrameworkPackageName(frameworkName);
  const framework = frameworkPackages[frameworkPackageName];
  const renderer = frameworkToRenderer[framework];

  if (options.configType === 'DEVELOPMENT') {
    // Manager only needs the token currently, so we don't pass any other channel options.
    globals.CHANNEL_OPTIONS = { wsToken: channelOptions?.wsToken };
  }
  globals.STORYBOOK_BUILDER = builder;
  globals.STORYBOOK_FRAMEWORK = framework;
  globals.STORYBOOK_RENDERER = renderer;
  globals.STORYBOOK_NETWORK_ADDRESS = options.networkAddress;

  return globals;
};
