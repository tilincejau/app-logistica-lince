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
    
    esconderTodasTelas();
    document.getElementById('tela-menu').style.display = 'flex';
}

function voltarParaPlacas() {
    esconderTodasTelas();
    document.getElementById('tela-placas').style.display = 'flex';
}

function abrirPagina(nomeDaPagina) {
    document.getElementById('titulo-tela-interna').innerText = nomeDaPagina;
    
    esconderTodasTelas();
    document.getElementById('tela-interna').style.display = 'flex';
}

function voltarParaMenu() {
    esconderTodasTelas();
    document.getElementById('tela-menu').style.display = 'flex';
}
