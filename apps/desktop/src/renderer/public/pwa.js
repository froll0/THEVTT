// The browser client (served at /play/) can be installed like an app: the
// worker keeps the app's own files for when the connection drops. Not in the
// desktop app, where everything is already local.
if ('serviceWorker' in navigator && location.protocol.startsWith('http') && location.pathname.startsWith('/play/')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js', { scope: './' }).catch(() => undefined);
  });
}
