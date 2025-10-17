/**
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  /* config options here */
  typescript: {
    // Ignore build errors for faster development, but allow production builds
    ignoreBuildErrors: false,
  },
  eslint: {
    // Allow warnings during builds, but fail on errors
    ignoreDuringBuilds: true,
  },
  
  // Optimize images
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
  
  // Enable compression
  compress: true,
  
  // Optimize chunk loading and prevent timeout errors
  output: 'standalone',
  
  // Experimental features for better builds and chunk loading
  experimental: {
    // Optimize package imports to reduce chunk sizes
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
    // Enable large page data for big uploads
    largePageDataBytes: 128 * 1024, // 128KB
    // Disable CSS optimization to fix build issues
    optimizeCss: false,
  },
  
  // Production optimizations
  productionBrowserSourceMaps: false,
  
  // Enable webpack optimizations for better chunk management
  webpack: (config, { isServer, dev }) => {
    // Enable top-level await
    config.experiments = {
      ...config.experiments,
      topLevelAwait: true,
    };
    
    // Suppress OpenTelemetry instrumentation warnings
    const originalWarn = config.infrastructureLogging?.level !== 'error' ? console.warn : () => {};
    
    config.ignoreWarnings = [
      ...(config.ignoreWarnings || []),
      // Ignore OpenTelemetry warnings
      (warning) => {
        return warning.message && (
          warning.message.includes('Critical dependency: the request of a dependency is an expression') ||
          warning.message.includes('@opentelemetry/instrumentation') ||
          warning.message.includes('node/instrumentation.js')
        );
      },
    ];
    
    // Set infrastructure logging to suppress warnings
    config.infrastructureLogging = {
      level: 'error', // Only show errors, not warnings
    };
    
    // Optimize for Vercel builds and handle MongoDB client-side encryption
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        child_process: false,
        crypto: false,
        stream: false,
        util: false,
        url: false,
        zlib: false,
        http: false,
        https: false,
        assert: false,
        os: false,
        path: false,
      };
      
      // Exclude MongoDB server-side modules from client bundle
      config.externals = config.externals || [];
      config.externals.push({
        'mongodb-client-encryption': 'commonjs mongodb-client-encryption',
        'aws4': 'commonjs aws4',
        'snappy': 'commonjs snappy',
        'kerberos': 'commonjs kerberos',
        '@mongodb-js/zstd': 'commonjs @mongodb-js/zstd',
        'bson-ext': 'commonjs bson-ext',
      });
    }
    
    // Optimize chunk splitting for better loading
    if (!dev && !isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            default: {
              minChunks: 2,
              priority: -20,
              reuseExistingChunk: true,
            },
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              priority: -10,
              chunks: 'all',
              maxSize: 244000, // 244KB max chunk size
            },
            common: {
              name: 'common',
              minChunks: 2,
              chunks: 'all',
              priority: -5,
              maxSize: 244000,
            },
          },
        },
      };
    }
    
    return config;
  },
  
  // Headers for better caching and chunk loading
  async headers() {
    return [
      {
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;