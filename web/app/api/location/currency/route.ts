import { NextRequest, NextResponse } from "next/server";
import {
  detectCountryCodeFromGeoApis,
  detectCountryCodeFromHeaders,
  resolveCurrencyFromCountryCode,
} from "@/lib/currency";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const CLIENT_IP_HEADER_NAMES = [
  "cf-connecting-ip",
  "x-forwarded-for",
  "x-real-ip",
  "x-client-ip",
  "true-client-ip",
  "fastly-client-ip",
] as const;

const normalizeIpCandidate = (value?: string | null): string | null => {
  if (!value) return null;

  const firstValue = value.split(",")[0]?.trim();
  if (!firstValue || firstValue.toLowerCase() === "unknown") {
    return null;
  }

  const withoutIpv6Prefix = firstValue.replace(/^::ffff:/i, "");
  const bracketMatch = withoutIpv6Prefix.match(/^\[(.+)\](?::\d+)?$/);
  if (bracketMatch?.[1]) {
    return bracketMatch[1];
  }

  const ipv4WithPortMatch = withoutIpv6Prefix.match(
    /^(\d{1,3}(?:\.\d{1,3}){3}):\d+$/
  );
  if (ipv4WithPortMatch?.[1]) {
    return ipv4WithPortMatch[1];
  }

  return withoutIpv6Prefix;
};

const isPrivateIp = (ipAddress: string): boolean => {
  const normalized = ipAddress.toLowerCase();

  if (
    normalized === "127.0.0.1" ||
    normalized === "::1" ||
    normalized.startsWith("10.") ||
    normalized.startsWith("192.168.") ||
    normalized.startsWith("169.254.") ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe80:")
  ) {
    return true;
  }

  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(normalized)) {
    return true;
  }

  return false;
};

const extractClientIp = (request: NextRequest): string | null => {
  const candidates: string[] = [];

  for (const headerName of CLIENT_IP_HEADER_NAMES) {
    const headerValue = request.headers.get(headerName);
    if (!headerValue) continue;

    const parts = headerValue.split(",");
    for (const part of parts) {
      const normalized = normalizeIpCandidate(part);
      if (normalized) {
        candidates.push(normalized);
      }
    }
  }

  const publicIp = candidates.find((candidate) => !isPrivateIp(candidate));
  return publicIp || candidates[0] || null;
};

export async function GET(request: NextRequest) {
  try {
    const headerCountryCode = detectCountryCodeFromHeaders(request.headers);

    if (headerCountryCode) {
      return NextResponse.json({
        currency: resolveCurrencyFromCountryCode(headerCountryCode),
        countryCode: headerCountryCode,
        isLocationDetected: true,
        source: "header",
      });
    }

    const clientIp = extractClientIp(request);

    if (clientIp) {
      const geoCountryCode = await detectCountryCodeFromGeoApis(clientIp);

      if (geoCountryCode) {
        return NextResponse.json({
          currency: resolveCurrencyFromCountryCode(geoCountryCode),
          countryCode: geoCountryCode,
          isLocationDetected: true,
          source: "ip",
        });
      }
    }

    return NextResponse.json({
      currency: "USD",
      countryCode: null,
      isLocationDetected: false,
      source: "default",
    });
  } catch (error) {
    console.error("Failed to detect storefront currency", error);

    return NextResponse.json(
      {
        currency: "USD",
        countryCode: null,
        isLocationDetected: false,
        source: "error",
      },
      { status: 200 }
    );
  }
}
