/* =========================================================
   Flow360 — layout.js
   Monta o cabeçalho e o menu lateral em todas as telas internas,
   confere se há alguém logado e se o cargo pode ver a página.

   Uso em cada página:
     if (Layout.iniciar({ modulo: 'documentos', ativo: 'documentos' })) { ...código da página... }
   ========================================================= */

const MENU = [
  { id: 'painel', texto: 'Painel Geral', href: 'painel.html', icone: 'grafico', modulo: 'painel' },
  { id: 'enviar', texto: 'Enviar documentação', href: 'enviar.html', icone: 'mais', modulo: 'enviar' },
  { id: 'documentos', texto: 'Documentos', href: 'documentos.html', icone: 'documento', modulo: 'documentos' },
  { id: 'pendencias', texto: 'Pendências', href: 'pendencias.html', icone: 'alerta', modulo: 'pendencias' },
  { id: 'relatorios', texto: 'Relatórios', href: 'relatorios.html', icone: 'relatorio', modulo: 'relatorios' },
  { secao: 'Cadastros', modulo: 'cadastros', itens: [
    { id: 'empresas', texto: 'Empresas Terceirizadas', href: 'empresas.html' },
    { id: 'clientes', texto: 'Clientes', href: 'clientes.html' },
    { id: 'regionais', texto: 'Regionais', href: 'regionais.html' },
    { id: 'unidades', texto: 'Unidades', href: 'unidades.html' },
    { id: 'colaboradores', texto: 'Colaboradores', href: 'colaboradores.html' },
    { id: 'competencias', texto: 'Competências', href: 'competencias.html' },
    { id: 'documentos-obrigatorios', texto: 'Documentos Obrigatórios', href: 'documentos-obrigatorios.html' }
  ] },
  { secao: 'Administração', itens: [
    { id: 'historico', texto: 'Histórico', href: 'historico.html', icone: 'relogio', modulo: 'historico' },
    { id: 'usuarios', texto: 'Usuários', href: 'usuarios.html', icone: 'usuarioMais', modulo: 'usuarios' }
  ] }
];

const Layout = {
  iniciar(config) {
    config = config || {};

    // 1. Precisa estar logado
    const usuario = Sessao.usuario();
    if (!usuario) {
      location.href = 'index.html';
      return false;
    }
    // Usuário foi inativado enquanto estava logado
    if (!usuario.ativo) {
      DB.remover('sessao');
      location.href = 'index.html?motivo=inativo';
      return false;
    }

    // 2. Monta cabeçalho e menu
    Layout.desenharTopo(usuario);
    Layout.desenharMenu(config.ativo);

    // 3. Confere permissão do cargo
    if (config.modulo && !Sessao.pode(config.modulo)) {
      Layout.acessoNegado();
      return false;
    }
    return true;
  },

  desenharTopo(usuario) {
    const topo = document.createElement('header');
    topo.className = 'topo';
    topo.innerHTML =
      '<a class="topo-inicio" href="painel.html" aria-label="Ir para o painel geral">' + UI.icones.casa + '</a>' +
      '<button class="topo-menu" type="button" aria-label="Abrir menu">' + UI.icones.menu + '</button>' +
      '<a class="logo" href="painel.html"><span>Flow</span>360</a>' +
      '<div class="topo-direita">' +
        '<span class="topo-cargo" title="Cargo do usuário">' + UI.esc(Sessao.cargo()) + '</span>' +
        '<button class="topo-sino" type="button" aria-label="Notificações">' + UI.icones.sino + '<span class="contador oculto"></span></button>' +
        '<button class="avatar topo-avatar" type="button" aria-label="Perfil e sessão de ' + UI.esc(usuario.nome) + '" title="' + UI.esc(usuario.nome) + '">' + UI.icones.usuario + '</button>' +
      '</div>';
    document.body.prepend(topo);

    topo.querySelector('.topo-menu').addEventListener('click', () => document.body.classList.toggle('menu-aberto'));
    topo.querySelector('.topo-sino').addEventListener('click', e => {
      e.stopPropagation();
      Layout.fecharPaineis('.painel-notif');
      Layout.alternarNotificacoes();
    });
    topo.querySelector('.topo-avatar').addEventListener('click', e => {
      e.stopPropagation();
      Layout.fecharPaineis('.perfil-painel');
      Layout.alternarPerfil();
    });
    Layout.atualizarContador();
  },

  // Fecha os painéis suspensos do cabeçalho, menos o informado
  fecharPaineis(exceto) {
    UI.$$('.notificacoes-painel, .perfil-painel').forEach(p => { if (!p.matches(exceto)) p.remove(); });
  },

  // Fecha o painel ao clicar fora dele
  fecharAoClicarFora(painel) {
    setTimeout(() => {
      document.addEventListener('click', function fechar(e) {
        if (!painel.isConnected) { document.removeEventListener('click', fechar); return; }
        if (e.target.isConnected && !painel.contains(e.target)) {
          painel.remove();
          document.removeEventListener('click', fechar);
        }
      });
    });
  },

  /* ---------- Menu do avatar: perfil e sessão ---------- */
  alternarPerfil() {
    const aberto = UI.$('.perfil-painel');
    if (aberto) { aberto.remove(); return; }
    const usuario = Sessao.usuario();
    const sessao = Sessao.atual();

    const painel = document.createElement('div');
    painel.className = 'notificacoes-painel perfil-painel';
    painel.setAttribute('role', 'dialog');
    painel.setAttribute('aria-label', 'Perfil e sessão');
    painel.innerHTML =
      '<div class="notificacoes-topo"><h2>Perfil e sessão</h2></div>' +
      '<div style="padding:14px 16px">' +
        '<div class="negrito">' + UI.esc(usuario.nome) + '</div>' +
        '<div class="texto-suave" style="font-size:13px;margin-top:2px">E-mail: ' + UI.esc(usuario.login) + '</div>' +
        '<div class="texto-suave" style="font-size:13px">Cargo: ' + UI.esc(sessao.cargo) + '</div>' +
        '<div class="texto-suave" style="font-size:13px">Sessão iniciada em ' + Datas.brHora(sessao.inicio) + '</div>' +
      '</div>' +
      '<div class="acoes" style="padding:0 16px 16px">' +
        '<a class="btn" href="perfil.html">Meu perfil</a>' +
        '<button class="btn btn-perigo" type="button" data-sair>' + UI.icones.sair + 'Sair</button>' +
      '</div>';
    document.body.appendChild(painel);

    painel.querySelector('[data-sair]').addEventListener('click', () => {
      registrarHistorico('Saiu do sistema', 'Cargo: ' + sessao.cargo);
      Sessao.sair();
    });
    Layout.fecharAoClicarFora(painel);
  },

  desenharMenu(ativo) {
    const app = UI.$('.app');
    const menu = document.createElement('aside');
    menu.className = 'menu-lateral';
    menu.setAttribute('aria-label', 'Menu principal');

    let html = '';
    MENU.forEach(item => {
      if (item.secao) {
        if (item.modulo && !Sessao.pode(item.modulo)) return;
        const visiveis = item.itens.filter(sub => !sub.modulo || Sessao.pode(sub.modulo));
        if (!visiveis.length) return;
        html += '<div class="menu-secao">' + UI.esc(item.secao) + '</div>';
        visiveis.forEach(sub => {
          html += sub.icone ? Layout.itemMenu(sub, ativo) :
            '<a class="menu-sub' + (sub.id === ativo ? ' ativo' : '') + '" href="' + sub.href + '">' + UI.esc(sub.texto) + '</a>';
        });
      } else if (Sessao.pode(item.modulo)) {
        html += Layout.itemMenu(item, ativo);
      }
    });

    html +=
      '<div class="menu-rodape">' +
        '<a class="engrenagem" href="perfil.html" aria-label="Perfil e sessão">' + UI.icones.engrenagem + '</a>' +
        '<a class="avatar avatar-pequeno" href="perfil.html" aria-label="Perfil">' + UI.icones.usuario + '</a>' +
      '</div>';
    menu.innerHTML = html;
    app.prepend(menu);

    // Fundo escuro do menu no celular/tablet
    const fundo = document.createElement('div');
    fundo.className = 'fundo-menu';
    fundo.addEventListener('click', () => document.body.classList.remove('menu-aberto'));
    document.body.appendChild(fundo);
  },

  itemMenu(item, ativo) {
    return '<a class="menu-item' + (item.id === ativo ? ' ativo' : '') + '" href="' + item.href + '"' +
      (item.id === ativo ? ' aria-current="page"' : '') + '>' +
      UI.icones[item.icone] + '<span class="divisor"></span>' + UI.esc(item.texto) + '</a>';
  },

  // Substitui o conteúdo da página pela mensagem "Acesso restrito"
  acessoNegado() {
    const conteudo = UI.$('#conteudo');
    conteudo.innerHTML =
      '<div class="cabecalho-pagina"><h1 class="titulo-pagina">Acesso restrito</h1></div>' +
      '<section class="cartao" style="text-align:center">' +
        '<div class="aviso-icone erro">' + UI.icones.x + '</div>' +
        '<p class="aviso-texto">O cargo <strong>' + UI.esc(Sessao.cargo()) + '</strong> não tem permissão para acessar esta tela.<br>' +
        'Consulte a matriz de acesso ou peça liberação a um diretor.</p>' +
        '<div class="acoes" style="justify-content:center">' +
          '<a class="btn" href="painel.html">Voltar ao painel</a>' +
        '</div>' +
      '</section>';
  },

  /* ---------- Solicitar documento ao setor ---------- */
  // Usado principalmente por Jovem Aprendiz e Estagiário (T20)
  solicitarAoSetor(tipoInicial) {
    const modal = UI.modal({
      titulo: 'Solicitar documento ao setor',
      corpo:
        '<div class="grade-campos">' +
          '<div class="campo"><label for="sol-tipo">Documento</label><select class="selecao" id="sol-tipo">' + UI.opcoes(TIPOS_DOCUMENTO, tipoInicial || '', 'Selecione') + '</select></div>' +
          '<div class="campo"><label for="sol-setor">Setor</label><select class="selecao" id="sol-setor">' + UI.opcoes(['Departamento Pessoal', 'Financeiro', 'Jurídico', 'Segurança do Trabalho'], '', 'Selecione') + '</select></div>' +
          '<div class="campo campo-largo"><label for="sol-obs">Observação</label><textarea class="entrada" id="sol-obs" placeholder="Ex.: competência, colaborador, prazo"></textarea></div>' +
        '</div><p class="erro-campo" id="sol-erro"></p>',
      botoes: [
        { texto: 'Fechar' },
        { texto: 'Enviar solicitação', classe: 'btn-primario', acao: m => {
          const tipo = UI.$('#sol-tipo', modal.el);
          const setor = UI.$('#sol-setor', modal.el);
          UI.limparInvalidos(modal.el);
          if (!tipo.value || !setor.value) {
            UI.marcarInvalido(tipo, !tipo.value);
            UI.marcarInvalido(setor, !setor.value);
            UI.$('#sol-erro', modal.el).textContent = 'Escolha o documento e o setor.';
            return;
          }
          registrarHistorico('Solicitou documento ao setor', tipo.value + ' • ' + setor.value);
          notificar(Sessao.usuario().nome + ' solicitou ' + tipo.value + ' ao setor ' + setor.value + '.', 'historico.html');
          Layout.atualizarContador();
          m.fechar();
          UI.aviso('sucesso', 'Documento solicitado', 'O setor <strong>' + UI.esc(setor.value) + '</strong> recebeu o pedido de <strong>' + UI.esc(tipo.value) + '</strong>.');
        } }
      ]
    });
  },

  /* ---------- Notificações ---------- */
  atualizarContador() {
    const naoLidas = DB.listar('notificacoes').filter(n => !n.lida).length;
    const contador = UI.$('.topo-sino .contador');
    if (!contador) return;
    contador.textContent = naoLidas > 9 ? '9+' : naoLidas;
    contador.classList.toggle('oculto', naoLidas === 0);
  },

  alternarNotificacoes() {
    const aberto = UI.$('.painel-notif');
    if (aberto) { aberto.remove(); return; }

    const painel = document.createElement('div');
    painel.className = 'notificacoes-painel painel-notif';
    painel.setAttribute('role', 'dialog');
    painel.setAttribute('aria-label', 'Pendências e alertas');
    document.body.appendChild(painel);
    Layout.desenharNotificacoes(painel);
    Layout.fecharAoClicarFora(painel);
  },

  desenharNotificacoes(painel) {
    const lista = DB.listar('notificacoes').slice().sort((a, b) => b.data.localeCompare(a.data));
    const naoLidas = lista.filter(n => !n.lida).length;

    painel.innerHTML =
      '<div class="notificacoes-topo"><h2>Pendências e alertas' + (naoLidas ? ' (' + naoLidas + ')' : '') + '</h2>' +
      '<button class="modal-fechar" type="button" data-fechar aria-label="Fechar">' + UI.icones.fechar + '</button></div>' +
      (lista.length ? lista.slice(0, 6).map(Layout.htmlNotificacao).join('') : '<p class="vazio">Nenhuma notificação.</p>') +
      '<div class="notificacoes-rodape acoes" style="justify-content:space-between">' +
        (naoLidas ? '<button class="btn" type="button" data-marcar>Marcar como lidas</button>' : '<span class="texto-suave">Todas as notificações foram marcadas como lidas.</span>') +
        '<a class="btn-link" href="notificacoes.html">Ver todas</a>' +
      '</div>';

    painel.querySelector('[data-fechar]').addEventListener('click', () => painel.remove());
    const marcar = painel.querySelector('[data-marcar]');
    if (marcar) marcar.addEventListener('click', e => {
      e.stopPropagation();
      Layout.marcarTodasLidas();
      Layout.desenharNotificacoes(painel);
    });
    painel.querySelectorAll('[data-notificacao]').forEach(botao => {
      botao.addEventListener('click', () => Layout.abrirNotificacao(Number(botao.dataset.notificacao)));
    });
  },

  htmlNotificacao(n) {
    return '<button type="button" class="notificacao' + (n.lida ? '' : ' nao-lida') + '" data-notificacao="' + n.id + '">' +
      '<span class="ponto"></span><span><span class="notificacao-texto">' + UI.esc(n.texto) + '</span>' +
      '<span class="notificacao-data">' + Datas.brHora(n.data) + '</span></span></button>';
  },

  abrirNotificacao(id) {
    const n = DB.atualizar('notificacoes', id, { lida: true });
    Layout.atualizarContador();
    if (n && n.link) location.href = n.link;
  },

  marcarTodasLidas() {
    DB.salvar('notificacoes', DB.listar('notificacoes').map(n => Object.assign(n, { lida: true })));
    Layout.atualizarContador();
    UI.toast('Todas as notificações foram marcadas como lidas.', 'sucesso');
  }
};

// Fecha o menu do celular ao apertar Esc
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') document.body.classList.remove('menu-aberto');
});
