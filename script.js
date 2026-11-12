/* =========================================================
   SISTEMA LINCE - JAVASCRIPT LOCAL FRONT-END
   Gerencia a inversão do Menu -> Placa, Validações, Fotos, PDF, etc.
   ========================================================= */

const API_URL = "https://script.google.com/macros/s/AKfycbxHi49LtwY3FI5s0H9c7C-HebuQvUg7-CeHLuxiX35phkjagenPW9jlxm81qAM5YDyQ/exec";
const APP_VERSAO = "2.1";
const APP_BUILD = "v26";
const SERVIDOR_MINIMO = "v18"; // versão mínima do Apps Script que este app precisa // aparece no rodapé do menu // Versão atualizada para forçar a limpeza da cache nos celulares

const CAVALOS = ['FEF7C02', 'GHE3E06', 'FYY7G32']; 
const CARROS = ['CLW4E92', 'UGF2G86', 'FGX2A32'];
const EMPILHADEIRAS = ['05025DR3290', '05025DR8824'];
const TRUCKS = ['FEE9E40'];
const TOCOS = ['AXZ1D53', 'FCT1J98', 'FIF9A30', 'FMQ8H77', 'FPJ1B16', 'FUH9H91', 'IVE8J03', 'NTP4G17', 'FMR4I10', 'FQY6B30', 'TKR8I49', 'TLL8H30', 'TLY0G57', 'UDN0J81', 'UPS1J80', 'UPX9D25', 'URT4E79', 'URU3F36'];

window.isCavalo = false; window.isTruck = false; window.isToco = false; window.isCarro = false; window.isEmpilhadeira = false;
let urlDocAtual = ""; 
window.frota = {}; 
window.estoqueDiesel = 0; window.estoqueArla = 0; window.gastoMesGeral = 0;
window.histAbast = { diesel: [], arla: [], cheg_diesel: [], cheg_arla: [] };
window.estoquePecas = []; window.usuarioLogado = ""; window.listaMotoristas = [];
window.moduloAtual = ""; window.historicoChecklist = [];

const pneusTruck = [ {id:'dd',n:'DD'}, {id:'de',n:'DE'}, {id:'tde',n:'TDE'}, {id:'tdi',n:'TDI'}, {id:'tee',n:'TEE'}, {id:'tei',n:'TEI'}, {id:'tkde',n:'TKDE'}, {id:'tkdi',n:'TKDI'}, {id:'tkee',n:'TKEE'}, {id:'tkei',n:'TKEI'}, {id:'1step',n:'1º STEP'} ];
const pneusToco = [ {id:'dd',n:'DD'}, {id:'de',n:'DE'}, {id:'tde',n:'TDE'}, {id:'tdi',n:'TDI'}, {id:'tee',n:'TEE'}, {id:'tei',n:'TEI'}, {id:'1step',n:'1º STEP'} ];
const pneusCarreta = [ {id:'c1',n:'C1'}, {id:'c2',n:'C2'}, {id:'c3',n:'C3'}, {id:'c4',n:'C4'}, {id:'c5',n:'C5'}, {id:'c6',n:'C6'}, {id:'c7',n:'C7'}, {id:'c8',n:'C8'}, {id:'c9',n:'C9'}, {id:'c10',n:'C10'}, {id:'c11',n:'C11'}, {id:'c12',n:'C12'}, {id:'2step',n:'2º STEP'} ];
const pneusCarro = [ {id:'dd',n:'DD'}, {id:'de',n:'DE'}, {id:'td',n:'TD'}, {id:'te',n:'TE'} ];

let htmlFichaTruck = ""; let htmlChkTruck = ""; let htmlFichaToco = ""; let htmlChkToco = "";
let htmlFichaCarreta = ""; let htmlChkCarreta = "";
let htmlFichaCarro = ""; let htmlChkCarro = "";
let b64Lateral = ""; let b64Traseira = "";

let isSyncing = false;

function mostrarToast(msg, cor = "#1f2937") {
    let toast = document.getElementById("toast-lince");
    if (!toast) {
        toast = document.createElement("div");
        toast.id = "toast-lince";
        document.body.appendChild(toast);
    }
    toast.style.cssText = `visibility: visible; min-width: 250px; background-color: ${cor}; color: #fff; text-align: center; border-radius: 30px; padding: 14px; position: fixed; z-index: 10000; left: 50%; bottom: 80px; transform: translateX(-50%); font-size: 14px; font-weight: 600; box-shadow: 0px 8px 20px rgba(0,0,0,0.3); transition: opacity 0.3s, bottom 0.3s; opacity: 1;`;
    toast.innerHTML = msg; 
    setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.style.visibility='hidden', 300); }, 3000);
}

function salvarCacheLocal() {
    // O cache só acelera a abertura do app; se o espaço acabar, não pode travar o resto do código
    try {
        localStorage.setItem('lince_logistica_bd', JSON.stringify({
            frota: window.frota, estoque_diesel: window.estoqueDiesel, estoque_arla: window.estoqueArla,
            gasto_mes_geral: window.gastoMesGeral, hist_abast: window.histAbast,
            estoque_pecas: window.estoquePecas, motoristas: window.listaMotoristas, historico: window.historicoChecklist,
            gasto_mes_ant_geral: (window.resumoGerente || {}).gasto_mes_ant_geral, arla_mes_geral: (window.resumoGerente || {}).arla_mes_geral,
            media_frota_mes: (window.resumoGerente || {}).media_frota_mes, gerado_em: (window.resumoGerente || {}).gerado_em,
            ultimos_checklists: window.ultimosChecklists || {}, planos: window.planos || {}, mensal: window.mensal || {}
        }));
    } catch (e) { console.warn("Cache local não salvo (sem espaço):", e); }
}

/* =========================================================
   FILA DE ENVIOS OFFLINE - GUARDADA NO INDEXEDDB
   (o localStorage só aceita ~5 MB; com fotos e assinaturas enchia rápido)
   ========================================================= */
const FILA_LS_ANTIGA = 'lince_fila_requisicoes';
window.filaCache = [];          // cópia em memória da fila (para contagens rápidas)
let dbFilaPromise = null;
let filaUsandoLocalStorage = false; // só se o aparelho não tiver IndexedDB

function abrirDBFila() {
    if (dbFilaPromise) return dbFilaPromise;
    dbFilaPromise = new Promise((resolve, reject) => {
        if (!('indexedDB' in window)) { reject(new Error('IndexedDB indisponível')); return; }
        let req = indexedDB.open('lince_app', 1);
        req.onupgradeneeded = () => { let db = req.result; if (!db.objectStoreNames.contains('fila')) db.createObjectStore('fila', { keyPath: '_localId' }); };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
        req.onblocked = () => reject(new Error('IndexedDB bloqueado'));
    });
    dbFilaPromise.catch(() => { dbFilaPromise = null; });
    return dbFilaPromise;
}
function txFila(modo, acao) {
    return abrirDBFila().then(db => new Promise((resolve, reject) => {
        let tx = db.transaction('fila', modo); let st = tx.objectStore('fila'); let resultado;
        let r = acao(st); if (r) r.onsuccess = () => { resultado = r.result; };
        tx.oncomplete = () => resolve(resultado);     // só confirma depois de gravado no disco
        tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error || new Error('Gravação cancelada'));
    }));
}
function lerFilaLS() { try { return JSON.parse(localStorage.getItem(FILA_LS_ANTIGA)) || []; } catch (e) { return []; } }
const ordenarFila = arr => arr.sort((a, b) => (a._ordem || 0) - (b._ordem || 0) || String(a._localId).localeCompare(String(b._localId)));

async function carregarFila() {
    if (filaUsandoLocalStorage) { window.filaCache = ordenarFila(lerFilaLS()); return window.filaCache; }
    try { window.filaCache = ordenarFila(await txFila('readonly', st => st.getAll()) || []); }
    catch (e) { console.warn("Fila: usando localStorage", e); filaUsandoLocalStorage = true; window.filaCache = ordenarFila(lerFilaLS()); }
    return window.filaCache;
}

// Leva o que estava na fila antiga (localStorage) para o IndexedDB, sem perder nada
async function migrarFilaAntiga() {
    let antigos = lerFilaLS();
    if (!antigos.length) return;
    try {
        await txFila('readwrite', st => { antigos.forEach((it, i) => { if (!it._ordem) it._ordem = i + 1; st.put(it); }); });
        localStorage.removeItem(FILA_LS_ANTIGA); // só apaga depois de confirmar a gravação
    } catch (e) { filaUsandoLocalStorage = true; }
}

async function iniciarFila() {
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {}); // pede para o navegador não apagar os dados
    await migrarFilaAntiga();
    await carregarFila();
    atualizarBotaoSyncManual();
}

// Retorna true só quando o envio está gravado com segurança no aparelho
async function adicionarNaFila(payload) {
    payload._localId = Date.now() + Math.random().toString(36).substr(2, 5);
    payload._ordem = Date.now() + Math.random();
    // Só cria um ID de transação novo se for um formulário INÉDITO (edições preservam o ID original)
    if (!payload.id_transacao) payload.id_transacao = payload._localId;
    delete payload.token; // o código de acesso é colocado na hora do envio

    let gravou = false;
    if (!filaUsandoLocalStorage) {
        try { await txFila('readwrite', st => st.put(payload)); gravou = true; }
        catch (e) { console.error("Fila IndexedDB:", e); }
    }
    if (!gravou) {
        try { let f = lerFilaLS(); f.push(payload); localStorage.setItem(FILA_LS_ANTIGA, JSON.stringify(f)); gravou = true; filaUsandoLocalStorage = true; }
        catch (e) { console.error("Fila localStorage:", e); }
    }
    if (!gravou) {
        Swal.fire({ icon: "error", title: "NÃO FOI SALVO!", html: "O celular está sem espaço para guardar este lançamento.<br><br><b>Não feche esta tela.</b> Conecte-se à internet e toque em <b>Sincronizar Dados</b>, ou libere espaço no aparelho, e tente de novo.", confirmButtonColor: "#1a4d2e" });
        return false;
    }
    await carregarFila();
    atualizarBotaoSyncManual();
    sincronizarSegundoPlano(false);
    return true;
}

async function removerDaFila(localId) {
    if (filaUsandoLocalStorage) { localStorage.setItem(FILA_LS_ANTIGA, JSON.stringify(lerFilaLS().filter(i => i._localId !== localId))); }
    else { await txFila('readwrite', st => st.delete(localId)); }
    await carregarFila();
}
function qtdPendencias() { return window.filaCache.length; }

/* =========================================================
   SESSÃO (CÓDIGO DE ACESSO). A senha nunca fica guardada no celular.
   ========================================================= */
const CHAVE_USER = 'lince_logistica_user';
function lerSessao() { try { return JSON.parse(localStorage.getItem(CHAVE_USER)) || null; } catch (e) { return null; } }
function tokenAtual() { let s = lerSessao(); return s && s.t ? s.t : ""; }
let avisouSessaoExpirada = false;

async function chamarAPI(payload) {
    let corpo = Object.assign({}, payload);
    delete corpo._localId; delete corpo._ordem;
    if (corpo.acao !== 'login') corpo.token = tokenAtual();
    let resp = await fetch(API_URL, { method: 'POST', body: JSON.stringify(corpo), headers: { "Content-Type": "text/plain;charset=utf-8" } });
    let json = await resp.json();
    if (json && json.sessao_invalida) tratarSessaoInvalida();
    return json;
}

function tratarSessaoInvalida() {
    let s = lerSessao(); if (s) { delete s.t; localStorage.setItem(CHAVE_USER, JSON.stringify(s)); }
    atualizarStatusConexao();
    if (avisouSessaoExpirada) return;
    avisouSessaoExpirada = true;
    let pend = qtdPendencias();
    Swal.fire({ icon: "warning", title: "Entre novamente", html: "Seu acesso expirou." + (pend ? `<br><br>Os <b>${pend} lançamento(s)</b> continuam guardados no celular e serão enviados assim que você entrar.` : ""), showCancelButton: true, confirmButtonText: "Entrar agora", cancelButtonText: "Depois", confirmButtonColor: "#1a4d2e" })
        .then(r => { if (r.isConfirmed) irParaLogin(); });
}
function irParaLogin() {
    let s = lerSessao(); esconderTodasTelas();
    document.getElementById('campo-usuario').value = (s && s.u) || window.usuarioLogado || '';
    document.getElementById('campo-senha').value = '';
    document.getElementById('tela-login').style.display = 'flex';
}

// Celulares que já estavam logados na versão antiga (senha salva): troca a senha por um código de acesso, sem pedir login de novo
async function migrarLoginAntigo() {
    let s = lerSessao();
    if (!s || s.t || !s.s || !navigator.onLine) return;
    try {
        let r = await chamarAPI({ acao: 'login', usuario: s.u, senha: String(s.s) });
        if (r.sucesso && r.token) localStorage.setItem(CHAVE_USER, JSON.stringify({ u: s.u, t: r.token, p: r.ve_painel !== false }));
        else if (r.sucesso === false) { localStorage.setItem(CHAVE_USER, JSON.stringify({ u: s.u })); tratarSessaoInvalida(); }
    } catch (e) { /* sem rede: tenta de novo depois */ }
}

function atualizarBotaoSyncManual() {
    let pend = qtdPendencias();
    let btn = document.getElementById('btn-sync-manual');
    if (btn && !btn.disabled) {
        if (pend > 0) {
            btn.innerHTML = `<i class="ph ph-warning-circle"></i> Enviando ${pend} pendências...`;
            btn.style.color = "#d97706"; btn.style.borderColor = "#d97706"; btn.style.backgroundColor = "#fffbeb";
        } else {
            btn.innerHTML = `<i class="ph ph-arrows-clockwise"></i> Sincronizar Dados`;
            btn.style.color = "var(--primary-color)"; btn.style.borderColor = "var(--primary-color)"; btn.style.backgroundColor = "transparent";
        }
    }
    atualizarStatusConexao();
}

// Indicador da barra do topo: Online / pendências aguardando envio / Offline / sessão expirada
function atualizarStatusConexao() {
    let pend = qtdPendencias();
    let txtPend = pend + (pend > 1 ? " pendentes" : " pendente");
    let semSessao = lerSessao() && !tokenAtual() && !(lerSessao() || {}).s;
    let classe = !navigator.onLine ? "offline" : (semSessao ? "offline" : (pend > 0 ? "pendente" : "online"));
    let txt = !navigator.onLine ? ("Offline" + (pend > 0 ? " · " + pend : "")) : (semSessao ? "Entrar de novo" : (pend > 0 ? txtPend : "Online"));
    document.querySelectorAll('.status-conexao').forEach(el => { el.className = "status-conexao " + classe; el.textContent = txt; });
}

async function sincronizarSegundoPlano(manual = false) {
    if (!navigator.onLine) { if(manual) mostrarToast("<i class='ph ph-wifi-x'></i> Sem conexão à internet", "#dc2626"); return; }
    if (isSyncing) { if(manual) mostrarToast("<i class='ph ph-spinner ph-spin'></i> Sincronização em andamento...", "#d97706"); return; }
    if (!tokenAtual()) {
        await migrarLoginAntigo();
        if (!tokenAtual()) { if (manual) { avisouSessaoExpirada = false; tratarSessaoInvalida(); } return; }
    }

    isSyncing = true;
    let fila = [...(await carregarFila())];
    if (fila.length === 0) {
        isSyncing = false;
        if (manual) { mostrarToast("<i class='ph ph-check-circle'></i> Tudo já está atualizado!", "#059669"); recarregarDadosSilenciosamente(true); }
        atualizarBotaoSyncManual();
        return;
    }
    let processouAlgo = false;
    if(manual) mostrarToast(`<i class='ph ph-arrows-clockwise ph-spin'></i> Processando ${fila.length} envios...`, "#d97706");

    for (let i = 0; i < fila.length; i++) {
        let reqPayload = fila[i];
        try {
            let resJSON;
            try { resJSON = await chamarAPI(reqPayload); }
            catch (e) {
                if (e instanceof SyntaxError) { if (manual) Swal.fire("Erro Crítico (Google)", "O link não retornou dados válidos. O sistema tentará novamente mais tarde.", "error"); break; }
                throw e;
            }
            if (resJSON.sessao_invalida) break; // mantém tudo na fila até a pessoa entrar de novo
            if (resJSON.erro) {
                console.error("Erro reportado pelo Google:", resJSON.erro);
                if(manual) Swal.fire("Erro na Planilha", resJSON.erro, "error");
                continue; // pula o item com erro, mas NÃO o apaga
            }
            if (resJSON.sucesso) { await removerDaFila(reqPayload._localId); processouAlgo = true; atualizarBotaoSyncManual(); }
        } catch (e) {
            console.error("Erro de comunicação local:", e);
            if(manual) Swal.fire("Erro de Conexão", "Sinal instável. Os dados estão seguros no celular e serão enviados depois.", "warning");
            break; // caiu a internet: para tudo e mantém na fila
        }
    }

    await carregarFila();
    atualizarBotaoSyncManual();
    if (processouAlgo) {
        if (qtdPendencias() === 0) mostrarToast("<i class='ph ph-check-circle'></i> Tudo sincronizado com sucesso!", "#059669");
        else mostrarToast(`<i class='ph ph-warning'></i> Restam ${qtdPendencias()} itens aguardando rede`, "#dc2626");
        recarregarDadosSilenciosamente();
    }
    isSyncing = false;
    // Algo entrou na fila enquanto enviava: manda logo, sem esperar os 30s
    if (navigator.onLine && tokenAtual() && window.filaCache.some(item => !fila.some(f => f._localId === item._localId))) sincronizarSegundoPlano(false);
}

async function forcarSincronizacaoManual() {
    let btn = document.getElementById('btn-sync-manual');
    if (btn) { btn.innerHTML = "<i class='ph ph-spinner ph-spin'></i> Sincronizando..."; btn.disabled = true; }
    try { await sincronizarSegundoPlano(true); } finally { if (btn) btn.disabled = false; atualizarBotaoSyncManual(); }
}

setInterval(() => sincronizarSegundoPlano(false), 30000);
document.addEventListener("visibilitychange", function() { if (document.visibilityState === 'visible') sincronizarSegundoPlano(false); });
window.addEventListener("online", function() { atualizarStatusConexao(); sincronizarSegundoPlano(false); });
window.addEventListener("offline", atualizarStatusConexao);

function atualizarVariaveisGlobais(res) {
    window.frota = res.frota || window.frota;
    window.estoqueDiesel = res.estoque_diesel || 0;
    window.estoqueArla = res.estoque_arla || 0;
    window.gastoMesGeral = res.gasto_mes_geral || 0;
    window.histAbast = res.hist_abast || { diesel: [], arla: [], cheg_diesel: [], cheg_arla: [] };
    window.estoquePecas = res.estoque_pecas || [];
    window.listaMotoristas = res.motoristas || [];
    window.historicoChecklist = res.historico || [];
    window.versaoServidor = res.versao_backend || window.versaoServidor || '';
    mostrarVersoes();
    window.ultimosChecklists = res.ultimos_checklists || window.ultimosChecklists || {};
    window.planos = res.planos || window.planos || {};
    window.mensal = res.mensal || window.mensal || {};
    window.resumoGerente = { gasto_mes_ant_geral: res.gasto_mes_ant_geral || 0, arla_mes_geral: res.arla_mes_geral || 0, media_frota_mes: res.media_frota_mes || 0, gerado_em: res.gerado_em || "" };

    registrarCategoriasExtras();
    renderizarPlacas();
    renderizarAlertas();
    atualizarTileGerente(); renderizarTileProblemas();
    if (document.getElementById('tela-problemas') && document.getElementById('tela-problemas').style.display === 'flex') renderizarProblemas();
    if (document.getElementById('tela-gerente') && document.getElementById('tela-gerente').style.display === 'flex') renderizarPainelGerente();
    renderizarMotoristas();
    renderizarHistorico(window.historicoChecklist);
    renderizarHistoricoAbast();
    renderizarEstoquePecas();

    if (window.moduloAtual === 'Checklist' && window.historicoChecklist) {
        let agora = new Date(); 
        let inicioSemana = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() - agora.getDay()); 
        inicioSemana.setHours(0,0,0,0); 
        window.historicoChecklist.forEach(h => { 
            let dataStr = String(h.data); let dataObj; 
            if (dataStr.includes('/')) { let partes = dataStr.split(' ')[0].split('/'); dataObj = new Date(partes[2], partes[1] - 1, partes[0]); } else { dataObj = new Date(dataStr); } 
            if (dataObj >= inicioSemana) { 
                let placaLimpa = String(h.placa).trim().toUpperCase(); 
                let badge = document.getElementById('check-' + placaLimpa); 
                if (badge) badge.style.display = 'flex'; 
            } 
        }); 
    }
}

async function recarregarDadosSilenciosamente(forcar = false) {
    if (!tokenAtual()) return;
    try {
        let res = await chamarAPI({ acao: 'buscar_inicial', forcar: forcar === true });
        if (qtdPendencias() > 0) return; // não recarrega se ainda há dados locais a enviar
        if (res.sucesso) {
            try { localStorage.setItem('lince_logistica_bd', JSON.stringify(res)); } catch (e) {}
            // Não redesenha a tela de formulário aberta: apagaria o que está sendo preenchido.
            if (document.getElementById('tela-interna').style.display === 'flex') { dadosAguardandoTela = res; return; }
            atualizarVariaveisGlobais(res);
        }
    } catch(e) {}
}

let dadosAguardandoTela = null;
function aplicarDadosAguardando() {
    let d = dadosAguardandoTela; dadosAguardandoTela = null;
    if (!d) return;
    if (qtdPendencias() > 0) return; // há envios pendentes: a próxima sincronização recarrega
    atualizarVariaveisGlobais(d);
}

window.onload = function() {
    // Guarda o app no aparelho para abrir mesmo sem internet (ver sw.js)
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(e => console.error("Service Worker:", e));

    let versaoLocal = localStorage.getItem('lince_versao');
    if (versaoLocal !== APP_VERSAO) {
        // Atualização do app: NÃO desloga e NÃO apaga a fila; só descarta o cache de dados (baixa de novo)
        localStorage.removeItem('lince_logistica_bd');
        localStorage.setItem('lince_versao', APP_VERSAO);
    }

    let construtorFicha = (arr, isCar) => arr.map(p => `<details><summary>${p.n}</summary><div class="pneu-detalhes"><div class="linha-info"><span class="info-label" style="margin:0;">Estado:</span> <span class="info-valor" id="${isCar?'carro-':''}estado-${p.id}" style="font-weight:bold;">---</span></div><div class="linha-info"><span class="info-label" style="margin:0;">TWI:</span> <span class="info-valor" id="${isCar?'carro-':''}twi-${p.id}">---</span></div><div class="linha-info" style="margin-top:10px;"><span class="info-label" style="margin:0;">KM Troca:</span> <input type="number" id="${isCar?'carro-':''}km-troca-${p.id}" class="input-editavel travado" value="0" readonly></div><div class="linha-info" style="margin-top:5px;"><span class="info-label" style="margin:0;">Data Troca:</span> <input type="date" id="${isCar?'carro-':''}data-troca-${p.id}" class="input-editavel travado" readonly></div><div class="linha-info" style="margin-top:5px;"><span class="info-label" style="margin:0;">Pneu Colocado:</span> <select id="${isCar?'carro-':''}pneu-colocado-${p.id}" class="input-editavel travado" disabled style="background-color: transparent;"><option value="NOVO">NOVO</option><option value="1 RESSOLAGEM">1 RESSOLAGEM</option><option value="2 RESSOLAGEM">2 RESSOLAGEM</option><option value="3 RESSOLAGEM">3 RESSOLAGEM</option></select></div><div class="linha-info" style="margin-top:5px;"><span class="info-label" style="margin:0;">Últ. Rodízio:</span> <input type="date" id="${isCar?'carro-':''}data-rodizio-${p.id}" class="input-editavel travado" readonly></div><div class="linha-info" style="margin-top:5px;"><span class="info-label" style="margin:0;">Próx Rodízio (KM):</span> <input type="number" id="${isCar?'carro-':''}prox-rodizio-${p.id}" class="input-editavel travado" value="0" readonly oninput="calcularRodizioPneus()"></div><div class="linha-info" style="margin-top:5px; border-top:1px dashed #ccc; padding-top:5px;"><span class="info-label" style="margin:0;">Status Rodízio:</span> <span id="${isCar?'carro-':''}status-rod-${p.id}" style="font-weight:bold;">---</span></div></div></details>`).join('');
    let construtorChk = (arr, isCar) => arr.map(p => `<div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; border-bottom: 1px dashed #ccc; padding-bottom: 5px;"><span style="font-weight: bold; width: 50px; color:${arr===pneusCarreta?'#0056b3':'#333'};">${p.n}</span><input type="text" inputmode="numeric" autocomplete="off" id="${isCar?'chk-carro-twi-':'chk-twi-'}${p.id}" placeholder="0,00" class="input-campo" style="margin:0; width: 80px; padding: 10px; text-align:center;" oninput="mascaraTwi(this); calcularStatusTwi(this, '${isCar?'badge-carro-estado-':'badge-estado-'}${p.id}')"><span id="${isCar?'badge-carro-estado-':'badge-estado-'}${p.id}" class="twi-estado-badge" style="flex: 1;">Aguardando...</span></div>`).join('');
    htmlFichaTruck = construtorFicha(pneusTruck, false); htmlChkTruck = construtorChk(pneusTruck, false);
    htmlFichaToco = construtorFicha(pneusToco, false); htmlChkToco = construtorChk(pneusToco, false);
    htmlFichaCarreta = construtorFicha(pneusCarreta, false); htmlChkCarreta = construtorChk(pneusCarreta, false);
    htmlFichaCarro = construtorFicha(pneusCarro, true); htmlChkCarro = construtorChk(pneusCarro, true);
    
    renderizarPlacas(); // placas desenhadas em CSS (inclui veículos cadastrados em OUTROS)

    let bdSalvo = localStorage.getItem('lince_logistica_bd');
    if (bdSalvo) {
        try {
            let dados = JSON.parse(bdSalvo);
            atualizarVariaveisGlobais(dados);
        } catch(e) {}
    }

    let sessao = lerSessao();
    if (sessao && sessao.u) {
        window.usuarioLogado = sessao.u;
        esconderTodasTelas();
        document.getElementById('tela-menu').style.display = 'flex';
    }
    // Fila offline: migra do formato antigo, conta pendências e depois tenta enviar
    iniciarFila().then(async () => { await migrarLoginAntigo(); atualizarStatusConexao(); if (tokenAtual()) { recarregarDadosSilenciosamente(); sincronizarSegundoPlano(false); } });
};

async function fazerLogin() { 
    let u = document.getElementById('campo-usuario').value.trim(); let s = document.getElementById('campo-senha').value; let msg = document.getElementById('mensagem-erro'); let btn = document.getElementById('btn-login'); 
    if (!u || !s) { msg.innerHTML = "<i class='ph ph-warning'></i> Preencha usuário e senha!"; msg.style.display = 'block'; return; } 
    if (!navigator.onLine) { msg.innerHTML = "<i class='ph ph-wifi-x'></i> Para entrar é preciso internet."; msg.style.display = 'block'; return; }
    btn.innerHTML = "<i class='ph ph-spinner ph-spin'></i> Entrando..."; btn.disabled = true; msg.style.display = 'none'; 
    try { 
        // A senha vai no corpo do POST (não aparece em link nem em histórico) e NÃO é guardada no celular
        let res1 = await chamarAPI({ acao: 'login', usuario: u, senha: s }); 
        if (res1.sucesso && res1.token) { 
            window.usuarioLogado = u; localStorage.setItem(CHAVE_USER, JSON.stringify({ u: u, t: res1.token, p: res1.ve_painel !== false }));
            avisouSessaoExpirada = false;
            document.getElementById('campo-senha').value = '';
            let res2 = await chamarAPI({ acao: 'buscar_inicial' }); 
            if (res2.sucesso) { 
                atualizarVariaveisGlobais(res2); try { localStorage.setItem('lince_logistica_bd', JSON.stringify(res2)); } catch (e) {}
                esconderTodasTelas(); document.getElementById('tela-menu').style.display = 'flex'; renderizarAlertas();
            } else { msg.innerHTML = "<i class='ph ph-x-circle'></i> Erro: " + res2.erro; msg.style.display = 'block'; } 
            sincronizarSegundoPlano(false); // envia o que ficou guardado enquanto estava sem acesso
        } else if (res1.sucesso && !res1.token) { msg.innerHTML = "<i class='ph ph-warning'></i> Atualize o Apps Script (nova versão) antes de usar este app."; msg.style.display = 'block'; }
        else { msg.innerHTML = "<i class='ph ph-x-circle'></i> " + (res1.erro || "Credenciais incorretas!"); msg.style.display = 'block'; } 
    } catch (e) { msg.innerHTML = "<i class='ph ph-wifi-x'></i> Erro de comunicação."; msg.style.display = 'block'; console.error(e); } 
    btn.innerHTML = "<i class='ph ph-sign-in'></i> Entrar"; btn.disabled = false; atualizarStatusConexao();
}

function esconderTodasTelas() { 
    document.getElementById('tela-login').style.display = 'none'; document.getElementById('tela-placas').style.display = 'none'; document.getElementById('tela-menu').style.display = 'none'; document.getElementById('tela-submenu-estoque').style.display = 'none'; document.getElementById('tela-interna').style.display = 'none'; document.getElementById('tela-gerente').style.display = 'none'; document.getElementById('tela-problemas').style.display = 'none'; 
} 

async function sairDaConta() { 
    let pend = qtdPendencias();
    if (pend > 0) {
        let r = await Swal.fire({ icon: "warning", title: "Há envios pendentes", html: `Existem <b>${pend}</b> lançamento(s) ainda não enviados.<br><br>Eles continuam guardados neste celular e serão enviados quando alguém entrar novamente.`, showCancelButton: true, confirmButtonText: "Sair mesmo assim", cancelButtonText: "Ficar", confirmButtonColor: "#dc2626" });
        if (!r.isConfirmed) return;
    }
    let tk = tokenAtual();
    if (tk && navigator.onLine) chamarAPI({ acao: 'logout' }).catch(() => {}); // invalida o código no servidor
    localStorage.removeItem(CHAVE_USER); window.usuarioLogado = ""; esconderTodasTelas(); document.getElementById('campo-senha').value = ''; document.getElementById('tela-login').style.display = 'flex'; atualizarStatusConexao();
} 

function voltarParaPlacas() { aplicarDadosAguardando(); esconderTodasTelas(); document.getElementById('tela-placas').style.display = 'flex'; } 
function voltarParaMenu() { aplicarDadosAguardando(); esconderTodasTelas(); document.getElementById('tela-menu').style.display = 'flex'; atualizarBotaoSyncManual(); renderizarAlertas(); atualizarTileGerente(); renderizarTileProblemas(); }

function escolherModulo(modulo) { 
    window.moduloAtual = modulo; 
    esconderTodasTelas(); 
    if (modulo === 'Estoque') { 
        document.getElementById('tela-submenu-estoque').style.display = 'flex'; 
    } else { 
        let btnOutros = document.getElementById('btn-placa-outros'); 
        let titOutros = document.getElementById('titulo-outros'); 
        if (btnOutros && titOutros) { 
            btnOutros.style.display = (modulo === 'Abastecimento') ? 'grid' : 'none'; // OUTROS so no abastecimento (avulso, nao cria placa)
            titOutros.style.display = (modulo === 'Abastecimento') ? 'block' : 'none'; 
        } 
        document.querySelectorAll('[id^="check-"]').forEach(el => el.style.display = 'none'); 
        let bImp = document.getElementById('btn-imprimir-chk'); if (bImp) bImp.style.display = modulo === 'Checklist' ? 'block' : 'none';
        
        if (modulo === 'Checklist' && window.historicoChecklist) { 
            let agora = new Date(); 
            let inicioSemana = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() - agora.getDay()); 
            inicioSemana.setHours(0,0,0,0); 
            window.historicoChecklist.forEach(h => { 
                let dataStr = String(h.data); let dataObj; 
                if (dataStr.includes('/')) { let partes = dataStr.split(' ')[0].split('/'); dataObj = new Date(partes[2], partes[1] - 1, partes[0]); } else { dataObj = new Date(dataStr); } 
                if (dataObj >= inicioSemana) { let placaLimpa = String(h.placa).trim().toUpperCase(); let badge = document.getElementById('check-' + placaLimpa); if (badge) badge.style.display = 'flex'; } 
            }); 
        } 
        document.getElementById('tela-placas').style.display = 'flex'; 
    } 
}

function abrirModuloEstoque(sub) { 
    document.getElementById('card-est-posicao').style.display = (sub === 'posicao') ? 'block' : 'none'; document.getElementById('card-est-movimentacao').style.display = (sub === 'movimentacao') ? 'block' : 'none'; document.getElementById('card-est-compra').style.display = (sub === 'compra') ? 'block' : 'none'; document.getElementById('titulo-tela-interna').innerHTML = sub === 'posicao' ? '<i class="ph ph-chart-bar"></i> Posição do Estoque' : (sub === 'movimentacao' ? '<i class="ph ph-arrows-left-right"></i> Entrada / Saída' : '<i class="ph ph-shopping-cart"></i> Solicitar Compra'); 
    let secoes = document.getElementsByClassName('secao-conteudo'); for (let i = 0; i < secoes.length; i++) { secoes[i].style.display = 'none'; } 
    document.getElementById('conteudo-Estoque').style.display = 'flex'; document.getElementById('alerta-veiculo-interna').style.display = 'none'; document.getElementById('btn-trocar-veiculo').style.display = 'none'; document.getElementById('btn-voltar-menu').onclick = function() { aplicarDadosAguardando(); esconderTodasTelas(); document.getElementById('tela-submenu-estoque').style.display = 'flex'; }; esconderTodasTelas(); document.getElementById('tela-interna').style.display = 'flex'; 
}

async function selecionarPlaca(placa, bypassTrava = false) { 
    if (placa === 'OUTROS') { 
        placa = await cadastrarVeiculoOutros();
        if (!placa) return;
    } 

    if (window.moduloAtual === 'Checklist' && !bypassTrava) {
        let agora = new Date(); 
        let inicioSemana = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() - agora.getDay()); 
        inicioSemana.setHours(0,0,0,0); 
        let jaFeito = window.historicoChecklist.some(h => {
            let dataStr = String(h.data); let dataObj;
            if (dataStr.includes('/')) { let partes = dataStr.split(' ')[0].split('/'); dataObj = new Date(partes[2], partes[1] - 1, partes[0]); } else { dataObj = new Date(dataStr); }
            return (dataObj >= inicioSemana && String(h.placa).trim().toUpperCase() === placa.trim().toUpperCase());
        });
        if (jaFeito) {
            const result = await Swal.fire({ title: 'Atenção!', text: `O Checklist para a placa ${placa} JÁ FOI FEITO nesta semana! Deseja preencher um NOVO checklist?`, icon: 'warning', showCancelButton: true, confirmButtonColor: '#1a4d2e', cancelButtonColor: '#d33', confirmButtonText: 'Sim', cancelButtonText: 'Não' });
            if (!result.isConfirmed) return;
        }
    }

    let dados = window.frota[placa]; if (!dados) { Swal.fire("Atenção", "Veículo não encontrado!", "warning"); return; }
    document.getElementById('texto-placa-interna').innerText = placa; 
    
    window.isCavalo = CAVALOS.includes(placa.trim()); window.isTruck = TRUCKS.includes(placa.trim()); window.isToco = TOCOS.includes(placa.trim()); window.isCarro = CARROS.includes(placa.trim()); window.isEmpilhadeira = EMPILHADEIRAS.includes(placa.trim());
    if (!window.isCavalo && !window.isTruck && !window.isToco && !window.isCarro && !window.isEmpilhadeira) window.isTruck = true;

    let ctCaminhao = document.getElementById('ficha-pneus-caminhao-container'); let chkCaminhao = document.getElementById('chk-pneus-caminhao-container'); 
    let ctCarreta = document.getElementById('ficha-pneus-carreta-container'); let chkCarreta = document.getElementById('chk-pneus-carreta-container'); 
    let ctCarro = document.getElementById('ficha-pneus-carro-container'); let chkCarro = document.getElementById('chk-pneus-carro-container'); 
    if (window.isCarro) { 
        if(ctCarro) ctCarro.innerHTML = htmlFichaCarro; if(chkCarro) chkCarro.innerHTML = htmlChkCarro; 
        if(ctCaminhao) ctCaminhao.innerHTML = ""; if(chkCaminhao) chkCaminhao.innerHTML = ""; 
        if(ctCarreta) ctCarreta.innerHTML = ""; if(chkCarreta) chkCarreta.innerHTML = ""; 
    } else if (!window.isEmpilhadeira) { 
        let tFicha = window.isToco ? htmlFichaToco : htmlFichaTruck; let tChk = window.isToco ? htmlChkToco : htmlChkTruck;
        if(ctCaminhao) ctCaminhao.innerHTML = tFicha; if(chkCaminhao) chkCaminhao.innerHTML = tChk; 
        if(ctCarreta) ctCarreta.innerHTML = htmlFichaCarreta; if(chkCarreta) chkCarreta.innerHTML = htmlChkCarreta; 
        if(ctCarro) ctCarro.innerHTML = ""; if(chkCarro) chkCarro.innerHTML = ""; 
    } 
    document.querySelectorAll('.is-carreta').forEach(el => { el.style.display = window.isCavalo ? 'block' : 'none'; }); document.querySelectorAll('.esconder-carro').forEach(el => { el.style.display = (window.isCarro || window.isEmpilhadeira) ? 'none' : 'block'; }); document.querySelectorAll('.mostrar-carro').forEach(el => { el.style.display = window.isCarro ? 'block' : 'none'; }); document.querySelectorAll('.esconder-cavalo-chk').forEach(el => { el.style.display = (window.isCavalo || window.isEmpilhadeira) ? 'none' : 'block'; }); 
    let selAbast = document.getElementById('tipo-abast'); let nomeComb = (window.isCarro || dados.avulso) ? "COMBUSTÍVEL" : "DIESEL"; selAbast.innerHTML = `<option value="DIESEL">Abastecer ${nomeComb}</option><option value="ARLA">Abastecer ARLA</option><option value="CHEGADA DE DIESEL">📥 Receber CHEGADA DE ${nomeComb}</option><option value="CHEGADA DE ARLA">📥 Receber CHEGADA DE ARLA</option>`; mudarFormAbast();
    let elTipo = document.getElementById('tipo-veiculo'); if(elTipo) elTipo.value = dados.tipo || ""; let elMotorista = document.getElementById('nome-motorista'); if(elMotorista) elMotorista.value = dados.motorista || ""; let formatNum = v => v ? String(v).replace(/[^0-9]/g, '') : ""; let elKm = document.getElementById('km-master'); if(elKm) elKm.value = formatNum(dados.km_atual); let elO = document.getElementById('km-proxima-troca'); if(elO) elO.value = formatNum(dados.km_oleo); let elCb = document.getElementById('km-proxima-cambio'); if(elCb) elCb.value = formatNum(dados.km_cambio); let elDf = document.getElementById('km-proxima-diferencial'); if(elDf) elDf.value = formatNum(dados.km_diferencial); let elT = document.getElementById('data-ultima-afericao'); if(elT) elT.value = dados.data_tacografo || ""; let elG = document.getElementById('data-engraxada'); if(elG) elG.value = dados.data_graxa || ""; let elCar = document.getElementById('qtd-carrinhos'); if(elCar) elCar.value = dados.qtd_carrinhos || 0; let elCon = document.getElementById('qtd-cones'); if(elCon) elCon.value = dados.qtd_cones || 0; let elCal = document.getElementById('qtd-calcos'); if(elCal) elCal.value = dados.qtd_calcos || 0; let elExt = document.getElementById('data-extintor-ficha'); if(elExt) elExt.value = dados.data_extintor || ""; urlDocAtual = dados.link_documento || ""; 
    let abData = dados.abast_atual || {km_ant: 0, km_atual: 0, litros: 0};
    document.getElementById('abast-km-ant').value = abData.km_ant; document.getElementById('abast-km-atual').value = abData.km_atual; document.getElementById('abast-litros').value = abData.litros;
    
    if (dados.pneus && !window.isEmpilhadeira) { 
        let pIds = window.isCarro ? ['dd','de','td','te'] : (window.isToco ? ['dd','de','tde','tdi','tee','tei','1step'] : ['dd','de','tde','tdi','tee','tei','tkde','tkdi','tkee','tkei','1step','c1','c2','c3','c4','c5','c6','c7','c8','c9','c10','c11','c12','2step']);
        let pref = window.isCarro ? 'carro-' : ''; 
        pIds.forEach(pos => { 
            let pneu = dados.pneus[pos] || {}; 
            let elEstado = document.getElementById(`${pref}estado-${pos}`); let elTwi = document.getElementById(`${pref}twi-${pos}`); let elKmTroca = document.getElementById(`${pref}km-troca-${pos}`); let elDataTroca = document.getElementById(`${pref}data-troca-${pos}`); let elDataRod = document.getElementById(`${pref}data-rodizio-${pos}`); let elProxRod = document.getElementById(`${pref}prox-rodizio-${pos}`); let elColocado = document.getElementById(`${pref}pneu-colocado-${pos}`);
            if(elEstado) elEstado.innerText = pneu.estado || "---"; if(elTwi) elTwi.innerText = (pneu.milimetros && pneu.milimetros !== "---") ? fmtMm(pneu.milimetros) + " mm" : "---"; if(elKmTroca) elKmTroca.value = pneu.km_ultima_troca || 0; if(elDataTroca) elDataTroca.value = pneu.data_ultima_troca || ""; if(elDataRod) elDataRod.value = pneu.data_ultimo_rodizio || ""; if(elProxRod) elProxRod.value = pneu.km_proximo_rodizio || 0; if(elColocado) elColocado.value = pneu.pneu_colocado || "NOVO";
        }); 
    } 
    let iL = document.getElementById('ficha-img-lat'); let pL = document.getElementById('ficha-pl-lat'); if (iL && pL) { document.getElementById('ficha-label-foto-1').innerText = window.isCarro ? "Frente" : "Lateral"; if (dados.foto_lateral && dados.foto_lateral !== "") { iL.src = forcarImagemDiretaDrive(dados.foto_lateral); iL.style.display = 'block'; pL.style.display = 'none'; } else { iL.style.display = 'none'; pL.style.display = 'flex'; } } let iT = document.getElementById('ficha-img-tras'); let pT = document.getElementById('ficha-pl-tras'); if (iT && pT) { document.getElementById('ficha-label-foto-2').innerText = window.isCarro ? "Verso/Traseira" : "Traseira"; if (dados.foto_traseira && dados.foto_traseira !== "") { iT.src = forcarImagemDiretaDrive(dados.foto_traseira); iT.style.display = 'block'; pT.style.display = 'none'; } else { iT.style.display = 'none'; pT.style.display = 'flex'; } } 
    let aK = document.getElementById('aviso-ultimo-km'); if(aK) aK.innerText = dados.km_atual || 0; let aG = document.getElementById('abast-gasto-mes'); if(aG) aG.innerText = (dados.gasto_mes || 0) + " L"; 
    atualizarKMGeral(); calcularTacografo(); calcularGraxa(); calcularExtintor(); calcularAbastecimento();
    abrirPagina(window.moduloAtual); 
}

function abrirPagina(nomeDaPagina) { 
    if(nomeDaPagina === 'Abastecimento' && typeof preencherDataHoraAbast === 'function') { preencherDataHoraAbast(); } 
    let icone = "";
    if (nomeDaPagina === "Ficha Técnica") icone = "<i class='ph ph-file-text'></i> ";
    if (nomeDaPagina === "Checklist") icone = "<i class='ph ph-check-square'></i> ";
    if (nomeDaPagina === "Abastecimento") icone = "<i class='ph ph-gas-pump'></i> ";
    
    document.getElementById('titulo-tela-interna').innerHTML = icone + nomeDaPagina; 
    let secoes = document.getElementsByClassName('secao-conteudo'); 
    for (let i = 0; i < secoes.length; i++) { secoes[i].style.display = 'none'; } 
    let secaoAtiva = document.getElementById('conteudo-' + nomeDaPagina); 
    if (secaoAtiva) { secaoAtiva.style.display = 'flex'; } 
    document.getElementById('alerta-veiculo-interna').style.display = 'block'; document.getElementById('btn-trocar-veiculo').style.display = 'block'; document.getElementById('btn-voltar-menu').onclick = voltarParaMenu; 
    esconderTodasTelas(); document.getElementById('tela-interna').style.display = 'flex'; 

    if (nomeDaPagina === 'Checklist') { iniciarNovoChecklist(); }
}

let isDrawingPad = false; function initPad(canvasId) { let cvs = document.getElementById(canvasId); if(!cvs) return; let ctx = cvs.getContext('2d'); ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.strokeStyle = '#000'; const getPos = (e) => { let rect = cvs.getBoundingClientRect(); let cX = e.touches ? e.touches[0].clientX : e.clientX; let cY = e.touches ? e.touches[0].clientY : e.clientY; return { x: (cX - rect.left) * (cvs.width / rect.width), y: (cY - rect.top) * (cvs.height / rect.height) }; }; let start = (e) => { e.preventDefault(); isDrawingPad = true; let p = getPos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); cvs.setAttribute('data-t', '1'); }; let move = (e) => { e.preventDefault(); if(!isDrawingPad) return; let p = getPos(e); ctx.lineTo(p.x, p.y); ctx.stroke(); }; let end = (e) => { e.preventDefault(); isDrawingPad = false; }; cvs.onmousedown = start; cvs.ontouchstart = start; cvs.onmousemove = move; cvs.ontouchmove = move; cvs.onmouseup = end; cvs.ontouchend = end; cvs.onmouseout = end; } function limparPad(canvasId) { let cvs = document.getElementById(canvasId); if(!cvs) return; let ctx = cvs.getContext('2d'); ctx.fillStyle = "#fff"; ctx.fillRect(0,0,cvs.width,cvs.height); cvs.removeAttribute('data-t'); } function getPadB64(canvasId) { let cvs = document.getElementById(canvasId); if(!cvs || !cvs.getAttribute('data-t')) return ""; return cvs.toDataURL('image/png'); } function forcarImagemDiretaDrive(url) { if (!url || typeof url !== 'string') return ""; let matchId = url.match(/\/d\/([a-zA-Z0-9_-]+)/); if (matchId && matchId[1]) return "https://lh3.googleusercontent.com/d/" + matchId[1]; let matchId2 = url.match(/id=([a-zA-Z0-9_-]+)/); if (matchId2 && matchId2[1]) return "https://lh3.googleusercontent.com/d/" + matchId2[1]; return url; }

function renderizarMotoristas() { let options = `<option value="">Selecione o Motorista...</option>`; if (window.listaMotoristas && window.listaMotoristas.length > 0) { window.listaMotoristas.forEach(m => { options += `<option value="${m}">${m}</option>`; }); } options += `<option value="NOVO" style="font-weight:bold; color:#1a4d2e;">➕ OUTRO (Adicionar Novo)</option>`; ['chk-motorista', 'chk-carro-motorista', 'chk-emp-motorista', 'abast-motorista', 'nome-motorista'].forEach(id => { let el = document.getElementById(id); if(!el) return; let atual = el.value; el.innerHTML = options; if (atual && atual !== "NOVO") { if (![...el.options].some(o => o.value === atual)) el.add(new Option(atual, atual), 1); el.value = atual; } }); }
function verificarNovoMotorista(sel) {
    if (sel.value !== "NOVO") return;
    Swal.fire({ title: "Novo Motorista", input: "text", inputPlaceholder: "Digite o nome do motorista...", inputAttributes: { autocapitalize: "characters" }, showCancelButton: true, confirmButtonText: "Salvar", cancelButtonText: "Cancelar", confirmButtonColor: "#1a4d2e", inputValidator: v => !v.replace(/["<>]/g, '').trim() && "Digite o nome do motorista!" }).then(r => {
        if (!r.isConfirmed) { sel.value = sel.dataset.anterior || ""; return; }
        let nome = r.value.replace(/["<>]/g, '').trim().toUpperCase();
        let existente = window.listaMotoristas.find(m => String(m).trim().toUpperCase() === nome);
        if (existente) { nome = existente; } else { window.listaMotoristas.push(nome); salvarCacheLocal(); }
        renderizarMotoristas();
        sel.value = nome; sel.dataset.anterior = nome;
        mostrarToast("<i class='ph ph-user-plus'></i> Motorista adicionado! Será salvo na base ao enviar.", "#059669");
    });
}
function verificarNovoMotoristaAbast(sel) { let inputNovo = document.getElementById('abast-motorista-novo'); if(sel.value === "NOVO") { inputNovo.style.display = 'block'; inputNovo.focus(); } else { inputNovo.style.display = 'none'; inputNovo.value = ''; } }
function atualizarKMGeral() { document.getElementById('km-atual-oleo').innerText = document.getElementById('km-master').value; calcularOleo(); calcularRodizioPneus(); } 

async function salvarFichaNaNuvemBackground() { 
    let payload = { acao: "salvar_ficha_tecnica", usuario: window.usuarioLogado, placa: document.getElementById('texto-placa-interna').innerText, tipo: document.getElementById('tipo-veiculo').value, motorista: document.getElementById('nome-motorista').value, km_atual: document.getElementById('km-master').value, km_oleo: document.getElementById('km-proxima-troca').value, km_cambio: window.isCarro ? "" : document.getElementById('km-proxima-cambio').value, km_diferencial: window.isCarro ? "" : document.getElementById('km-proxima-diferencial').value, data_tacografo: window.isCarro ? "" : document.getElementById('data-ultima-afericao').value, data_graxa: window.isCarro ? "" : document.getElementById('data-engraxada').value, qtd_carrinhos: window.isCarro ? "" : document.getElementById('qtd-carrinhos').value, qtd_cones: window.isCarro ? "" : document.getElementById('qtd-cones').value, qtd_calcos: window.isCarro ? "" : document.getElementById('qtd-calcos').value, data_extintor: document.getElementById('data-extintor-ficha').value, pneus: {} }; 
    let tIds = window.isCarro ? ['dd','de','td','te'] : (window.isToco ? ['dd','de','tde','tdi','tee','tei','1step'] : ['dd','de','tde','tdi','tee','tei','tkde','tkdi','tkee','tkei','1step','c1','c2','c3','c4','c5','c6','c7','c8','c9','c10','c11','c12','2step']); let pref = window.isCarro ? 'carro-' : ''; 
    tIds.forEach(id => { let km = document.getElementById(pref+'km-troca-'+id); if(km) { payload.pneus[id] = { km_ultima_troca: km.value, data_ultima_troca: document.getElementById(pref+'data-troca-'+id).value, data_ultimo_rodizio: document.getElementById(pref+'data-rodizio-'+id).value, pneu_colocado: document.getElementById(pref+'pneu-colocado-'+id).value, km_proximo_rodizio: document.getElementById(pref+'prox-rodizio-'+id).value }; } }); 
    
    window.frota[payload.placa].tipo = payload.tipo; window.frota[payload.placa].motorista = payload.motorista; window.frota[payload.placa].km_atual = payload.km_atual; window.frota[payload.placa].km_oleo = payload.km_oleo; if (payload.km_cambio) window.frota[payload.placa].km_cambio = payload.km_cambio; if (payload.km_diferencial) window.frota[payload.placa].km_diferencial = payload.km_diferencial; window.frota[payload.placa].data_tacografo = payload.data_tacografo; window.frota[payload.placa].data_graxa = payload.data_graxa; window.frota[payload.placa].qtd_carrinhos = payload.qtd_carrinhos; window.frota[payload.placa].qtd_cones = payload.qtd_cones; window.frota[payload.placa].qtd_calcos = payload.qtd_calcos; window.frota[payload.placa].data_extintor = payload.data_extintor;
    for(let id in payload.pneus) { if(!window.frota[payload.placa].pneus[id]) window.frota[payload.placa].pneus[id] = {}; window.frota[payload.placa].pneus[id].km_ultima_troca = payload.pneus[id].km_ultima_troca; window.frota[payload.placa].pneus[id].data_ultima_troca = payload.pneus[id].data_ultima_troca; window.frota[payload.placa].pneus[id].data_ultimo_rodizio = payload.pneus[id].data_ultimo_rodizio; window.frota[payload.placa].pneus[id].pneu_colocado = payload.pneus[id].pneu_colocado; window.frota[payload.placa].pneus[id].km_proximo_rodizio = payload.pneus[id].km_proximo_rodizio; }
    let elAv = document.getElementById('aviso-ultimo-km'); if(elAv) elAv.innerText = payload.km_atual;

    salvarCacheLocal();
    if (!(await adicionarNaFila(payload))) return;
    mostrarToast("<i class='ph ph-floppy-disk'></i> Ficha salva localmente");
} 

async function alternarEdicaoHeader() { let c = [document.getElementById('tipo-veiculo'), document.getElementById('nome-motorista'), document.getElementById('km-master')]; let b = document.getElementById('btn-editar-header'); if (c[0].hasAttribute('readonly')) { c.forEach(x => { x.removeAttribute('readonly'); x.removeAttribute('disabled'); x.classList.remove('travado'); }); b.innerHTML = "<i class='ph ph-floppy-disk'></i> Salvar"; b.style.backgroundColor = "#1a4d2e"; b.style.color = "white"; c[0].focus(); } else { if (!(await confirmarKm(document.getElementById('texto-placa-interna').innerText, c[2].value))) { c[2].focus(); return; } c.forEach(x => { x.setAttribute('readonly', 'true'); if(x.tagName === 'SELECT') x.setAttribute('disabled', 'true'); x.classList.add('travado'); }); b.innerHTML = "<i class='ph ph-pencil-simple'></i> Editar"; b.style.backgroundColor = "transparent"; b.style.color = "#1a4d2e"; atualizarKMGeral(); salvarFichaNaNuvemBackground(); } } 
function alternarEdicaoOleo() { let cs = ['km-proxima-troca', 'km-proxima-cambio', 'km-proxima-diferencial'].map(id => document.getElementById(id)).filter(Boolean); let b = document.getElementById('btn-editar-oleo'); if (cs[0].hasAttribute('readonly')) { cs.forEach(c => { c.removeAttribute('readonly'); c.classList.remove('travado'); }); b.innerHTML = "<i class='ph ph-floppy-disk'></i> Salvar"; b.style.backgroundColor = "#1a4d2e"; b.style.color = "white"; } else { cs.forEach(c => { c.setAttribute('readonly', 'true'); c.classList.add('travado'); }); b.innerHTML = "<i class='ph ph-pencil-simple'></i> Editar"; b.style.backgroundColor = "transparent"; b.style.color = "#1a4d2e"; calcularOleo(); salvarFichaNaNuvemBackground(); } } 
// Status das 3 trocas de óleo (motor: amarelo a 1.500 km; câmbio e diferencial: amarelo a 3.000 km)
function calcularOleo() { let kmA = parseFloat(document.getElementById('km-master').value) || 0; [['km-proxima-troca', 'status-oleo', 1500], ['km-proxima-cambio', 'status-cambio', 3000], ['km-proxima-diferencial', 'status-diferencial', 3000]].forEach(([idP, idS, lim]) => { let inP = document.getElementById(idP), txt = document.getElementById(idS); if (!inP || !txt) return; let kmP = parseFloat(inP.value) || 0; let kmF = kmP - kmA; if (kmP === 0) { txt.innerHTML = "---"; txt.style.color = ""; return; } if (kmF <= 0) { txt.innerHTML = `VENCIDO (${Math.abs(kmF)} KM) <i class="ph-fill ph-warning-circle"></i>`; txt.style.color = "red"; } else if (kmF <= lim) { txt.innerHTML = `Faltam ${kmF} KM <i class="ph-fill ph-warning"></i>`; txt.style.color = "#d4a017"; } else { txt.innerHTML = `Faltam ${kmF} KM <i class="ph-fill ph-check-circle"></i>`; txt.style.color = "green"; } }); }
function alternarEdicaoTacografo() { let c = document.getElementById('data-ultima-afericao'); let b = document.getElementById('btn-editar-tacografo'); if (c.hasAttribute('readonly')) { c.removeAttribute('readonly'); c.classList.remove('travado'); b.innerHTML = "<i class='ph ph-floppy-disk'></i> Salvar"; b.style.backgroundColor = "#1a4d2e"; b.style.color = "white"; } else { c.setAttribute('readonly', 'true'); c.classList.add('travado'); b.innerHTML = "<i class='ph ph-pencil-simple'></i> Editar"; b.style.backgroundColor = "transparent"; b.style.color = "#1a4d2e"; calcularTacografo(); salvarFichaNaNuvemBackground(); } } 
function calcularTacografo() { let s = document.getElementById('data-ultima-afericao').value; let t = document.getElementById('status-tacografo'); let dP = document.getElementById('data-proxima-afericao'); if (!s || s.length < 8 || !s.includes('-')) { if(t) t.innerHTML = "---"; if(dP) dP.innerText = "--/--/----"; return; } let p = s.split('-'); let px = new Date(p[0], p[1] - 1, p[2]); px.setFullYear(px.getFullYear() + 2); /* a aferição vale 2 anos: próxima = última + 2 anos */ if(dP) dP.innerText = `${String(px.getDate()).padStart(2,'0')}/${String(px.getMonth()+1).padStart(2,'0')}/${px.getFullYear()}`; let hj = new Date(); hj.setHours(0,0,0,0); let d = Math.ceil((px.getTime() - hj.getTime()) / (1000 * 3600 * 24)); if (d < 0) { t.innerHTML = `VENCIDO há ${Math.abs(d)} dias <i class="ph-fill ph-warning-circle"></i>`; t.style.color = "red"; } else if (d <= 30) { t.innerHTML = `Atenção: Faltam ${d} dias <i class="ph-fill ph-warning"></i>`; t.style.color = "#d4a017"; } else { t.innerHTML = `Faltam ${d} dias <i class="ph-fill ph-check-circle"></i>`; t.style.color = "green"; } }
function alternarEdicaoPneus() { let pref = window.isCarro ? 'carro-' : ''; let i = document.querySelectorAll(`#conteudo-Ficha\\ Técnica input[id^="${pref}km-troca-"], #conteudo-Ficha\\ Técnica input[id^="${pref}data-troca-"], #conteudo-Ficha\\ Técnica input[id^="${pref}data-rodizio-"], #conteudo-Ficha\\ Técnica input[id^="${pref}prox-rodizio-"], #conteudo-Ficha\\ Técnica select[id^="${pref}pneu-colocado-"]`); let b = document.getElementById('btn-editar-pneus'); if (i[0].hasAttribute('readonly') || i[0].disabled) { i.forEach(c => { if(c.tagName === 'SELECT') c.disabled = false; else c.removeAttribute('readonly'); c.classList.remove('travado'); }); b.innerHTML = "<i class='ph ph-floppy-disk'></i> Salvar Pneus"; b.style.backgroundColor = "#1a4d2e"; b.style.color = "white"; } else { i.forEach(c => { if(c.tagName === 'SELECT') c.disabled = true; else c.setAttribute('readonly', 'true'); c.classList.add('travado'); }); b.innerHTML = "<i class='ph ph-pencil-simple'></i> Editar Pneus"; b.style.backgroundColor = "transparent"; b.style.color = "#1a4d2e"; if(!window.isCarro) calcularRodizioPneus(); salvarFichaNaNuvemBackground(); } }
function calcularRodizioPneus() { let kmM = parseInt(document.getElementById('km-master').value) || 0; let tIds = window.isCarro ? ['dd','de','td','te'] : (window.isToco ? ['dd','de','tde','tdi','tee','tei','1step'] : ['dd','de','tde','tdi','tee','tei','tkde','tkdi','tkee','tkei','1step','c1','c2','c3','c4','c5','c6','c7','c8','c9','c10','c11','c12','2step']); let pref = window.isCarro ? 'carro-' : ''; tIds.forEach(p => { let sE = document.getElementById(`${pref}estado-${p}`); let tS = document.getElementById(`${pref}status-rod-${p}`); let pR_el = document.getElementById(`${pref}prox-rodizio-${p}`); if(!sE || !tS || !pR_el) return; let pR = parseInt(pR_el.value) || 0; if (pR === 0) { tS.innerText = "Aguardando..."; tS.style.color = "gray"; return; } let kF = pR - kmM; if (kF <= 0) { tS.innerHTML = `VENCIDO (${Math.abs(kF)} KM) <i class="ph-fill ph-warning-circle"></i>`; tS.style.color = "red"; } else if (kF <= 1500) { tS.innerHTML = `Faltam ${kF} KM <i class="ph-fill ph-warning"></i>`; tS.style.color = "#d4a017"; } else { tS.innerHTML = `Faltam ${kF} KM <i class="ph-fill ph-check-circle"></i>`; tS.style.color = "green"; } }); }
function alternarEdicaoEquip() { let c = [document.getElementById('qtd-carrinhos'), document.getElementById('qtd-cones'), document.getElementById('qtd-calcos'), document.getElementById('data-extintor-ficha')]; let b = document.getElementById('btn-editar-equip'); if (c[0].hasAttribute('readonly')) { c.forEach(x => { x.removeAttribute('readonly'); x.classList.remove('travado'); }); b.innerHTML = "<i class='ph ph-floppy-disk'></i> Salvar"; b.style.backgroundColor = "#1a4d2e"; b.style.color = "white"; } else { c.forEach(x => { x.setAttribute('readonly', 'true'); x.classList.add('travado'); }); b.innerHTML = "<i class='ph ph-pencil-simple'></i> Editar"; b.style.backgroundColor = "transparent"; b.style.color = "#1a4d2e"; calcularExtintor(); salvarFichaNaNuvemBackground(); } } 
function calcularExtintor() { let s = document.getElementById('data-extintor-ficha').value; let t = document.getElementById('status-extintor'); if (!s || s.length < 8) { if(t) t.innerHTML = "---"; return; } let p = s.split('-'); let px = new Date(p[0], p[1] - 1, p[2]); let hj = new Date(); hj.setHours(0,0,0,0); let d = Math.ceil((px.getTime() - hj.getTime()) / (1000 * 3600 * 24)); if (d < 0) { t.innerHTML = `VENCIDO há ${Math.abs(d)} dias <i class="ph-fill ph-warning-circle"></i>`; t.style.color = "red"; } else if (d <= 30) { t.innerHTML = `Atenção: Vence em ${d} dias <i class="ph-fill ph-warning"></i>`; t.style.color = "#d4a017"; } else { t.innerHTML = `Válido por ${d} dias <i class="ph-fill ph-check-circle"></i>`; t.style.color = "green"; } } 
function alternarEdicaoAbast() { let c = [document.getElementById('abast-km-ant'), document.getElementById('abast-km-atual'), document.getElementById('abast-litros'), document.getElementById('data-engraxada')]; let b = document.getElementById('btn-editar-abast'); if (c[0].hasAttribute('readonly')) { c.forEach(x => { x.removeAttribute('readonly'); x.classList.remove('travado'); }); b.innerHTML = "<i class='ph ph-floppy-disk'></i> Salvar"; b.style.backgroundColor = "#1a4d2e"; b.style.color = "white"; } else { c.forEach(x => { x.setAttribute('readonly', 'true'); x.classList.add('travado'); }); b.innerHTML = "<i class='ph ph-pencil-simple'></i> Editar"; b.style.backgroundColor = "transparent"; b.style.color = "#1a4d2e"; calcularAbastecimento(); calcularGraxa(); salvarFichaNaNuvemBackground(); } } 
function calcularAbastecimento() { let kA = parseFloat(document.getElementById('abast-km-ant').value) || 0; let kU = parseFloat(document.getElementById('abast-km-atual').value) || 0; let l = parseFloat(document.getElementById('abast-litros').value) || 0; let t = document.getElementById('abast-media'); if (l > 0 && kU > kA) t.innerText = ((kU - kA) / l).toFixed(2) + " km/L"; else t.innerText = "0.00 km/L"; } 
function calcularGraxa() { let s = document.getElementById('data-engraxada').value; let t = document.getElementById('status-graxa'); if (!s || s.length < 8) { if(t) t.innerHTML = "---"; document.getElementById('data-prox-engraxada').innerText = "--/--/----"; return; } let p = s.split('-'); let ultima = new Date(p[0], p[1] - 1, p[2]); let proxima = new Date(ultima); proxima.setDate(proxima.getDate() + 30); document.getElementById('data-prox-engraxada').innerText = `${String(proxima.getDate()).padStart(2,'0')}/${String(proxima.getMonth()+1).padStart(2,'0')}/${proxima.getFullYear()}`; let h = new Date(); h.setHours(0,0,0,0); let d = Math.ceil((proxima.getTime() - h.getTime()) / (1000 * 3600 * 24)); if (d < 0) { t.innerHTML = `VENCIDO há ${Math.abs(d)} dias <i class="ph-fill ph-warning-circle"></i>`; t.style.color = "red"; } else if (d <= 5) { t.innerHTML = `Atenção: Faltam ${d} dias <i class="ph-fill ph-warning"></i>`; t.style.color = "#d4a017"; } else { t.innerHTML = `Faltam ${d} dias <i class="ph-fill ph-check-circle"></i>`; t.style.color = "green"; } } 
function abrirDocPDF() { if (urlDocAtual && urlDocAtual.trim() !== "") window.open(urlDocAtual, '_blank'); else { Swal.fire("Atenção", "Nenhum documento cadastrado para este veículo.", "info"); } }

function mudarFormAbast() { let t = document.getElementById('tipo-abast').value; if (t.includes("CHEGADA")) { document.getElementById('form-abast-veiculo').style.display = 'none'; document.getElementById('form-abast-chegada').style.display = 'block'; } else { document.getElementById('form-abast-veiculo').style.display = 'block'; document.getElementById('form-abast-chegada').style.display = 'none'; } } 
function preencherDataHoraAbast() { let n = new Date(); let hL = new Date(n.getTime() - (n.getTimezoneOffset() * 60000)).toISOString().slice(0,16); let eA = document.getElementById('abast-data'); if(eA) eA.value = hL; let eC = document.getElementById('chegada-data'); if(eC) eC.value = hL; document.getElementById('estoque-diesel-geral').innerText = window.estoqueDiesel + " L"; document.getElementById('estoque-arla-geral').innerText = window.estoqueArla + " L"; document.getElementById('gasto-mes-geral').innerText = window.gastoMesGeral + " L"; }

let abastPendente = null;

async function salvarAbastecimentoNuvem() { 
    let t = document.getElementById('tipo-abast').value; 
    let pl = document.getElementById('texto-placa-interna').innerText; 
    let p = { acao: "salvar_abastecimento", usuario: window.usuarioLogado, tipo: t, placa: t.includes("CHEGADA") ? "ESTOQUE" : pl }; 
    
    if (t.includes("CHEGADA")) { 
        p.data = document.getElementById('chegada-data').value; 
        p.litros = parseFloat(document.getElementById('chegada-litros').value) || 0; 
        p.nf = document.getElementById('chegada-nf').value; 
        p.km = ""; p.motorista = ""; p.responsavel = ""; 
        if (!p.data || !p.litros || !p.nf) { Swal.fire("Atenção", "Preencha Data, Litros e NF!", "warning"); return; } 
    } else { 
        p.data = document.getElementById('abast-data').value; 
        p.km = parseFloat(document.getElementById('abast-km-novo').value) || 0; 
        p.litros = parseFloat(document.getElementById('abast-litros-bomba').value) || 0; 
        let motSel = document.getElementById('abast-motorista').value; 
        if (motSel === "NOVO") { motSel = document.getElementById('abast-motorista-novo').value.trim().toUpperCase(); if (!motSel) { Swal.fire("Atenção", "Digite o nome do motorista!", "warning"); return; } } 
        p.motorista = motSel; 
        p.responsavel = document.getElementById('abast-resp').value; 
        p.nf = ""; 
        let kU = parseFloat(document.getElementById('aviso-ultimo-km').innerText) || 0; 
        if (!p.data || !p.km || !p.litros || !p.motorista || !p.responsavel) { Swal.fire("Atenção", "Preencha todos os campos do Abastecimento!", "warning"); return; } 
        if (!(await confirmarKm(pl, p.km))) return; 
    } 
    
    abastPendente = p;
    document.getElementById('conf-abast-placa').innerText = p.placa;
    document.getElementById('conf-abast-tipo').innerText = p.tipo;
    document.getElementById('conf-abast-litros').innerText = p.litros + " L";
    document.getElementById('conf-abast-km').innerText = p.km ? p.km : "N/A";
    document.getElementById('conf-abast-mot').innerText = p.motorista ? p.motorista : "N/A";
    document.getElementById('conf-abast-resp').innerText = p.responsavel ? p.responsavel : "N/A";
    document.getElementById('modal-confirmar-abast').style.display = 'flex';
}

function fecharModalAbast() { document.getElementById('modal-confirmar-abast').style.display = 'none'; abastPendente = null; }

async function confirmarEEnviarAbastecimento() {
    if (!abastPendente) return;
    let p = abastPendente; let t = p.tipo; let pl = p.placa;
    abastPendente = null; // evita lançamento duplicado com dois toques
    if (!(await adicionarNaFila(p))) { abastPendente = p; return; }
    Swal.fire("Salvo e Agendado!", "Dados blindados no aplicativo!<br><br>O lançamento será enviado para o Google automaticamente na próxima sincronização.", "success"); 
    
    document.getElementById('abast-km-novo').value = ""; document.getElementById('abast-litros-bomba').value = ""; 
    document.getElementById('chegada-litros').value = ""; document.getElementById('chegada-nf').value = ""; 
    
    let hj = new Date(); let hjStr = String(hj.getDate()).padStart(2,'0') + '/' + String(hj.getMonth()+1).padStart(2,'0') + '/' + hj.getFullYear(); 
    let newItem = { data: hjStr, placa: pl, litros: p.litros, usuario: window.usuarioLogado, id_transacao: p.id_transacao, km: p.km }; 
    
    if (!t.includes("CHEGADA")) { 
        window.frota[pl].km_atual = p.km; document.getElementById('km-master').value = p.km; document.getElementById('aviso-ultimo-km').innerText = p.km; 
        if(t === "DIESEL" || t === "COMBUSTÍVEL") { 
            window.frota[pl].abast_atual.km_ant = window.frota[pl].abast_atual.km_atual; window.frota[pl].abast_atual.km_atual = p.km; window.frota[pl].abast_atual.litros = p.litros; 
            document.getElementById('abast-km-ant').value = window.frota[pl].abast_atual.km_ant; document.getElementById('abast-km-atual').value = window.frota[pl].abast_atual.km_atual; document.getElementById('abast-litros').value = window.frota[pl].abast_atual.litros; 
            calcularAbastecimento(); atualizarKMGeral(); 
            window.frota[pl].gasto_mes = (window.frota[pl].gasto_mes || 0) + p.litros; document.getElementById('abast-gasto-mes').innerText = window.frota[pl].gasto_mes + " L"; 
            window.estoqueDiesel -= p.litros; window.gastoMesGeral += p.litros; 
            window.histAbast.diesel.unshift(newItem); window.histAbast.diesel = window.histAbast.diesel.slice(0, 24); 
        } 
        if(t === "ARLA") { window.estoqueArla -= p.litros; window.histAbast.arla.unshift(newItem); window.histAbast.arla = window.histAbast.arla.slice(0, 24); } 
    } else { 
        if(t === "CHEGADA DE DIESEL") { window.estoqueDiesel += p.litros; window.histAbast.cheg_diesel.unshift(newItem); window.histAbast.cheg_diesel = window.histAbast.cheg_diesel.slice(0, 3); } 
        if(t === "CHEGADA DE ARLA") { window.estoqueArla += p.litros; window.histAbast.cheg_arla.unshift(newItem); window.histAbast.cheg_arla = window.histAbast.cheg_arla.slice(0, 3); } 
    } 
    preencherDataHoraAbast(); renderizarHistoricoAbast(); salvarCacheLocal();
    fecharModalAbast();
    voltarParaPlacas();
}

function renderizarHistoricoAbast() { 
    let construtorHTML = (lista, isChegada) => { 
        if (!lista || lista.length === 0) return "<p style='color:#666; font-size:12px; margin:0;'>Nenhum registo encontrado.</p>"; 
        return lista.map(i => {
            let btnEdit = (i.usuario === window.usuarioLogado && i.id_transacao && !isChegada) ? 
                `<span style="cursor:pointer; font-size:14px; margin-left:8px; background:#e5e7eb; padding:2px 5px; border-radius:5px;" onclick="abrirModalEditAbast('${i.id_transacao}', '${i.placa}', '${i.litros}', '${i.km}')"><i class='ph ph-pencil-simple'></i> Edit</span>` : "";
            return `<div style="display:flex; justify-content:space-between; align-items:center; padding:5px 0; border-bottom:1px solid #eee; font-size:12px;"><span><i class="ph ph-calendar-blank"></i> ${i.data} ${isChegada ? '' : `- <b>${i.placa}</b>`} ${btnEdit}</span><span style="font-weight:bold; color:${isChegada ? '#1a4d2e' : '#b30000'};">${isChegada ? '+' : '-'} ${i.litros} L</span></div>`;
        }).join(''); 
    }; 
    let eD = document.getElementById('hist-abast-diesel'); if(eD) eD.innerHTML = construtorHTML(window.histAbast.diesel, false); 
    let eA = document.getElementById('hist-abast-arla'); if(eA) eA.innerHTML = construtorHTML(window.histAbast.arla, false); 
    let eCD = document.getElementById('hist-cheg-diesel'); if(eCD) eCD.innerHTML = construtorHTML(window.histAbast.cheg_diesel, true); 
    let eCA = document.getElementById('hist-cheg-arla'); if(eCA) eCA.innerHTML = construtorHTML(window.histAbast.cheg_arla, true); 
} 

let editAbastId = "";
function abrirModalEditAbast(id, placa, litros, km) {
    editAbastId = id;
    document.getElementById('edit-abast-placa').innerText = placa;
    document.getElementById('edit-abast-litros').value = litros;
    document.getElementById('edit-abast-km').value = km;
    document.getElementById('modal-editar-abast').style.display = 'flex';
}
function fecharModalEditAbast() { document.getElementById('modal-editar-abast').style.display = 'none'; editAbastId = ""; }

async function salvarEdicaoAbast() {
    let nLitros = parseFloat(document.getElementById('edit-abast-litros').value);
    let nKm = parseFloat(document.getElementById('edit-abast-km').value);
    if(!nLitros || !nKm) { Swal.fire("Atenção", "Preencha KM e Litros corretamente.", "warning"); return; }
    
    let p = { acao: "editar_abastecimento", id_transacao: editAbastId, litros: nLitros, km: nKm, usuario: window.usuarioLogado };
    if (!(await adicionarNaFila(p))) return;
    
    window.histAbast.diesel.concat(window.histAbast.arla || []).forEach(h => { if(h.id_transacao === editAbastId) { h.litros = nLitros; h.km = nKm; } });
    renderizarHistoricoAbast(); salvarCacheLocal();
    Swal.fire("Sucesso", "Edição salva! Será enviada na próxima sincronização.", "success");
    fecharModalEditAbast();
}

function renderizarEstoquePecas() { let container = document.getElementById('lista-estoque-atual'); let comboMov = document.getElementById('est-item'); let comboCompra = document.getElementById('lista-pecas'); if(!container || !comboMov) return; if (!window.estoquePecas || window.estoquePecas.length === 0) { container.innerHTML = "<p style='text-align:center; color:#666;'>Nenhuma peça cadastrada no estoque.</p>"; return; } let htmlStr = ""; let comboStrMov = ""; let comboStrCompra = ""; window.estoquePecas.forEach((peca, index) => { htmlStr += `<div style="border-bottom: 1px dashed #ccc; padding: 10px 0; margin-bottom: 5px;"><div style="font-weight:bold; color:#1a4d2e; margin-bottom:5px; font-size:14px;">${peca.item}</div><div style="display:flex; justify-content:space-between; gap:5px;"><div style="flex:1;"><span class="info-label" style="font-size:11px; margin:0; display:block;">Qtd Estoque:</span><input type="number" id="est-edit-qtd-${index}" class="input-editavel travado est-edit-input" value="${peca.qtd || 0}" readonly style="width:100%;"></div><div style="flex:1;"><span class="info-label" style="font-size:11px; margin:0; display:block;">Vlr Pago (R$):</span><input type="number" id="est-edit-valor-${index}" class="input-editavel travado est-edit-input" value="${peca.valor || 0}" readonly style="width:100%;"></div></div><div style="margin-top:5px;"><span class="info-label" style="font-size:11px; margin:0; display:block;">Data Últ. Compra:</span><input type="date" id="est-edit-data-${index}" class="input-editavel travado est-edit-input" value="${peca.data_compra || ''}" readonly style="width:100%;"></div></div>`; comboStrMov += `<option value="${index}">${peca.item}</option>`; comboStrCompra += `<option value="${peca.item}"></option>`; }); comboMov.innerHTML = comboStrMov; if(comboCompra) comboCompra.innerHTML = comboStrCompra; container.innerHTML = htmlStr; } function alternarEdicaoEstoque() { let inputs = document.querySelectorAll('.est-edit-input'); let btn = document.getElementById('btn-editar-estoque'); if (!inputs || inputs.length === 0) return; if (inputs[0].hasAttribute('readonly')) { inputs.forEach(x => { x.removeAttribute('readonly'); x.classList.remove('travado'); }); btn.innerHTML = "<i class='ph ph-floppy-disk'></i> Salvar"; btn.style.backgroundColor = "#1a4d2e"; btn.style.color = "white"; } else { inputs.forEach(x => { x.setAttribute('readonly', 'true'); x.classList.add('travado'); }); btn.innerHTML = "<i class='ph ph-pencil-simple'></i> Editar"; btn.style.backgroundColor = "transparent"; btn.style.color = "#1a4d2e"; salvarEdicaoEstoqueNuvem(); } } 
async function salvarEdicaoEstoqueNuvem() { 
    let pecasEditadas = {}; 
    window.estoquePecas.forEach((peca, index) => { let nQtd = document.getElementById(`est-edit-qtd-${index}`).value; let nData = document.getElementById(`est-edit-data-${index}`).value; let nValor = document.getElementById(`est-edit-valor-${index}`).value; peca.qtd = nQtd; peca.data_compra = nData; peca.valor = nValor; pecasEditadas[peca.item] = { qtd: nQtd, data_compra: nData, valor: nValor }; }); 
    let payload = { acao: "editar_estoque", usuario: window.usuarioLogado, pecas: pecasEditadas }; 
    if (!(await adicionarNaFila(payload))) return;
    salvarCacheLocal();
    mostrarToast("<i class='ph ph-floppy-disk'></i> Edições salvas localmente");
} 
function mudarFormEstoque() { let t = document.getElementById('est-tipo').value; document.getElementById('div-est-placa').style.display = t === "SAÍDA" ? "block" : "none"; document.getElementById('div-est-compra').style.display = t === "ENTRADA" ? "block" : "none"; } 

async function salvarMovimentacaoEstoque() { 
    let idItem = document.getElementById('est-item').value; let tipo = document.getElementById('est-tipo').value; let qtd = document.getElementById('est-qtd').value; let placa = document.getElementById('est-placa').value; let valor = document.getElementById('est-valor').value; let link = document.getElementById('est-link').value; let resp = document.getElementById('est-resp') ? document.getElementById('est-resp').value : window.usuarioLogado; 
    if(!qtd) { Swal.fire("Atenção", "Digite a quantidade!", "warning"); return; } 
    let peca = window.estoquePecas[idItem]; let n = new Date(); let hL = new Date(n.getTime() - (n.getTimezoneOffset() * 60000)).toISOString().slice(0,16); 
    let p = { acao: "salvar_estoque", usuario: window.usuarioLogado, data: hL.replace('T', ' '), item: peca.item, tipo: tipo, qtd: qtd, placa: tipo === "SAÍDA" ? placa : "", valor: tipo === "ENTRADA" ? valor : "", link: tipo === "ENTRADA" ? link : "", responsavel: resp }; 
    
    let btn = document.getElementById('btn-salvar-mov-est'); btn.innerHTML = "<i class='ph ph-spinner ph-spin'></i> Salvando..."; btn.disabled = true; 
    
    try {
        if (!(await adicionarNaFila(p))) return;
        
        let q = parseFloat(qtd); 
        if (tipo === "SAÍDA") { peca.qtd = parseFloat(peca.qtd) - q; } 
        if (tipo === "ENTRADA") { peca.qtd = parseFloat(peca.qtd) + q; if(valor) peca.valor = valor; if(q) peca.qtd_compra = q; if(link) peca.link = link; peca.data_compra = p.data.substring(0,10); } 
        
        salvarCacheLocal();
        renderizarEstoquePecas(); 
        document.getElementById('est-qtd').value = ""; document.getElementById('est-placa').value = ""; document.getElementById('est-valor').value = ""; document.getElementById('est-link').value = ""; 
        
        Swal.fire("Sucesso", "Movimentação salva no aplicativo!<br>Será sincronizada na nuvem em breve.", "success"); 
    } catch(err) {
        Swal.fire("Erro", "Ocorreu um erro ao salvar: " + err.message, "error");
    } finally {
        btn.innerHTML = "<i class='ph ph-floppy-disk'></i> Salvar Movimentação"; btn.disabled = false; 
    }
}
      
async function gerarSolicitacaoCompra() { 
    if (!navigator.onLine) { Swal.fire("Sem Internet", "Gerar o PDF de Compra precisa de conexão imediata. Conecte-se e tente novamente.", "error"); return; }

    let nomeItem = document.getElementById('compra-item').value; if(!nomeItem) { Swal.fire("Atenção", "Selecione ou digite o item que deseja comprar!", "warning"); return; } 
    let qtd = document.getElementById('compra-qtd').value; let urgencia = document.getElementById('compra-urgencia').value; if(!qtd) { Swal.fire("Atenção", "Digite a quantidade que precisa comprar!", "warning"); return; } 
    let peca = window.estoquePecas.find(p => p.item === nomeItem) || { item: nomeItem, qtd_compra: "---", valor: "---", link: "---" }; 
    let n = new Date(); let hL = new Date(n.getTime() - (n.getTimezoneOffset() * 60000)).toISOString(); 
    let p = { acao: "solicitar_compra", usuario: window.usuarioLogado, data: hL, item: peca.item, qtd: qtd, urgencia: urgencia, qtd_ref: peca.qtd_compra, valor_ref: peca.valor, link_ref: peca.link }; 
    let btn = document.getElementById('btn-gerar-compra'); btn.innerHTML = "<i class='ph ph-spinner ph-spin'></i> Gerando PDF..."; btn.disabled = true; 
    try { 
        let res = await chamarAPI(p); 
        if (res.sucesso) { 
            Swal.fire("Sucesso", "Pedido de Compra gerado com sucesso!", "success"); window.open(res.link_pdf, '_blank'); 
            document.getElementById('compra-qtd').value = ""; document.getElementById('compra-item').value = ""; 
            btn.innerHTML = "<i class='ph ph-file-pdf'></i> Gerar Pedido de Compra"; btn.disabled = false;
        } else { Swal.fire("Erro", "Erro: " + res.erro, "error"); btn.innerHTML = "<i class='ph ph-file-pdf'></i> Gerar Pedido de Compra"; btn.disabled = false; } 
    } catch (e) { 
        Swal.fire("Atenção", "Instabilidade na rede detetada.<br><br>O PDF da compra pode já ter sido gerado. Aguarde e verifique.", "warning"); 
        setTimeout(() => { btn.innerHTML = "<i class='ph ph-file-pdf'></i> Tentar Novamente"; btn.disabled = false; }, 5000);
    } 
}

function calcularStatusTwi(inE, bId) { let b = document.getElementById(bId); if(!b) return; let v = lerMm(inE.value); if (isNaN(v)) { b.innerText = "Aguardando..."; b.style.backgroundColor = "#eee"; b.style.color = "#666"; return; } if (v >= 10) { b.innerText = "Pneu Novo"; b.style.backgroundColor = "#d4edda"; b.style.color = "#155724"; } else if (v >= 5) { b.innerText = "Meia-Vida"; b.style.backgroundColor = "#fff3cd"; b.style.color = "#856404"; } else { b.innerText = "No Limite"; b.style.backgroundColor = "#f8d7da"; b.style.color = "#721c24"; } } function processarFoto(input, idPreview) { if (!input.files || !input.files[0]) return; const r = new FileReader(); r.onload = function(e) { const img = new Image(); img.src = e.target.result; img.onload = function() { salvarFotoRedimensionada(img, img.width, img.height, idPreview); } }; r.readAsDataURL(input.files[0]); } 
function salvarFotoRedimensionada(fonte, largura, altura, idPreview) { const cv = document.createElement('canvas'); const MW = 800; let w = largura; let h = altura; if (w > MW) { h = Math.round((h * MW) / w); w = MW; } cv.width = w; cv.height = h; const cx = cv.getContext('2d'); cx.drawImage(fonte, 0, 0, w, h); const dU = cv.toDataURL('image/jpeg', 0.6); if(idPreview === 'preview-lat' || idPreview === 'preview-frente') b64Lateral = dU; if(idPreview === 'preview-tras' || idPreview === 'preview-verso') b64Traseira = dU; let pr = document.getElementById(idPreview); pr.src = dU; pr.style.display = 'block'; }

// CÂMERA: abre a câmera dentro do app; se o aparelho não permitir, usa a câmera nativa do celular
let fotoAlvoCamera = ""; let streamCamera = null; let cameraFrontal = false;
async function abrirCamera(idPreview) {
    fotoAlvoCamera = idPreview;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { abrirCameraNativa(); return; }
    try {
        await iniciarStreamCamera();
        document.getElementById('modal-camera').style.display = 'flex';
    } catch (e) {
        console.error("Câmera indisponível:", e);
        Swal.fire({ title: "Câmera indisponível", text: "Não foi possível abrir a câmera no app. Deseja usar a câmera do celular?", icon: "warning", showCancelButton: true, confirmButtonText: "Usar câmera do celular", cancelButtonText: "Cancelar", confirmButtonColor: "#1a4d2e" }).then(r => { if (r.isConfirmed) abrirCameraNativa(); });
    }
}
function abrirCameraNativa() { let i = document.getElementById('foto-camera-fallback'); i.value = ""; i.click(); }
async function iniciarStreamCamera() {
    let novoStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: cameraFrontal ? "user" : { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
    pararStreamCamera(); streamCamera = novoStream;
    let v = document.getElementById('camera-video'); v.srcObject = streamCamera; await v.play().catch(() => {});
}
function pararStreamCamera() { if (streamCamera) { streamCamera.getTracks().forEach(t => t.stop()); streamCamera = null; } document.getElementById('camera-video').srcObject = null; }
function fecharCamera() { pararStreamCamera(); document.getElementById('modal-camera').style.display = 'none'; }
async function trocarCamera() {
    cameraFrontal = !cameraFrontal;
    try { await iniciarStreamCamera(); } catch (e) {
        cameraFrontal = !cameraFrontal; mostrarToast("<i class='ph ph-warning'></i> Não foi possível trocar de câmera", "#dc2626");
        try { await iniciarStreamCamera(); } catch (e2) { fecharCamera(); }
    }
}
function capturarFoto() {
    let v = document.getElementById('camera-video');
    if (!v.videoWidth) { mostrarToast("<i class='ph ph-spinner ph-spin'></i> Aguarde a câmera carregar...", "#d97706"); return; }
    salvarFotoRedimensionada(v, v.videoWidth, v.videoHeight, fotoAlvoCamera);
    fecharCamera();
}

function renderizarHistorico(d) { 
    let c = document.getElementById('container-historico'); 
    c.innerHTML = ""; 
    if (!d || d.length === 0) { 
        c.innerHTML = "<p style='text-align:center; color:#666;'>Nenhum checklist registado ainda.</p>"; 
        return; 
    } 
    let exibidos = new Set();
    d.forEach(i => { 
        let placaLimpa = String(i.placa).trim().toUpperCase();
        let dataAbrev = String(i.data).split('T')[0].split(' ')[0]; 
        let key = placaLimpa + "_" + dataAbrev;
        if(!exibidos.has(key)) {
            exibidos.add(key);
            let v = document.createElement('div'); 
            v.className = "historico-item"; 
            v.innerHTML = `<span style="font-weight: bold; color: #1a4d2e;">${placaLimpa}</span> <span style="color: #555; font-size: 12px;">${dataAbrev} ✅</span>`; 
            c.appendChild(v); 
        }
    }); 
}

function iniciarNovoChecklist() { let pl = document.getElementById('texto-placa-interna').innerText; document.getElementById('lista-historico-checklist').style.display = 'none'; document.querySelectorAll('input[type="checkbox"]').forEach(c => c.checked = false); document.querySelectorAll('input[id$="-outro"]').forEach(c => { c.value = ""; c.style.display = 'none'; }); document.querySelectorAll('input[id^="chk-twi-"], input[id^="chk-carro-twi-"]').forEach(i => i.value = ""); document.querySelectorAll('.twi-estado-badge').forEach(b => { b.innerText = "Aguardando..."; b.style.backgroundColor = "#eee"; b.style.color = "#666"; }); b64Lateral = ""; b64Traseira = ""; ['foto-lat-input', 'foto-tras-input', 'foto-frente-input', 'foto-verso-input'].forEach(id => {let i=document.getElementById(id); if(i) i.value="";}); ['preview-lat', 'preview-tras', 'preview-frente', 'preview-verso'].forEach(id => {let p=document.getElementById(id); if(p) p.style.display="none";}); let mA = new Date().toISOString().slice(0, 7); let ve = window.frota[pl]; if (window.isEmpilhadeira) { document.getElementById('form-novo-checklist').style.display = 'none'; document.getElementById('form-novo-checklist-carro').style.display = 'none'; document.getElementById('form-novo-checklist-empilhadeira').style.display = 'block'; document.getElementById('chk-emp-placa').value = pl; document.getElementById('chk-emp-km').value = document.getElementById('km-master').value; limparPad('ass-mot-emp'); limparPad('ass-ger-emp'); initPad('ass-mot-emp'); initPad('ass-ger-emp'); } else if (window.isCarro) { document.getElementById('form-novo-checklist').style.display = 'none'; document.getElementById('form-novo-checklist-carro').style.display = 'block'; document.getElementById('form-novo-checklist-empilhadeira').style.display = 'none'; let cFc = document.getElementById('container-inputs-fotos-carro'); let aFc = document.getElementById('aviso-fotos-ok-carro'); if(cFc && aFc) { if (ve && ve.mes_foto === mA) { cFc.style.display = 'none'; aFc.style.display = 'block'; } else { cFc.style.display = 'block'; aFc.style.display = 'none'; } } document.getElementById('chk-carro-placa').value = pl; document.getElementById('chk-carro-modelo').value = document.getElementById('tipo-veiculo').value; document.getElementById('chk-carro-motorista').value = document.getElementById('nome-motorista').value; document.getElementById('chk-carro-km').value = document.getElementById('km-master').value; document.getElementById('chk-carro-oleo').value = document.getElementById('km-proxima-troca').value; document.getElementById('chk-carro-extintor-data').value = document.getElementById('data-extintor-ficha').value; limparPad('ass-mot-car'); limparPad('ass-ger-car'); initPad('ass-mot-car'); initPad('ass-ger-car'); } else { document.getElementById('form-novo-checklist').style.display = 'block'; document.getElementById('form-novo-checklist-carro').style.display = 'none'; document.getElementById('form-novo-checklist-empilhadeira').style.display = 'none'; let cF = document.getElementById('container-inputs-fotos'); let aF = document.getElementById('aviso-fotos-ok'); let sF = document.querySelector('#form-novo-checklist .sessao-fotos-checklist'); if (window.isCavalo) { if(sF) sF.style.display = 'none'; } else { if(sF) sF.style.display = 'block'; if(cF && aF) { if (ve && ve.mes_foto === mA) { cF.style.display = 'none'; aF.style.display = 'block'; } else { cF.style.display = 'block'; aF.style.display = 'none'; } } } document.getElementById('chk-placa').value = pl; document.getElementById('chk-modelo').value = document.getElementById('tipo-veiculo').value; document.getElementById('chk-motorista').value = document.getElementById('nome-motorista').value; document.getElementById('chk-km').value = document.getElementById('km-master').value; document.getElementById('chk-km-oleo').value = document.getElementById('km-proxima-troca').value; document.getElementById('chk-km-cambio').value = document.getElementById('km-proxima-cambio').value; document.getElementById('chk-km-diferencial').value = document.getElementById('km-proxima-diferencial').value; document.getElementById('chk-data-taco').value = document.getElementById('data-ultima-afericao').value; document.getElementById('chk-data-graxa').value = document.getElementById('data-engraxada').value; document.getElementById('chk-extintor-data').value = document.getElementById('data-extintor-ficha').value; document.getElementById('chk-qtd-carrinhos').value = document.getElementById('qtd-carrinhos').value; document.getElementById('chk-qtd-cones').value = document.getElementById('qtd-cones').value; document.getElementById('chk-qtd-calcos').value = document.getElementById('qtd-calcos').value; limparPad('ass-mot-cam'); limparPad('ass-ger-cam'); initPad('ass-mot-cam'); initPad('ass-ger-cam'); mudarAbaChecklist(1); } } 
function cancelarChecklist() { escolherModulo('Checklist'); } 
function mudarAbaChecklist(ps) { for(let i=1; i<=4; i++) { let pt = document.getElementById('passo-chk-'+i); if(pt) pt.style.display = 'none'; let tb = document.getElementById('tab-chk-'+i); if(tb) tb.classList.remove('ativo'); } let pA = document.getElementById('passo-chk-'+ps); if(pA) pA.style.display = 'block'; let tA = document.getElementById('tab-chk-'+ps); if(tA) tA.classList.add('ativo'); } 

async function avancarPasso(px) { 
    let pA = px - 1; 
    if (pA === 1) { 
        if(window.isCavalo && !document.getElementById('chk-placa-carreta').value) { Swal.fire("Atenção", "Selecione a Placa da Carreta!", "warning"); return; } 
        if(!document.getElementById('chk-modelo').value || !document.getElementById('chk-motorista').value || !document.getElementById('chk-km').value) { Swal.fire("Atenção", "Preencha os campos obrigatórios!", "warning"); return; } 
        if (!(await confirmarKm(document.getElementById('chk-placa').value, document.getElementById('chk-km').value))) { document.getElementById('chk-km').focus(); return; }
        if(!window.isCavalo) { 
            if(!document.getElementById('chk-qtd-carrinhos').value || !document.getElementById('chk-qtd-cones').value || !document.getElementById('chk-qtd-calcos').value) { Swal.fire("Atenção", "Preencha a Quantidade de Carrinhos, Cones e Calços!", "warning"); return; } 
        } 
    } 
    if (pA === 2) { 
        let gM = ['chk-motor', 'chk-cambio', 'chk-embreagem', 'chk-direcao', 'chk-freios', 'chk-suspensao']; 
        for (let g of gM) { if (document.querySelectorAll(`input[name="${g}"]:checked`).length === 0) { Swal.fire("Atenção", `Faltou preencher as secções de Mecânica!`, "warning"); return; } } 
        if (window.isCavalo) { if (!document.getElementById('chk-asa').value || !document.getElementById('chk-freio-lona').value || !document.getElementById('chk-faixas').value) { Swal.fire("Atenção", "Responda as perguntas da Carreta!", "warning"); return; } } 
    } 
    if (pA === 3) { 
        let gE = ['chk-pneus_geral', 'chk-eletrica', 'chk-indicadores', 'chk-cabine']; 
        for (let g of gE) { if (document.querySelectorAll(`input[name="${g}"]:checked`).length === 0) { Swal.fire("Atenção", `Faltou preencher as secções de Cabine/Elétrica!`, "warning"); return; } } 
    } 
    mudarAbaChecklist(px); 
} 

function verificarOutro(ck, idC) { let cp = document.getElementById(idC); if (ck.value === "OUTRO" && ck.checked) { cp.style.display = 'block'; cp.focus(); } else if (ck.value === "OUTRO" && !ck.checked) { cp.style.display = 'none'; cp.value = ''; } } 
function verificarOutroSelect(sl, idC) { let cp = document.getElementById(idC); if(sl.value === "OUTRO") { cp.style.display = 'block'; cp.focus(); } else { cp.style.display = 'none'; cp.value = ''; } } 
function verificarTudoOk(ck, nG) { if (ck.checked && ck.value.includes("TODOS OS ITENS ESTÃO NO CARRO")) { document.querySelectorAll(`input[name="${nG}"]`).forEach(c => { if (c !== ck) c.checked = false; }); let tO = document.getElementById("chk-carro-outro"); if(tO) { tO.style.display = 'none'; tO.value = ''; } } else if (ck.checked && ck.value.includes("NÃO APRESENTA")) { document.querySelectorAll(`input[name="${nG}"]`).forEach(c => { if (c !== ck) c.checked = false; }); let tO = document.getElementById(nG + "-outro"); if(tO) { tO.style.display = 'none'; tO.value = ''; } } else if (ck.checked) { document.querySelectorAll(`input[name="${nG}"]`).forEach(c => { if (c.value.includes("NÃO APRESENTA") || c.value.includes("TODOS OS ITENS ESTÃO NO CARRO")) c.checked = false; }); } } 
function pegarMarcados(nG, idO) { let s = []; document.querySelectorAll(`input[name="${nG}"]:checked`).forEach(c => { if(c.value !== "OUTRO") s.push(c.value); }); let tO = document.getElementById(idO); if (tO && tO.value.trim() !== "") s.push("OUTROS: " + tO.value.trim()); return s.length > 0 ? s.join(" | ") : "Não avaliado"; } 
function getSelOuOutro(idO) { let i = document.getElementById(idO); if(!i) return ""; let s = i.previousElementSibling; return s.value === "OUTRO" ? (i.value || "Outro não esp.") : s.value; }

async function enviarChecklistCarro() { 
    if (document.querySelectorAll(`input[name="chk-carro-itens"]:checked`).length === 0) { Swal.fire("Atenção", "Informe a situação dos itens do veículo!", "warning"); return; } 
    if (!document.getElementById('chk-carro-extintor-data').value) { Swal.fire("Atenção", "Informe a Data de Validade do Extintor!", "warning"); return; } 
    for (let id of ['dd', 'de', 'td', 'te']) { if (!document.getElementById('chk-carro-twi-' + id).value) { Swal.fire("Atenção", `Preencha o TWI do Pneu ${id.toUpperCase()}!`, "warning"); return; } } 
    if (document.getElementById('container-inputs-fotos-carro').style.display !== 'none') { if (!b64Lateral || !b64Traseira) { Swal.fire("Atenção", "É obrigatório enviar a Foto Frente e Verso do veículo!", "warning"); return; } } 
    if (!(await confirmarKm(document.getElementById('chk-carro-placa').value, document.getElementById('chk-carro-km').value))) return;
    let assMot = getPadB64('ass-mot-car'); let assGer = getPadB64('ass-ger-car'); 
    if(!assMot || !assGer) { Swal.fire("Atenção", "É obrigatório recolher a assinatura do Motorista e do Gerente!", "warning"); return; } 
    
    let btn = document.getElementById('btn-enviar-chk-carro'); btn.innerHTML = "<i class='ph ph-spinner ph-spin'></i> Preparando..."; btn.disabled = true; 
    
    let dE = document.getElementById('chk-carro-extintor-data').value; let pE = document.getElementById('chk-carro-extintor-pressao').value; let pl = { acao: "salvar_checklist", usuario: window.usuarioLogado, placa: document.getElementById('chk-carro-placa').value, categoria: "CARRO", placa_carreta: "", modelo: document.getElementById('chk-carro-modelo').value, motorista: document.getElementById('chk-carro-motorista').value, km_atual: document.getElementById('chk-carro-km').value, km_oleo: document.getElementById('chk-carro-oleo').value, data_tacografo: "", data_graxa: "", data_extintor: dE, chk_motor: "N/A", chk_cambio: "N/A", chk_embreagem: "N/A", chk_direcao: "N/A", chk_freios: "N/A", chk_suspensao: "N/A", chk_pneus_geral: "N/A", chk_eletrica: "N/A", chk_indicadores: "N/A", chk_cabine: "N/A", chk_faltantes: pegarMarcados('chk-carro-itens', 'chk-carro-outro'), chk_asa_delta: "", chk_freio_lona: "", chk_faixas: "", chk_extintores: `Val: ${dE} - ${pE}`, chk_parada: document.getElementById('chk-carro-parada').value, chk_obs: document.getElementById('chk-carro-obs').value, foto_lateral_b64: b64Lateral, foto_traseira_b64: b64Traseira, assinatura_motorista_b64: assMot, assinatura_gerente_b64: assGer, qtd_carrinhos: "", qtd_cones: "", qtd_calcos: "", pneus: {} }; ['dd','de','td','te'].forEach(id => { let eT = document.getElementById('chk-carro-twi-' + id); if(eT && eT.value) pl.pneus[id] = { milimetros: lerMm(eT.value), estado: document.getElementById('badge-carro-estado-' + id).innerText }; }); 
    
    if (!(await adicionarNaFila(pl))) { btn.innerHTML = "<i class='ph ph-floppy-disk'></i> Enviar Inspeção e PDF"; btn.disabled = false; return; } // NÃO salvou: mantém o formulário preenchido
    window.frota[pl.placa].km_atual = pl.km_atual; window.frota[pl.placa].km_oleo = pl.km_oleo; window.frota[pl.placa].data_extintor = pl.data_extintor; 
    for(let i in pl.pneus) { if(!window.frota[pl.placa].pneus[i]) window.frota[pl.placa].pneus[i] = {}; window.frota[pl.placa].pneus[i].milimetros = pl.pneus[i].milimetros; window.frota[pl.placa].pneus[i].estado = pl.pneus[i].estado; } 
    let hS = new Date().toISOString(); window.historicoChecklist.unshift({data: hS, placa: pl.placa}); registrarUltimoChecklistLocal(pl); 
    salvarCacheLocal();

    Swal.fire("Blindado!", "Inspeção finalizada e armazenada no telemóvel!<br><br>O PDF será gerado na nuvem na próxima sincronização em 2º plano.", "success"); 
    voltarParaPlacas();
    btn.innerHTML = "<i class='ph ph-floppy-disk'></i> Enviar Inspeção e PDF"; btn.disabled = false; 
}

async function enviarChecklist() { 
    let dE = document.getElementById('chk-extintor-data').value; 
    let pE = document.getElementById('chk-extintor-pressao').value; 
    let assMot = getPadB64('ass-mot-cam'); 
    let assGer = getPadB64('ass-ger-cam'); 
    
    if(!assMot || !assGer) { Swal.fire("Atenção", "Assinaturas obrigatórias!", "warning"); return; } 
    
    let catStr = window.isCavalo ? "CAVALO" : "CAMINHAO"; 
    let pl = { 
        acao: "salvar_checklist", usuario: window.usuarioLogado, placa: document.getElementById('chk-placa').value, 
        categoria: catStr, placa_carreta: window.isCavalo ? document.getElementById('chk-placa-carreta').value : "", 
        modelo: document.getElementById('chk-modelo').value, motorista: document.getElementById('chk-motorista').value, 
        km_atual: document.getElementById('chk-km').value, km_oleo: document.getElementById('chk-km-oleo').value, 
        km_cambio: document.getElementById('chk-km-cambio').value, km_diferencial: document.getElementById('chk-km-diferencial').value, 
        data_tacografo: document.getElementById('chk-data-taco').value, data_graxa: document.getElementById('chk-data-graxa').value, 
        data_extintor: dE, chk_motor: pegarMarcados('chk-motor', 'chk-motor-outro'), chk_cambio: pegarMarcados('chk-cambio', 'chk-cambio-outro'), 
        chk_embreagem: pegarMarcados('chk-embreagem', 'chk-emb-outro'), chk_direcao: pegarMarcados('chk-direcao', 'chk-dir-outro'), 
        chk_freios: pegarMarcados('chk-freios', 'chk-freio-outro'), chk_suspensao: pegarMarcados('chk-suspensao', 'chk-susp-outro'), 
        chk_pneus_geral: pegarMarcados('chk-pneus_geral', 'chk-pneu-outro'), chk_eletrica: pegarMarcados('chk-eletrica', 'chk-elet-outro'), 
        chk_indicadores: pegarMarcados('chk-indicadores', 'chk-ind-outro'), chk_cabine: pegarMarcados('chk-cabine', 'chk-cab-outro'), 
        chk_faltantes: pegarMarcados('chk-faltantes', 'chk-falta-outro'), 
        chk_asa_delta: window.isCavalo ? getSelOuOutro('chk-asa-outro') : "", 
        chk_freio_lona: window.isCavalo ? getSelOuOutro('chk-freio-lona-outro') : "", 
        chk_faixas: window.isCavalo ? getSelOuOutro('chk-faixas-outro') : "", 
        chk_extintores: `Val: ${dE} - ${pE}`, chk_parada: document.getElementById('chk-parada').value, 
        chk_obs: document.getElementById('chk-obs').value, foto_lateral_b64: b64Lateral, foto_traseira_b64: b64Traseira, 
        assinatura_motorista_b64: assMot, assinatura_gerente_b64: assGer, 
        qtd_carrinhos: window.isCavalo ? "0" : document.getElementById('chk-qtd-carrinhos').value, 
        qtd_cones: window.isCavalo ? "0" : document.getElementById('chk-qtd-cones').value, 
        qtd_calcos: window.isCavalo ? "0" : document.getElementById('chk-qtd-calcos').value, 
        pneus: {} 
    }; 
    
    let tIds = window.isToco ? ['dd','de','tde','tdi','tee','tei','1step'] : ['dd','de','tde','tdi','tee','tei','tkde','tkdi','tkee','tkei','1step']; 
    if(window.isCavalo) tIds = tIds.concat(['c1','c2','c3','c4','c5','c6','c7','c8','c9','c10','c11','c12','2step']); 
    
    tIds.forEach(id => { 
        let eT = document.getElementById('chk-twi-' + id); 
        if(eT && eT.value) { 
            pl.pneus[id] = { milimetros: lerMm(eT.value), estado: document.getElementById('badge-estado-' + id).innerText }; 
        } 
    }); 
    
    let btn = document.getElementById('btn-enviar-chk'); 
    btn.innerHTML = "<i class='ph ph-spinner ph-spin'></i> Preparando..."; 
    btn.disabled = true; 

    if (!(await adicionarNaFila(pl))) { btn.innerHTML = "<i class='ph ph-floppy-disk'></i> Enviar Checklist e PDF"; btn.disabled = false; return; } // NÃO salvou: mantém o formulário preenchido
    atualizarFrotaLocal(pl.placa, { km_atual: pl.km_atual, km_oleo: pl.km_oleo, km_cambio: pl.km_cambio, km_diferencial: pl.km_diferencial, data_tacografo: pl.data_tacografo, data_graxa: pl.data_graxa, data_extintor: pl.data_extintor });
    window.historicoChecklist.unshift({data: new Date().toISOString(), placa: pl.placa}); registrarUltimoChecklistLocal(pl);
    salvarCacheLocal();

    Swal.fire("Blindado!", "O checklist foi guardado com segurança no aparelho. O envio será feito automaticamente em plano de fundo.", "success"); 
    voltarParaPlacas();
    
    btn.innerHTML = "<i class='ph ph-floppy-disk'></i> Enviar Checklist e Gerar PDF"; 
    btn.disabled = false;
}

async function enviarChecklistEmpilhadeira() { 
    let obs = document.getElementById('chk-emp-obs').value; let checks = pegarMarcados('chk-emp-itens', 'chk-emp-outro'); let assMot = getPadB64('ass-mot-emp'); let assGer = getPadB64('ass-ger-emp'); 
    if(!assMot || !assGer) { Swal.fire("Atenção", "Assinaturas obrigatórias!", "warning"); return; } 
    if (!document.getElementById('chk-emp-km').value) { Swal.fire("Atenção", "Informe o Horímetro!", "warning"); return; }
    if (!(await confirmarKm(document.getElementById('chk-emp-placa').value, document.getElementById('chk-emp-km').value))) return;
    let pl = { acao: "salvar_checklist", usuario: window.usuarioLogado, placa: document.getElementById('chk-emp-placa').value, categoria: "EMPILHADEIRA", modelo: "EMPILHADEIRA", motorista: document.getElementById('chk-emp-motorista').value, chk_faltantes: checks, chk_obs: obs, assinatura_motorista_b64: assMot, assinatura_gerente_b64: assGer, km_atual: document.getElementById('chk-emp-km').value, km_oleo: "", data_tacografo: "", data_graxa: "", data_extintor: "", chk_motor: "N/A", chk_cambio: "N/A", chk_embreagem: "N/A", chk_direcao: "N/A", chk_freios: "N/A", chk_suspensao: "N/A", chk_pneus_geral: "N/A", chk_eletrica: "N/A", chk_indicadores: "N/A", chk_cabine: "N/A", chk_asa_delta: "", chk_freio_lona: "", chk_faixas: "", chk_extintores: "", chk_parada: "N/A", foto_lateral_b64: "", foto_traseira_b64: "", qtd_carrinhos: "", qtd_cones: "", qtd_calcos: "", pneus: {} }; 
    let btn = document.getElementById('btn-enviar-chk-emp'); btn.innerHTML = "<i class='ph ph-spinner ph-spin'></i> Preparando..."; btn.disabled = true; 
    
    if (!(await adicionarNaFila(pl))) { btn.innerHTML = "<i class='ph ph-floppy-disk'></i> Enviar Inspeção e PDF"; btn.disabled = false; return; }
    atualizarFrotaLocal(pl.placa, { km_atual: pl.km_atual });
    window.historicoChecklist.unshift({data: new Date().toISOString(), placa: pl.placa}); registrarUltimoChecklistLocal(pl);
    salvarCacheLocal();

    Swal.fire("Blindado!", "Inspeção salva localmente!<br>Será sincronizada em 2º plano automaticamente.", "success"); 
    voltarParaPlacas();
    btn.innerHTML = "<i class='ph ph-floppy-disk'></i> Enviar Inspeção e PDF"; btn.disabled = false;
}

/* =========================================================
   PLACAS (desenhadas em CSS no padrão Mercosul) + CADASTRO DE "OUTROS"
   ========================================================= */
const CATEGORIAS_VEICULO = {
    TOCO:         { lista: TOCOS,         nome: 'Caminhão Toco', secao: 'caminhoes' },
    CAMINHAO:     { lista: TRUCKS,        nome: 'Caminhão Truck', secao: 'caminhoes' },
    CAVALO:       { lista: CAVALOS,       nome: 'Cavalo',        secao: 'cavalos' },
    CARRO:        { lista: CARROS,        nome: 'Utilitário',    secao: 'utilitarios' },
    EMPILHADEIRA: { lista: EMPILHADEIRAS, nome: 'Empilhadeira',  secao: 'empilhadeiras' }
};

function escHtml(t) { return String(t == null ? "" : t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

// A aba Veiculos (coluna P "categoria") manda: TOCO, CAMINHAO, CAVALO, CARRO, EMPILHADEIRA, CARRETA ou INATIVO.
// Placa sem categoria na planilha usa a lista padrão abaixo (a mesma de antes).
const LISTAS_PADRAO = { TOCO: [...TOCOS], CAMINHAO: [...TRUCKS], CAVALO: [...CAVALOS], CARRO: [...CARROS], EMPILHADEIRA: [...EMPILHADEIRAS], CARRETA: ['RFR5F62', 'RFY6I51', 'RFL1F19'] };
window.CARRETAS = [...LISTAS_PADRAO.CARRETA];
function registrarCategoriasExtras() {
    let mapa = {};
    for (let cat in LISTAS_PADRAO) LISTAS_PADRAO[cat].forEach(p => mapa[p] = cat);
    for (let placa in (window.frota || {})) {
        let cat = String(window.frota[placa].categoria || "").trim().toUpperCase();
        if (cat) mapa[placa] = cat;
    }
    Object.values(CATEGORIAS_VEICULO).forEach(c => c.lista.length = 0);
    window.CARRETAS = [];
    Object.keys(mapa).sort().forEach(p => {
        let cat = mapa[p];
        if (CATEGORIAS_VEICULO[cat] && !window.placasSemImagem.has(p)) CATEGORIAS_VEICULO[cat].lista.push(p);
        else if (cat === 'CARRETA') window.CARRETAS.push(p);
        // INATIVO (ou outro valor): some do app
    });
    let sel = document.getElementById('chk-placa-carreta');
    if (sel && window.CARRETAS.length) { let atual = sel.value; sel.innerHTML = '<option value="">Selecione a Carreta...</option>' + window.CARRETAS.map(c => `<option value="${escHtml(c)}">${escHtml(c)}</option>`).join(''); sel.value = atual; }
}

// Numero da imagem original de cada placa (nome do arquivo baixado do postimg: 2.png, 3.png...)
const IMG_PLACA_NUM = { 'AXZ1D53': 2, 'FCT1J98': 3, 'FEE9E40': 4, 'FIF9A30': 5, 'FMQ8H77': 6, 'FMR4I10': 7, 'FPJ1B16': 8, 'FQY6B30': 9, 'FUH9H91': 10,
    'IVE8J03': 11, 'NTP4G17': 12, 'TKR8I49': 13, 'TLL8H30': 14, 'TLY0G57': 15, 'UDN0J81': 16, 'UPS1J80': 17, 'UPX9D25': 18, 'URT4E79': 19, 'URU3F36': 20,
    'FEF7C02': 21, 'GHE3E06': 22, 'FYY7G32': 23, 'CLW4E92': 24, 'UGF2G86': 25, 'FGX2A32': 26, '05025DR3290': 29, '05025DR8824': 30 };
// Usa a IMAGEM da placa da pasta img do GitHub: primeiro img/placas/PLACA.png, depois img/PLACA.png, depois img/<numero>.png.
// Se nenhuma existir, fica o desenho da placa em CSS (placa nova cadastrada na planilha sem imagem ainda).
function htmlPlaca(placa) {
    let p = escHtml(placa);
    let padrao = Object.values(LISTAS_PADRAO).some(l => l.includes(placa));
    let tentativas = ['img/placas/' + p + '.png', 'img/' + p + '.png'];
    if (IMG_PLACA_NUM[placa]) tentativas.push('img/' + IMG_PLACA_NUM[placa] + '.png');
    // Placa que NAO e da frota original so aparece se tiver a imagem na pasta img (segue as imagens, nao cria placa sozinho)
    return `<div class="placa-wrap${padrao ? '' : ' placa-extra'}" data-placa="${p}"><button type="button" class="placa-mercosul${placa.length > 7 ? ' placa-longa' : ''}" onclick="selecionarPlaca('${p}')" aria-label="Placa ${p}"><img class="placa-foto" alt="" src="${tentativas[0]}" data-tentativas="${tentativas.slice(1).join('|')}" onload="this.parentNode.classList.add('com-imagem'); this.closest('.placa-wrap').classList.remove('placa-extra')" onerror="proximaImgPlaca(this)"><span class="placa-faixa"><span class="placa-pais">BRASIL</span><span class="placa-bandeira"></span></span><span class="placa-corpo"><span class="placa-br">BR</span><span class="placa-num">${p}</span></span></button><div class="placa-check" id="check-${p}"><i class="ph-fill ph-check-circle" style="color:#10b981;"></i></div></div>`;
}
window.placasSemImagem = new Set();
// Placa extra (veio da planilha) sem imagem: sai da tela, dos alertas e do painel
function esconderPlacaSemImagem(placa) {
    if (window.placasSemImagem.has(placa)) return;
    window.placasSemImagem.add(placa);
    Object.values(CATEGORIAS_VEICULO).forEach(c => { let i = c.lista.indexOf(placa); if (i >= 0) c.lista.splice(i, 1); });
    clearTimeout(window._timerAlertas); window._timerAlertas = setTimeout(() => { renderizarAlertas(); }, 300);
}
function proximaImgPlaca(img) {
    let resto = (img.dataset.tentativas || '').split('|').filter(Boolean);
    if (!resto.length) {
        let wrap = img.closest('.placa-wrap');
        if (wrap && wrap.classList.contains('placa-extra')) { esconderPlacaSemImagem(wrap.dataset.placa); wrap.remove(); return; }
        img.remove(); return;   // placa da frota original sem imagem: fica o desenho em CSS
    }
    img.dataset.tentativas = resto.slice(1).join('|');
    img.src = resto[0];
}

function renderizarPlacas() {
    let alvo = document.getElementById('secoes-placas');
    if (!alvo) return;
    let ordenar = arr => [...new Set(arr)].sort();
    let secoes = [
        { titulo: 'Caminhões',     icone: 'ph-truck',         placas: ordenar(TOCOS.concat(TRUCKS)) },
        { titulo: 'Cavalos',       icone: 'ph-truck-trailer', placas: ordenar(CAVALOS) },
        { titulo: 'Utilitários',   icone: 'ph-car',           placas: ordenar(CARROS) },
        { titulo: 'Empilhadeiras', icone: 'ph-stack',         placas: ordenar(EMPILHADEIRAS) }
    ];
    // guarda quais checks (checklist da semana) estavam visíveis para não piscar ao redesenhar
    let visiveis = new Set([...document.querySelectorAll('.placa-check')].filter(e => e.style.display === 'flex').map(e => e.id));
    alvo.innerHTML = secoes.filter(s => s.placas.length).map((s, i) =>
        `<h3 class="card-titulo titulo-secao-placa"${i === 0 ? ' style="margin-top:10px !important;"' : ''}><i class="ph ${s.icone}"></i> ${s.titulo}</h3><div class="grid-placas">${s.placas.map(htmlPlaca).join('')}</div>`
    ).join('');
    visiveis.forEach(id => { let el = document.getElementById(id); if (el) el.style.display = 'flex'; });
}

async function cadastrarVeiculoOutros() { // abastecimento de veiculo de fora da frota
    if (typeof Swal === 'undefined') { alert("Erro ao carregar bibliotecas."); return null; }
    const { value: pC } = await Swal.fire({ title: 'Outro Veículo', input: 'text', inputLabel: 'Placa do veículo (abastecimento avulso, não entra na frota):', inputPlaceholder: 'Ex: ABC1D23', inputAttributes: { autocapitalize: 'characters', maxlength: 12 }, showCancelButton: true, confirmButtonColor: '#1a4d2e', confirmButtonText: 'Continuar', cancelButtonText: 'Cancelar',
        inputValidator: v => { let l = String(v || "").toUpperCase().replace(/[^A-Z0-9]/g, ''); if (l.length < 5) return 'Digite uma placa válida!'; } });
    if (!pC) return null;
    let placa = pC.toUpperCase().replace(/[^A-Z0-9]/g, '');
    let todasPlacas = Object.values(CATEGORIAS_VEICULO).flatMap(c => c.lista);

    // Placa já existe: só abre o veículo
    if (todasPlacas.includes(placa) && window.frota[placa]) return placa;

    // Parecida com uma placa que já existe (O no lugar de 0, I no lugar de 1...)? Abre a existente.
    let parecida = todasPlacas.find(p => normalizarPlaca(p) === normalizarPlaca(placa));
    if (parecida) {
        let r = await Swal.fire({ icon: 'question', title: 'Placa parecida', html: `Você digitou <b>${escHtml(placa)}</b>.<br>Já existe a placa <b>${escHtml(parecida)}</b>.<br><br>É esse veículo?`,
            showCancelButton: true, confirmButtonText: `Sim, abrir ${escHtml(parecida)}`, cancelButtonText: 'Não, é outro', confirmButtonColor: '#1a4d2e' });
        if (r.isConfirmed) return parecida;
    }

    // Formato de placa brasileira: ABC1234 (antiga) ou ABC1D23 (Mercosul)
    let corrigida = corrigirFormatoPlaca(placa);
    if (corrigida && corrigida !== placa) {
        let r = await Swal.fire({ icon: 'warning', title: 'Confira a placa', html: `<b>${escHtml(placa)}</b> não está no formato de placa.<br>Você quis dizer <b>${escHtml(corrigida)}</b>?<br><br><small>Letra O e número 0, letra I e número 1 são fáceis de confundir.</small>`,
            showCancelButton: true, showDenyButton: true, confirmButtonText: `Usar ${escHtml(corrigida)}`, denyButtonText: `Manter ${escHtml(placa)}`, cancelButtonText: 'Cancelar', confirmButtonColor: '#1a4d2e' });
        if (r.isDismissed) return null;
        if (r.isConfirmed) {
            placa = corrigida;
            if (todasPlacas.includes(placa) && window.frota[placa]) return placa;
        }
    }

    // Veiculo AVULSO: serve so para este abastecimento. NAO e salvo como placa da frota,
    // nao aparece na tela de placas nem no checklist (a frota oficial e a da planilha/imagens).
    if (!window.frota[placa]) window.frota[placa] = { placa: placa, km_atual: 0, gasto_mes: 0, pneus: {}, tipo: 'Veículo avulso', avulso: true, abast_atual: { km_atual: 0, litros: 0, km_ant: 0 } };
    window.frota[placa].avulso = true;
    mostrarToast(`<i class='ph ph-info'></i> ${placa}: abastecimento avulso (não entra na frota)`, "#1e40af");
    return placa;
}

function atualizarFrotaLocal(placa, campos) {
    let v = window.frota[placa]; if (!v) return;
    for (let k in campos) { if (campos[k] !== undefined && campos[k] !== null && String(campos[k]).trim() !== "") v[k] = campos[k]; }
}

/* =========================================================
   PAINEL DE ALERTAS (SEMÁFORO): ÓLEO, TACÓGRAFO, EXTINTOR, GRAXA
   Vermelho = vencido | Amarelo = prestes a vencer | Verde = em dia | Cinza = sem registro
   ========================================================= */
const LIMITE_OLEO_KM = 1500;     // amarelo quando faltar até 1.500 km
const LIMITE_TACOGRAFO_DIAS = 30; // amarelo quando faltar até 30 dias (validade da aferição = 2 anos)
const LIMITE_EXTINTOR_DIAS = 30;  // amarelo quando faltar até 30 dias
const INTERVALO_GRAXA_DIAS = 30;  // próxima graxa = última + 30 dias
const LIMITE_GRAXA_DIAS = 5;      // amarelo quando faltar até 5 dias

const ehPesado = p => !CARROS.includes(p) && !EMPILHADEIRAS.includes(p);
const ALERTAS = {
    oleo:      { nome: 'Óleos',         icone: 'ph-drop',             aplica: p => !EMPILHADEIRAS.includes(p) }, // motor + câmbio + diferencial
    tacografo: { nome: 'Tacógrafo',     icone: 'ph-timer',            aplica: ehPesado },
    extintor:  { nome: 'Extintor',      icone: 'ph-fire-extinguisher', aplica: p => !EMPILHADEIRAS.includes(p) },
    graxa:     { nome: 'Graxa',         icone: 'ph-wrench',           aplica: ehPesado }
};
let alertaAberto = null; let filtroAlertaAtual = 'atencao';
// Os 3 óleos ficam juntos no mesmo semáforo "Óleos"
const LIMITE_CAMBIO_DIF_KM = 3000; // câmbio e diferencial: amarelo quando faltar até 3.000 km
const INTERVALO_CAMBIO_DIF_KM = 50000; // trocam a cada 50.000 km
const OLEOS = {
    motor:       { nome: 'Motor',       campo: 'km_oleo',        limite: () => LIMITE_OLEO_KM,       intervalo: 0,                      aplica: p => !EMPILHADEIRAS.includes(p) },
    cambio:      { nome: 'Câmbio',      campo: 'km_cambio',      limite: () => LIMITE_CAMBIO_DIF_KM, intervalo: INTERVALO_CAMBIO_DIF_KM, aplica: p => ehPesado(p) },
    diferencial: { nome: 'Diferencial', campo: 'km_diferencial', limite: () => LIMITE_CAMBIO_DIF_KM, intervalo: INTERVALO_CAMBIO_DIF_KM, aplica: p => ehPesado(p) }
};

function numKm(v) { let n = parseFloat(String(v == null ? "" : v).replace(/[^\d.,-]/g, '').replace(',', '.')); return isNaN(n) ? 0 : n; }
function fmtKm(n) { return Math.round(n).toLocaleString('pt-BR'); }
function lerDataISO(s) { if (!s || !/^\d{4}-\d{2}-\d{2}/.test(String(s))) return null; let p = String(s).substring(0, 10).split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
function fmtData(d) { return d ? `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}` : '--/--/----'; }
function isoData(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
function diasAte(d) { let h = new Date(); h.setHours(0, 0, 0, 0); return Math.round((d.getTime() - h.getTime()) / 86400000); }
function txtDias(n) { return n === 1 ? '1 dia' : n + ' dias'; }

function statusPorPrazo(dataVenc, limite, rotulo) {
    let d = diasAte(dataVenc);
    if (d < 0) return { nivel: 'vencido', ordem: d, texto: `Vencido há ${txtDias(-d)}`, detalhe: `${rotulo} ${fmtData(dataVenc)}` };
    if (d <= limite) return { nivel: 'alerta', ordem: d, texto: d === 0 ? 'Vence hoje' : `Vence em ${txtDias(d)}`, detalhe: `${rotulo} ${fmtData(dataVenc)}` };
    return { nivel: 'ok', ordem: d, texto: `Em dia · ${txtDias(d)}`, detalhe: `${rotulo} ${fmtData(dataVenc)}` };
}

function calcularStatusAlerta(tipo, placa, sub) {
    let v = window.frota[placa] || {};
    if (tipo === 'oleo') {
        let o = OLEOS[sub || 'motor'];
        let prox = numKm(v[o.campo]), atual = numKm(v.km_atual);
        if (!prox) return { nivel: 'sem', ordem: 0, texto: 'Sem KM da próxima troca', detalhe: atual ? `KM atual ${fmtKm(atual)}` : '' };
        let f = prox - atual, det = `KM atual ${fmtKm(atual)} · Troca em ${fmtKm(prox)}`;
        if (f <= 0) return { nivel: 'vencido', ordem: f, texto: `Vencido há ${fmtKm(-f)} km`, detalhe: det };
        if (f <= o.limite()) return { nivel: 'alerta', ordem: f, texto: `Faltam ${fmtKm(f)} km`, detalhe: det };
        return { nivel: 'ok', ordem: f, texto: `Em dia · faltam ${fmtKm(f)} km`, detalhe: det };
    }
    if (tipo === 'tacografo') {
        let u = lerDataISO(v.data_tacografo); if (!u) return { nivel: 'sem', ordem: 0, texto: 'Sem data da última aferição', detalhe: '' };
        let px = new Date(u); px.setFullYear(px.getFullYear() + 2);
        return statusPorPrazo(px, LIMITE_TACOGRAFO_DIAS, `Aferido ${fmtData(u)} · Próxima`);
    }
    if (tipo === 'extintor') {
        let d = lerDataISO(v.data_extintor); if (!d) return { nivel: 'sem', ordem: 0, texto: 'Sem data de validade', detalhe: '' };
        return statusPorPrazo(d, LIMITE_EXTINTOR_DIAS, 'Validade');
    }
    if (tipo === 'graxa') {
        let u = lerDataISO(v.data_graxa); if (!u) return { nivel: 'sem', ordem: 0, texto: 'Sem data da última graxa', detalhe: '' };
        let px = new Date(u); px.setDate(px.getDate() + INTERVALO_GRAXA_DIAS);
        return statusPorPrazo(px, LIMITE_GRAXA_DIAS, `Última ${fmtData(u)} · Próxima`);
    }
}

function placasDaFrota() {
    let todas = [...new Set(TOCOS.concat(TRUCKS, CAVALOS, CARROS, EMPILHADEIRAS))];
    return todas.filter(p => window.frota && window.frota[p]);
}

function itensDoAlerta(tipo) {
    const peso = { vencido: 0, alerta: 1, ok: 2, sem: 3 };
    let lista = tipo === 'oleo'
        ? placasDaFrota().flatMap(p => Object.keys(OLEOS).filter(k => OLEOS[k].aplica(p)).map(k => Object.assign({ placa: p, sub: k }, calcularStatusAlerta('oleo', p, k))))
        : placasDaFrota().filter(p => ALERTAS[tipo].aplica(p)).map(p => Object.assign({ placa: p }, calcularStatusAlerta(tipo, p)));
    return lista
        .sort((a, b) => (peso[a.nivel] - peso[b.nivel]) || (a.ordem - b.ordem) || a.placa.localeCompare(b.placa));
}

function renderizarAlertas() {
    let grid = document.getElementById('grid-alertas'); if (!grid) return;
    let totV = 0, totA = 0;
    if (!placasDaFrota().length) { grid.innerHTML = `<p class="lista-alertas-vazia" style="grid-column:1/-1;">Sincronize para carregar os alertas.</p>`; document.getElementById('alertas-resumo').textContent = ''; return; }
    grid.innerHTML = Object.keys(ALERTAS).map(tipo => {
        let a = ALERTAS[tipo], it = itensDoAlerta(tipo);
        let c = { vencido: 0, alerta: 0, ok: 0, sem: 0 }; it.forEach(i => c[i.nivel]++);
        totV += c.vencido; totA += c.alerta;
        let nivel = c.vencido ? 'vencido' : (c.alerta ? 'alerta' : (c.ok ? 'ok' : 'sem'));
        let status = c.vencido ? `${c.vencido} vencido${c.vencido > 1 ? 's' : ''}` : (c.alerta ? `${c.alerta} a vencer` : (c.ok ? 'Tudo em dia' : 'Sem registros'));
        return `<button type="button" class="card-alerta nivel-${nivel}" onclick="abrirModalAlertas('${tipo}')">
            <div class="card-alerta-topo"><span class="card-alerta-icone"><i class="ph ${a.icone}"></i></span><div><div class="card-alerta-nome">${a.nome}</div><div class="card-alerta-status">${status}</div></div></div>
            <div class="semaforo" aria-label="Vencidos ${c.vencido}, a vencer ${c.alerta}, em dia ${c.ok}">
                <div class="semaforo-luz verm${c.vencido ? ' acesa' : ''}"><span></span><b>${c.vencido}</b></div>
                <div class="semaforo-luz amar${c.alerta ? ' acesa' : ''}"><span></span><b>${c.alerta}</b></div>
                <div class="semaforo-luz verde${c.ok ? ' acesa' : ''}"><span></span><b>${c.ok}</b></div>
            </div>
            ${c.sem ? `<div class="card-alerta-sem">${c.sem} sem registro</div>` : ''}
        </button>`;
    }).join('');
    let r = document.getElementById('alertas-resumo');
    if (r) r.innerHTML = (totV || totA) ? `<span style="color:var(--sem-verm)">${totV} vencido${totV !== 1 ? 's' : ''}</span> · <span style="color:#b45309">${totA} a vencer</span>` : '<span style="color:var(--sem-verde)">Tudo em dia</span>';
}

function abrirModalAlertas(tipo) {
    alertaAberto = tipo;
    let it = itensDoAlerta(tipo);
    filtroAlertaAtual = it.some(i => i.nivel === 'vencido' || i.nivel === 'alerta') ? 'atencao' : 'todos';
    document.getElementById('modal-alertas-titulo').innerHTML = `<i class="ph ${ALERTAS[tipo].icone}"></i> ${ALERTAS[tipo].nome}`;
    renderizarListaAlertas();
    document.getElementById('modal-alertas').style.display = 'flex';
}
function fecharModalAlertas() { document.getElementById('modal-alertas').style.display = 'none'; alertaAberto = null; }
function filtrarAlertas(f) { filtroAlertaAtual = f; renderizarListaAlertas(); }

function renderizarListaAlertas() {
    if (!alertaAberto) return;
    let it = itensDoAlerta(alertaAberto);
    let c = { vencido: 0, alerta: 0, ok: 0, sem: 0 }; it.forEach(i => c[i.nivel]++);
    let filtros = [['atencao', `Atenção (${c.vencido + c.alerta})`], ['vencido', `Vencidos (${c.vencido})`], ['alerta', `A vencer (${c.alerta})`], ['ok', `Em dia (${c.ok})`], ['sem', `Sem registro (${c.sem})`], ['todos', `Todos (${it.length})`]]
        .filter(f => f[0] === 'todos' || f[0] === 'atencao' || c[f[0]] > 0);
    document.getElementById('filtro-alertas').innerHTML = filtros.map(f => `<button type="button" class="${f[0] === filtroAlertaAtual ? 'ativo' : ''}" onclick="filtrarAlertas('${f[0]}')">${f[1]}</button>`).join('');
    let vis = it.filter(i => filtroAlertaAtual === 'todos' || (filtroAlertaAtual === 'atencao' ? (i.nivel === 'vencido' || i.nivel === 'alerta') : i.nivel === filtroAlertaAtual));
    let lista = document.getElementById('lista-alertas');
    if (!vis.length) { lista.innerHTML = `<div class="lista-alertas-vazia"><i class="ph-fill ph-check-circle" style="color:var(--sem-verde); font-size:28px; display:block; margin:0 auto 6px;"></i>Nenhum veículo nesta lista.</div>`; return; }
    lista.innerHTML = vis.map(i => {
        let v = window.frota[i.placa] || {};
        let sub = [v.tipo, v.motorista].filter(x => x && String(x).trim()).map(escHtml).join(' · ');
        let rot = i.nivel === 'sem' ? 'Cadastrar' : 'Atualizar';
        return `<div class="item-alerta ${i.nivel}"><span class="bolinha"></span><div class="item-alerta-info"><b>${escHtml(i.placa)}${i.sub ? ` <span class="tag-oleo">${OLEOS[i.sub].nome}</span>` : ''}</b><small class="txt-status">${i.texto}</small>${i.detalhe ? `<small>${i.detalhe}</small>` : ''}${sub ? `<small>${sub}</small>` : ''}</div><button type="button" class="btn-atualizar-alerta" onclick="editarItemAlerta('${alertaAberto}','${escHtml(i.placa)}','${i.sub || ''}')"><i class="ph ph-pencil-simple"></i>${rot}</button></div>`;
    }).join('');
}

async function editarItemAlerta(tipo, placa, sub) {
    let oleo = tipo === 'oleo' ? OLEOS[sub || 'motor'] : null;
    let v = window.frota[placa]; if (!v) return;
    let hojeISO = isoData(new Date());
    let html = '', foco = '';
    if (tipo === 'oleo') {
        let sugestao = oleo.intervalo ? `<button type="button" class="btn-sugestao-km" onclick="let a=parseFloat(document.getElementById('sw-km-atual').value)||0; document.getElementById('sw-km-oleo').value = a ? Math.round(a + ${oleo.intervalo}) : '';">Troquei agora: próxima = KM atual + ${fmtKm(oleo.intervalo)}</button>` : '';
        html = `<p style="font-size:13px; color:#6b7280; margin:0 0 4px;">Fez a troca? Informe o KM atual e o KM da <b>próxima</b> troca.</p>
            <label class="swal-campo-label">KM atual do veículo</label><input id="sw-km-atual" type="number" inputmode="numeric" class="swal2-input swal-campo" value="${numKm(v.km_atual) || ''}">
            <label class="swal-campo-label">Próxima troca do óleo do ${oleo.nome.toLowerCase()} (KM)</label><input id="sw-km-oleo" type="number" inputmode="numeric" class="swal2-input swal-campo" value="${numKm(v[oleo.campo]) || ''}" placeholder="Ex: ${fmtKm(numKm(v.km_atual) + (oleo.intervalo || 10000)).replace(/\./g, '')}">${sugestao}`;
        foco = 'sw-km-oleo';
    } else if (tipo === 'tacografo') {
        html = `<label class="swal-campo-label">Data da última aferição</label><input id="sw-data" type="date" class="swal2-input swal-campo" value="${hojeISO}" max="${hojeISO}"><p style="font-size:12px; color:#6b7280; margin:8px 0 0;">A próxima aferição é calculada automaticamente (+2 anos).</p>`;
    } else if (tipo === 'extintor') {
        html = `<label class="swal-campo-label">Nova data de validade do extintor</label><input id="sw-data" type="date" class="swal2-input swal-campo" value="${v.data_extintor || ''}">`;
    } else if (tipo === 'graxa') {
        html = `<label class="swal-campo-label">Data da engraxada</label><input id="sw-data" type="date" class="swal2-input swal-campo" value="${hojeISO}" max="${hojeISO}"><p style="font-size:12px; color:#6b7280; margin:8px 0 0;">A próxima é calculada automaticamente (+${INTERVALO_GRAXA_DIAS} dias).</p>`;
    }
    const r = await Swal.fire({
        title: `${oleo ? 'Óleo do ' + oleo.nome : ALERTAS[tipo].nome} · ${placa}`, html: html, showCancelButton: true, confirmButtonText: 'Salvar', cancelButtonText: 'Cancelar', confirmButtonColor: '#1a4d2e', focusConfirm: false,
        didOpen: () => { let f = document.getElementById(foco); if (f) f.focus(); },
        preConfirm: () => {
            if (tipo === 'oleo') {
                let ka = numKm(document.getElementById('sw-km-atual').value), ko = numKm(document.getElementById('sw-km-oleo').value);
                if (!ko) { Swal.showValidationMessage('Informe o KM da próxima troca'); return false; }
                if (ka && ko <= ka) { Swal.showValidationMessage('A próxima troca precisa ser maior que o KM atual'); return false; }
                let r = { km_atual: ka ? String(Math.round(ka)) : '' }; r[oleo.campo] = String(Math.round(ko)); return r;
            }
            let d = document.getElementById('sw-data').value;
            if (!d) { Swal.showValidationMessage('Informe a data'); return false; }
            if (tipo === 'tacografo') return { data_tacografo: d };
            if (tipo === 'extintor') return { data_extintor: d };
            if (tipo === 'graxa') return { data_graxa: d };
        }
    });
    if (!r.isConfirmed || !r.value) return;
    if (r.value.km_atual && !(await confirmarKm(placa, r.value.km_atual))) return;

    atualizarFrotaLocal(placa, r.value);
    // Só os campos alterados vão para a planilha (os outros ficam como estão)
    let payload = Object.assign({ acao: "salvar_ficha_tecnica", usuario: window.usuarioLogado, placa: placa, pneus: {} }, r.value);
    if (!payload.km_atual) delete payload.km_atual;
    if (!(await adicionarNaFila(payload))) return;
    salvarCacheLocal();
    renderizarAlertas(); renderizarListaAlertas();
    mostrarToast(`<i class='ph ph-check-circle'></i> ${oleo ? 'Óleo do ' + oleo.nome : ALERTAS[tipo].nome} de ${placa} atualizado`, "#059669");
}

/* =========================================================
   TRAVA DE KM: pede confirmação quando o KM (ou horímetro) sobe demais ou diminui
   ========================================================= */
const SALTO_KM_MAX = 5000;     // caminhões, cavalos e utilitários
const SALTO_HORAS_MAX = 300;   // empilhadeiras (horímetro)
async function confirmarKm(placa, valorNovo) {
    let v = window.frota[placa]; if (!v) return true;
    let ant = numKm(v.km_atual), novo = numKm(valorNovo);
    if (!novo || !ant || novo === ant) return true;
    let emp = EMPILHADEIRAS.includes(placa), un = emp ? 'horas' : 'km', rot = emp ? 'horímetro' : 'KM';
    let msg = "";
    if (novo < ant) msg = `O ${rot} digitado é <b>MENOR</b> que o último registrado.`;
    else if (novo - ant > (emp ? SALTO_HORAS_MAX : SALTO_KM_MAX)) msg = `O ${rot} subiu <b>${fmtKm(novo - ant)} ${un}</b> desde o último registro.`;
    else return true;
    let r = await Swal.fire({ icon: 'warning', title: `Confira o ${rot}`, html: `${msg}<br><br>Último: <b>${fmtKm(ant)}</b><br>Digitado: <b style="color:#dc2626">${fmtKm(novo)}</b><br><br><small>Se o último estava errado, confirme para corrigir.</small>`, showCancelButton: true, confirmButtonText: 'Está certo', cancelButtonText: 'Corrigir', confirmButtonColor: '#1a4d2e', cancelButtonColor: '#6b7280', reverseButtons: true });
    return r.isConfirmed;
}

/* =========================================================
   PAINEL DO GERENTE: gasto do mês, consumo km/L por veículo e checklists da semana
   ========================================================= */
let filtroGrupoGerente = 'todos';
function atualizarTileGerente() {
    let t = document.getElementById('tile-gerente'); if (!t) return;
    let s = lerSessao();
    t.style.display = (s && s.p === false) ? 'none' : 'flex';
}
function inicioDaSemana() { let a = new Date(); let i = new Date(a.getFullYear(), a.getMonth(), a.getDate() - a.getDay()); i.setHours(0, 0, 0, 0); return i; }
function dataDoHistorico(h) { let d = String(h.data); if (d.includes('/')) { let p = d.split(' ')[0].split('/'); return new Date(p[2], p[1] - 1, p[0]); } return new Date(d); }
function variacao(atual, anterior, maiorEhRuim) {
    if (!anterior || !atual) return '<span class="var neutro">—</span>';
    let pct = Math.round((atual - anterior) / anterior * 100);
    if (pct === 0) return '<span class="var neutro">= mês ant.</span>';
    let ruim = maiorEhRuim ? pct > 0 : pct < 0;
    return `<span class="var ${ruim ? 'sobe-ruim' : 'bom'}">${pct > 0 ? '▲' : '▼'} ${Math.abs(pct)}%</span>`;
}

function abrirPainelGerente() {
    esconderTodasTelas();
    document.getElementById('tela-gerente').style.display = 'flex';
    renderizarPainelGerente();
    window.scrollTo(0, 0);
}
function filtrarGrupoGerente(g) { filtroGrupoGerente = g; renderizarPainelGerente(); }

let mesGerente = ''; // 'aaaa-mm' escolhido no filtro (vazio = mês atual)
function mudarMesGerente(m) { mesGerente = m; renderizarPainelGerente(); }
const NOMES_MES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
function nomeMes(k) { let [a, m] = k.split('-'); return `${NOMES_MES[+m - 1]}/${a}`; }
function mesAnteriorDe(k) { let [a, m] = k.split('-').map(Number); m--; if (!m) { m = 12; a--; } return `${a}-${String(m).padStart(2, '0')}`; }
function chaveMesDe(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; }
const fmtKmL = v => v ? v.toFixed(2).replace('.', ',') : '—';

/* Números do Painel do Gerente para um mês (usado na tela e no relatório PDF de governança) */
function calcPainel(selPedido, filtro) {
    let M = window.mensal || {};
    let atual = chaveMesDe(new Date());
    let meses = [...new Set(Object.keys(M).concat([atual]))].sort().reverse();
    let sel = selPedido && meses.includes(selPedido) ? selPedido : atual, ant = mesAnteriorDe(sel), ehAtual = sel === atual;
    let D = M[sel] || { diesel: 0, arla: 0, veiculos: {}, motoristas: {}, checklists: {} }, A = M[ant] || { diesel: 0, arla: 0, veiculos: {}, motoristas: {}, checklists: {} };
    let somaKm = 0, somaLp = 0; Object.values(D.veiculos).forEach(v => { somaKm += v.km || 0; somaLp += v.lp || 0; });
    let somaKmA = 0, somaLpA = 0; Object.values(A.veiculos).forEach(v => { somaKmA += v.km || 0; somaLpA += v.lp || 0; });
    let mediaFrota = somaLp ? somaKm / somaLp : 0, mediaFrotaA = somaLpA ? somaKmA / somaLpA : 0;
    let hoje = new Date(), diaMes = hoje.getDate(), diasMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate();
    let projecao = ehAtual && D.diesel ? Math.round(D.diesel / diaMes * diasMes) : 0;
    let diasTanque = ehAtual && D.diesel && window.estoqueDiesel > 0 ? Math.floor(window.estoqueDiesel / (D.diesel / diaMes)) : 0;

    let ativos = [...new Set(TOCOS.concat(TRUCKS, CAVALOS, CARROS, EMPILHADEIRAS))].sort();
    // Checklists da semana (só no mês atual)
    let ini = inicioDaSemana(); let feitos = new Set();
    (window.historicoChecklist || []).forEach(h => { if (dataDoHistorico(h) >= ini) feitos.add(String(h.placa).trim().toUpperCase()); });
    let pend = ativos.filter(p => !feitos.has(p)); let qtdFeitos = ativos.length - pend.length;
    let pct = ativos.length ? Math.round(qtdFeitos / ativos.length * 100) : 0;
    // Checklists do mês escolhido
    let chkMes = D.checklists || {}; let totChk = ativos.reduce((t, p) => t + (chkMes[p] || 0), 0);
    let semChkMes = ativos.filter(p => !chkMes[p]);
    let semanasMes = ehAtual ? Math.max(1, Math.ceil(diaMes / 7)) : Math.round(new Date(+sel.slice(0, 4), +sel.slice(5), 0).getDate() / 7);
    let esperado = ativos.length * semanasMes, pctMes = esperado ? Math.min(100, Math.round(totChk / esperado * 100)) : 0;

    // Consumo por veículo
    const grupos = { todos: 'Todos', caminhoes: 'Caminhões', cavalos: 'Cavalos', utilitarios: 'Utilitários' };
    const doGrupo = p => (TOCOS.includes(p) || TRUCKS.includes(p)) ? 'caminhoes' : (CAVALOS.includes(p) ? 'cavalos' : (CARROS.includes(p) ? 'utilitarios' : ''));
    let linhas = ativos.filter(p => doGrupo(p) && window.frota[p]).map(p => {
        let v = D.veiculos[p] || {}, va = A.veiculos[p] || {};
        let media = v.lp ? v.km / v.lp : 0, mediaA = va.lp ? va.km / va.lp : 0;
        let comparavel = (v.n || 0) >= 3 && (va.n || 0) >= 3;
        let queda = comparavel && media && mediaA ? (media - mediaA) / mediaA : 0;
        return { placa: p, grupo: doGrupo(p), tipo: (window.frota[p] || {}).tipo || '', media, mediaAnt: comparavel ? mediaA : 0, km: v.km || 0, litros: v.litros || 0, arla: v.arla || 0, queda };
    }).filter(l => (filtro === 'todos' || l.grupo === filtro) && (l.litros || l.km))
      .sort((a, b) => ((a.queda <= -0.2) === (b.queda <= -0.2) ? 0 : (a.queda <= -0.2 ? -1 : 1)) || (b.litros - a.litros));
    // Motoristas (km/L com pelo menos 3 abastecimentos no mês)
    // Motoristas: separados por tipo de veículo (cavalo faz ~2 km/L, caminhão ~4), seguindo o filtro Todos/Caminhões/Cavalos/Utilitários
    const NOME_GRUPO = { caminhoes: 'Caminhões', cavalos: 'Cavalos', utilitarios: 'Utilitários' };
    let gruposMot = filtro === 'todos' ? ['caminhoes', 'cavalos', 'utilitarios'] : [filtro];
    let mots = Object.entries(D.motoristas || {}).map(([chave, m]) => { let [nome, g] = chave.split('|'); return { nome, grupo: g || 'caminhoes', media: m.lp ? m.km / m.lp : 0, km: m.km, litros: m.litros, n: m.n }; })
        .filter(m => m.n >= 3 && m.media && gruposMot.includes(m.grupo));
    let medGrupo = {}; gruposMot.forEach(g => { let l = mots.filter(m => m.grupo === g); medGrupo[g] = l.length ? l.reduce((t, m) => t + m.media, 0) / l.length : 0; });
    mots.sort((a, b) => (gruposMot.indexOf(a.grupo) - gruposMot.indexOf(b.grupo)) || (b.media - a.media));
    // Planos de ação do mês
    let planos = Object.values(window.planos || {});
    let criados = planos.filter(p => p.criado_em && chaveMesDe(new Date(p.criado_em)) === sel).length;
    let concl = planos.filter(p => p.status === 'Concluído' && String(p.data_conclusao || '').slice(0, 7) === sel);
    let tempos = concl.filter(p => p.criado_em).map(p => Math.max(0, Math.round((new Date(p.data_conclusao + 'T12:00:00') - new Date(p.criado_em)) / 86400000)));
    let tempoMedio = tempos.length ? Math.round(tempos.reduce((a, b) => a + b, 0) / tempos.length) : null;
    let probs = coletarProblemas(), abertos = probs.filter(i => i.aberto);
    return { atual, meses, sel, ant, ehAtual, D, A, mediaFrota, mediaFrotaA, hoje, diaMes, diasMes, projecao, diasTanque, ativos, pend, qtdFeitos, pct, chkMes, totChk, semChkMes, semanasMes, esperado, pctMes, grupos, doGrupo, linhas, NOME_GRUPO, gruposMot, mots, medGrupo, planos, criados, concl, tempos, tempoMedio, probs, abertos };
}

function renderizarPainelGerente() {
    let alvo = document.getElementById('conteudo-gerente'); if (!alvo) return;
    let r = window.resumoGerente || {}, M = window.mensal || {};
    let ger = r.gerado_em ? new Date(r.gerado_em) : null;
    document.getElementById('gerente-atualizado').textContent = ger && !isNaN(ger) ? `Dados de ${fmtData(ger)} às ${String(ger.getHours()).padStart(2, '0')}:${String(ger.getMinutes()).padStart(2, '0')}` : '';
    let P = calcPainel(mesGerente, filtroGrupoGerente);
    let { atual, meses, sel, ant, ehAtual, D, A, mediaFrota, mediaFrotaA, hoje, diaMes, diasMes, projecao, diasTanque, ativos, pend, qtdFeitos, pct, chkMes, totChk, semChkMes, semanasMes, esperado, pctMes, grupos, doGrupo, linhas, NOME_GRUPO, gruposMot, mots, medGrupo, planos, criados, concl, tempos, tempoMedio, probs, abertos } = P;
    let tabela = linhas.length ? `<table class="tabela-consumo"><thead><tr><th>Veículo</th><th class="num">km/L</th><th class="num">Litros</th><th class="num">KM</th></tr></thead><tbody>${linhas.map(l => `
        <tr class="${l.queda <= -0.2 ? 'alerta-consumo' : ''}"><td><b>${escHtml(l.placa)}</b><small>${escHtml(l.tipo)}</small></td>
        <td class="num"><b>${fmtKmL(l.media)}</b><small>${variacao(l.media, l.mediaAnt, false)}</small></td>
        <td class="num">${fmtKm(l.litros)}${l.arla ? `<small>+${fmtKm(l.arla)} Arla</small>` : ''}</td>
        <td class="num">${l.km ? fmtKm(l.km) : '—'}</td></tr>`).join('')}</tbody></table>` : '<p class="lista-alertas-vazia">Nenhum abastecimento neste mês.</p>';

    let tabMot = mots.length ? gruposMot.filter(g => mots.some(m => m.grupo === g)).map(g => { let l = mots.filter(m => m.grupo === g); return `<p class="grupo-imp" style="margin-top:10px;">${NOME_GRUPO[g]} · média ${fmtKmL(medGrupo[g])} km/L</p><table class="tabela-consumo"><thead><tr><th>Motorista</th><th class="num">km/L</th><th class="num">KM</th><th class="num">Litros</th></tr></thead><tbody>${l.map((m, i) => `
        <tr class="${m.media < medGrupo[g] * 0.85 ? 'alerta-consumo' : ''}"><td><b>${i + 1}º ${escHtml(m.nome)}</b></td><td class="num"><b>${fmtKmL(m.media)}</b></td><td class="num">${fmtKm(m.km)}</td><td class="num">${fmtKm(m.litros)}</td></tr>`).join('')}</tbody></table>`; }).join('') : '<p class="lista-alertas-vazia">Sem dados suficientes neste mês (mínimo 3 abastecimentos por motorista).</p>';


    alvo.innerHTML = `
      <div class="filtro-mes"><label class="info-label" style="margin:0;"><i class="ph ph-calendar-blank"></i> Mês:</label>
        <select class="input-campo" style="margin:0;" onchange="mudarMesGerente(this.value)">${meses.map(m => `<option value="${m}" ${m === sel ? 'selected' : ''}>${nomeMes(m)}${m === atual ? ' (atual)' : ''}</option>`).join('')}</select></div>
      <div class="kpis">
        <div class="kpi"><small>Diesel</small><b>${fmtKm(D.diesel || 0)} L</b>${variacao(D.diesel, A.diesel, true)}</div>
        <div class="kpi"><small>Arla</small><b>${fmtKm(D.arla || 0)} L</b>${variacao(D.arla, A.arla, true)}</div>
        <div class="kpi"><small>Média frota</small><b>${fmtKmL(mediaFrota)}</b>${variacao(mediaFrota, mediaFrotaA, false)}</div>
      </div>
      ${ehAtual ? `<div class="kpis">
        <div class="kpi"><small>Tanque diesel</small><b>${fmtKm(window.estoqueDiesel || 0)} L</b><span class="var ${diasTanque && diasTanque < 7 ? 'sobe-ruim' : 'neutro'}">${diasTanque ? '≈ ' + diasTanque + ' dias' : '&nbsp;'}</span></div>
        <div class="kpi"><small>Tanque Arla</small><b>${fmtKm(window.estoqueArla || 0)} L</b><span class="var neutro">&nbsp;</span></div>
        <div class="kpi"><small>Projeção diesel</small><b>${projecao ? fmtKm(projecao) + ' L' : '—'}</b><span class="var neutro">fim do mês</span></div>
      </div>` : ''}
      <div class="card">
        <h3 class="card-titulo"><i class="ph ph-warning-octagon"></i> Problemas e planos de ação</h3>
        <div class="mini-kpis"><div><b style="color:var(--sem-verm)">${abertos.length}</b><small>abertos agora</small></div><div><b style="color:#b45309">${abertos.filter(i => i.atrasado).length}</b><small>planos atrasados</small></div><div><b>${criados}</b><small>planos criados em ${NOMES_MES[+sel.slice(5) - 1]}</small></div><div><b style="color:var(--sem-verde)">${concl.length}</b><small>resolvidos em ${NOMES_MES[+sel.slice(5) - 1]}</small></div></div>
        ${tempoMedio !== null ? `<p class="nota-gerente" style="margin-top:0;">Tempo médio para resolver: <b>${tempoMedio} dia${tempoMedio === 1 ? '' : 's'}</b></p>` : ''}
        <button type="button" class="btn-principal" style="margin:10px 0 0;" onclick="abrirProblemas()"><i class="ph ph-warning-octagon"></i> Abrir Problemas Encontrados</button>
      </div>
      ${ehAtual ? `<div class="card">
        <h3 class="card-titulo"><i class="ph ph-check-square"></i> Checklists da semana</h3>
        <div style="display:flex; justify-content:space-between; font-size:13px; font-weight:600;"><span>${qtdFeitos} de ${ativos.length} feitos</span><span style="color:${pct === 100 ? 'var(--sem-verde)' : 'var(--text-muted)'}">${pct}%</span></div>
        <div class="barra-prog"><span style="width:${pct}%"></span></div>
        ${pend.length ? `<p class="info-label" style="margin:0 0 8px;">Faltam (toque para fazer):</p><div class="chips-pend">${pend.map(p => `<button type="button" class="chip-pend" onclick="fazerChecklistDe('${escHtml(p)}')">${escHtml(p)}</button>`).join('')}</div>` : '<div class="chips-pend"><span class="chip-pend ok">✓ Todos os veículos fizeram o checklist</span></div>'}
        <p class="nota-gerente">A semana começa no domingo.</p>
      </div>` : ''}
      <div class="card">
        <h3 class="card-titulo"><i class="ph ph-calendar-check"></i> Checklists em ${nomeMes(sel)}</h3>
        <div style="display:flex; justify-content:space-between; font-size:13px; font-weight:600;"><span>${totChk} feitos (esperado ≈ ${esperado}: 1 por veículo por semana)</span><span>${pctMes}%</span></div>
        <div class="barra-prog"><span style="width:${pctMes}%"></span></div>
        ${semChkMes.length ? `<p class="info-label" style="margin:0 0 8px;">Sem nenhum checklist no mês:</p><div class="chips-pend">${semChkMes.map(p => `<span class="chip-pend">${escHtml(p)}</span>`).join('')}</div>` : '<div class="chips-pend"><span class="chip-pend ok">✓ Todos os veículos têm checklist no mês</span></div>'}
      </div>
      <div class="card">
        <h3 class="card-titulo"><i class="ph ph-gas-pump"></i> Consumo por veículo</h3>
        <div class="filtro-grupos">${Object.keys(grupos).map(g => `<button type="button" class="${g === filtroGrupoGerente ? 'ativo' : ''}" onclick="filtrarGrupoGerente('${g}')">${grupos[g]}</button>`).join('')}</div>
        ${tabela}
        <p class="nota-gerente">Comparado com ${nomeMes(ant)}. km/L = km rodados entre um abastecimento e outro ÷ litros. Linhas em vermelho: média caiu 20% ou mais (só compara quando há 3+ abastecimentos em cada mês). Saltos acima de 3.000 km são ignorados.</p>
      </div>
      <div class="card">
        <h3 class="card-titulo"><i class="ph ph-steering-wheel"></i> Consumo por motorista</h3>
        ${tabMot}
        <p class="nota-gerente">Ranking pela média km/L dos abastecimentos de cada motorista no mês. Separado por tipo de veículo. Em vermelho: 15% abaixo da média do grupo — vale uma conversa ou acompanhamento. Use os botões Todos/Caminhões/Cavalos do consumo para filtrar.</p>
      </div>
      <div class="card">
        <h3 class="card-titulo"><i class="ph ph-file-pdf"></i> Relatório para a governança</h3>
        <p style="font-size:13px; color:var(--text-muted); margin:0;"><i class="ph ph-clock"></i> Gerado <b>automaticamente todo dia 1º</b> com o mês que fechou e salvo na pasta da governança em dois arquivos: <b>relatorio_aaaa_mm.pdf</b> (caminhões e UGF2G86) e <b>relatorio_aaaa_mm_demais_veiculos.pdf</b> (cavalos, utilitários, empilhadeiras e carretas).</p>
      </div>`;
}

/* Relatório PDF do Painel do Gerente (governança de logística) */
function montarRelatorioGerente(selPedido) {
    let P = calcPainel(selPedido, 'todos');
    const vr = (at, an, maiorRuim) => { if (!at || !an) return { t: '—' }; let p = Math.round((at - an) / an * 100); if (!p) return { t: '=' }; let ruim = maiorRuim ? p > 0 : p < 0; return { t: (p > 0 ? '▲ ' : '▼ ') + Math.abs(p) + '%', cor: ruim ? '#dc2626' : '#16a34a' }; };
    const mesN = NOMES_MES[+P.sel.slice(5) - 1], mesAntN = NOMES_MES[+P.ant.slice(5) - 1];
    const abertos = P.abertos, atrasados = abertos.filter(i => i.atrasado);
    let kpis = [
        { r: 'Diesel', v: fmtKm(P.D.diesel || 0) + ' L', x: vr(P.D.diesel, P.A.diesel, true) },
        { r: 'Arla', v: fmtKm(P.D.arla || 0) + ' L', x: vr(P.D.arla, P.A.arla, true) },
        { r: 'Média da frota', v: fmtKmL(P.mediaFrota) + ' km/L', x: vr(P.mediaFrota, P.mediaFrotaA, false) },
        { r: 'Checklists no mês', v: P.totChk + ' de ≈' + P.esperado, x: { t: P.pctMes + '%', cor: P.pctMes >= 90 ? '#16a34a' : (P.pctMes >= 70 ? '#d97706' : '#dc2626') } },
        { r: 'Problemas abertos', v: String(abertos.length), x: { t: abertos.filter(i => i.prioridade === 'Alta').length + ' de prioridade alta', cor: '#dc2626' } },
        { r: 'Planos atrasados', v: String(atrasados.length), x: { t: abertos.filter(i => i.status === 'Sem plano').length + ' sem plano', cor: '#d97706' } },
        { r: 'Planos criados / resolvidos', v: P.criados + ' / ' + P.concl.length, x: { t: 'em ' + mesN } },
        { r: 'Tempo médio p/ resolver', v: P.tempoMedio !== null ? P.tempoMedio + ' dia' + (P.tempoMedio === 1 ? '' : 's') : '—', x: { t: '' } }
    ];
    if (P.ehAtual) kpis.push({ r: 'Projeção diesel no mês', v: P.projecao ? fmtKm(P.projecao) + ' L' : '—', x: { t: P.diasTanque ? 'tanque ≈ ' + P.diasTanque + ' dias' : '' } });

    // Destaques automáticos para a reunião
    let dest = [];
    let pDiesel = P.D.diesel && P.A.diesel ? Math.round((P.D.diesel - P.A.diesel) / P.A.diesel * 100) : 0;
    if (pDiesel) dest.push('Diesel ' + (pDiesel > 0 ? 'subiu ' : 'caiu ') + Math.abs(pDiesel) + '% em relação a ' + mesAntN + (P.ehAtual ? ' (mês ainda em andamento)' : '') + '.');
    let pMed = P.mediaFrota && P.mediaFrotaA ? Math.round((P.mediaFrota - P.mediaFrotaA) / P.mediaFrotaA * 100) : 0;
    if (pMed) dest.push('Média da frota ' + (pMed > 0 ? 'melhorou ' : 'piorou ') + Math.abs(pMed) + '% (' + fmtKmL(P.mediaFrotaA) + ' → ' + fmtKmL(P.mediaFrota) + ' km/L).');
    let quedas = P.linhas.filter(l => l.queda <= -0.2);
    if (quedas.length) dest.push(quedas.length + ' veículo(s) com queda de 20% ou mais no km/L: ' + quedas.map(l => l.placa).join(', ') + '. Verificar vazamento, pneus, motorista ou desvio.');
    let motBaixo = P.mots.filter(m => m.media < P.medGrupo[m.grupo] * 0.85);
    if (motBaixo.length) dest.push(motBaixo.length + ' motorista(s) 15% abaixo da média do grupo: ' + motBaixo.map(m => m.nome).join(', ') + '.');
    if (P.semChkMes.length) dest.push(P.semChkMes.length + ' veículo(s) sem nenhum checklist no mês: ' + P.semChkMes.join(', ') + '.');
    if (atrasados.length) dest.push(atrasados.length + ' plano(s) de ação com prazo vencido: cobrar o responsável ou remarcar.');
    if (!dest.length) dest.push('Nenhum ponto de atenção relevante no mês.');

    let secoes = [];
    const tipoDe = p => (window.frota[p] || {}).tipo || '';
    ['caminhoes', 'cavalos', 'utilitarios'].forEach(g => {
        let l = P.linhas.filter(x => x.grupo === g).sort((a, b) => b.litros - a.litros); if (!l.length) return;
        let lt = l.reduce((t, x) => t + x.litros, 0), km = l.reduce((t, x) => t + x.km, 0);
        secoes.push({ titulo: 'Consumo por veículo · ' + P.NOME_GRUPO[g], colunas: [{ t: 'Veículo', w: 12 }, { t: 'Tipo', w: 18 }, { t: 'km/L', w: 9, n: 1 }, { t: mesAntN.slice(0, 3) + '.', w: 9, n: 1 }, { t: 'Var.', w: 9, n: 1 }, { t: 'Diesel (L)', w: 13, n: 1 }, { t: 'Arla (L)', w: 11, n: 1 }, { t: 'KM', w: 19, n: 1 }],
            linhas: l.map(x => ({ a: x.queda <= -0.2, c: [{ t: x.placa, b: 1 }, tipoDe(x.placa), { t: fmtKmL(x.media), b: 1 }, fmtKmL(x.mediaAnt), vr(x.media, x.mediaAnt, false), fmtKm(x.litros), x.arla ? fmtKm(x.arla) : '—', x.km ? fmtKm(x.km) : '—'] })),
            nota: 'Total: ' + fmtKm(lt) + ' L de diesel · ' + fmtKm(km) + ' km. Em vermelho: km/L caiu 20% ou mais (só compara com 3+ abastecimentos em cada mês).' });
    });
    if (!P.linhas.length) secoes.push({ titulo: 'Consumo por veículo', colunas: [{ t: '', w: 100 }], linhas: [], vazio: 'Nenhum abastecimento neste mês.' });
    P.gruposMot.forEach(g => {
        let l = P.mots.filter(m => m.grupo === g); if (!l.length) return;
        secoes.push({ titulo: 'Ranking de motoristas · ' + P.NOME_GRUPO[g] + ' (média ' + fmtKmL(P.medGrupo[g]) + ' km/L)', colunas: [{ t: 'Pos.', w: 7 }, { t: 'Motorista', w: 41 }, { t: 'km/L', w: 12, n: 1 }, { t: 'KM', w: 14, n: 1 }, { t: 'Litros', w: 14, n: 1 }, { t: 'Abast.', w: 12, n: 1 }],
            linhas: l.map((m, i) => ({ a: m.media < P.medGrupo[g] * 0.85, c: [i + 1 + 'º', { t: m.nome, b: 1 }, { t: fmtKmL(m.media), b: 1 }, fmtKm(m.km), fmtKm(m.litros), String(m.n)] })),
            nota: 'Mínimo de 3 abastecimentos no mês. Em vermelho: 15% abaixo da média do grupo.' });
    });
    secoes.push({ titulo: 'Checklists em ' + nomeMes(P.sel), colunas: [{ t: 'Indicador', w: 28 }, { t: 'Resultado', w: 72 }],
        linhas: [{ c: ['Checklists feitos', P.totChk + ' de ≈' + P.esperado + ' esperados (1 por veículo por semana) · ' + P.pctMes + '%'] },
                 { a: P.semChkMes.length > 0, c: ['Sem nenhum checklist (' + P.semChkMes.length + ')', P.semChkMes.length ? P.semChkMes.join(', ') : 'Todos os veículos têm checklist no mês'] }]
            .concat(P.ehAtual ? [{ c: ['Semana atual', P.qtdFeitos + ' de ' + P.ativos.length + ' feitos (' + P.pct + '%)' + (P.pend.length ? ' · faltam: ' + P.pend.join(', ') : '')] }] : []) });
    let porCat = {}; abertos.forEach(i => { let c = porCat[i.categoria] = porCat[i.categoria] || { n: 0, alta: 0, sem: 0, atr: 0, pl: new Set() }; c.n++; if (i.prioridade === 'Alta') c.alta++; if (i.status === 'Sem plano') c.sem++; if (i.atrasado) c.atr++; c.pl.add(i.placa); });
    secoes.push({ titulo: 'Problemas abertos por categoria (situação em ' + fmtData(new Date()) + ')', colunas: [{ t: 'Categoria', w: 26 }, { t: 'Abertos', w: 10, n: 1 }, { t: 'Alta', w: 8, n: 1 }, { t: 'Sem plano', w: 11, n: 1 }, { t: 'Atrasados', w: 11, n: 1 }, { t: 'Veículos', w: 34 }],
        linhas: Object.keys(porCat).map(k => ({ a: porCat[k].atr > 0, c: [{ t: k, b: 1 }, String(porCat[k].n), String(porCat[k].alta), String(porCat[k].sem), String(porCat[k].atr), [...porCat[k].pl].sort().join(', ')] })),
        vazio: 'Nenhum problema em aberto.' });
    const br = d => d ? String(d).slice(0, 10).split('-').reverse().join('/') : '';
    secoes.push({ titulo: 'Planos de ação resolvidos em ' + nomeMes(P.sel) + ' (' + P.concl.length + ')', cor: '#16a34a', colunas: [{ t: 'Veículo', w: 11 }, { t: 'Problema', w: 33 }, { t: 'Ação realizada', w: 33 }, { t: 'Responsável', w: 13 }, { t: 'Concluído', w: 10 }],
        linhas: P.concl.slice().sort((a, b) => String(a.data_conclusao).localeCompare(String(b.data_conclusao))).map(p => ({ c: [{ t: p.placa, b: 1 }, p.problema || '', p.plano_acao || '', p.responsavel || '', br(p.data_conclusao)] })),
        vazio: 'Nenhum plano concluído neste mês.' });
    return { acao: 'pdf_gerente', usuario: window.usuarioLogado, mes: P.sel, mes_nome: nomeMes(P.sel), mes_anterior: nomeMes(P.ant), parcial: P.ehAtual, kpis, destaques: dest, secoes };
}

async function gerarPdfGerenteApp() {
    if (!navigator.onLine) { Swal.fire('Sem internet', 'Para gerar o PDF é preciso internet.', 'warning'); return; }
    let dados = montarRelatorioGerente(mesGerente);
    let janela = window.open('', '_blank');
    if (janela) janela.document.write('<p style="font-family:sans-serif;padding:20px">Gerando o relatório do painel...</p>');
    Swal.fire({ title: 'Gerando relatório...', allowOutsideClick: false, didOpen: () => Swal.showLoading && Swal.showLoading() });
    try {
        let r = await chamarAPI(dados);
        if (!r.sucesso) throw new Error(r.erro || 'Falha ao gerar');
        Swal.close();
        if (janela) janela.location.href = r.link_pdf;
        else Swal.fire({ title: 'Relatório pronto', html: `Salvo na pasta da governança como <b>${escHtml(r.nome || '')}</b>.<br><br><a href="${r.link_pdf}" target="_blank" style="font-weight:700">Abrir o PDF</a>`, icon: 'success' });
    } catch (e) {
        if (janela) janela.close();
        Swal.fire('Não foi possível gerar', escHtml(String(e.message || e).indexOf('não encontrada') >= 0 ? 'O Apps Script ainda está na versão antiga: publique uma Nova versão.' : (e.message || 'Erro')), 'error');
    }
}

function fazerChecklistDe(placa) { escolherModulo('Checklist'); selecionarPlaca(placa); }

async function enviarAvisoAgora() {
    if (!navigator.onLine) { Swal.fire("Sem internet", "Conecte-se para enviar o aviso.", "warning"); return; }
    let btn = document.getElementById('btn-teste-aviso'); btn.disabled = true; btn.innerHTML = "<i class='ph ph-spinner ph-spin'></i> Enviando...";
    try { let r = await chamarAPI({ acao: 'testar_aviso' }); Swal.fire(r.sucesso ? "Pronto" : "Atenção", r.msg || r.erro || "", r.sucesso ? "success" : "warning"); }
    catch (e) { Swal.fire("Erro", "Não foi possível enviar agora.", "error"); }
    btn.disabled = false; btn.innerHTML = "<i class='ph ph-paper-plane-tilt'></i> Enviar aviso agora";
}

/* =========================================================
   IMPRESSÃO DOS ÚLTIMOS CHECKLISTS
   - Escolhe as placas → baixa o PDF do último checklist de cada uma (Drive)
   - Junta tudo num PDF só e abre a impressão (computador) ou o PDF (celular)
   - Se a impressora direta (PrintNode) estiver configurada no Apps Script, envia sem abrir nada
   ========================================================= */
const PDFLIB_URL = "https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js";
let listaImpressao = []; let impressoraDireta = false; let selecionadosImp = new Set();
const ehCelular = () => /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const ehIOS = () => /iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

function fecharModalImpressao() { document.getElementById('modal-impressao').style.display = 'none'; }

async function abrirModalImpressao() {
    if (!navigator.onLine) { Swal.fire("Sem internet", "Para imprimir é preciso internet (os PDFs ficam no Google Drive).", "warning"); return; }
    if (!tokenAtual()) { tratarSessaoInvalida(); return; }
    document.getElementById('modal-impressao').style.display = 'flex';
    document.getElementById('impressao-atalhos').innerHTML = '';
    document.getElementById('impressao-acoes').innerHTML = '';
    document.getElementById('lista-impressao').innerHTML = `<div class="lista-alertas-vazia"><i class="ph ph-spinner ph-spin" style="font-size:26px; display:block; margin:0 auto 6px;"></i>Buscando os últimos checklists...</div>`;
    try {
        let r = await chamarAPI({ acao: 'listar_impressao' });
        if (!r.sucesso) throw new Error(String(r.erro || '').indexOf('não encontrada') >= 0 ? 'O Apps Script ainda está na versão antiga. Publique uma Nova versão (veja o LEIA-ME).' : (r.erro || 'Falha ao listar'));
        impressoraDireta = !!r.impressora_direta;
        let ativos = new Set(TOCOS.concat(TRUCKS, CAVALOS, CARROS, EMPILHADEIRAS));
        listaImpressao = (r.lista || []).filter(i => ativos.has(i.placa));
        selecionadosImp = new Set();
        renderizarListaImpressao();
    } catch (e) {
        document.getElementById('lista-impressao').innerHTML = `<div class="lista-alertas-vazia">Não foi possível buscar os checklists.<br><small>${escHtml(e.message || '')}</small></div>`;
    }
}

function dataBRparaDate(t) { let m = String(t).match(/(\d{2})\/(\d{2})\/(\d{4})/); return m ? new Date(+m[3], +m[2] - 1, +m[1]) : new Date(t); }
function itemDaSemana(i) { return dataBRparaDate(i.data) >= inicioDaSemana(); }

function atalhoImpressao(tipo) {
    selecionadosImp = new Set(listaImpressao.filter(i => i.tem_pdf && (tipo === 'todos' || (tipo === 'semana' && itemDaSemana(i)))).map(i => i.placa));
    renderizarListaImpressao();
}
function alternarImpressao(placa) {
    let it = listaImpressao.find(i => i.placa === placa); if (!it || !it.tem_pdf) return;
    selecionadosImp.has(placa) ? selecionadosImp.delete(placa) : selecionadosImp.add(placa);
    renderizarListaImpressao();
}

function renderizarListaImpressao() {
    let qSemana = listaImpressao.filter(i => i.tem_pdf && itemDaSemana(i)).length;
    document.getElementById('impressao-atalhos').innerHTML =
        `<button type="button" onclick="atalhoImpressao('semana')">Desta semana (${qSemana})</button><button type="button" onclick="atalhoImpressao('todos')">Todos</button><button type="button" onclick="atalhoImpressao('nenhum')">Limpar</button>`;
    const grupos = [['Caminhões', TOCOS.concat(TRUCKS)], ['Cavalos', CAVALOS], ['Utilitários', CARROS], ['Empilhadeiras', EMPILHADEIRAS]];
    let html = '';
    grupos.forEach(([nome, placas]) => {
        let itens = listaImpressao.filter(i => placas.includes(i.placa)).sort((a, b) => a.placa.localeCompare(b.placa));
        if (!itens.length) return;
        html += `<div class="grupo-imp">${nome}</div>` + itens.map(i => {
            let sel = selecionadosImp.has(i.placa);
            let semana = itemDaSemana(i);
            return `<label class="item-imp ${sel ? 'marcado' : ''} ${i.tem_pdf ? '' : 'sem-pdf'}" onclick="event.preventDefault(); alternarImpressao('${escHtml(i.placa)}')">
                <input type="checkbox" ${sel ? 'checked' : ''} ${i.tem_pdf ? '' : 'disabled'} tabindex="-1">
                <div class="item-alerta-info"><b>${escHtml(i.placa)}</b><small><span class="${semana ? 'semana-ok' : 'semana-velha'}">${escHtml(i.data)}</span>${i.motorista ? ' · ' + escHtml(i.motorista) : ''}</small>${i.tem_pdf ? '' : '<small>Sem PDF salvo</small>'}</div></label>`;
        }).join('');
    });
    let semChk = [...new Set(TOCOS.concat(TRUCKS, CAVALOS, CARROS, EMPILHADEIRAS))].filter(p => !listaImpressao.some(i => i.placa === p));
    if (semChk.length) html += `<p class="nota-gerente">Ainda sem checklist: ${semChk.map(escHtml).join(', ')}</p>`;
    document.getElementById('lista-impressao').innerHTML = html || '<div class="lista-alertas-vazia">Nenhum checklist encontrado.</div>';
    let n = selecionadosImp.size;
    document.getElementById('impressao-acoes').innerHTML =
        (impressoraDireta ? `<button class="btn-principal" ${n ? '' : 'disabled'} onclick="imprimirSelecionados('impressora')"><i class="ph ph-printer"></i> Enviar para a impressora (${n})</button>` : '') +
        `<button class="${impressoraDireta ? 'btn-secundario' : 'btn-principal'}" ${n ? '' : 'disabled'} onclick="imprimirSelecionados('navegador')"><i class="ph ${ehCelular() ? 'ph-file-pdf' : 'ph-printer'}"></i> ${ehCelular() ? 'Gerar PDF para imprimir' : 'Imprimir'} (${n})</button>`;
}

function carregarPdfLib() {
    if (window.PDFLib) return Promise.resolve(window.PDFLib);
    return new Promise((ok, erro) => { let sc = document.createElement('script'); sc.src = PDFLIB_URL; sc.onload = () => ok(window.PDFLib); sc.onerror = () => erro(new Error('Não foi possível carregar o gerador de PDF')); document.head.appendChild(sc); });
}
function base64ParaBytes(b64) { let bin = atob(b64); let u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; }

async function imprimirSelecionados(destino) {
    let placas = [...selecionadosImp]; if (!placas.length) return;
    // iPhone bloqueia janela aberta depois de esperar a internet: abre antes e preenche depois
    let janela = (destino === 'navegador' && ehIOS()) ? window.open('', '_blank') : null;
    if (janela) janela.document.write('<p style="font-family:sans-serif;padding:20px">Gerando PDF dos checklists...</p>');
    Swal.fire({ title: destino === 'impressora' ? 'Enviando para a impressora...' : 'Preparando os PDFs...', html: `${placas.length} checklist(s)`, allowOutsideClick: false, didOpen: () => Swal.showLoading && Swal.showLoading() });
    try {
        let r = await chamarAPI({ acao: 'imprimir_checklists', placas: placas, destino: destino });
        if (r.erro) throw new Error(r.erro);
        let aviso = r.faltando && r.faltando.length ? `<br><br><small>Sem PDF: ${r.faltando.join(', ')}</small>` : '';
        if (destino === 'impressora') {
            Swal.fire(r.enviados ? 'Enviado!' : 'Atenção', `${r.enviados} checklist(s) enviado(s) para a impressora.` + (r.erros && r.erros.length ? `<br><small>Erro: ${r.erros.join(', ')}</small>` : '') + aviso, r.enviados ? 'success' : 'warning');
            if (r.enviados) fecharModalImpressao();
            return;
        }
        if (!r.pdfs || !r.pdfs.length) throw new Error('Nenhum PDF encontrado para as placas escolhidas.');
        const PDFLib = await carregarPdfLib();
        let final = await PDFLib.PDFDocument.create();
        for (let pdf of r.pdfs) {
            let doc = await PDFLib.PDFDocument.load(base64ParaBytes(pdf.base64), { ignoreEncryption: true });
            (await final.copyPages(doc, doc.getPageIndices())).forEach(pg => final.addPage(pg));
        }
        let blob = new Blob([await final.save()], { type: 'application/pdf' });
        let url = URL.createObjectURL(blob);
        let hoje = new Date(); let nome = `Checklists_${String(hoje.getDate()).padStart(2, '0')}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${hoje.getFullYear()}.pdf`;
        Swal.close();
        if (janela) { janela.location.href = url; }                       // iPhone: abre o PDF → Compartilhar → Imprimir
        else if (ehCelular()) { baixarArquivo(url, nome); Swal.fire('PDF pronto', 'O arquivo foi baixado. Abra pela notificação e toque em <b>Imprimir</b> (⋮ → Imprimir).' + aviso, 'success'); }
        else { imprimirNoComputador(url, nome); if (aviso) mostrarToast('Sem PDF: ' + r.faltando.join(', '), '#d97706'); }
        fecharModalImpressao();
        setTimeout(() => URL.revokeObjectURL(url), 10 * 60 * 1000);
    } catch (e) {
        if (janela) janela.close();
        Swal.fire('Não foi possível imprimir', escHtml(e.message || 'Erro'), 'error');
    }
}

function baixarArquivo(url, nome) { let a = document.createElement('a'); a.href = url; a.download = nome; document.body.appendChild(a); a.click(); a.remove(); }

// Computador: abre direto a janela de impressão (escolha a impressora uma vez; o navegador lembra)
function imprimirNoComputador(url, nome) {
    let antigo = document.getElementById('frame-impressao'); if (antigo) antigo.remove();
    let f = document.createElement('iframe'); f.id = 'frame-impressao';
    f.style.cssText = 'position:fixed; right:0; bottom:0; width:1px; height:1px; border:0; opacity:0;';
    f.onload = () => { setTimeout(() => { try { f.contentWindow.focus(); f.contentWindow.print(); } catch (e) { window.open(url, '_blank') || baixarArquivo(url, nome); } }, 400); };
    f.src = url; document.body.appendChild(f);
}

// Rodapé do menu: mostra a versão do app e do servidor (Apps Script) para conferir se a atualização entrou
function mostrarVersoes() {
    let el = document.getElementById('versao-app'); if (!el) return;
    let srv = window.versaoServidor || '?';
    let num = v => parseInt(String(v).replace(/\D/g, ''), 10) || 0;
    let ok = num(srv) >= num(SERVIDOR_MINIMO); // o app pode ser mais novo que o servidor sem problema
    el.innerHTML = `App ${APP_BUILD} · Servidor ${escHtml(srv)}` + (srv !== '?' && !ok ? ' <b style="color:#dc2626">⚠ servidor desatualizado</b>' : '');
}

// Placa "normalizada" para comparar: O vira 0, I vira 1 (as confusões mais comuns ao digitar)
function normalizarPlaca(p) { return String(p || '').toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/O/g, '0').replace(/I/g, '1'); }
// Corrige para o formato brasileiro (ABC1234 ou ABC1D23) trocando O/0, I/1 na posição certa.
// Devolve a própria placa se já estiver certa, ou null se não der para encaixar (ex: empilhadeira 05025DR3290).
function corrigirFormatoPlaca(p) {
    p = String(p || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (/^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/.test(p)) return p;
    if (p.length !== 7) return null;
    const paraLetra = { '0': 'O', '1': 'I', '5': 'S', '8': 'B' }, paraNum = { 'O': '0', 'Q': '0', 'D': '0', 'I': '1', 'L': '1', 'S': '5', 'B': '8', 'Z': '2' };
    let c = p.split('');
    for (let i = 0; i < 3; i++) if (/[0-9]/.test(c[i])) c[i] = paraLetra[c[i]] || c[i];
    for (let i of [3, 5, 6]) if (/[A-Z]/.test(c[i])) c[i] = paraNum[c[i]] || c[i];
    let r = c.join('');
    return /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/.test(r) ? r : null;
}

/* =========================================================
   TWI DOS PNEUS COM VÍRGULA AUTOMÁTICA: digita 2222 -> 22,22 | 222222 -> 2222,22
   ========================================================= */
function mascaraTwi(el) {
    let d = String(el.value || '').replace(/\D/g, '').replace(/^0+(?=\d{3})/, '').slice(0, 7);
    if (!d) { el.value = ''; return; }
    el.value = d.length <= 2 ? '0,' + d.padStart(2, '0') : d.slice(0, -2) + ',' + d.slice(-2);
}
function lerMm(v) { let n = parseFloat(String(v == null ? '' : v).replace(/\./g, '').replace(',', '.')); return isNaN(n) ? NaN : n; }
function fmtMm(v) { let n = typeof v === 'number' ? v : parseFloat(String(v).replace(',', '.')); return isNaN(n) ? String(v) : n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

/* =========================================================
   PROBLEMAS ENCONTRADOS + PLANO DE AÇÃO
   Junta só o que está com problema: equipamentos, óleos, tacógrafo, graxa,
   mecânica, elétrica/cabine, itens faltantes, extintores, pneus e observações.
   O plano de ação de cada problema fica na aba "Plano_Acao" da planilha.
   ========================================================= */
const EQUIP_PADRAO = [['qtd_carrinhos', 2, 'carrinho', 'carrinhos'], ['qtd_cones', 3, 'cone', 'cones'], ['qtd_calcos', 2, 'calço', 'calços']];
const CAT_PROB = { equip: 'Carrinhos, cones e calços', oleo: 'Trocas de óleo', tacografo: 'Tacógrafo', graxa: 'Engraxada', mecanica: 'Mecânica',
                   eletrica: 'Elétrica, cabine e pneus (geral)', faltantes: 'Itens faltantes', extintor: 'Extintores', pneus: 'Pneus no limite', obs: 'Observações e paradas' };
const ICONE_PROB = { equip: 'ph-traffic-cone', oleo: 'ph-drop', tacografo: 'ph-timer', graxa: 'ph-wrench', mecanica: 'ph-engine', eletrica: 'ph-lightning',
                     faltantes: 'ph-list-checks', extintor: 'ph-fire-extinguisher', pneus: 'ph-tire', obs: 'ph-chat-text' };
const SUGESTAO_PROB = {
    equip: 'Repor os itens que faltam (padrão: 2 carrinhos, 3 cones e 2 calços) e conferir na saída do veículo.',
    oleo: 'Agendar a troca com a oficina e, depois de trocar, atualizar o KM da próxima troca no app.',
    tacografo: 'Agendar a aferição do tacógrafo em posto credenciado e atualizar a data no app.',
    graxa: 'Engraxar o veículo e registrar a data no app (Alertas da Frota > Graxa).',
    mecanica: 'Encaminhar para a oficina para diagnóstico e reparo; avaliar se o veículo pode rodar.',
    eletrica: 'Encaminhar para o eletricista/manutenção e conferir no próximo checklist.',
    faltantes: 'Repor os itens faltantes antes da próxima viagem e conferir no próximo checklist.',
    extintor: 'Recarregar ou trocar o extintor e atualizar a validade no app.',
    pneus: 'Programar troca/rodízio dos pneus no limite e verificar estoque de pneus.',
    obs: 'Conversar com o motorista, avaliar o ponto relatado e definir a solução.'
};
let filtroProblemas = 'abertos'; let filtroPlacaProb = '';
const RESPONSAVEL_PADRAO = 'Antonio Fernando Gimenez'; // quem resolve os problemas (já vem preenchido no plano de ação)

function chkOk(v) {
    v = String(v == null ? '' : v).trim().toUpperCase();
    return !v || v === 'N/A' || v === 'NÃO AVALIADO' || v.indexOf('NÃO APRESENTA') >= 0 || v.indexOf('NAO APRESENTA') >= 0 || v.indexOf('TODOS OS ITENS') >= 0;
}
function obsVazia(v) { v = String(v == null ? '' : v).trim(); return !v || /^(ok|okay|nada|nenhum[a]?( observa[cç][aã]o)?( informada)?\.?|sem obs.*|-+|n\/a|tudo (ok|certo|bem)\.?)$/i.test(v); }
function dataISOde(t) { let m = String(t || '').match(/(\d{2})\/(\d{2})\/(\d{4})/); return m ? `${m[3]}-${m[2]}-${m[1]}` : String(t || '').substring(0, 10); }

function registrarUltimoChecklistLocal(pl) {
    window.ultimosChecklists = window.ultimosChecklists || {};
    let a = new Date(); let pad = n => String(n).padStart(2, '0');
    window.ultimosChecklists[String(pl.placa).toUpperCase()] = { data: `${pad(a.getDate())}/${pad(a.getMonth() + 1)}/${a.getFullYear()} ${pad(a.getHours())}:${pad(a.getMinutes())}`, ts: a.getTime(),
        motorista: pl.motorista, km: pl.km_atual, motor: pl.chk_motor, cambio: pl.chk_cambio, embreagem: pl.chk_embreagem, direcao: pl.chk_direcao, freios: pl.chk_freios,
        suspensao: pl.chk_suspensao, pneus_geral: pl.chk_pneus_geral, eletrica: pl.chk_eletrica, indicadores: pl.chk_indicadores, cabine: pl.chk_cabine,
        faltantes: pl.chk_faltantes, extintores: pl.chk_extintores, parada: pl.chk_parada, obs: pl.chk_obs, placa_carreta: pl.placa_carreta,
        asa_delta: pl.chk_asa_delta, freio_lona: pl.chk_freio_lona, faixas: pl.chk_faixas };
}

function coletarProblemas() {
    let lista = [];
    let add = (placa, cat, chave, titulo, detalhe, prioridade, ts) => lista.push({ id: placa + '|' + chave, placa, cat, categoria: CAT_PROB[cat], titulo, detalhe: detalhe || '', prioridade, ts: ts || 0 });
    placasDaFrota().forEach(p => {
        let v = window.frota[p] || {}, c = (window.ultimosChecklists || {})[p];
        // 1) Carrinhos, cones e calços (só caminhões toco/truck)
        if (TOCOS.includes(p) || TRUCKS.includes(p)) EQUIP_PADRAO.forEach(([campo, min, s1, sN]) => {
            let tem = parseInt(v[campo], 10) || 0;
            if (tem < min) add(p, 'equip', campo, `Faltam ${min - tem} ${min - tem > 1 ? sN : s1}`, `Tem ${tem} de ${min} (padrão: 2 carrinhos, 3 cones, 2 calços)`, 'Média');
        });
        // 2) Óleos (motor, câmbio, diferencial)
        Object.keys(OLEOS).filter(k => OLEOS[k].aplica(p)).forEach(k => {
            let st = calcularStatusAlerta('oleo', p, k);
            if (st.nivel === 'vencido' || st.nivel === 'alerta') add(p, 'oleo', 'oleo_' + k, `Óleo do ${OLEOS[k].nome}: ${st.texto}`, st.detalhe, st.nivel === 'vencido' ? 'Alta' : 'Média');
        });
        // 3) Tacógrafo, graxa e extintor (vencidos ou perto de vencer)
        ['tacografo', 'graxa', 'extintor'].forEach(t => {
            if (!ALERTAS[t].aplica(p)) return;
            let st = calcularStatusAlerta(t, p);
            if (st.nivel === 'vencido' || st.nivel === 'alerta') add(p, t, t, `${ALERTAS[t].nome}: ${st.texto}`, st.detalhe, st.nivel === 'vencido' ? 'Alta' : 'Média');
        });
        // 4) Respostas do ÚLTIMO checklist
        if (c) {
            let origem = `Checklist de ${c.data}${c.motorista ? ' · ' + c.motorista : ''}`;
            [['mecanica', 'motor', 'Motor'], ['mecanica', 'cambio', 'Câmbio'], ['mecanica', 'embreagem', 'Embreagem'], ['mecanica', 'direcao', 'Direção'],
             ['mecanica', 'freios', 'Freios'], ['mecanica', 'suspensao', 'Suspensão'], ['eletrica', 'pneus_geral', 'Pneus (geral)'], ['eletrica', 'eletrica', 'Sistema elétrico'],
             ['eletrica', 'indicadores', 'Indicadores do painel'], ['eletrica', 'cabine', 'Cabine'], ['faltantes', 'faltantes', 'Itens faltantes']].forEach(([cat, campo, nome]) => {
                if (chkOk(c[campo])) return;
                let alta = campo === 'freios' || campo === 'direcao';
                add(p, cat, 'chk_' + campo, `${nome}: ${String(c[campo]).replace(/ \| /g, ', ').replace(/^OUTROS: /, '')}`, origem, alta ? 'Alta' : 'Média', c.ts);
            });
            if (c.placa_carreta) [['asa_delta', 'Asa delta da carreta'], ['freio_lona', 'Freio da lona da carreta'], ['faixas', 'Faixas refletivas da carreta']].forEach(([campo, nome]) => {
                let val = String(c[campo] || '').trim();
                if (val && val !== 'Sim') add(p, 'mecanica', 'chk_' + campo, `${nome}: ${val === 'Não' ? 'não funciona' : val}`, origem + ' · carreta ' + c.placa_carreta, 'Média', c.ts);
            });
            if (/despressuriz/i.test(String(c.extintores || ''))) add(p, 'extintor', 'chk_extintor_pressao', 'Extintor despressurizado / vazio', origem, 'Alta', c.ts);
            if (String(c.parada || '') === 'Sim') add(p, 'obs', 'chk_parada', 'Motorista pediu PARADA URGENTE para revisão', origem, 'Alta', c.ts);
            if (!obsVazia(c.obs)) add(p, 'obs', 'chk_obs', 'Observação do motorista', `"${c.obs}" · ${origem}`, 'Baixa', c.ts);
        }
        // 5) Pneus no limite (última medição)
        let ruins = Object.entries(v.pneus || {}).filter(([pos, pn]) => { let mm = lerMm(pn.milimetros); return /LIMITE/i.test(pn.estado || '') || (mm > 0 && mm < 5); });
        if (ruins.length) add(p, 'pneus', 'pneus', `${ruins.length} pneu${ruins.length > 1 ? 's' : ''} no limite`, ruins.map(([pos, pn]) => `${pos.toUpperCase()} (${pn.milimetros && pn.milimetros !== '---' ? fmtMm(pn.milimetros) + ' mm' : pn.estado})`).join(', '), 'Alta');
    });
    // Junta com os planos salvos
    let hoje = isoData(new Date());
    lista.forEach(i => {
        let pl = (window.planos || {})[i.id] || null; i.plano = pl;
        i.status = pl ? (pl.status || 'Pendente') : 'Sem plano';
        // problema do checklist que voltou a aparecer num checklist DEPOIS de concluído
        if (pl && pl.status === 'Concluído' && i.ts && pl.atualizado_em && i.ts > new Date(pl.atualizado_em).getTime()) i.status = 'Reaberto';
        i.atrasado = !!(pl && pl.data_prevista && pl.data_prevista !== PRAZO_SEM_DEF && pl.data_prevista < hoje && i.status !== 'Concluído');
        i.aberto = i.status !== 'Concluído';
    });
    const peso = { Alta: 0, 'Média': 1, Baixa: 2 }, ordemCat = Object.keys(CAT_PROB);
    return lista.sort((a, b) => (ordemCat.indexOf(a.cat) - ordemCat.indexOf(b.cat)) || (peso[a.prioridade] - peso[b.prioridade]) || a.placa.localeCompare(b.placa));
}

function pontosDeMelhoria(lista) {
    let ab = lista.filter(i => i.aberto), dicas = [];
    let porCat = {}; ab.forEach(i => porCat[i.cat] = (porCat[i.cat] || 0) + 1);
    let porPlaca = {}; ab.forEach(i => porPlaca[i.placa] = (porPlaca[i.placa] || 0) + 1);
    let semPlano = ab.filter(i => i.status === 'Sem plano').length, atrasados = ab.filter(i => i.atrasado).length, altas = ab.filter(i => i.prioridade === 'Alta').length;
    if (altas) dicas.push(`Resolva primeiro os ${altas} problema(s) de prioridade ALTA (vencidos, freios, direção, pneus no limite, paradas urgentes).`);
    if (semPlano) dicas.push(`${semPlano} problema(s) ainda sem plano de ação: defina o que fazer, quem faz e a data.`);
    if (atrasados) dicas.push(`${atrasados} plano(s) com a data vencida: cobre o responsável ou remarque a data.`);
    if ((porCat.graxa || 0) >= 2) dicas.push('Várias graxas vencidas: defina um dia fixo da semana para engraxar a frota toda.');
    if ((porCat.oleo || 0) >= 2) dicas.push('Várias trocas de óleo pendentes: agende em lote com a oficina e, após cada troca, use Atualizar nos Alertas.');
    if (porCat.equip) dicas.push('Falta de carrinhos/cones/calços: monte um kit padrão por caminhão e confira na saída e na volta.');
    if (porCat.pneus) dicas.push('Pneus no limite são risco de acidente e multa: programe a troca e mantenha estoque mínimo de pneus.');
    if ((porCat.extintor || 0) >= 2) dicas.push('Vários extintores vencendo: faça a recarga de todos na mesma data para simplificar o controle.');
    if ((porCat.mecanica || 0) + (porCat.eletrica || 0) >= 3) dicas.push('Muitos problemas mecânicos/elétricos: reserve um horário fixo semanal com a oficina para os reparos do checklist.');
    let top = Object.entries(porPlaca).sort((a, b) => b[1] - a[1]).slice(0, 3).filter(x => x[1] >= 3);
    if (top.length) dicas.push('Veículos com mais problemas: ' + top.map(x => `${x[0]} (${x[1]})`).join(', ') + '. Avalie uma revisão geral neles.');
    let ini = inicioDaSemana(); let feitos = new Set((window.historicoChecklist || []).filter(h => dataDoHistorico(h) >= ini).map(h => String(h.placa).toUpperCase()));
    let semChk = placasDaFrota().filter(p => !EMPILHADEIRAS.includes(p) && !feitos.has(p));
    if (semChk.length) dicas.push(`${semChk.length} veículo(s) sem checklist nesta semana: os problemas deles podem não estar aparecendo aqui.`);
    if (!dicas.length) dicas.push('Nenhum ponto crítico. Continue com os checklists semanais em dia.');
    return dicas;
}

function renderizarTileProblemas() {
    let t = document.getElementById('tile-problemas-qtd'); if (!t) return;
    if (!placasDaFrota().length) { t.textContent = ''; return; }
    let ab = coletarProblemas().filter(i => i.aberto); let altas = ab.filter(i => i.prioridade === 'Alta').length;
    t.innerHTML = ab.length ? `<span class="badge-prob">${ab.length} aberto${ab.length > 1 ? 's' : ''}</span>${altas ? `<span class="badge-prob alta">${altas} alta</span>` : ''}` : '<span class="badge-prob ok">Nenhum problema</span>';
}

function abrirProblemas() {
    esconderTodasTelas(); document.getElementById('tela-problemas').style.display = 'flex';
    renderizarProblemas(); window.scrollTo(0, 0);
}
function filtrarProblemas(f) { filtroProblemas = f; renderizarProblemas(); }
function filtrarPlacaProblemas(p) { filtroPlacaProb = p; renderizarProblemas(); }

function problemasFiltrados(lista) {
    return lista.filter(i => (!filtroPlacaProb || i.placa === filtroPlacaProb) && (
        filtroProblemas === 'todos' ? true :
        filtroProblemas === 'concluidos' ? !i.aberto :
        !i.aberto ? false :
        filtroProblemas === 'alta' ? i.prioridade === 'Alta' :
        filtroProblemas === 'semplano' ? i.status === 'Sem plano' :
        filtroProblemas === 'atrasados' ? i.atrasado : true));
}

function renderizarProblemas() {
    let alvo = document.getElementById('conteudo-problemas'); if (!alvo) return;
    let lista = coletarProblemas(), ab = lista.filter(i => i.aberto);
    let k = { total: ab.length, alta: ab.filter(i => i.prioridade === 'Alta').length, semPlano: ab.filter(i => i.status === 'Sem plano').length, atrasados: ab.filter(i => i.atrasado).length };
    let vis = problemasFiltrados(lista);
    let filtros = [['abertos', `Abertos (${k.total})`], ['alta', `Alta (${k.alta})`], ['semplano', `Sem plano (${k.semPlano})`], ['atrasados', `Atrasados (${k.atrasados})`], ['concluidos', `Concluídos (${lista.length - ab.length})`], ['todos', `Todos (${lista.length})`]];
    let placas = [...new Set(lista.map(i => i.placa))].sort();
    let grupos = {}; vis.forEach(i => (grupos[i.cat] = grupos[i.cat] || []).push(i));
    let fmtBR = d => d === PRAZO_SEM_DEF ? PRAZO_SEM_DEF : (d ? d.split('-').reverse().join('/') : '');
    let corpo = Object.keys(CAT_PROB).filter(c => grupos[c]).map(c => `
        <div class="card grupo-prob"><h3 class="card-titulo"><i class="ph ${ICONE_PROB[c]}"></i> ${CAT_PROB[c]} <small>(${grupos[c].length})</small></h3>
        ${grupos[c].map(i => {
            let pl = i.plano, stCls = i.status === 'Concluído' ? 'ok' : (i.status === 'Sem plano' ? 'sem' : (i.status === 'Reaberto' ? 'reaberto' : 'and'));
            return `<div class="item-prob pri-${i.prioridade === 'Alta' ? 'alta' : (i.prioridade === 'Média' ? 'media' : 'baixa')}">
                <div class="item-prob-topo"><b class="placa-tag">${escHtml(i.placa)}</b><span class="pri-tag">${i.prioridade}</span><span class="st-tag st-${stCls}">${i.status}</span>${i.atrasado ? '<span class="st-tag st-atrasado">Atrasado</span>' : ''}</div>
                <div class="item-prob-titulo">${escHtml(i.titulo)}</div>
                ${i.detalhe ? `<div class="item-prob-det">${escHtml(i.detalhe)}</div>` : ''}
                ${pl && pl.plano_acao ? `<div class="item-prob-plano"><b>Plano:</b> ${escHtml(pl.plano_acao)}<br><small>${pl.responsavel ? 'Resp.: ' + escHtml(pl.responsavel) + ' · ' : ''}${pl.data_prevista ? 'Prazo: ' + fmtBR(pl.data_prevista) : 'Sem prazo'}${pl.data_conclusao ? ' · Concluído em ' + fmtBR(pl.data_conclusao) : ''}</small></div>` : ''}
                <button type="button" class="btn-plano" onclick="editarPlanoAcao('${escHtml(i.id)}')"><i class="ph ph-clipboard-text"></i> ${pl ? 'Editar plano de ação' : 'Criar plano de ação'}</button>
            </div>`; }).join('')}
        </div>`).join('');
    alvo.innerHTML = `
      <div class="kpis">
        <div class="kpi"><small>Abertos</small><b>${k.total}</b><span class="var neutro">${new Set(ab.map(i => i.placa)).size} veículos</span></div>
        <div class="kpi"><small>Prioridade alta</small><b style="color:var(--sem-verm)">${k.alta}</b><span class="var neutro">resolver primeiro</span></div>
        <div class="kpi"><small>Sem plano</small><b style="color:#b45309">${k.semPlano}</b><span class="var ${k.atrasados ? 'sobe-ruim' : 'neutro'}">${k.atrasados} atrasado(s)</span></div>
      </div>
      <div class="card card-pontos"><h3 class="card-titulo"><i class="ph ph-lightbulb"></i> Pontos de melhoria</h3><ul>${pontosDeMelhoria(lista).map(d => `<li>${escHtml(d)}</li>`).join('')}</ul></div>
      <p class="nota-gerente" style="margin:0 0 12px;"><i class="ph ph-clock"></i> O PDF dos problemas é gerado e impresso sozinho toda sexta por volta das 11:30.</p>
      <div class="filtro-grupos">${filtros.map(f => `<button type="button" class="${f[0] === filtroProblemas ? 'ativo' : ''}" onclick="filtrarProblemas('${f[0]}')">${f[1]}</button>`).join('')}</div>
      <select class="input-campo" style="margin-bottom:14px;" onchange="filtrarPlacaProblemas(this.value)"><option value="">Todos os veículos</option>${placas.map(p => `<option value="${p}" ${p === filtroPlacaProb ? 'selected' : ''}>${p}</option>`).join('')}</select>
      ${corpo || `<div class="card"><p class="lista-alertas-vazia"><i class="ph-fill ph-check-circle" style="color:var(--sem-verde); font-size:30px; display:block; margin:0 auto 6px;"></i>Nenhum problema nesta lista.</p></div>`}
      <p class="nota-gerente">Os problemas vêm do último checklist de cada veículo e da ficha técnica (óleos, tacógrafo, graxa, extintor, pneus e carrinhos/cones/calços). Quando o problema é resolvido no checklist ou na ficha, ele sai sozinho daqui.</p>`;
}

const PRAZO_SEM_DEF = 'Sem definição'; // ex.: motor quebrado aguardando peças (prazo indeterminado)
async function editarPlanoAcao(id) {
    let i = coletarProblemas().find(x => x.id === id); if (!i) return;
    let pl = i.plano || {}; let sug = SUGESTAO_PROB[i.cat] || '';
    let amanha = new Date(); amanha.setDate(amanha.getDate() + (i.prioridade === 'Alta' ? 2 : 7));
    let r = await Swal.fire({
        title: `${i.placa} · Plano de ação`, focusConfirm: false, showCancelButton: true, confirmButtonText: 'Salvar', cancelButtonText: 'Cancelar', confirmButtonColor: '#1a4d2e',
        html: `<div style="text-align:left; font-size:13px; background:#f9fafb; border:1px solid #e5e7eb; border-radius:10px; padding:10px; margin-bottom:6px;"><b>${escHtml(i.titulo)}</b>${i.detalhe ? `<br><span style="color:#6b7280">${escHtml(i.detalhe)}</span>` : ''}<br><span style="color:${i.prioridade === 'Alta' ? '#dc2626' : '#b45309'}; font-weight:700;">Prioridade ${i.prioridade}</span></div>
            <label class="swal-campo-label">O que vai ser feito (plano de ação)</label>
            <textarea id="sw-plano" class="swal2-textarea swal-campo" rows="4" placeholder="${escHtml(sug)}">${escHtml(pl.plano_acao || '')}</textarea>
            <button type="button" class="btn-sugestao-km" onclick="document.getElementById('sw-plano').value = ${escHtml(JSON.stringify(sug))};">Usar sugestão</button>
            <label class="swal-campo-label">Responsável</label><input id="sw-resp" class="swal2-input swal-campo" value="${escHtml(pl.responsavel || RESPONSAVEL_PADRAO)}" placeholder="Quem vai resolver">
            <label class="swal-campo-label">Data de realização (prazo)</label><input id="sw-prazo" type="date" class="swal2-input swal-campo" value="${pl.data_prevista && pl.data_prevista !== PRAZO_SEM_DEF ? pl.data_prevista : isoData(amanha)}" ${pl.data_prevista === PRAZO_SEM_DEF ? 'disabled style="opacity:.4"' : ''}>
            <label style="display:flex; align-items:center; gap:8px; font-size:13px; margin:6px 0 0; cursor:pointer;"><input id="sw-semdef" type="checkbox" ${pl.data_prevista === PRAZO_SEM_DEF ? 'checked' : ''} onchange="let d=document.getElementById('sw-prazo'); d.disabled=this.checked; d.style.opacity=this.checked?'.4':'1';"> <b>Sem definição</b> <span style="color:#6b7280">(ex.: aguardando peças)</span></label>
            <label class="swal-campo-label">Status</label><select id="sw-status" class="swal2-select swal-campo" style="display:block;">${['Pendente', 'Em andamento', 'Concluído'].map(s => `<option ${((pl.status || 'Pendente') === s) ? 'selected' : ''}>${s}</option>`).join('')}</select>
            ${['oleo', 'tacografo', 'graxa', 'extintor'].includes(i.cat) ? '<p style="font-size:11px; color:#6b7280; margin:8px 0 0;">Depois de resolver, atualize também a data/KM em Alertas da Frota: assim o problema sai sozinho.</p>' : ''}`,
        preConfirm: () => {
            let plano = document.getElementById('sw-plano').value.trim();
            if (!plano) { Swal.showValidationMessage('Escreva o plano de ação (ou toque em "Usar sugestão")'); return false; }
            return { plano_acao: plano, responsavel: document.getElementById('sw-resp').value.trim(), data_prevista: document.getElementById('sw-semdef').checked ? PRAZO_SEM_DEF : document.getElementById('sw-prazo').value, status: document.getElementById('sw-status').value };
        }
    });
    if (!r.isConfirmed || !r.value) return;
    let novo = Object.assign({ id: i.id, placa: i.placa, categoria: i.categoria, problema: i.titulo + (i.detalhe ? ' - ' + i.detalhe : ''), prioridade: i.prioridade }, r.value);
    if (!(await adicionarNaFila(Object.assign({ acao: 'salvar_plano_acao', usuario: window.usuarioLogado }, novo)))) return;
    window.planos = window.planos || {};
    window.planos[i.id] = Object.assign({}, pl, novo, { atualizado_em: new Date().toISOString(), data_conclusao: novo.status === 'Concluído' ? (pl.data_conclusao || isoData(new Date())) : '' });
    salvarCacheLocal(); renderizarProblemas(); renderizarTileProblemas();
    mostrarToast("<i class='ph ph-check-circle'></i> Plano de ação salvo", "#059669");
}

async function gerarPdfProblemasApp() {
    if (!navigator.onLine) { Swal.fire('Sem internet', 'Para gerar o PDF é preciso internet.', 'warning'); return; }
    let lista = coletarProblemas(), vis = problemasFiltrados(lista);
    if (!vis.length) { Swal.fire('Nada para imprimir', 'Não há problemas nesta lista.', 'info'); return; }
    let janela = window.open('', '_blank');
    if (janela) janela.document.write('<p style="font-family:sans-serif;padding:20px">Gerando o PDF dos problemas...</p>');
    let nomesFiltro = { abertos: 'Problemas abertos', alta: 'Prioridade alta', semplano: 'Sem plano de ação', atrasados: 'Planos atrasados', concluidos: 'Concluídos', todos: 'Todos' };
    let ab = lista.filter(i => i.aberto);
    let fmtBR = d => d === PRAZO_SEM_DEF ? PRAZO_SEM_DEF : (d ? d.split('-').reverse().join('/') : '');
    let dados = { acao: 'pdf_problemas', usuario: window.usuarioLogado, filtro: nomesFiltro[filtroProblemas] + (filtroPlacaProb ? ' · ' + filtroPlacaProb : ''),
        resumo: { total: vis.length, alta: vis.filter(i => i.prioridade === 'Alta').length, veiculos: new Set(vis.map(i => i.placa)).size, semPlano: vis.filter(i => i.status === 'Sem plano').length, atrasados: vis.filter(i => i.atrasado).length },
        pontos: pontosDeMelhoria(lista),
        itens: vis.map(i => ({ placa: i.placa, categoria: i.categoria, titulo: i.titulo, detalhe: i.detalhe, prioridade: i.prioridade, plano: i.plano ? i.plano.plano_acao : '',
                               responsavel: (i.plano && i.plano.responsavel) || RESPONSAVEL_PADRAO, prazo: i.plano ? fmtBR(i.plano.data_prevista) : '', status: i.status })) };
    Swal.fire({ title: 'Gerando PDF...', allowOutsideClick: false, didOpen: () => Swal.showLoading && Swal.showLoading() });
    try {
        let r = await chamarAPI(dados);
        if (!r.sucesso) throw new Error(r.erro || 'Falha ao gerar');
        Swal.close();
        if (janela) janela.location.href = r.link_pdf;
        else Swal.fire({ title: 'PDF pronto', html: `<a href="${r.link_pdf}" target="_blank" style="font-weight:700">Abrir o PDF para imprimir</a>`, icon: 'success' });
    } catch (e) {
        if (janela) janela.close();
        Swal.fire('Não foi possível gerar', escHtml(String(e.message || e).indexOf('não encontrada') >= 0 ? 'O Apps Script ainda está na versão antiga: publique uma Nova versão.' : (e.message || 'Erro')), 'error');
    }
}
