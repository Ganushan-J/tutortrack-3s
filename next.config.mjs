/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  async rewrites() {
    const apiOrigin = (process.env.FLASK_API_ORIGIN || 'http://127.0.0.1:5000').replace(/\/$/, '')
    return [{ source: '/api/:path*', destination: `${apiOrigin}/api/:path*` }]
  },
}

export default nextConfig
