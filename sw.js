/* =========================================================
   SISTEMA LINCE - SERVICE WORKER (APP ABRE SEM INTERNET)
   - Arquivos do app (HTML/JS/CSS): busca na rede primeiro; se a rede falhar
     ou demorar mais que TEMPO_LIMITE_REDE, usa a cópia salva no aparelho
     (e por MODO_REDE_LENTA não espera mais a rede, só atualiza em 2º plano).
   - Bibliotecas e fontes externas: usa a cópia salva e atualiza em 2º plano (só troca a cópia se a nova vier OK).
   - Imagens das placas (i.postimg.cc): não mudam, então depois de salvas não são baixadas de novo.
   - Chamadas à planilha (Google Apps Script) e envios (POST) nunca passam pelo cache.
   ========================================================= */
const CACHE = 'lince-app-v9';
const ARQUIVOS_APP = ['./', 'index.html', 'script.js', 'style.css', 'manifest.json'];
const HOSTS_ESTATICOS = ['unpkg.com', 'cdn.jsdelivr.net', 'fonts.googleapis.com', 'fonts.gstatic.com', 'i.postimg.cc'];  // imagens agora ficam na pasta img/ do próprio GitHub (mesma origem)
const HOSTS_CORS = ['unpkg.com', 'cdn.jsdelivr.net', 'fonts.googleapis.com', 'fonts.gstatic.com']; // aceitam CORS: dá para ver se a resposta veio OK
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
    if (url.origin === self.location.origin) e.respondWith(redePrimeiro(e, req));
    else if (HOSTS_ESTATICOS.includes(url.hostname)) e.respondWith(cachePrimeiro(e, req));
});

// Guarda só uma cópia por arquivo (script.js?v=6 substitui script.js?v=5)
async function redePrimeiro(e, req) {
    const cache = await caches.open(CACHE);
    const navegacao = req.mode === 'navigate';
    // Rede lenta: só usa a cópia da MESMA versão (?v=) que a página pediu, para não misturar HTML novo com JS velho
    const mesmaVersao = async () => navegacao ? qualquerVersao() : cache.match(req);
    // Sem rede: qualquer versão salva serve (JS velho é melhor que nenhum)
    const qualquerVersao = async () => (await cache.match(req, { ignoreSearch: true })) || (navegacao ? cache.match('index.html') : undefined);
    const daRede = fetch(req).then(async resp => {
        if (resp.ok) {
            // Grava a nova cópia ANTES de apagar as antigas: se o download cair no meio, a cópia antiga continua lá
            await cache.put(req, resp.clone());
            for (const k of await cache.keys(req, { ignoreSearch: true })) if (k.url !== req.url) await cache.delete(k);
        }
        return resp;
    });
    e.waitUntil(daRede.catch(() => {})); // mantém a atualização em 2º plano viva mesmo depois de responder com o cache
    return new Promise((resolve, reject) => {
        let respondido = false;
        const responder = r => { if (!respondido) { respondido = true; resolve(r); } };
        // Sinal fraco: se a rede demorar, abre com a cópia salva (a rede continua atualizando o cache)
        const limite = Date.now() < redeLentaAte ? 0 : TEMPO_LIMITE_REDE;
        const timer = setTimeout(() => mesmaVersao().then(r => { if (r) { redeLentaAte = Date.now() + MODO_REDE_LENTA; responder(r); } }), limite);
        daRede.then(r => { clearTimeout(timer); responder(r); }).catch(async () => {
            clearTimeout(timer);
            const r = await qualquerVersao();
            if (r) responder(r); else if (!respondido) { respondido = true; reject(new Error('Sem internet e sem cópia salva')); }
        });
    });
}

async function cachePrimeiro(e, req) {
    const cache = await caches.open(CACHE);
    const salvo = await cache.match(req);
    const cors = HOSTS_CORS.includes(new URL(req.url).hostname);
    if (salvo && !cors) return salvo;
    const busca = (cors && req.mode === 'no-cors') ? fetch(req.url, { mode: 'cors', credentials: 'omit' }).catch(() => fetch(req)) : fetch(req);
    const atualizar = busca.then(resp => {
        // Resposta opaca (sem status visível) só preenche o que falta; nunca troca uma cópia boa por um erro
        if (resp.ok || (resp.type === 'opaque' && !salvo)) e.waitUntil(cache.put(req, resp.clone()).catch(() => {}));
        return resp;
    });
    if (salvo) { e.waitUntil(atualizar.catch(() => {})); return salvo; }
    return atualizar;
}
