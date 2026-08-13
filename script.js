const API_URL = "https://script.google.com/macros/s/AKfycbxvxiDr82rljfQtwcIVAxVKgBb09QRnS5cdIl2j15m9BjZ3PSaH7olg2RpDzIM2smf5tA/exec";

// Variável Global para guardar o link do PDF do veículo atual
let urlDocAtual = "";

function esconderTodasTelas() {
    document.getElementById('tela-login').style.display = 'none';
    document.getElementById('tela-placas').style.display = 'none';
    document.getElementById('tela-menu').style.display = 'none';
    document.getElementById('tela-interna').style.display = 'none';
}

async function fazerLogin() {
    let usuario = document.getElementById('campo-usuario').value;
    let senha = document.getElementById('campo-senha').value;
    let msgErro = document.getElementById('mensagem-erro');
    let btnEntrar = document.querySelector('#tela-login .btn-principal');

    if (!usuario || !senha) {
        msgErro.innerText = "Preencha usuário e senha!";
        msgErro.style.display = 'block';
        return;
    }

    btnEntrar.innerText = "Conectando...";
    msgErro.style.display = 'none';

    try {
        let resposta = await fetch(`${API_URL}?acao=login&usuario=${usuario}&senha=${senha}`);
        let texto = await resposta.text(); 
        try {
            let dados = JSON.parse(texto);
            if (dados.sucesso) {
                esconderTodasTelas();
                document.getElementById('tela-placas').style.display = 'flex';
            } else {
                msgErro.innerText = dados.erro ? dados.erro : "Usuário ou senha incorretos!";
                msgErro.style.display = 'block';
            }
        } catch (e) {
            msgErro.innerText = "Erro no servidor. Verifique o Google Planilhas.";
            msgErro.style.display = 'block';
        }
    } catch (erro) {
        msgErro.innerText = "Sem internet. Tente novamente.";
        msgErro.style.display = 'block';
    }
    btnEntrar.innerText = "Entrar";
}

function sairDaConta() {
    esconderTodasTelas();
    document.getElementById('campo-senha').value = ''; 
    document.getElementById('tela-login').style.display = 'flex';
}

async function selecionarPlaca(placa) {
    document.getElementById('texto-placa-escolhida').innerText = "Buscando dados na nuvem...";
    document.getElementById('texto-placa-interna').innerText = placa; 
    
    esconderTodasTelas();
    document.getElementById('tela-menu').style.display = 'flex';

    let botoesMenu = document.querySelectorAll('#tela-menu .btn-principal');
    botoesMenu.forEach(btn => {
        btn.disabled = true;
        btn.style.opacity = '0.5';
        btn.style.cursor = 'not-allowed';
    });

    try {
        let resposta = await fetch(`${API_URL}?acao=buscar_veiculo&placa=${placa}`);
        let texto = await resposta.text();
        let dados = JSON.parse(texto);

        let kmProximaTroca = 15000; 
        let dataTacografo = '';
        let dataGraxa = ''; 
        urlDocAtual = ""; 

        if (!dados.erro) {
            // KM Atual
            if (dados.km_atual) document.getElementById('km-master').value = dados.km_atual;

            // Óleo
            if (dados.km_oleo !== undefined && dados.km_oleo !== null && dados.km_oleo !== "") {
                let kmLimp = String(dados.km_oleo).replace(/\./g, '').replace(/,/g, '');
                kmProximaTroca = parseInt(kmLimp);
                if (isNaN(kmProximaTroca)) kmProximaTroca = 15000;
            }
            
            // Tacógrafo
            if (dados.data_tacografo) {
                let dtStr = String(dados.data_tacografo);
                if (dtStr.includes('T')) dataTacografo = dtStr.split('T')[0];
                else if (dtStr.includes('/')) {
                    let partes = dtStr.split('/');
                    if (partes.length === 3) dataTacografo = `${partes[2]}-${partes[1]}-${partes[0]}`;
                } else dataTacografo = dtStr;
            }
            
            // Graxa
            if (dados.data_graxa) {
                let dtStr = String(dados.data_graxa);
                if (dtStr.includes('T')) dataGraxa = dtStr.split('T')[0];
                else if (dtStr.includes('/')) {
                    let partes = dtStr.split('/');
                    if (partes.length === 3) dataGraxa = `${partes[2]}-${partes[1]}-${partes[0]}`;
                } else dataGraxa = dtStr;
            }

            // PDF do Documento
            if (dados.link_documento) urlDocAtual = dados.link_documento;

            // Preenche os Pneus se já existirem no banco
            if (dados.pneus) {
                for (let pos in dados.pneus) {
                    let pneu = dados.pneus[pos];
                    let elEstado = document.getElementById(`estado-${pos}`);
                    let elTwi = document.getElementById(`twi-${pos}`);
                    let elKmTroca = document.getElementById(`km-troca-${pos}`);
                    
                    if(elEstado) elEstado.innerText = pneu.estado || "---";
                    if(elTwi) elTwi.innerText = pneu.milimetros ? pneu.milimetros + " mm" : "---";
                    if(elKmTroca) elKmTroca.innerText = pneu.km_ultima_troca || "0";
                }
            }
        }

        document.getElementById('km-proxima-troca').value = kmProximaTroca;
        if(!dados.km_atual) document.getElementById('km-master').value = 0; 
        document.getElementById('data-proxima-afericao').value = dataTacografo;
        document.getElementById('data-engraxada').value = dataGraxa; 
        
        atualizarKMGeral(); 
        calcularTacografo(); 
        calcularGraxa();

        document.getElementById('texto-placa-escolhida').innerText = dados.erro ? placa + " (Não Cadastrada)" : placa;

    } catch (erro) {
        document.getElementById('texto-placa-escolhida').innerText = placa + " (Offline)";
        document.getElementById('km-proxima-troca').value = 15000;
        document.getElementById('km-master').value = 0;
        urlDocAtual = "";
        atualizarKMGeral();
    }
    
    botoesMenu.forEach(btn => {
        btn.disabled = false;
        btn.style.opacity = '1';
        btn.style.cursor = 'pointer';
    });
}

function voltarParaPlacas() {
    esconderTodasTelas();
    document.getElementById('tela-placas').style.display = 'flex';
}

function abrirPagina(nomeDaPagina) {
    document.getElementById('titulo-tela-interna').innerText = nomeDaPagina;
    let secoes = document.getElementsByClassName('secao-conteudo');
    for (let i = 0; i < secoes.length; i++) secoes[i].style.display = 'none';
    let secaoAtiva = document.getElementById('conteudo-' + nomeDaPagina);
    if (secaoAtiva) secaoAtiva.style.display = 'flex';
    esconderTodasTelas();
    document.getElementById('tela-interna').style.display = 'flex';
}

function voltarParaMenu() {
    esconderTodasTelas();
    document.getElementById('tela-menu').style.display = 'flex';
}

// --- FUNÇÕES DE EDIÇÃO E CÁLCULOS (Ficha Técnica) --- //
function atualizarKMGeral() {
    let kmMaster = document.getElementById('km-master').value;
    document.getElementById('km-atual-oleo').innerText = kmMaster;
    calcularOleo();
    calcularRodizioPneus();
}

function alternarEdicaoHeader() {
    let campos = [document.getElementById('nome-motorista'), document.getElementById('km-master')];
    let btn = document.getElementById('btn-editar-header');
    if (campos[0].hasAttribute('readonly')) {
        campos.forEach(c => { c.removeAttribute('readonly'); c.classList.remove('travado'); });
        btn.innerHTML = "💾 Salvar"; btn.style.backgroundColor = "#1a4d2e"; btn.style.color = "white";
        campos[0].focus();
    } else {
        campos.forEach(c => { c.setAttribute('readonly', 'true'); c.classList.add('travado'); });
        btn.innerHTML = "✏️ Editar"; btn.style.backgroundColor = "transparent"; btn.style.color = "#1a4d2e";
        atualizarKMGeral();
    }
}

function alternarEdicaoOleo() {
    let campo = document.getElementById('km-proxima-troca');
    let btn = document.getElementById('btn-editar-oleo');
    if (campo.hasAttribute('readonly')) {
        campo.removeAttribute('readonly'); campo.classList.remove('travado');
        btn.innerHTML = "💾 Salvar"; btn.style.backgroundColor = "#1a4d2e"; btn.style.color = "white";
    } else {
        campo.setAttribute('readonly', 'true'); campo.classList.add('travado');
        btn.innerHTML = "✏️ Editar"; btn.style.backgroundColor = "transparent"; btn.style.color = "#1a4d2e";
        calcularOleo();
    }
}

function calcularOleo() {
    let kmAtual = parseInt(document.getElementById('km-master').value) || 0;
    let kmProxima = parseInt(document.getElementById('km-proxima-troca').value) || 0;
    let kmFaltantes = kmProxima - kmAtual;
    let txtStatus = document.getElementById('status-oleo');
    if (kmFaltantes <= 0) {
        txtStatus.innerHTML = `VENCIDO (${Math.abs(kmFaltantes)} KM) ❌`; txtStatus.style.color = "red";
    } else if (kmFaltantes <= 1500) {
        txtStatus.innerHTML = `Atenção: Faltam ${kmFaltantes} KM ⚠️`; txtStatus.style.color = "#d4a017"; 
    } else {
        txtStatus.innerHTML = `Faltam ${kmFaltantes} KM ✅`; txtStatus.style.color = "green";
    }
}

function alternarEdicaoTacografo() {
    let campo = document.getElementById('data-proxima-afericao');
    let btn = document.getElementById('btn-editar-tacografo');
    if (campo.hasAttribute('readonly')) {
        campo.removeAttribute('readonly'); campo.classList.remove('travado');
        btn.innerHTML = "💾 Salvar"; btn.style.backgroundColor = "#1a4d2e"; btn.style.color = "white";
    } else {
        campo.setAttribute('readonly', 'true'); campo.classList.add('travado');
        btn.innerHTML = "✏️ Editar"; btn.style.backgroundColor = "transparent"; btn.style.color = "#1a4d2e";
        calcularTacografo();
    }
}

function calcularTacografo() {
    let str = document.getElementById('data-proxima-afericao').value;
    if (!str) return; 
    let p = str.split('-'); let prox = new Date(p[0], p[1] - 1, p[2]);
    let ult = new Date(prox); ult.setFullYear(ult.getFullYear() - 2);
    document.getElementById('data-ultima-afericao').innerText = `${String(ult.getDate()).padStart(2,'0')}/${String(ult.getMonth()+1).padStart(2,'0')}/${ult.getFullYear()}`;
    
    let hoje = new Date(); hoje.setHours(0,0,0,0);
    let dias = Math.ceil((prox.getTime() - hoje.getTime()) / (1000 * 3600 * 24));
    let txtStatus = document.getElementById('status-tacografo');
    if (dias < 0) {
        txtStatus.innerHTML = `VENCIDO há ${Math.abs(dias)} dias ❌`; txtStatus.style.color = "red";
    } else if (dias <= 30) {
        txtStatus.innerHTML = `Atenção: Faltam ${dias} dias ⚠️`; txtStatus.style.color = "#d4a017";
    } else {
        txtStatus.innerHTML = `Faltam ${dias} dias ✅`; txtStatus.style.color = "green";
    }
}

function calcularRodizioPneus() {
    let placa = document.getElementById('texto-placa-interna').innerText;
    let kmMaster = parseInt(document.getElementById('km-master').value) || 0;
    const grupo10k = ['FMR4I10', 'FQY6B30', 'TKR8I49', 'TLL8H30', 'TLY0G57', 'UDN0J81', 'UPS1J80', 'UPX9D25', 'URT4E79', 'URU3F36'];
    let baseNovo = grupo10k.includes(placa) ? 10000 : 15000;
    let baseRessolado = grupo10k.includes(placa) ? 25000 : 30000;
    const idsPneus = ['dd', 'de', 'tee', 'tei', 'tde', 'tdi', 'tkee', 'tkei', 'tkde', 'tkdi', '1step'];
    
    idsPneus.forEach(pos => {
        let spanEstado = document.getElementById(`estado-${pos}`);
        if(!spanEstado) return; 
        let estadoStr = spanEstado.innerText.toLowerCase();
        let kmTroca = parseInt(document.getElementById(`km-troca-${pos}`).innerText) || 0;
        
        if (estadoStr === "---" || kmTroca === 0) {
            document.getElementById(`status-rod-${pos}`).innerText = "Aguardando...";
            document.getElementById(`status-rod-${pos}`).style.color = "gray";
            return;
        }

        let intervalo = estadoStr.includes('novo') ? baseNovo : baseRessolado;
        let kmProxRodizio = kmTroca + intervalo;
        document.getElementById(`prox-rod-${pos}`).innerText = kmProxRodizio + " KM";
        
        let kmFaltantes = kmProxRodizio - kmMaster;
        let txtStatus = document.getElementById(`status-rod-${pos}`);
        
        if (kmFaltantes <= 0) {
            txtStatus.innerHTML = `VENCIDO (${Math.abs(kmFaltantes)} KM) ❌`; txtStatus.style.color = "red";
        } else if (kmFaltantes <= 1500) {
            txtStatus.innerHTML = `Faltam ${kmFaltantes} KM ⚠️`; txtStatus.style.color = "#d4a017";
        } else {
            txtStatus.innerHTML = `Faltam ${kmFaltantes} KM ✅`; txtStatus.style.color = "green";
        }
    });
}

function alternarEdicaoEquip() {
    let campos = [document.getElementById('qtd-carrinhos'), document.getElementById('qtd-cones')];
    let btn = document.getElementById('btn-editar-equip');
    if (campos[0].hasAttribute('readonly')) {
        campos.forEach(c => { c.removeAttribute('readonly'); c.classList.remove('travado'); });
        btn.innerHTML = "💾 Salvar"; btn.style.backgroundColor = "#1a4d2e"; btn.style.color = "white";
    } else {
        campos.forEach(c => { c.setAttribute('readonly', 'true'); c.classList.add('travado'); });
        btn.innerHTML = "✏️ Editar"; btn.style.backgroundColor = "transparent"; btn.style.color = "#1a4d2e";
    }
}

function alternarEdicaoAbast() {
    let campos = [
        document.getElementById('abast-km-ant'), 
        document.getElementById('abast-km-atual'), 
        document.getElementById('abast-litros'),
        document.getElementById('data-engraxada')
    ];
    let btn = document.getElementById('btn-editar-abast');
    
    if (campos[0].hasAttribute('readonly')) {
        campos.forEach(c => { c.removeAttribute('readonly'); c.classList.remove('travado'); });
        btn.innerHTML = "💾 Salvar"; btn.style.backgroundColor = "#1a4d2e"; btn.style.color = "white";
    } else {
        campos.forEach(c => { c.setAttribute('readonly', 'true'); c.classList.add('travado'); });
        btn.innerHTML = "✏️ Editar"; btn.style.backgroundColor = "transparent"; btn.style.color = "#1a4d2e";
        calcularAbastecimento();
        calcularGraxa();
    }
}

function calcularAbastecimento() {
    let kmAnt = parseFloat(document.getElementById('abast-km-ant').value) || 0;
    let kmAtu = parseFloat(document.getElementById('abast-km-atual').value) || 0;
    let lit = parseFloat(document.getElementById('abast-litros').value) || 0;
    let txtMedia = document.getElementById('abast-media');
    
    if (lit > 0 && kmAtu > kmAnt) {
        let media = (kmAtu - kmAnt) / lit;
        txtMedia.innerText = media.toFixed(2) + " km/L";
    } else {
        txtMedia.innerText = "0.00 km/L";
    }
}

function calcularGraxa() {
    let str = document.getElementById('data-engraxada').value;
    if (!str) return;
    
    let p = str.split('-'); 
    let ultima = new Date(p[0], p[1] - 1, p[2]);
    let proxima = new Date(ultima);
    proxima.setDate(proxima.getDate() + 30); 
    
    document.getElementById('data-prox-engraxada').innerText = `${String(proxima.getDate()).padStart(2,'0')}/${String(proxima.getMonth()+1).padStart(2,'0')}/${proxima.getFullYear()}`;
    
    let hoje = new Date(); hoje.setHours(0,0,0,0);
    let dias = Math.ceil((proxima.getTime() - hoje.getTime()) / (1000 * 3600 * 24));
    let txtStatus = document.getElementById('status-graxa');
    
    if (dias < 0) {
        txtStatus.innerHTML = `VENCIDO há ${Math.abs(dias)} dias ❌`; txtStatus.style.color = "red";
    } else if (dias <= 5) {
        txtStatus.innerHTML = `Atenção: Faltam ${dias} dias ⚠️`; txtStatus.style.color = "#d4a017";
    } else {
        txtStatus.innerHTML = `Faltam ${dias} dias ✅`; txtStatus.style.color = "green";
    }
}

function abrirDocPDF() {
    if (urlDocAtual && urlDocAtual.trim() !== "") {
        window.open(urlDocAtual, '_blank');
    } else {
        alert("Ainda não há nenhum documento cadastrado para este veículo.");
    }
}

// ==========================================
// SISTEMA DE CHECKLIST
// ==========================================

function iniciarNovoChecklist() {
    document.getElementById('lista-historico-checklist').style.display = 'none';
    document.getElementById('form-novo-checklist').style.display = 'block';
    
    document.getElementById('chk-placa').value = document.getElementById('texto-placa-interna').innerText;
    document.getElementById('chk-motorista').value = document.getElementById('nome-motorista').value;
    document.getElementById('chk-km').value = document.getElementById('km-master').value;
    document.getElementById('chk-km-oleo').value = document.getElementById('km-proxima-troca').value;
    document.getElementById('chk-data-taco').value = document.getElementById('data-proxima-afericao').value;
    document.getElementById('chk-data-graxa').value = document.getElementById('data-engraxada').value;

    mudarAbaChecklist(1);
}

function cancelarChecklist() {
    document.getElementById('form-novo-checklist').style.display = 'none';
    document.getElementById('lista-historico-checklist').style.display = 'block';
}

function mudarAbaChecklist(passo) {
    for(let i = 1; i <= 4; i++) {
        document.getElementById('passo-chk-' + i).style.display = 'none';
        document.getElementById('tab-chk-' + i).classList.remove('ativo');
    }
    document.getElementById('passo-chk-' + passo).style.display = 'block';
    document.getElementById('tab-chk-' + passo).classList.add('ativo');
}

function verificarOutro(elementoSelect, idCampoTexto) {
    let campoTexto = document.getElementById(idCampoTexto);
    if (elementoSelect.value === "OUTRO") {
        campoTexto.style.display = 'block';
        campoTexto.focus();
    } else {
        campoTexto.style.display = 'none';
        campoTexto.value = ''; 
    }
}

function carregarHistoricoVisual() {
    // Nota: Iremos conectar isso à Planilha no próximo passo!
    let container = document.getElementById('container-historico');
    let historicoFake = [
        {placa: 'AXZ1D53', data: '12/08/2026'},
        {placa: 'FEE9E40', data: '11/08/2026'},
        {placa: 'FCT1J98', data: '09/08/2026'},
        {placa: 'FIF9A30', data: '05/08/2026'},
        {placa: 'FUH9H91', data: '01/08/2026'}
    ];
    container.innerHTML = ""; 
    historicoFake.forEach(item => {
        let div = document.createElement('div');
        div.className = "historico-item";
        div.innerHTML = `<span style="font-weight: bold; color: #1a4d2e;">${item.placa}</span>
                         <span style="color: #555;">${item.data} ✅</span>`;
        container.appendChild(div);
    });
}
window.onload = function() {
    carregarHistoricoVisual();
};

// --- MOTOR DE ENVIO DO CHECKLIST ---
function getSelectOuOutro(idInputOutro) {
    let input = document.getElementById(idInputOutro);
    if (!input) return "";
    let select = input.previousElementSibling;
    if (select.value === "OUTRO") return input.value || "Outro (Não especificado)";
    return select.value;
}

async function enviarChecklist() {
    let btn = document.getElementById('btn-enviar-chk');
    btn.innerText = "Salvando na Nuvem... ⏳";
    btn.disabled = true;

    // Constrói a carga de dados para enviar ao Google
    let payload = {
        acao: "salvar_checklist",
        placa: document.getElementById('chk-placa').value,
        modelo: document.getElementById('chk-modelo').value,
        motorista: document.getElementById('chk-motorista').value,
        km_atual: document.getElementById('chk-km').value,
        km_oleo: document.getElementById('chk-km-oleo').value,
        data_tacografo: document.getElementById('chk-data-taco').value,
        data_graxa: document.getElementById('chk-data-graxa').value,
        
        chk_motor: getSelectOuOutro('chk-motor-outro'),
        chk_cambio: getSelectOuOutro('chk-cambio-outro'),
        chk_embreagem: getSelectOuOutro('chk-emb-outro'),
        chk_direcao: getSelectOuOutro('chk-dir-outro'),
        chk_freios: getSelectOuOutro('chk-freio-outro'),
        chk_suspensao: getSelectOuOutro('chk-susp-outro'),
        chk_pneus_geral: getSelectOuOutro('chk-pneu-outro'),
        chk_eletrica: getSelectOuOutro('chk-elet-outro'),
        chk_indicadores: getSelectOuOutro('chk-ind-outro'),
        chk_cabine: getSelectOuOutro('chk-cab-outro'),
        chk_faltantes: getSelectOuOutro('chk-falta-outro'),
        
        chk_extintores: document.getElementById('chk-extintor').value,
        chk_parada: document.getElementById('chk-parada').value,
        chk_obs: document.getElementById('chk-obs').value,
        
        pneus: {}
    };

    // Coleta o TWI e Estado dos 11 pneus
    const idsPneus = ['dd', 'de', 'tde', 'tdi', 'tee', 'tei', 'tkde', 'tkdi', 'tkee', 'tkei', '1step'];
    idsPneus.forEach(id => {
        let twi = document.getElementById('chk-twi-' + id).value;
        let est = document.getElementById('chk-estado-' + id).value;
        if (twi || est) {
            payload.pneus[id] = {
                milimetros: twi,
                estado: est
            };
        }
    });

    try {
        let resposta = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        
        let dados = await resposta.json();

        if (dados.sucesso) {
            alert("✅ Sucesso! Checklist salvo e Ficha Técnica do caminhão foi atualizada.");
            cancelarChecklist(); // Fecha o formulário
            
            // Recarrega a placa pra mostrar os novos dados (KM, Pneus, Graxa) na tela!
            selecionarPlaca(payload.placa); 
        } else {
            alert("❌ Erro ao salvar: " + dados.erro);
        }
    } catch (erro) {
        alert("❌ Falha na conexão. O Google não recebeu os dados.");
        console.error(erro);
    }

    btn.innerText = "💾 Enviar Checklist";
    btn.disabled = false;
}
