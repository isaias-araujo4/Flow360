/* Flow360 — Prazos e alertas (T28): RF40 a RF43 */

if (Layout.iniciar({ modulo: 'pendencias', ativo: 'pendencias' })) {
  const abertos = documentosVisiveis().filter(d => d.status !== 'Aprovado');
  const abrir = d => { location.href = 'documento.html?id=' + d.id; };
  if (!Sessao.pode('enviar')) UI.$('#btn-enviar').remove();

  const colunas = classe => [
    { titulo: 'Documento', valor: d => UI.esc(d.tipo) },
    { titulo: 'Empresa', valor: d => UI.esc(Nomes.empresa(d.empresaId)) },
    { titulo: 'Prazo', valor: d => Datas.br(d.prazo) },
    { titulo: 'Alerta', valor: d => '<span class="' + classe + '">' + Datas.textoPrazo(d.prazo) + '</span>' }
  ];

  // Próximos do vencimento: vencem nos próximos 7 dias
  const proximos = abertos.filter(d => Datas.diasAte(d.prazo) >= 0 && Datas.diasAte(d.prazo) <= 7)
    .sort((a, b) => a.prazo.localeCompare(b.prazo));
  UI.renderTabela(UI.$('#tabela-proximos'), colunas('vence'), proximos,
    { vazio: 'Nenhum documento vence nos próximos 7 dias.', aoClicar: abrir });

  // Vencidos
  const vencidos = abertos.filter(d => Datas.diasAte(d.prazo) < 0)
    .sort((a, b) => a.prazo.localeCompare(b.prazo));
  UI.renderTabela(UI.$('#tabela-vencidos'), colunas('vencido'), vencidos,
    { vazio: 'Nenhum documento vencido.', aoClicar: abrir });

  // Prazo de envio por competência (cadastrado em Competências)
  const competencias = DB.listar('competencias').slice().sort((a, b) => b.prazo.localeCompare(a.prazo));
  UI.renderTabela(UI.$('#tabela-competencias'), [
    { titulo: 'Competência', valor: c => UI.esc(c.mesAno) },
    { titulo: 'Prazo de envio', valor: c => Datas.br(c.prazo) },
    { titulo: 'Situação', valor: c => {
      const dias = Datas.diasAte(c.prazo);
      return dias < 0 ? '<span class="texto-suave">Encerrado há ' + Math.abs(dias) + ' dia(s)</span>' : '<span class="vence">Faltam ' + dias + ' dia(s)</span>';
    } }
  ], competencias, { vazio: 'Nenhuma competência cadastrada.' });
}
