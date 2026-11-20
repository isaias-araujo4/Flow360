/* Flow360 — Histórico (atividades, verificações e competências passadas) */

if (Layout.iniciar({ modulo: 'historico', ativo: 'historico' })) {
  let aba = ['atividades', 'verificacoes', 'competencias'].includes(UI.param('aba')) ? UI.param('aba') : 'atividades';
  const historico = DB.listar('historico').slice().sort((a, b) => b.data.localeCompare(a.data));
  const selUsuario = UI.$('#h-usuario');

  selUsuario.innerHTML = UI.opcoes([...new Set(historico.map(h => h.usuario))].sort(), '', 'Todos');

  const ultima = historico[0];
  UI.$('#ultima-acao').textContent = ultima
    ? 'Última ação: ' + ultima.usuario + ' — ' + ultima.acao.toLowerCase() + ' (' + Datas.brHora(ultima.data) + ')'
    : 'Última ação: nenhuma';

  function desenhar() {
    UI.$$('[data-aba]').forEach(b => b.classList.toggle('ativo', b.dataset.aba === aba));
    UI.$('#filtro-usuario').classList.toggle('oculto', aba === 'competencias');
    UI.$('#titulo-historico').textContent = {
      atividades: 'Registro de atividades', verificacoes: 'Histórico da conferência', competencias: 'Competências passadas'
    }[aba];

    const destino = UI.$('#tabela-historico');
    const doUsuario = h => !selUsuario.value || h.usuario === selUsuario.value;

    if (aba === 'atividades') {
      UI.renderTabela(destino, [
        { titulo: 'Data e hora', valor: h => Datas.brHora(h.data) },
        { titulo: 'Usuário', valor: h => UI.esc(h.usuario) },
        { titulo: 'Ação', valor: h => UI.esc(h.acao) },
        { titulo: 'Documento / referência', valor: h => UI.esc(h.referencia) }
      ], historico.filter(doUsuario), { vazio: 'Nenhuma atividade registrada.', aoClicar: detalhes });
    }

    // T26: verificações realizadas
    if (aba === 'verificacoes') {
      destino.innerHTML = '<div id="tab-verif"></div><div class="acoes" style="margin-top:14px">' +
        (Sessao.pode('enviar') ? '<a class="btn" href="enviar.html">Voltar à pré-auditoria</a>' : '') +
        '<button class="btn" type="button" id="btn-historico-geral">Histórico geral</button></div>';
      UI.renderTabela(UI.$('#tab-verif'), [
        { titulo: 'Data e hora', valor: h => Datas.brHora(h.data) },
        { titulo: 'Responsável', valor: h => UI.esc(h.usuario) },
        { titulo: 'Resultado', valor: h => h.resultado === 'Aprovada' ? '<span class="texto-sucesso">Aprovada</span>' : '<span class="texto-erro">Bloqueada</span>' },
        { titulo: 'Verificações', valor: h => UI.esc(h.referencia) }
      ], historico.filter(h => h.tipo === 'verificacao').filter(doUsuario), { vazio: 'Nenhuma verificação realizada.', aoClicar: detalhes });
      UI.$('#btn-historico-geral').addEventListener('click', () => trocarAba('atividades'));
    }

    // T27: competências passadas
    if (aba === 'competencias') {
      const documentos = documentosVisiveis();
      const competencias = DB.listar('competencias').slice().sort((a, b) => b.prazo.localeCompare(a.prazo));
      UI.renderTabela(destino, [
        { titulo: 'Competência', valor: c => UI.esc(c.mesAno) },
        { titulo: 'Prazo de envio', valor: c => Datas.br(c.prazo) + (Datas.diasAte(c.prazo) < 0 ? ' (encerrado)' : ' (em aberto)') },
        { titulo: 'Documentos', valor: c => String(documentos.filter(d => d.competencia === c.mesAno).length) },
        { titulo: 'Aprovados', valor: c => '<span class="texto-sucesso">' + documentos.filter(d => d.competencia === c.mesAno && d.status === 'Aprovado').length + '</span>' },
        { titulo: 'Recusados', valor: c => '<span class="texto-erro">' + documentos.filter(d => d.competencia === c.mesAno && d.status === 'Recusado').length + '</span>' }
      ], competencias, { vazio: 'Nenhuma competência cadastrada.', aoClicar: c => mostrarCompetencia(c.mesAno) });
    }
  }

  // "Documentos de agosto de 2026"
  function mostrarCompetencia(mesAno) {
    UI.$('#titulo-historico').textContent = 'Documentos de ' + Datas.competenciaPorExtenso(mesAno);
    const destino = UI.$('#tabela-historico');
    destino.innerHTML = '<div id="tab-comp"></div><div class="acoes" style="margin-top:14px"><button class="btn" type="button" id="btn-voltar-hist">Voltar ao histórico</button></div>';
    UI.renderTabela(UI.$('#tab-comp'), [
      { titulo: 'Documento', valor: d => UI.esc(d.tipo) },
      { titulo: 'Empresa', valor: d => UI.esc(Nomes.empresa(d.empresaId)) },
      { titulo: 'Competência', valor: d => UI.esc(d.competencia) },
      { titulo: 'Situação', valor: d => UI.status(d.status) }
    ], documentosVisiveis().filter(d => d.competencia === mesAno), {
      vazio: 'Nenhum documento nesta competência.',
      aoClicar: d => { location.href = 'documento.html?id=' + d.id; }
    });
    UI.$('#btn-voltar-hist').addEventListener('click', desenhar);
  }

  function trocarAba(nova) {
    aba = nova;
    history.replaceState(null, '', 'historico.html?aba=' + aba);
    desenhar();
  }

  // Janela "Detalhes do histórico"
  function detalhes(h) {
    const campos = [
      ['Data e hora', Datas.brHora(h.data)],
      ['Usuário', h.usuario],
      ['Ação', h.acao],
      ['Referência', h.referencia],
      ['Tipo', h.tipo === 'verificacao' ? 'Verificação (pré-auditoria)' : 'Atividade']
    ];
    if (h.resultado) campos.push(['Resultado', h.resultado]);
    if (h.detalhes) campos.push(['Detalhes', h.detalhes]);

    const botoes = [{ texto: 'Fechar' }];
    if (h.documentoId && DB.buscar('documentos', h.documentoId)) {
      botoes.push({ texto: 'Abrir documento', classe: 'btn-primario', acao: () => { location.href = 'documento.html?id=' + h.documentoId; } });
    }
    UI.modal({
      titulo: 'Detalhes do histórico',
      corpo: '<dl class="info-grade">' + campos.map(c => '<div><dt>' + c[0] + '</dt><dd>' + UI.esc(c[1]) + '</dd></div>').join('') + '</dl>',
      botoes
    });
  }

  UI.$$('[data-aba]').forEach(b => b.addEventListener('click', () => trocarAba(b.dataset.aba)));
  selUsuario.addEventListener('change', desenhar);

  desenhar();
}
