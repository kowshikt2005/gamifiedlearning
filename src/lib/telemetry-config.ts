/**
 * Telemetry configuration to suppress OpenTelemetry warnings
 */

// Disable OpenTelemetry instrumentation warnings in development
if (process.env.NODE_ENV === 'development') {
  // Suppress the specific OpenTelemetry warnings
  const originalConsoleWarn = console.warn;
  console.warn = (...args: unknown[]) => {
    const message = args.join(' ');
    
    // Filter out OpenTelemetry instrumentation warnings
    if (
      message.includes('Critical dependency: the request of a dependency is an expression') ||
      message.includes('@opentelemetry/instrumentation') ||
      message.includes('node/instrumentation.js')
    ) {
      return; // Suppress these specific warnings
    }
    
    // Allow other warnings through
    originalConsoleWarn.apply(console, args);
  };
}

// Set environment variables to disable OpenTelemetry auto-instrumentation
if (typeof process !== 'undefined' && process.env) {
  process.env.OTEL_SDK_DISABLED = 'true';
  process.env.OTEL_TRACES_EXPORTER = 'none';
  process.env.OTEL_METRICS_EXPORTER = 'none';
  process.env.OTEL_LOGS_EXPORTER = 'none';
  process.env.OTEL_RESOURCE_ATTRIBUTES = '';
  process.env.OTEL_NODE_DISABLED_INSTRUMENTATIONS = '@opentelemetry/instrumentation-fs,@opentelemetry/instrumentation-http';
}

export {}; // Make this a module