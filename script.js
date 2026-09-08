/* =========================================================
   SISTEMA LINCE - JAVASCRIPT LOCAL FRONT-END
   Gerencia a inversão do Menu -> Placa, Validações, Fotos, PDF, etc.
   ========================================================= */

const API_URL = "https://script.google.com/macros/s/AKfycbxvxiDr82rljfQtwcIVAxVKgBb09QRnS5cdIl2j15m9BjZ3PSaH7olg2RpDzIM2smf5tA/exec";
const CAVALOS = ['FEF7C02', 'GHE3C06', 'FYY7G32']; 
const CARROS = ['CLW4E92', 'UGF2G86', 'FGX2A32'];
const EMPILHADEIRAS = ['05025DR3290', '05025DR8824'];

window.isCavalo = false; window.isCarro = false; window.isEmpilhadeira = false;
let urlDocAtual = ""; 
window.frota = {}; 
window.estoqueDiesel = 0; window.estoqueArla = 0; window.gastoMesGeral = 0;
window.histAbast = { diesel: [], arla: [], cheg_diesel: [], cheg_arla: [] };
window.estoquePecas = []; window.usuarioLogado = ""; window.listaMotoristas = [];

// Variável para saber em qual tela interna o usuário quer ir após escolher a placa
window.moduloAtual = ""; 

const pneusCavalo = [ {id:'dd',n:'DD'}, {id:'de',n:'DE'}, {id:'tde',n:'TDE'}, {id:'tdi',n:'TDI'}, {id:'tee',n:'TEE'}, {id:'tei',n:'TEI'}, {id:'tkde',n:'TKDE'}, {id:'tkdi',n:'TKDI'}, {id:'tkee',n:'TKEE'}, {id:'tkei',n:'TKEI'}, {id:'1step',n:'1º STEP'} ];
const pneusCarreta = [ {id:'c1',n:'C1'}, {id:'c2',n:'C2'}, {id:'c3',n:'C3'}, {id:'c4',n:'C4'}, {id:'c5',n:'C5'}, {id:'c6',n:'C6'}, {id:'c7',n:'C7'}, {id:'c8',n:'C8'}, {id:'c9',n:'C9'}, {id:'c10',n:'C10'}, {id:'2step',n:'2º STEP'} ];
const pneusCarro = [ {id:'dd',n:'DD'}, {id:'de',n:'DE'}, {id:'td',n:'TD'}, {id:'te',n:'TE'} ];

let htmlFichaCavalo = ""; let htmlChkCavalo = "";
let htmlFichaCarreta = ""; let htmlChkCarreta = "";
let htmlFichaCarro = ""; let htmlChkCarro = "";
let b64Lateral = ""; let b64Traseira = "";

// Prepara e Injeta o HTML dos pneus automaticamente quando abre
window.onload = function() {
    let construtorFicha = (arr, isCar) => arr.map(p => `<details><summary>${p.n}</summary><div class="pneu-detalhes"><div class="linha-info"><span class="info-label" style="margin:0;">Estado:</span> <span class="info-valor" id="${isCar?'carro-':''}estado-${p.id}" style="font-weight:bold;">---</span></div><div class="linha-info"><span class="info-label" style="margin:0;">TWI:</span> <span class="info-valor" id="${isCar?'carro-':''}twi-${p.id}">---</span></div><div class="linha-info" style="margin-top:10px;"><span class="info-label" style="margin:0;">KM Troca:</span> <input type="number" id="${isCar?'carro-':''}km-troca-${p.id}" class="input-editavel travado" value="0" readonly></div><div class="linha-info" style="margin-top:5px;"><span class="info-label" style="margin:0;">Data Troca:</span> <input type="date" id="${isCar?'carro-':''}data-troca-${p.id}" class="input-editavel travado" readonly></div><div class="linha-info" style="margin-top:5px; border-top:1px dashed #ccc; padding-top:5px;"><span class="info-label" style="margin:0;">Próx Rodízio:</span> <span class="info-valor" id="${isCar?'carro-':''}prox-rod-${p.id}">---</span></div><div class="linha-info"><span class="info-label" style="margin:0;">Status Rodízio:</span> <span id="${isCar?'carro-':''}status-rod-${p.id}" style="font-weight:bold;">---</span></div></div></details>`).join('');
    let construtorChk = (arr, isCar) => arr.map(p => `<div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; border-bottom: 1px dashed #ccc; padding-bottom: 5px;"><span style="font-weight: bold; width: 50px; color:${arr===pneusCarreta?'#0056b3':'#333'};">${p.n}</span><input type="number" id="${isCar?'chk-carro-twi-':'chk-twi-'}${p.id}" placeholder="mm" class="input-campo" style="margin:0; width: 80px; padding: 10px; text-align:center;" oninput="calcularStatusTwi(this, '${isCar?'badge-carro-estado-':'badge-estado-'}${p.id}')"><span id="${isCar?'badge-carro-estado-':'badge-estado-'}${p.id}" class="twi-estado-badge" style="flex: 1;">Aguardando...</span></div>`).join('');

    htmlFichaCavalo = construtorFicha(pneusCavalo, false); htmlChkCavalo = construtorChk(pneusCavalo, false);
    htmlFichaCarreta = construtorFicha(pneusCarreta, false); htmlChkCarreta = construtorChk(pneusCarreta, false);
    htmlFichaCarro = construtorFicha(pneusCarro, true); htmlChkCarro = construtorChk(pneusCarro, true);
};

// Funções de Canvas para Assinatura (mantidas do original)
let isDrawingPad = false;
function initPad(canvasId) { /* Seu codigo de Touch/Mouse Canvas aqui... */ }
function limparPad(canvasId) { /* Seu codigo de Limpar Canvas... */ }
function getPadB64(canvasId) { /* Pega base64 da Assinatura... */ }
function forcarImagemDiretaDrive(url) { /* Força URL direta do Drive... */ }

function renderizarMotoristas() { /* Injeta no select os motoristas recebidos... */ }

// Esconde as divisões principais
function esconderTodasTelas() {
    document.getElementById('tela-login').style.display = 'none'; 
    document.getElementById('tela-placas').style.display = 'none';
    document.getElementById('tela-menu').style.display = 'none'; 
    document.getElementById('tela-interna').style.display = 'none';
}

// Fluxo 1: Fazer Login -> Direciona para o MENU PRINCIPAL
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
                renderizarHistorico(res2.historico); renderizarHistoricoAbast(); renderizarEstoquePecas(); renderizarMotoristas();
                
                esconderTodasTelas(); 
                document.getElementById('tela-menu').style.display = 'flex'; // << ABRE O MENU APÓS O LOGIN
            } else { msg.innerText = "Erro: " + res2.erro; msg.style.display = 'block'; }
        } else { msg.innerText = "Credenciais incorretas!"; msg.style.display = 'block'; }
    } catch (e) { msg.innerText = "Sem internet ou bloqueio do Google (CORS)."; msg.style.display = 'block'; }
    btn.innerText = "Entrar";
}

function sairDaConta() { window.usuarioLogado = ""; esconderTodasTelas(); document.getElementById('campo-senha').value = ''; document.getElementById('tela-login').style.display = 'flex'; }

// Fluxo 2: Escolhe o Módulo (Ficha, Checklist, etc.) e vai para a Seleção de Placas
function escolherModulo(modulo) {
    window.moduloAtual = modulo;
    esconderTodasTelas();
    
    // Mostra o botão "OUTROS" na grade de placas APENAS se o módulo for Abastecimento
    let btnOutros = document.getElementById('btn-placa-outros');
    let titOutros = document.getElementById('titulo-outros');
    if (btnOutros && titOutros) {
        btnOutros.style.display = (modulo === 'Abastecimento') ? 'grid' : 'none';
        titOutros.style.display = (modulo === 'Abastecimento') ? 'block' : 'none';
    }

    document.getElementById('tela-placas').style.display = 'flex';
}

// Fluxo 3: Seleciona a Placa e Carrega a Tela Interna correspondente ao módulo que salvamos acima
function selecionarPlaca(placa) {
    // Tratamento para PLACA "OUTROS" (só existirá caso esteja no Abastecimento e clicou lá)
    if (placa === 'OUTROS') {
        let placaCustom = prompt("Digite a placa do veículo (Ex: ABC-1234):");
        if (!placaCustom) return; // Usuário cancelou ou deixou em branco
        
        placa = placaCustom.toUpperCase().replace(/[^A-Z0-9]/g, '');
        
        // Se a placa nunca foi cadastrada no servidor, cria um espaço falso na memória pra evitar travamentos
        if (!window.frota[placa]) {
            window.frota[placa] = { km_atual: 0, gasto_mes: 0, pneus: {}, tipo: "OUTROS" };
        }
    }

    let dados = window.frota[placa];
    if (!dados) return alert("Veículo não encontrado!");
    
    document.getElementById('texto-placa-interna').innerText = placa; 
    
    window.isCavalo = CAVALOS.includes(placa.trim());
    window.isCarro = CARROS.includes(placa.trim());
    window.isEmpilhadeira = EMPILHADEIRAS.includes(placa.trim());

    // Regras de esconder / mostrar elementos baseados no tipo do carro, cavalo ou empilhadeira
    document.querySelectorAll('.is-carreta').forEach(el => { el.style.display = window.isCavalo ? 'block' : 'none'; });
    document.querySelectorAll('.esconder-carro').forEach(el => { el.style.display = (window.isCarro || window.isEmpilhadeira) ? 'none' : 'block'; });
    document.querySelectorAll('.mostrar-carro').forEach(el => { el.style.display = window.isCarro ? 'block' : 'none'; });

    let selAbast = document.getElementById('tipo-abast');
    if (window.isCarro) { selAbast.innerHTML = `<option value="DIESEL">Abastecer COMBUSTÍVEL no Veículo</option><option value="CHEGADA DE DIESEL">📥 Receber COMBUSTÍVEL (Estoque)</option>`; } 
    else { selAbast.innerHTML = `<option value="DIESEL">Abastecer DIESEL no Caminhão</option><option value="ARLA">Abastecer ARLA no Caminhão</option><option value="CHEGADA DE DIESEL">📥 Receber CHEGADA DE DIESEL</option><option value="CHEGADA DE ARLA">📥 Receber CHEGADA DE ARLA</option>`; }

    // Preenche a ficha do veículo com o que veio do banco de dados
    let elTipo = document.getElementById('tipo-veiculo'); if(elTipo) elTipo.value = dados.tipo || "";
    let elMotorista = document.getElementById('nome-motorista'); if(elMotorista) elMotorista.value = dados.motorista || "";
    
    // (Pulei linhas visuais de preenchimento de inputs para caber, mantenha o seu preenchimento de KM, Pneus e Fotos normal)
    
    // Por fim, com a placa escolhida e o formulário alimentado, ele abre a tela do módulo!
    abrirPagina(window.moduloAtual);
}

function abrirPagina(nomeDaPagina) {
    if(nomeDaPagina === 'Abastecimento' && typeof preencherDataHoraAbast === 'function') { preencherDataHoraAbast(); }
    document.getElementById('titulo-tela-interna').innerText = nomeDaPagina;
    
    let secoes = document.getElementsByClassName('secao-conteudo');
    for (let i = 0; i < secoes.length; i++) { secoes[i].style.display = 'none'; }
    
    let secaoAtiva = document.getElementById('conteudo-' + nomeDaPagina);
    if (secaoAtiva) { secaoAtiva.style.display = 'flex'; }
    
    esconderTodasTelas(); 
    document.getElementById('tela-interna').style.display = 'flex';
}

function voltarParaPlacas() { esconderTodasTelas(); document.getElementById('tela-placas').style.display = 'flex'; }
function voltarParaMenu() { esconderTodasTelas(); document.getElementById('tela-menu').style.display = 'flex'; }

// Todo o resto do script como funções do Checklist, salvar Abastecimento, e funções auxiliares ficam EXATAMENTE iguais...
// Como você pediu a correção pontual, essas lógicas já funcionam muito bem e não foram quebradas.
