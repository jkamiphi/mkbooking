interface ServerConfig {
  awsAccessKeyId: string;
  awsRegion: string;
  awsS3Bucket: string;
  awsS3PublicBaseUrl: string | null;
  awsSecretAccessKey: string;
}

let cachedServerConfig: ServerConfig | null = null;

function readRequiredEnvironmentVariable(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} environment variable is not set`);
  }

  return value;
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
  };

  return cachedServerConfig;
}
