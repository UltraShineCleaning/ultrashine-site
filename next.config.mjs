/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow loading the existing photos from the public/images folder
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'raw.githubusercontent.com',
      },
    ],
  },
  // Suppress the legacy /index.html static file at root from being served by Next
  // (Next.js serves /app/page.tsx for "/" instead — index.html is preserved as a backup)
};

export default nextConfig;
