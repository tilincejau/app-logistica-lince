/* =========================================================
   SISTEMA LINCE - JAVASCRIPT LOCAL FRONT-END
   Gerencia a inversão do Menu -> Placa, Validações, Fotos, PDF, etc.
   ========================================================= */

const API_URL = "https://script.google.com/macros/s/AKfycbxHi49LtwY3FI5s0H9c7C-HebuQvUg7-CeHLuxiX35phkjagenPW9jlxm81qAM5YDyQ/exec";
const APP_VERSAO = "2.2"; // Versão atualizada para forçar a limpeza da cache nos celulares

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
    localStorage.setItem('lince_logistica_bd', JSON.stringify({
        frota: window.frota, estoque_diesel: window.estoqueDiesel, estoque_arla: window.estoqueArla,
        gasto_mes_geral: window.gastoMesGeral, hist_abast: window.histAbast,
        estoque_pecas: window.estoquePecas, motoristas: window.listaMotoristas, historico: window.historicoChecklist
    }));
}

function adicionarNaFila(payload) {
    let fila = JSON.parse(localStorage.getItem('lince_fila_requisicoes')) || [];
    payload._localId = Date.now() + Math.random().toString(36).substr(2, 5);
    
    if (!payload.id_transacao) {
        payload.id_transacao = payload._localId;
    }
    
    fila.push(payload);
    localStorage.setItem('lince_fila_requisicoes', JSON.stringify(fila));
    
    atualizarBotaoSyncManual();
    sincronizarSegundoPlano(false); 
}

function atualizarBotaoSyncManual() {
    let fila = JSON.parse(localStorage.getItem('lince_fila_requisicoes')) || [];
    let btn = document.getElementById('btn-sync-manual');
    if (btn) {
        if (fila.length > 0) {
            btn.innerHTML = `<i class="ph ph-warning-circle"></i> Enviando ${fila.length} pendências...`;
            btn.style.color = "#d97706";
            btn.style.borderColor = "#d97706";
            btn.style.backgroundColor = "#fffbeb";
        } else {
            btn.innerHTML = `<i class="ph ph-arrows-clockwise"></i> Sincronizar Dados`;
            btn.style.color = "var(--primary-color)";
            btn.style.borderColor = "var(--primary-color)";
            btn.style.backgroundColor = "transparent";
        }
    }
}

async function sincronizarSegundoPlano(manual = false) {
    if (!navigator.onLine) { if(manual) mostrarToast("<i class='ph ph-wifi-x'></i> Sem conexão à internet", "#dc2626"); return; }
    if (isSyncing) { if(manual) mostrarToast("<i class='ph ph-spinner ph-spin'></i> Sincronização em andamento...", "#d97706"); return; }

    let fila = JSON.parse(localStorage.getItem('lince_fila_requisicoes')) || [];
    if (fila.length === 0) { 
        if (manual) { 
            mostrarToast("<i class='ph ph-check-circle'></i> Tudo já está atualizado!", "#059669"); 
            recarregarDadosSilenciosamente(); 
        } 
        atualizarBotaoSyncManual();
        return; 
    }

    isSyncing = true;
    let processouAlgo = false;
    let novaFila = [...fila]; 
    
    if(manual) mostrarToast(`<i class='ph ph-arrows-clockwise ph-spin'></i> Processando ${fila.length} envios...`, "#d97706");

    for (let i = 0; i < fila.length; i++) {
        let reqPayload = fila[i];
        try {
            let p = {...reqPayload}; delete p._localId;
            
            let resp = await fetch(API_URL, { 
                method: 'POST', 
                body: JSON.stringify(p),
                headers: { "Content-Type": "text/plain;charset=utf-8" }
            });
            
            let resJSON;
            try {
                resJSON = await resp.json();
            } catch(e) {
                if (manual) Swal.fire("Erro Crítico (Google)", "O link não retornou dados válidos. O sistema tentará novamente mais tarde.", "error");
                break;
            }

            if (resJSON.erro) {
                console.error("Erro reportado pelo Google:", resJSON.erro);
                if(manual) Swal.fire("Erro na Planilha", resJSON.erro, "error");
                continue; 
            }

            if (resJSON.sucesso) {
                novaFila = novaFila.filter(item => item._localId !== reqPayload._localId);
                localStorage.setItem('lince_fila_requisicoes', JSON.stringify(novaFila));
                processouAlgo = true;
            }
        } catch (e) { 
            console.error("Erro de comunicação local:", e);
            if(manual) Swal.fire("Erro de Conexão", "Sinal instável. Os dados estão seguros no celular e serão enviados depois.", "warning");
            break; 
        }
    }
    
    atualizarBotaoSyncManual();

    if (processouAlgo) {
        if (novaFila.length === 0) { 
            if(manual || processouAlgo) mostrarToast("<i class='ph ph-check-circle'></i> Tudo sincronizado com sucesso!", "#059669"); 
        } else { 
            mostrarToast(`<i class='ph ph-warning'></i> Restam ${novaFila.length} itens aguardando rede`, "#dc2626"); 
        }
        recarregarDadosSilenciosamente();
    }
    isSyncing = false;
}

async function forcarSincronizacaoManual() {
    let btn = document.getElementById('btn-sync-manual');
    if(!btn) return;
    let originalHTML = btn.innerHTML;
    btn.innerHTML = "<i class='ph ph-spinner ph-spin'></i> Sincronizando...";
    btn.disabled = true;
    await sincronizarSegundoPlano(true);
    atualizarBotaoSyncManual();
    btn.disabled = false;
}

setInterval(() => sincronizarSegundoPlano(false), 30000);
document.addEventListener("visibilitychange", function() { if (document.visibilityState === 'visible') sincronizarSegundoPlano(false); });

function atualizarVariaveisGlobais(res) {
    window.frota = res.frota || window.frota;
    window.estoqueDiesel = res.estoque_diesel || 0;
    window.estoqueArla = res.estoque_arla || 0;
    window.gastoMesGeral = res.gasto_mes_geral || 0;
    window.histAbast = res.hist_abast || { diesel: [], arla: [], cheg_diesel: [], cheg_arla: [] };
    window.estoquePecas = res.estoque_pecas || [];
    window.listaMotoristas = res.motoristas || [];
    window.historicoChecklist = res.historico || [];

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

async function recarregarDadosSilenciosamente() {
    try {
        let req = await fetch(`${API_URL}?acao=buscar_inicial`);
        let res = await req.json();
        
        let fila = JSON.parse(localStorage.getItem('lince_fila_requisicoes')) || [];
        if (fila.length > 0) return;

        if (res.sucesso) {
            atualizarVariaveisGlobais(res);
            localStorage.setItem('lince_logistica_bd', JSON.stringify(res));

            let telaInterna = document.getElementById('tela-interna');
            let placaAtual = document.getElementById('texto-placa-interna').innerText;
            if (telaInterna.style.display === 'flex' && placaAtual) {
                selecionarPlaca(placaAtual, true); 
            }
        }
    } catch(e) {}
}

window.onload = function() {
    let versaoLocal = localStorage.getItem('lince_versao');
    if (versaoLocal !== APP_VERSAO) {
        localStorage.removeItem('lince_logistica_user');
        localStorage.removeItem('lince_logistica_bd');
        localStorage.setItem('lince_versao', APP_VERSAO);
    }
    
    atualizarBotaoSyncManual();

    let construtorFicha = (arr, isCar) => arr.map(p => `<details><summary>${p.n}</summary><div class="pneu-detalhes"><div class="linha-info"><span class="info-label" style="margin:0;">Estado:</span> <span class="info-valor" id="${isCar?'carro-':''}estado-${p.id}" style="font-weight:bold;">---</span></div><div class="linha-info"><span class="info-label" style="margin:0;">TWI:</span> <span class="info-valor" id="${isCar?'carro-':''}twi-${p.id}">---</span></div><div class="linha-info" style="margin-top:10px;"><span class="info-label" style="margin:0;">KM Troca:</span> <input type="number" id="${isCar?'carro-':''}km-troca-${p.id}" class="input-editavel travado" value="0" readonly></div><div class="linha-info" style="margin-top:5px;"><span class="info-label" style="margin:0;">Data Troca:</span> <input type="date" id="${isCar?'carro-':''}data-troca-${p.id}" class="input-editavel travado" readonly></div><div class="linha-info" style="margin-top:5px;"><span class="info-label" style="margin:0;">Pneu Colocado:</span> <select id="${isCar?'carro-':''}pneu-colocado-${p.id}" class="input-editavel travado" disabled style="background-color: transparent;"><option value="NOVO">NOVO</option><option value="1 RESSOLAGEM">1 RESSOLAGEM</option><option value="2 RESSOLAGEM">2 RESSOLAGEM</option><option value="3 RESSOLAGEM">3 RESSOLAGEM</option></select></div><div class="linha-info" style="margin-top:5px;"><span class="info-label" style="margin:0;">Últ. Rodízio:</span> <input type="date" id="${isCar?'carro-':''}data-rodizio-${p.id}" class="input-editavel travado" readonly></div><div class="linha-info" style="margin-top:5px;"><span class="info-label" style="margin:0;">Próx Rodízio (KM):</span> <input type="number" id="${isCar?'carro-':''}prox-rodizio-${p.id}" class="input-editavel travado" value="0" readonly oninput="calcularRodizioPneus()"></div><div class="linha-info" style="margin-top:5px; border-top:1px dashed #ccc; padding-top:5px;"><span class="info-label" style="margin:0;">Status Rodízio:</span> <span id="${isCar?'carro-':''}status-rod-${p.id}" style="font-weight:bold;">---</span></div></div></details>`).join('');
    let construtorChk = (arr, isCar) => arr.map(p => `<div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; border-bottom: 1px dashed #ccc; padding-bottom: 5px;"><span style="font-weight: bold; width: 50px; color:${arr===pneusCarreta?'#0056b3':'#333'};">${p.n}</span><input type="number" id="${isCar?'chk-carro-twi-':'chk-twi-'}${p.id}" placeholder="mm" class="input-campo" style="margin:0; width: 80px; padding: 10px; text-align:center;" oninput="calcularStatusTwi(this, '${isCar?'badge-carro-estado-':'badge-estado-'}${p.id}')"><span id="${isCar?'badge-carro-estado-':'badge-estado-'}${p.id}" class="twi-estado-badge" style="flex: 1;">Aguardando...</span></div>`).join('');
    htmlFichaTruck = construtorFicha(pneusTruck, false); htmlChkTruck = construtorChk(pneusTruck, false);
    htmlFichaToco = construtorFicha(pneusToco, false); htmlChkToco = construtorChk(pneusToco, false);
    htmlFichaCarreta = construtorFicha(pneusCarreta, false); htmlChkCarreta = construtorChk(pneusCarreta, false);
    htmlFichaCarro = construtorFicha(pneusCarro, true); htmlChkCarro = construtorChk(pneusCarro, true);
    
    document.querySelectorAll('.img-placa').forEach(img => { let onclickVal = img.getAttribute('onclick'); if(onclickVal) { let match = onclickVal.match(/'([^']+)'/); if(match && match[1] !== 'OUTROS') { let placa = match[1]; let wrapper = document.createElement('div'); wrapper.style.position = 'relative'; img.parentNode.insertBefore(wrapper, img); wrapper.appendChild(img); let check = document.createElement('div'); check.id = 'check-' + placa; check.innerHTML = '<i class="ph-fill ph-check-circle" style="color:#10b981;"></i>'; check.style.cssText = 'display:none; align-items:center; justify-content:center; position:absolute; top:-5px; right:-5px; font-size:24px; background:#fff; border-radius:50%; box-shadow:0 2px 4px rgba(0,0,0,0.3); z-index:10;'; wrapper.appendChild(check); } } });

    let bdSalvo = localStorage.getItem('lince_logistica_bd');
    if (bdSalvo) {
        try {
            let dados = JSON.parse(bdSalvo);
            atualizarVariaveisGlobais(dados);
        } catch(e) {}
    }

    let userSalvo = localStorage.getItem('lince_logistica_user');
    if (userSalvo) {
        let userObj = JSON.parse(userSalvo);
        window.usuarioLogado = userObj.u;
        esconderTodasTelas();
        document.getElementById('tela-menu').style.display = 'flex';
        recarregarDadosSilenciosamente();
    }
};

async function fazerLogin() { 
    let u = document.getElementById('campo-usuario').value; let s = document.getElementById('campo-senha').value; let msg = document.getElementById('mensagem-erro'); let btn = document.getElementById('btn-login'); 
    if (!u || !s) { msg.innerHTML = "<i class='ph ph-warning'></i> Preencha usuário e senha!"; msg.style.display = 'block'; return; } 
    if (API_URL === "COLE_AQUI_O_NOVO_LINK_QUE_GEROU_AGORA" || !API_URL) { msg.innerHTML = "<i class='ph ph-warning'></i> A URL do Sistema não foi configurada!"; msg.style.display = 'block'; return; }
    btn.innerHTML = "<i class='ph ph-spinner ph-spin'></i> Baixando..."; msg.style.display = 'none'; 
    try { 
        let req1 = await fetch(`${API_URL}?acao=login&usuario=${u}&senha=${s}`); let res1 = await req1.json(); 
        if (res1.sucesso) { 
            window.usuarioLogado = u; localStorage.setItem('lince_logistica_user', JSON.stringify({u: u, s: s}));
            let req2 = await fetch(`${API_URL}?acao=buscar_inicial`); let res2 = await req2.json(); 
            if (res2.sucesso) { 
                atualizarVariaveisGlobais(res2); localStorage.setItem('lince_logistica_bd', JSON.stringify(res2));
                esconderTodasTelas(); document.getElementById('tela-menu').style.display = 'flex'; 
            } else { msg.innerHTML = "<i class='ph ph-x-circle'></i> Erro: " + res2.erro; msg.style.display = 'block'; } 
        } else { msg.innerHTML = "<i class='ph ph-x-circle'></i> Credenciais incorretas!"; msg.style.display = 'block'; } 
    } catch (e) { msg.innerHTML = "<i class='ph ph-wifi-x'></i> Erro de comunicação."; msg.style.display = 'block'; console.error(e); } 
    btn.innerHTML = "<i class='ph ph-sign-in'></i> Entrar"; 
}

function esconderTodasTelas() { 
    document.getElementById('tela-login').style.display = 'none'; document.getElementById('tela-placas').style.display = 'none'; document.getElementById('tela-menu').style.display = 'none'; document.getElementById('tela-submenu-estoque').style.display = 'none'; document.getElementById('tela-interna').style.display = 'none'; 
} 

function sairDaConta() { 
    localStorage.removeItem('lince_logistica_user'); window.usuarioLogado = ""; esconderTodasTelas(); document.getElementById('campo-senha').value = ''; document.getElementById('tela-login').style.display = 'flex'; 
} 

function voltarParaPlacas() { esconderTodasTelas(); document.getElementById('tela-placas').style.display = 'flex'; } 
function voltarParaMenu() { esconderTodasTelas(); document.getElementById('tela-menu').style.display = 'flex'; atualizarBotaoSyncManual(); }

function escolherModulo(modulo) { 
    window.moduloAtual = modulo; 
    esconderTodasTelas(); 
    if (modulo === 'Estoque') { 
        document.getElementById('tela-submenu-estoque').style.display = 'flex'; 
    } else { 
        let btnOutros = document.getElementById('btn-placa-outros'); 
        let titOutros = document.getElementById('titulo-outros'); 
        if (btnOutros && titOutros) { 
            btnOutros.style.display = (modulo === 'Abastecimento' || modulo === 'Checklist') ? 'grid' : 'none'; 
            titOutros.style.display = (modulo === 'Abastecimento' || modulo === 'Checklist') ? 'block' : 'none'; 
        } 
        document.querySelectorAll('[id^="check-"]').forEach(el => el.style.display = 'none'); 
        
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
    document.getElementById('conteudo-Estoque').style.display = 'flex'; document.getElementById('alerta-veiculo-interna').style.display = 'none'; document.getElementById('btn-trocar-veiculo').style.display = 'none'; document.getElementById('btn-voltar-menu').onclick = function() { esconderTodasTelas(); document.getElementById('tela-submenu-estoque').style.display = 'flex'; }; esconderTodasTelas(); document.getElementById('tela-interna').style.display = 'flex'; 
}

async function selecionarPlaca(placa, bypassTrava = false) { 
    if (placa === 'OUTROS') { 
        if (typeof Swal === 'undefined') { alert("Erro ao carregar bibliotecas."); return; }
        const { value: pC } = await Swal.fire({ title: 'Outro Veículo', input: 'text', inputLabel: 'Digite a placa:', showCancelButton: true, confirmButtonColor: '#1a4d2e' });
        if (!pC) return; 
        placa = pC.toUpperCase().replace(/[^A-Z0-9]/g, ''); 

        const { value: cat } = await Swal.fire({ title: 'Categoria', input: 'select', inputOptions: { '1': 'Caminhão', '2': 'Cavalo', '3': 'Utilitário/Carro', '4': 'Empilhadeira' }, showCancelButton: true, confirmButtonColor: '#1a4d2e' });
        if(!cat) return;
        let tipoVeiculo = "CAMINHAO";
        if(cat === "2") { tipoVeiculo = "CAVALO"; CAVALOS.push(placa); }
        else if(cat === "3") { tipoVeiculo = "CARRO"; CARROS.push(placa); }
        else if(cat === "4") { tipoVeiculo = "EMPILHADEIRA"; EMPILHADEIRAS.push(placa); }
        else { TRUCKS.push(placa); }
        if (!window.frota[placa]) { window.frota[placa] = { km_atual: 0, gasto_mes: 0, pneus: {}, tipo: tipoVeiculo, categoria_temp: tipoVeiculo, abast_atual: { km_atual: 0, litros: 0,
