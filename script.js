/* =========================================================
   SISTEMA LINCE - CÉREBRO JAVASCRIPT LOCAL
   Contém o Login, Ficha Técnica, Checklist e Estoque.
   ========================================================= */

const API_URL = "https://script.google.com/macros/s/AKfycbxvxiDr82rljfQtwcIVAxVKgBb09QRnS5cdIl2j15m9BjZ3PSaH7olg2RpDzIM2smf5tA/exec";

// Memórias do Aplicativo
let urlDocAtual = ""; 
window.frota = {}; 
window.estoqueDiesel = 0;
window.estoqueArla = 0;
window.gastoMesGeral = 0;

// Esconde todas as abas principais para navegação fluida
function esconderTodasTelas() {
    document.getElementById('tela-login').style.display = 'none';
    document.getElementById('tela-placas').style.display = 'none';
    document.getElementById('tela-menu').style.display = 'none';
    document.getElementById('tela-interna').style.display = 'none';
}

/* =====================================
   SISTEMA DE LOGIN E SINCRONIZAÇÃO DA FROTA
   ===================================== */
async function fazerLogin() {
    let usuario = document.getElementById('campo-usuario').value;
    let senha = document.getElementById('campo-senha').value;
    let msgErro = document.getElementById('mensagem-erro');
    let btnEntrar = document.getElementById('btn-login');

    if (!usuario || !senha) { msgErro.innerText = "Preencha usuário e senha!"; msgErro.style.display = 'block'; return; }

    btnEntrar.innerText = "Autenticando..."; msgErro.style.display = 'none';

    try {
        let resposta = await fetch(`${API_URL}?acao=login&usuario=${usuario}&senha=${senha}`);
        let dados = await resposta.json();
        
        if (dados.sucesso) {
            btnEntrar.innerText = "Baixando Frota... ⏳";
            
            // Aqui o aplicativo baixa todos os dados de uma vez só!
            let resSync = await fetch(`${API_URL}?acao=buscar_inicial`);
            let dadosSync = await resSync.json();
            
            if (dadosSync.sucesso) {
                // Guarda os dados no celular
                window.frota = dadosSync.frota;      
                window.estoqueDiesel = dadosSync.estoque_diesel;
                window.estoqueArla = dadosSync.estoque_arla;
                window.gastoMesGeral = dadosSync.gasto_mes_geral;

                renderizarHistorico(dadosSync.historico); 
                esconderTodasTelas();
                document.getElementById('tela-placas').style.display = 'flex';
            } else {
                msgErro.innerText = "Erro ao baixar frota: " + dadosSync.erro; msgErro.style.display = 'block';
            }
        } else {
            msgErro.innerText = "Usuário ou senha incorretos!"; msgErro.style.display = 'block';
        }
    } catch (erro) {
        msgErro.innerText = "Sem internet. Tente novamente."; msgErro.style.display = 'block';
    }
    btnEntrar.innerText = "Entrar";
}

function sairDaConta() {
    esconderTodasTelas();
    document.getElementById('campo-senha').value = ''; 
    document.getElementById('tela-login').style.display = 'flex';
}

/* =====================================
   NAVEGAÇÃO: SELEÇÃO DA PLACA E MENUS
   ===================================== */
function selecionarPlaca(placa) {
    let dados = window.frota[placa];
    if (!dados) { alert("Veículo não encontrado na base de dados!"); return; }

    document.getElementById('texto-placa-escolhida').innerText = placa;
    document.getElementById('texto-placa-interna').innerText = placa; 
    
    // PREENCHENDO FICHA TÉCNICA
    let elKm = document.getElementById('km-master'); if(elKm) elKm.value = dados.km_atual || 0;
    
    let kmProximaTroca = 15000;
    if (dados.km_oleo) kmProximaTroca = parseInt(String(dados.km_oleo).replace(/\./g, '')) || 15000;
    
    let elOleo = document.getElementById('km-proxima-troca'); if(elOleo) elOleo.value = kmProximaTroca;
    let elTaco = document.getElementById('data-proxima-afericao'); if(elTaco) elTaco.value = dados.data_tacografo || "";
    let elGrax = document.getElementById('data-engraxada'); if(elGrax) elGrax.value = dados.data_graxa || "";
    
    let elCar = document.getElementById('qtd-carrinhos'); if(elCar) elCar.value = dados.qtd_carrinhos || 0;
    let elCon = document.getElementById('qtd-cones'); if(elCon) elCon.value = dados.qtd_cones || 0;
    urlDocAtual = dados.link_documento || "";

    // Pneus da Ficha
    if (dados.pneus) {
        for (let pos in dados.pneus) {
            let pneu = dados.pneus[pos];
            let elEstado = document.getElementById(`estado-${pos}`);
            let elTwi = document.getElementById(`twi-${pos}`);
            let elKmTroca = document.getElementById(`km-troca-${pos}`);
            let elDataTroca = document.getElementById(`data-troca-${pos}`);
            
            if(elEstado) elEstado.innerText = pneu.estado || "---";
            if(elTwi) elTwi.innerText = pneu.milimetros ? pneu.milimetros + " mm" : "---";
            if(elKmTroca) elKmTroca.value = pneu.km_ultima_troca || 0;
            if(elDataTroca) elDataTroca.value = pneu.data_ultima_troca || "";
        }
    }

    // Fotos do Mês
    let imgLat = document.getElementById('ficha-img-lat'); let plLat = document.getElementById('ficha-pl-lat');
    if (imgLat && plLat) {
        if (dados.foto_lateral) { imgLat.src = dados.foto_lateral; imgLat.style.display = 'block'; plLat.style.display = 'none'; } 
        else { imgLat.style.display = 'none'; plLat.style.display = 'flex'; }
    }

    let imgTras = document.getElementById('ficha-img-tras'); let plTras = document.getElementById('ficha-pl-tras');
    if (imgTras && plTras) {
        if (dados.foto_traseira) { imgTras.src = dados.foto_traseira; imgTras.style.display = 'block'; plTras.style.display = 'none'; } 
        else { imgTras.style.display = 'none'; plTras.style.display = 'flex'; }
    }

    // DADOS DO ABASTECIMENTO DESTE CAMINHÃO
    let elKmUltimo = document.getElementById('aviso-ultimo-km'); if(elKmUltimo) elKmUltimo.innerText = dados.km_atual || 0;
    let elGastoMes = document.getElementById('abast-gasto-mes'); if(elGastoMes) elGastoMes.innerText = (dados.gasto_mes || 0) + " L";

    // Roda a matemática
    atualizarKMGeral(); calcularTacografo(); calcularGraxa();
    
    esconderTodasTelas(); 
    document.getElementById('tela-menu').style.display = 'flex';
}

function voltarParaPlacas() { esconderTodasTelas(); document.getElementById('tela-placas').style.display = 'flex'; }

// Abre a página interna, se for a de Abastecimento ele já injeta os dados do Estoque
function abrirPagina(nomeDaPagina) {
    if (nomeDaPagina === 'Abastecimento') preencherDataHoraAbast();

    document.getElementById('titulo-tela-interna').innerText = nomeDaPagina;
    let secoes = document.getElementsByClassName('secao-conteudo');
    for (let i = 0; i < secoes.length; i++) secoes[i].style.display = 'none';
    
    let secaoAtiva = document.getElementById('conteudo-' + nomeDaPagina);
    if (secaoAtiva) secaoAtiva.style.display = 'flex';
    
    esconderTodasTelas(); 
    document.getElementById('tela-interna').style.display = 'flex';
}

function voltarParaMenu() { esconderTodasTelas(); document.getElementById('tela-menu').style.display = 'flex'; }

/* =====================================
   FUNÇÕES DA FICHA TÉCNICA
   ===================================== */
function salvarFichaNaNuvemBackground() {
    let payload = {
        acao: "salvar_ficha_tecnica",
        placa: document.getElementById('texto-placa-interna').innerText,
        km_atual: document.getElementById('km-master').value,
        km_oleo: document.getElementById('km-proxima-troca').value,
        data_tacografo: document.getElementById('data-proxima-afericao').value,
        data_graxa: document.getElementById('data-engraxada').value,
        qtd_carrinhos: document.getElementById('qtd-carrinhos').value,
        qtd_cones: document.getElementById('qtd-cones').value,
        pneus: {}
    };
    
    const idsPneus = ['dd', 'de', 'tde', 'tdi', 'tee', 'tei', 'tkde', 'tkdi', 'tkee', 'tkei', '1step'];
    idsPneus.forEach(id => {
        let km = document.getElementById('km-troca-'+id); let dt = document.getElementById('data-troca-'+id);
        if(km && dt) { payload.pneus[id] = { km_ultima_troca: km.value, data_ultima_troca: dt.value }; }
    });

    fetch(API_URL, { method: 'POST', body: JSON.stringify(payload) })
    .then(res => res.json())
    .then(dados => {
        if(dados.sucesso) {
            window.frota[payload.placa].km_atual = payload.km_atual;
            window.frota[payload.placa].km_oleo = payload.km_oleo;
            window.frota[payload.placa].data_tacografo = payload.data_tacografo;
            window.frota[payload.placa].data_graxa = payload.data_graxa;
            window.frota[payload.placa].qtd_carrinhos = payload.qtd_carrinhos;
            window.frota[payload.placa].qtd_cones = payload.qtd_cones;
            for(let id in payload.pneus) {
                if(!window.frota[payload.placa].pneus[id]) window.frota[payload.placa].pneus[id] = {};
                window.frota[payload.placa].pneus[id].km_ultima_troca = payload.pneus[id].km_ultima_troca;
                window.frota[payload.placa].pneus[id].data_ultima_troca = payload.pneus[id].data_ultima_troca;
            }
            document.getElementById('aviso-ultimo-km').innerText = payload.km_atual; // Atualiza pro Abastecimento
        }
    });
}

function atualizarKMGeral() { document.getElementById('km-atual-oleo').innerText = document.getElementById('km-master').value; calcularOleo(); calcularRodizioPneus(); }

function alternarEdicaoHeader() {
    let campos = [document.getElementById('nome-motorista'), document.getElementById('km-master')];
    let btn = document.getElementById('btn-editar-header');
    if (campos[0].hasAttribute('readonly')) {
        campos.forEach(c => { c.removeAttribute('readonly'); c.classList.remove('travado'); });
        btn.innerHTML = "💾 Salvar"; btn.style.backgroundColor = "#1a4d2e"; btn.style.color = "white";
    } else {
        campos.forEach(c => { c.setAttribute('readonly', 'true'); c.classList.add('travado'); });
        btn.innerHTML = "✏️ Editar"; btn.style.backgroundColor = "transparent"; btn.style.color = "#1a4d2e";
        atualizarKMGeral(); salvarFichaNaNuvemBackground(); 
    }
}

function alternarEdicaoOleo() {
    let campo = document.getElementById('km-proxima-troca'); let btn = document.getElementById('btn-editar-oleo');
    if (campo.hasAttribute('readonly')) {
        campo.removeAttribute('readonly'); campo.classList.remove('travado'); btn.innerHTML = "💾 Salvar"; btn.style.backgroundColor = "#1a4d2e"; btn.style.color = "white";
    } else {
        campo.setAttribute('readonly', 'true'); campo.classList.add('travado'); btn.innerHTML = "✏️ Editar"; btn.style.backgroundColor = "transparent"; btn.style.color = "#1a4d2e";
        calcularOleo(); salvarFichaNaNuvemBackground(); 
    }
}

function calcularOleo() {
    let kmAtual = parseInt(document.getElementById('km-master').value) || 0;
    let kmProxima = parseInt(document.getElementById('km-proxima-troca').value) || 0;
    let kmFaltantes = kmProxima - kmAtual;
    let txtStatus = document.getElementById('status-oleo');
    if (kmFaltantes <= 0) { txtStatus.innerHTML = `VENCIDO (${Math.abs(kmFaltantes)} KM) ❌`; txtStatus.style.color = "red"; } 
    else if (kmFaltantes <= 1500) { txtStatus.innerHTML = `Faltam ${kmFaltantes} KM ⚠️`; txtStatus.style.color = "#d4a017"; } 
    else { txtStatus.innerHTML = `Faltam ${kmFaltantes} KM ✅`; txtStatus.style.color = "green"; }
}

function alternarEdicaoTacografo() {
    let campo = document.getElementById('data-proxima-afericao'); let btn = document.getElementById('btn-editar-tacografo');
    if (campo.hasAttribute('readonly')) {
        campo.removeAttribute('readonly'); campo.classList.remove('travado'); btn.innerHTML = "💾 Salvar"; btn.style.backgroundColor = "#1a4d2e"; btn.style.color = "white";
    } else {
        campo.setAttribute('readonly', 'true'); campo.classList.add('travado'); btn.innerHTML = "✏️ Editar"; btn.style.backgroundColor = "transparent"; btn.style.color = "#1a4d2e";
        calcularTacografo(); salvarFichaNaNuvemBackground(); 
    }
}

function calcularTacografo() {
    let str = document.getElementById('data-proxima-afericao').value;
    let txtStatus = document.getElementById('status-tacografo');
    if (!str || str.length < 8 || !str.includes('-')) {
        if(txtStatus) txtStatus.innerHTML = "---"; 
        let dtUlt = document.getElementById('data-ultima-afericao'); if(dtUlt) dtUlt.innerText = "--/--/----"; 
        return;
    }
    let p = str.split('-'); let prox = new Date(p[0], p[1] - 1, p[2]);
    let ult = new Date(prox); ult.setFullYear(ult.getFullYear() - 2);
    document.getElementById('data-ultima-afericao').innerText = `${String(ult.getDate()).padStart(2,'0')}/${String(ult.getMonth()+1).padStart(2,'0')}/${ult.getFullYear()}`;
    let hoje = new Date(); hoje.setHours(0,0,0,0);
    let dias = Math.ceil((prox.getTime() - hoje.getTime()) / (1000 * 3600 * 24));
    
    if (dias < 0) { txtStatus.innerHTML = `VENCIDO há ${Math.abs(dias)} dias ❌`; txtStatus.style.color = "red"; } 
    else if (dias <= 30) { txtStatus.innerHTML = `Atenção: Faltam ${dias} dias ⚠️`; txtStatus.style.color = "#d4a017"; } 
    else { txtStatus.innerHTML = `Faltam ${dias} dias ✅`; txtStatus.style.color = "green"; }
}

function alternarEdicaoPneus() {
    let inputs = document.querySelectorAll('#conteudo-Ficha\\ Técnica input[id^="km-troca-"], #conteudo-Ficha\\ Técnica input[id^="data-troca-"]');
    let btn = document.getElementById('btn-editar-pneus');
    if (inputs[0].hasAttribute('readonly')) {
        inputs.forEach(c => { c.removeAttribute('readonly'); c.classList.remove('travado'); });
        btn.innerHTML = "💾 Salvar Pneus"; btn.style.backgroundColor = "#1a4d2e"; btn.style.color = "white";
    } else {
        inputs.forEach(c => { c.setAttribute('readonly', 'true'); c.classList.add('travado'); });
        btn.innerHTML = "✏️ Editar Pneus"; btn.style.backgroundColor = "transparent"; btn.style.color = "#1a4d2e";
        calcularRodizioPneus(); salvarFichaNaNuvemBackground(); 
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
        let txtStatus = document.getElementById(`status-rod-${pos}`);
        let inputKmTroca = document.getElementById(`km-troca-${pos}`);
        if(!spanEstado || !txtStatus || !inputKmTroca) return; 
        
        let estadoStr = spanEstado.innerText.toLowerCase();
        let kmTroca = parseInt(inputKmTroca.value) || 0;
        
        if (estadoStr === "---" || kmTroca === 0) { txtStatus.innerText = "Aguardando..."; txtStatus.style.color = "gray"; return; }
        let intervalo = estadoStr.includes('novo') ? baseNovo : baseRessolado;
        let kmProxRodizio = kmTroca + intervalo;
        let elProxRod = document.getElementById(`prox-rod-${pos}`);
        if(elProxRod) elProxRod.innerText = kmProxRodizio + " KM";
        
        let kmFaltantes = kmProxRodizio - kmMaster;
        if (kmFaltantes <= 0) { txtStatus.innerHTML = `VENCIDO (${Math.abs(kmFaltantes)} KM) ❌`; txtStatus.style.color = "red"; } 
        else if (kmFaltantes <= 1500) { txtStatus.innerHTML = `Faltam ${kmFaltantes} KM ⚠️`; txtStatus.style.color = "#d4a017"; } 
        else { txtStatus.innerHTML = `Faltam ${kmFaltantes} KM ✅`; txtStatus.style.color = "green"; }
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
        salvarFichaNaNuvemBackground();
    }
}

function alternarEdicaoAbast() {
    let campos = [document.getElementById('abast-km-ant'), document.getElementById('abast-km-atual'), document.getElementById('abast-litros'), document.getElementById('data-engraxada')];
    let btn = document.getElementById('btn-editar-abast');
    if (campos[0].hasAttribute('readonly')) {
        campos.forEach(c => { c.removeAttribute('readonly'); c.classList.remove('travado'); });
        btn.innerHTML = "💾 Salvar"; btn.style.backgroundColor = "#1a4d2e"; btn.style.color = "white";
    } else {
        campos.forEach(c => { c.setAttribute('readonly', 'true'); c.classList.add('travado'); });
        btn.innerHTML = "✏️ Editar"; btn.style.backgroundColor = "transparent"; btn.style.color = "#1a4d2e";
        calcularAbastecimento(); calcularGraxa(); salvarFichaNaNuvemBackground(); 
    }
}

function calcularAbastecimento() {
    let kmAnt = parseFloat(document.getElementById('abast-km-ant').value) || 0;
    let kmAtu = parseFloat(document.getElementById('abast-km-atual').value) || 0;
    let lit = parseFloat(document.getElementById('abast-litros').value) || 0;
    let txtMedia = document.getElementById('abast-media');
    if (lit > 0 && kmAtu > kmAnt) txtMedia.innerText = ((kmAtu - kmAnt) / lit).toFixed(2) + " km/L";
    else txtMedia.innerText = "0.00 km/L";
}

function calcularGraxa() {
    let str = document.getElementById('data-engraxada').value;
    let txtStatus = document.getElementById('status-graxa');
    if (!str || str.length < 8) { if(txtStatus) txtStatus.innerHTML = "---"; document.getElementById('data-prox-engraxada').innerText = "--/--/----"; return; }
    
    let p = str.split('-'); let ultima = new Date(p[0], p[1] - 1, p[2]);
    let proxima = new Date(ultima); proxima.setDate(proxima.getDate() + 30); 
    document.getElementById('data-prox-engraxada').innerText = `${String(proxima.getDate()).padStart(2,'0')}/${String(proxima.getMonth()+1).padStart(2,'0')}/${proxima.getFullYear()}`;
    
    let hoje = new Date(); hoje.setHours(0,0,0,0);
    let dias = Math.ceil((proxima.getTime() - hoje.getTime()) / (1000 * 3600 * 24));
    
    if (dias < 0) { txtStatus.innerHTML = `VENCIDO há ${Math.abs(dias)} dias ❌`; txtStatus.style.color = "red"; } 
    else if (dias <= 5) { txtStatus.innerHTML = `Atenção: Faltam ${dias} dias ⚠️`; txtStatus.style.color = "#d4a017"; } 
    else { txtStatus.innerHTML = `Faltam ${dias} dias ✅`; txtStatus.style.color = "green"; }
}

function abrirDocPDF() {
    if (urlDocAtual && urlDocAtual.trim() !== "") window.open(urlDocAtual, '_blank');
    else alert("Ainda não há nenhum documento cadastrado para este veículo.");
}


/* =====================================
   MÓDULO ABASTECIMENTO E ESTOQUE
   ===================================== */
function mudarFormAbast() {
    let tipo = document.getElementById('tipo-abast').value;
    if (tipo.includes("CHEGADA")) {
        document.getElementById('form-abast-veiculo').style.display = 'none';
        document.getElementById('form-abast-chegada').style.display = 'block';
    } else {
        document.getElementById('form-abast-veiculo').style.display = 'block';
        document.getElementById('form-abast-chegada').style.display = 'none';
    }
}

function preencherDataHoraAbast() {
    let now = new Date();
    let hojeLocal = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().slice(0,16);
    let elAb = document.getElementById('abast-data'); if(elAb) elAb.value = hojeLocal;
    let elCh = document.getElementById('chegada-data'); if(elCh) elCh.value = hojeLocal;
    
    document.getElementById('estoque-diesel-geral').innerText = window.estoqueDiesel + " L";
    document.getElementById('estoque-arla-geral').innerText = window.estoqueArla + " L";
    document.getElementById('gasto-mes-geral').innerText = window.gastoMesGeral + " L";
}

async function salvarAbastecimentoNuvem() {
    let tipo = document.getElementById('tipo-abast').value;
    let placa = document.getElementById('texto-placa-interna').innerText;
    
    let payload = {
        acao: "salvar_abastecimento",
        tipo: tipo,
        placa: tipo.includes("CHEGADA") ? "ESTOQUE" : placa,
    };

    if (tipo.includes("CHEGADA")) {
        payload.data = document.getElementById('chegada-data').value;
        payload.litros = parseFloat(document.getElementById('chegada-litros').value) || 0;
        payload.nf = document.getElementById('chegada-nf').value;
        payload.km = ""; payload.motorista = ""; payload.responsavel = "";
        
        if (!payload.data || !payload.litros || !payload.nf) return alert("❌ Preencha a Data, os Litros e a Nota Fiscal!");
    } else {
        payload.data = document.getElementById('abast-data').value;
        payload.km = parseFloat(document.getElementById('abast-km-novo').value) || 0;
        payload.litros = parseFloat(document.getElementById('abast-litros-bomba').value) || 0;
        payload.motorista = document.getElementById('abast-motorista').value;
        payload.responsavel = document.getElementById('abast-resp').value;
        payload.nf = "";

        let kmUltimo = parseFloat(document.getElementById('aviso-ultimo-km').innerText) || 0;
        
        if (!payload.data || !payload.km || !payload.litros || !payload.motorista || !payload.responsavel) {
            return alert("❌ Preencha todos os campos do Abastecimento!");
        }
        if (payload.km < kmUltimo) {
            return alert(`❌ O KM digitado (${payload.km}) não pode ser MENOR que o último registrado (${kmUltimo})!`);
        }
    }

    let btn = document.getElementById('btn-salvar-abast-nuvem');
    btn.innerText = "Salvando Lançamento... ⏳"; btn.disabled = true;

    try {
        let req = await fetch(API_URL, { method: 'POST', body: JSON.stringify(payload) });
        let res = await req.json();
        if (res.sucesso) {
            alert("✅ Salvo com sucesso!");
            
            document.getElementById('abast-km-novo').value = "";
            document.getElementById('abast-litros-bomba').value = "";
            document.getElementById('chegada-litros').value = "";
            document.getElementById('chegada-nf').value = "";
            
            if (!tipo.includes("CHEGADA")) {
                window.frota[placa].km_atual = payload.km;
                document.getElementById('km-master').value = payload.km;
                document.getElementById('aviso-ultimo-km').innerText = payload.km;
                atualizarKMGeral(); 
                
                if(tipo === "DIESEL") {
                    window.frota[placa].gasto_mes = (window.frota[placa].gasto_mes || 0) + payload.litros;
                    document.getElementById('abast-gasto-mes').innerText = window.frota[placa].gasto_mes + " L";
                    window.estoqueDiesel -= payload.litros;
                    window.gastoMesGeral += payload.litros;
                }
                if(tipo === "ARLA") window.estoqueArla -= payload.litros;
            } else {
                if(tipo === "CHEGADA DE DIESEL") window.estoqueDiesel += payload.litros;
                if(tipo === "CHEGADA DE ARLA") window.estoqueArla += payload.litros;
            }
            
            preencherDataHoraAbast(); 
        } else {
            alert("❌ Erro: " + res.erro);
        }
    } catch (e) { alert("❌ Erro de conexão."); }
    
    btn.innerText = "💾 Salvar Lançamento"; btn.disabled = false;
}


/* =====================================
   MÓDULO DE CHECKLIST E FOTOS
   ===================================== */
let b64Lateral = "";
let b64Traseira = "";

function processarFoto(input, idPreview) {
    if (!input.files || !input.files[0]) return;
    const reader = new FileReader();
    reader.onload = function(event) {
        const img = new Image();
        img.src = event.target.result;
        img.onload = function() {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 800;
            let width = img.width; let height = img.height;
            if (width > MAX_WIDTH) { height = Math.round((height * MAX_WIDTH) / width); width = MAX_WIDTH; }
            canvas.width = width; canvas.height = height;
            
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            
            const dataUrl = canvas.toDataURL('image/jpeg', 0.6); 
            if(idPreview === 'preview-lat') b64Lateral = dataUrl;
            if(idPreview === 'preview-tras') b64Traseira = dataUrl;
            
            let preview = document.getElementById(idPreview);
            preview.src = dataUrl; preview.style.display = 'block';
        }
    };
    reader.readAsDataURL(input.files[0]);
}

function renderizarHistorico(dados) {
    let container = document.getElementById('container-historico');
    container.innerHTML = "";
    if (!dados || dados.length === 0) { container.innerHTML = "<p style='text-align:center; color:#666;'>Nenhum checklist registrado ainda.</p>"; return; }
    dados.forEach(item => {
        let div = document.createElement('div'); div.className = "historico-item";
        let dataFormatada = String(item.data).split('T')[0]; 
        div.innerHTML = `<span style="font-weight: bold; color: #1a4d2e;">${item.placa}</span> <span style="color: #555; font-size: 12px;">${dataFormatada} ✅</span>`;
        container.appendChild(div);
    });
}

function iniciarNovoChecklist() {
    let placa = document.getElementById('texto-placa-interna').innerText;
    document.getElementById('lista-historico-checklist').style.display = 'none';
    document.getElementById('form-novo-checklist').style.display = 'block';
    
    document.querySelectorAll('input[type="checkbox"]').forEach(c => c.checked = false);
    document.querySelectorAll('input[id$="-outro"]').forEach(c => { c.value = ""; c.style.display = 'none'; });
    document.querySelectorAll('input[id^="chk-twi-"]').forEach(i => i.value = "");
    document.querySelectorAll('.twi-estado-badge').forEach(b => { b.innerText = "Aguardando..."; b.style.backgroundColor = "#eee"; b.style.color = "#666"; });

    b64Lateral = ""; b64Traseira = "";
    document.getElementById('foto-lat-input').value = ""; document.getElementById('foto-tras-input').value = "";
    document.getElementById('preview-lat').style.display = "none"; document.getElementById('preview-tras').style.display = "none";

    let mesAtual = new Date().toISOString().slice(0, 7); 
    let veiculo = window.frota[placa];
    if (veiculo && veiculo.mes_foto === mesAtual) {
        document.getElementById('container-inputs-fotos').style.display = 'none'; 
        document.getElementById('aviso-fotos-ok').style.display = 'block';        
    } else {
        document.getElementById('container-inputs-fotos').style.display = 'block'; 
        document.getElementById('aviso-fotos-ok').style.display = 'none';         
    }

    document.getElementById('chk-placa').value = placa;
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

function avancarPasso(proximo) {
    let passoAtual = proximo - 1; 
    if (passoAtual === 1) {
        if(!document.getElementById('chk-modelo').value) return alert("❌ Selecione o Modelo do Caminhão!");
        if(!document.getElementById('chk-motorista').value) return alert("❌ Digite o nome do Motorista!");
        if(!document.getElementById('chk-km').value) return alert("❌ Digite o KM Atual!");
    }
    if (passoAtual === 2) {
        let gruposMecanica = ['chk-motor', 'chk-cambio', 'chk-embreagem', 'chk-direcao', 'chk-freios', 'chk-suspensao'];
        for (let grupo of gruposMecanica) {
            if (document.querySelectorAll(`input[name="${grupo}"]:checked`).length === 0) return alert(`❌ Você esqueceu de preencher uma das sessões de Mecânica!`);
        }
    }
    if (passoAtual === 3) {
        let gruposEletrica = ['chk-pneus_geral', 'chk-eletrica', 'chk-indicadores', 'chk-cabine'];
        for (let grupo of gruposEletrica) {
            if (document.querySelectorAll(`input[name="${grupo}"]:checked`).length === 0) return alert(`❌ Você esqueceu de preencher uma das sessões de Cabine/Elétrica!`);
        }
    }
    mudarAbaChecklist(proximo);
}

function verificarOutro(checkboxClicado, idCampoTexto) {
    let campoTexto = document.getElementById(idCampoTexto);
    if (checkboxClicado.value === "OUTRO" && checkboxClicado.checked) {
        campoTexto.style.display = 'block'; campoTexto.focus();
    } else if (checkboxClicado.value === "OUTRO" && !checkboxClicado.checked) {
        campoTexto.style.display = 'none'; campoTexto.value = ''; 
    }
}

function verificarTudoOk(checkboxClicado, nomeGrupo) {
    if (checkboxClicado.checked && checkboxClicado.value.includes("NÃO APRESENTA")) {
        document.querySelectorAll(`input[name="${nomeGrupo}"]`).forEach(c => { if (c !== checkboxClicado) c.checked = false; });
        let txtOutro = document.getElementById(nomeGrupo + "-outro");
        if(txtOutro) { txtOutro.style.display = 'none'; txtOutro.value = ''; }
    } else if (checkboxClicado.checked) {
        document.querySelectorAll(`input[name="${nomeGrupo}"]`).forEach(c => { if (c.value.includes("NÃO APRESENTA")) c.checked = false; });
    }
}

function calcularStatusTwi(inputEl, badgeId) {
    let badge = document.getElementById(badgeId);
    let val = parseFloat(inputEl.value);
    if (isNaN(val)) { badge.innerText = "Aguardando..."; badge.style.backgroundColor = "#eee"; badge.style.color = "#666"; return; }
    if (val >= 10) { badge.innerText = "Pneu Novo"; badge.style.backgroundColor = "#d4edda"; badge.style.color = "#155724"; } 
    else if (val >= 5) { badge.innerText = "Meia-Vida"; badge.style.backgroundColor = "#fff3cd"; badge.style.color = "#856404"; } 
    else { badge.innerText = "No Limite"; badge.style.backgroundColor = "#f8d7da"; badge.style.color = "#721c24"; }
}

function pegarMarcados(nomeGrupo, idOutro) {
    let selecionados = [];
    document.querySelectorAll(`input[name="${nomeGrupo}"]:checked`).forEach(c => { if(c.value !== "OUTRO") selecionados.push(c.value); });
    let txtOutro = document.getElementById(idOutro);
    if (txtOutro && txtOutro.value.trim() !== "") selecionados.push("OUTROS: " + txtOutro.value.trim());
    return selecionados.length > 0 ? selecionados.join(" | ") : "Não avaliado";
}

async function enviarChecklist() {
    if (document.querySelectorAll(`input[name="chk-faltantes"]:checked`).length === 0) return alert("❌ Informe os Itens Faltantes!");
    if (!document.getElementById('chk-extintor-data').value) return alert("❌ Informe a Data de Validade do Extintor!");

    const idsPneus = ['dd', 'de', 'tde', 'tdi', 'tee', 'tei', 'tkde', 'tkdi', 'tkee', 'tkei', '1step'];
    for (let id of idsPneus) {
        if (!document.getElementById('chk-twi-' + id).value) return alert(`❌ Preencha o TWI do Pneu ${id.toUpperCase()}! É obrigatório preencher todos os 11.`);
    }

    if (document.getElementById('container-inputs-fotos').style.display !== 'none') {
        if (!b64Lateral || !b64Traseira) return alert("❌ É obrigatório enviar a Foto Lateral e Traseira do caminhão!");
    }

    let btn = document.getElementById('btn-enviar-chk');
    btn.innerText = "Salvando na Nuvem... ⏳"; btn.disabled = true;

    let dataExt = document.getElementById('chk-extintor-data').value;
    let pressExt = document.getElementById('chk-extintor-pressao').value;
    let textoExtintor = `Val: ${dataExt} - ${pressExt}`;

    let payload = {
        acao: "salvar_checklist",
        placa: document.getElementById('chk-placa').value,
        modelo: document.getElementById('chk-modelo').value,
        motorista: document.getElementById('chk-motorista').value,
        km_atual: document.getElementById('chk-km').value,
        km_oleo: document.getElementById('chk-km-oleo').value,
        data_tacografo: document.getElementById('chk-data-taco').value,
        data_graxa: document.getElementById('chk-data-graxa').value,
        
        chk_motor: pegarMarcados('chk-motor', 'chk-motor-outro'),
        chk_cambio: pegarMarcados('chk-cambio', 'chk-cambio-outro'),
        chk_embreagem: pegarMarcados('chk-embreagem', 'chk-emb-outro'),
        chk_direcao: pegarMarcados('chk-direcao', 'chk-dir-outro'),
        chk_freios: pegarMarcados('chk-freios', 'chk-freio-outro'),
        chk_suspensao: pegarMarcados('chk-suspensao', 'chk-susp-outro'),
        chk_pneus_geral: pegarMarcados('chk-pneus_geral', 'chk-pneu-outro'),
        chk_eletrica: pegarMarcados('chk-eletrica', 'chk-elet-outro'),
        chk_indicadores: pegarMarcados('chk-indicadores', 'chk-ind-outro'),
        chk_cabine: pegarMarcados('chk-cabine', 'chk-cab-outro'),
        chk_faltantes: pegarMarcados('chk-faltantes', 'chk-falta-outro'),
        
        chk_extintores: textoExtintor,
        chk_parada: document.getElementById('chk-parada').value,
        chk_obs: document.getElementById('chk-obs').value,
        
        foto_lateral_b64: b64Lateral,
        foto_traseira_b64: b64Traseira,
        pneus: {}
    };

    idsPneus.forEach(id => {
        let twi = document.getElementById('chk-twi-' + id).value;
        let badge = document.getElementById('badge-estado-' + id).innerText;
        if (twi) payload.pneus[id] = { milimetros: twi, estado: badge };
    });

    try {
        let resposta = await fetch(API_URL, { method: 'POST', body: JSON.stringify(payload) });
        let dados = await resposta.json();

        if (dados.sucesso) {
            alert("✅ Sucesso! Checklist salvo com sucesso e as fotos estão salvas no Drive!");
            
            window.frota[payload.placa].km_atual = payload.km_atual;
            window.frota[payload.placa].km_oleo = payload.km_oleo;
            if(dados.mesAtual) window.frota[payload.placa].mes_foto = dados.mesAtual;
            if(dados.linkLat) window.frota[payload.placa].foto_lateral = dados.linkLat;
            if(dados.linkTras) window.frota[payload.placa].foto_traseira = dados.linkTras;
            
            for(let id in payload.pneus) {
                if(!window.frota[payload.placa].pneus[id]) window.frota[payload.placa].pneus[id] = {};
                window.frota[payload.placa].pneus[id].milimetros = payload.pneus[id].milimetros;
                window.frota[payload.placa].pneus[id].estado = payload.pneus[id].estado;
            }

            let hojeStr = new Date().toISOString();
            cancelarChecklist(); 
            selecionarPlaca(payload.placa); 
            
            let divHist = document.createElement('div'); divHist.className = "historico-item";
            divHist.innerHTML = `<span style="font-weight: bold; color: #1a4d2e;">${payload.placa}</span> <span style="color: #555; font-size: 12px;">${hojeStr.split('T')[0]} ✅</span>`;
            document.getElementById('container-historico').prepend(divHist);
        } else {
            alert("❌ Erro ao salvar: " + dados.erro);
        }
    } catch (erro) { alert("❌ Falha na conexão. O Google não recebeu os dados."); }

    btn.innerText = "💾 Enviar Checklist"; btn.disabled = false;
}
