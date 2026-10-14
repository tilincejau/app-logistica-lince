/* =========================================================
   SISTEMA LINCE - SERVICE WORKER (APP ABRE SEM INTERNET)
   - Arquivos do app (HTML/JS/CSS): busca na rede primeiro; se a rede falhar
     ou demorar mais que TEMPO_LIMITE_REDE, usa a cópia salva no aparelho
     (e por MODO_REDE_LENTA não espera mais a rede, só atualiza em 2º plano).
   - Bibliotecas, fontes e imagens externas: usa a cópia salva e atualiza em 2º plano.
   - Chamadas à planilha (Google Apps Script) e envios (POST) nunca passam pelo cache.
   ========================================================= */
const CACHE = 'lince-app-v1';
const ARQUIVOS_APP = ['./', 'index.html', 'script.js', 'style.css', 'manifest.json'];
const HOSTS_ESTATICOS = ['unpkg.com', 'cdn.jsdelivr.net', 'fonts.googleapis.com', 'fonts.gstatic.com', 'i.postimg.cc'];
const TEMPO_LIMITE_REDE = 3000;
const MODO_REDE_LENTA = 30000;
let redeLentaAte = 0;

self.addEventListener('install', e => {
    e.waitUntil(caches.open(CACHE).then(c => c.addAll(ARQUIVOS_APP)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
    e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
    const req = e.request;
    if (req.method !== 'GET') return;
    const url = new URL(req.url);
    if (url.origin === self.location.origin) e.respondWith(redePrimeiro(req));
    else if (HOSTS_ESTATICOS.includes(url.hostname)) e.respondWith(cachePrimeiro(e, req));
});

// Guarda só uma cópia por arquivo (script.js?v=5 substitui script.js?v=4), por isso a busca no cache ignora o "?v="
async function redePrimeiro(req) {
    const cache = await caches.open(CACHE);
    const doCache = async () => (await cache.match(req, { ignoreSearch: true })) || (req.mode === 'navigate' ? cache.match('index.html') : undefined);
    const daRede = fetch(req).then(async resp => {
        if (resp.ok) { await cache.delete(req, { ignoreSearch: true }); await cache.put(req, resp.clone()); }
        return resp;
    });
    return new Promise((resolve, reject) => {
        let respondido = false;
        const responder = r => { if (!respondido) { respondido = true; resolve(r); } };
        // Sinal fraco: se a rede demorar, abre com a cópia salva (a rede continua atualizando o cache)
        const limite = Date.now() < redeLentaAte ? 0 : TEMPO_LIMITE_REDE;
        const timer = setTimeout(() => doCache().then(r => { if (r) { redeLentaAte = Date.now() + MODO_REDE_LENTA; responder(r); } }), limite);
        daRede.then(r => { clearTimeout(timer); responder(r); }).catch(async () => {
            clearTimeout(timer);
            const r = await doCache();
            if (r) responder(r); else if (!respondido) { respondido = true; reject(new Error('Sem internet e sem cópia salva')); }
        });
    });
}

async function cachePrimeiro(e, req) {
    const cache = await caches.open(CACHE);
    const salvo = await cache.match(req);
    const atualizar = fetch(req).then(resp => {
        if (resp.ok || resp.type === 'opaque') cache.put(req, resp.clone());
        return resp;
    });
    if (salvo) { e.waitUntil(atualizar.catch(() => {})); return salvo; }
    return atualizar;
}
