/* =========================================================
   SISTEMA LINCE - CÉREBRO JAVASCRIPT LOCAL (OTIMIZADO)
   ========================================================= */

const API_URL = "https://script.google.com/macros/s/AKfycbxvxiDr82rljfQtwcIVAxVKgBb09QRnS5cdIl2j15m9BjZ3PSaH7olg2RpDzIM2smf5tA/exec";
const CAVALOS = ['FEF7C02', 'GHE3C06', 'FYY7G32']; 
const CARROS = ['CLW4E92', 'UGF2G86', 'FGX2A32'];

window.isCavalo = false; 
window.isCarro = false; 
let urlDocAtual = ""; 
window.frota = {}; 
window.estoqueDiesel = 0; 
window.estoqueArla = 0; 
window.gastoMesGeral = 0;
window.histAbast = { diesel: [], arla: [], cheg_diesel: [], cheg_arla: [] };
window.estoquePecas = [];
window.usuarioLogado = ""; 

const pneusCavalo = [ {id:'dd',n:'DD'}, {id:'de',n:'DE'}, {id:'tde',n:'TDE'}, {id:'tdi',n:'TDI'}, {id:'tee',n:'TEE'}, {id:'tei',n:'TEI'}, {id:'tkde',n:'TKDE'}, {id:'tkdi',n:'TKDI'}, {id:'tkee',n:'TKEE'}, {id:'tkei',n:'TKEI'}, {id:'1step',n:'1º STEP'} ];
const pneusCarreta = [ {id:'c1',n:'C1'}, {id:'c2',n:'C2'}, {id:'c3',n:'C3'}, {id:'c4',n:'C4'}, {id:'c5',n:'C5'}, {id:'c6',n:'C6'}, {id:'c7',n:'C7'}, {id:'c8',n:'C8'}, {id:'c9',n:'C9'}, {id:'c10',n:'C10'}, {id:'2step',n:'2º STEP'} ];
const pneusCarro = [ {id:'dd',n:'DD'}, {id:'de',n:'DE'}, {id:'td',n:'TD'}, {id:'te',n:'TE'} ];

let htmlFichaCavalo = ""; let htmlChkCavalo = "";
let htmlFichaCarreta = ""; let htmlChkCarreta = "";
let htmlFichaCarro = ""; let htmlChkCarro = "";

window.onload = function() {
    let construtorFicha = (arr, isCar) => arr.map(p => `
        <details>
            <summary>${p.n}</summary>
            <div class="pneu-detalhes">
                <div class="linha-info"><span class="info-label" style="margin:0;">Estado:</span> <span class="info-valor" id="${isCar?'carro-':''}estado-${p.id}" style="font-weight:bold;">---</span></div>
                <div class="linha-info"><span class="info-label" style="margin:0;">TWI:</span> <span class="info-valor" id="${isCar?'carro-':''}twi-${p.id}">---</span></div>
                <div class="linha-info" style="margin-top:10px;"><span class="info-label" style="margin:0;">KM Troca:</span> <input type="number" id="${isCar?'carro-':''}km-troca-${p.id}" class="input-editavel travado" value="0" readonly></div>
                <div class="linha-info" style="margin-top:5px;"><span class="info-label" style="margin:0;">Data Troca:</span> <input type="date" id="${isCar?'carro-':''}data-troca-${p.id}" class="input-editavel travado" readonly></div>
                <div class="linha-info" style="margin-top:5px; border-top:1px dashed #ccc; padding-top:5px;"><span class="info-label" style="margin:0;">Próx Rodízio:</span> <span class="info-valor" id="${isCar?'carro-':''}prox-rod-${p.id}">---</span></div>
                <div class="linha-info"><span class="info-label" style="margin:0;">Status Rodízio:</span> <span id="${isCar?'carro-':''}status-rod-${p.id}" style="font-weight:bold;">---</span></div>
            </div>
        </details>
    `).join('');

    let construtorChk = (arr, isCar) => arr.map(p => `
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; border-bottom: 1px dashed #ccc; padding-bottom: 5px;">
            <span style="font-weight: bold; width: 50px; color:${arr===pneusCarreta?'#0056b3':'#333'};">${p.n}</span>
            <input type="number" id="${isCar?'chk-carro-twi-':'chk-twi-'}${p.id}" placeholder="mm" class="input-campo" style="margin:0; width: 80px; padding: 10px; text-align:center;" oninput="calcularStatusTwi(this, '${isCar?'badge-carro-estado-':'badge-estado-'}${p.id}')">
            <span id="${isCar?'badge-carro-estado-':'badge-estado-'}${p.id}" class="twi-estado-badge" style="flex: 1;">Aguardando...</span>
        </div>
    `).join('');

    htmlFichaCavalo = construtorFicha(pneusCavalo, false); htmlChkCavalo = construtorChk(pneusCavalo, false);
    htmlFichaCarreta = construtorFicha(pneusCarreta, false); htmlChkCarreta = construtorChk(pneusCarreta, false);
    htmlFichaCarro = construtorFicha(pneusCarro, true); htmlChkCarro = construtorChk(pneusCarro, true);
};

// ==========================================
// FUNÇÕES DE ASSINATURA (CANVAS)
// ==========================================
let isDrawingPad = false;
function initPad(canvasId) {
    let cvs = document.getElementById(canvasId); if(!cvs) return;
    let ctx = cvs.getContext('2d'); ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.strokeStyle = '#000';
    const getPos = (e) => {
        let rect = cvs.getBoundingClientRect();
        let cX = e.touches ? e.touches[0].clientX : e.clientX; let cY = e.touches ? e.touches[0].clientY : e.clientY;
        return { x: (cX - rect.left) * (cvs.width / rect.width), y: (cY - rect.top) * (cvs.height / rect.height) };
    };
    let start = (e) => { e.preventDefault(); isDrawingPad = true; let p = getPos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); cvs.setAttribute('data-t', '1'); };
    let move = (e) => { e.preventDefault(); if(!isDrawingPad) return; let p = getPos(e); ctx.lineTo(p.x, p.y); ctx.stroke(); };
    let end = (e) => { e.preventDefault(); isDrawingPad = false; };
    cvs.onmousedown = start; cvs.ontouchstart = start;
    cvs.onmousemove = move; cvs.ontouchmove = move;
    cvs.onmouseup = end; cvs.ontouchend = end; cvs.onmouseout = end;
}
function limparPad(canvasId) {
    let cvs = document.getElementById(canvasId); if(!cvs) return;
    let ctx = cvs.getContext('2d'); ctx.fillStyle = "#fff"; ctx.fillRect(0,0,cvs.width,cvs.height); cvs.removeAttribute('data-t');
}
function getPadB64(canvasId) {
    let cvs = document.getElementById(canvasId);
    if(!cvs || !cvs.getAttribute('data-t')) return "";
    return cvs.toDataURL('image/png');
}

function forcarImagemDiretaDrive(url) {
    if (!url || typeof url !== 'string') return "";
    let matchId = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (matchId && matchId[1]) return "https://lh3.googleusercontent.com/d/" + matchId[1];
    let matchId2 = url.match(/id=([a-zA-Z0-9_-]+)/);
    if (matchId2 && matchId2[1]) return "https://lh3.googleusercontent.com/d/" + matchId2[1];
    return url;
}

function esconderTodasTelas() {
    document.getElementById('tela-login').style.display = 'none'; document.getElementById('tela-placas').style.display = 'none';
    document.getElementById('tela-menu').style.display = 'none'; document.getElementById('tela-interna').style.display = 'none';
}

async function fazerLogin() {
    let u = document.getElementById('campo-usuario').value; let s = document.getElementById('campo-senha').value;
    let msg = document.getElementById('mensagem-erro'); let btn = document.getElementById('btn-login');
    if (!u || !s) { msg.innerText = "Preencha usuário e senha!"; msg.style.display = 'block'; return; }
    btn.innerText = "Baixando Dados... ⏳"; msg.style.display = 'none';

    try {
        let req1 = await fetch(`${API_URL}?acao=login&usuario=${u}&senha=${s}`); let res1 = await req1.json();
        if (res1.sucesso) {
            window.usuarioLogado = u; 
            let req2 = await fetch(`${API_URL}?acao=buscar_inicial`); let res2 = await req2.json();
            if (res2.sucesso) {
                window.frota = res2.frota; window.estoqueDiesel = res2.estoque_diesel; window.estoqueArla = res2.estoque_arla; window.gastoMesGeral = res2.gasto_mes_geral; window.histAbast = res2.hist_abast || window.histAbast; window.estoquePecas = res2.estoque_pecas || []; 
                renderizarHistorico(res2.historico); renderizarHistoricoAbast(); renderizarEstoquePecas(); 
                esconderTodasTelas(); document.getElementById('tela-placas').style.display = 'flex';
            } else { msg.innerText = "Erro: " + res2.erro; msg.style.display = 'block'; }
        } else { msg.innerText = "Credenciais incorretas!"; msg.style.display = 'block'; }
    } catch (e) { msg.innerText = "Sem internet."; msg.style.display = 'block'; }
    btn.innerText = "Entrar";
}

function sairDaConta() { window.usuarioLogado = ""; esconderTodasTelas(); document.getElementById('campo-senha').value = ''; document.getElementById('tela-login').style.display = 'flex'; }

function selecionarPlaca(placa) {
    let btnMenu = document.querySelectorAll('#tela-menu .btn-principal');
    try {
        let dados = window.frota[placa];
        if (!dados) return alert("Veículo não encontrado!");
        
        document.getElementById('texto-placa-escolhida').innerText = placa; document.getElementById('texto-placa-interna').innerText = placa; 
        
        window.isCavalo = CAVALOS.includes(placa.trim());
        window.isCarro = CARROS.includes(placa.trim());

        let ctCavalo = document.getElementById('ficha-pneus-cavalo-container'); let chkCavalo = document.getElementById('chk-pneus-cavalo-container');
        let ctCarreta = document.getElementById('ficha-pneus-carreta-container'); let chkCarreta = document.getElementById('chk-pneus-carreta-container');
        let ctCarro = document.getElementById('ficha-pneus-carro-container'); let chkCarro = document.getElementById('chk-pneus-carro-container');

        if (window.isCarro) {
            if(ctCarro) ctCarro.innerHTML = htmlFichaCarro; if(chkCarro) chkCarro.innerHTML = htmlChkCarro;
            if(ctCavalo) ctCavalo.innerHTML = ""; if(chkCavalo) chkCavalo.innerHTML = "";
            if(ctCarreta) ctCarreta.innerHTML = ""; if(chkCarreta) chkCarreta.innerHTML = "";
        } else {
            if(ctCavalo) ctCavalo.innerHTML = htmlFichaCavalo; if(chkCavalo) chkCavalo.innerHTML = htmlChkCavalo;
            if(ctCarreta) ctCarreta.innerHTML = htmlFichaCarreta; if(chkCarreta) chkCarreta.innerHTML = htmlChkCarreta;
            if(ctCarro) ctCarro.innerHTML = ""; if(chkCarro) chkCarro.innerHTML = "";
        }

        document.querySelectorAll('.is-carreta').forEach(el => { el.style.display = window.isCavalo ? 'block' : 'none'; });
        document.querySelectorAll('.esconder-carro').forEach(el => { el.style.display = window.isCarro ? 'none' : 'block'; });
        document.querySelectorAll('.mostrar-carro').forEach(el => { el.style.display = window.isCarro ? 'block' : 'none'; });
        document.querySelectorAll('.esconder-cavalo-chk').forEach(el => { el.style.display = window.isCavalo ? 'none' : 'block'; });

        let selAbast = document.getElementById('tipo-abast');
        if (window.isCarro) { selAbast.innerHTML = `<option value="DIESEL">Abastecer COMBUSTÍVEL no Veículo</option><option value="CHEGADA DE DIESEL">📥 Receber COMBUSTÍVEL (Estoque)</option>`; } 
        else { selAbast.innerHTML = `<option value="DIESEL">Abastecer DIESEL no Caminhão</option><option value="ARLA">Abastecer ARLA no Caminhão</option><option value="CHEGADA DE DIESEL">📥 Receber CHEGADA DE DIESEL</option><option value="CHEGADA DE ARLA">📥 Receber CHEGADA DE ARLA</option>`; }

        let elTipo = document.getElementById('tipo-veiculo'); if(elTipo) elTipo.value = dados.tipo || "";
        let elMotorista = document.getElementById('nome-motorista'); if(elMotorista) elMotorista.value = dados.motorista || "";
        
        let formatNum = v => v ? String(v).replace(/\./g, '').replace(',', '.') : "";
        let elKm = document.getElementById('km-master'); if(elKm) elKm.value = formatNum(dados.km_atual);
        
        let kTroca = "";
        if (dados.km_oleo !== undefined && String(dados.km_oleo).trim() !== "") {
            let nOleo = parseInt(String(dados.km_oleo).replace(/\./g, ''));
            if (!isNaN(nOleo)) kTroca = nOleo;
        }
        let elO = document.getElementById('km-proxima-troca'); if(elO) elO.value = kTroca;
        
        let elT = document.getElementById('data-proxima-afericao'); if(elT) elT.value = dados.data_tacografo || "";
        let elG = document.getElementById('data-engraxada'); if(elG) elG.value = dados.data_graxa || "";
        let elCar = document.getElementById('qtd-carrinhos'); if(elCar) elCar.value = dados.qtd_carrinhos || 0;
        let elCon = document.getElementById('qtd-cones'); if(elCon) elCon.value = dados.qtd_cones || 0;
        let elExt = document.getElementById('data-extintor-ficha'); if(elExt) elExt.value = dados.data_extintor || "";
        
        urlDocAtual = dados.link_documento || "";

        if (dados.pneus) {
            let pIds = window.isCarro ? ['dd','de','td','te'] : ['dd','de','tde','tdi','tee','tei','tkde','tkdi','tkee','tkei','1step','c1','c2','c3','c4','c5','c6','c7','c8','c9','c10','2step'];
            let pref = window.isCarro ? 'carro-' : '';
            pIds.forEach(pos => {
                let pneu = dados.pneus[pos] || {};
                let elEstado = document.getElementById(`${pref}estado-${pos}`); let elTwi = document.getElementById(`${pref}twi-${pos}`);
                let elKmTroca = document.getElementById(`${pref}km-troca-${pos}`); let elDataTroca = document.getElementById(`${pref}data-troca-${pos}`);
                if(elEstado) elEstado.innerText = pneu.estado || "---"; if(elTwi) elTwi.innerText = pneu.milimetros ? pneu.milimetros + " mm" : "---";
                if(elKmTroca) elKmTroca.value = pneu.km_ultima_troca || 0; if(elDataTroca) elDataTroca.value = pneu.data_ultima_troca || "";
            });
        }

        let iL = document.getElementById('ficha-img-lat'); let pL = document.getElementById('ficha-pl-lat');
        if (iL && pL) { 
            document.getElementById('ficha-label-foto-1').innerText = window.isCarro ? "Frente" : "Lateral";
            if (dados.foto_lateral && dados.foto_lateral !== "") { iL.src = forcarImagemDiretaDrive(dados.foto_lateral); iL.style.display = 'block'; pL.style.display = 'none'; } else { iL.style.display = 'none'; pL.style.display = 'flex'; } 
        }
        
        let iT = document.getElementById('ficha-img-tras'); let pT = document.getElementById('ficha-pl-tras');
        if (iT && pT) { 
            document.getElementById('ficha-label-foto-2').innerText = window.isCarro ? "Verso/Traseira" : "Traseira";
            if (dados.foto_traseira && dados.foto_traseira !== "") { iT.src = forcarImagemDiretaDrive(dados.foto_traseira); iT.style.display = 'block'; pT.style.display = 'none'; } else { iT.style.display = 'none'; pT.style.display = 'flex'; } 
        }

        let aK = document.getElementById('aviso-ultimo-km'); if(aK) aK.innerText = dados.km_atual || 0;
        let aG = document.getElementById('abast-gasto-mes'); if(aG) aG.innerText = (dados.gasto_mes || 0) + " L";

        atualizarKMGeral(); calcularTacografo(); calcularGraxa(); calcularExtintor();
        esconderTodasTelas(); document.getElementById('tela-menu').style.display = 'flex';
    } catch(err) { alert("Erro visual: " + err.message); } 
    finally { btnMenu.forEach(btn => { btn.disabled = false; btn.style.opacity = '1'; btn.style.cursor = 'pointer'; }); }
}

function voltarParaPlacas() { esconderTodasTelas(); document.getElementById('tela-placas').style.display = 'flex'; }

function abrirPagina(nomeDaPagina) {
    if(nomeDaPagina === 'Abastecimento' && typeof preencherDataHoraAbast === 'function') { preencherDataHoraAbast(); }
    document.getElementById('titulo-tela-interna').innerText = nomeDaPagina;
    let secoes = document.getElementsByClassName('secao-conteudo');
    for (let i = 0; i < secoes.length; i++) { secoes[i].style.display = 'none'; }
    let secaoAtiva = document.getElementById('conteudo-' + nomeDaPagina);
    if (secaoAtiva) { secaoAtiva.style.display = 'flex'; }
    esconderTodasTelas(); document.getElementById('tela-interna').style.display = 'flex';
}

function voltarParaMenu() { esconderTodasTelas(); document.getElementById('tela-menu').style.display = 'flex'; }

function salvarFichaNaNuvemBackground() {
    let payload = {
        acao: "salvar_ficha_tecnica", usuario: window.usuarioLogado, placa: document.getElementById('texto-placa-interna').innerText,
        tipo: document.getElementById('tipo-veiculo').value, motorista: document.getElementById('nome-motorista').value,   
        km_atual: document.getElementById('km-master').value, km_oleo: document.getElementById('km-proxima-troca').value,
        data_tacografo: window.isCarro ? "" : document.getElementById('data-proxima-afericao').value,
        data_graxa: window.isCarro ? "" : document.getElementById('data-engraxada').value,
        qtd_carrinhos: window.isCarro ? "" : document.getElementById('qtd-carrinhos').value,
        qtd_cones: window.isCarro ? "" : document.getElementById('qtd-cones').value,
        data_extintor: document.getElementById('data-extintor-ficha').value, pneus: {}
    };
    
    let tIds = window.isCarro ? ['dd','de','td','te'] : ['dd','de','tde','tdi','tee','tei','tkde','tkdi','tkee','tkei','1step','c1','c2','c3','c4','c5','c6','c7','c8','c9','c10','2step'];
    let pref = window.isCarro ? 'carro-' : '';
    tIds.forEach(id => { let km = document.getElementById(pref+'km-troca-'+id); let dt = document.getElementById(pref+'data-troca-'+id); if(km && dt) { payload.pneus[id] = { km_ultima_troca: km.value, data_ultima_troca: dt.value }; } });
    
    fetch(API_URL, { method: 'POST', body: JSON.stringify(payload) }).then(res => res.json()).then(d => {
        if(d.sucesso) {
            window.frota[payload.placa].tipo = payload.tipo; window.frota[payload.placa].motorista = payload.motorista; window.frota[payload.placa].km_atual = payload.km_atual; window.frota[payload.placa].km_oleo = payload.km_oleo; window.frota[payload.placa].data_tacografo = payload.data_tacografo; window.frota[payload.placa].data_graxa = payload.data_graxa; window.frota[payload.placa].qtd_carrinhos = payload.qtd_carrinhos; window.frota[payload.placa].qtd_cones = payload.qtd_cones; window.frota[payload.placa].data_extintor = payload.data_extintor;
            for(let id in payload.pneus) { if(!window.frota[payload.placa].pneus[id]) window.frota[payload.placa].pneus[id] = {}; window.frota[payload.placa].pneus[id].km_ultima_troca = payload.pneus[id].km_ultima_troca; window.frota[payload.placa].pneus[id].data_ultima_troca = payload.pneus[id].data_ultima_troca; }
            let elAv = document.getElementById('aviso-ultimo-km'); if(elAv) elAv.innerText = payload.km_atual;
        }
    });
}

function atualizarKMGeral() { document.getElementById('km-atual-oleo').innerText = document.getElementById('km-master').value; calcularOleo(); calcularRodizioPneus(); }
function alternarEdicaoHeader() { let c = [document.getElementById('tipo-veiculo'), document.getElementById('nome-motorista'), document.getElementById('km-master')]; let b = document.getElementById('btn-editar-header'); if (c[0].hasAttribute('readonly')) { c.forEach(x => { x.removeAttribute('readonly'); x.classList.remove('travado'); }); b.innerHTML = "💾 Salvar"; b.style.backgroundColor = "#1a4d2e"; b.style.color = "white"; c[0].focus(); } else { c.forEach(x => { x.setAttribute('readonly', 'true'); x.classList.add('travado'); }); b.innerHTML = "✏️ Editar"; b.style.backgroundColor = "transparent"; b.style.color = "#1a4d2e"; atualizarKMGeral(); salvarFichaNaNuvemBackground(); } }
function alternarEdicaoOleo() { let c = document.getElementById('km-proxima-troca'); let b = document.getElementById('btn-editar-oleo'); if (c.hasAttribute('readonly')) { c.removeAttribute('readonly'); c.classList.remove('travado'); b.innerHTML = "💾 Salvar"; b.style.backgroundColor = "#1a4d2e"; b.style.color = "white"; } else { c.setAttribute('readonly', 'true'); c.classList.add('travado'); b.innerHTML = "✏️ Editar"; b.style.backgroundColor = "transparent"; b.style.color = "#1a4d2e"; calcularOleo(); salvarFichaNaNuvemBackground(); } }

function calcularOleo() { 
    let kmA = parseFloat(document.getElementById('km-master').value) || 0; 
    let kmP = parseFloat(document.getElementById('km-proxima-troca').value) || 0; 
    let kmF = kmP - kmA; 
    let txt = document.getElementById('status-oleo'); 
    if (kmP === 0) { txt.innerHTML = "---"; return; }
    if (kmF <= 0) { txt.innerHTML = `VENCIDO (${Math.abs(kmF)} KM) ❌`; txt.style.color = "red"; } 
    else if (kmF <= 1500) { txt.innerHTML = `Faltam ${kmF} KM ⚠️`; txt.style.color = "#d4a017"; } 
    else { txt.innerHTML = `Faltam ${kmF} KM ✅`; txt.style.color = "green"; } 
}

function alternarEdicaoTacografo() { let c = document.getElementById('data-proxima-afericao'); let b = document.getElementById('btn-editar-tacografo'); if (c.hasAttribute('readonly')) { c.removeAttribute('readonly'); c.classList.remove('travado'); b.innerHTML = "💾 Salvar"; b.style.backgroundColor = "#1a4d2e"; b.style.color = "white"; } else { c.setAttribute('readonly', 'true'); c.classList.add('travado'); b.innerHTML = "✏️ Editar"; b.style.backgroundColor = "transparent"; b.style.color = "#1a4d2e"; calcularTacografo(); salvarFichaNaNuvemBackground(); } }
function calcularTacografo() { let s = document.getElementById('data-proxima-afericao').value; let t = document.getElementById('status-tacografo'); if (!s || s.length < 8 || !s.includes('-')) { if(t) t.innerHTML = "---"; let dU = document.getElementById('data-ultima-afericao'); if(dU) dU.innerText = "--/--/----"; return; } let p = s.split('-'); let px = new Date(p[0], p[1] - 1, p[2]); let ul = new Date(px); ul.setFullYear(ul.getFullYear() - 2); document.getElementById('data-ultima-afericao').innerText = `${String(ul.getDate()).padStart(2,'0')}/${String(ul.getMonth()+1).padStart(2,'0')}/${ul.getFullYear()}`; let hj = new Date(); hj.setHours(0,0,0,0); let d = Math.ceil((px.getTime() - hj.getTime()) / (1000 * 3600 * 24)); if (d < 0) { t.innerHTML = `VENCIDO há ${Math.abs(d)} dias ❌`; t.style.color = "red"; } else if (d <= 30) { t.innerHTML = `Atenção: Faltam ${d} dias ⚠️`; t.style.color = "#d4a017"; } else { t.innerHTML = `Faltam ${d} dias ✅`; t.style.color = "green"; } }
function alternarEdicaoPneus() { let pref = window.isCarro ? 'carro-' : ''; let i = document.querySelectorAll(`#conteudo-Ficha\\ Técnica input[id^="${pref}km-troca-"], #conteudo-Ficha\\ Técnica input[id^="${pref}data-troca-"]`); let b = document.getElementById('btn-editar-pneus'); if (i[0].hasAttribute('readonly')) { i.forEach(c => { c.removeAttribute('readonly'); c.classList.remove('travado'); }); b.innerHTML = "💾 Salvar Pneus"; b.style.backgroundColor = "#1a4d2e"; b.style.color = "white"; } else { i.forEach(c => { c.setAttribute('readonly', 'true'); c.classList.add('travado'); }); b.innerHTML = "✏️ Editar Pneus"; b.style.backgroundColor = "transparent"; b.style.color = "#1a4d2e"; if(!window.isCarro) calcularRodizioPneus(); salvarFichaNaNuvemBackground(); } }
function calcularRodizioPneus() { let pl = document.getElementById('texto-placa-interna').innerText; let kmM = parseInt(document.getElementById('km-master').value) || 0; let bN = ['FMR4I10', 'FQY6B30', 'TKR8I49', 'TLL8H30', 'TLY0G57', 'UDN0J81', 'UPS1J80', 'UPX9D25', 'URT4E79', 'URU3F36'].includes(pl) ? 10000 : 15000; let bR = ['FMR4I10', 'FQY6B30', 'TKR8I49', 'TLL8H30', 'TLY0G57', 'UDN0J81', 'UPS1J80', 'UPX9D25', 'URT4E79', 'URU3F36'].includes(pl) ? 25000 : 30000; let tIds = ['dd','de','tde','tdi','tee','tei','tkde','tkdi','tkee','tkei','1step','c1','c2','c3','c4','c5','c6','c7','c8','c9','c10','2step']; tIds.forEach(p => { let sE = document.getElementById(`estado-${p}`); let tS = document.getElementById(`status-rod-${p}`); let iK = document.getElementById(`km-troca-${p}`); if(!sE || !tS || !iK) return; let eS = sE.innerText.toLowerCase(); let kT = parseInt(iK.value) || 0; if (eS === "---" || kT === 0) { tS.innerText = "Aguardando..."; tS.style.color = "gray"; return; } let int = eS.includes('novo') ? bN : bR; let kPR = kT + int; let ePR = document.getElementById(`prox-rod-${p}`); if(ePR) ePR.innerText = kPR + " KM"; let kF = kPR - kmM; if (kF <= 0) { tS.innerHTML = `VENCIDO (${Math.abs(kF)} KM) ❌`; tS.style.color = "red"; } else if (kF <= 1500) { tS.innerHTML = `Faltam ${kF} KM ⚠️`; tS.style.color = "#d4a017"; } else { tS.innerHTML = `Faltam ${kF} KM ✅`; tS.style.color = "green"; } }); }
function alternarEdicaoEquip() { let c = [document.getElementById('qtd-carrinhos'), document.getElementById('qtd-cones'), document.getElementById('data-extintor-ficha')]; let b = document.getElementById('btn-editar-equip'); if (c[0].hasAttribute('readonly')) { c.forEach(x => { x.removeAttribute('readonly'); x.classList.remove('travado'); }); b.innerHTML = "💾 Salvar"; b.style.backgroundColor = "#1a4d2e"; b.style.color = "white"; } else { c.forEach(x => { x.setAttribute('readonly', 'true'); x.classList.add('travado'); }); b.innerHTML = "✏️ Editar"; b.style.backgroundColor = "transparent"; b.style.color = "#1a4d2e"; calcularExtintor(); salvarFichaNaNuvemBackground(); } }
function calcularExtintor() { let s = document.getElementById('data-extintor-ficha').value; let t = document.getElementById('status-extintor'); if (!s || s.length < 8) { if(t) t.innerHTML = "---"; return; } let p = s.split('-'); let px = new Date(p[0], p[1] - 1, p[2]); let hj = new Date(); hj.setHours(0,0,0,0); let d = Math.ceil((px.getTime() - hj.getTime()) / (1000 * 3600 * 24)); if (d < 0) { t.innerHTML = `VENCIDO há ${Math.abs(d)} dias ❌`; t.style.color = "red"; } else if (d <= 30) { t.innerHTML = `Atenção: Vence em ${d} dias ⚠️`; t.style.color = "#d4a017"; } else { t.innerHTML = `Válido por ${d} dias ✅`; t.style.color = "green"; } }
function alternarEdicaoAbast() { let c = [document.getElementById('abast-km-ant'), document.getElementById('abast-km-atual'), document.getElementById('abast-litros'), document.getElementById('data-engraxada')]; let b = document.getElementById('btn-editar-abast'); if (c[0].hasAttribute('readonly')) { c.forEach(x => { x.removeAttribute('readonly'); x.classList.remove('travado'); }); b.innerHTML = "💾 Salvar"; b.style.backgroundColor = "#1a4d2e"; b.style.color = "white"; } else { c.forEach(x => { x.setAttribute('readonly', 'true'); x.classList.add('travado'); }); b.innerHTML = "✏️ Editar"; b.style.backgroundColor = "transparent"; b.style.color = "#1a4d2e"; calcularAbastecimento(); calcularGraxa(); salvarFichaNaNuvemBackground(); } }
function calcularAbastecimento() { let kA = parseFloat(document.getElementById('abast-km-ant').value) || 0; let kU = parseFloat(document.getElementById('abast-km-atual').value) || 0; let l = parseFloat(document.getElementById('abast-litros').value) || 0; let t = document.getElementById('abast-media'); if (l > 0 && kU > kA) t.innerText = ((kU - kA) / l).toFixed(2) + " km/L"; else t.innerText = "0.00 km/L"; }
function calcularGraxa() { let s = document.getElementById('data-engraxada').value; let t = document.getElementById('status-graxa'); if (!s || s.length < 8) { if(t) t.innerHTML = "---"; document.getElementById('data-prox-engraxada').innerText = "--/--/----"; return; } let p = s.split('-'); let ultima = new Date(p[0], p[1] - 1, p[2]); let proxima = new Date(ultima); proxima.setDate(proxima.getDate() + 30); document.getElementById('data-prox-engraxada').innerText = `${String(proxima.getDate()).padStart(2,'0')}/${String(proxima.getMonth()+1).padStart(2,'0')}/${proxima.getFullYear()}`; let h = new Date(); h.setHours(0,0,0,0); let d = Math.ceil((proxima.getTime() - h.getTime()) / (1000 * 3600 * 24)); if (d < 0) { t.innerHTML = `VENCIDO há ${Math.abs(d)} dias ❌`; t.style.color = "red"; } else if (d <= 5) { t.innerHTML = `Atenção: Faltam ${d} dias ⚠️`; t.style.color = "#d4a017"; } else { t.innerHTML = `Faltam ${d} dias ✅`; t.style.color = "green"; } }
function abrirDocPDF() { if (urlDocAtual && urlDocAtual.trim() !== "") window.open(urlDocAtual, '_blank'); else alert("Nenhum documento cadastrado para este veículo."); }

function renderizarHistoricoAbast() { let construtorHTML = (lista, isChegada) => { if (!lista || lista.length === 0) return "<p style='color:#666; font-size:12px; margin:0;'>Nenhum registro encontrado.</p>"; return lista.map(i => `<div style="display:flex; justify-content:space-between; padding:5px 0; border-bottom:1px solid #eee; font-size:12px;"><span>📅 ${i.data} ${isChegada ? '' : `- <b>${i.placa}</b>`}</span><span style="font-weight:bold; color:${isChegada ? '#1a4d2e' : '#b30000'};">${isChegada ? '+' : '-'} ${i.litros} L</span></div>`).join(''); }; let eD = document.getElementById('hist-abast-diesel'); if(eD) eD.innerHTML = construtorHTML(window.histAbast.diesel, false); let eA = document.getElementById('hist-abast-arla'); if(eA) eA.innerHTML = construtorHTML(window.histAbast.arla, false); let eCD = document.getElementById('hist-cheg-diesel'); if(eCD) eCD.innerHTML = construtorHTML(window.histAbast.cheg_diesel, true); let eCA = document.getElementById('hist-cheg-arla'); if(eCA) eCA.innerHTML = construtorHTML(window.histAbast.cheg_arla, true); }
function mudarFormAbast() { let t = document.getElementById('tipo-abast').value; if (t.includes("CHEGADA")) { document.getElementById('form-abast-veiculo').style.display = 'none'; document.getElementById('form-abast-chegada').style.display = 'block'; } else { document.getElementById('form-abast-veiculo').style.display = 'block'; document.getElementById('form-abast-chegada').style.display = 'none'; } }
function preencherDataHoraAbast() { let n = new Date(); let hL = new Date(n.getTime() - (n.getTimezoneOffset() * 60000)).toISOString().slice(0,16); let eA = document.getElementById('abast-data'); if(eA) eA.value = hL; let eC = document.getElementById('chegada-data'); if(eC) eC.value = hL; document.getElementById('estoque-diesel-geral').innerText = window.estoqueDiesel + " L"; document.getElementById('estoque-arla-geral').innerText = window.estoqueArla + " L"; document.getElementById('gasto-mes-geral').innerText = window.gastoMesGeral + " L"; }
async function salvarAbastecimentoNuvem() { let t = document.getElementById('tipo-abast').value; let pl = document.getElementById('texto-placa-interna').innerText; let p = { acao: "salvar_abastecimento", usuario: window.usuarioLogado, tipo: t, placa: t.includes("CHEGADA") ? "ESTOQUE" : pl }; if (t.includes("CHEGADA")) { p.data = document.getElementById('chegada-data').value; p.litros = parseFloat(document.getElementById('chegada-litros').value) || 0; p.nf = document.getElementById('chegada-nf').value; p.km = ""; p.motorista = ""; p.responsavel = ""; if (!p.data || !p.litros || !p.nf) return alert("❌ Preencha Data, Litros e NF!"); } else { p.data = document.getElementById('abast-data').value; p.km = parseFloat(document.getElementById('abast-km-novo').value) || 0; p.litros = parseFloat(document.getElementById('abast-litros-bomba').value) || 0; p.motorista = document.getElementById('abast-motorista').value; p.responsavel = document.getElementById('abast-resp').value; p.nf = ""; let kU = parseFloat(document.getElementById('aviso-ultimo-km').innerText) || 0; if (!p.data || !p.km || !p.litros || !p.motorista || !p.responsavel) return alert("❌ Preencha todos os campos do Abastecimento!"); if (p.km < kU) return alert(`❌ O KM digitado (${p.km}) não pode ser MENOR que o último (${kU})!`); } let b = document.getElementById('btn-salvar-abast-nuvem'); b.innerText = "Salvando... ⏳"; b.disabled = true; try { let req = await fetch(API_URL, { method: 'POST', body: JSON.stringify(p) }); let res = await req.json(); if (res.sucesso) { alert("✅ Salvo com sucesso!"); document.getElementById('abast-km-novo').value = ""; document.getElementById('abast-litros-bomba').value = ""; document.getElementById('chegada-litros').value = ""; document.getElementById('chegada-nf').value = ""; let hj = new Date(); let hjStr = String(hj.getDate()).padStart(2,'0') + '/' + String(hj.getMonth()+1).padStart(2,'0') + '/' + hj.getFullYear(); let newItem = { data: hjStr, placa: pl, litros: p.litros }; if (!t.includes("CHEGADA")) { window.frota[pl].km_atual = p.km; document.getElementById('km-master').value = p.km; document.getElementById('aviso-ultimo-km').innerText = p.km; atualizarKMGeral(); if(t === "DIESEL") { window.frota[pl].gasto_mes = (window.frota[pl].gasto_mes || 0) + p.litros; document.getElementById('abast-gasto-mes').innerText = window.frota[pl].gasto_mes + " L"; window.estoqueDiesel -= p.litros; window.gastoMesGeral += p.litros; window.histAbast.diesel.unshift(newItem); window.histAbast.diesel = window.histAbast.diesel.slice(0, 24); } if(t === "ARLA") { window.estoqueArla -= p.litros; window.histAbast.arla.unshift(newItem); window.histAbast.arla = window.histAbast.arla.slice(0, 24); } } else { if(t === "CHEGADA DE DIESEL") { window.estoqueDiesel += p.litros; window.histAbast.cheg_diesel.unshift(newItem); window.histAbast.cheg_diesel = window.histAbast.cheg_diesel.slice(0, 3); } if(t === "CHEGADA DE ARLA") { window.estoqueArla += p.litros; window.histAbast.cheg_arla.unshift(newItem); window.histAbast.cheg_arla = window.histAbast.cheg_arla.slice(0, 3); } } preencherDataHoraAbast(); renderizarHistoricoAbast(); } else { alert("❌ Erro: " + res.erro); } } catch (e) { alert("❌ Erro de conexão."); } b.innerText = "💾 Salvar Lançamento"; b.disabled = false; }

function renderizarEstoquePecas() { let container = document.getElementById('lista-estoque-atual'); let comboMov = document.getElementById('est-item'); let comboCompra = document.getElementById('compra-item'); if(!container || !comboMov || !comboCompra) return; if (!window.estoquePecas || window.estoquePecas.length === 0) { container.innerHTML = "<p style='text-align:center; color:#666;'>Nenhuma peça cadastrada no estoque.</p>"; return; } let htmlStr = ""; let comboStr = ""; window.estoquePecas.forEach((peca, index) => { htmlStr += `<div style="border-bottom: 1px dashed #ccc; padding: 10px 0; margin-bottom: 5px;"><div style="font-weight:bold; color:#1a4d2e; margin-bottom:5px; font-size:14px;">${peca.item}</div><div style="display:flex; justify-content:space-between; gap:5px;"><div style="flex:1;"><span class="info-label" style="font-size:11px; margin:0; display:block;">Qtd Estoque:</span><input type="number" id="est-edit-qtd-${index}" class="input-editavel travado est-edit-input" value="${peca.qtd || 0}" readonly style="width:100%;"></div><div style="flex:1;"><span class="info-label" style="font-size:11px; margin:0; display:block;">Vlr Pago (R$):</span><input type="number" id="est-edit-valor-${index}" class="input-editavel travado est-edit-input" value="${peca.valor || 0}" readonly style="width:100%;"></div></div><div style="margin-top:5px;"><span class="info-label" style="font-size:11px; margin:0; display:block;">Data Últ. Compra:</span><input type="date" id="est-edit-data-${index}" class="input-editavel travado est-edit-input" value="${peca.data_compra || ''}" readonly style="width:100%;"></div></div>`; comboStr += `<option value="${index}">${peca.item}</option>`; }); comboMov.innerHTML = comboStr; comboCompra.innerHTML = comboStr; container.innerHTML = htmlStr; }
function alternarEdicaoEstoque() { let inputs = document.querySelectorAll('.est-edit-input'); let btn = document.getElementById('btn-editar-estoque'); if (!inputs || inputs.length === 0) return; if (inputs[0].hasAttribute('readonly')) { inputs.forEach(x => { x.removeAttribute('readonly'); x.classList.remove('travado'); }); btn.innerHTML = "💾 Salvar"; btn.style.backgroundColor = "#1a4d2e"; btn.style.color = "white"; } else { inputs.forEach(x => { x.setAttribute('readonly', 'true'); x.classList.add('travado'); }); btn.innerHTML = "✏️ Editar"; btn.style.backgroundColor = "transparent"; btn.style.color = "#1a4d2e"; salvarEdicaoEstoqueNuvem(); } }
async function salvarEdicaoEstoqueNuvem() { let pecasEditadas = {}; window.estoquePecas.forEach((peca, index) => { let nQtd = document.getElementById(`est-edit-qtd-${index}`).value; let nData = document.getElementById(`est-edit-data-${index}`).value; let nValor = document.getElementById(`est-edit-valor-${index}`).value; peca.qtd = nQtd; peca.data_compra = nData; peca.valor = nValor; pecasEditadas[peca.item] = { qtd: nQtd, data_compra: nData, valor: nValor }; }); let payload = { acao: "editar_estoque", usuario: window.usuarioLogado, pecas: pecasEditadas }; fetch(API_URL, { method: 'POST', body: JSON.stringify(payload) }).then(res => res.json()).then(d => { if(d.sucesso) { console.log("Estoque atualizado."); } else { alert("Erro ao editar estoque."); } }); }
function mudarFormEstoque() { let t = document.getElementById('est-tipo').value; document.getElementById('div-est-placa').style.display = t === "SAÍDA" ? "block" : "none"; document.getElementById('div-est-compra').style.display = t === "ENTRADA" ? "block" : "none"; }
async function salvarMovimentacaoEstoque() { let idItem = document.getElementById('est-item').value; let tipo = document.getElementById('est-tipo').value; let qtd = document.getElementById('est-qtd').value; let placa = document.getElementById('est-placa').value; let valor = document.getElementById('est-valor').value; let link = document.getElementById('est-link').value; let resp = document.getElementById('est-resp') ? document.getElementById('est-resp').value : window.usuarioLogado; if(!qtd) return alert("❌ Digite a quantidade!"); let peca = window.estoquePecas[idItem]; let n = new Date(); let hL = new Date(n.getTime() - (n.getTimezoneOffset() * 60000)).toISOString().slice(0,16); let p = { acao: "salvar_estoque", usuario: window.usuarioLogado, data: hL.replace('T', ' '), item: peca.item, tipo: tipo, qtd: qtd, placa: tipo === "SAÍDA" ? placa : "", valor: tipo === "ENTRADA" ? valor : "", link: tipo === "ENTRADA" ? link : "", responsavel: resp }; let btn = document.getElementById('btn-salvar-mov-est'); btn.innerText = "Salvando... ⏳"; btn.disabled = true; try { let req = await fetch(API_URL, { method: 'POST', body: JSON.stringify(p) }); let res = await req.json(); if (res.sucesso) { alert("✅ Movimentação salva com sucesso!"); let q = parseFloat(qtd); if (tipo === "SAÍDA") { peca.qtd = parseFloat(peca.qtd) - q; } if (tipo === "ENTRADA") { peca.qtd = parseFloat(peca.qtd) + q; if(valor) peca.valor = valor; if(q) peca.qtd_compra = q; if(link) peca.link = link; peca.data_compra = p.data.substring(0,10); } renderizarEstoquePecas(); document.getElementById('est-qtd').value = ""; document.getElementById('est-placa').value = ""; document.getElementById('est-valor').value = ""; document.getElementById('est-link').value = ""; } else { alert("❌ Erro: " + res.erro); } } catch (e) { alert("❌ Erro de conexão."); } btn.innerText = "💾 Salvar Movimentação"; btn.disabled = false; }
async function gerarSolicitacaoCompra() { let idItem = document.getElementById('compra-item').value; let qtd = document.getElementById('compra-qtd').value; let urgencia = document.getElementById('compra-urgencia').value; if(!qtd) return alert("❌ Digite a quantidade que precisa comprar!"); let peca = window.estoquePecas[idItem]; let n = new Date(); let hL = new Date(n.getTime() - (n.getTimezoneOffset() * 60000)).toISOString(); let p = { acao: "solicitar_compra", usuario: window.usuarioLogado, data: hL, item: peca.item, qtd: qtd, urgencia: urgencia, qtd_ref: peca.qtd_compra, valor_ref: peca.valor, link_ref: peca.link }; let btn = document.getElementById('btn-gerar-compra'); btn.innerText = "Gerando PDF... ⏳"; btn.disabled = true; try { let req = await fetch(API_URL, { method: 'POST', body: JSON.stringify(p) }); let res = await req.json(); if (res.sucesso) { alert("✅ Pedido de Compra gerado com sucesso!"); window.open(res.link_pdf, '_blank'); document.getElementById('compra-qtd').value = ""; } else { alert("❌ Erro: " + res.erro); } } catch (e) { alert("❌ Erro de conexão."); } btn.innerText = "📄 Gerar Pedido de Compra (PDF)"; btn.disabled = false; }

function renderizarHistorico(d) { let c = document.getElementById('container-historico'); c.innerHTML = ""; if (!d || d.length === 0) { c.innerHTML = "<p style='text-align:center; color:#666;'>Nenhum checklist registrado ainda.</p>"; return; } d.forEach(i => { let v = document.createElement('div'); v.className = "historico-item"; v.innerHTML = `<span style="font-weight: bold; color: #1a4d2e;">${i.placa}</span> <span style="color: #555; font-size: 12px;">${String(i.data).split('T')[0]} ✅</span>`; c.appendChild(v); }); }

function iniciarNovoChecklist() { 
    let pl = document.getElementById('texto-placa-interna').innerText; 
    document.getElementById('lista-historico-checklist').style.display = 'none'; 
    document.querySelectorAll('input[type="checkbox"]').forEach(c => c.checked = false); 
    document.querySelectorAll('input[id$="-outro"]').forEach(c => { c.value = ""; c.style.display = 'none'; }); 
    document.querySelectorAll('input[id^="chk-twi-"], input[id^="chk-carro-twi-"]').forEach(i => i.value = ""); 
    document.querySelectorAll('.twi-estado-badge').forEach(b => { b.innerText = "Aguardando..."; b.style.backgroundColor = "#eee"; b.style.color = "#666"; }); 
    
    b64Lateral = ""; b64Traseira = ""; 
    ['foto-lat-input', 'foto-tras-input', 'foto-frente-input', 'foto-verso-input'].forEach(id => {let i=document.getElementById(id); if(i) i.value="";});
    ['preview-lat', 'preview-tras', 'preview-frente', 'preview-verso'].forEach(id => {let p=document.getElementById(id); if(p) p.style.display="none";});

    let mA = new Date().toISOString().slice(0, 7); 
    let ve = window.frota[pl]; 

    if (!window.isCarro) {
        document.getElementById('form-novo-checklist').style.display = 'block'; 
        document.getElementById('form-novo-checklist-carro').style.display = 'none'; 

        let cF = document.getElementById('container-inputs-fotos'); let aF = document.getElementById('aviso-fotos-ok'); let sF = document.getElementById('sessao-fotos-checklist');
        if (window.isCavalo) { if(sF) sF.style.display = 'none'; } 
        else { if(sF) sF.style.display = 'block'; if(cF && aF) { if (ve && ve.mes_foto === mA) { cF.style.display = 'none'; aF.style.display = 'block'; } else { cF.style.display = 'block'; aF.style.display = 'none'; } } }
        
        document.getElementById('chk-placa').value = pl; document.getElementById('chk-modelo').value = document.getElementById('tipo-veiculo').value; 
        document.getElementById('chk-motorista').value = document.getElementById('nome-motorista').value; document.getElementById('chk-km').value = document.getElementById('km-master').value; 
        document.getElementById('chk-km-oleo').value = document.getElementById('km-proxima-troca').value; document.getElementById('chk-data-taco').value = document.getElementById('data-proxima-afericao').value; 
        document.getElementById('chk-data-graxa').value = document.getElementById('data-engraxada').value; document.getElementById('chk-extintor-data').value = document.getElementById('data-extintor-ficha').value; 
        
        document.getElementById('chk-qtd-carrinhos').value = document.getElementById('qtd-carrinhos').value;
        document.getElementById('chk-qtd-cones').value = document.getElementById('qtd-cones').value;

        limparPad('ass-mot-cam'); limparPad('ass-ger-cam');
        initPad('ass-mot-cam'); initPad('ass-ger-cam');
        mudarAbaChecklist(1); 
    } else {
        document.getElementById('form-novo-checklist').style.display = 'none'; 
        document.getElementById('form-novo-checklist-carro').style.display = 'block'; 
        
        let cFc = document.getElementById('container-inputs-fotos-carro'); let aFc = document.getElementById('aviso-fotos-ok-carro');
        if(cFc && aFc) { if (ve && ve.mes_foto === mA) { cFc.style.display = 'none'; aFc.style.display = 'block'; } else { cFc.style.display = 'block'; aFc.style.display = 'none'; } }
        
        document.getElementById('chk-carro-placa').value = pl; document.getElementById('chk-carro-modelo').value = document.getElementById('tipo-veiculo').value; 
        document.getElementById('chk-carro-motorista').value = document.getElementById('nome-motorista').value; document.getElementById('chk-carro-km').value = document.getElementById('km-master').value; 
        document.getElementById('chk-carro-oleo').value = document.getElementById('km-proxima-troca').value; document.getElementById('chk-carro-extintor-data').value = document.getElementById('data-extintor-ficha').value;
        
        limparPad('ass-mot-car'); limparPad('ass-ger-car');
        initPad('ass-mot-car'); initPad('ass-ger-car');
    }
}

function cancelarChecklist() { document.getElementById('form-novo-checklist').style.display = 'none'; document.getElementById('form-novo-checklist-carro').style.display = 'none'; document.getElementById('lista-historico-checklist').style.display = 'block'; }
function mudarAbaChecklist(ps) { for(let i=1; i<=4; i++) { let pt = document.getElementById('passo-chk-'+i); if(pt) pt.style.display = 'none'; let tb = document.getElementById('tab-chk-'+i); if(tb) tb.classList.remove('ativo'); } let pA = document.getElementById('passo-chk-'+ps); if(pA) pA.style.display = 'block'; let tA = document.getElementById('tab-chk-'+ps); if(tA) tA.classList.add('ativo'); }

function avancarPasso(px) {
    let pA = px - 1; 
    if (pA === 1) { 
        if(window.isCavalo && !document.getElementById('chk-placa-carreta').value) return alert("❌ Selecione a Placa da Carreta!"); 
        if(!document.getElementById('chk-modelo').value || !document.getElementById('chk-motorista').value || !document.getElementById('chk-km').value) return alert("❌ Preencha os campos obrigatórios!"); 
        if(!window.isCavalo) { if(!document.getElementById('chk-qtd-carrinhos').value || !document.getElementById('chk-qtd-cones').value) return alert("❌ Preencha a Quantidade de Carrinhos e Cones!"); }
    }
    if (pA === 2) { 
        let gM = ['chk-motor', 'chk-cambio', 'chk-embreagem', 'chk-direcao', 'chk-freios', 'chk-suspensao']; 
        for (let g of gM) { if (document.querySelectorAll(`input[name="${g}"]:checked`).length === 0) return alert(`❌ Faltou preencher as sessões de Mecânica!`); } 
        if (window.isCavalo) { if (!document.getElementById('chk-asa').value || !document.getElementById('chk-freio-lona').value || !document.getElementById('chk-faixas').value) return alert("❌ Responda as perguntas da Carreta!"); } 
    }
    if (pA === 3) { 
        let gE = ['chk-pneus_geral', 'chk-eletrica', 'chk-indicadores', 'chk-cabine']; 
        for (let g of gE) { if (document.querySelectorAll(`input[name="${g}"]:checked`).length === 0) return alert(`❌ Faltou preencher as sessões de Cabine/Elétrica!`); } 
    }
    mudarAbaChecklist(px);
}

function verificarOutro(ck, idC) { let cp = document.getElementById(idC); if (ck.value === "OUTRO" && ck.checked) { cp.style.display = 'block'; cp.focus(); } else if (ck.value === "OUTRO" && !ck.checked) { cp.style.display = 'none'; cp.value = ''; } }
function verificarOutroSelect(sl, idC) { let cp = document.getElementById(idC); if(sl.value === "OUTRO") { cp.style.display = 'block'; cp.focus(); } else { cp.style.display = 'none'; cp.value = ''; } }
function verificarTudoOk(ck, nG) { if (ck.checked && ck.value.includes("TODOS OS ITENS ESTÃO NO CARRO")) { document.querySelectorAll(`input[name="${nG}"]`).forEach(c => { if (c !== ck) c.checked = false; }); let tO = document.getElementById("chk-carro-outro"); if(tO) { tO.style.display = 'none'; tO.value = ''; } } else if (ck.checked && ck.value.includes("NÃO APRESENTA")) { document.querySelectorAll(`input[name="${nG}"]`).forEach(c => { if (c !== ck) c.checked = false; }); let tO = document.getElementById(nG + "-outro"); if(tO) { tO.style.display = 'none'; tO.value = ''; } } else if (ck.checked) { document.querySelectorAll(`input[name="${nG}"]`).forEach(c => { if (c.value.includes("NÃO APRESENTA") || c.value.includes("TODOS OS ITENS ESTÃO NO CARRO")) c.checked = false; }); } }
function calcularStatusTwi(inE, bId) { let b = document.getElementById(bId); let v = parseFloat(inE.value); if (isNaN(v)) { b.innerText = "Aguardando..."; b.style.backgroundColor = "#eee"; b.style.color = "#666"; return; } if (v >= 10) { b.innerText = "Pneu Novo"; b.style.backgroundColor = "#d4edda"; b.style.color = "#155724"; } else if (v >= 5) { b.innerText = "Meia-Vida"; b.style.backgroundColor = "#fff3cd"; b.style.color = "#856404"; } else { b.innerText = "No Limite"; b.style.backgroundColor = "#f8d7da"; b.style.color = "#721c24"; } }
function pegarMarcados(nG, idO) { let s = []; document.querySelectorAll(`input[name="${nG}"]:checked`).forEach(c => { if(c.value !== "OUTRO") s.push(c.value); }); let tO = document.getElementById(idO); if (tO && tO.value.trim() !== "") s.push("OUTROS: " + tO.value.trim()); return s.length > 0 ? s.join(" | ") : "Não avaliado"; }
function getSelOuOutro(idO) { let i = document.getElementById(idO); if(!i) return ""; let s = i.previousElementSibling; return s.value === "OUTRO" ? (i.value || "Outro não esp.") : s.value; }

async function enviarChecklistCarro() {
    if (document.querySelectorAll(`input[name="chk-carro-itens"]:checked`).length === 0) return alert("❌ Informe a situação dos itens do veículo!");
    if (!document.getElementById('chk-carro-extintor-data').value) return alert("❌ Informe a Data de Validade do Extintor!");
    for (let id of ['dd', 'de', 'td', 'te']) { if (!document.getElementById('chk-carro-twi-' + id).value) return alert(`❌ Preencha o TWI do Pneu ${id.toUpperCase()}!`); }

    if (document.getElementById('container-inputs-fotos-carro').style.display !== 'none') {
        if (!b64Lateral || !b64Traseira) return alert("❌ É obrigatório enviar a Foto Frente e Verso do veículo!");
    }

    let assMot = getPadB64('ass-mot-car'); let assGer = getPadB64('ass-ger-car');
    if(!assMot || !assGer) return alert("❌ É obrigatório recolher a assinatura do Motorista e do Gerente!");

    let btn = document.getElementById('btn-enviar-chk-carro'); btn.innerText = "Salvando e Gerando PDF... ⏳"; btn.disabled = true;

    let dE = document.getElementById('chk-carro-extintor-data').value; let pE = document.getElementById('chk-carro-extintor-pressao').value;

    let pl = {
        acao: "salvar_checklist", usuario: window.usuarioLogado,
        placa: document.getElementById('chk-carro-placa').value, placa_carreta: "", 
        modelo: document.getElementById('chk-carro-modelo').value, motorista: document.getElementById('chk-carro-motorista').value, 
        km_atual: document.getElementById('chk-carro-km').value, km_oleo: document.getElementById('chk-carro-oleo').value, 
        data_tacografo: "", data_graxa: "", data_extintor: dE, 
        chk_motor: "N/A", chk_cambio: "N/A", chk_embreagem: "N/A", chk_direcao: "N/A", chk_freios: "N/A", chk_suspensao: "N/A", chk_pneus_geral: "N/A", chk_eletrica: "N/A", chk_indicadores: "N/A", chk_cabine: "N/A", 
        chk_faltantes: pegarMarcados('chk-carro-itens', 'chk-carro-outro'), 
        chk_asa_delta: "", chk_freio_lona: "", chk_faixas: "", 
        chk_extintores: `Val: ${dE} - ${pE}`, 
        chk_parada: document.getElementById('chk-carro-parada').value, 
        chk_obs: document.getElementById('chk-carro-obs').value, 
        foto_lateral_b64: b64Lateral, foto_traseira_b64: b64Traseira, 
        assinatura_motorista_b64: assMot, assinatura_gerente_b64: assGer,
        qtd_carrinhos: "", qtd_cones: "",
        pneus: {}
    };

    ['dd','de','td','te'].forEach(id => { 
        let eT = document.getElementById('chk-carro-twi-' + id); 
        if(eT && eT.value) pl.pneus[id] = { milimetros: eT.value, estado: document.getElementById('badge-carro-estado-' + id).innerText }; 
    });

    try {
        let r = await fetch(API_URL, { method: 'POST', body: JSON.stringify(pl) }); let d = await r.json();
        if (d.sucesso) {
            alert("✅ Inspeção finalizada com sucesso!");
            window.frota[pl.placa].km_atual = pl.km_atual; window.frota[pl.placa].km_oleo = pl.km_oleo; window.frota[pl.placa].data_extintor = pl.data_extintor; 
            if(d.mesAtual) window.frota[pl.placa].mes_foto = d.mesAtual; if(d.linkLat) window.frota[pl.placa].foto_lateral = d.linkLat; if(d.linkTras) window.frota[pl.placa].foto_traseira = d.linkTras;
            for(let i in pl.pneus) { if(!window.frota[pl.placa].pneus[i]) window.frota[pl.placa].pneus[i] = {}; window.frota[pl.placa].pneus[i].milimetros = pl.pneus[i].milimetros; window.frota[pl.placa].pneus[i].estado = pl.pneus[i].estado; }
            let hS = new Date().toISOString(); cancelarChecklist(); selecionarPlaca(pl.placa); 
            let dH = document.createElement('div'); dH.className = "historico-item"; dH.innerHTML = `<span style="font-weight: bold; color: #1a4d2e;">${pl.placa}</span> <span style="color: #555; font-size: 12px;">${hS.split('T')[0]} ✅</span>`;
            document.getElementById('container-historico').prepend(dH);
        } else { alert("⚠️ Pendência: " + d.erro); }
    } catch (e) { alert("❌ Falha na conexão."); }
    btn.innerText = "💾 Enviar Inspeção e PDF"; btn.disabled = false;
}

async function enviarChecklist() {
    if (document.querySelectorAll(`input[name="chk-faltantes"]:checked`).length === 0) return alert("❌ Informe os Itens Faltantes!");
    if (!document.getElementById('chk-extintor-data').value) return alert("❌ Informe a Data de Validade do Extintor!");
    let bP = ['dd', 'de', 'tde', 'tdi', 'tee', 'tei', 'tkde', 'tkdi', 'tkee', 'tkei', '1step'];
    for (let id of bP) { if (!document.getElementById('chk-twi-' + id).value) return alert(`❌ Preencha o TWI do Pneu ${id.toUpperCase()} do Cavalo/Caminhão!`); }
    if (window.isCavalo) { let cP = ['c1','c2','c3','c4','c5','c6','c7','c8','c9','c10','2step']; for (let id of cP) { if (!document.getElementById('chk-twi-' + id).value) return alert(`❌ Preencha o TWI do Pneu ${id.toUpperCase()} da Carreta!`); } }
    if (!window.isCavalo && document.getElementById('container-inputs-fotos').style.display !== 'none') { if (!b64Lateral || !b64Traseira) return alert("❌ É obrigatório enviar a Foto Lateral e Traseira do caminhão!"); }

    let assMot = getPadB64('ass-mot-cam'); let assGer = getPadB64('ass-ger-cam');
    if(!assMot || !assGer) return alert("❌ É obrigatório recolher a assinatura do Motorista e do Gerente!");

    let btn = document.getElementById('btn-enviar-chk'); btn.innerText = "Salvando e Gerando PDF... ⏳"; btn.disabled = true;

    let dE = document.getElementById('chk-extintor-data').value; let pE = document.getElementById('chk-extintor-pressao').value;

    let pl = {
        acao: "salvar_checklist", usuario: window.usuarioLogado,
        placa: document.getElementById('chk-placa').value, placa_carreta: window.isCavalo ? document.getElementById('chk-placa-carreta').value : "", 
        modelo: document.getElementById('chk-modelo').value, motorista: document.getElementById('chk-motorista').value, 
        km_atual: document.getElementById('chk-km').value, km_oleo: document.getElementById('chk-km-oleo').value, 
        data_tacografo: document.getElementById('chk-data-taco').value, data_graxa: document.getElementById('chk-data-graxa').value, 
        data_extintor: dE, 
        chk_motor: pegarMarcados('chk-motor', 'chk-motor-outro'), chk_cambio: pegarMarcados('chk-cambio', 'chk-cambio-outro'), chk_embreagem: pegarMarcados('chk-embreagem', 'chk-emb-outro'), chk_direcao: pegarMarcados('chk-direcao', 'chk-dir-outro'), chk_freios: pegarMarcados('chk-freios', 'chk-freio-outro'), chk_suspensao: pegarMarcados('chk-suspensao', 'chk-susp-outro'), chk_pneus_geral: pegarMarcados('chk-pneus_geral', 'chk-pneu-outro'), chk_eletrica: pegarMarcados('chk-eletrica', 'chk-elet-outro'), chk_indicadores: pegarMarcados('chk-indicadores', 'chk-ind-outro'), chk_cabine: pegarMarcados('chk-cabine', 'chk-cab-outro'), chk_faltantes: pegarMarcados('chk-faltantes', 'chk-falta-outro'), 
        chk_asa_delta: window.isCavalo ? getSelOuOutro('chk-asa-outro') : "", chk_freio_lona: window.isCavalo ? getSelOuOutro('chk-freio-lona-outro') : "", chk_faixas: window.isCavalo ? getSelOuOutro('chk-faixas-outro') : "", 
        chk_extintores: `Val: ${dE} - ${pE}`, 
        chk_parada: document.getElementById('chk-parada').value, chk_obs: document.getElementById('chk-obs').value, 
        foto_lateral_b64: b64Lateral, foto_traseira_b64: b64Traseira, 
        assinatura_motorista_b64: assMot, assinatura_gerente_b64: assGer,
        qtd_carrinhos: window.isCavalo ? "0" : document.getElementById('chk-qtd-carrinhos').value, 
        qtd_cones: window.isCavalo ? "0" : document.getElementById('chk-qtd-cones').value,
        pneus: {}
    };

    let tIds = ['dd','de','tde','tdi','tee','tei','tkde','tkdi','tkee','tkei','1step','c1','c2','c3','c4','c5','c6','c7','c8','c9','c10','2step'];
    tIds.forEach(id => { let eT = document.getElementById('chk-twi-' + id); if(eT && eT.value) { pl.pneus[id] = { milimetros: eT.value, estado: document.getElementById('badge-estado-' + id).innerText }; } });

    try {
        let r = await fetch(API_URL, { method: 'POST', body: JSON.stringify(pl) }); let d = await r.json();
        if (d.sucesso) {
            alert("✅ Sucesso! PDF salvo com assinaturas.");
            window.frota[pl.placa].km_atual = pl.km_atual; window.frota[pl.placa].km_oleo = pl.km_oleo; window.frota[pl.placa].data_extintor = pl.data_extintor; window.frota[pl.placa].qtd_carrinhos = pl.qtd_carrinhos; window.frota[pl.placa].qtd_cones = pl.qtd_cones;
            if(d.mesAtual) window.frota[pl.placa].mes_foto = d.mesAtual; if(d.linkLat) window.frota[pl.placa].foto_lateral = d.linkLat; if(d.linkTras) window.frota[pl.placa].foto_traseira = d.linkTras;
            for(let i in pl.pneus) { if(!window.frota[pl.placa].pneus[i]) window.frota[pl.placa].pneus[i] = {}; window.frota[pl.placa].pneus[i].milimetros = pl.pneus[i].milimetros; window.frota[pl.placa].pneus[i].estado = pl.pneus[i].estado; }
            let hS = new Date().toISOString(); cancelarChecklist(); selecionarPlaca(pl.placa); 
            let dH = document.createElement('div'); dH.className = "historico-item"; dH.innerHTML = `<span style="font-weight: bold; color: #1a4d2e;">${pl.placa}</span> <span style="color: #555; font-size: 12px;">${hS.split('T')[0]} ✅</span>`;
            document.getElementById('container-historico').prepend(dH);
        } else { alert("⚠️ Pendência: " + d.erro); }
    } catch (e) { alert("❌ Falha na conexão."); }
    btn.innerText = "💾 Enviar Checklist e Gerar PDF"; btn.disabled = false;
}
