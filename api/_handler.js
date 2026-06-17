import app from '../backend/server.js';

export const handleRoute = (pathname) => (req, res) => {
  const currentUrl = String(req.url || '');
  const queryIndex = currentUrl.indexOf('?');
  const query = queryIndex >= 0 ? currentUrl.slice(queryIndex) : '';
  req.url = `${pathname}${query}`;
  return app(req, res);
};

export default app;
