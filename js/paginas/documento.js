/* =========================================================
   Flow360 — Documento (documento.html?id=N) — T22 a T25
   Ações: registrar recusa, substituir/corrigir, histórico,
   contato com cliente, alterar status, editar dado,
   comparação de documentos e solicitar documento.
   ========================================================= */

let documento = null;

if (Layout.iniciar({ modulo: 'documentos', ativo: 'documentos' })) {
  documento = documentosVisiveis().find(d => d.id === Number(UI.param('id')));

  if (!documento) {
    const existe = DB.buscar('documentos', UI.param('id'));
    UI.$('#conteudo').innerHTML =
      '<div class="cabecalho-pagina"><h1 class="titulo-pagina">' + (existe ? 'Acesso restrito' : 'Documento não encontrado') + '</h1></div>' +
      '<section class="cartao"><p>' + (existe
        ? 'Este documento tem nível de acesso <strong>' + UI.esc(existe.nivelAcesso) + '</strong>, que não é visível para o cargo ' + UI.esc(Sessao.cargo()) + '.'
        : 'O documento não existe.') + '</p>' +
      '<a class="btn" href="documentos.html">Voltar à lista</a></section>';
  } else {
    registrarVisualizacao();
    desenhar();
    UI.$('#btn-versao-anterior').addEventListener('click', consultarVersaoAnterior);
    UI.$('#btn-voltar-doc').addEventListener('click', () => UI.$('#cartao-documento').scrollIntoView({ behavior: 'smooth' }));
  }
}

/* ---------- Utilitários ---------- */
function recarregar() {
  documento = DB.buscar('documentos', documento.id);
  desenhar();
  Layout.atualizarContador();
}

function salvarDocumento(alteracoes) {
  return DB.atualizar('documentos', documento.id, alteracoes) !== null;
}

// Registra no histórico geral já ligado a este documento (RF36 a RF39)
function historicoDoc(acao, complemento) {
  registrarHistorico(acao, documento.tipo + ' • ' + (complemento || documento.competencia), 'atividade',
    { documentoId: documento.id, versao: documento.versoes.length || 0 });
}

// Fecha as pendências abertas deste documento
function resolverPendencias(resolucao) {
  DB.salvar('pendencias', DB.listar('pendencias').map(p =>
    (p.documentoId === documento.id && p.status === 'aberta')
      ? Object.assign(p, { status: 'resolvida', resolvidaEm: Datas.agora(), resolucao }) : p));
}

// Registra "Visualizou o documento" no máximo uma vez a cada 30 minutos (RF38)
function registrarVisualizacao() {
  const usuario = Sessao.usuario().nome;
  const recente = DB.listar('historico').some(h =>
    h.documentoId === documento.id && h.usuario === usuario && h.acao === 'Visualizou o documento' &&
    (Date.now() - new Date(h.data).getTime()) < 30 * 60000);
  if (!recente) historicoDoc('Visualizou o documento');
}

/* ---------- Desenho ---------- */
function desenhar() {
  const unidade = DB.buscar('unidades', documento.unidadeId);
  const versao = versaoAtual(documento);

  document.title = documento.tipo + ' — Flow360';
  UI.$('#titulo-documento').textContent = documento.tipo;
  UI.$('#etiqueta-status').innerHTML = '<span class="etiqueta ' + ({
    'Aprovado': 'sucesso', 'Recusado': 'erro', 'Pendente': 'alerta', 'Aguardando correção': 'alerta'
  }[documento.status] || 'info') + '">' + UI.esc(documento.status) + '</span>';

  const prazo = Datas.br(documento.prazo) + (documento.status !== 'Aprovado' ? ' (' + Datas.textoPrazo(documento.prazo).toLowerCase() + ')' : '');
  const campos = [
    ['Empresa', Nomes.empresa(documento.empresaId)],
    ['Cliente', Nomes.cliente(documento.clienteId)],
    ['Unidade', unidade ? unidade.nome : '—'],
    ['Colaborador', documento.colaboradorId ? Nomes.colaborador(documento.colaboradorId) : '—'],
    ['Competência', documento.competencia],
    ['Vencimento', prazo],
    ['Status', documento.status],
    ['Nível de acesso', documento.nivelAcesso || 'Geral'],
    ['Arquivo', versao ? versao.arquivo.nome + ' (versão ' + versao.versao + ')' : 'Nenhum arquivo enviado']
  ];
  if (documento.observacao) campos.push(['Observação', documento.observacao]);

  UI.$('#detalhes').innerHTML = campos.map((c, i) =>
    '<div class="campo"><label for="det-' + i + '">' + c[0] + '</label>' +
    '<input class="entrada" id="det-' + i + '" readonly value="' + UI.esc(c[1]) + '"></div>').join('');

  desenharAcoes();
  desenharRecusa();
  desenharHistorico();
  desenharVersoes();
  desenharPendencias();
}

function desenharAcoes() {
  const temArquivo = documento.versoes.length > 0;
  const botoes = [
    { texto: 'Registrar recusa', acao: modalRegistrarRecusa, mostrar: Sessao.podeAcao('registrarRecusa') && temArquivo && documento.status !== 'Recusado', classe: 'btn-perigo' },
    { texto: temArquivo ? 'Substituir / corrigir' : 'Anexar documento', icone: 'enviar', acao: modalCorrigir, mostrar: Sessao.podeAcao('corrigir') },
    { texto: 'Histórico do documento', acao: () => UI.$('#cartao-historico').scrollIntoView({ behavior: 'smooth' }), mostrar: true },
    { texto: 'Contato com cliente', acao: modalContato, mostrar: Sessao.podeAcao('contatoCliente') },
    { texto: 'Visualizar arquivo', icone: 'olho', acao: () => UI.visualizarArquivo(versaoAtual(documento) && versaoAtual(documento).arquivo, documento.tipo), mostrar: temArquivo },
    { texto: 'Alterar status', acao: modalAlterarStatus, mostrar: Sessao.podeAcao('alterarStatus') },
    { texto: 'Editar dado do documento', acao: modalEditarDado, mostrar: Sessao.podeAcao('editarDados') },
    { texto: 'Comparação de documentos', acao: modalComparar, mostrar: true },
    { texto: 'Solicitar documento', acao: () => Layout.solicitarAoSetor(documento.tipo), mostrar: Sessao.podeAcao('solicitarDocumento') && documento.status !== 'Aprovado' }
  ].filter(b => b.mostrar);

  criarBotoes(UI.$('#acoes-documento'), botoes);
}

function criarBotoes(area, botoes) {
  area.innerHTML = '';
  botoes.forEach(b => {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'btn ' + (b.classe || '');
    el.innerHTML = (b.icone ? UI.icones[b.icone] : '') + UI.esc(b.texto);
    el.addEventListener('click', b.acao);
    area.appendChild(el);
  });
}

// Cartão "Motivo da recusa" com a origem provável do erro (RF25)
function desenharRecusa() {
  const cartao = UI.$('#cartao-recusa');
  const mostrar = !!documento.motivoRecusa && ['Recusado', 'Aguardando correção'].includes(documento.status);
  cartao.classList.toggle('oculto', !mostrar);
  if (!mostrar) return;

  UI.$('#texto-recusa').textContent = documento.motivoRecusa;
  UI.$('#origem-recusa').innerHTML = documento.origemRecusa === 'Cliente'
    ? 'Origem provável: <strong>Cliente</strong> — os dados e os arquivos estão coerentes com o cadastro. Possível dificuldade de interpretação: solicite esclarecimento com o documento vinculado.'
    : 'Origem provável: <strong>Empresa</strong> — corrija o arquivo e reenvie para análise.';

  const botoes = [{ texto: 'Voltar à lista', acao: () => { location.href = 'documentos.html'; } }];
  if (Sessao.podeAcao('corrigir')) botoes.unshift({ texto: 'Reenviar documento corrigido', icone: 'enviar', classe: 'btn-primario', acao: modalCorrigir });
  if (documento.origemRecusa === 'Cliente' && Sessao.podeAcao('contatoCliente')) botoes.splice(1, 0, { texto: 'Solicitar esclarecimento', acao: modalContato });
  criarBotoes(UI.$('#acoes-recusa'), botoes);
}

function desenharHistorico() {
  const itens = DB.listar('historico').filter(h => h.documentoId === documento.id)
    .sort((a, b) => b.data.localeCompare(a.data));
  UI.$('#ultima-acao-doc').textContent = itens.length
    ? 'Última ação: ' + itens[0].acao + ' — ' + itens[0].usuario + ' (' + Datas.brHora(itens[0].data) + ')'
    : 'Última ação: nenhuma';
  UI.renderTabela(UI.$('#tabela-historico'), [
    { titulo: 'Data e hora', valor: h => Datas.brHora(h.data) },
    { titulo: 'Responsável', valor: h => UI.esc(h.usuario) },
    { titulo: 'Evento', valor: h => UI.esc(h.acao) },
    { titulo: 'Versão', valor: h => h.versao ? String(h.versao) : '—' }
  ], itens, { vazio: 'Sem registros.' });
}

function desenharVersoes() {
  const versoes = documento.versoes.slice().reverse();
  UI.renderTabela(UI.$('#tabela-versoes'), [
    { titulo: 'Versão', valor: v => String(v.versao) },
    { titulo: 'Arquivo', valor: v => UI.esc(v.arquivo.nome) },
    { titulo: 'Enviado em', valor: v => Datas.brHora(v.data) },
    { titulo: 'Ação', valor: () => '<button class="btn-tabela" type="button" data-acao="ver">Visualizar</button>' }
  ], versoes, {
    vazio: 'Nenhum arquivo enviado ainda.',
    acoes: { ver: v => UI.visualizarArquivo(v.arquivo, documento.tipo + ' — versão ' + v.versao) }
  });
}

function desenharPendencias() {
  const pendencias = DB.listar('pendencias').filter(p => p.documentoId === documento.id)
    .sort((a, b) => b.data.localeCompare(a.data));
  UI.renderTabela(UI.$('#tabela-pendencias'), [
    { titulo: 'Origem', valor: p => UI.esc(p.origem) },
    { titulo: 'Motivo', valor: p => UI.esc(p.motivo) },
    { titulo: 'Situação', valor: p => p.status === 'aberta' ? '<span class="texto-erro">Aberta</span>' : '<span class="texto-sucesso">Resolvida</span>' }
  ], pendencias, { vazio: 'Nenhuma pendência para este documento.' });
}

function consultarVersaoAnterior() {
  if (documento.versoes.length < 2) {
    UI.aviso('info', 'Sem versão anterior', 'Este documento ainda tem apenas ' + (documento.versoes.length ? 'a versão 1.' : 'nenhum arquivo enviado.'));
    return;
  }
  const anterior = documento.versoes[documento.versoes.length - 2];
  UI.visualizarArquivo(anterior.arquivo, documento.tipo + ' — versão ' + anterior.versao + ' (' + Datas.brHora(anterior.data) + ')');
}

/* ---------- Alterar status ---------- */
function modalAlterarStatus() {
  UI.modal({
    titulo: 'Alterar status',
    corpo:
      '<p class="cartao-subtitulo">Status atual: ' + UI.status(documento.status) + '</p>' +
      '<div class="campo"><label for="novo-status">Novo status</label>' +
      '<select class="selecao" id="novo-status">' + UI.opcoes(STATUS_DOCUMENTO, documento.status) + '</select></div>',
    botoes: [
      { texto: 'Cancelar' },
      { texto: 'Salvar status', classe: 'btn-primario', acao: m => {
        const novo = UI.$('#novo-status').value;
        if (novo === documento.status) { m.fechar(); return; }
        m.fechar();
        // Recusar exige motivo
        if (novo === 'Recusado') { modalRegistrarRecusa(); return; }

        const anterior = documento.status;
        const alteracoes = { status: novo };
        if (novo !== 'Aguardando correção') { alteracoes.motivoRecusa = ''; alteracoes.origemRecusa = ''; }
        salvarDocumento(alteracoes);
        if (novo === 'Aprovado') resolverPendencias('Documento aprovado pelo cliente.');
        historicoDoc('Alterou o status para ' + novo);
        notificar(documento.tipo + ' (' + documento.competencia + ') mudou para "' + novo + '".', 'documento.html?id=' + documento.id);
        recarregar();

        if (novo === 'Aprovado' && (anterior === 'Aguardando correção' || anterior === 'Recusado')) {
          UI.aviso('sucesso', 'Correção validada', 'O documento corrigido foi aprovado e as pendências foram encerradas.');
        } else {
          UI.toast('Status alterado para ' + novo + '.', 'sucesso');
        }
      } }
    ]
  });
}

/* ---------- Registrar recusa do cliente (RF30 a RF34) ---------- */
function modalRegistrarRecusa() {
  const modal = UI.modal({
    titulo: 'Registrar recusa do cliente',
    corpo:
      '<div class="campo"><label for="motivo-recusa">Motivo da recusa</label>' +
      '<select class="selecao" id="motivo-recusa">' + UI.opcoes(MOTIVOS_RECUSA, '', 'Selecione o motivo') + '</select></div>' +
      '<div class="campo" style="margin-top:12px"><label for="detalhe-recusa">Texto do motivo, como escrito pelo cliente</label>' +
      '<textarea class="entrada" id="detalhe-recusa" placeholder="Ex.: A folha de ponto contém banco de horas, mas a unidade não trabalha com esse modelo."></textarea></div>' +
      '<p class="erro-campo" id="erro-recusa"></p>',
    botoes: [
      { texto: 'Cancelar' },
      { texto: 'Confirmar recusa', classe: 'btn-perigo', acao: m => {
        const selMotivo = UI.$('#motivo-recusa');
        const detalhe = UI.$('#detalhe-recusa').value.trim();
        UI.limparInvalidos(modal.el);
        if (!selMotivo.value || (selMotivo.value === 'Outro motivo' && !detalhe)) {
          UI.marcarInvalido(selMotivo, !selMotivo.value);
          UI.marcarInvalido(UI.$('#detalhe-recusa'), selMotivo.value === 'Outro motivo' && !detalhe);
          UI.$('#erro-recusa').textContent = selMotivo.value ? 'Escreva o motivo informado pelo cliente.' : 'Informe o motivo da recusa.';
          return;
        }
        const motivo = detalhe || selMotivo.value;
        // Sem divergência conhecida, a origem provável é o cliente (T21 — "Recusa sem divergência")
        const origem = selMotivo.value === 'Outro motivo' ? 'Cliente' : 'Empresa';
        const versao = versaoAtual(documento);

        salvarDocumento({ status: 'Recusado', motivoRecusa: motivo, origemRecusa: origem });
        DB.inserir('pendencias', {
          documentoId: documento.id,
          documento: documento.tipo,
          origem: 'Cliente',
          motivo: selMotivo.value === 'Outro motivo' ? motivo : selMotivo.value,
          responsavel: versao ? versao.usuario : 'Ricardo Almeida',
          acao: origem === 'Cliente' ? 'Consultar recusa' : 'Consultar e corrigir',
          status: 'aberta',
          data: Datas.agora()
        });
        historicoDoc('Recusou: ' + (selMotivo.value === 'Outro motivo' ? 'motivo informado pelo cliente' : selMotivo.value.replace(/\.$/, '').toLowerCase()), motivo);
        notificar(documento.tipo + ' recusado pelo cliente. Motivo: ' + motivo, 'documento.html?id=' + documento.id);
        m.fechar();
        recarregar();
        UI.aviso('sucesso', 'Recusa registrada', 'O status mudou para Recusado e o responsável foi notificado sobre a nova pendência.');
      } }
    ]
  });
}

/* ---------- Substituir documento (RF27 e RF35) ---------- */
function modalCorrigir() {
  let arquivoEscolhido = null;
  const modal = UI.modal({
    titulo: documento.versoes.length ? 'Substituir documento' : 'Anexar documento',
    corpo:
      (documento.motivoRecusa ? '<p class="etiqueta erro" style="display:block;margin:0 0 12px">Motivo da recusa: ' + UI.esc(documento.motivoRecusa) + '</p>' : '') +
      '<div class="campo"><span class="rotulo">Versão corrigida</span>' +
      '<div class="acoes"><button class="btn" type="button" id="btn-escolher">' + UI.icones.enviar + 'Selecionar arquivo</button>' +
      '<span class="texto-suave" id="nome-arquivo">Nenhum arquivo selecionado</span></div></div>' +
      '<div class="campo" style="margin-top:12px"><label for="obs-correcao">O que foi corrigido?</label>' +
      '<textarea class="entrada" id="obs-correcao" placeholder="Opcional"></textarea></div>' +
      '<p class="erro-campo" id="erro-correcao"></p>',
    botoes: [
      { texto: 'Cancelar' },
      { texto: 'Reenviar para análise', classe: 'btn-primario', acao: async m => {
        if (!arquivoEscolhido) {
          UI.$('#erro-correcao').textContent = 'Selecione o arquivo corrigido.';
          return;
        }
        if (!/\.(pdf|png|jpe?g)$/i.test(arquivoEscolhido.name)) {
          UI.$('#erro-correcao').textContent = 'Formato não aceito. Envie PDF, PNG ou JPG.';
          return;
        }
        const info = await UI.lerArquivo(arquivoEscolhido);
        const versoes = documento.versoes.concat([{
          versao: documento.versoes.length + 1, arquivo: info, data: Datas.agora(), usuario: Sessao.usuario().nome
        }]);
        const obs = UI.$('#obs-correcao').value.trim();
        const alteracoes = { versoes, status: 'Em análise', motivoRecusa: '', origemRecusa: '', observacao: obs || documento.observacao };
        // Se não couber no localStorage, salva sem a pré-visualização do arquivo
        if (!salvarDocumento(alteracoes)) {
          delete info.conteudo;
          salvarDocumento(alteracoes);
        }
        const tinhaArquivo = documento.versoes.length > 0;
        resolverPendencias('Versão ' + versoes.length + ' reenviada para análise.');
        documento = DB.buscar('documentos', documento.id);
        historicoDoc(tinhaArquivo ? 'Substituiu arquivo incorreto' : 'Anexou o documento', 'versão ' + versoes.length);
        historicoDoc('Reenviou para análise', 'versão ' + versoes.length);
        notificar(documento.tipo + ' foi reenviado (versão ' + versoes.length + ') e aguarda análise.', 'documento.html?id=' + documento.id);
        m.fechar();
        recarregar();
        modalReenviado(versoes.length);
      } }
    ]
  });

  UI.$('#btn-escolher', modal.el).addEventListener('click', async () => {
    const arquivo = await UI.escolherArquivo();
    if (!arquivo) return;
    arquivoEscolhido = arquivo;
    UI.$('#nome-arquivo', modal.el).textContent = arquivo.name + ' • ' + UI.tamanho(arquivo.size);
    UI.$('#erro-correcao', modal.el).textContent = '';
  });
}

// T24: "Documento reenviado"
function modalReenviado(numeroVersao) {
  UI.modal({
    titulo: 'Documento reenviado',
    corpo:
      '<span class="etiqueta info">Em análise</span>' +
      '<h3 style="font-weight:500;margin:12px 0 4px">Versão corrigida enviada ao cliente</h3>' +
      '<p class="cartao-subtitulo">A versão ' + numeroVersao + ' foi enviada. A pendência foi resolvida e o reenvio ficou registrado no histórico.</p>',
    botoes: [
      { texto: 'Consultar documento', acao: m => m.fechar() },
      { texto: 'Ver pendências resolvidas', acao: () => { location.href = 'pendencias.html?aba=resolvidas'; } },
      { texto: 'Consultar histórico', classe: 'btn-primario', acao: m => { m.fechar(); UI.$('#cartao-historico').scrollIntoView({ behavior: 'smooth' }); } }
    ]
  });
}

/* ---------- Editar dado do documento (RF39) ---------- */
function modalEditarDado() {
  const camposEditaveis = [
    { valor: 'competencia', texto: 'Competência' },
    { valor: 'prazo', texto: 'Vencimento' },
    { valor: 'colaboradorId', texto: 'Colaborador' },
    { valor: 'nivelAcesso', texto: 'Nível de acesso' },
    { valor: 'observacao', texto: 'Observação' }
  ];

  const modal = UI.modal({
    titulo: 'Editar dado do documento',
    corpo:
      '<div class="campo"><label for="campo-editar">Selecionar campo</label>' +
      '<select class="selecao" id="campo-editar">' + UI.opcoes(camposEditaveis, '', 'Selecione') + '</select></div>' +
      '<div class="campo" style="margin-top:12px" id="area-valor"></div>' +
      '<p class="erro-campo" id="erro-editar"></p>',
    botoes: [
      { texto: 'Cancelar' },
      { texto: 'Salvar alteração', classe: 'btn-primario', acao: m => {
        const campo = UI.$('#campo-editar').value;
        const entrada = UI.$('#novo-valor');
        if (!campo || !entrada) { UI.$('#erro-editar').textContent = 'Selecione o campo que deseja editar.'; return; }
        let valor = entrada.value.trim();

        if (campo === 'competencia' && !/^(0[1-9]|1[0-2])\/20\d{2}$/.test(valor)) {
          UI.marcarInvalido(entrada, true);
          UI.$('#erro-editar').textContent = 'Use o formato MM/AAAA.';
          return;
        }
        if (campo === 'prazo' && !valor) {
          UI.marcarInvalido(entrada, true);
          UI.$('#erro-editar').textContent = 'Informe a data.';
          return;
        }
        if (campo === 'colaboradorId') valor = valor ? Number(valor) : null;

        const nomeCampo = camposEditaveis.find(c => c.valor === campo).texto;
        salvarDocumento({ [campo]: valor });
        historicoDoc('Editou dado do documento', nomeCampo);
        m.fechar();
        // Ao subir o nível, o documento pode deixar de ser visível para o cargo atual
        if (campo === 'nivelAcesso' && !niveisDoCargo().includes(valor)) {
          UI.aviso('sucesso', 'Alterações salvas', 'O documento passou para o nível ' + UI.esc(valor) + ' e não é mais visível para o seu cargo.', () => { location.href = 'documentos.html'; });
          return;
        }
        recarregar();
        UI.aviso('sucesso', 'Alterações salvas', 'O campo <strong>' + nomeCampo + '</strong> foi atualizado.');
      } }
    ]
  });

  UI.$('#campo-editar', modal.el).addEventListener('change', e => {
    const area = UI.$('#area-valor', modal.el);
    const campo = e.target.value;
    let html = '';
    if (campo === 'competencia') html = '<label for="novo-valor">Nova competência</label><input class="entrada" id="novo-valor" placeholder="MM/AAAA" value="' + UI.esc(documento.competencia) + '">';
    if (campo === 'prazo') html = '<label for="novo-valor">Novo vencimento</label><input class="entrada" type="date" id="novo-valor" value="' + documento.prazo + '">';
    if (campo === 'colaboradorId') html = '<label for="novo-valor">Colaborador</label><select class="selecao" id="novo-valor">' +
      UI.opcoes(DB.listar('colaboradores').filter(c => c.empresaId === documento.empresaId).map(c => ({ valor: c.id, texto: c.nome })), documento.colaboradorId || '', 'Nenhum') + '</select>';
    if (campo === 'nivelAcesso') html = '<label for="novo-valor">Nível de acesso</label><select class="selecao" id="novo-valor">' +
      UI.opcoes(niveisDoCargo(), documento.nivelAcesso || 'Geral') + '</select>';
    if (campo === 'observacao') html = '<label for="novo-valor">Observação</label><textarea class="entrada" id="novo-valor">' + UI.esc(documento.observacao) + '</textarea>';
    area.innerHTML = html;
    const entrada = UI.$('#novo-valor', modal.el);
    if (entrada && campo === 'competencia') UI.mascaraCompetencia(entrada);
    UI.$('#erro-editar', modal.el).textContent = '';
  });
}

/* ---------- Comparação de documentos (T22) ---------- */
// Cruza informações entre dois documentos da mesma unidade e competência
function modalComparar() {
  const outros = documentosVisiveis().filter(d => d.id !== documento.id &&
    d.unidadeId === documento.unidadeId && d.competencia === documento.competencia);
  if (!outros.length) {
    UI.aviso('info', 'Nada para comparar', 'Não há outro documento da ' + UI.esc(Nomes.unidade(documento.unidadeId)) + ' na competência ' + UI.esc(documento.competencia) + '.');
    return;
  }
  // Folha de ponto × folha de pagamento é a comparação mais comum
  const par = { 'Folha de ponto': 'Folha de pagamento', 'Folha de pagamento': 'Folha de ponto' }[documento.tipo];
  const padrao = outros.find(d => d.tipo === par) || outros[0];

  const modal = UI.modal({
    titulo: 'Comparação de documentos',
    largo: true,
    corpo:
      '<div class="campo" style="max-width:360px"><label for="comparar-com">Comparar com</label>' +
      '<select class="selecao" id="comparar-com">' + UI.opcoes(outros.map(d => ({ valor: d.id, texto: d.tipo })), padrao.id) + '</select></div>' +
      '<h3 style="font-weight:500;margin:16px 0 6px" id="titulo-comparacao"></h3>' +
      '<div id="tabela-comparacao"></div>',
    botoes: [{ texto: 'Voltar aos documentos' }]
  });

  const linha = d => {
    const empresa = DB.buscar('empresas', d.empresaId);
    const unidade = DB.buscar('unidades', d.unidadeId);
    return {
      'Empresa / CNPJ': empresa ? empresa.nome : '—',
      'Colaborador': d.colaboradorId ? Nomes.colaborador(d.colaboradorId) : '—',
      'Competência': d.competencia,
      'Horas extras': (d.dados && d.dados.horasExtras) || '—',
      'Banco de horas': (d.dados && d.dados.bancoHoras) || (unidade && unidade.bancoHoras === 'Sim' ? 'Previsto na unidade' : 'Não previsto na unidade')
    };
  };

  function comparar() {
    const outro = outros.find(d => d.id === Number(UI.$('#comparar-com', modal.el).value));
    const a = linha(documento);
    const b = linha(outro);
    UI.$('#titulo-comparacao', modal.el).textContent = documento.tipo + ' × ' + outro.tipo.toLowerCase();

    // Banco de horas só diverge quando um documento tem banco e o outro não
    const temBanco = texto => /contém banco|banco de horas aplicado/i.test(texto);
    const confere = (campo) => {
      if (campo === 'Banco de horas') return temBanco(a[campo]) === temBanco(b[campo]);
      if (a[campo] === '—' || b[campo] === '—') return true;
      return a[campo] === b[campo];
    };
    UI.renderTabela(UI.$('#tabela-comparacao', modal.el), [
      { titulo: 'Informação', valor: c => UI.esc(c) },
      { titulo: documento.tipo, valor: c => UI.esc(a[c]) },
      { titulo: outro.tipo, valor: c => UI.esc(b[c]) },
      { titulo: 'Resultado', valor: c => confere(c) ? '<span class="texto-sucesso">Confere</span>' : '<span class="texto-erro">Diverge</span>' }
    ], Object.keys(a));
    historicoDoc('Comparou com ' + outro.tipo.toLowerCase());
  }

  UI.$('#comparar-com', modal.el).addEventListener('change', comparar);
  comparar();
}

/* ---------- Contato com o cliente (RF54) ---------- */
function modalContato() {
  const cliente = DB.buscar('clientes', documento.clienteId);
  const modal = UI.modal({
    titulo: 'Contato com o cliente',
    corpo:
      '<dl class="info-grade" style="margin-bottom:14px">' +
        '<div><dt>Cliente</dt><dd>' + UI.esc(cliente ? cliente.nome : '—') + '</dd></div>' +
        '<div><dt>Documento vinculado</dt><dd>' + UI.esc(documento.tipo + ' • ' + documento.competencia) + '</dd></div>' +
      '</dl>' +
      '<div class="campo"><label for="assunto-msg">Assunto</label><input class="entrada" id="assunto-msg" value="' + UI.esc('Sobre ' + documento.tipo + ' • ' + documento.competencia) + '"></div>' +
      '<div class="campo" style="margin-top:12px"><label for="texto-msg">Mensagem</label><textarea class="entrada" id="texto-msg" placeholder="Escreva sua mensagem ao cliente"></textarea></div>' +
      '<p class="erro-campo" id="erro-msg"></p>',
    botoes: [
      { texto: 'Fechar' },
      { texto: 'Enviar mensagem', classe: 'btn-primario', acao: m => {
        const texto = UI.$('#texto-msg').value.trim();
        if (!texto) {
          UI.marcarInvalido(UI.$('#texto-msg'), true);
          UI.$('#erro-msg').textContent = 'Escreva a mensagem.';
          return;
        }
        historicoDoc('Enviou mensagem ao cliente', UI.$('#assunto-msg').value.trim());
        m.fechar();
        recarregar();
        UI.aviso('sucesso', 'Mensagem enviada', 'Sua mensagem foi enviada para <strong>' + UI.esc(cliente ? cliente.nome : 'o cliente') + '</strong> e ficou vinculada ao documento.');
      } }
    ]
  });
  UI.$('#texto-msg', modal.el).focus();
}
