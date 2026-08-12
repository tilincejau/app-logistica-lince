// Aqui está a ponte de conexão com a sua planilha do Google!
const API_URL = "https://script.google.com/macros/s/AKfycbxvxiDr82rljfQtwcIVAxVKgBb09QRnS5cdIl2j15m9BjZ3PSaH7olg2RpDzIM2smf5tA/exec";

function esconderTodasTelas() {
    document.getElementById('tela-login').style.display = 'none';
    document.getElementById('tela-placas').style.display = 'none';
    document.getElementById('tela-menu').style.display = 'none';
    document.getElementById('tela-interna').style.display = 'none';
}

// O Login agora conversa com a nuvem
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

    // Muda o botão para mostrar que está carregando
    btnEntrar.innerText = "Verificando na nuvem...";
    msgErro.style.display = 'none';

    try {
        let resposta = await fetch(`${API_URL}?acao=login&usuario=${usuario}&senha=${senha}`);
        let dados = await resposta.json();

        if (dados.sucesso) {
            esconderTodasTelas();
            document.getElementById('tela-placas').style.display = 'flex';
        } else {
            msgErro.innerText = "Usuário ou senha incorretos!";
            msgErro.style.display = 'block';
        }
    } catch (erro) {
        msgErro.innerText = "Erro ao conectar. Verifique a internet.";
        msgErro.style.display = 'block';
    }
    
    // Volta o botão ao normal
    btnEntrar.innerText = "Entrar";
}

function sairDaConta() {
    esconderTodasTelas();
    document.getElementById('campo-senha').value = ''; 
    document.getElementById('tela-login').style.display = 'flex';
}

// A seleção de placa busca os dados e inicia o KM Atual zerado
async function selecionarPlaca(placa) {
    document.getElementById('texto-placa-escolhida').innerText = "Buscando dados...";
    document.getElementById('texto-placa-interna').innerText = placa; 
    
    esconderTodasTelas();
    document.getElementById('tela-menu').style.display = 'flex';

    try {
        let resposta = await fetch(`${API_URL}?acao=buscar_veiculo&placa=${placa}`);
        let dados = await resposta.json();

        let kmProximaTroca = 15000; 
        let dataTacografo = '';

        if (!dados.erro) {
            
            // Trata o KM do Óleo
            if (dados.km_oleo !== undefined && dados.km_oleo !== null && dados.km_oleo !== "") {
                let kmLimp = String(dados.km_oleo).replace(/\./g, '').replace(/,/g, '');
                kmProximaTroca = parseInt(kmLimp);
                if (isNaN(kmProximaTroca)) kmProximaTroca = 15000;
            }
            
            // Trata a Data do Tacógrafo
            if (dados.data_tacografo) {
                let dtStr = String(dados.data_tacografo);
                if (dtStr.includes('T')) {
                    dataTacografo = dtStr.split('T')[0];
                } else if (dtStr.includes('/')) {
                    let partes = dtStr.split('/');
                    if (partes.length === 3) {
                        dataTacografo = `${partes[2]}-${partes[1]}-${partes[0]}`;
                    }
                } else {
                    dataTacografo = dtStr;
                }
            }
        }

        // 1. Preenche a Próxima Troca com o dado real da planilha
        document.getElementById('km-proxima-troca').value = kmProximaTroca;
        
        // 2. O KM Atual (Master) inicia ZERADO! Removemos a simulação.
        document.getElementById('km-master').value = 0; 
        atualizarKMGeral(); 
        
        // 3. Preenche o Tacógrafo
        document.getElementById('data-proxima-afericao').value = dataTacografo;
        calcularTacografo(); 

        document.getElementById('texto-placa-escolhida').innerText = placa;

    } catch (erro) {
        alert("Modo offline: Falha ao buscar na nuvem.");
        document.getElementById('texto-placa-escolhida').innerText = placa;
    }
}

function voltarParaPlacas() {
    esconderTodasTelas();
    document.getElementById('tela-placas').style.display = 'flex';
}

function abrirPagina(nomeDaPagina) {
    document.getElementById('titulo-tela-interna').innerText = nomeDaPagina;
    
    let secoes = document.getElementsByClassName('secao-conteudo');
    for (let i = 0; i < secoes.length; i++) {
        secoes[i].style.display = 'none';
    }
    
    let secaoAtiva = document.getElementById('conteudo-' + nomeDaPagina);
    if (secaoAtiva) {
        secaoAtiva.style.display = 'flex';
    }
    
    esconderTodasTelas();
    document.getElementById('tela-interna').style.display = 'flex';
}

function voltarParaMenu() {
    esconderTodasTelas();
    document.getElementById('tela-menu').style.display = 'flex';
}

// --- FUNÇÕES DE MATEMÁTICA E EDIÇÃO DA FICHA TÉCNICA ---

function atualizarKMGeral() {
    let kmMaster = document.getElementById('km-master').value;
    document.getElementById('km-atual-oleo').innerText = kmMaster;
    calcularOleo();
}

function alternarEdicaoOleo() {
    let campoProxima = document.getElementById('km-proxima-troca');
    let btn = document.getElementById('btn-editar-oleo');
    
    if (campoProxima.hasAttribute('readonly')) {
        campoProxima.removeAttribute('readonly');
        campoProxima.classList.remove('travado');
        btn.innerHTML = "💾 Salvar";
        btn.style.backgroundColor = "#1a4d2e";
        btn.style.color = "white";
        campoProxima.focus();
    } else {
        campoProxima.setAttribute('readonly', 'true');
        campoProxima.classList.add('travado');
        btn.innerHTML = "✏️ Editar";
        btn.style.backgroundColor = "transparent";
        btn.style.color = "#1a4d2e";
        calcularOleo();
    }
}

function calcularOleo() {
    let kmAtual = parseInt(document.getElementById('km-master').value) || 0;
    let kmProxima = parseInt(document.getElementById('km-proxima-troca').value) || 0;
    
    let kmFaltantes = kmProxima - kmAtual;
    let txtStatus = document.getElementById('status-oleo');
    
    if (kmFaltantes <= 0) {
        let kmAtraso = Math.abs(kmFaltantes); 
        txtStatus.innerHTML = `VENCIDO (${kmAtraso} KM) ❌`;
        txtStatus.style.color = "red";
    } else if (kmFaltantes <= 1500) {
        txtStatus.innerHTML = `Atenção: Faltam ${kmFaltantes} KM ⚠️`;
        txtStatus.style.color = "#d4a017"; 
    } else {
        txtStatus.innerHTML = `Faltam ${kmFaltantes} KM ✅`;
        txtStatus.style.color = "green";
    }
}

function alternarEdicaoTacografo() {
    let campoProxima = document.getElementById('data-proxima-afericao');
    let btn = document.getElementById('btn-editar-tacografo');
    
    if (campoProxima.hasAttribute('readonly')) {
        campoProxima.removeAttribute('readonly');
        campoProxima.classList.remove('travado');
        btn.innerHTML = "💾 Salvar";
        btn.style.backgroundColor = "#1a4d2e";
        btn.style.color = "white";
    } else {
        campoProxima.setAttribute('readonly', 'true');
        campoProxima.classList.add('travado');
        btn.innerHTML = "✏️ Editar";
        btn.style.backgroundColor = "transparent";
        btn.style.color = "#1a4d2e";
        calcularTacografo();
    }
}

function calcularTacografo() {
    let proximaDataStr = document.getElementById('data-proxima-afericao').value;
    if (!proximaDataStr) return; 
    
    let partes = proximaDataStr.split('-');
    let proximaData = new Date(partes[0], partes[1] - 1, partes[2]);
    
    let ultimaData = new Date(proximaData);
    ultimaData.setFullYear(ultimaData.getFullYear() - 2);
    
    let dia = String(ultimaData.getDate()).padStart(2, '0');
    let mes = String(ultimaData.getMonth() + 1).padStart(2, '0');
    let ano = ultimaData.getFullYear();
    document.getElementById('data-ultima-afericao').innerText = `${dia}/${mes}/${ano}`;
    
    let hoje = new Date();
    hoje.setHours(0,0,0,0);
    
    let diffTempo = proximaData.getTime() - hoje.getTime();
    let diasFaltantes = Math.ceil(diffTempo / (1000 * 3600 * 24));
    
    let txtStatus = document.getElementById('status-tacografo');
    
    if (diasFaltantes < 0) {
        let diasAtraso = Math.abs(diasFaltantes);
        txtStatus.innerHTML = `VENCIDO há ${diasAtraso} dias ❌`;
        txtStatus.style.color = "red";
    } else if (diasFaltantes <= 30) {
        txtStatus.innerHTML = `Atenção: Faltam ${diasFaltantes} dias ⚠️`;
        txtStatus.style.color = "#d4a017";
    } else {
        txtStatus.innerHTML = `Faltam ${diasFaltantes} dias ✅`;
        txtStatus.style.color = "green";
    }
}
