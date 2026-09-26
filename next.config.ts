import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// Picks up the request config at src/i18n/request.ts.
const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {};

export default withNextIntl(nextConfig);
