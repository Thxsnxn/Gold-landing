export interface AppConfig {
  ornament_offset: number;
}

const DEFAULT_CONFIG: AppConfig = {
  ornament_offset: 300,
};

function parseOffset(value: string | undefined): number {
  if (!value) return DEFAULT_CONFIG.ornament_offset;

  const offset = Number(value);
  if (!Number.isFinite(offset) || offset < 0 || offset > 5000) {
    return DEFAULT_CONFIG.ornament_offset;
  }

  return offset;
}

/**
 * Load config from environment variables.
 * Set ORNAMENT_OFFSET on the hosting provider to change the ornament price.
 */
export function getConfig(): AppConfig {
  return {
    ornament_offset: parseOffset(process.env.ORNAMENT_OFFSET),
  };
}
