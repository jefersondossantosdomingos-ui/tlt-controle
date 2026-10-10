/* ============================================================
   TRABALHADOR DE SERVIÇO — funciona sem sinal e avisa da versão nova
   A linha VERSAO é reescrita pelo build a cada publicação: é a
   mudança dela que faz o navegador perceber que há atualização.
   ============================================================ */

const VERSAO = '2026-10-10.df80094a';
const PREFIXO = 'ct-tlt-';
const CACHE = PREFIXO + VERSAO;

/* O que precisa estar guardado para o app abrir sem internet. */
const ARQUIVOS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icone-192.png',
  './icone-512.png',
  './icone-192-recortavel.png',
  './icone-512-recortavel.png',
  './icone-apple.png',
];

self.addEventListener('install', evento => {
  evento.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // um arquivo que falhe não pode derrubar a instalação inteira
    await Promise.all(ARQUIVOS.map(a =>
      cache.add(new Request(a, { cache: 'reload' })).catch(() => {})));
  })());
});

self.addEventListener('activate', evento => {
  evento.waitUntil((async () => {
    const nomes = await caches.keys();
    await Promise.all(nomes
      .filter(n => n.startsWith(PREFIXO) && n !== CACHE)
      .map(n => caches.delete(n)));
    await self.clients.claim();
  })());
});

/**
 * A página pergunta a versão e manda assumir o lugar da anterior quando o
 * laboratorista aceita atualizar.
 */
self.addEventListener('message', evento => {
  const dado = evento.data || {};
  if (dado.tipo === 'versao' && evento.source)
    evento.source.postMessage({ tipo: 'versao', versao: VERSAO });
  if (dado.tipo === 'assumir') self.skipWaiting();
});

self.addEventListener('fetch', evento => {
  const pedido = evento.request;

  // a conversa com a planilha do Drive nunca passa pelo cache
  if (pedido.method !== 'GET') return;

  /* o gerador de PDF do envio pelo WhatsApp (cdnjs) fica guardado à parte, num
     cache que não é apagado a cada versão: baixado uma vez, gera PDF sem sinal */
  if (new URL(pedido.url).hostname === 'cdnjs.cloudflare.com') {
    evento.respondWith((async () => {
      const libs = await caches.open(PREFIXO.replace(/-$/, '') + '.libs');
      const guardado = await libs.match(pedido.url);
      if (guardado) return guardado;
      const resposta = await fetch(pedido);
      if (resposta && (resposta.ok || resposta.type === 'opaque')) libs.put(pedido.url, resposta.clone());
      return resposta;
    })());
    return;
  }

  if (new URL(pedido.url).origin !== self.location.origin) return;

  evento.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const guardado = await cache.match(pedido, { ignoreSearch: true });

    // entrega o que está guardado na hora e busca a versão nova por trás:
    // no campo, abrir rápido e funcionar sem sinal vale mais que estar
    // sempre no último byte — a atualização vira um aviso na tela
    const rede = fetch(pedido).then(resposta => {
      if (resposta && resposta.ok) cache.put(pedido, resposta.clone());
      return resposta;
    }).catch(() => null);

    if (guardado) { evento.waitUntil(rede); return guardado; }

    const daRede = await rede;
    if (daRede) return daRede;

    // sem cache e sem rede: se for navegação, devolve a página guardada
    if (pedido.mode === 'navigate') {
      const inicio = await cache.match('./index.html', { ignoreSearch: true });
      if (inicio) return inicio;
    }
    return new Response('Sem conexão e sem cópia guardada.', {
      status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  })());
});
