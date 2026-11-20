/* Flow360 — Painel geral */

if (Layout.iniciar({ modulo: 'painel', ativo: 'painel' })) {
  const documentos = documentosVisiveis();
  const naoAprovado = d => d.status !== 'Aprovado';

  // Botão "Enviar documentação" só aparece para quem pode enviar
  const btnEnviar = UI.$('#btn-enviar');
  if (Sessao.pode('enviar')) {
    btnEnviar.querySelector('.icone-btn').outerHTML = UI.icones.mais;
  } else {
    btnEnviar.remove();
  }

  // Números do topo
  const proximos = documentos.filter(d => naoAprovado(d) && Datas.diasAte(d.prazo) >= 0 && Datas.diasAte(d.prazo) <= 5);
  const vencidos = documentos.filter(d => naoAprovado(d) && Datas.diasAte(d.prazo) < 0);

  UI.$('#total-documentos').textContent = documentos.length;
  UI.$('#qtd-proximos').textContent = proximos.length;
  UI.$('#qtd-aprovados').textContent = documentos.filter(d => d.status === 'Aprovado').length;
  UI.$('#qtd-pendentes').textContent = documentos.filter(d => d.status === 'Pendente').length;
  UI.$('#qtd-recusados').textContent = documentos.filter(d => d.status === 'Recusado').length;

  // Tabelas de alertas
  const abrirDocumento = d => { location.href = 'documento.html?id=' + d.id; };
  const colunasAlerta = classe => [
    { titulo: 'Documento', valor: d => UI.esc(d.tipo) },
    { titulo: 'Empresa', valor: d => UI.esc(Nomes.empresa(d.empresaId)) },
    { titulo: 'Prazo', valor: d => '<span class="' + classe + '">' + Datas.textoPrazo(d.prazo) + '</span>' }
  ];

  proximos.sort((a, b) => a.prazo.localeCompare(b.prazo));
  vencidos.sort((a, b) => a.prazo.localeCompare(b.prazo));

  UI.renderTabela(UI.$('#alertas-proximos'), colunasAlerta('vence'), proximos.slice(0, 5),
    { vazio: 'Nenhum documento vence nos próximos 5 dias.', aoClicar: abrirDocumento });
  UI.renderTabela(UI.$('#alertas-vencidos'), colunasAlerta('vencido'), vencidos.slice(0, 5),
    { vazio: 'Nenhum documento vencido.', aoClicar: abrirDocumento });

  // Prazos de envio das competências que ainda não venceram
  const competencias = DB.listar('competencias')
    .filter(c => Datas.diasAte(c.prazo) >= 0)
    .sort((a, b) => a.prazo.localeCompare(b.prazo));

  UI.renderTabela(UI.$('#alertas-prazos'), [
    { titulo: 'Competência', valor: c => 'Competência ' + UI.esc(c.mesAno) },
    { titulo: 'Envio', valor: c => 'Envio até ' + Datas.br(c.prazo) },
    { titulo: 'Faltam', valor: c => '<span class="vence">faltam ' + Datas.diasAte(c.prazo) + ' dia(s)</span>' }
  ], competencias, { vazio: 'Nenhum prazo de envio em aberto.', aoClicar: () => { location.href = 'prazos.html'; } });

  // Pendências abertas
  const pendencias = pendenciasVisiveis().filter(p => p.status === 'aberta')
    .sort((a, b) => b.data.localeCompare(a.data));

  UI.renderTabela(UI.$('#lista-pendencias'), [
    { titulo: 'Documento', valor: p => UI.esc(p.documento) },
    { titulo: 'Motivo', valor: p => UI.esc(p.origem === 'Cliente' ? 'Recusa do cliente' : p.motivo) },
    { titulo: 'Data', valor: p => Datas.brHora(p.data) }
  ], pendencias.slice(0, 5), {
    vazio: 'Nenhuma pendência aberta.',
    aoClicar: p => { location.href = p.documentoId ? 'documento.html?id=' + p.documentoId : 'pendencias.html'; }
  });
}
