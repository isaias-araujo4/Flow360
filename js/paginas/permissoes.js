/* Flow360 — Permissões de acesso (T32): RF50 e RF51 */

if (Layout.iniciar({ modulo: 'usuarios', ativo: 'usuarios' })) {
  // Tabela Cargo × Documentos visíveis e ações
  UI.renderTabela(UI.$('#tabela-acesso'), [
    { titulo: 'Cargo', valor: c => UI.esc(c) },
    { titulo: 'Documentos visíveis e ações', valor: c => UI.esc(ACESSO_POR_CARGO[c].descricao) },
    { titulo: 'Níveis visíveis', valor: c => UI.esc(ACESSO_POR_CARGO[c].niveis.join(', ')) }
  ], CARGOS);

  // Diretor sempre mantém acesso a Usuários (para ninguém ficar trancado para fora)
  const travado = (cargo, modulo) => cargo === 'Diretor' && modulo === 'usuarios';

  function desenhar(permissoes) {
    const colunas = [{ titulo: 'Tela', valor: m => UI.esc(m.nome) }].concat(CARGOS.map(cargo => ({
      titulo: cargo,
      classe: 'normal',
      valor: m => '<input type="checkbox" data-cargo="' + UI.esc(cargo) + '" data-modulo="' + m.id + '"' +
        ((permissoes[cargo] || []).includes(m.id) || travado(cargo, m.id) ? ' checked' : '') +
        (travado(cargo, m.id) ? ' disabled' : '') +
        ' aria-label="' + UI.esc(cargo + ' acessa ' + m.nome) + '">'
    })));
    UI.renderTabela(UI.$('#tabela-permissoes'), colunas, MODULOS);
  }

  function lerMatriz() {
    const resultado = {};
    CARGOS.forEach(c => { resultado[c] = []; });
    UI.$$('#tabela-permissoes input[type="checkbox"]').forEach(caixa => {
      if (caixa.checked) resultado[caixa.dataset.cargo].push(caixa.dataset.modulo);
    });
    return resultado;
  }

  UI.$('#btn-salvar').addEventListener('click', () => {
    const matriz = lerMatriz();
    const vazio = CARGOS.find(c => !matriz[c].length);
    if (vazio) {
      UI.aviso('alerta', 'Seleção incompleta', 'O cargo <strong>' + UI.esc(vazio) + '</strong> precisa acessar pelo menos uma tela.');
      return;
    }
    DB.salvar('permissoes', matriz);
    registrarHistorico('Alterou a matriz de acesso', 'Telas liberadas por cargo');
    UI.aviso('sucesso', 'Alterações salvas', 'As novas permissões já valem para todos os usuários.', () => location.reload());
  });

  UI.$('#btn-padrao').addEventListener('click', async () => {
    if (await UI.confirmar('Restaurar padrão', 'Voltar todas as permissões para o padrão do sistema?', 'Restaurar')) {
      desenhar(PERMISSOES_PADRAO);
      UI.toast('Padrão carregado. Clique em "Salvar permissões" para confirmar.');
    }
  });

  desenhar(DB.ler('permissoes') || PERMISSOES_PADRAO);
}
