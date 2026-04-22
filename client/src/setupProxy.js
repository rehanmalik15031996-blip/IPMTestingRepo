const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function setupProxy(app) {
  // Default 5001: avoid macOS AirPlay on 5000 returning 403 for API POSTs. Override with REACT_APP_DEV_PROXY_TARGET.
  const target = process.env.REACT_APP_DEV_PROXY_TARGET || 'http://127.0.0.1:5001';
  app.use('/api', createProxyMiddleware({ target, changeOrigin: true, secure: false }));
};
