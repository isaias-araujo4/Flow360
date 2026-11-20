/* Flow360 — Usuários (criar, editar, inativar e reativar) */

if (Layout.iniciar({ modulo: 'usuarios', ativo: 'usuarios' })) {
  const busca = UI.$('#u-busca');
  const filtroCargo = UI.$('#u-cargo');
  const filtroAcesso = UI.$('#u-acesso');

  filtroCargo.innerHTML = UI.opcoes(CARGOS, '', 'Todos os cargos');
  filtroAcesso.innerHTML = UI.opcoes([{ valor: 'ativo', texto: 'Ativo' }, { valor: 'inativo', texto: 'Inativo' }], '', 'Todos');

  function desenhar() {
    const termo = busca.value.trim().toLowerCase();
    const lista = DB.listar('usuarios').filter(u =>
      (!termo || u.nome.toLowerCase().includes(termo) || u.login.toLowerCase().includes(termo)) &&
      (!filtroCargo.value || u.cargos.includes(filtroCargo.value)) &&
      (!filtroAcesso.value || (filtroAcesso.value === 'ativo') === u.ativo));

    UI.renderTabela(UI.$('#tabela-usuarios'), [
      { titulo: 'Usuário', valor: u => UI.esc(u.nome) },
      { titulo: 'E-mail', valor: u => UI.esc(u.login) },
      { titulo: 'Cargo', valor: u => UI.esc(u.cargos.join(', ')) },
      { titulo: 'Acesso', valor: u => '<span class="status-' + (u.ativo ? 'ativo' : 'inativo') + '">' + (u.ativo ? 'Ativo' : 'Inativo') + '</span>' },
      { titulo: 'Ação', valor: u =>
        '<button class="btn-tabela" type="button" data-acao="editar">Editar</button> ' +
        '<button class="btn-tabela" type="button" data-acao="' + (u.ativo ? 'inativar' : 'reativar') + '">' + (u.ativo ? 'Inativar' : 'Reativar') + '</button>' }
    ], lista, { vazio: 'Nenhum usuário encontrado.', acoes: { editar: modalUsuario, inativar, reativar } });
  }

  /* ----- Novo / editar usuário ----- */
  function modalUsuario(usuario) {
    const editando = !!(usuario && usuario.id);
    const u = editando ? usuario : { nome: '', login: '', cargos: [] };

    const modal = UI.modal({
      titulo: editando ? 'Editar usuário' : 'Novo usuário',
      corpo:
        '<div class="grade-campos">' +
          '<div class="campo"><label for="m-nome">Nome</label><input class="entrada" id="m-nome" value="' + UI.esc(u.nome) + '"></div>' +
          '<div class="campo"><label for="m-login">E-mail (login)</label><input class="entrada" id="m-login" type="email" placeholder="nome@gmail.com" value="' + UI.esc(u.login) + '" autocomplete="off"></div>' +
          '<div class="campo"><label for="m-senha">' + (editando ? 'Nova senha (opcional)' : 'Senha') + '</label><input class="entrada" id="m-senha" type="password" autocomplete="new-password"></div>' +
          '<div class="campo"><label for="m-cargo">Cargo (role)</label><select class="selecao" id="m-cargo">' + UI.opcoes(CARGOS, u.cargos[0] || '', 'Selecione o cargo') + '</select></div>' +
        '</div>' +
        '<p class="texto-suave" style="font-size:13px;margin:0">O cargo define as telas e o nível de acesso aos documentos (ver Matriz de acesso).</p>' +
        '<p class="erro-campo" id="m-erro"></p>',
      botoes: [
        { texto: 'Cancelar' },
        { texto: editando ? 'Salvar alterações' : 'Criar usuário', classe: 'btn-primario', acao: m => salvar(m) }
      ]
    });

    function salvar(m) {
      const campos = { nome: UI.$('#m-nome'), login: UI.$('#m-login'), senha: UI.$('#m-senha') };
      const nome = campos.nome.value.trim();
      const login = campos.login.value.trim().toLowerCase();
      const senha = campos.senha.value;
      const campoCargo = UI.$('#m-cargo');
      const listaCargos = campoCargo.value ? [campoCargo.value] : [];
      const erro = UI.$('#m-erro');
      UI.limparInvalidos(modal.el);

      // Formulário inválido
      const faltando = [];
      if (!nome) { faltando.push('nome'); UI.marcarInvalido(campos.nome, true); }
      if (!login) { faltando.push('e-mail'); UI.marcarInvalido(campos.login, true); }
      if (!editando && !senha) { faltando.push('senha'); UI.marcarInvalido(campos.senha, true); }
      if (!listaCargos.length) { faltando.push('cargo'); UI.marcarInvalido(campoCargo, true); }
      if (faltando.length) { erro.textContent = 'Preencha os campos obrigatórios: ' + faltando.join(', ') + '.'; return; }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(login)) {
        UI.marcarInvalido(campos.login, true);
        erro.textContent = 'Informe um e-mail válido (ex.: nome@gmail.com).';
        return;
      }
      if (DB.listar('usuarios').some(x => x.login.toLowerCase() === login && x.id !== u.id)) {
        UI.marcarInvalido(campos.login, true);
        erro.textContent = 'Já existe um usuário com este e-mail.';
        return;
      }
      // Não deixa o sistema sem diretor ativo
      if (editando && u.cargos.includes('Diretor') && !listaCargos.includes('Diretor') && diretoresAtivos(u.id) === 0) {
        erro.textContent = 'O sistema precisa de pelo menos um diretor ativo.';
        return;
      }

      const dados = { nome, login, cargos: listaCargos };
      if (senha) dados.senha = senha;

      if (editando) {
        DB.atualizar('usuarios', u.id, dados);
        registrarHistorico('Editou usuário', nome);
        m.fechar();
        desenhar();
        UI.aviso('sucesso', 'Alterações salvas', 'Os dados de <strong>' + UI.esc(nome) + '</strong> foram atualizados.');
      } else {
        DB.inserir('usuarios', Object.assign(dados, { ativo: true }));
        registrarHistorico('Criou usuário', nome + ' • ' + listaCargos.join(', '));
        m.fechar();
        desenhar();
        UI.aviso('sucesso', 'Usuário criado', '<strong>' + UI.esc(nome) + '</strong> já pode entrar com o login <strong>' + UI.esc(login) + '</strong>.');
      }
    }
  }

  // Quantos diretores ativos existem, ignorando um usuário
  function diretoresAtivos(ignorarId) {
    return DB.listar('usuarios').filter(x => x.ativo && x.cargos.includes('Diretor') && x.id !== ignorarId).length;
  }

  /* ----- Inativar / reativar ----- */
  async function inativar(u) {
    if (u.id === Sessao.usuario().id) {
      UI.aviso('alerta', 'Ação não permitida', 'Você não pode inativar o próprio usuário.');
      return;
    }
    if (u.cargos.includes('Diretor') && diretoresAtivos(u.id) === 0) {
      UI.aviso('alerta', 'Ação não permitida', 'O sistema precisa de pelo menos um diretor ativo.');
      return;
    }
    const ok = await UI.confirmar('Inativar acesso?', '<strong>' + UI.esc(u.nome) + '</strong> perderá o acesso imediatamente. Todo o histórico de ações, visualizações e alterações será mantido para auditoria (LGPD).', 'Confirmar inativação', true);
    if (!ok) return;
    DB.atualizar('usuarios', u.id, { ativo: false });
    registrarHistorico('Inativou usuário', u.nome);
    desenhar();
    UI.aviso('sucesso', 'Usuário inativado', '<strong>' + UI.esc(u.nome) + '</strong> não consegue mais entrar no sistema.');
  }

  async function reativar(u) {
    const ok = await UI.confirmar('Reativar acesso?', 'Devolver o acesso de <strong>' + UI.esc(u.nome) + '</strong>?', 'Confirmar reativação');
    if (!ok) return;
    DB.atualizar('usuarios', u.id, { ativo: true });
    registrarHistorico('Reativou usuário', u.nome);
    desenhar();
    UI.aviso('sucesso', 'Usuário reativado', '<strong>' + UI.esc(u.nome) + '</strong> já pode entrar novamente.');
  }

  UI.$('#btn-novo').addEventListener('click', () => modalUsuario(null));
  busca.addEventListener('input', desenhar);
  filtroCargo.addEventListener('change', desenhar);
  filtroAcesso.addEventListener('change', desenhar);

  desenhar();
}
