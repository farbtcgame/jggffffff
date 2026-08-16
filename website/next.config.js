/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        // Keep the admin dashboard out of search engines / previews.
        // Real access control still happens on-chain (onlyOwner) and in the
        // admin UI itself (owner-wallet gate) — this header is just so it's
        // not casually discoverable/indexed alongside the public mint site.
        source: "/admin/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
};

module.exports = nextConfig;
