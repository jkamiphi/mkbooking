interface ServerConfig {
  awsAccessKeyId: string;
  awsRegion: string;
  awsS3Bucket: string;
  awsS3PublicBaseUrl: string | null;
  awsSecretAccessKey: string;
  campaignRequestStartGapDays: number;
}

let cachedServerConfig: ServerConfig | null = null;
let cachedCampaignRequestStartGapDays: number | null = null;

function readRequiredEnvironmentVariable(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} environment variable is not set`);
  }

  return value;
}

function readNonNegativeIntegerEnvironmentVariable(
  name: string,
  fallback: number,
): number {
  const value = process.env[name];
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }

  return Math.floor(parsed);
}

export function getCampaignRequestStartGapDays() {
  if (cachedCampaignRequestStartGapDays !== null) {
    return cachedCampaignRequestStartGapDays;
  }

  cachedCampaignRequestStartGapDays = readNonNegativeIntegerEnvironmentVariable(
    "CAMPAIGN_REQUEST_START_GAP_DAYS",
    7,
  );

  return cachedCampaignRequestStartGapDays;
}

export function getServerConfig(): ServerConfig {
  if (cachedServerConfig) {
    return cachedServerConfig;
  }

  cachedServerConfig = {
    awsAccessKeyId: readRequiredEnvironmentVariable("AWS_ACCESS_KEY_ID"),
    awsRegion: readRequiredEnvironmentVariable("AWS_REGION"),
    awsS3Bucket: readRequiredEnvironmentVariable("AWS_S3_BUCKET"),
    awsS3PublicBaseUrl: process.env.AWS_S3_PUBLIC_BASE_URL?.trim() || null,
    awsSecretAccessKey: readRequiredEnvironmentVariable("AWS_SECRET_ACCESS_KEY"),
    campaignRequestStartGapDays: getCampaignRequestStartGapDays(),
  };

  return cachedServerConfig;
}
