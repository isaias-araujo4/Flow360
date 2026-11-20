/* Flow360 — Documentos (lista com filtros) */

const OPCOES_PRAZO = [
  { valor: 'vencidos', texto: 'Vencidos' },
  { valor: 'proximos', texto: 'Vencem em até 5 dias' },
  { valor: 'noprazo', texto: 'No prazo' }
];

if (Layout.iniciar({ modulo: 'documentos', ativo: 'documentos' })) {
  const documentos = documentosVisiveis();
  const fEmpresa = UI.$('#f-empresa');
  const fCompetencia = UI.$('#f-competencia');
  const fColaborador = UI.$('#f-colaborador');
  const fStatus = UI.$('#f-status');
  const fPrazo = UI.$('#f-prazo');

  // Opções dos filtros
  const competencias = [...new Set(documentos.map(d => d.competencia))].sort().reverse();
  fEmpresa.innerHTML = UI.opcoes(UI.opcoesDe('empresas'), '', 'Todas as empresas');
  fCompetencia.innerHTML = UI.opcoes(competencias, '', 'Todas');
  fColaborador.innerHTML = UI.opcoes(UI.opcoesDe('colaboradores'), '', 'Todos');
  fStatus.innerHTML = UI.opcoes(STATUS_DOCUMENTO, '', 'Todos os status');
  fPrazo.innerHTML = UI.opcoes(OPCOES_PRAZO, '', 'Todos os prazos');

  // Filtros vindos do painel (ex.: documentos.html?status=Recusado)
  if (UI.param('status')) fStatus.value = UI.param('status');
  if (UI.param('prazo')) fPrazo.value = UI.param('prazo');
  if (UI.param('competencia')) fCompetencia.value = UI.param('competencia');

  function filtrar() {
    const dias = d => Datas.diasAte(d.prazo);
    const lista = documentos.filter(d => {
      if (fEmpresa.value && d.empresaId !== Number(fEmpresa.value)) return false;
      if (fCompetencia.value && d.competencia !== fCompetencia.value) return false;
      if (fColaborador.value && d.colaboradorId !== Number(fColaborador.value)) return false;
      if (fStatus.value && d.status !== fStatus.value) return false;
      if (fPrazo.value === 'vencidos' && !(dias(d) < 0 && d.status !== 'Aprovado')) return false;
      if (fPrazo.value === 'proximos' && !(dias(d) >= 0 && dias(d) <= 5 && d.status !== 'Aprovado')) return false;
      if (fPrazo.value === 'noprazo' && dias(d) < 0) return false;
      return true;
    }).sort((a, b) => b.competencia.split('/').reverse().join('').localeCompare(a.competencia.split('/').reverse().join('')) || a.prazo.localeCompare(b.prazo));

    UI.$('#contagem').textContent = lista.length + ' de ' + documentos.length + ' documento(s)';

    UI.renderTabela(UI.$('#tabela-documentos'), [
      { titulo: 'Documento', valor: d => UI.esc(d.tipo) },
      { titulo: 'Empresa', valor: d => UI.esc(Nomes.empresa(d.empresaId)) },
      { titulo: 'Colaborador', valor: d => d.colaboradorId ? UI.esc(Nomes.colaborador(d.colaboradorId)) : '—' },
      { titulo: 'Competência', valor: d => UI.esc(d.competencia) },
      { titulo: 'Prazo', valor: d => Datas.br(d.prazo) },
      { titulo: 'Status', valor: d => UI.status(d.status) }
    ], lista, {
      vazio: 'Nenhum documento encontrado com esses filtros.',
      aoClicar: d => { location.href = 'documento.html?id=' + d.id; }
    });
  }

  UI.$('#form-filtros').addEventListener('submit', e => { e.preventDefault(); filtrar(); });
  UI.$('#btn-limpar').addEventListener('click', () => {
    [fEmpresa, fCompetencia, fColaborador, fStatus, fPrazo].forEach(s => { s.value = ''; });
    history.replaceState(null, '', 'documentos.html');
    filtrar();
  });

  filtrar();
}
