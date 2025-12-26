// Polyfill for navigator.mediaDevices (required for SkyWay SDK on non-HTTPS)
// Must be applied BEFORE any SkyWay imports
if (typeof navigator !== 'undefined' && !navigator.mediaDevices) {
  (navigator as Navigator & { mediaDevices: MediaDevices }).mediaDevices = {
    getUserMedia: () => Promise.reject(new Error('Not supported')),
    enumerateDevices: () => Promise.resolve([]),
    getDisplayMedia: () => Promise.reject(new Error('Not supported')),
    getSupportedConstraints: () => ({}),
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
    ondevicechange: null,
  } as MediaDevices;
}

// Dynamic imports to ensure polyfill is applied first
async function bootstrap() {
  const [
    { default: React },
    { default: ReactDOM },
    { QueryClient, QueryClientProvider },
    { default: App },
  ] = await Promise.all([
    import('react'),
    import('react-dom/client'),
    import('@tanstack/react-query'),
    import('./App'),
  ]);

  await import('./styles/globals.css');

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60,
        retry: 1,
      },
    },
  });

  // Enable MSW mocking if configured
  if (import.meta.env.DEV && import.meta.env.VITE_ENABLE_MSW === 'true') {
    const { worker } = await import('../mocks/browser');
    await worker.start({ onUnhandledRequest: 'bypass' });
  }

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </React.StrictMode>
  );
}

bootstrap();
