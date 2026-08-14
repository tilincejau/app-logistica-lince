/* =========================================================
   SISTEMA LINCE - CÉREBRO JAVASCRIPT LOCAL
   ========================================================= */

const API_URL = "https://script.google.com/macros/s/AKfycbxvxiDr82rljfQtwcIVAxVKgBb09QRnS5cdIl2j15m9BjZ3PSaH7olg2RpDzIM2smf5tA/exec";
const CAVALOS = ['FEF7C02', 'GHE3C06', 'FYY7G32']; 

window.isCavalo = false; 
let urlDocAtual = ""; 
window.frota = {}; 
window.estoqueDiesel = 0; 
window.estoqueArla = 0; 
window.gastoMesGeral = 0;

const pneusCavalo = [ {id:'dd',n:'DD'}, {id:'de',n:'DE'}, {id:'tde',n:'TDE'}, {id:'tdi',n:'TDI'}, {id:'tee',n:'TEE'}, {id:'tei',n:'TEI'}, {id:'tkde',n:'TKDE'}, {id:'tkdi',n:'TKDI'}, {id:'tkee',n:'TKEE'}, {id:'tkei',n:'TKEI'}, {id:'1step',n:'1º STEP'} ];
const pneusCarreta = [ {id:'c1',n:'C1'}, {id:'c2',n:'C2'}, {id:'c3',n:'C3'}, {id:'c4',n:'C4'}, {id:'c5',n:'C5'}, {id:'c6',n:'C6'}, {id:'c7',n:'C7'}, {id:'c8',n:'C8'}, {id:'c9',n:'C9'}, {id:'c10',n:'C10'}, {id:'2step',n:'2º STEP'} ];

// ----------------------------------------------------
// 1. INJEÇÃO DOS PNEUS NO HTML
// ----------------------------------------------------
window.onload = function() {
    let construtorFicha = arr => arr.map(p => `
        <details>
            <summary>${p.n}</summary>
            <div class="pneu-detalhes">
                <div class="linha-info"><span class="info-label" style="margin:0;">Estado:</span> <span class="info-valor" id="estado-${p.id}" style="font-weight:bold;">---</span></div>
                <div class="linha-info"><span class="info-label" style="margin:0;">TWI:</span> <span class="info-valor" id="twi-${p.id}">---</span></div>
                <div class="linha-info" style="margin-top:10px;"><span class="info-label" style="margin:0;">KM Troca:</span> <input type="number" id="km-troca-${p.id}" class="input-editavel travado" value="0" readonly></div>
                <div class="linha-info" style="margin-top:5px;"><span class="info-label" style="margin:0;">Data Troca:</span> <input type="date" id="data-troca-${p.id}" class="input-editavel travado" readonly></div>
                <div class="linha-info" style="margin-top:5px; border-top:1px dashed #ccc; padding-top:5px;"><span class="info-label" style="margin:0;">Próx Rodízio:</span> <span class="info-valor" id="prox-rod-${p.id}">---</span></div>
                <div class="linha-info"><span class="info-label" style="margin:0;">Status Rodízio:</span> <span id="status-rod-${p.id}" style="font-weight:bold;">---</span></div>
            </div>
        </details>
    `).join('');
    
    let ctCavalo = document.getElementById('ficha-pneus-cavalo-container'); 
    if(ctCavalo) ctCavalo.innerHTML = construtorFicha(pneusCavalo);
    
    let ctCarreta = document.getElementById('ficha-pneus-carreta-container'); 
    if(ctCarreta) ctCarreta.innerHTML = construtorFicha(pneusCarreta);

    let construtorChk = arr => arr.map(p => `
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; border-bottom: 1px dashed #ccc; padding-bottom: 5px;">
            <span style="font-weight: bold; width: 50px; color:${arr===pneusCarreta?'#0056b3':'#333'};">${p.n}</span>
            <input type="number" id="chk-twi-${p.id}" placeholder="mm" class="input-campo" style="margin:0; width: 80px; padding: 10px; text-align:center;" oninput="calcularStatusTwi(this, 'badge-estado-${p.id}')">
            <span id="badge-estado-${p.id}" class="twi-estado-badge" style="flex: 1;">Aguardando...</span>
        </div>
    `).join('');
    
    let chkCavalo = document.getElementById('chk-pneus-cavalo-container'); 
    if(chkCavalo) chkCavalo.innerHTML = construtorChk(pneusCavalo);
    
    let chkCarreta = document.getElementById('chk-pneus-carreta-container'); 
    if(chkCarreta) chkCarreta.innerHTML = construtorChk(pneusCarreta);
};

// ----------------------------------------------------
// 2. SISTEMA DE LOGIN E NAVEGAÇÃO BÁSICA
// ----------------------------------------------------
function esconderTodasTelas() {
    document.getElementById('tela-login').style.display = 'none';
    document.getElementById('tela-placas').style.display = 'none';
    document.getElementById('tela-menu').style.display = 'none';
    document.getElementById('tela-interna').style.display = 'none';
}

async function fazerLogin() {
    let u = document.getElementById('campo-usuario').value; 
    let s = document.getElementById('campo-senha').value;
    let msg = document.getElementById('mensagem-erro'); 
    let btn = document.getElementById('btn-login');
    
    if (!u || !s) { msg.innerText = "Preencha usuário e senha!"; msg.style.display = 'block'; return; }
    
    btn.innerText = "Autenticando..."; msg.style.display = 'none';

    try {
        let req1 = await fetch(`${API_URL}?acao=login&usuario=${u}&senha=${s}`);
        let res1 = await req1.json();
        
        if (res1.sucesso) {
            btn.innerText = "Baixando Frota... ⏳";
            let req2 = await fetch(`${API_URL}?acao=buscar_inicial`);
            let res2 = await req2.json();
            
            if (res2.sucesso) {
                window.frota = res2.frota; 
                window.estoqueDiesel = res2.estoque_diesel; 
                window.estoqueArla = res2.estoque_arla; 
                window.gastoMesGeral = res2.gasto_mes_geral;
                
                renderizarHistorico(res2.historico); 
                esconderTodasTelas(); 
                document.getElementById('tela-placas').style.display = 'flex';
            } else { 
                msg.innerText = "Erro: " + res2.erro; msg.style.display = 'block'; 
            }
        } else { 
            msg.innerText = "Credenciais incorretas!"; msg.style.display = 'block'; 
        }
    } catch (e) { 
        msg.innerText = "Sem internet."; msg.style.display = 'block'; 
    }
    btn.innerText = "Entrar";
}

function sairDaConta() { 
    esconderTodasTelas(); 
    document.getElementById('campo-senha').value = ''; 
    document.getElementById('tela-login').style.display = 'flex'; 
}

// ----------------------------------------------------
// 3. SELEÇÃO DA PLACA E PREENCHIMENTO DE DADOS
// ----------------------------------------------------
function selecionarPlaca(placa) {
    let btnMenu = document.querySelectorAll('#tela-menu .btn-principal');
    try {
        let dados = window.frota[placa];
        if (!dados) return alert("Veículo não encontrado na base de dados!");
        
        document.getElementById('texto-placa-escolhida').innerText = placa; 
        document.getElementById('texto-placa-interna').innerText = placa; 
        
        window.isCavalo = CAVALOS.includes(placa);
        document.querySelectorAll('.is-carreta').forEach(el => {
            el.style.display = window.isCavalo ? 'block' : 'none';
        });

        let elTipo = document.getElementById('tipo-veiculo'); if(elTipo) elTipo.value = dados.tipo || "";
        let elMotorista = document.getElementById('nome-motorista'); if(elMotorista) elMotorista.value = dados.motorista || "";

        let elKm = document.getElementById('km-master'); if(elKm) elKm.value = dados.km_atual || 0;
        let kTroca = 15000; 
        if (dados.km_oleo) kTroca = parseInt(String(dados.km_oleo).replace(/\./g, '')) || 15000;
        
        let elO = document.getElementById('km-proxima-troca'); if(elO) elO.value = kTroca;
        let elT = document.getElementById('data-proxima-afericao'); if(elT) elT.value = dados.data_tacografo || "";
        let elG = document.getElementById('data-engraxada'); if(elG) elG.value = dados.data_graxa || "";
        let elCar = document.getElementById('qtd-carrinhos'); if(elCar) elCar.value = dados.qtd_carrinhos || 0;
        let elCon = document.getElementById('qtd-cones'); if(elCon) elCon.value = dados.qtd_cones || 0;
        
        urlDocAtual = dados.link_documento || "";

        if (dados.pneus) {
            let todosIds = ['dd','de','tde','tdi','tee','tei','tkde','tkdi','tkee','tkei','1step','c1','c2','c3','c4','c5','c6','c7','c8','c9','c10','2step'];
            todosIds.forEach(pos => {
                let pneu = dados.pneus[pos] || {};
                let elEstado = document.getElementById(`estado-${pos}`);
                let elTwi = document.getElementById(`twi-${pos}`);
                let elKmTroca = document.getElementById(`km-troca-${pos}`);
                let elDataTroca = document.getElementById(`data-troca-${pos}`);
                
                if(elEstado) elEstado.innerText = pneu.estado || "---";
                if(elTwi) elTwi.innerText = pneu.milimetros ? pneu.milimetros + " mm" : "---";
                if(elKmTroca) elKmTroca.value = pneu.km_ultima_troca || 0;
                if(elDataTroca) elDataTroca.value = pneu.data_ultima_troca || "";
            });
        }

        let iL = document.getElementById('ficha-img-lat'); let pL = document.getElementById('ficha-pl-lat');
        if (iL && pL) { 
            if (dados.foto_lateral) { iL.src = dados.foto_lateral; iL.style.display = 'block'; pL.style.display = 'none'; } 
            else { iL.style.display = 'none'; pL.style.display = 'flex'; } 
        }
        
        let iT = document.getElementById('ficha-img-tras'); let pT = document.getElementById('ficha-pl-tras');
        if (iT && pT) { 
            if (dados.foto_traseira) { iT.src = dados.foto_traseira; iT.style.display = 'block'; pT.style.display = 'none'; } 
            else { iT.style.display = 'none'; pT.style.display = 'flex'; } 
        }

        let aK = document.getElementById('aviso-ultimo-km'); if(aK) aK.innerText = dados.km_atual || 0;
        let aG = document.getElementById('abast-gasto-mes'); if(aG) aG.innerText = (dados.gasto_mes || 0) + " L";

        atualizarKMGeral(); 
        calcularTacografo(); 
        calcularGraxa();
        
        esconderTodasTelas(); 
        document.getElementById('tela-menu').style.display = 'flex';
    } catch(err) { 
        alert("Erro visual: " + err.message); 
    } finally { 
        btnMenu.forEach(btn => { btn.disabled = false; btn.style.opacity = '1'; btn.style.cursor = 'pointer'; }); 
    }
}

function voltarParaPlacas() { esconderTodasTelas(); document.getElementById('tela-placas').style.display = 'flex'; }

// CORREÇÃO: Função de navegação simples e segura
function abrirPagina(nomeDaPagina) {
    if(nomeDaPagina === 'Abastecimento') {
        preencherDataHoraAbast();
    }
    
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

function voltarParaMenu() { esconderTodasTelas(); document.getElementById('tela-menu').style.display = 'flex'; }

// ----------------------------------------------------
// 4. EDIÇÃO E CÁLCULOS DA FICHA TÉCNICA
// ----------------------------------------------------
function salvarFichaNaNuvemBackground() {
    let payload = {
        acao: "salvar_ficha_tecnica",
        placa: document.getElementById('texto-placa-interna').innerText,
        tipo: document.getElementById('tipo-veiculo').value,          
        motorista: document.getElementById('nome-motorista').value,   
        km_atual: document.getElementById('km-master').value,
        km_oleo: document.getElementById('km-proxima-troca').value,
        data_tacografo: document.getElementById('data-proxima-afericao').value,
        data_graxa: document.getElementById('data-engraxada').value,
        qtd_carrinhos: document.getElementById('qtd-carrinhos').value,
        qtd_cones: document.getElementById('qtd-cones').value,
        pneus: {}
    };
    
    let tIds = ['dd','de','tde','tdi','tee','tei','tkde','tkdi','tkee','tkei','1step','c1','c2','c3','c4','c5','c6','c7','c8','c9','c10','2step'];
    tIds.forEach(id => { 
        let km = document.getElementById('km-troca-'+id); 
        let dt = document.getElementById('data-troca-'+id); 
        if(km && dt) { payload.pneus[id] = { km_ultima_troca: km.value, data_ultima_troca: dt.value }; } 
    });

    fetch(API_URL, { method: 'POST', body: JSON.stringify(payload) })
    .then(res => res.json())
    .then(d => {
        if(d.sucesso) {
            window.frota[payload.placa].tipo = payload.tipo; 
            window.frota[payload.placa].motorista = payload.motorista; 
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
            let elAv = document.getElementById('aviso-ultimo-km'); if(elAv) elAv.innerText = payload.km_atual;
        }
    });
}

function atualizarKMGeral() { 
    document.getElementById('km-atual-oleo').innerText = document.getElementById('km-master').value; 
    calcularOleo(); 
    calcularRodizioPneus(); 
}

function alternarEdicaoHeader() { 
    let c = [document.getElementById('tipo-veiculo'), document.getElementById('nome-motorista'), document.getElementById('km-master')]; 
    let b = document.getElementById('btn-editar-header'); 
    
    if (c[0].hasAttribute('readonly')) { 
        c.forEach(x => { x.removeAttribute('readonly'); x.classList.remove('travado'); }); 
        b.innerHTML = "💾 Salvar"; b.style.backgroundColor = "#1a4d2e"; b.style.color = "white"; c[0].focus(); 
    } else { 
        c.forEach(x => { x.setAttribute('readonly', 'true'); x.classList.add('travado'); }); 
        b.innerHTML = "✏️ Editar"; b.style.backgroundColor = "transparent"; b.style.color = "#1a4d2e"; 
        atualizarKMGeral(); 
        salvarFichaNaNuvemBackground(); 
    } 
}

function alternarEdicaoOleo() { 
    let c = document.getElementById('km-proxima-troca'); 
    let b = document.getElementById('btn-editar-oleo'); 
    
    if (c.hasAttribute('readonly')) { 
        c.removeAttribute('readonly'); c.classList.remove('travado'); 
        b.innerHTML = "💾 Salvar"; b.style.backgroundColor = "#1a4d2e"; b.style.color = "white"; 
    } else { 
        c.setAttribute('readonly', 'true'); c.classList.add('travado'); 
        b.innerHTML = "✏️ Editar"; b.style.backgroundColor = "transparent"; b.style.color = "#1a4d2e"; 
        calcularOleo(); 
        salvarFichaNaNuvemBackground(); 
    } 
}

function calcularOleo() { 
    let kmA = parseInt(document.getElementById('km-master').value) || 0; 
    let kmP = parseInt(document.getElementById('km-proxima-troca').value) || 0; 
    let kmF = kmP - kmA; 
    let txt = document.getElementById('status-oleo'); 
    
    if (kmF <= 0) { 
        txt.innerHTML = `VENCIDO (${Math.abs(kmF)} KM) ❌`; txt.style.color = "red"; 
    } else if (kmF <= 1500) { 
        txt.innerHTML = `Faltam ${kmF} KM ⚠️`; txt.style.color = "#d4a017"; 
    } else { 
        txt.innerHTML = `Faltam ${kmF} KM ✅`; txt.style.color = "green"; 
    } 
}

function alternarEdicaoTacografo() { 
    let c = document.getElementById('data-proxima-afericao'); 
    let b = document.getElementById('btn-editar-tacografo'); 
    
    if (c.hasAttribute('readonly')) { 
        c.removeAttribute('readonly'); c.classList.remove('travado'); 
        b.innerHTML = "💾 Salvar"; b.style.backgroundColor = "#1a4d2e"; b.style.color = "white"; 
    } else { 
        c.setAttribute('readonly', 'true'); c.classList.add('travado'); 
        b.innerHTML = "✏️ Editar"; b.style.backgroundColor = "transparent"; b.style.color = "#1a4d2e"; 
        calcularTacografo(); 
        salvarFichaNaNuvemBackground(); 
    } 
}

function calcularTacografo() { 
    let s = document.getElementById('data-proxima-afericao').value; 
    let t = document.getElementById('status-tacografo'); 
    
    if (!s || s.length < 8 || !s.includes('-')) { 
        if(t) t.innerHTML = "---"; 
        let dU = document.getElementById('data-ultima-afericao'); 
        if(dU) dU.innerText = "--/--/----"; 
        return; 
    } 
    
    let p = s.split('-'); 
    let px = new Date(p[0], p[1] - 1, p[2]); 
    let ul = new Date(px); 
    ul.setFullYear(ul.getFullYear() - 2); 
    
    document.getElementById('data-ultima-afericao').innerText = `${String(ul.getDate()).padStart(2,'0')}/${String(ul.getMonth()+1).padStart(2,'0')}/${ul.getFullYear()}`; 
    
    let hj = new Date(); 
    hj.setHours(0,0,0,0); 
    
    let d = Math.ceil((px.getTime() - hj.getTime()) / (1000 * 3600 * 24)); 
    
    if (d < 0) { 
        t.innerHTML = `VENCIDO há ${Math.abs(d)} dias ❌`; t.style.color = "red"; 
    } else if (d <= 30) { 
        t.innerHTML = `Atenção: Faltam ${d} dias ⚠️`; t.style.color = "#d4a017"; 
    } else { 
        t.innerHTML = `Faltam ${d} dias ✅`; t.style.color = "green"; 
    } 
}

function alternarEdicaoPneus() { 
    let i = document.querySelectorAll('#conteudo-Ficha\\ Técnica input[id^="km-troca-"], #conteudo-Ficha\\ Técnica input[id^="data-troca-"]'); 
    let b = document.getElementById('btn-editar-pneus'); 
    
    if (i[0].hasAttribute('readonly')) { 
        i.forEach(c => { c.removeAttribute('readonly'); c.classList.remove('travado'); }); 
        b.innerHTML = "💾 Salvar Pneus"; b.style.backgroundColor = "#1a4d2e"; b.style.color = "white"; 
    } else { 
        i.forEach(c => { c.setAttribute('readonly', 'true'); c.classList.add('travado'); }); 
        b.innerHTML = "✏️ Editar Pneus"; b.style.backgroundColor = "transparent"; b.style.color = "#1a4d2e"; 
        calcularRodizioPneus(); 
        salvarFichaNaNuvemBackground(); 
    } 
}

function calcularRodizioPneus() { 
    let pl = document.getElementById('texto-placa-interna').innerText; 
    let kmM = parseInt(document.getElementById('km-master').value) || 0; 
    let bN = ['FMR4I10', 'FQY6B30', 'TKR8I49', 'TLL8H30', 'TLY0G57', 'UDN0J81', 'UPS1J80', 'UPX9D25', 'URT4E79', 'URU3F36'].includes(pl) ? 10000 : 15000; 
    let bR = ['FMR4I10', 'FQY6B30', 'TKR8I49', 'TLL8H30', 'TLY0G57', 'UDN0J81', 'UPS1J80', 'UPX9D25', 'URT4E79', 'URU3F36'].includes(pl) ? 25000 : 30000; 
    let tIds = ['dd','de','tde','tdi','tee','tei','tkde','tkdi','tkee','tkei','1step','c1','c2','c3','c4','c5','c6','c7','c8','c9','c10','2step']; 
    
    tIds.forEach(p => { 
        let sE = document.getElementById(`estado-${p}`); 
        let tS = document.getElementById(`status-rod-${p}`); 
        let iK = document.getElementById(`km-troca-${p}`); 
        
        if(!sE || !tS || !iK) return; 
        
        let eS = sE.innerText.toLowerCase(); 
        let kT = parseInt(iK.value) || 0; 
        
        if (eS === "---" || kT === 0) { 
            tS.innerText = "Aguardando..."; tS.style.color = "gray"; return; 
        } 
        
        let int = eS.includes('novo') ? bN : bR; 
        let kPR = kT + int; 
        let ePR = document.getElementById(`prox-rod-${p}`); 
        if(ePR) ePR.innerText = kPR + " KM"; 
        
        let kF = kPR - kmM; 
        if (kF <= 0) { 
            tS.innerHTML = `VENCIDO (${Math.abs(kF)} KM) ❌`; tS.style.color = "red"; 
        } else if (kF <= 1500) { 
            tS.innerHTML = `Faltam ${kF} KM ⚠️`; tS.style.color = "#d4a017"; 
        } else { 
            tS.innerHTML = `Faltam ${kF} KM ✅`; tS.style.color = "green"; 
        } 
    }); 
}

function alternarEdicaoEquip() { 
    let c = [document.getElementById('qtd-carrinhos'), document.getElementById('qtd-cones')]; 
    let b = document.getElementById('btn-editar-equip'); 
    
    if (c[0].hasAttribute('readonly')) { 
        c.forEach(x => { x.removeAttribute('readonly'); x.classList.remove('travado'); }); 
        b.innerHTML = "💾 Salvar"; b.style.backgroundColor = "#1a4d2e"; b.style.color = "white"; 
    } else { 
        c.forEach(x => { x.setAttribute('readonly', 'true'); x.classList.add('travado'); }); 
        b.innerHTML = "✏️ Editar"; b.style.backgroundColor = "transparent"; b.style.color = "#1a4d2e"; 
        salvarFichaNaNuvemBackground(); 
    } 
}

function alternarEdicaoAbast() { 
    let c = [document.getElementById('abast-km-ant'), document.getElementById('abast-km-atual'), document.getElementById('abast-litros'), document.getElementById('data-engraxada')]; 
    let b = document.getElementById('btn-editar-abast'); 
    
    if (c[0].hasAttribute('readonly')) { 
        c.forEach(x => { x.removeAttribute('readonly'); x.classList.remove('travado'); }); 
        b.innerHTML = "💾 Salvar"; b.style.backgroundColor = "#1a4d2e"; b.style.color = "white"; 
    } else { 
        c.forEach(x => { x.setAttribute('readonly', 'true'); x.classList.add('travado'); }); 
        b.innerHTML = "✏️ Editar"; b.style.backgroundColor = "transparent"; b.style.color = "#1a4d2e"; 
        calcularAbastecimento(); 
        calcularGraxa(); 
        salvarFichaNaNuvemBackground(); 
    } 
}

function calcularAbastecimento() { 
    let kA = parseFloat(document.getElementById('abast-km-ant').value) || 0; 
    let kU = parseFloat(document.getElementById('abast-km-atual').value) || 0; 
    let l = parseFloat(document.getElementById('abast-litros').value) || 0; 
    let t = document.getElementById('abast-media'); 
    if (l > 0 && kU > kA) t.innerText = ((kU - kA) / l).toFixed(2) + " km/L"; 
    else t.innerText = "0.00 km/L"; 
}

function calcularGraxa() { 
    let s = document.getElementById('data-engraxada').value; 
    let t = document.getElementById('status-graxa'); 
    
    if (!s || s.length < 8) { 
        if(t) t.innerHTML = "---"; 
        document.getElementById('data-prox-engraxada').innerText = "--/--/----"; 
        return; 
    } 
    
    let p = s.split('-'); 
    let ultima = new Date(p[0], p[1] - 1, p[2]); 
    let proxima = new Date(ultima); 
    proxima.setDate(proxima.getDate() + 30); 
    
    document.getElementById('data-prox-engraxada').innerText = `${String(proxima.getDate()).padStart(2,'0')}/${String(proxima.getMonth()+1).padStart(2,'0')}/${proxima.getFullYear()}`; 
    
    let h = new Date(); 
    h.setHours(0,0,0,0); 
    
    let d = Math.ceil((proxima.getTime() - h.getTime()) / (1000 * 3600 * 24)); 
    
    if (d < 0) { 
        t.innerHTML = `VENCIDO há ${Math.abs(d)} dias ❌`; t.style.color = "red"; 
    } else if (d <= 5) { 
        t.innerHTML = `Atenção: Faltam ${d} dias ⚠️`; t.style.color = "#d4a017"; 
    } else { 
        t.innerHTML = `Faltam ${d} dias ✅`; t.style.color = "green"; 
    } 
}

function abrirDocPDF() { 
    if (urlDocAtual && urlDocAtual.trim() !== "") window.open(urlDocAtual, '_blank'); 
    else alert("Nenhum documento cadastrado para este veículo."); 
}

// ----------------------------------------------------
// 5. ABASTECIMENTO (Estoque)
// ----------------------------------------------------
function mudarFormAbast() { 
    let t = document.getElementById('tipo-abast').value; 
    if (t.includes("CHEGADA")) { 
        document.getElementById('form-abast-veiculo').style.display = 'none'; 
        document.getElementById('form-abast-chegada').style.display = 'block'; 
    } else { 
        document.getElementById('form-abast-veiculo').style.display = 'block'; 
        document.getElementById('form-abast-chegada').style.display = 'none'; 
    } 
}

function preencherDataHoraAbast() { 
    let n = new Date(); 
    let hL = new Date(n.getTime() - (n.getTimezoneOffset() * 60000)).toISOString().slice(0,16); 
    let eA = document.getElementById('abast-data'); if(eA) eA.value = hL; 
    let eC = document.getElementById('chegada-data'); if(eC) eC.value = hL; 
    
    document.getElementById('estoque-diesel-geral').innerText = window.estoqueDiesel + " L"; 
    document.getElementById('estoque-arla-geral').innerText = window.estoqueArla + " L"; 
    document.getElementById('gasto-mes-geral').innerText = window.gastoMesGeral + " L"; 
}

async function salvarAbastecimentoNuvem() {
    let t = document.getElementById('tipo-abast').value; 
    let pl = document.getElementById('texto-placa-interna').innerText;
    let p = { acao: "salvar_abastecimento", tipo: t, placa: t.includes("CHEGADA") ? "ESTOQUE" : pl };
    
    if (t.includes("CHEGADA")) {
        p.data = document.getElementById('chegada-data').value; 
        p.litros = parseFloat(document.getElementById('chegada-litros').value) || 0; 
        p.nf = document.getElementById('chegada-nf').value; 
        p.km = ""; p.motorista = ""; p.responsavel = "";
        
        if (!p.data || !p.litros || !p.nf) return alert("❌ Preencha Data, Litros e NF!");
    } else {
        p.data = document.getElementById('abast-data').value; 
        p.km = parseFloat(document.getElementById('abast-km-novo').value) || 0; 
        p.litros = parseFloat(document.getElementById('abast-litros-bomba').value) || 0; 
        p.motorista = document.getElementById('abast-motorista').value; 
        p.responsavel = document.getElementById('abast-resp').value; 
        p.nf = "";
        
        let kU = parseFloat(document.getElementById('aviso-ultimo-km').innerText) || 0;
        
        if (!p.data || !p.km || !p.litros || !p.motorista || !p.responsavel) return alert("❌ Preencha todos os campos do Abastecimento!");
        if (p.km < kU) return alert(`❌ O KM digitado (${p.km}) não pode ser MENOR que o último (${kU})!`);
    }
    
    let b = document.getElementById('btn-salvar-abast-nuvem'); 
    b.innerText = "Salvando... ⏳"; b.disabled = true;
    
    try {
        let req = await fetch(API_URL, { method: 'POST', body: JSON.stringify(p) }); 
        let res = await req.json();
        
        if (res.sucesso) {
            alert("✅ Salvo com sucesso!"); 
            document.getElementById('abast-km-novo').value = ""; 
            document.getElementById('abast-litros-bomba').value = ""; 
            document.getElementById('chegada-litros').value = ""; 
            document.getElementById('chegada-nf').value = "";
            
            if (!t.includes("CHEGADA")) {
                window.frota[pl].km_atual = p.km; 
                document.getElementById('km-master').value = p.km; 
                document.getElementById('aviso-ultimo-km').innerText = p.km; 
                atualizarKMGeral(); 
                
                if(t === "DIESEL") { 
                    window.frota[pl].gasto_mes = (window.frota[pl].gasto_mes || 0) + p.litros; 
                    document.getElementById('abast-gasto-mes').innerText = window.frota[pl].gasto_mes + " L"; 
                    window.estoqueDiesel -= p.litros; 
                    window.gastoMesGeral += p.litros; 
                }
                if(t === "ARLA") window.estoqueArla -= p.litros;
            } else { 
                if(t === "CHEGADA DE DIESEL") window.estoqueDiesel += p.litros; 
                if(t === "CHEGADA DE ARLA") window.estoqueArla += p.litros; 
            }
            preencherDataHoraAbast(); 
        } else { alert("❌ Erro: " + res.erro); }
    } catch (e) { alert("❌ Erro de conexão."); }
    
    b.innerText = "💾 Salvar Lançamento"; b.disabled = false;
}

// ----------------------------------------------------
// 6. CHECKLIST E PROCESSAMENTO DE FOTOS
// ----------------------------------------------------
let b64Lateral = ""; 
let b64Traseira = "";

function processarFoto(input, idPreview) {
    if (!input.files || !input.files[0]) return; 
    const r = new FileReader();
    r.onload = function(e) {
        const img = new Image(); 
        img.src = e.target.result;
        img.onload = function() {
            const cv = document.createElement('canvas'); 
            const MW = 800; 
            let w = img.width; let h = img.height;
            if (w > MW) { h = Math.round((h * MW) / w); w = MW; } 
            cv.width = w; cv.height = h;
            
            const cx = cv.getContext('2d'); 
            cx.drawImage(img, 0, 0, w, h);
            
            const dU = cv.toDataURL('image/jpeg', 0.6); 
            if(idPreview === 'preview-lat') b64Lateral = dU; 
            if(idPreview === 'preview-tras') b64Traseira = dU;
            
            let pr = document.getElementById(idPreview); 
            pr.src = dU; pr.style.display = 'block';
        }
    }; 
    r.readAsDataURL(input.files[0]);
}

function renderizarHistorico(d) { 
    let c = document.getElementById('container-historico'); 
    c.innerHTML = ""; 
    if (!d || d.length === 0) { c.innerHTML = "<p style='text-align:center; color:#666;'>Nenhum checklist registrado ainda.</p>"; return; } 
    d.forEach(i => { 
        let v = document.createElement('div'); v.className = "historico-item"; 
        v.innerHTML = `<span style="font-weight: bold; color: #1a4d2e;">${i.placa}</span> <span style="color: #555; font-size: 12px;">${String(i.data).split('T')[0]} ✅</span>`; 
        c.appendChild(v); 
    }); 
}

function iniciarNovoChecklist() { 
    let pl = document.getElementById('texto-placa-interna').innerText; 
    document.getElementById('lista-historico-checklist').style.display = 'none'; 
    document.getElementById('form-novo-checklist').style.display = 'block'; 
    
    // Zera opções
    document.querySelectorAll('input[type="checkbox"]').forEach(c => c.checked = false); 
    document.querySelectorAll('input[id$="-outro"]').forEach(c => { c.value = ""; c.style.display = 'none'; }); 
    document.querySelectorAll('input[id^="chk-twi-"]').forEach(i => i.value = ""); 
    document.querySelectorAll('.twi-estado-badge').forEach(b => { b.innerText = "Aguardando..."; b.style.backgroundColor = "#eee"; b.style.color = "#666"; }); 
    
    // Zera Fotos
    b64Lateral = ""; b64Traseira = ""; 
    let lI = document.getElementById('foto-lat-input'); if(lI) lI.value = ""; 
    let tI = document.getElementById('foto-tras-input'); if(tI) tI.value = ""; 
    let pL = document.getElementById('preview-lat'); if(pL) pL.style.display = "none"; 
    let pT = document.getElementById('preview-tras'); if(pT) pT.style.display = "none"; 
    
    // Controla se o mês pede foto
    let mA = new Date().toISOString().slice(0, 7); 
    let ve = window.frota[pl]; 
    let cF = document.getElementById('container-inputs-fotos'); 
    let aF = document.getElementById('aviso-fotos-ok'); 
    if(cF && aF) { 
        if (ve && ve.mes_foto === mA) { cF.style.display = 'none'; aF.style.display = 'block'; } 
        else { cF.style.display = 'block'; aF.style.display = 'none'; } 
    } 
    
    // Puxa dados pro form
    document.getElementById('chk-placa').value = pl; 
    document.getElementById('chk-modelo').value = document.getElementById('tipo-veiculo').value; 
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

function mudarAbaChecklist(ps) { 
    for(let i=1; i<=4; i++) { 
        let pt = document.getElementById('passo-chk-'+i); if(pt) pt.style.display = 'none'; 
        let tb = document.getElementById('tab-chk-'+i); if(tb) tb.classList.remove('ativo'); 
    } 
    let pA = document.getElementById('passo-chk-'+ps); if(pA) pA.style.display = 'block'; 
    let tA = document.getElementById('tab-chk-'+ps); if(tA) tA.classList.add('ativo'); 
}

// ----------------------------------------------------
// 7. VALIDAÇÃO DO CHECKLIST (OBRIGATÓRIO)
// ----------------------------------------------------
function avancarPasso(px) {
    let pA = px - 1; 
    
    if (pA === 1) { 
        if(window.isCavalo && !document.getElementById('chk-placa-carreta').value) return alert("❌ Como você está com um CAVALO, selecione a Placa da Carreta!"); 
        if(!document.getElementById('chk-modelo').value) return alert("❌ Digite o Modelo!"); 
        if(!document.getElementById('chk-motorista').value) return alert("❌ Digite o Motorista!"); 
        if(!document.getElementById('chk-km').value) return alert("❌ Digite o KM Atual!"); 
    }
    if (pA === 2) { 
        let gM = ['chk-motor', 'chk-cambio', 'chk-embreagem', 'chk-direcao', 'chk-freios', 'chk-suspensao']; 
        for (let g of gM) { 
            if (document.querySelectorAll(`input[name="${g}"]:checked`).length === 0) return alert(`❌ Você esqueceu de preencher uma das sessões de Mecânica!`); 
        } 
        if (window.isCavalo) { 
            if (!document.getElementById('chk-asa').value) return alert("❌ Responda Asa Delta!"); 
            if (!document.getElementById('chk-freio-lona').value) return alert("❌ Responda Freio Lona!"); 
            if (!document.getElementById('chk-faixas').value) return alert("❌ Responda Faixas Refletivas!"); 
        } 
    }
    if (pA === 3) { 
        let gE = ['chk-pneus_geral', 'chk-eletrica', 'chk-indicadores', 'chk-cabine']; 
        for (let g of gE) { 
            if (document.querySelectorAll(`input[name="${g}"]:checked`).length === 0) return alert(`❌ Você esqueceu de preencher uma das sessões de Cabine/Elétrica!`); 
        } 
    }
    mudarAbaChecklist(px);
}

function verificarOutro(ck, idC) { let cp = document.getElementById(idC); if (ck.value === "OUTRO" && ck.checked) { cp.style.display = 'block'; cp.focus(); } else if (ck.value === "OUTRO" && !ck.checked) { cp.style.display = 'none'; cp.value = ''; } }
function verificarOutroSelect(sl, idC) { let cp = document.getElementById(idC); if(sl.value === "OUTRO") { cp.style.display = 'block'; cp.focus(); } else { cp.style.display = 'none'; cp.value = ''; } }
function verificarTudoOk(ck, nG) { if (ck.checked && ck.value.includes("NÃO APRESENTA")) { document.querySelectorAll(`input[name="${nG}"]`).forEach(c => { if (c !== ck) c.checked = false; }); let tO = document.getElementById(nG + "-outro"); if(tO) { tO.style.display = 'none'; tO.value = ''; } } else if (ck.checked) { document.querySelectorAll(`input[name="${nG}"]`).forEach(c => { if (c.value.includes("NÃO APRESENTA")) c.checked = false; }); } }
function calcularStatusTwi(inE, bId) { let b = document.getElementById(bId); let v = parseFloat(inE.value); if (isNaN(v)) { b.innerText = "Aguardando..."; b.style.backgroundColor = "#eee"; b.style.color = "#666"; return; } if (v >= 10) { b.innerText = "Pneu Novo"; b.style.backgroundColor = "#d4edda"; b.style.color = "#155724"; } else if (v >= 5) { b.innerText = "Meia-Vida"; b.style.backgroundColor = "#fff3cd"; b.style.color = "#856404"; } else { b.innerText = "No Limite"; b.style.backgroundColor = "#f8d7da"; b.style.color = "#721c24"; } }
function pegarMarcados(nG, idO) { let s = []; document.querySelectorAll(`input[name="${nG}"]:checked`).forEach(c => { if(c.value !== "OUTRO") s.push(c.value); }); let tO = document.getElementById(idO); if (tO && tO.value.trim() !== "") s.push("OUTROS: " + tO.value.trim()); return s.length > 0 ? s.join(" | ") : "Não avaliado"; }
function getSelOuOutro(idO) { let i = document.getElementById(idO); if(!i) return ""; let s = i.previousElementSibling; return s.value === "OUTRO" ? (i.value || "Outro não esp.") : s.value; }

// ----------------------------------------------------
// 8. ENVIO PARA NUVEM E GERAÇÃO DE PDF
// ----------------------------------------------------
async function enviarChecklist() {
    if (document.querySelectorAll(`input[name="chk-faltantes"]:checked`).length === 0) return alert("❌ Informe os Itens Faltantes!");
    if (!document.getElementById('chk-extintor-data').value) return alert("❌ Informe a Data de Validade do Extintor!");

    let bP = ['dd', 'de', 'tde', 'tdi', 'tee', 'tei', 'tkde', 'tkdi', 'tkee', 'tkei', '1step'];
    for (let id of bP) { if (!document.getElementById('chk-twi-' + id).value) return alert(`❌ Preencha o TWI do Pneu ${id.toUpperCase()} do Cavalo/Caminhão!`); }

    if (window.isCavalo) {
        let cP = ['c1','c2','c3','c4','c5','c6','c7','c8','c9','c10','2step'];
        for (let id of cP) { if (!document.getElementById('chk-twi-' + id).value) return alert(`❌ Preencha o TWI do Pneu ${id.toUpperCase()} da Carreta!`); }
    }

    if (!window.isCavalo && document.getElementById('container-inputs-fotos') && document.getElementById('container-inputs-fotos').style.display !== 'none') {
        if (!b64Lateral || !b64Traseira) return alert("❌ É obrigatório enviar a Foto Lateral e Traseira do caminhão!");
    }

    let btn = document.getElementById('btn-enviar-chk'); btn.innerText = "Salvando e Gerando PDF... ⏳"; btn.disabled = true;

    let dE = document.getElementById('chk-extintor-data').value; let pE = document.getElementById('chk-extintor-pressao').value;
    let tE = `Val: ${dE} - ${pE}`;

    let pl = {
        acao: "salvar_checklist", 
        placa: document.getElementById('chk-placa').value, 
        placa_carreta: window.isCavalo ? document.getElementById('chk-placa-carreta').value : "", 
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
        chk_asa_delta: window.isCavalo ? getSelOuOutro('chk-asa-outro') : "", 
        chk_freio_lona: window.isCavalo ? getSelOuOutro('chk-freio-lona-outro') : "", 
        chk_faixas: window.isCavalo ? getSelOuOutro('chk-faixas-outro') : "", 
        chk_extintores: tE, 
        chk_parada: document.getElementById('chk-parada').value, 
        chk_obs: document.getElementById('chk-obs').value, 
        foto_lateral_b64: b64Lateral, 
        foto_traseira_b64: b64Traseira, 
        pneus: {}
    };

    let tIds = ['dd','de','tde','tdi','tee','tei','tkde','tkdi','tkee','tkei','1step','c1','c2','c3','c4','c5','c6','c7','c8','c9','c10','2step'];
    tIds.forEach(id => { 
        let eT = document.getElementById('chk-twi-' + id); 
        if(eT && eT.value) { pl.pneus[id] = { milimetros: eT.value, estado: document.getElementById('badge-estado-' + id).innerText }; } 
    });

    try {
        let r = await fetch(API_URL, { method: 'POST', body: JSON.stringify(pl) }); 
        let d = await r.json();
        
        if (d.sucesso) {
            alert("✅ Sucesso! O PDF com o Checklist e a Assinatura já está salvo na pasta da Frota.");
            
            window.frota[pl.placa].km_atual = pl.km_atual; 
            window.frota[pl.placa].km_oleo = pl.km_oleo;
            if(d.mesAtual) window.frota[pl.placa].mes_foto = d.mesAtual; 
            if(d.linkLat) window.frota[pl.placa].foto_lateral = d.linkLat; 
            if(d.linkTras) window.frota[pl.placa].foto_traseira = d.linkTras;
            
            for(let i in pl.pneus) { 
                if(!window.frota[pl.placa].pneus[i]) window.frota[pl.placa].pneus[i] = {}; 
                window.frota[pl.placa].pneus[i].milimetros = pl.pneus[i].milimetros; 
                window.frota[pl.placa].pneus[i].estado = pl.pneus[i].estado; 
            }
            
            let hS = new Date().toISOString(); 
            cancelarChecklist(); 
            selecionarPlaca(pl.placa); 
            
            let dH = document.createElement('div'); dH.className = "historico-item"; 
            dH.innerHTML = `<span style="font-weight: bold; color: #1a4d2e;">${pl.placa}</span> <span style="color: #555; font-size: 12px;">${hS.split('T')[0]} ✅</span>`;
            document.getElementById('container-historico').prepend(dH);
        } else { alert("❌ Erro ao salvar: " + d.erro); }
    } catch (e) { alert("❌ Falha na conexão com o Google."); }

    btn.innerText = "💾 Enviar Checklist e Gerar PDF"; btn.disabled = false;
}
