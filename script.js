// ==========================================
// FUNÇÕES DO SISTEMA DE CHECKLIST
// ==========================================

function iniciarNovoChecklist() {
    document.getElementById('lista-historico-checklist').style.display = 'none';
    document.getElementById('form-novo-checklist').style.display = 'block';
    
    // 1. Puxa os dados da Ficha Técnica para o Formulário automaticamente
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
    // Esconde os 4 passos e desativa os botões do topo
    for(let i = 1; i <= 4; i++) {
        document.getElementById('passo-chk-' + i).style.display = 'none';
        document.getElementById('tab-chk-' + i).classList.remove('ativo');
    }
    // Mostra apenas o passo solicitado
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
        campoTexto.value = ''; // Limpa se o cara desistir de usar o "OUTRO"
    }
}

// Essa função simula a leitura dos últimos 5 envios de checklist da semana
function carregarHistoricoVisual() {
    let container = document.getElementById('container-historico');
    
    // Simulação visual (Depois vamos conectar isso na Aba Checklist_Respostas)
    let historicoFake = [
        {placa: 'AXZ1D53', data: '12/08/2026'},
        {placa: 'FEE9E40', data: '11/08/2026'},
        {placa: 'FCT1J98', data: '09/08/2026'},
        {placa: 'FIF9A30', data: '05/08/2026'},
        {placa: 'FUH9H91', data: '01/08/2026'}
    ];

    container.innerHTML = ""; // Limpa a mensagem de carregando

    historicoFake.forEach(item => {
        let div = document.createElement('div');
        div.className = "historico-item";
        div.innerHTML = `<span style="font-weight: bold; color: #1a4d2e;">${item.placa}</span>
                         <span style="color: #555;">${item.data} ✅</span>`;
        container.appendChild(div);
    });
}

// Toda vez que a página inteira carregar, preenche o histórico fake de placas
window.onload = function() {
    carregarHistoricoVisual();
};
