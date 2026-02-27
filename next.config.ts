import type { NextConfig } from "next";

function getS3RemotePatterns() {
  const patterns: NonNullable<NextConfig["images"]>["remotePatterns"] = [];

  const publicBaseUrl = process.env.AWS_S3_PUBLIC_BASE_URL?.trim();
  if (publicBaseUrl) {
    try {
      const parsedPublicBaseUrl = new URL(publicBaseUrl);
      patterns.push({
        protocol: parsedPublicBaseUrl.protocol.replace(":", "") as "http" | "https",
        hostname: parsedPublicBaseUrl.hostname,
        pathname: `${parsedPublicBaseUrl.pathname.replace(/\/+$/g, "") || ""}/**`,
        ...(parsedPublicBaseUrl.port ? { port: parsedPublicBaseUrl.port } : {}),
      });
    } catch {
      // Ignore invalid public URL and fallback to bucket hostname config below.
    }
  }

  const bucket = process.env.AWS_S3_BUCKET?.trim();
  const region = process.env.AWS_REGION?.trim();
  if (bucket && region) {
    patterns.push({
      protocol: "https",
      hostname: `${bucket}.s3.${region}.amazonaws.com`,
      pathname: "/**",
    });
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
