/* =========================================================
   SISTEMA LINCE - JAVASCRIPT LOCAL FRONT-END
   Gerencia a inversão do Menu -> Placa, Validações, Fotos, PDF, etc.
   ========================================================= */

const API_URL = "https://script.google.com/macros/s/AKfycbxvxiDr82rljfQtwcIVAxVKgBb09QRnS5cdIl2j15m9BjZ3PSaH7olg2RpDzIM2smf5tA/exec";
const APP_VERSAO = "1.2"; // Atualizado com Botão de Sincronia Manual e Fix Visual

const CAVALOS = ['FEF7C02', 'GHE3E06', 'FYY7G32']; 
const CARROS = ['CLW4E92', 'UGF2G86', 'FGX2A32'];
const EMPILHADEIRAS = ['05025DR3290', '05025DR8824'];
const TRUCKS = ['FMR4I10', 'FQY6B30', 'TKR8I49', 'TLL8H30', 'TLY0G57', 'UDN0J81', 'UPS1J80', 'UPX9D25', 'URT4E79', 'URU3F36'];
const TOCOS = ['AXZ1D53', 'FCT1J98', 'FEE9E40', 'FIF9A30', 'FMQ8H77', 'FPJ1B16', 'FUH9H91', 'IVE8J03', 'NTP4G17'];

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

// =======================================================
// LÓGICA DA FILA E BOTÃO MANUAL (OFFLINE-FIRST)
// =======================================================
let isSyncing = false;

function mostrarToast(msg, cor = "#1f2937") {
    let toast = document.getElementById("toast-lince");
    if (!toast) {
        toast = document.createElement("div");
        toast.id = "toast-lince";
        document.body.appendChild(toast);
    }
    toast.style.cssText = `visibility: visible; min-width: 250px; background-color: ${cor}; color: #fff; text-align: center; border-radius: 30px; padding: 14px; position: fixed; z-index: 10000; left: 50%; bottom: 80px; transform: translateX(-50%); font-size: 14px; font-weight: 600; box-shadow: 0px 8px 20px rgba(0,0,0,0.3); transition: opacity 0.3s, bottom 0.3s; opacity: 1;`;
    toast.innerText = msg;
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
    fila.push(payload);
    localStorage.setItem('lince_fila_requisicoes', JSON.stringify(fila));
    sincronizarSegundoPlano(false); 
}

async function sincronizarSegundoPlano(manual = false) {
    if (!navigator.onLine) {
        if(manual) mostrarToast("❌ Sem conexão à internet", "#dc2626");
        return;
    }
    if (isSyncing) {
        if(manual) mostrarToast("⏳ Sincronização já em andamento...", "#d97706");
        return;
    }

    let fila = JSON.parse(localStorage.getItem('lince_fila_requisicoes')) || [];
    if (fila.length === 0) {
        if (manual) {
            mostrarToast("✅ Tudo já está atualizado!", "#059669");
            recarregarDadosSilenciosamente();
        }
        return;
    }

    isSyncing = true;
    let filaRestante = [...fila];
    let processouAlgo = false;

    mostrarToast(`🔄 Sincronizando ${fila.length} pendências...`, "#d97706");

    for (let i = 0; i < fila.length; i++) {
        let reqPayload = fila[i];
        try {
            let p = {...reqPayload}; delete p._localId;
            let resp = await fetch(API_URL, { method: 'POST', body: JSON.stringify(p) });
            await resp.json();
            
            filaRestante = filaRestante.filter(item => item._localId !== reqPayload._localId);
            processouAlgo = true;
        } catch (e) {
            console.warn("Sem internet para o pedido, parando fila.");
            break; 
        }
    }

    localStorage.setItem('lince_fila_requisicoes', JSON.stringify(filaRestante));
    
    if (processouAlgo) {
        if (filaRestante.length === 0) {
            mostrarToast("✅ Tudo sincronizado com sucesso!", "#059669");
        } else {
            mostrarToast(`⚠️ Sobraram ${filaRestante.length} itens (Sem rede)`, "#dc2626");
        }
        recarregarDadosSilenciosamente();
    }
    isSyncing = false;
}

// BOTÃO MANUAL DE SINCRONIZAÇÃO
async function forcarSincronizacaoManual() {
    let btn = document.getElementById('btn-sync-manual');
    if(!btn) return;
    let originalText = btn.innerText;
    btn.innerText = "Sincronizando... ⏳";
    btn.disabled = true;

    await sincronizarSegundoPlano(true);

    btn.innerText = originalText;
    btn.disabled = false;
}

// Disparos Automáticos de Sincronização
setInterval(() => sincronizarSegundoPlano(false), 180000); // Tenta a cada 3 Minutos
document.addEventListener("visibilitychange", function() {
    if (document.visibilityState === 'visible') sincronizarSegundoPlano(false);
});
// =======================================================

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

    // GARANTE QUE AS PLACAS VÃO ACENDER O ✅ ASSIM QUE OS DADOS CHEGAREM
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
                if (badge) badge.style.display = 'block'; 
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

    let construtorFicha = (arr, isCar) => arr.map(p => `<details><summary>${p.n}</summary><div class="pneu-detalhes"><div class="linha-info"><span class="info-label" style="margin:0;">Estado:</span> <span class="info-valor" id="${isCar?'carro-':''}estado-${p.id}" style="font-weight:bold;">---</span></div><div class="linha-info"><span class="info-label" style="margin:0;">TWI:</span> <span class="info-valor" id="${isCar?'carro-':''}twi-${p.id}">---</span></div><div class="linha-info" style="margin-top:10px;"><span class="info-label" style="margin:0;">KM Troca:</span> <input type="number" id="${isCar?'carro-':''}km-troca-${p.id}" class="input-editavel travado" value="0" readonly></div><div class="linha-info" style="margin-top:5px;"><span class="info-label" style="margin:0;">Data Troca:</span> <input type="date" id="${isCar?'carro-':''}data-troca-${p.id}" class="input-editavel travado" readonly></div><div class="linha-info" style="margin-top:5px;"><span class="info-label" style="margin:0;">Pneu Colocado:</span> <select id="${isCar?'carro-':''}pneu-colocado-${p.id}" class="input-editavel travado" disabled style="background-color: transparent;"><option value="NOVO">NOVO</option><option value="1 RESSOLAGEM">1 RESSOLAGEM</option><option value="2 RESSOLAGEM">2 RESSOLAGEM</option><option value="3 RESSOLAGEM">3 RESSOLAGEM</option></select></div><div class="linha-info" style="margin-top:5px;"><span class="info-label" style="margin:0;">Últ. Rodízio:</span> <input type="date" id="${isCar?'carro-':''}data-rodizio-${p.id}" class="input-editavel travado" readonly></div><div class="linha-info" style="margin-top:5px;"><span class="info-label" style="margin:0;">Próx Rodízio (KM):</span> <input type="number" id="${isCar?'carro-':''}prox-rodizio-${p.id}" class="input-editavel travado" value="0" readonly oninput="calcularRodizioPneus()"></div><div class="linha-info" style="margin-top:5px; border-top:1px dashed #ccc; padding-top:5px;"><span class="info-label" style="margin:0;">Status Rodízio:</span> <span id="${isCar?'carro-':''}status-rod-${p.id}" style="font-weight:bold;">---</span></div></div></details>`).join('');
    let construtorChk = (arr, isCar) => arr.map(p => `<div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; border-bottom: 1px dashed #ccc; padding-bottom: 5px;"><span style="font-weight: bold; width: 50px; color:${arr===pneusCarreta?'#0056b3':'#333'};">${p.n}</span><input type="number" id="${isCar?'chk-carro-twi-':'chk-twi-'}${p.id}" placeholder="mm" class="input-campo" style="margin:0; width: 80px; padding: 10px; text-align:center;" oninput="calcularStatusTwi(this, '${isCar?'badge-carro-estado-':'badge-estado-'}${p.id}')"><span id="${isCar?'badge-carro-estado-':'badge-estado-'}${p.id}" class="twi-estado-badge" style="flex: 1;">Aguardando...</span></div>`).join('');
    htmlFichaTruck = construtorFicha(pneusTruck, false); htmlChkTruck = construtorChk(pneusTruck, false);
    htmlFichaToco = construtorFicha(pneusToco, false); htmlChkToco = construtorChk(pneusToco, false);
    htmlFichaCarreta = construtorFicha(pneusCarreta, false); htmlChkCarreta = construtorChk(pneusCarreta, false);
    htmlFichaCarro = construtorFicha(pneusCarro, true); htmlChkCarro = construtorChk(pneusCarro, true);
    
    document.querySelectorAll('.img-placa').forEach(img => { let onclickVal = img.getAttribute('onclick'); if(onclickVal) { let match = onclickVal.match(/'([^']+)'/); if(match && match[1] !== 'OUTROS') { let placa = match[1]; let wrapper = document.createElement('div'); wrapper.style.position = 'relative'; img.parentNode.insertBefore(wrapper, img); wrapper.appendChild(img); let check = document.createElement('div'); check.id = 'check-' + placa; check.innerHTML = '✅'; check.style.cssText = 'display:none; position:absolute; top:-5px; right:-5px; font-size:22px; background:#fff; border-radius:50%; box-shadow:0 2px 4px rgba(0,0,0,0.3); padding:2px; z-index:10;'; wrapper.appendChild(check); } } });

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
    if (!u || !s) { msg.innerText = "Preencha usuário e senha!"; msg.style.display = 'block'; return; } 
    btn.innerText = "Baixando Dados... ⏳"; msg.style.display = 'none'; 
    try { 
        let req1 = await fetch(`${API_URL}?acao=login&usuario=${u}&senha=${s}`); let res1 = await req1.json(); 
        if (res1.sucesso) { 
            window.usuarioLogado = u; localStorage.setItem('lince_logistica_user', JSON.stringify({u: u, s: s}));
            let req2 = await fetch(`${API_URL}?acao=buscar_inicial`); let res2 = await req2.json(); 
            if (res2.sucesso) { 
                atualizarVariaveisGlobais(res2); localStorage.setItem('lince_logistica_bd', JSON.stringify(res2));
                esconderTodasTelas(); document.getElementById('tela-menu').style.display = 'flex'; 
            } else { msg.innerText = "Erro: " + res2.erro; msg.style.display = 'block'; } 
        } else { msg.innerText = "Credenciais incorretas!"; msg.style.display = 'block'; } 
    } catch (e) { msg.innerText = "Erro de rede / Link inválido."; msg.style.display = 'block'; } 
    btn.innerText = "Entrar"; 
}

function esconderTodasTelas() { 
    document.getElementById('tela-login').style.display = 'none'; document.getElementById('tela-placas').style.display = 'none'; document.getElementById('tela-menu').style.display = 'none'; document.getElementById('tela-submenu-estoque').style.display = 'none'; document.getElementById('tela-interna').style.display = 'none'; 
} 

function sairDaConta() { 
    localStorage.removeItem('lince_logistica_user'); window.usuarioLogado = ""; esconderTodasTelas(); document.getElementById('campo-senha').value = ''; document.getElementById('tela-login').style.display = 'flex'; 
} 

function voltarParaPlacas() { esconderTodasTelas(); document.getElementById('tela-placas').style.display = 'flex'; } 
function voltarParaMenu() { esconderTodasTelas(); document.getElementById('tela-menu').style.display = 'flex'; }

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
                if (dataObj >= inicioSemana) { let placaLimpa = String(h.placa).trim().toUpperCase(); let badge = document.getElementById('check-' + placaLimpa); if (badge) badge.style.display = 'block'; } 
            }); 
        } 
        document.getElementById('tela-placas').style.display = 'flex'; 
    } 
}

function abrirModuloEstoque(sub) { 
    document.getElementById('card-est-posicao').style.display = (sub === 'posicao') ? 'block' : 'none'; document.getElementById('card-est-movimentacao').style.display = (sub === 'movimentacao') ? 'block' : 'none'; document.getElementById('card-est-compra').style.display = (sub === 'compra') ? 'block' : 'none'; document.getElementById('titulo-tela-interna').innerText = sub === 'posicao' ? 'Posição do Estoque' : (sub === 'movimentacao' ? 'Entrada / Saída' : 'Solicitar Compra'); 
    let secoes = document.getElementsByClassName('secao-conteudo'); for (let i = 0; i < secoes.length; i++) { secoes[i].style.display = 'none'; } 
    document.getElementById('conteudo-Estoque').style.display = 'flex'; document.getElementById('alerta-veiculo-interna').style.display = 'none'; document.getElementById('btn-trocar-veiculo').style.display = 'none'; document.getElementById('btn-voltar-menu').onclick = function() { esconderTodasTelas(); document.getElementById('tela-submenu-estoque').style.display = 'flex'; }; esconderTodasTelas(); document.getElementById('tela-interna').style.display = 'flex'; 
}

function selecionarPlaca(placa, bypassTrava = false) { 
    if (placa === 'OUTROS') { 
        let pC = prompt("Digite a placa do veículo (Ex: ABC-1234):"); 
        if (!pC) return; 
        placa = pC.toUpperCase().replace(/[^A-Z0-9]/g, ''); 
        let cat = prompt("Qual a categoria deste veículo?\n1 - Caminhão\n2 - Cavalo\n3 - Utilitário/Carro\n4 - Empilhadeira\n\n(Digite o Número)");
        if(!cat) return;
        let tipoVeiculo = "CAMINHAO";
        if(cat === "2") { tipoVeiculo = "CAVALO"; CAVALOS.push(placa); }
        else if(cat === "3") { tipoVeiculo = "CARRO"; CARROS.push(placa); }
        else if(cat === "4") { tipoVeiculo = "EMPILHADEIRA"; EMPILHADEIRAS.push(placa); }
        else { TRUCKS.push(placa); }
        if (!window.frota[placa]) { window.frota[placa] = { km_atual: 0, gasto_mes: 0, pneus: {}, tipo: tipoVeiculo, categoria_temp: tipoVeiculo, abast_atual: { km_atual: 0, litros: 0, km_ant: 0 } }; } 
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
            if (!confirm(`⚠️ ATENÇÃO: O Checklist para a placa ${placa} JÁ FOI FEITO nesta semana!\n\nTem certeza que deseja preencher um NOVO checklist para ela?`)) return;
        }
    }

    let dados = window.frota[placa]; if (!dados) return alert("Veículo não encontrado!"); document.getElementById('texto-placa-interna').innerText = placa; 
    
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
    let selAbast = document.getElementById('tipo-abast'); if (window.isCarro) { selAbast.innerHTML = `<option value="DIESEL">Abastecer COMBUSTÍVEL no Veículo</option><option value="CHEGADA DE DIESEL">📥 Receber COMBUSTÍVEL (Estoque)</option>`; } else { selAbast.innerHTML = `<option value="DIESEL">Abastecer DIESEL no Caminhão</option><option value="ARLA">Abastecer ARLA no Caminhão</option><option value="CHEGADA DE DIESEL">📥 Receber CHEGADA DE DIESEL</option><option value="CHEGADA DE ARLA">📥 Receber CHEGADA DE ARLA</option>`; } 
    let elTipo = document.getElementById('tipo-veiculo'); if(elTipo) elTipo.value = dados.tipo || ""; let elMotorista = document.getElementById('nome-motorista'); if(elMotorista) elMotorista.value = dados.motorista || ""; let formatNum = v => v ? String(v).replace(/[^0-9]/g, '') : ""; let elKm = document.getElementById('km-master'); if(elKm) elKm.value = formatNum(dados.km_atual); let elO = document.getElementById('km-proxima-troca'); if(elO) elO.value = formatNum(dados.km_oleo); let elT = document.getElementById('data-proxima-afericao'); if(elT) elT.value = dados.data_tacografo || ""; let elG = document.getElementById('data-engraxada'); if(elG) elG.value = dados.data_graxa || ""; let elCar = document.getElementById('qtd-carrinhos'); if(elCar) elCar.value = dados.qtd_carrinhos || 0; let elCon = document.getElementById('qtd-cones'); if(elCon) elCon.value = dados.qtd_cones || 0; let elCal = document.getElementById('qtd-calcos'); if(elCal) elCal.value = dados.qtd_calcos || 0; let elExt = document.getElementById('data-extintor-ficha'); if(elExt) elExt.value = dados.data_extintor || ""; urlDocAtual = dados.link_documento || ""; 
    let abData = dados.abast_atual || {km_ant: 0, km_atual: 0, litros: 0};
    document.getElementById('abast-km-ant').value = abData.km_ant; document.getElementById('abast-km-atual').value = abData.km_atual; document.getElementById('abast-litros').value = abData.litros;
    
    if (dados.pneus && !window.isEmpilhadeira) { 
        let pIds = window.isCarro ? ['dd','de','td','te'] : (window.isToco ? ['dd','de','tde','tdi','tee','tei','1step'] : ['dd','de','tde','tdi','tee','tei','tkde','tkdi','tkee','tkei','1step','c1','c2','c3','c4','c5','c6','c7','c8','c9','c10','c11','c12','2step']);
        let pref = window.isCarro ? 'carro-' : ''; 
        pIds.forEach(pos => { 
            let pneu = dados.pneus[pos] || {}; 
            let elEstado = document.getElementById(`${pref}estado-${pos}`); let elTwi = document.getElementById(`${pref}twi-${pos}`); let elKmTroca = document.getElementById(`${pref}km-troca-${pos}`); let elDataTroca = document.getElementById(`${pref}data-troca-${pos}`); let elDataRod = document.getElementById(`${pref}data-rodizio-${pos}`); let elProxRod = document.getElementById(`${pref}prox-rodizio-${pos}`); let elColocado = document.getElementById(`${pref}pneu-colocado-${pos}`);
            if(elEstado) elEstado.innerText = pneu.estado || "---"; if(elTwi) elTwi.innerText = pneu.milimetros ? pneu.milimetros + " mm" : "---"; if(elKmTroca) elKmTroca.value = pneu.km_ultima_troca || 0; if(elDataTroca) elDataTroca.value = pneu.data_ultima_troca || ""; if(elDataRod) elDataRod.value = pneu.data_ultimo_rodizio || ""; if(elProxRod) elProxRod.value = pneu.km_proximo_rodizio || 0; if(elColocado) elColocado.value = pneu.pneu_colocado || "NOVO";
        }); 
    } 
    let iL = document.getElementById('ficha-img-lat'); let pL = document.getElementById('ficha-pl-lat'); if (iL && pL) { document.getElementById('ficha-label-foto-1').innerText = window.isCarro ? "Frente" : "Lateral"; if (dados.foto_lateral && dados.foto_lateral !== "") { iL.src = forcarImagemDiretaDrive(dados.foto_lateral); iL.style.display = 'block'; pL.style.display = 'none'; } else { iL.style.display = 'none'; pL.style.display = 'flex'; } } let iT = document.getElementById('ficha-img-tras'); let pT = document.getElementById('ficha-pl-tras'); if (iT && pT) { document.getElementById('ficha-label-foto-2').innerText = window.isCarro ? "Verso/Traseira" : "Traseira"; if (dados.foto_traseira && dados.foto_traseira !== "") { iT.src = forcarImagemDiretaDrive(dados.foto_traseira); iT.style.display = 'block'; pT.style.display = 'none'; } else { iT.style.display = 'none'; pT.style.display = 'flex'; } } 
    let aK = document.getElementById('aviso-ultimo-km'); if(aK) aK.innerText = dados.km_atual || 0; let aG = document.getElementById('abast-gasto-mes'); if(aG) aG.innerText = (dados.gasto_mes || 0) + " L"; 
    atualizarKMGeral(); calcularTacografo(); calcularGraxa(); calcularExtintor(); calcularAbastecimento();
    abrirPagina(window.moduloAtual); 
}

function abrirPagina(nomeDaPagina) { 
    if(nomeDaPagina === 'Abastecimento' && typeof preencherDataHoraAbast === 'function') { preencherDataHoraAbast(); } 
    document.getElementById('titulo-tela-interna').innerText = nomeDaPagina; 
    let secoes = document.getElementsByClassName('secao-conteudo'); 
    for (let i = 0; i < secoes.length; i++) { secoes[i].style.display = 'none'; } 
    let secaoAtiva = document.getElementById('conteudo-' + nomeDaPagina); 
    if (secaoAtiva) { secaoAtiva.style.display = 'flex'; } 
    document.getElementById('alerta-veiculo-interna').style.display = 'block'; document.getElementById('btn-trocar-veiculo').style.display = 'block'; document.getElementById('btn-voltar-menu').onclick = voltarParaMenu; 
    esconderTodasTelas(); document.getElementById('tela-interna').style.display = 'flex'; 

    if (nomeDaPagina === 'Checklist') {
        iniciarNovoChecklist();
    }
}

let isDrawingPad = false; function initPad(canvasId) { let cvs = document.getElementById(canvasId); if(!cvs) return; let ctx = cvs.getContext('2d'); ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.strokeStyle = '#000'; const getPos = (e) => { let rect = cvs.getBoundingClientRect(); let cX = e.touches ? e.touches[0].clientX : e.clientX; let cY = e.touches ? e.touches[0].clientY : e.clientY; return { x: (cX - rect.left) * (cvs.width / rect.width), y: (cY - rect.top) * (cvs.height / rect.height) }; }; let start = (e) => { e.preventDefault(); isDrawingPad = true; let p = getPos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); cvs.setAttribute('data-t', '1'); }; let move = (e) => { e.preventDefault(); if(!isDrawingPad) return; let p = getPos(e); ctx.lineTo(p.x, p.y); ctx.stroke(); }; let end = (e) => { e.preventDefault(); isDrawingPad = false; }; cvs.onmousedown = start; cvs.ontouchstart = start; cvs.onmousemove = move; cvs.ontouchmove = move; cvs.onmouseup = end; cvs.ontouchend = end; cvs.onmouseout = end; } function limparPad(canvasId) { let cvs = document.getElementById(canvasId); if(!cvs) return; let ctx = cvs.getContext('2d'); ctx.fillStyle = "#fff"; ctx.fillRect(0,0,cvs.width,cvs.height); cvs.removeAttribute('data-t'); } function getPadB64(canvasId) { let cvs = document.getElementById(canvasId); if(!cvs || !cvs.getAttribute('data-t')) return ""; return cvs.toDataURL('image/png'); } function forcarImagemDiretaDrive(url) { if (!url || typeof url !== 'string') return ""; let matchId = url.match(/\/d\/([a-zA-Z0-9_-]+)/); if (matchId && matchId[1]) return "https://lh3.googleusercontent.com/d/" + matchId[1]; let matchId2 = url.match(/id=([a-zA-Z0-9_-]+)/); if (matchId2 && matchId2[1]) return "https://lh3.googleusercontent.com/d/" + matchId2[1]; return url; }

function renderizarMotoristas() { let options = `<option value="">Selecione o Motorista...</option>`; if (window.listaMotoristas && window.listaMotoristas.length > 0) { window.listaMotoristas.forEach(m => { options += `<option value="${m}">${m}</option>`; }); } options += `<option value="NOVO" style="font-weight:bold; color:#1a4d2e;">➕ OUTRO (Adicionar Novo)</option>`; ['chk-motorista', 'chk-carro-motorista', 'chk-emp-motorista', 'abast-motorista', 'nome-motorista'].forEach(id => { let el = document.getElementById(id); if(el) el.innerHTML = options; }); }
function verificarNovoMotoristaAbast(sel) { let inputNovo = document.getElementById('abast-motorista-novo'); if(sel.value === "NOVO") { inputNovo.style.display = 'block'; inputNovo.focus(); } else { inputNovo.style.display = 'none'; inputNovo.value = ''; } }
function atualizarKMGeral() { document.getElementById('km-atual-oleo').innerText = document.getElementById('km-master').value; calcularOleo(); calcularRodizioPneus(); } 

function salvarFichaNaNuvemBackground() { 
    let payload = { acao: "salvar_ficha_tecnica", usuario: window.usuarioLogado, placa: document.getElementById('texto-placa-interna').innerText, tipo: document.getElementById('tipo-veiculo').value, motorista: document.getElementById('nome-motorista').value, km_atual: document.getElementById('km-master').value, km_oleo: document.getElementById('km-proxima-troca').value, data_tacografo: window.isCarro ? "" : document.getElementById('data-proxima-afericao').value, data_graxa: window.isCarro ? "" : document.getElementById('data-engraxada').value, qtd_carrinhos: window.isCarro ? "" : document.getElementById('qtd-carrinhos').value, qtd_cones: window.isCarro ? "" : document.getElementById('qtd-cones').value, qtd_calcos: window.isCarro ? "" : document.getElementById('qtd-calcos').value, data_extintor: document.getElementById('data-extintor-ficha').value, pneus: {} }; 
    let tIds = window.isCarro ? ['dd','de','td','te'] : (window.isToco ? ['dd','de','tde','tdi','tee','tei','1step'] : ['dd','de','tde','tdi','tee','tei','tkde','tkdi','tkee','tkei','1step','c1','c2','c3','c4','c5','c6','c7','c8','c9','c10','c11','c12','2step']); let pref = window.isCarro ? 'carro-' : ''; 
    tIds.forEach(id => { let km = document.getElementById(pref+'km-troca-'+id); if(km) { payload.pneus[id] = { km_ultima_troca: km.value, data_ultima_troca: document.getElementById(pref+'data-troca-'+id).value, data_ultimo_rodizio: document.getElementById(pref+'data-rodizio-'+id).value, pneu_colocado: document.getElementById(pref+'pneu-colocado-'+id).value, km_proximo_rodizio: document.getElementById(pref+'prox-rodizio-'+id).value }; } }); 
    
    window.frota[payload.placa].tipo = payload.tipo;
    window.frota[payload.placa].motorista = payload.motorista;
    window.frota[payload.placa].km_atual = payload.km_atual;
    window.frota[payload.placa].km_oleo = payload.km_oleo;
    window.frota[payload.placa].data_tacografo = payload.data_tacografo;
    window.frota[payload.placa].data_graxa = payload.data_graxa;
    window.frota[payload.placa].qtd_carrinhos = payload.qtd_carrinhos;
    window.frota[payload.placa].qtd_cones = payload.qtd_cones;
    window.frota[payload.placa].qtd_calcos = payload.qtd_calcos;
    window.frota[payload.placa].data_extintor = payload.data_extintor;
    for(let id in payload.pneus) {
        if(!window.frota[payload.placa].pneus[id]) window.frota[payload.placa].pneus[id] = {};
        window.frota[payload.placa].pneus[id].km_ultima_troca = payload.pneus[id].km_ultima_troca;
        window.frota[payload.placa].pneus[id].data_ultima_troca = payload.pneus[id].data_ultima_troca;
        window.frota[payload.placa].pneus[id].data_ultimo_rodizio = payload.pneus[id].data_ultimo_rodizio;
        window.frota[payload.placa].pneus[id].pneu_colocado = payload.pneus[id].pneu_colocado;
        window.frota[payload.placa].pneus[id].km_proximo_rodizio = payload.pneus[id].km_proximo_rodizio;
    }
    let elAv = document.getElementById('aviso-ultimo-km'); if(elAv) elAv.innerText = payload.km_atual;

    adicionarNaFila(payload);
    salvarCacheLocal();
    mostrarToast("💾 Ficha salva localmente (Sincronizando no fundo)");
} 

function alternarEdicaoHeader() { let c = [document.getElementById('tipo-veiculo'), document.getElementById('nome-motorista'), document.getElementById('km-master')]; let b = document.getElementById('btn-editar-header'); if (c[0].hasAttribute('readonly')) { c.forEach(x => { x.removeAttribute('readonly'); x.removeAttribute('disabled'); x.classList.remove('travado'); }); b.innerHTML = "💾 Salvar"; b.style.backgroundColor = "#1a4d2e"; b.style.color = "white"; c[0].focus(); } else { c.forEach(x => { x.setAttribute('readonly', 'true'); if(x.tagName === 'SELECT') x.setAttribute('disabled', 'true'); x.classList.add('travado'); }); b.innerHTML = "✏️ Editar"; b.style.backgroundColor = "transparent"; b.style.color = "#1a4d2e"; atualizarKMGeral(); salvarFichaNaNuvemBackground(); } } 
function alternarEdicaoOleo() { let c = document.getElementById('km-proxima-troca'); let b = document.getElementById('btn-editar-oleo'); if (c.hasAttribute('readonly')) { c.removeAttribute('readonly'); c.classList.remove('travado'); b.innerHTML = "💾 Salvar"; b.style.backgroundColor = "#1a4d2e"; b.style.color = "white"; } else { c.setAttribute('readonly', 'true'); c.classList.add('travado'); b.innerHTML = "✏️ Editar"; b.style.backgroundColor = "transparent"; b.style.color = "#1a4d2e"; calcularOleo(); salvarFichaNaNuvemBackground(); } } 
function calcularOleo() { let kmA = parseFloat(document.getElementById('km-master').value) || 0; let kmP = parseFloat(document.getElementById('km-proxima-troca').value) || 0; let kmF = kmP - kmA; let txt = document.getElementById('status-oleo'); if (kmP === 0) { txt.innerHTML = "---"; return; } if (kmF <= 0) { txt.innerHTML = `VENCIDO (${Math.abs(kmF)} KM) ❌`; txt.style.color = "red"; } else if (kmF <= 1500) { txt.innerHTML = `Faltam ${kmF} KM ⚠️`; txt.style.color = "#d4a017"; } else { txt.innerHTML = `Faltam ${kmF} KM ✅`; txt.style.color = "green"; } } 
function alternarEdicaoTacografo() { let c = document.getElementById('data-proxima-afericao'); let b = document.getElementById('btn-editar-tacografo'); if (c.hasAttribute('readonly')) { c.removeAttribute('readonly'); c.classList.remove('travado'); b.innerHTML = "💾 Salvar"; b.style.backgroundColor = "#1a4d2e"; b.style.color = "white"; } else { c.setAttribute('readonly', 'true'); c.classList.add('travado'); b.innerHTML = "✏️ Editar"; b.style.backgroundColor = "transparent"; b.style.color = "#1a4d2e"; calcularTacografo(); salvarFichaNaNuvemBackground(); } } 
function calcularTacografo() { let s = document.getElementById('data-proxima-afericao').value; let t = document.getElementById('status-tacografo'); if (!s || s.length < 8 || !s.includes('-')) { if(t) t.innerHTML = "---"; let dU = document.getElementById('data-ultima-afericao'); if(dU) dU.innerText = "--/--/----"; return; } let p = s.split('-'); let px = new Date(p[0], p[1] - 1, p[2]); let ul = new Date(px); ul.setFullYear(ul.getFullYear() - 2); document.getElementById('data-ultima-afericao').innerText = `${String(ul.getDate()).padStart(2,'0')}/${String(ul.getMonth()+1).padStart(2,'0')}/${ul.getFullYear()}`; let hj = new Date(); hj.setHours(0,0,0,0); let d = Math.ceil((px.getTime() - hj.getTime()) / (1000 * 3600 * 24)); if (d < 0) { t.innerHTML = `VENCIDO há ${Math.abs(d)} dias ❌`; t.style.color = "red"; } else if (d <= 30) { t.innerHTML = `Atenção: Faltam ${d} dias ⚠️`; t.style.color = "#d4a017"; } else { t.innerHTML = `Faltam ${d} dias ✅`; t.style.color = "green"; } } 
function alternarEdicaoPneus() { let pref = window.isCarro ? 'carro-' : ''; let i = document.querySelectorAll(`#conteudo-Ficha\\ Técnica input[id^="${pref}km-troca-"], #conteudo-Ficha\\ Técnica input[id^="${pref}data-troca-"], #conteudo-Ficha\\ Técnica input[id^="${pref}data-rodizio-"], #conteudo-Ficha\\ Técnica input[id^="${pref}prox-rodizio-"], #conteudo-Ficha\\ Técnica select[id^="${pref}pneu-colocado-"]`); let b = document.getElementById('btn-editar-pneus'); if (i[0].hasAttribute('readonly') || i[0].disabled) { i.forEach(c => { if(c.tagName === 'SELECT') c.disabled = false; else c.removeAttribute('readonly'); c.classList.remove('travado'); }); b.innerHTML = "💾 Salvar Pneus"; b.style.backgroundColor = "#1a4d2e"; b.style.color = "white"; } else { i.forEach(c => { if(c.tagName === 'SELECT') c.disabled = true; else c.setAttribute('readonly', 'true'); c.classList.add('travado'); }); b.innerHTML = "✏️ Editar Pneus"; b.style.backgroundColor = "transparent"; b.style.color = "#1a4d2e"; if(!window.isCarro) calcularRodizioPneus(); salvarFichaNaNuvemBackground(); } }
function calcularRodizioPneus() { let kmM = parseInt(document.getElementById('km-master').value) || 0; let tIds = window.isCarro ? ['dd','de','td','te'] : (window.isToco ? ['dd','de','tde','tdi','tee','tei','1step'] : ['dd','de','tde','tdi','tee','tei','tkde','tkdi','tkee','tkei','1step','c1','c2','c3','c4','c5','c6','c7','c8','c9','c10','c11','c12','2step']); let pref = window.isCarro ? 'carro-' : ''; tIds.forEach(p => { let sE = document.getElementById(`${pref}estado-${p}`); let tS = document.getElementById(`${pref}status-rod-${p}`); let pR_el = document.getElementById(`${pref}prox-rodizio-${p}`); if(!sE || !tS || !pR_el) return; let pR = parseInt(pR_el.value) || 0; if (pR === 0) { tS.innerText = "Aguardando..."; tS.style.color = "gray"; return; } let kF = pR - kmM; if (kF <= 0) { tS.innerHTML = `VENCIDO (${Math.abs(kF)} KM) ❌`; tS.style.color = "red"; } else if (kF <= 1500) { tS.innerHTML = `Faltam ${kF} KM ⚠️`; tS.style.color = "#d4a017"; } else { tS.innerHTML = `Faltam ${kF} KM ✅`; tS.style.color = "green"; } }); }
function alternarEdicaoEquip() { let c = [document.getElementById('qtd-carrinhos'), document.getElementById('qtd-cones'), document.getElementById('qtd-calcos'), document.getElementById('data-extintor-ficha')]; let b = document.getElementById('btn-editar-equip'); if (c[0].hasAttribute('readonly')) { c.forEach(x => { x.removeAttribute('readonly'); x.classList.remove('travado'); }); b.innerHTML = "💾 Salvar"; b.style.backgroundColor = "#1a4d2e"; b.style.color = "white"; } else { c.forEach(x => { x.setAttribute('readonly', 'true'); x.classList.add('travado'); }); b.innerHTML = "✏️ Editar"; b.style.backgroundColor = "transparent"; b.style.color = "#1a4d2e"; calcularExtintor(); salvarFichaNaNuvemBackground(); } } 
function calcularExtintor() { let s = document.getElementById('data-extintor-ficha').value; let t = document.getElementById('status-extintor'); if (!s || s.length < 8) { if(t) t.innerHTML = "---"; return; } let p = s.split('-'); let px = new Date(p[0], p[1] - 1, p[2]); let hj = new Date(); hj.setHours(0,0,0,0); let d = Math.ceil((px.getTime() - hj.getTime()) / (1000 * 3600 * 24)); if (d < 0) { t.innerHTML = `VENCIDO há ${Math.abs(d)} dias ❌`; t.style.color = "red"; } else if (d <= 30) { t.innerHTML = `Atenção: Vence em ${d} dias ⚠️`; t.style.color = "#d4a017"; } else { t.innerHTML = `Válido por ${d} dias ✅`; t.style.color = "green"; } } 
function alternarEdicaoAbast() { let c = [document.getElementById('abast-km-ant'), document.getElementById('abast-km-atual'), document.getElementById('abast-litros'), document.getElementById('data-engraxada')]; let b = document.getElementById('btn-editar-abast'); if (c[0].hasAttribute('readonly')) { c.forEach(x => { x.removeAttribute('readonly'); x.classList.remove('travado'); }); b.innerHTML = "💾 Salvar"; b.style.backgroundColor = "#1a4d2e"; b.style.color = "white"; } else { c.forEach(x => { x.setAttribute('readonly', 'true'); x.classList.add('travado'); }); b.innerHTML = "✏️ Editar"; b.style.backgroundColor = "transparent"; b.style.color = "#1a4d2e"; calcularAbastecimento(); calcularGraxa(); salvarFichaNaNuvemBackground(); } } 
function calcularAbastecimento() { let kA = parseFloat(document.getElementById('abast-km-ant').value) || 0; let kU = parseFloat(document.getElementById('abast-km-atual').value) || 0; let l = parseFloat(document.getElementById('abast-litros').value) || 0; let t = document.getElementById('abast-media'); if (l > 0 && kU > kA) t.innerText = ((kU - kA) / l).toFixed(2) + " km/L"; else t.innerText = "0.00 km/L"; } 
function calcularGraxa() { let s = document.getElementById('data-engraxada').value; let t = document.getElementById('status-graxa'); if (!s || s.length < 8) { if(t) t.innerHTML = "---"; document.getElementById('data-prox-engraxada').innerText = "--/--/----"; return; } let p = s.split('-'); let ultima = new Date(p[0], p[1] - 1, p[2]); let proxima = new Date(ultima); proxima.setDate(proxima.getDate() + 30); document.getElementById('data-prox-engraxada').innerText = `${String(proxima.getDate()).padStart(2,'0')}/${String(proxima.getMonth()+1).padStart(2,'0')}/${proxima.getFullYear()}`; let h = new Date(); h.setHours(0,0,0,0); let d = Math.ceil((proxima.getTime() - h.getTime()) / (1000 * 3600 * 24)); if (d < 0) { t.innerHTML = `VENCIDO há ${Math.abs(d)} dias ❌`; t.style.color = "red"; } else if (d <= 5) { t.innerHTML = `Atenção: Faltam ${d} dias ⚠️`; t.style.color = "#d4a017"; } else { t.innerHTML = `Faltam ${d} dias ✅`; t.style.color = "green"; } } 
function abrirDocPDF() { if (urlDocAtual && urlDocAtual.trim() !== "") window.open(urlDocAtual, '_blank'); else alert("Nenhum documento cadastrado para este veículo."); }
function renderizarHistoricoAbast() { let construtorHTML = (lista, isChegada) => { if (!lista || lista.length === 0) return "<p style='color:#666; font-size:12px; margin:0;'>Nenhum registro encontrado.</p>"; return lista.map(i => `<div style="display:flex; justify-content:space-between; padding:5px 0; border-bottom:1px solid #eee; font-size:12px;"><span>📅 ${i.data} ${isChegada ? '' : `- <b>${i.placa}</b>`}</span><span style="font-weight:bold; color:${isChegada ? '#1a4d2e' : '#b30000'};">${isChegada ? '+' : '-'} ${i.litros} L</span></div>`).join(''); }; let eD = document.getElementById('hist-abast-diesel'); if(eD) eD.innerHTML = construtorHTML(window.histAbast.diesel, false); let eA = document.getElementById('hist-abast-arla'); if(eA) eA.innerHTML = construtorHTML(window.histAbast.arla, false); let eCD = document.getElementById('hist-cheg-diesel'); if(eCD) eCD.innerHTML = construtorHTML(window.histAbast.cheg_diesel, true); let eCA = document.getElementById('hist-cheg-arla'); if(eCA) eCA.innerHTML = construtorHTML(window.histAbast.cheg_arla, true); } 
function mudarFormAbast() { let t = document.getElementById('tipo-abast').value; if (t.includes("CHEGADA")) { document.getElementById('form-abast-veiculo').style.display = 'none'; document.getElementById('form-abast-chegada').style.display = 'block'; } else { document.getElementById('form-abast-veiculo').style.display = 'block'; document.getElementById('form-abast-chegada').style.display = 'none'; } } 
function preencherDataHoraAbast() { let n = new Date(); let hL = new Date(n.getTime() - (n.getTimezoneOffset() * 60000)).toISOString().slice(0,16); let eA = document.getElementById('abast-data'); if(eA) eA.value = hL; let eC = document.getElementById('chegada-data'); if(eC) eC.value = hL; document.getElementById('estoque-diesel-geral').innerText = window.estoqueDiesel + " L"; document.getElementById('estoque-arla-geral').innerText = window.estoqueArla + " L"; document.getElementById('gasto-mes-geral').innerText = window.gastoMesGeral + " L"; }

async function salvarAbastecimentoNuvem() { 
    let t = document.getElementById('tipo-abast').value; 
    let pl = document.getElementById('texto-placa-interna').innerText; 
    let p = { acao: "salvar_abastecimento", usuario: window.usuarioLogado, tipo: t, placa: t.includes("CHEGADA") ? "ESTOQUE" : pl }; 
    
    if (t.includes("CHEGADA")) { 
        p.data = document.getElementById('chegada-data').value; 
        p.litros = parseFloat(document.getElementById('chegada-litros').value) || 0; 
        p.nf = document.getElementById('chegada-nf').value; 
        p.km = ""; p.motorista = ""; p.responsavel = ""; 
        if (!p.data || !p.litros || !p.nf) return alert("❌ Preencha Data, Litros e NF!"); 
    } else { 
        p.data = document.getElementById('abast-data').value; 
        p.km = parseFloat(document.getElementById('abast-km-novo').value) || 0; 
        p.litros = parseFloat(document.getElementById('abast-litros-bomba').value) || 0; 
        let motSel = document.getElementById('abast-motorista').value; 
        
        if (motSel === "NOVO") { 
            motSel = document.getElementById('abast-motorista-novo').value.trim().toUpperCase(); 
            if (!motSel) return alert("❌ Digite o nome do novo motorista!"); 
        } 
        
        p.motorista = motSel; 
        p.responsavel = document.getElementById('abast-resp').value; 
        p.nf = ""; 
        let kU = parseFloat(document.getElementById('aviso-ultimo-km').innerText) || 0; 
        
        if (!p.data || !p.km || !p.litros || !p.motorista || !p.responsavel) return alert("❌ Preencha todos os campos do Abastecimento!"); 
        if (p.km < kU) return alert(`❌ O KM digitado (${p.km}) não pode ser MENOR que o último (${kU})!`); 
    } 
    
    let btn = document.getElementById('btn-salvar-abast-nuvem'); 
    btn.innerText = "Enviando... ⏳"; 
    btn.disabled = true; 

    adicionarNaFila(p);
    
    alert("✅ Salvo no celular!\n\nO lançamento foi para a fila e será enviado automaticamente em 2º plano."); 
    
    document.getElementById('abast-km-novo').value = ""; 
    document.getElementById('abast-litros-bomba').value = ""; 
    document.getElementById('chegada-litros').value = ""; 
    document.getElementById('chegada-nf').value = ""; 
    
    let hj = new Date(); 
    let hjStr = String(hj.getDate()).padStart(2,'0') + '/' + String(hj.getMonth()+1).padStart(2,'0') + '/' + hj.getFullYear(); 
    let newItem = { data: hjStr, placa: pl, litros: p.litros }; 
    
    if (!t.includes("CHEGADA")) { 
        window.frota[pl].km_atual = p.km; 
        document.getElementById('km-master').value = p.km; 
        document.getElementById('aviso-ultimo-km').innerText = p.km; 
        if(t === "DIESEL" || t === "COMBUSTÍVEL") { 
            window.frota[pl].abast_atual.km_ant = window.frota[pl].abast_atual.km_atual; 
            window.frota[pl].abast_atual.km_atual = p.km; 
            window.frota[pl].abast_atual.litros = p.litros; 
            
            document.getElementById('abast-km-ant').value = window.frota[pl].abast_atual.km_ant; 
            document.getElementById('abast-km-atual').value = window.frota[pl].abast_atual.km_atual; 
            document.getElementById('abast-litros').value = window.frota[pl].abast_atual.litros; 
            
            calcularAbastecimento(); 
            atualizarKMGeral(); 
            
            window.frota[pl].gasto_mes = (window.frota[pl].gasto_mes || 0) + p.litros; 
            document.getElementById('abast-gasto-mes').innerText = window.frota[pl].gasto_mes + " L"; 
            window.estoqueDiesel -= p.litros; 
            window.gastoMesGeral += p.litros; 
            window.histAbast.diesel.unshift(newItem); 
            window.histAbast.diesel = window.histAbast.diesel.slice(0, 24); 
        } 
        if(t === "ARLA") { 
            window.estoqueArla -= p.litros; 
            window.histAbast.arla.unshift(newItem); 
            window.histAbast.arla = window.histAbast.arla.slice(0, 24); 
        } 
    } else { 
        if(t === "CHEGADA DE DIESEL") { 
            window.estoqueDiesel += p.litros; 
            window.histAbast.cheg_diesel.unshift(newItem); 
            window.histAbast.cheg_diesel = window.histAbast.cheg_diesel.slice(0, 3); 
        } 
        if(t === "CHEGADA DE ARLA") { 
            window.estoqueArla += p.litros; 
            window.histAbast.cheg_arla.unshift(newItem); 
            window.histAbast.cheg_arla = window.histAbast.cheg_arla.slice(0, 3); 
        } 
    } 
    preencherDataHoraAbast(); 
    renderizarHistoricoAbast(); 
    salvarCacheLocal();
    
    btn.innerText = "💾 Salvar Lançamento"; 
    btn.disabled = false;
}

function renderizarEstoquePecas() { let container = document.getElementById('lista-estoque-atual'); let comboMov = document.getElementById('est-item'); let comboCompra = document.getElementById('lista-pecas'); if(!container || !comboMov) return; if (!window.estoquePecas || window.estoquePecas.length === 0) { container.innerHTML = "<p style='text-align:center; color:#666;'>Nenhuma peça cadastrada no estoque.</p>"; return; } let htmlStr = ""; let comboStrMov = ""; let comboStrCompra = ""; window.estoquePecas.forEach((peca, index) => { htmlStr += `<div style="border-bottom: 1px dashed #ccc; padding: 10px 0; margin-bottom: 5px;"><div style="font-weight:bold; color:#1a4d2e; margin-bottom:5px; font-size:14px;">${peca.item}</div><div style="display:flex; justify-content:space-between; gap:5px;"><div style="flex:1;"><span class="info-label" style="font-size:11px; margin:0; display:block;">Qtd Estoque:</span><input type="number" id="est-edit-qtd-${index}" class="input-editavel travado est-edit-input" value="${peca.qtd || 0}" readonly style="width:100%;"></div><div style="flex:1;"><span class="info-label" style="font-size:11px; margin:0; display:block;">Vlr Pago (R$):</span><input type="number" id="est-edit-valor-${index}" class="input-editavel travado est-edit-input" value="${peca.valor || 0}" readonly style="width:100%;"></div></div><div style="margin-top:5px;"><span class="info-label" style="font-size:11px; margin:0; display:block;">Data Últ. Compra:</span><input type="date" id="est-edit-data-${index}" class="input-editavel travado est-edit-input" value="${peca.data_compra || ''}" readonly style="width:100%;"></div></div>`; comboStrMov += `<option value="${index}">${peca.item}</option>`; comboStrCompra += `<option value="${peca.item}"></option>`; }); comboMov.innerHTML = comboStrMov; if(comboCompra) comboCompra.innerHTML = comboStrCompra; container.innerHTML = htmlStr; } function alternarEdicaoEstoque() { let inputs = document.querySelectorAll('.est-edit-input'); let btn = document.getElementById('btn-editar-estoque'); if (!inputs || inputs.length === 0) return; if (inputs[0].hasAttribute('readonly')) { inputs.forEach(x => { x.removeAttribute('readonly'); x.classList.remove('travado'); }); btn.innerHTML = "💾 Salvar"; btn.style.backgroundColor = "#1a4d2e"; btn.style.color = "white"; } else { inputs.forEach(x => { x.setAttribute('readonly', 'true'); x.classList.add('travado'); }); btn.innerHTML = "✏️ Editar"; btn.style.backgroundColor = "transparent"; btn.style.color = "#1a4d2e"; salvarEdicaoEstoqueNuvem(); } } 
async function salvarEdicaoEstoqueNuvem() { 
    let pecasEditadas = {}; 
    window.estoquePecas.forEach((peca, index) => { let nQtd = document.getElementById(`est-edit-qtd-${index}`).value; let nData = document.getElementById(`est-edit-data-${index}`).value; let nValor = document.getElementById(`est-edit-valor-${index}`).value; peca.qtd = nQtd; peca.data_compra = nData; peca.valor = nValor; pecasEditadas[peca.item] = { qtd: nQtd, data_compra: nData, valor: nValor }; }); 
    let payload = { acao: "editar_estoque", usuario: window.usuarioLogado, pecas: pecasEditadas }; 
    adicionarNaFila(payload);
    salvarCacheLocal();
    mostrarToast("💾 Edições salvas localmente (Enviando em fundo)");
} 
function mudarFormEstoque() { let t = document.getElementById('est-tipo').value; document.getElementById('div-est-placa').style.display = t === "SAÍDA" ? "block" : "none"; document.getElementById('div-est-compra').style.display = t === "ENTRADA" ? "block" : "none"; } 

async function salvarMovimentacaoEstoque() { 
    let idItem = document.getElementById('est-item').value; let tipo = document.getElementById('est-tipo').value; let qtd = document.getElementById('est-qtd').value; let placa = document.getElementById('est-placa').value; let valor = document.getElementById('est-valor').value; let link = document.getElementById('est-link').value; let resp = document.getElementById('est-resp') ? document.getElementById('est-resp').value : window.usuarioLogado; 
    if(!qtd) return alert("❌ Digite a quantidade!"); 
    let peca = window.estoquePecas[idItem]; let n = new Date(); let hL = new Date(n.getTime() - (n.getTimezoneOffset() * 60000)).toISOString().slice(0,16); 
    let p = { acao: "salvar_estoque", usuario: window.usuarioLogado, data: hL.replace('T', ' '), item: peca.item, tipo: tipo, qtd: qtd, placa: tipo === "SAÍDA" ? placa : "", valor: tipo === "ENTRADA" ? valor : "", link: tipo === "ENTRADA" ? link : "", responsavel: resp }; 
    
    let btn = document.getElementById('btn-salvar-mov-est'); btn.innerText = "Salvando... ⏳"; btn.disabled = true; 
    
    adicionarNaFila(p);
    
    let q = parseFloat(qtd); 
    if (tipo === "SAÍDA") { peca.qtd = parseFloat(peca.qtd) - q; } 
    if (tipo === "ENTRADA") { peca.qtd = parseFloat(peca.qtd) + q; if(valor) peca.valor = valor; if(q) peca.qtd_compra = q; if(link) peca.link = link; peca.data_compra = p.data.substring(0,10); } 
    
    salvarCacheLocal();
    renderizarEstoquePecas(); 
    document.getElementById('est-qtd').value = ""; document.getElementById('est-placa').value = ""; document.getElementById('est-valor').value = ""; document.getElementById('est-link').value = ""; 
    
    alert("✅ Movimentação salva no celular!\nSerá sincronizada na nuvem."); 
    btn.innerText = "💾 Salvar Movimentação"; btn.disabled = false; 
}
      
async function gerarSolicitacaoCompra() { 
    if (!navigator.onLine) return alert("❌ Você precisa estar conectado à internet para gerar o PDF de Compra!");

    let nomeItem = document.getElementById('compra-item').value; if(!nomeItem) return alert("❌ Selecione ou digite o item que deseja comprar!"); let qtd = document.getElementById('compra-qtd').value; let urgencia = document.getElementById('compra-urgencia').value; if(!qtd) return alert("❌ Digite a quantidade que precisa comprar!"); 
    let peca = window.estoquePecas.find(p => p.item === nomeItem) || { item: nomeItem, qtd_compra: "---", valor: "---", link: "---" }; 
    let n = new Date(); let hL = new Date(n.getTime() - (n.getTimezoneOffset() * 60000)).toISOString(); 
    let p = { acao: "solicitar_compra", usuario: window.usuarioLogado, data: hL, item: peca.item, qtd: qtd, urgencia: urgencia, qtd_ref: peca.qtd_compra, valor_ref: peca.valor, link_ref: peca.link }; 
    let btn = document.getElementById('btn-gerar-compra'); btn.innerText = "Gerando PDF... ⏳"; btn.disabled = true; 
    try { 
        let req = await fetch(API_URL, { method: 'POST', body: JSON.stringify(p) }); let res = await req.json(); 
        if (res.sucesso) { 
            alert("✅ Pedido de Compra gerado com sucesso!"); window.open(res.link_pdf, '_blank'); 
            document.getElementById('compra-qtd').value = ""; document.getElementById('compra-item').value = ""; 
            btn.innerText = "📄 Gerar Pedido de Compra (PDF)"; btn.disabled = false;
        } else { alert("❌ Erro: " + res.erro); btn.innerText = "📄 Gerar Pedido de Compra (PDF)"; btn.disabled = false; } 
    } catch (e) { 
        alert("⚠️ Instabilidade na rede detectada.\n\nO PDF da compra pode já ter sido gerado. Aguarde e verifique."); 
        setTimeout(() => { btn.innerText = "📄 Tentar Novamente"; btn.disabled = false; }, 5000);
    } 
}

function calcularStatusTwi(inE, bId) { let b = document.getElementById(bId); if(!b) return; let v = parseFloat(inE.value); if (isNaN(v)) { b.innerText = "Aguardando..."; b.style.backgroundColor = "#eee"; b.style.color = "#666"; return; } if (v >= 10) { b.innerText = "Pneu Novo"; b.style.backgroundColor = "#d4edda"; b.style.color = "#155724"; } else if (v >= 5) { b.innerText = "Meia-Vida"; b.style.backgroundColor = "#fff3cd"; b.style.color = "#856404"; } else { b.innerText = "No Limite"; b.style.backgroundColor = "#f8d7da"; b.style.color = "#721c24"; } } function processarFoto(input, idPreview) { if (!input.files || !input.files[0]) return; const r = new FileReader(); r.onload = function(e) { const img = new Image(); img.src = e.target.result; img.onload = function() { const cv = document.createElement('canvas'); const MW = 800; let w = img.width; let h = img.height; if (w > MW) { h = Math.round((h * MW) / w); w = MW; } cv.width = w; cv.height = h; const cx = cv.getContext('2d'); cx.drawImage(img, 0, 0, w, h); const dU = cv.toDataURL('image/jpeg', 0.6); if(idPreview === 'preview-lat' || idPreview === 'preview-frente') b64Lateral = dU; if(idPreview === 'preview-tras' || idPreview === 'preview-verso') b64Traseira = dU; let pr = document.getElementById(idPreview); pr.src = dU; pr.style.display = 'block'; } }; r.readAsDataURL(input.files[0]); } 

function renderizarHistorico(d) { 
    let c = document.getElementById('container-historico'); 
    c.innerHTML = ""; 
    if (!d || d.length === 0) { 
        c.innerHTML = "<p style='text-align:center; color:#666;'>Nenhum checklist registrado ainda.</p>"; 
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

function iniciarNovoChecklist() { let pl = document.getElementById('texto-placa-interna').innerText; document.getElementById('lista-historico-checklist').style.display = 'none'; document.querySelectorAll('input[type="checkbox"]').forEach(c => c.checked = false); document.querySelectorAll('input[id$="-outro"]').forEach(c => { c.value = ""; c.style.display = 'none'; }); document.querySelectorAll('input[id^="chk-twi-"], input[id^="chk-carro-twi-"]').forEach(i => i.value = ""); document.querySelectorAll('.twi-estado-badge').forEach(b => { b.innerText = "Aguardando..."; b.style.backgroundColor = "#eee"; b.style.color = "#666"; }); b64Lateral = ""; b64Traseira = ""; ['foto-lat-input', 'foto-tras-input', 'foto-frente-input', 'foto-verso-input'].forEach(id => {let i=document.getElementById(id); if(i) i.value="";}); ['preview-lat', 'preview-tras', 'preview-frente', 'preview-verso'].forEach(id => {let p=document.getElementById(id); if(p) p.style.display="none";}); let mA = new Date().toISOString().slice(0, 7); let ve = window.frota[pl]; if (window.isEmpilhadeira) { document.getElementById('form-novo-checklist').style.display = 'none'; document.getElementById('form-novo-checklist-carro').style.display = 'none'; document.getElementById('form-novo-checklist-empilhadeira').style.display = 'block'; document.getElementById('chk-emp-placa').value = pl; document.getElementById('chk-emp-km').value = document.getElementById('km-master').value; limparPad('ass-mot-emp'); limparPad('ass-ger-emp'); initPad('ass-mot-emp'); initPad('ass-ger-emp'); } else if (window.isCarro) { document.getElementById('form-novo-checklist').style.display = 'none'; document.getElementById('form-novo-checklist-carro').style.display = 'block'; document.getElementById('form-novo-checklist-empilhadeira').style.display = 'none'; let cFc = document.getElementById('container-inputs-fotos-carro'); let aFc = document.getElementById('aviso-fotos-ok-carro'); if(cFc && aFc) { if (ve && ve.mes_foto === mA) { cFc.style.display = 'none'; aFc.style.display = 'block'; } else { cFc.style.display = 'block'; aFc.style.display = 'none'; } } document.getElementById('chk-carro-placa').value = pl; document.getElementById('chk-carro-modelo').value = document.getElementById('tipo-veiculo').value; document.getElementById('chk-carro-motorista').value = document.getElementById('nome-motorista').value; document.getElementById('chk-carro-km').value = document.getElementById('km-master').value; document.getElementById('chk-carro-oleo').value = document.getElementById('km-proxima-troca').value; document.getElementById('chk-carro-extintor-data').value = document.getElementById('data-extintor-ficha').value; limparPad('ass-mot-car'); limparPad('ass-ger-car'); initPad('ass-mot-car'); initPad('ass-ger-car'); } else { document.getElementById('form-novo-checklist').style.display = 'block'; document.getElementById('form-novo-checklist-carro').style.display = 'none'; document.getElementById('form-novo-checklist-empilhadeira').style.display = 'none'; let cF = document.getElementById('container-inputs-fotos'); let aF = document.getElementById('aviso-fotos-ok'); let sF = document.querySelector('#form-novo-checklist .sessao-fotos-checklist'); if (window.isCavalo) { if(sF) sF.style.display = 'none'; } else { if(sF) sF.style.display = 'block'; if(cF && aF) { if (ve && ve.mes_foto === mA) { cF.style.display = 'none'; aF.style.display = 'block'; } else { cF.style.display = 'block'; aF.style.display = 'none'; } } } document.getElementById('chk-placa').value = pl; document.getElementById('chk-modelo').value = document.getElementById('tipo-veiculo').value; document.getElementById('chk-motorista').value = document.getElementById('nome-motorista').value; document.getElementById('chk-km').value = document.getElementById('km-master').value; document.getElementById('chk-km-oleo').value = document.getElementById('km-proxima-troca').value; document.getElementById('chk-data-taco').value = document.getElementById('data-proxima-afericao').value; document.getElementById('chk-data-graxa').value = document.getElementById('data-engraxada').value; document.getElementById('chk-extintor-data').value = document.getElementById('data-extintor-ficha').value; document.getElementById('chk-qtd-carrinhos').value = document.getElementById('qtd-carrinhos').value; document.getElementById('chk-qtd-cones').value = document.getElementById('qtd-cones').value; document.getElementById('chk-qtd-calcos').value = document.getElementById('qtd-calcos').value; limparPad('ass-mot-cam'); limparPad('ass-ger-cam'); initPad('ass-mot-cam'); initPad('ass-ger-cam'); mudarAbaChecklist(1); } } 
function cancelarChecklist() { escolherModulo('Checklist'); } 
function mudarAbaChecklist(ps) { for(let i=1; i<=4; i++) { let pt = document.getElementById('passo-chk-'+i); if(pt) pt.style.display = 'none'; let tb = document.getElementById('tab-chk-'+i); if(tb) tb.classList.remove('ativo'); } let pA = document.getElementById('passo-chk-'+ps); if(pA) pA.style.display = 'block'; let tA = document.getElementById('tab-chk-'+ps); if(tA) tA.classList.add('ativo'); } 
function avancarPasso(px) { let pA = px - 1; if (pA === 1) { if(window.isCavalo && !document.getElementById('chk-placa-carreta').value) return alert("❌ Selecione a Placa da Carreta!"); if(!document.getElementById('chk-modelo').value || !document.getElementById('chk-motorista').value || !document.getElementById('chk-km').value) return alert("❌ Preencha os campos obrigatórios!"); if(!window.isCavalo) { if(!document.getElementById('chk-qtd-carrinhos').value || !document.getElementById('chk-qtd-cones').value || !document.getElementById('chk-qtd-calcos').value) return alert("❌ Preencha a Quantidade de Carrinhos, Cones e Calços!"); } } if (pA === 2) { let gM = ['chk-motor', 'chk-cambio', 'chk-embreagem', 'chk-direcao', 'chk-freios', 'chk-suspensao']; for (let g of gM) { if (document.querySelectorAll(`input[name="${g}"]:checked`).length === 0) return alert(`❌ Faltou preencher as sessões de Mecânica!`); } if (window.isCavalo) { if (!document.getElementById('chk-asa').value || !document.getElementById('chk-freio-lona').value || !document.getElementById('chk-faixas').value) return alert("❌ Responda as perguntas da Carreta!"); } } if (pA === 3) { let gE = ['chk-pneus_geral', 'chk-eletrica', 'chk-indicadores', 'chk-cabine']; for (let g of gE) { if (document.querySelectorAll(`input[name="${g}"]:checked`).length === 0) return alert(`❌ Faltou preencher as sessões de Cabine/Elétrica!`); } } mudarAbaChecklist(px); } 
function verificarOutro(ck, idC) { let cp = document.getElementById(idC); if (ck.value === "OUTRO" && ck.checked) { cp.style.display = 'block'; cp.focus(); } else if (ck.value === "OUTRO" && !ck.checked) { cp.style.display = 'none'; cp.value = ''; } } 
function verificarOutroSelect(sl, idC) { let cp = document.getElementById(idC); if(sl.value === "OUTRO") { cp.style.display = 'block'; cp.focus(); } else { cp.style.display = 'none'; cp.value = ''; } } 
function verificarTudoOk(ck, nG) { if (ck.checked && ck.value.includes("TODOS OS ITENS ESTÃO NO CARRO")) { document.querySelectorAll(`input[name="${nG}"]`).forEach(c => { if (c !== ck) c.checked = false; }); let tO = document.getElementById("chk-carro-outro"); if(tO) { tO.style.display = 'none'; tO.value = ''; } } else if (ck.checked && ck.value.includes("NÃO APRESENTA")) { document.querySelectorAll(`input[name="${nG}"]`).forEach(c => { if (c !== ck) c.checked = false; }); let tO = document.getElementById(nG + "-outro"); if(tO) { tO.style.display = 'none'; tO.value = ''; } } else if (ck.checked) { document.querySelectorAll(`input[name="${nG}"]`).forEach(c => { if (c.value.includes("NÃO APRESENTA") || c.value.includes("TODOS OS ITENS ESTÃO NO CARRO")) c.checked = false; }); } } 
function pegarMarcados(nG, idO) { let s = []; document.querySelectorAll(`input[name="${nG}"]:checked`).forEach(c => { if(c.value !== "OUTRO") s.push(c.value); }); let tO = document.getElementById(idO); if (tO && tO.value.trim() !== "") s.push("OUTROS: " + tO.value.trim()); return s.length > 0 ? s.join(" | ") : "Não avaliado"; } 
function getSelOuOutro(idO) { let i = document.getElementById(idO); if(!i) return ""; let s = i.previousElementSibling; return s.value === "OUTRO" ? (i.value || "Outro não esp.") : s.value; }

async function enviarChecklistCarro() { 
    if (document.querySelectorAll(`input[name="chk-carro-itens"]:checked`).length === 0) return alert("❌ Informe a situação dos itens do veículo!"); if (!document.getElementById('chk-carro-extintor-data').value) return alert("❌ Informe a Data de Validade do Extintor!"); for (let id of ['dd', 'de', 'td', 'te']) { if (!document.getElementById('chk-carro-twi-' + id).value) return alert(`❌ Preencha o TWI do Pneu ${id.toUpperCase()}!`); } if (document.getElementById('container-inputs-fotos-carro').style.display !== 'none') { if (!b64Lateral || !b64Traseira) return alert("❌ É obrigatório enviar a Foto Frente e Verso do veículo!"); } let assMot = getPadB64('ass-mot-car'); let assGer = getPadB64('ass-ger-car'); if(!assMot || !assGer) return alert("❌ É obrigatório recolher a assinatura do Motorista e do Gerente!"); 
    let btn = document.getElementById('btn-enviar-chk-carro'); btn.innerText = "Preparando... ⏳"; btn.disabled = true; 
    let dE = document.getElementById('chk-carro-extintor-data').value; let pE = document.getElementById('chk-carro-extintor-pressao').value; let pl = { acao: "salvar_checklist", usuario: window.usuarioLogado, placa: document.getElementById('chk-carro-placa').value, categoria: "CARRO", placa_carreta: "", modelo: document.getElementById('chk-carro-modelo').value, motorista: document.getElementById('chk-carro-motorista').value, km_atual: document.getElementById('chk-carro-km').value, km_oleo: document.getElementById('chk-carro-oleo').value, data_tacografo: "", data_graxa: "", data_extintor: dE, chk_motor: "N/A", chk_cambio: "N/A", chk_embreagem: "N/A", chk_direcao: "N/A", chk_freios: "N/A", chk_suspensao: "N/A", chk_pneus_geral: "N/A", chk_eletrica: "N/A", chk_indicadores: "N/A", chk_cabine: "N/A", chk_faltantes: pegarMarcados('chk-carro-itens', 'chk-carro-outro'), chk_asa_delta: "", chk_freio_lona: "", chk_faixas: "", chk_extintores: `Val: ${dE} - ${pE}`, chk_parada: document.getElementById('chk-carro-parada').value, chk_obs: document.getElementById('chk-carro-obs').value, foto_lateral_b64: b64Lateral, foto_traseira_b64: b64Traseira, assinatura_motorista_b64: assMot, assinatura_gerente_b64: assGer, qtd_carrinhos: "", qtd_cones: "", qtd_calcos: "", pneus: {} }; ['dd','de','td','te'].forEach(id => { let eT = document.getElementById('chk-carro-twi-' + id); if(eT && eT.value) pl.pneus[id] = { milimetros: eT.value, estado: document.getElementById('badge-carro-estado-' + id).innerText }; }); 
    
    window.frota[pl.placa].km_atual = pl.km_atual; window.frota[pl.placa].km_oleo = pl.km_oleo; window.frota[pl.placa].data_extintor = pl.data_extintor; 
    for(let i in pl.pneus) { if(!window.frota[pl.placa].pneus[i]) window.frota[pl.placa].pneus[i] = {}; window.frota[pl.placa].pneus[i].milimetros = pl.pneus[i].milimetros; window.frota[pl.placa].pneus[i].estado = pl.pneus[i].estado; } 
    let hS = new Date().toISOString(); window.historicoChecklist.unshift({data: hS, placa: pl.placa}); 
    
    adicionarNaFila(pl);
    salvarCacheLocal();

    alert("✅ Inspeção finalizada localmente!\n\nO PDF será gerado na nuvem na próxima sincronização em 2º plano."); 
    escolherModulo('Checklist');
    btn.innerText = "💾 Enviar Inspeção e PDF"; btn.disabled = false; 
}

async function enviarChecklist() { 
    let dE = document.getElementById('chk-extintor-data').value; 
    let pE = document.getElementById('chk-extintor-pressao').value; 
    let assMot = getPadB64('ass-mot-cam'); 
    let assGer = getPadB64('ass-ger-cam'); 
    
    if(!assMot || !assGer) return alert("❌ Assinaturas obrigatórias!"); 
    
    let catStr = window.isCavalo ? "CAVALO" : "CAMINHAO"; 
    let pl = { 
        acao: "salvar_checklist", usuario: window.usuarioLogado, placa: document.getElementById('chk-placa').value, 
        categoria: catStr, placa_carreta: window.isCavalo ? document.getElementById('chk-placa-carreta').value : "", 
        modelo: document.getElementById('chk-modelo').value, motorista: document.getElementById('chk-motorista').value, 
        km_atual: document.getElementById('chk-km').value, km_oleo: document.getElementById('chk-km-oleo').value, 
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
            pl.pneus[id] = { milimetros: eT.value, estado: document.getElementById('badge-estado-' + id).innerText }; 
        } 
    }); 
    
    let btn = document.getElementById('btn-enviar-chk'); 
    btn.innerText = "Preparando... ⏳"; 
    btn.disabled = true; 

    adicionarNaFila(pl);
    window.historicoChecklist.unshift({data: new Date().toISOString(), placa: pl.placa}); 
    salvarCacheLocal();

    alert("✅ Sucesso!\n\nO checklist foi salvo no celular e o PDF será gerado na nuvem durante a sincronização."); 
    escolherModulo('Checklist');
    
    btn.innerText = "💾 Enviar Checklist e Gerar PDF"; 
    btn.disabled = false;
}

async function enviarChecklistEmpilhadeira() { 
    let obs = document.getElementById('chk-emp-obs').value; let checks = pegarMarcados('chk-emp-itens', 'chk-emp-outro'); let assMot = getPadB64('ass-mot-emp'); let assGer = getPadB64('ass-ger-emp'); if(!assMot || !assGer) return alert("❌ Assinaturas obrigatórias!"); let pl = { acao: "salvar_checklist", usuario: window.usuarioLogado, placa: document.getElementById('chk-emp-placa').value, categoria: "EMPILHADEIRA", modelo: "EMPILHADEIRA", motorista: document.getElementById('chk-emp-motorista').value, chk_faltantes: checks, chk_obs: obs, assinatura_motorista_b64: assMot, assinatura_gerente_b64: assGer, km_atual: document.getElementById('chk-emp-km').value, km_oleo: "", data_tacografo: "", data_graxa: "", data_extintor: "", chk_motor: "N/A", chk_cambio: "N/A", chk_embreagem: "N/A", chk_direcao: "N/A", chk_freios: "N/A", chk_suspensao: "N/A", chk_pneus_geral: "N/A", chk_eletrica: "N/A", chk_indicadores: "N/A", chk_cabine: "N/A", chk_asa_delta: "", chk_freio_lona: "", chk_faixas: "", chk_extintores: "", chk_parada: "N/A", foto_lateral_b64: "", foto_traseira_b64: "", qtd_carrinhos: "", qtd_cones: "", qtd_calcos: "", pneus: {} }; 
    let btn = document.getElementById('btn-enviar-chk-emp'); btn.innerText = "Preparando... ⏳"; btn.disabled = true; 
    
    adicionarNaFila(pl);
    window.historicoChecklist.unshift({data: new Date().toISOString(), placa: pl.placa}); 
    salvarCacheLocal();

    alert("✅ Inspeção salva localmente!\nSerá sincronizada em 2º plano automaticamente."); 
    escolherModulo('Checklist');
    btn.innerText = "💾 Enviar Inspeção e PDF"; btn.disabled = false;
}
