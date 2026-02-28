/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  // Set basePath to /english so all routes are under this path
  basePath: '/english',
  // assetPrefix is automatically set to basePath
}

module.exports = nextConfig
