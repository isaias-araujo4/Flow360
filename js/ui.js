/* =========================================================
   Flow360 — ui.js
   Componentes reutilizados em todas as telas:
   ícones, modal, avisos, confirmação, toast, tabela,
   seleção múltipla, máscaras e download de arquivos.
   ========================================================= */

const UI = {};

/* ---------- Atalhos ---------- */
UI.$ = (seletor, base) => (base || document).querySelector(seletor);
UI.$$ = (seletor, base) => Array.from((base || document).querySelectorAll(seletor));

// Lê um parâmetro da URL. Ex.: documento.html?id=3 → UI.param('id') = "3"
UI.param = nome => new URLSearchParams(location.search).get(nome);

// Escapa texto antes de colocar em innerHTML (evita injeção de HTML)
UI.esc = valor => String(valor === null || valor === undefined ? '' : valor)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

/* ---------- Ícones (SVG desenhados à mão) ---------- */
const svg = conteudo => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + conteudo + '</svg>';

UI.icones = {
  casa: svg('<path d="M3 11l9-7 9 7"/><path d="M5 10v10h5v-6h4v6h5V10"/>'),
  grafico: svg('<rect x="3" y="10" width="4" height="10"/><rect x="10" y="4" width="4" height="16"/><rect x="17" y="8" width="4" height="12"/>'),
  mais: svg('<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>'),
  documento: svg('<path d="M14 3H6v18h12V7z"/><path d="M14 3v4h4M9 12h6M9 16h6"/>'),
  alerta: svg('<path d="M12 3L2 20h20z"/><path d="M12 10v4M12 17v.5"/>'),
  relatorio: svg('<rect x="4" y="3" width="16" height="18" rx="1"/><path d="M8 3v18M11 8h6M11 12h6"/>'),
  relogio: svg('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
  usuarioMais: svg('<circle cx="10" cy="8" r="4"/><path d="M3 20c0-4 3-6 7-6s7 2 7 6M19 8v6M16 11h6"/>'),
  usuario: svg('<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.5 3.5-7 8-7s8 2.5 8 7"/>'),
  sino: svg('<path d="M6 16V11a6 6 0 0112 0v5l2 2H4z"/><path d="M10 20a2 2 0 004 0"/>'),
  engrenagem: svg('<circle cx="12" cy="12" r="3"/><path d="M12 2l1.8 2.6 3.1-.7.6 3.1 2.8 1.5-1.3 2.9 1.3 2.9-2.8 1.5-.6 3.1-3.1-.7L12 22l-1.8-2.6-3.1.7-.6-3.1L3.7 15.5 5 12.6 3.7 9.7l2.8-1.5.6-3.1 3.1.7z"/>'),
  menu: svg('<path d="M4 7h16M4 12h16M4 17h16"/>'),
  fechar: svg('<path d="M6 6l12 12M18 6L6 18"/>'),
  setas: svg('<path d="M6 7l5 5-5 5M13 7l5 5-5 5"/>'),
  check: svg('<path d="M5 12l5 5 9-10"/>'),
  x: svg('<path d="M6 6l12 12M18 6L6 18"/>'),
  info: svg('<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>'),
  enviar: svg('<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v4h16v-4"/>'),
  download: svg('<path d="M12 4v12M7 11l5 5 5-5"/><path d="M4 18v2h16v-2"/>'),
  impressora: svg('<path d="M7 9V3h10v6"/><rect x="3" y="9" width="18" height="8" rx="1"/><path d="M7 14h10v7H7z"/>'),
  olho: svg('<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'),
  sair: svg('<path d="M9 4H4v16h5M16 8l4 4-4 4M20 12H9"/>'),
  carregando: svg('<path d="M12 3a9 9 0 109 9"><animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.9s" repeatCount="indefinite"/></path>')
};

/* ---------- Modal ---------- */
// Abre uma janela por cima da tela.
// opcoes: { titulo, corpo (HTML), botoes: [{ texto, classe, acao(modal) }], largo, aoFechar }
UI.modal = function (opcoes) {
  const fundo = document.createElement('div');
  fundo.className = 'modal-fundo';
  fundo.innerHTML =
    '<div class="modal' + (opcoes.largo ? ' largo' : '') + '" role="dialog" aria-modal="true">' +
      '<div class="modal-topo">' +
        '<h2 class="modal-titulo">' + UI.esc(opcoes.titulo || '') + '</h2>' +
        '<button class="modal-fechar" type="button" aria-label="Fechar">' + UI.icones.fechar + '</button>' +
      '</div>' +
      '<div class="modal-corpo">' + (opcoes.corpo || '') + '</div>' +
      '<div class="modal-rodape"></div>' +
    '</div>';

  const janela = fundo.querySelector('.modal');
  const rodape = fundo.querySelector('.modal-rodape');

  const controle = {
    el: janela,
    fechar() {
      fundo.remove();
      document.removeEventListener('keydown', aoTeclar);
      if (opcoes.aoFechar) opcoes.aoFechar();
    }
  };

  (opcoes.botoes || []).forEach(b => {
    const botao = document.createElement('button');
    botao.type = 'button';
    botao.className = 'btn ' + (b.classe || '');
    botao.textContent = b.texto;
    botao.addEventListener('click', () => (b.acao ? b.acao(controle) : controle.fechar()));
    rodape.appendChild(botao);
  });
  if (!rodape.children.length) rodape.remove();

  function aoTeclar(e) { if (e.key === 'Escape') controle.fechar(); }

  // Fecha ao clicar fora da janela
  fundo.addEventListener('mousedown', e => { if (e.target === fundo) controle.fechar(); });
  fundo.querySelector('.modal-fechar').addEventListener('click', () => controle.fechar());
  document.addEventListener('keydown', aoTeclar);

  document.body.appendChild(fundo);
  const primeiroCampo = janela.querySelector('.modal-corpo input, .modal-corpo select, .modal-corpo textarea');
  (primeiroCampo || janela.querySelector('.modal-rodape .btn') || janela).focus();
  return controle;
};

/* ---------- Aviso (mensagem com ícone) ---------- */
// tipo: "sucesso" | "erro" | "alerta" | "info"
// botoesExtras (opcional): [{ texto, classe, acao(modal) }] aparecem antes do "Entendi"
UI.aviso = function (tipo, titulo, mensagem, aoFechar, botoesExtras) {
  const icone = { sucesso: 'check', erro: 'x', alerta: 'alerta', info: 'info' }[tipo] || 'info';
  return UI.modal({
    titulo: '',
    corpo:
      '<div class="aviso-icone ' + tipo + '">' + UI.icones[icone] + '</div>' +
      '<div class="aviso-texto"><h3>' + UI.esc(titulo) + '</h3><p>' + mensagem + '</p></div>',
    botoes: (botoesExtras || []).concat([{ texto: 'Entendi', classe: botoesExtras && botoesExtras.length ? '' : 'btn-primario', acao: m => m.fechar() }]),
    aoFechar
  });
};

/* ---------- Confirmação (retorna uma Promise) ---------- */
UI.confirmar = function (titulo, mensagem, textoConfirmar, perigo) {
  return new Promise(resolver => {
    let respondeu = false;
    UI.modal({
      titulo,
      corpo: '<p class="aviso-texto" style="text-align:left">' + mensagem + '</p>',
      botoes: [
        { texto: 'Cancelar', acao: m => m.fechar() },
        { texto: textoConfirmar || 'Confirmar', classe: perigo ? 'btn-perigo' : 'btn-primario', acao: m => { respondeu = true; m.fechar(); } }
      ],
      aoFechar: () => resolver(respondeu)
    });
  });
};

/* ---------- Toast (mensagem rápida no canto) ---------- */
UI.toast = function (mensagem, tipo) {
  let area = UI.$('.toasts');
  if (!area) {
    area = document.createElement('div');
    area.className = 'toasts';
    area.setAttribute('role', 'status');
    document.body.appendChild(area);
  }
  const toast = document.createElement('div');
  toast.className = 'toast ' + (tipo || '');
  toast.textContent = mensagem;
  area.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
};

/* ---------- Status ---------- */
// "Aguardando correção" → "status-aguardando-correcao"
UI.classeStatus = status => 'status status-' + String(status).toLowerCase()
  .normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '-');

UI.status = status => '<span class="' + UI.classeStatus(status) + '">' + UI.esc(status) + '</span>';

/* ---------- Tabela ---------- */
// colunas: [{ titulo, valor(linha) → HTML, classe }]
// opcoes: { vazio, aoClicar(linha), acoes: { nome: funcao(linha) } }
// Botões dentro das células usam data-acao="nome" para chamar opcoes.acoes[nome].
UI.tabela = function (colunas, linhas, opcoes) {
  opcoes = opcoes || {};
  const wrap = document.createElement('div');
  wrap.className = 'tabela-wrap';

  if (!linhas.length) {
    wrap.innerHTML = '<p class="vazio">' + UI.esc(opcoes.vazio || 'Nenhum registro encontrado.') + '</p>';
    return wrap;
  }

  let html = '<table class="tabela"><thead><tr>';
  colunas.forEach(c => { html += '<th class="' + (c.classe || '') + '">' + UI.esc(c.titulo) + '</th>'; });
  html += '</tr></thead><tbody>';
  linhas.forEach((linha, i) => {
    html += '<tr data-indice="' + i + '"' + (opcoes.aoClicar ? ' class="clicavel" tabindex="0"' : '') + '>';
    colunas.forEach(c => {
      html += '<td class="' + (c.classe || '') + '" data-rotulo="' + UI.esc(c.titulo) + '">' + c.valor(linha) + '</td>';
    });
    html += '</tr>';
  });
  html += '</tbody></table>';
  wrap.innerHTML = html;

  wrap.addEventListener('click', e => {
    const tr = e.target.closest('tr[data-indice]');
    if (!tr) return;
    const linha = linhas[Number(tr.dataset.indice)];
    const botao = e.target.closest('[data-acao]');
    if (botao && opcoes.acoes && opcoes.acoes[botao.dataset.acao]) {
      e.stopPropagation();
      opcoes.acoes[botao.dataset.acao](linha, botao);
      return;
    }
    if (e.target.closest('input, label, button, a')) return;
    if (opcoes.aoClicar) opcoes.aoClicar(linha);
  });

  wrap.addEventListener('keydown', e => {
    const tr = e.target.closest('tr.clicavel');
    if (tr && e.key === 'Enter' && opcoes.aoClicar) opcoes.aoClicar(linhas[Number(tr.dataset.indice)]);
  });

  return wrap;
};

// Coloca a tabela dentro de um elemento (substituindo o conteúdo)
UI.renderTabela = function (destino, colunas, linhas, opcoes) {
  destino.innerHTML = '';
  destino.appendChild(UI.tabela(colunas, linhas, opcoes));
};

/* ---------- <option> para selects ---------- */
// lista: [{ valor, texto }] ou array de textos
UI.opcoes = function (lista, selecionado, textoVazio) {
  let html = textoVazio !== undefined ? '<option value="">' + UI.esc(textoVazio) + '</option>' : '';
  lista.forEach(item => {
    const valor = typeof item === 'object' ? item.valor : item;
    const texto = typeof item === 'object' ? item.texto : item;
    html += '<option value="' + UI.esc(valor) + '"' + (String(valor) === String(selecionado) ? ' selected' : '') + '>' + UI.esc(texto) + '</option>';
  });
  return html;
};

// Atalho: transforma uma coleção do banco em opções { valor: id, texto: nome }
UI.opcoesDe = colecao => DB.listar(colecao).map(i => ({ valor: i.id, texto: i.nome }));

/* ---------- Seleção múltipla com caixas de marcação ---------- */
// Usada em "Empresas vinculadas" e "Documentos exigidos".
UI.multiSelect = function (container, opcoes) {
  let selecionados = (opcoes.selecionados || []).map(String);
  container.classList.add('multi');
  container.innerHTML =
    '<button type="button" class="selecao multi-botao"></button>' +
    '<div class="multi-lista oculto" role="listbox"></div>';

  const botao = container.querySelector('.multi-botao');
  const lista = container.querySelector('.multi-lista');
  if (opcoes.id) botao.id = opcoes.id;

  function itens() {
    return typeof opcoes.itens === 'function' ? opcoes.itens() : opcoes.itens;
  }

  function desenhar() {
    const opcoesHtml = itens().map(item =>
      '<label class="multi-opcao"><input type="checkbox" value="' + UI.esc(item.valor) + '"' +
      (selecionados.includes(String(item.valor)) ? ' checked' : '') + '> ' + UI.esc(item.texto) + '</label>'
    ).join('');
    lista.innerHTML = opcoesHtml
      ? '<div class="multi-acoes"><button type="button" class="btn-link" data-todos>Selecionar todos</button>' +
        '<button type="button" class="btn-link" data-limpar>Limpar</button></div>' + opcoesHtml
      : '<p class="vazio">Nenhuma opção disponível.</p>';

    const nomes = itens().filter(i => selecionados.includes(String(i.valor))).map(i => i.texto);
    botao.textContent = nomes.length ? nomes.join(', ') : (opcoes.placeholder || 'Selecione');
    botao.classList.toggle('texto-suave', !nomes.length);
  }

  botao.addEventListener('click', () => lista.classList.toggle('oculto'));
  lista.addEventListener('click', e => {
    if (e.target.closest('[data-todos]')) selecionados = itens().map(i => String(i.valor));
    else if (e.target.closest('[data-limpar]')) selecionados = [];
    else return;
    desenhar();
    if (opcoes.aoMudar) opcoes.aoMudar(selecionados);
  });
  lista.addEventListener('change', e => {
    const v = e.target.value;
    selecionados = e.target.checked ? selecionados.concat(v) : selecionados.filter(s => s !== v);
    desenhar();
    if (opcoes.aoMudar) opcoes.aoMudar(selecionados);
  });
  // Fecha ao clicar fora (ignora cliques em itens que acabaram de ser redesenhados)
  document.addEventListener('click', e => {
    if (e.target.isConnected && !container.contains(e.target)) lista.classList.add('oculto');
  });

  desenhar();

  return {
    valor: () => selecionados.slice(),
    definir(valores) { selecionados = (valores || []).map(String); desenhar(); },
    atualizar: desenhar
  };
};

/* ---------- Máscaras de digitação ---------- */
UI.mascaraCNPJ = function (input) {
  input.addEventListener('input', () => {
    const n = input.value.replace(/\D/g, '').slice(0, 14);
    let r = n;
    if (n.length > 2) r = n.slice(0, 2) + '.' + n.slice(2);
    if (n.length > 5) r = r.slice(0, 6) + '.' + n.slice(5);
    if (n.length > 8) r = r.slice(0, 10) + '/' + n.slice(8);
    if (n.length > 12) r = r.slice(0, 15) + '-' + n.slice(12);
    input.value = r;
  });
};

UI.mascaraCompetencia = function (input) {
  input.addEventListener('input', () => {
    const n = input.value.replace(/\D/g, '').slice(0, 6);
    input.value = n.length > 2 ? n.slice(0, 2) + '/' + n.slice(2) : n;
  });
};

/* ---------- Campos inválidos ---------- */
UI.marcarInvalido = function (campo, invalido) {
  if (campo) campo.classList.toggle('invalida', !!invalido);
};

UI.limparInvalidos = function (base) {
  UI.$$('.invalida', base).forEach(el => el.classList.remove('invalida'));
};

/* ---------- Arquivos ---------- */
UI.tamanho = bytes => {
  if (!bytes && bytes !== 0) return '—';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(0) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
};

// Gera um arquivo e inicia o download (usado na exportação CSV)
UI.baixar = function (nomeArquivo, conteudo, tipo) {
  const blob = new Blob([conteudo], { type: tipo || 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nomeArquivo;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

// Monta um CSV (abre no Excel) a partir de cabeçalho + linhas
UI.csv = function (cabecalho, linhas) {
  const celula = v => '"' + String(v === null || v === undefined ? '' : v).replace(/"/g, '""') + '"';
  return '﻿' + [cabecalho].concat(linhas).map(l => l.map(celula).join(';')).join('\r\n');
};

// Lê um arquivo escolhido pelo usuário.
// Arquivos pequenos (até 400 KB) são guardados para pré-visualização;
// os maiores guardam só nome, tamanho e tipo (o localStorage tem limite de ~5 MB).
UI.lerArquivo = function (arquivo) {
  return new Promise(resolver => {
    const info = { nome: arquivo.name, tamanho: arquivo.size, tipo: arquivo.type || '' };
    if (arquivo.size > 400 * 1024) { resolver(info); return; }
    const leitor = new FileReader();
    leitor.onload = () => { info.conteudo = leitor.result; resolver(info); };
    leitor.onerror = () => resolver(info);
    leitor.readAsDataURL(arquivo);
  });
};

// Abre o seletor de arquivos do sistema e devolve o arquivo escolhido
UI.escolherArquivo = function (aceitar) {
  return new Promise(resolver => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = aceitar || '.pdf,.png,.jpg,.jpeg';
    input.addEventListener('change', () => resolver(input.files[0] || null));
    input.click();
  });
};

// Janela de pré-visualização de um arquivo
UI.visualizarArquivo = function (arquivo, titulo) {
  let corpo;
  if (!arquivo) {
    corpo = '<p class="vazio">Nenhum arquivo anexado a este documento.</p>';
  } else if (arquivo.conteudo && arquivo.tipo.startsWith('image/')) {
    corpo = '<img src="' + arquivo.conteudo + '" alt="' + UI.esc(arquivo.nome) + '" style="max-width:100%;margin:auto">';
  } else if (arquivo.conteudo && arquivo.tipo === 'application/pdf') {
    corpo = '<iframe src="' + arquivo.conteudo + '" title="' + UI.esc(arquivo.nome) + '" style="width:100%;height:60vh;border:0"></iframe>';
  } else {
    corpo =
      '<div class="previa-impressao" style="text-align:center">' +
        '<div class="aviso-icone info">' + UI.icones.documento + '</div>' +
        '<p class="negrito">' + UI.esc(arquivo.nome) + '</p>' +
        '<p class="texto-suave">' + UI.tamanho(arquivo.tamanho) + ' • ' + UI.esc(arquivo.tipo || 'arquivo') + '</p>' +
        '<p class="texto-suave">A pré-visualização está disponível para imagens e PDFs de até 400 KB enviados neste navegador.</p>' +
      '</div>';
  }
  UI.modal({
    titulo: titulo || 'Visualizar arquivo',
    corpo,
    largo: true,
    botoes: [{ texto: 'Fechar', acao: m => m.fechar() }]
  });
};
