/* Flow360 — Relatórios (T06 e T31): RF44 a RF46 */

if (Layout.iniciar({ modulo: 'relatorios', ativo: 'relatorios' })) {
  const documentos = documentosVisiveis();
  const filtros = {
    empresa: UI.$('#r-empresa'),
    competencia: UI.$('#r-competencia'),
    colaborador: UI.$('#r-colaborador'),
    status: UI.$('#r-status'),
    prazo: UI.$('#r-prazo'),
    motivo: UI.$('#r-motivo')
  };
  let resultado = []; // documentos do relatório gerado

  filtros.empresa.innerHTML = UI.opcoes(UI.opcoesDe('empresas'), '', 'Todas as empresas');
  filtros.competencia.innerHTML = UI.opcoes([...new Set(documentos.map(d => d.competencia))].sort().reverse(), '', 'Todas');
  filtros.colaborador.innerHTML = UI.opcoes(UI.opcoesDe('colaboradores'), '', 'Todos');
  filtros.status.innerHTML = UI.opcoes(STATUS_DOCUMENTO, '', 'Todos os status');
  filtros.prazo.innerHTML = UI.opcoes([
    { valor: 'vencidos', texto: 'Vencidos' },
    { valor: 'proximos', texto: 'Vencem em até 5 dias' },
    { valor: 'noprazo', texto: 'No prazo' }
  ], '', 'Todos os prazos');
  filtros.motivo.innerHTML = UI.opcoes([
    { valor: 'com', texto: 'Com motivo de recusa' },
    { valor: 'banco', texto: 'Banco de horas' },
    { valor: 'aviso', texto: 'Aviso prévio' },
    { valor: 'unidade', texto: 'Colaborador de outra unidade' }
  ], '', 'Qualquer motivo');

  UI.$('#btn-exportar').innerHTML = UI.icones.download + 'Exportar relatório';
  UI.$('#btn-imprimir').innerHTML = UI.icones.impressora + 'Imprimir';

  function aplicarFiltros() {
    return documentos.filter(d => {
      const dias = Datas.diasAte(d.prazo);
      const motivo = (d.motivoRecusa || '').toLowerCase();
      if (filtros.empresa.value && d.empresaId !== Number(filtros.empresa.value)) return false;
      if (filtros.competencia.value && d.competencia !== filtros.competencia.value) return false;
      if (filtros.colaborador.value && d.colaboradorId !== Number(filtros.colaborador.value)) return false;
      if (filtros.status.value && d.status !== filtros.status.value) return false;
      if (filtros.prazo.value === 'vencidos' && !(dias < 0 && d.status !== 'Aprovado')) return false;
      if (filtros.prazo.value === 'proximos' && !(dias >= 0 && dias <= 5 && d.status !== 'Aprovado')) return false;
      if (filtros.prazo.value === 'noprazo' && dias < 0) return false;
      if (filtros.motivo.value === 'com' && !motivo) return false;
      if (filtros.motivo.value === 'banco' && !motivo.includes('banco de horas')) return false;
      if (filtros.motivo.value === 'aviso' && !motivo.includes('aviso prévio')) return false;
      if (filtros.motivo.value === 'unidade' && !motivo.includes('outra unidade')) return false;
      return true;
    });
  }

  function resumo(lista) {
    return {
      total: lista.length,
      aprovados: lista.filter(d => d.status === 'Aprovado').length,
      pendentes: lista.filter(d => d.status === 'Pendente').length,
      recusados: lista.filter(d => d.status === 'Recusado').length,
      proximos: lista.filter(d => d.status !== 'Aprovado' && Datas.diasAte(d.prazo) >= 0 && Datas.diasAte(d.prazo) <= 5).length
    };
  }

  // Faixa de indicadores (RF46)
  function desenharResumo(lista) {
    const r = resumo(lista);
    UI.renderTabela(UI.$('#tabela-resumo'), [
      { titulo: 'Documentos totais', valor: x => String(x.total) },
      { titulo: 'Aprovados', valor: x => String(x.aprovados) },
      { titulo: 'Pendentes', valor: x => String(x.pendentes) },
      { titulo: 'Recusados', valor: x => String(x.recusados) },
      { titulo: 'Próximos do prazo', valor: x => String(x.proximos) }
    ], [r]);
  }

  const docColaborador = d => d.tipo + (d.colaboradorId ? ' / ' + Nomes.colaborador(d.colaboradorId) : d.nivelAcesso === 'Diretoria' ? ' / Diretoria' : '');

  // T31: relatório gerado
  function desenharDetalhe() {
    UI.renderTabela(UI.$('#tabela-detalhe'), [
      { titulo: 'Empresa', valor: d => UI.esc(Nomes.empresa(d.empresaId)) },
      { titulo: 'Documento / colaborador', valor: d => UI.esc(docColaborador(d)) },
      { titulo: 'Competência', valor: d => UI.esc(d.competencia) },
      { titulo: 'Prazo', valor: d => Datas.br(d.prazo) },
      { titulo: 'Motivo da recusa', valor: d => UI.esc(d.motivoRecusa || '—') },
      { titulo: 'Situação', valor: d => UI.status(d.status) }
    ], resultado, {
      vazio: 'Nenhum documento atende aos filtros escolhidos.',
      aoClicar: d => { location.href = 'documento.html?id=' + d.id; }
    });
    UI.$('#btn-exportar').disabled = !resultado.length;
    UI.$('#btn-imprimir').disabled = !resultado.length;
  }

  function gerar() {
    resultado = aplicarFiltros().sort((a, b) => a.empresaId - b.empresaId || a.prazo.localeCompare(b.prazo));
    desenharResumo(resultado);
    UI.$('#cartao-gerado').classList.remove('oculto');
    UI.$('#info-gerado').textContent = 'Gerado em ' + Datas.brHora(Datas.agora());
    desenharDetalhe();
    registrarHistorico('Gerou relatório', resultado.length + ' documento(s)');
    UI.$('#cartao-gerado').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function textoFiltros() {
    const partes = Object.values(filtros).filter(s => s.value).map(s => s.labels[0].textContent + ': ' + s.options[s.selectedIndex].text);
    return partes.length ? partes.join(' • ') : 'Sem filtros (todos os documentos)';
  }

  // Exportar relatório em CSV (abre no Excel)
  UI.$('#btn-exportar').addEventListener('click', () => {
    const csv = UI.csv(
      ['Empresa', 'Documento / colaborador', 'Cliente', 'Unidade', 'Competência', 'Prazo', 'Motivo da recusa', 'Situação', 'Responsável pelo envio'],
      resultado.map(d => [
        Nomes.empresa(d.empresaId), docColaborador(d), Nomes.cliente(d.clienteId), Nomes.unidade(d.unidadeId),
        d.competencia, Datas.br(d.prazo), d.motivoRecusa, d.status, versaoAtual(d) ? versaoAtual(d).usuario : ''
      ])
    );
    const nome = 'relatorio-flow360-' + Datas.iso(new Date()) + '.csv';
    UI.baixar(nome, csv, 'text/csv;charset=utf-8');
    registrarHistorico('Exportou relatório', nome + ' • ' + resultado.length + ' documento(s)');
    UI.aviso('sucesso', 'Relatório exportado', 'O arquivo <strong>' + nome + '</strong> foi baixado com ' + resultado.length + ' documento(s).');
  });

  UI.$('#btn-alterar').addEventListener('click', () => {
    UI.$('#form-relatorio').scrollIntoView({ behavior: 'smooth' });
    filtros.empresa.focus();
  });

  // Prévia de impressão com opção de salvar como PDF
  UI.$('#btn-imprimir').addEventListener('click', () => {
    const r = resumo(resultado);
    const usuario = Sessao.usuario();
    const linhas = resultado.map(d =>
      '<tr><td>' + UI.esc(Nomes.empresa(d.empresaId)) + '</td><td>' + UI.esc(docColaborador(d)) + '</td><td>' + UI.esc(d.competencia) +
      '</td><td>' + Datas.br(d.prazo) + '</td><td>' + UI.esc(d.motivoRecusa || '—') + '</td><td>' + UI.esc(d.status) + '</td></tr>').join('');

    UI.modal({
      titulo: 'Impressão preparada',
      largo: true,
      corpo:
        '<div class="previa-impressao area-impressao">' +
          '<h2 class="logo" style="display:inline-block"><span>Flow</span>360</h2>' +
          '<h3 style="font-weight:500">Situação documental</h3>' +
          '<p class="texto-suave">Emitido em ' + Datas.brHora(Datas.agora()) + ' por ' + UI.esc(usuario.nome) + ' (' + UI.esc(Sessao.cargo()) + ')<br>' + UI.esc(textoFiltros()) + '</p>' +
          '<p><strong>Totais:</strong> ' + r.total + ' documento(s) • ' + r.aprovados + ' aprovado(s) • ' + r.pendentes + ' pendente(s) • ' + r.recusados + ' recusado(s) • ' + r.proximos + ' próximo(s) do prazo</p>' +
          '<table class="tabela"><thead><tr><th>Empresa</th><th>Documento / colaborador</th><th>Competência</th><th>Prazo</th><th>Motivo da recusa</th><th>Situação</th></tr></thead><tbody>' + linhas + '</tbody></table>' +
        '</div>',
      botoes: [
        { texto: 'Fechar' },
        { texto: 'Salvar como PDF', classe: 'btn-primario', acao: () => {
          registrarHistorico('Imprimiu relatório', resultado.length + ' documento(s)');
          UI.toast('Na janela de impressão, escolha "Salvar como PDF".');
          window.print();
        } }
      ]
    });
  });

  UI.$('#form-relatorio').addEventListener('submit', e => { e.preventDefault(); gerar(); });
  UI.$('#btn-limpar').addEventListener('click', () => {
    Object.values(filtros).forEach(s => { s.value = ''; });
    desenharResumo(documentos);
    UI.$('#cartao-gerado').classList.add('oculto');
  });

  desenharResumo(documentos);
}
