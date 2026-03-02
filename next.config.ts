import type { NextConfig } from "next";

function parseCsvEnvironmentVariable(name: string): string[] {
  const value = process.env[name];
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function getS3RemotePatterns() {
  const patterns: Array<
    NonNullable<NonNullable<NextConfig["images"]>["remotePatterns"]>[number]
  > = [];
  const seenPatternKeys = new Set<string>();

  function pushPatternFromUrl(baseUrl: string) {
    try {
      const parsedBaseUrl = new URL(baseUrl);
      const pattern = {
        protocol: parsedBaseUrl.protocol.replace(":", "") as "http" | "https",
        hostname: parsedBaseUrl.hostname,
        pathname: `${parsedBaseUrl.pathname.replace(/\/+$/g, "") || ""}/**`,
        ...(parsedBaseUrl.port ? { port: parsedBaseUrl.port } : {}),
      };
      const key = `${pattern.protocol}://${pattern.hostname}:${pattern.port || ""}${pattern.pathname}`;

      if (seenPatternKeys.has(key)) {
        return;
      }

      seenPatternKeys.add(key);
      patterns.push(pattern);
    } catch {
      // Ignore invalid URLs.
    }
  }

  const publicBaseUrl = process.env.AWS_S3_PUBLIC_BASE_URL?.trim();
  if (publicBaseUrl) {
    pushPatternFromUrl(publicBaseUrl);
  }

  for (const legacyBaseUrl of parseCsvEnvironmentVariable(
    "AWS_S3_LEGACY_PUBLIC_BASE_URLS",
  )) {
    pushPatternFromUrl(legacyBaseUrl);
  }

  const bucket = process.env.AWS_S3_BUCKET?.trim();
  const region = process.env.AWS_REGION?.trim();
  if (bucket && region) {
    pushPatternFromUrl(`https://${bucket}.s3.${region}.amazonaws.com`);
  }

  return patterns;
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        pathname: "/**",
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
        pathname: "/**",
      },
      ...getS3RemotePatterns(),
    ],
  },
};

export default nextConfig;
