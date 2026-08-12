// Banco de dados dos Veículos com as KMs de próxima troca do óleo
const dadosFrota = {
    'AXZ1D53': { kmOleo: 172317 },
    'FCT1J98': { kmOleo: 272430 },
    'FEE9E40': { kmOleo: 250567 },
    'FIF9A30': { kmOleo: 320582 },
    'FMQ8H77': { kmOleo: 239462 },
    'FMR4I10': { kmOleo: 415568 },
    'FPJ1B16': { kmOleo: 305937 },
    'FQY6B30': { kmOleo: 423271 },
    'IVE8J03': { kmOleo: 188380 },
    'NTP4G17': { kmOleo: 249790 },
    'TKR8I49': { kmOleo: 65611 },
    'TLY0G57': { kmOleo: 15000 },
    'UDN0J81': { kmOleo: 15000 },
    'UPS1J80': { kmOleo: 15000 },
    'UPX9D25': { kmOleo: 15000 },
    'URT4E79': { kmOleo: 15000 },
    'URU3F36': { kmOleo: 15000 }
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
    
    // Puxa o KM da próxima troca do banco de dados
    let kmProximaTroca = 15000;
    if (dadosFrota[placa]) {
        kmProximaTroca = dadosFrota[placa].kmOleo;
    }
    document.getElementById('km-proxima-troca').value = kmProximaTroca;
    
    // Colocando um KM atual fictício para forçar a matemática funcionar ao abrir
    document.getElementById('km-atual-veiculo').value = kmProximaTroca - 2000; 

    // Roda o cálculo do status imediatamente
    calcularOleo();
    
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

// Matemática do Óleo
function calcularOleo() {
    let kmAtual = parseInt(document.getElementById('km-atual-veiculo').value) || 0;
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

// Função para trancar e destrancar os campos de Óleo
 function alternarEdicaoOleo() {
    let campoAtual = document.getElementById('km-atual-veiculo');
    let campoProxima = document.getElementById('km-proxima-troca');
    let btn = document.getElementById('btn-editar-oleo');
    
    // Verifica se os campos estão trancados (readonly)
    if (campoAtual.hasAttribute('readonly')) {
        // 1. DESTRANCAR (Modo Edição)
        campoAtual.removeAttribute('readonly');
        campoProxima.removeAttribute('readonly');
        campoAtual.classList.remove('travado');
        campoProxima.classList.remove('travado');
        
        // Muda o visual do botão para verde chamativo
        btn.innerHTML = "💾 Salvar";
        btn.style.backgroundColor = "#1a4d2e";
        btn.style.color = "white";
        
        // Foca no primeiro campo automaticamente
        campoAtual.focus();
    } else {
        // 2. TRANCAR (Modo Salvo)
        campoAtual.setAttribute('readonly', 'true');
        campoProxima.setAttribute('readonly', 'true');
        campoAtual.classList.add('travado');
        campoProxima.classList.add('travado');
        
        // Volta o botão para o visual normal
        btn.innerHTML = "✏️ Editar";
        btn.style.backgroundColor = "transparent";
        btn.style.color = "#1a4d2e";
        
        // Roda o cálculo para garantir que o status atualizou
        calcularOleo();
    }
}
}
