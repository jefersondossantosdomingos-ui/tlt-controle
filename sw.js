/* APP SUSPENSO — substitui o app guardado no celular por um aviso.
   Ao abrir com internet, o celular baixa este arquivo, apaga a cópia
   guardada do app e recarrega a tela, que passa a mostrar o aviso.
   Os ensaios lançados ficam no aparelho (não são apagados): ao publicar
   o app de verdade de novo, tudo volta a aparecer. */
const PREFIXO = 'ct-tlt';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', evento => {
  evento.waitUntil((async () => {
    const nomes = await caches.keys();
    await Promise.all(nomes.filter(n => n.startsWith(PREFIXO)).map(n => caches.delete(n)));
    await self.clients.claim();
    const janelas = await self.clients.matchAll({ type: 'window' });
    janelas.forEach(j => j.navigate(j.url).catch(() => {}));
  })());
});
// nada é guardado: tudo vem do site, que agora só tem o aviso
self.addEventListener('fetch', evento => {
  if (evento.request.mode !== 'navigate') return;
  evento.respondWith(fetch(evento.request).catch(() => new Response(
    '<meta charset="utf-8"><meta name="viewport" content="width=device-width"><body style="font-family:sans-serif;padding:32px;background:#1B2A33;color:#fff"><h2>Acesso suspenso</h2><p>Conecte-se à internet para mais informações.</p>',
    { headers: { 'Content-Type': 'text/html; charset=utf-8' } })));
});
