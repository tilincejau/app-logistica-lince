// Banco de dados dos Veículos (Óleo e Tacógrafo)
const dadosFrota = {
    'AXZ1D53': { kmOleo: 172317, dataTaco: '2027-10-14' },
    'FCT1J98': { kmOleo: 272430, dataTaco: '2027-05-26' },
    'FEE9E40': { kmOleo: 250567, dataTaco: '2027-03-14' },
    'FIF9A30': { kmOleo: 320582, dataTaco: '2027-05-26' },
    'FMQ8H77': { kmOleo: 239462, dataTaco: '2027-03-18' },
    'FMR4I10': { kmOleo: 415568, dataTaco: '2026-08-27' },
    'FPJ1B16': { kmOleo: 305937, dataTaco: '2028-05-04' },
    'FQY6B30': { kmOleo: 423271, dataTaco: '2027-07-14' },
    'FUH9H91': { kmOleo: 15000,  dataTaco: '2027-05-26' }, 
    'IVE8J03': { kmOleo: 188380, dataTaco: '2027-10-14' },
    'NTP4G17': { kmOleo: 249790, dataTaco: '2028-05-04' },
    'TKR8I49': { kmOleo: 65611,  dataTaco: '2026-12-10' },
    'TLL8H30': { kmOleo: 15000,  dataTaco: '2026-12-11' }, 
    'TLY0G57': { kmOleo: 15000,  dataTaco: '2028-07-16' },
    'UDN0J81': { kmOleo: 15000,  dataTaco: '2028-07-14' },
    'UPS1J80': { kmOleo: 15000,  dataTaco: '2028-07-27' },
    'UPX9D25': { kmOleo: 15000,  dataTaco: '2028-07-27' },
    'URT4E79': { kmOleo: 15000,  dataTaco: '2028-08-28' },
    'URU3F36': { kmOleo: 15000,  dataTaco: '2028-07-14' }
};

function esconderTodasTelas() {
    document.getElementById('tela-login').style.display = 'none';
    document.getElementById('tela-placas').style.display = 'none';
    document.getElementById('tela-menu').style.display = 'none';
    document.getElementById('tela-interna').style.display = 'none';
}

function fazerLogin() {
    let usuario = document.getElementById('campo-usuario').value;
    let senha = document.getElementById('campo-senha').value;

    if (usuario === "motorista" && senha === "123") {
        esconderTodasTelas();
        document.getElementById('tela-placas').style.display = 'flex';
        document.getElementById('mensagem-erro').style.display = 'none';
    } else {
        document.getElementById('mensagem-erro').style.display = 'block';
    }
}

function sairDaConta() {
    esconderTodasTelas();
    document.getElementById('campo-senha').value = ''; 
    document.getElementById('tela-login').style.display = 'flex';
}

function selecionarPlaca(placa) {
    document.getElementById('texto-placa-escolhida').innerText = placa;
    document.getElementById('texto-placa-interna').innerText = placa; 
    
    // Puxa o KM da próxima troca de óleo
    let kmProximaTroca = 15000;
    if (dadosFrota[placa] && dadosFrota[placa].kmOleo) {
        kmProximaTroca = dadosFrota[placa].kmOleo;
    }
    document.getElementById('km-proxima-troca').value = kmProximaTroca;
    document.getElementById('km-master').value = kmProximaTroca - 2000; 
    atualizarKMGeral(); 
    
    // Puxa a Data do Tacógrafo
    let dataTacografo = '';
    if (dadosFrota[placa] && dadosFrota[placa].dataTaco) {
        dataTacografo = dadosFrota[placa].dataTaco;
    }
    document.getElementById('data-proxima-afericao').value = dataTacografo;
    calcularTacografo(); 
    
    esconderTodasTelas();
    document.getElementById('tela-menu').style.display = 'flex';
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
