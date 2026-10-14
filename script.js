/* =========================================================
   SISTEMA LINCE - JAVASCRIPT LOCAL FRONT-END
   Gerencia a inversão do Menu -> Placa, Validações, Fotos, PDF, etc.
   ========================================================= */

const API_URL = "https://script.google.com/macros/s/AKfycbxHi49LtwY3FI5s0H9c7C-HebuQvUg7-CeHLuxiX35phkjagenPW9jlxm81qAM5YDyQ/exec";
const APP_VERSAO = "2.1"; // Versão atualizada para forçar a limpeza da cache nos celulares

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
    
    // CORREÇÃO: Só cria um ID de transação novo se for um formulário INÉDITO.
    // Se for uma Edição, preserva o ID original para o Google achar a linha certa.
    if (!payload.id_transacao) {
        payload.id_transacao = payload._localId;
    }
    
    fila.push(payload);
    localStorage.setItem('lince_fila_requisicoes', JSON.stringify(fila));
    
    // Mostra indicador visual na tela que há pendências
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
