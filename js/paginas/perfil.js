/* Flow360 — Perfil e sessão (aberto para qualquer cargo) */

if (Layout.iniciar({ ativo: '' })) {
  const usuario = Sessao.usuario();
  const sessao = Sessao.atual();
  const permissoes = (DB.ler('permissoes') || {})[sessao.cargo] || [];

  UI.$('#perfil-avatar').innerHTML = UI.icones.usuario;
  UI.$('#perfil-nome').textContent = usuario.nome;
  UI.$('#perfil-login').textContent = 'E-mail: ' + usuario.login;
  UI.$('#btn-sair').innerHTML = UI.icones.sair + 'Sair do sistema';

  const dados = [
    ['Cargo atual', sessao.cargo],
    ['Cargo cadastrado', usuario.cargos[0]],
    ['Sessão iniciada em', Datas.brHora(sessao.inicio)],
    ['Telas liberadas', MODULOS.filter(m => permissoes.includes(m.id)).map(m => m.nome).join(', ')]
  ];
  dados.push(['Documentos visíveis', ACESSO_POR_CARGO[sessao.cargo] ? ACESSO_POR_CARGO[sessao.cargo].descricao : '—']);
  UI.$('#perfil-dados').innerHTML = dados.map(d => '<div><dt>' + d[0] + '</dt><dd>' + UI.esc(d[1]) + '</dd></div>').join('');

  const minhas = DB.listar('historico').filter(h => h.usuario === usuario.nome)
    .sort((a, b) => b.data.localeCompare(a.data)).slice(0, 8);
  UI.renderTabela(UI.$('#tabela-acoes'), [
    { titulo: 'Data e hora', valor: h => Datas.brHora(h.data) },
    { titulo: 'Ação', valor: h => UI.esc(h.acao) },
    { titulo: 'Referência', valor: h => UI.esc(h.referencia) }
  ], minhas, { vazio: 'Nenhuma ação registrada.' });

  UI.$('#btn-senha').addEventListener('click', () => {
    const modal = UI.modal({
      titulo: 'Alterar senha',
      corpo:
        '<div class="campo"><label for="senha-atual">Senha atual</label><input class="entrada" type="password" id="senha-atual" autocomplete="current-password"></div>' +
        '<div class="campo" style="margin-top:12px"><label for="senha-nova">Nova senha</label><input class="entrada" type="password" id="senha-nova" autocomplete="new-password"></div>' +
        '<div class="campo" style="margin-top:12px"><label for="senha-confirma">Confirme a nova senha</label><input class="entrada" type="password" id="senha-confirma" autocomplete="new-password"></div>' +
        '<p class="erro-campo" id="erro-senha"></p>',
      botoes: [
        { texto: 'Cancelar' },
        { texto: 'Salvar senha', classe: 'btn-primario', acao: m => {
          const atual = UI.$('#senha-atual').value;
          const nova = UI.$('#senha-nova').value;
          const confirma = UI.$('#senha-confirma').value;
          const erro = UI.$('#erro-senha');
          UI.limparInvalidos(modal.el);
          if (atual !== Sessao.usuario().senha) { UI.marcarInvalido(UI.$('#senha-atual'), true); erro.textContent = 'Senha atual incorreta.'; return; }
          if (nova.length < 3) { UI.marcarInvalido(UI.$('#senha-nova'), true); erro.textContent = 'A nova senha precisa ter pelo menos 3 caracteres.'; return; }
          if (nova !== confirma) { UI.marcarInvalido(UI.$('#senha-confirma'), true); erro.textContent = 'As senhas não conferem.'; return; }
          DB.atualizar('usuarios', usuario.id, { senha: nova });
          registrarHistorico('Alterou a própria senha', usuario.login);
          m.fechar();
          UI.aviso('sucesso', 'Senha alterada', 'Use a nova senha no próximo acesso.');
        } }
      ]
    });
  });

  UI.$('#btn-sair').addEventListener('click', async () => {
    if (await UI.confirmar('Sair do sistema', 'Deseja encerrar a sessão?', 'Sair')) {
      registrarHistorico('Saiu do sistema', 'Cargo: ' + sessao.cargo);
      Sessao.sair();
    }
  });

  UI.$('#btn-restaurar').addEventListener('click', async () => {
    if (await UI.confirmar('Restaurar dados de exemplo', 'Tudo o que foi cadastrado neste navegador será apagado e você precisará entrar novamente.', 'Restaurar', true)) {
      DB.restaurar();
      location.href = 'index.html';
    }
  });
}
