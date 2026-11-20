/* Flow360 — Notificações (lista completa) */

if (Layout.iniciar({ ativo: '' })) {
  let filtro = 'todas';

  function desenhar() {
    UI.$$('[data-filtro]').forEach(b => b.classList.toggle('ativo', b.dataset.filtro === filtro));
    const lista = DB.listar('notificacoes')
      .filter(n => filtro === 'todas' || (filtro === 'lidas' ? n.lida : !n.lida))
      .sort((a, b) => b.data.localeCompare(a.data));

    const area = UI.$('#lista-notificacoes');
    area.innerHTML = lista.length ? lista.map(Layout.htmlNotificacao).join('') :
      '<p class="vazio">' + (filtro === 'naolidas' ? 'Você leu todas as notificações.' : 'Nenhuma notificação.') + '</p>';
    UI.$$('[data-notificacao]', area).forEach(b =>
      b.addEventListener('click', () => Layout.abrirNotificacao(Number(b.dataset.notificacao))));
    UI.$('#btn-marcar').disabled = !DB.listar('notificacoes').some(n => !n.lida);
  }

  UI.$('#btn-marcar').addEventListener('click', () => {
    Layout.marcarTodasLidas();
    desenhar();
  });
  UI.$$('[data-filtro]').forEach(b => b.addEventListener('click', () => { filtro = b.dataset.filtro; desenhar(); }));

  desenhar();
}
