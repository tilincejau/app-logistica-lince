function abrirPagina(nomeDaPagina) {
    // 1. Atualiza o título da tela lá em cima
    document.getElementById('titulo-tela-interna').innerText = nomeDaPagina;
    
    // 2. Esconde todas as seções de conteúdo
    let secoes = document.getElementsByClassName('secao-conteudo');
    for (let i = 0; i < secoes.length; i++) {
        secoes[i].style.display = 'none';
    }
    
    // 3. Mostra SÓ a seção que tem o nome do botão clicado
    let secaoAtiva = document.getElementById('conteudo-' + nomeDaPagina);
    if (secaoAtiva) {
        secaoAtiva.style.display = 'flex';
    }
    
    // 4. Muda a tela visível principal
    esconderTodasTelas();
    document.getElementById('tela-interna').style.display = 'flex';
}
