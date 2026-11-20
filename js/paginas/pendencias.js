/* Flow360 — Pendências (abertas, resolvidas e todas) */

if (Layout.iniciar({ modulo: 'pendencias', ativo: 'pendencias' })) {
  let aba = ['abertas', 'resolvidas', 'todas'].includes(UI.param('aba')) ? UI.param('aba') : 'abertas';
  const fOrigem = UI.$('#f-origem');
  const fMotivo = UI.$('#f-motivo');
  const podeResolver = Sessao.podeAcao('alterarStatus');

  function preencherFiltros() {
    const todas = pendenciasVisiveis();
    const origens = [...new Set(todas.map(p => p.origem))].sort();
    const motivos = [...new Set(todas.map(p => p.motivo))].sort();
    fOrigem.innerHTML = UI.opcoes(origens, fOrigem.value, 'Todas as origens');
    fMotivo.innerHTML = UI.opcoes(motivos, fMotivo.value, 'Qualquer motivo');
  }

  function desenhar() {
    UI.$$('[data-aba]').forEach(b => {
      b.classList.toggle('ativo', b.dataset.aba === aba);
      b.setAttribute('aria-selected', b.dataset.aba === aba);
    });
    UI.$('#titulo-lista').textContent = { abertas: 'Pendências abertas', resolvidas: 'Resolvidas', todas: 'Acompanhamento da resolução' }[aba];

    const lista = pendenciasVisiveis()
      .filter(p => aba === 'todas' || (aba === 'abertas' ? p.status === 'aberta' : p.status === 'resolvida'))
      .filter(p => !fOrigem.value || p.origem === fOrigem.value)
      .filter(p => !fMotivo.value || p.motivo === fMotivo.value)
      .sort((a, b) => b.data.localeCompare(a.data));

    let colunas;
    if (aba === 'abertas') {
      // T05
      colunas = [
        { titulo: 'Documento', valor: p => UI.esc(p.documento) },
        { titulo: 'Origem', valor: p => UI.esc(p.origem) },
        { titulo: 'Motivo da pendência', valor: p => UI.esc(p.motivo) },
        { titulo: 'Responsável', valor: p => UI.esc(p.responsavel) },
        { titulo: 'Ação', valor: p =>
          '<button class="btn-tabela" type="button" data-acao="executar">' + UI.esc(p.acao) + '</button>' +
          (podeResolver ? ' <button class="btn-tabela" type="button" data-acao="resolver">Resolver</button>' : '') }
      ];
    } else if (aba === 'resolvidas') {
      // T29
      colunas = [
        { titulo: 'Documento', valor: p => UI.esc(p.documento) },
        { titulo: 'Responsável', valor: p => UI.esc(p.responsavel) },
        { titulo: 'Resolução', valor: p => UI.esc(p.resolucao || 'Pendência resolvida.') },
        { titulo: 'Data', valor: p => Datas.brHora(p.resolvidaEm || p.data) }
      ];
    } else {
      // T30
      colunas = [
        { titulo: 'Documento', valor: p => UI.esc(p.documento) },
        { titulo: 'Motivo', valor: p => UI.esc(p.motivo) },
        { titulo: 'Situação', valor: p => p.status === 'aberta' ? '<span class="texto-erro">Aberta</span>' : '<span class="texto-sucesso">Resolvida</span>' }
      ];
    }

    UI.renderTabela(UI.$('#tabela-pendencias'), colunas, lista, {
      vazio: aba === 'abertas' ? 'Nenhuma pendência aberta. Tudo em dia!' : aba === 'resolvidas' ? 'Não há pendências resolvidas.' : 'Nenhuma pendência encontrada.',
      acoes: { executar, resolver },
      aoClicar: aba === 'abertas' ? null : abrir
    });
  }

  function abrir(p) {
    if (p.documentoId) location.href = 'documento.html?id=' + p.documentoId;
  }

  // Cada tipo de ação leva para o lugar certo
  function executar(p) {
    if (p.acao === 'Anexar documento' && Sessao.pode('enviar')) {
      location.href = 'enviar.html' + (p.documentoId ? '?documento=' + p.documentoId : '');
    } else {
      abrir(p);
    }
  }

  function resolver(p) {
    const modal = UI.modal({
      titulo: 'Resolver pendência',
      corpo:
        '<p class="cartao-subtitulo"><strong>' + UI.esc(p.documento) + '</strong> — ' + UI.esc(p.motivo) + '</p>' +
        '<div class="campo"><label for="texto-resolucao">Como foi resolvida?</label>' +
        '<textarea class="entrada" id="texto-resolucao" placeholder="Ex.: Arquivo substituído e conferido."></textarea></div>' +
        '<p class="erro-campo" id="erro-resolucao"></p>',
      botoes: [
        { texto: 'Cancelar' },
        { texto: 'Resolver', classe: 'btn-primario', acao: m => {
          const texto = UI.$('#texto-resolucao', modal.el).value.trim();
          if (!texto) {
            UI.marcarInvalido(UI.$('#texto-resolucao', modal.el), true);
            UI.$('#erro-resolucao', modal.el).textContent = 'Descreva a resolução.';
            return;
          }
          DB.atualizar('pendencias', p.id, { status: 'resolvida', resolvidaEm: Datas.agora(), resolucao: texto });
          registrarHistorico('Resolveu pendência', p.documento + ' • ' + texto, 'atividade', { documentoId: p.documentoId });
          m.fechar();
          preencherFiltros();
          desenhar();
          UI.toast('Pendência resolvida.', 'sucesso');
        } }
      ]
    });
  }

  UI.$$('[data-aba]').forEach(b => b.addEventListener('click', () => {
    aba = b.dataset.aba;
    history.replaceState(null, '', 'pendencias.html?aba=' + aba);
    desenhar();
  }));
  fOrigem.addEventListener('change', desenhar);
  fMotivo.addEventListener('change', desenhar);

  preencherFiltros();
  desenhar();
}
