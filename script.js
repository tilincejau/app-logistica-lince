const API_URL = "https://script.google.com/macros/s/AKfycbxvxiDr82rljfQtwcIVAxVKgBb09QRnS5cdIl2j15m9BjZ3PSaH7olg2RpDzIM2smf5tA/exec";

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
            console.error("Erro no Google:", texto);
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
    document.getElementById('texto-placa-escolhida').innerText = "Carregando...";
    document.getElementById('texto-placa-interna').innerText = placa; 
    
    esconderTodasTelas();
    document.getElementById('tela-menu').style.display = 'flex';

    try {
        let resposta = await fetch(`${API_URL}?acao=buscar_veiculo&placa=${placa}`);
        let texto = await resposta.text();
        let dados = JSON.parse(texto);

        let kmProximaTroca = 15000; 
        let dataTacografo = '';

        if (!dados.erro) {
            if (dados.km_oleo !== undefined && dados.km_oleo !== null && dados.km_oleo !== "") {
                let kmLimp = String(dados.km_oleo).replace(/\./g, '').replace(/,/g, '');
                kmProximaTroca = parseInt(kmLimp);
                if (isNaN(kmProximaTroca)) kmProximaTroca = 15000;
            }
            if (dados.data_tacografo) {
                let dtStr = String(dados.data_tacografo);
                if (dtStr.includes('T')) {
                    dataTacografo = dtStr.split('T')[0];
                } else if (dtStr.includes('/')) {
                    let partes = dtStr.split('/');
                    if (partes.length === 3) dataTacografo = `${partes[2]}-${partes[1]}-${partes[0]}`;
                } else {
                    dataTacografo = dtStr;
                }
            }
        }

        document.getElementById('km-proxima-troca').value = kmProximaTroca;
        document.getElementById('km-master').value = 0; 
        document.getElementById('data-proxima-afericao').value = dataTacografo;
        
        atualizarKMGeral(); 
        calcularTacografo(); 

        document.getElementById('texto-placa-escolhida').innerText = dados.erro ? placa + " (Não Cadastrada)" : placa;

    } catch (erro) {
        // Agora ele não dá mais aquele popup irritante!
        console.error("Falha de conexão:", erro);
        document.getElementById('texto-placa-escolhida').innerText = placa + " (Offline)";
        document.getElementById('km-proxima-troca').value = 15000;
        document.getElementById('km-master').value = 0;
        atualizarKMGeral();
    }
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

function atualizarKMGeral() {
    let kmMaster = document.getElementById('km-master').value;
    document.getElementById('km-atual-oleo').innerText = kmMaster;
    calcularOleo();
    calcularRodizioPneus();
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
        txtStatus.innerHTML = `VENCIDO (${Math.abs(kmFaltantes)} KM) ❌`;
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
    
    document.getElementById('data-ultima-afericao').innerText = `${String(ultimaData.getDate()).padStart(2, '0')}/${String(ultimaData.getMonth() + 1).padStart(2, '0')}/${ultimaData.getFullYear()}`;
    
    let hoje = new Date();
    hoje.setHours(0,0,0,0);
    let diasFaltantes = Math.ceil((proximaData.getTime() - hoje.getTime()) / (1000 * 3600 * 24));
    let txtStatus = document.getElementById('status-tacografo');
    
    if (diasFaltantes < 0) {
        txtStatus.innerHTML = `VENCIDO há ${Math.abs(diasFaltantes)} dias ❌`;
        txtStatus.style.color = "red";
    } else if (diasFaltantes <= 30) {
        txtStatus.innerHTML = `Atenção: Faltam ${diasFaltantes} dias ⚠️`;
        txtStatus.style.color = "#d4a017";
    } else {
        txtStatus.innerHTML = `Faltam ${diasFaltantes} dias ✅`;
        txtStatus.style.color = "green";
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
        if(!spanEstado) return; // Evita erro se a tela não carregou direito
        
        let estadoStr = spanEstado.innerText.toLowerCase();
        let kmTroca = parseInt(document.getElementById(`km-troca-${pos}`).innerText) || 0;
        
        if (estadoStr === "---" || kmTroca === 0) {
            document.getElementById(`status-rod-${pos}`).innerText = "Aguardando dados...";
            document.getElementById(`status-rod-${pos}`).style.color = "gray";
            return;
        }

        let intervalo = estadoStr.includes('novo') ? baseNovo : baseRessolado;
        let kmProxRodizio = kmTroca + intervalo;
        
        document.getElementById(`prox-rod-${pos}`).innerText = kmProxRodizio + " KM";
        
        let kmFaltantes = kmProxRodizio - kmMaster;
        let txtStatus = document.getElementById(`status-rod-${pos}`);
        
        if (kmFaltantes <= 0) {
            txtStatus.innerHTML = `VENCIDO (${Math.abs(kmFaltantes)} KM) ❌`;
            txtStatus.style.color = "red";
        } else if (kmFaltantes <= 1500) {
            txtStatus.innerHTML = `Atenção: Faltam ${kmFaltantes} KM ⚠️`;
            txtStatus.style.color = "#d4a017";
        } else {
            txtStatus.innerHTML = `Faltam ${kmFaltantes} KM ✅`;
            txtStatus.style.color = "green";
        }
    });
}
