/* =========================================================
   Flow360 — Enviar documentação (T03, T16 a T21)
   Etapas: 1. Documentos (seleção da operação + anexos)
           2. Pré-auditoria (verificações automáticas)
           3. Envio (T19) ou Documentação preparada (T20)
   O andamento fica salvo em "rascunhoEnvio" no localStorage,
   então dá para recarregar a página sem perder os anexos.
   ========================================================= */

function rascunhoVazio() {
  return { etapa: 'documentos', unidadeId: '', competencia: '', situacao: '', colaboradorId: '', anexos: {}, auditoria: null, alterado: false, envioId: null };
}

let rascunho = DB.ler('rascunhoEnvio') || rascunhoVazio();

if (Layout.iniciar({ modulo: 'enviar', ativo: 'enviar' })) {
  preencherPeloDocumento();
  ligarEventos();
  desenhar();
  if (rascunho.etapa === 'auditoria' && !rascunho.auditoria) rodarAuditoria();
}

/* ---------- Salvar rascunho ---------- */
function salvarRascunho() {
  if (!DB.salvar('rascunhoEnvio', rascunho)) {
    // Sem espaço no localStorage: guarda só nome/tamanho dos arquivos
    Object.values(rascunho.anexos).forEach(a => delete a.conteudo);
    DB.salvar('rascunhoEnvio', rascunho);
    UI.toast('Sem espaço para a pré-visualização do arquivo. Os dados do anexo foram mantidos.');
  }
}

/* ---------- Vindo de uma pendência: enviar.html?documento=ID ---------- */
function preencherPeloDocumento() {
  const doc = DB.buscar('documentos', UI.param('documento'));
  if (!doc) return;
  rascunho = rascunhoVazio();
  rascunho.unidadeId = String(doc.unidadeId);
  rascunho.competencia = doc.competencia;
  rascunho.situacao = doc.colaboradorId ? 'Kit demissional' : 'Documentação mensal';
  rascunho.colaboradorId = doc.colaboradorId ? String(doc.colaboradorId) : '';
  salvarRascunho();
  history.replaceState(null, '', 'enviar.html');
}

/* ---------- Dados derivados da seleção ---------- */
function vinculo() {
  const unidade = DB.buscar('unidades', rascunho.unidadeId);
  if (!unidade) return null;
  const regional = DB.buscar('regionais', unidade.regionalId);
  return {
    unidade,
    regional,
    empresa: DB.buscar('empresas', unidade.empresaId),
    cliente: regional ? DB.buscar('clientes', regional.clienteId) : null
  };
}

function precisaColaborador() {
  return rascunho.situacao === 'Kit demissional';
}

function selecaoCompleta() {
  return rascunho.unidadeId && rascunho.competencia && rascunho.situacao && (!precisaColaborador() || rascunho.colaboradorId);
}

// Regra de documentos obrigatórios (a regra do colaborador tem prioridade)
function regraAtual() {
  const v = vinculo();
  if (!v || !v.cliente || !rascunho.situacao) return null;
  const regras = DB.listar('regras').filter(r => r.clienteId === v.cliente.id && r.situacao === rascunho.situacao);
  return regras.find(r => r.colaboradorId && r.colaboradorId === Number(rascunho.colaboradorId)) ||
    regras.find(r => !r.colaboradorId) || null;
}

// Empresa, cliente, regional e unidade precisam ser da mesma operação
function problemaDeVinculo() {
  const v = vinculo();
  if (!v.regional || !v.cliente) return 'A unidade não está ligada a uma regional e a um cliente.';
  if (v.regional.empresaId !== v.unidade.empresaId) return 'A ' + v.unidade.nome + ' é da ' + Nomes.empresa(v.unidade.empresaId) + ', mas a ' + v.regional.nome + ' é da ' + Nomes.empresa(v.regional.empresaId) + '.';
  if (!v.cliente.empresas.includes(v.unidade.empresaId)) return 'A ' + Nomes.empresa(v.unidade.empresaId) + ' não está vinculada ao ' + v.cliente.nome + '.';
  if (precisaColaborador()) {
    const colaborador = DB.buscar('colaboradores', rascunho.colaboradorId);
    if (colaborador && colaborador.unidadeId !== v.unidade.id) return colaborador.nome + ' não pertence à ' + v.unidade.nome + '.';
  }
  return '';
}

/* ---------- Eventos ---------- */
function ligarEventos() {
  UI.$('#sel-unidade').addEventListener('change', e => {
    rascunho.unidadeId = e.target.value;
    rascunho.colaboradorId = '';
    selecaoMudou();
  });
  UI.$('#sel-competencia').addEventListener('change', e => { rascunho.competencia = e.target.value; selecaoMudou(); });
  UI.$('#sel-situacao').addEventListener('change', e => {
    rascunho.situacao = e.target.value;
    if (!precisaColaborador()) rascunho.colaboradorId = '';
    selecaoMudou();
  });
  UI.$('#sel-colaborador').addEventListener('change', e => { rascunho.colaboradorId = e.target.value; selecaoMudou(); });

  UI.$('#btn-auditar').addEventListener('click', iniciarAuditoria);
  UI.$('#btn-limpar').addEventListener('click', async () => {
    if (await UI.confirmar('Limpar envio', 'Os arquivos anexados e a seleção atual serão descartados.', 'Limpar', true)) {
      rascunho = rascunhoVazio();
      salvarRascunho();
      desenhar();
    }
  });
}

function selecaoMudou() {
  // Remove anexos que não fazem parte da nova regra
  const regra = regraAtual();
  if (regra) {
    Object.keys(rascunho.anexos).forEach(tipo => {
      if (!regra.documentos.includes(tipo)) delete rascunho.anexos[tipo];
    });
  }
  rascunho.alterado = !!rascunho.auditoria;
  salvarRascunho();
  desenhar();
}

/* ---------- Desenho geral ---------- */
function desenhar() {
  const ordem = ['documentos', 'auditoria', 'enviado'];
  const atual = ordem.indexOf(rascunho.etapa);
  UI.$$('.etapa').forEach(li => {
    const i = ordem.indexOf(li.dataset.etapa);
    li.className = 'etapa' + (i < atual || rascunho.etapa === 'enviado' ? ' feita' : i === atual ? ' atual' : '');
  });

  const envio = rascunho.envioId ? DB.buscar('envios', rascunho.envioId) : null;
  UI.$('#titulo-envio').textContent =
    rascunho.etapa === 'auditoria' ? 'Pré-auditoria' :
    rascunho.etapa === 'enviado' ? (envio && envio.preparado ? 'Documentação preparada' : 'Envio') : 'Enviar Documentação';

  UI.$('#etapa-documentos').classList.toggle('oculto', rascunho.etapa !== 'documentos');
  UI.$('#etapa-auditoria').classList.toggle('oculto', rascunho.etapa !== 'auditoria');
  UI.$('#etapa-enviado').classList.toggle('oculto', rascunho.etapa !== 'enviado');

  if (rascunho.etapa === 'documentos') {
    desenharSelecao();
    desenharAnexos();
  } else if (rascunho.etapa === 'auditoria' && rascunho.auditoria) {
    desenharResultado();
  } else if (rascunho.etapa === 'enviado') {
    desenharEnvio();
  }
}

/* ---------- Etapa 1: seleção da operação ---------- */
function desenharSelecao() {
  const unidades = DB.listar('unidades').map(u => ({ valor: u.id, texto: u.nome + ' — ' + Nomes.empresa(u.empresaId) }));
  const competencias = DB.listar('competencias').slice().sort((a, b) => b.prazo.localeCompare(a.prazo)).map(c => c.mesAno);
  const colaboradores = DB.listar('colaboradores')
    .filter(c => c.unidadeId === Number(rascunho.unidadeId))
    .map(c => ({ valor: c.id, texto: c.nome }));

  const selUnidade = UI.$('#sel-unidade');
  const selCompetencia = UI.$('#sel-competencia');
  const selSituacao = UI.$('#sel-situacao');
  const selColaborador = UI.$('#sel-colaborador');

  selUnidade.innerHTML = UI.opcoes(unidades, rascunho.unidadeId, 'Selecione');
  selCompetencia.innerHTML = UI.opcoes(competencias, rascunho.competencia, 'Selecione');
  selSituacao.innerHTML = UI.opcoes(SITUACOES, rascunho.situacao, 'Selecione');
  selColaborador.innerHTML = UI.opcoes(colaboradores, rascunho.colaboradorId, colaboradores.length ? 'Selecione' : 'Nenhum colaborador nesta unidade');

  // Cada campo só libera depois do anterior
  selCompetencia.disabled = !rascunho.unidadeId;
  selSituacao.disabled = !rascunho.competencia;
  UI.$('#campo-colaborador').classList.toggle('oculto', !precisaColaborador());

  // Etiquetas com o vínculo da unidade escolhida
  const v = vinculo();
  const chips = UI.$('#chips-vinculo');
  if (!v) { chips.innerHTML = ''; return; }
  const comp = DB.listar('competencias').find(c => c.mesAno === rascunho.competencia);
  const itens = [
    'empresa: ' + (v.empresa ? v.empresa.nome : '—'),
    'cliente: ' + (v.cliente ? v.cliente.nome : '—'),
    'regional: ' + (v.regional ? v.regional.nome : '—'),
    'unidade: ' + v.unidade.nome,
    'contrato: ' + v.unidade.contrato,
    'banco de horas: ' + (v.unidade.bancoHoras === 'Sim' ? 'sim' : 'não')
  ];
  if (comp) itens.push('competência: ' + comp.mesAno + ' • envio até ' + Datas.br(comp.prazo));
  chips.innerHTML = itens.map(t => '<span class="chip">' + UI.esc(t) + '</span>').join('');
}

/* ---------- Etapa 1: anexos ---------- */
function desenharAnexos() {
  const cartao = UI.$('#cartao-anexos');
  cartao.classList.toggle('oculto', !selecaoCompleta());
  if (!selecaoCompleta()) return;

  const regra = regraAtual();
  const lista = UI.$('#lista-anexos');
  const botaoAuditar = UI.$('#btn-auditar');
  UI.$('#aviso-alteracao').classList.toggle('oculto', !rascunho.alterado);

  if (!regra) {
    const v = vinculo();
    UI.$('#titulo-anexos').textContent = 'Documentos obrigatórios não configurados';
    lista.innerHTML =
      '<div class="etiqueta erro" style="display:block;padding:14px">' +
      'Não há documentos obrigatórios cadastrados para <strong>' + UI.esc(v.cliente ? v.cliente.nome : 'este cliente') +
      '</strong> na situação <strong>' + UI.esc(rascunho.situacao) + '</strong>. ' +
      (Sessao.pode('cadastros') ? '<a href="documentos-obrigatorios.html">Configurar documentos</a>.' : 'Peça a um analista para configurar a regra.') +
      '</div>';
    botaoAuditar.disabled = true;
    return;
  }

  botaoAuditar.disabled = false;
  UI.$('#titulo-anexos').textContent = 'Documentos obrigatórios • ' + rascunho.situacao;

  lista.innerHTML = regra.documentos.map((tipo, i) => {
    const arq = rascunho.anexos[tipo];
    return '<div class="anexo" data-tipo="' + UI.esc(tipo) + '">' +
      '<span class="anexo-nome">' + (i + 1) + '. ' + UI.esc(tipo) + '</span>' +
      '<span class="anexo-arquivo' + (arq ? ' ok' : '') + '">' +
        (arq ? '✓ ' + UI.esc(arq.nome) + ' • ' + UI.tamanho(arq.tamanho) : 'Não anexado — arraste o arquivo aqui ou clique em anexar') +
      '</span>' +
      '<div class="acoes">' +
        '<button class="btn" type="button" data-anexar>' + UI.icones.enviar + (arq ? 'Substituir' : 'Anexar') + '</button>' +
        (arq ? '<button class="btn" type="button" data-ver>' + UI.icones.olho + 'Ver</button>' +
               '<button class="btn btn-perigo" type="button" data-remover>Remover</button>' : '') +
      '</div>' +
    '</div>';
  }).join('');

  UI.$$('.anexo', lista).forEach(linha => {
    const tipo = linha.dataset.tipo;
    linha.querySelector('[data-anexar]').addEventListener('click', async () => {
      const arquivo = await UI.escolherArquivo();
      if (arquivo) anexar(tipo, arquivo);
    });
    const ver = linha.querySelector('[data-ver]');
    if (ver) ver.addEventListener('click', () => UI.visualizarArquivo(rascunho.anexos[tipo], tipo));
    const remover = linha.querySelector('[data-remover]');
    if (remover) remover.addEventListener('click', () => {
      delete rascunho.anexos[tipo];
      rascunho.alterado = !!rascunho.auditoria;
      salvarRascunho();
      desenharAnexos();
    });

    // Arrastar e soltar
    linha.addEventListener('dragover', e => { e.preventDefault(); linha.style.background = 'var(--azul-suave)'; });
    linha.addEventListener('dragleave', () => { linha.style.background = ''; });
    linha.addEventListener('drop', e => {
      e.preventDefault();
      linha.style.background = '';
      if (e.dataTransfer.files[0]) anexar(tipo, e.dataTransfer.files[0]);
    });
  });
}

async function anexar(tipo, arquivo) {
  rascunho.anexos[tipo] = await UI.lerArquivo(arquivo);
  rascunho.alterado = !!rascunho.auditoria;
  salvarRascunho();
  desenharAnexos();
  UI.toast('Arquivo anexado em ' + tipo + '.', 'sucesso');
}

/* ---------- Etapa 2: pré-auditoria ---------- */
function iniciarAuditoria() {
  if (!selecaoCompleta()) {
    const faltando = [];
    if (!rascunho.unidadeId) faltando.push('unidade');
    if (!rascunho.competencia) faltando.push('competência');
    if (!rascunho.situacao) faltando.push('situação');
    if (precisaColaborador() && !rascunho.colaboradorId) faltando.push('colaborador');
    UI.aviso('alerta', 'Seleção incompleta', 'Selecione a operação completa antes de avançar. Falta: ' + faltando.join(', ') + '.');
    return;
  }
  const vinculoRuim = problemaDeVinculo();
  if (vinculoRuim) {
    UI.aviso('erro', 'Vínculos incompatíveis', UI.esc(vinculoRuim) + '<br>Revise os cadastros da operação.');
    return;
  }
  if (!regraAtual()) {
    UI.aviso('erro', 'Documentos obrigatórios não configurados',
      'O cliente não tem regra de documentos para a situação <strong>' + UI.esc(rascunho.situacao) + '</strong>.', null,
      Sessao.pode('cadastros') ? [{ texto: 'Configurar documentos', classe: 'btn-primario', acao: () => { location.href = 'documentos-obrigatorios.html'; } }] : []);
    return;
  }
  rascunho.etapa = 'auditoria';
  rascunho.auditoria = null;
  salvarRascunho();
  desenhar();
  rodarAuditoria();
}

// Deixa o texto só com letras e números, sem acento: "Unidade exemplo B" → "unidadeexemplob"
function compacto(texto) {
  return String(texto).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');
}

// Executa as 7 verificações sobre os arquivos anexados.
// Como não há servidor, as conferências usam o nome, o tipo e o tamanho dos arquivos.
// Cada item: nome (T18), curto (T17/T21), esperado, encontrado, origem e acao (motivo provável e ação).
function verificar() {
  const v = vinculo();
  const regra = regraAtual();
  const exigidos = regra.documentos;
  const anexos = exigidos.filter(t => rascunho.anexos[t]).map(t => ({ tipo: t, arquivo: rascunho.anexos[t] }));
  const ausentes = exigidos.filter(t => !rascunho.anexos[t]);
  const nomeCompacto = a => compacto(a.arquivo.nome.replace(/\.[^.]+$/, ''));
  const lista = [];
  const add = item => lista.push(item);

  // Procura nos nomes dos arquivos o nome de outro registro (outra unidade, outro cliente…)
  const citaOutro = (colecao, idCerto) => {
    const outros = DB.listar(colecao).filter(i => i.id !== idCerto).map(i => ({ nome: i.nome, chave: compacto(i.nome) }));
    for (const a of anexos) {
      const achado = outros.find(o => nomeCompacto(a).includes(o.chave));
      if (achado) return { tipo: a.tipo, nome: achado.nome };
    }
    return null;
  };

  // 1. Documentos obrigatórios presentes (RF16)
  add({
    nome: 'Documentos obrigatórios presentes', curto: 'Obrigatoriedade', ok: !ausentes.length,
    esperado: 'Arquivo anexado', encontrado: ausentes.length ? 'Documento ausente: ' + ausentes.join(', ') : 'Todos presentes',
    origem: 'Empresa', acao: 'documento obrigatório não anexado. Anexe o arquivo exigido.'
  });

  // 2. Empresa e CNPJ (RF18): 14 dígitos no nome do arquivo precisam ser o CNPJ da empresa
  const cnpj = v.empresa.cnpj.replace(/\D/g, '');
  const cnpjErrado = anexos.map(a => {
    const achado = a.arquivo.nome.replace(/[./-]/g, '').match(/\d{14}/);
    return achado && achado[0] !== cnpj ? { tipo: a.tipo, cnpj: achado[0].replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5') } : null;
  }).find(Boolean);
  add({
    nome: 'Empresa e CNPJ correspondem', curto: 'Empresa / CNPJ', ok: !cnpjErrado,
    esperado: v.empresa.cnpj, encontrado: cnpjErrado ? cnpjErrado.cnpj + ' em ' + cnpjErrado.tipo : v.empresa.cnpj,
    origem: 'Empresa', acao: 'arquivo de outra empresa. Substitua o documento.'
  });

  // 3. Unidade (RF19)
  const outraUnidade = citaOutro('unidades', v.unidade.id);
  add({
    nome: 'Unidade corresponde', curto: 'Unidade', ok: !outraUnidade,
    esperado: v.unidade.nome, encontrado: outraUnidade ? outraUnidade.nome + ' em ' + outraUnidade.tipo : v.unidade.nome,
    origem: 'Empresa', acao: 'arquivo de outra unidade. Confira a operação.'
  });

  // 4. Cliente (RF20)
  const outroCliente = citaOutro('clientes', v.cliente.id);
  add({
    nome: 'Cliente corresponde', curto: 'Cliente', ok: !outroCliente,
    esperado: v.cliente.nome, encontrado: outroCliente ? outroCliente.nome + ' em ' + outroCliente.tipo : v.cliente.nome,
    origem: 'Empresa', acao: 'unidade vinculada a outro cliente. Revise o cadastro e o arquivo.'
  });

  // 5. Competência (RF21): datas "MM-AAAA" no nome do arquivo precisam bater
  const compErrada = anexos.map(a => {
    const m = a.arquivo.nome.match(/(0[1-9]|1[0-2])[-_. ]?(20\d{2})/);
    return m && (m[1] + '/' + m[2]) !== rascunho.competencia ? { tipo: a.tipo, comp: m[1] + '/' + m[2] } : null;
  }).find(Boolean);
  add({
    nome: 'Competência corresponde', curto: 'Competência', ok: !compErrada,
    esperado: rascunho.competencia, encontrado: compErrada ? compErrada.comp + ' em ' + compErrada.tipo : rascunho.competencia,
    origem: 'Empresa', acao: 'arquivo de um mês anterior. Substitua pelo mês correto.'
  });

  // 6. Colaborador (RF22), só no kit demissional
  if (precisaColaborador()) {
    const colaborador = DB.buscar('colaboradores', rascunho.colaboradorId);
    const outroColab = citaOutro('colaboradores', colaborador ? colaborador.id : 0);
    add({
      nome: 'Colaborador corresponde, quando aplicável', curto: 'Colaborador', ok: !!colaborador && !outroColab,
      esperado: colaborador ? colaborador.nome : 'Colaborador selecionado',
      encontrado: outroColab ? outroColab.nome + ' em ' + outroColab.tipo : (colaborador ? colaborador.nome : 'Não informado'),
      origem: 'Empresa', acao: 'documento de outra pessoa. Confira o kit demissional.'
    });
  } else {
    add({ nome: 'Colaborador corresponde, quando aplicável', curto: 'Colaborador', ok: true, naoSeAplica: true, esperado: 'Não se aplica', encontrado: 'Não se aplica', origem: '—', acao: '' });
  }

  // 7. Regras da unidade: banco de horas, formato, arquivo vazio e arquivo repetido
  const comBanco = anexos.find(a => /banco/i.test(a.arquivo.nome));
  const formatoRuim = anexos.find(a => !/\.(pdf|png|jpe?g)$/i.test(a.arquivo.nome));
  const vazio = anexos.find(a => !a.arquivo.tamanho);
  const repetido = anexos.find((a, i) => anexos.findIndex(b => b.arquivo.nome === a.arquivo.nome && b.arquivo.tamanho === a.arquivo.tamanho) !== i);
  let regraItem = { curto: 'Regras da unidade', encontrado: 'Conforme', acao: '' };
  if (comBanco && v.unidade.bancoHoras !== 'Sim') {
    regraItem = { curto: 'Banco de horas', esperado: 'Unidade sem banco', encontrado: 'Arquivo com banco (' + comBanco.tipo + ')', acao: 'folha incompatível com a regra da unidade. Corrija o arquivo.' };
  } else if (formatoRuim) {
    regraItem = { curto: 'Formato do arquivo', encontrado: 'Formato não aceito em ' + formatoRuim.tipo, acao: 'envie PDF, PNG ou JPG.' };
  } else if (vazio) {
    regraItem = { curto: 'Arquivo vazio', encontrado: 'Arquivo vazio em ' + vazio.tipo, acao: 'o arquivo não tem conteúdo. Anexe novamente.' };
  } else if (repetido) {
    regraItem = { curto: 'Arquivo repetido', encontrado: 'Mesmo arquivo em ' + repetido.tipo, acao: 'o mesmo arquivo foi anexado em dois documentos. Substitua o documento.' };
  }
  add(Object.assign({
    nome: 'Comparação entre arquivos e regras da unidade', ok: !regraItem.acao,
    esperado: 'Banco de horas: ' + (v.unidade.bancoHoras === 'Sim' ? 'sim' : 'não') + ' • PDF/PNG/JPG',
    origem: 'Empresa'
  }, regraItem));

  return lista;
}

// T16: tabela "Em conferência" que vai sendo preenchida
function rodarAuditoria() {
  const verificacoes = verificar();
  UI.$('#auditoria-andamento').classList.remove('oculto');
  UI.$('#auditoria-resultado').classList.add('oculto');

  const desenharConferencia = feitos => {
    UI.renderTabela(UI.$('#tabela-conferencia'), [
      { titulo: 'Verificação', valor: x => UI.esc(x.nome) },
      { titulo: 'Resultado', valor: (x, i) => '' }
    ], verificacoes);
    UI.$$('#tabela-conferencia tbody tr').forEach((tr, i) => {
      const x = verificacoes[i];
      tr.lastElementChild.innerHTML = i < feitos
        ? (x.ok ? '<span class="texto-sucesso">' + (x.naoSeAplica ? 'Não se aplica' : 'Validado') + '</span>' : '<span class="texto-erro">Inconsistente</span>')
        : '<span class="texto-suave">Em conferência</span>';
    });
    UI.$('#auditoria-barra').style.width = (feitos / verificacoes.length * 100) + '%';
  };

  let passo = 0;
  desenharConferencia(0);
  const intervalo = setInterval(() => {
    passo++;
    desenharConferencia(passo);
    if (passo >= verificacoes.length) {
      clearInterval(intervalo);
      setTimeout(() => concluirAuditoria(verificacoes), 500);
    }
  }, 380);
}

function concluirAuditoria(verificacoes) {
  const aprovado = verificacoes.every(v => v.ok);
  rascunho.auditoria = { data: Datas.agora(), aprovado, verificacoes };
  rascunho.alterado = false;
  salvarRascunho();

  const v = vinculo();
  const falhas = verificacoes.filter(x => !x.ok);
  registrarHistorico(
    'Executou a pré-auditoria',
    v.unidade.nome + ' • ' + rascunho.competencia + ' • ' + verificacoes.length + ' verificações',
    'verificacao',
    {
      resultado: aprovado ? 'Aprovada' : 'Bloqueada',
      verificacoes: verificacoes.length,
      detalhes: aprovado ? 'Todas as verificações foram validadas.' : falhas.map(f => f.curto + ': ' + f.encontrado).join(' | ')
    }
  );
  desenhar();
}

function desenharResultado() {
  const a = rascunho.auditoria;
  const caixa = UI.$('#auditoria-resultado');
  UI.$('#auditoria-andamento').classList.add('oculto');
  caixa.classList.remove('oculto');
  const prepara = Sessao.apenasPrepara();

  if (a.aprovado) {
    caixa.innerHTML =
      '<span class="etiqueta sucesso">Apto para envio</span>' +
      '<h2 class="cartao-titulo" style="margin-top:14px">Documentação validada</h2>' +
      '<p class="cartao-subtitulo">Todos os documentos obrigatórios estão presentes. Nenhuma inconsistência impeditiva foi identificada.</p>' +
      '<div id="tabela-verificacoes"></div>' +
      '<div class="acoes" style="margin-top:14px">' +
        '<button class="btn btn-primario" type="button" id="btn-enviar-cliente">' + UI.icones.enviar + (prepara ? 'Disponibilizar ao responsável' : 'Enviar ao cliente') + '</button>' +
        '<button class="btn" type="button" id="btn-voltar">Voltar aos documentos</button>' +
        '<a class="btn" href="historico.html?aba=verificacoes">Histórico das verificações</a>' +
      '</div>';

    UI.renderTabela(UI.$('#tabela-verificacoes'), [
      { titulo: 'Verificação', valor: x => UI.esc(x.nome) },
      { titulo: 'Resultado', valor: x => '<span class="texto-sucesso">' + (x.naoSeAplica ? 'Não se aplica' : 'Validado') + '</span>' }
    ], a.verificacoes);

    UI.$('#btn-enviar-cliente').addEventListener('click', confirmarEnvio);
  } else {
    const falhas = a.verificacoes.filter(x => !x.ok);
    caixa.innerHTML =
      '<span class="etiqueta erro">Envio bloqueado</span>' +
      '<h2 class="cartao-titulo" style="margin-top:14px">Inconsistências impeditivas</h2>' +
      '<p class="cartao-subtitulo">O envio permanece bloqueado até que todos os documentos obrigatórios estejam presentes e os dados sejam coerentes com o cadastro.</p>' +
      '<div id="tabela-verificacoes"></div>' +
      '<p class="texto-erro" style="margin:12px 0">Motivo provável: ' + UI.esc(falhas[0].acao) + ' Depois execute novamente a conferência.</p>' +
      '<div class="acoes">' +
        '<button class="btn" type="button" id="btn-voltar">Corrigir / substituir documentos</button>' +
        '<button class="btn" type="button" id="btn-detalhar">Detalhar inconsistências</button>' +
        '<button class="btn" type="button" disabled title="Corrija as inconsistências para liberar o envio">' + (prepara ? 'Disponibilizar ao responsável' : 'Enviar ao cliente') + '</button>' +
        '<a class="btn" href="historico.html?aba=verificacoes">Histórico das verificações</a>' +
      '</div>';

    UI.renderTabela(UI.$('#tabela-verificacoes'), [
      { titulo: 'Verificação', valor: x => UI.esc(x.curto) },
      { titulo: 'Esperado', valor: x => UI.esc(x.esperado) },
      { titulo: 'Encontrado', valor: x => '<span class="texto-erro">' + UI.esc(x.encontrado) + '</span>' },
      { titulo: 'Origem provável', valor: x => UI.esc(x.origem) }
    ], falhas);

    UI.$('#btn-detalhar').addEventListener('click', detalharInconsistencias);
  }

  UI.$('#btn-voltar').addEventListener('click', voltarAosDocumentos);
}

function voltarAosDocumentos() {
  rascunho.etapa = 'documentos';
  salvarRascunho();
  desenhar();
}

// T21: "Motivos e provável origem dos erros"
function detalharInconsistencias() {
  const a = rascunho.auditoria;
  const modal = UI.modal({
    titulo: 'Inconsistências',
    largo: true,
    corpo:
      '<h3 style="font-weight:500;margin-top:0">Motivos e provável origem dos erros</h3>' +
      '<p class="cartao-subtitulo">Pré-auditoria executada em ' + Datas.brHora(a.data) + '.</p>' +
      '<div id="det-verificacoes"></div>',
    botoes: [
      { texto: 'Voltar à pré-auditoria' },
      { texto: 'Corrigir documentos', classe: 'btn-primario', acao: m => { m.fechar(); voltarAosDocumentos(); } }
    ]
  });

  UI.renderTabela(UI.$('#det-verificacoes', modal.el), [
    { titulo: 'Verificação', valor: x => UI.esc(x.curto) },
    { titulo: 'Esperado / encontrado', valor: x => UI.esc(x.esperado + ' / ' + x.encontrado) },
    { titulo: 'Motivo provável e ação', valor: x => x.ok
      ? '<span class="texto-sucesso">Validado</span>'
      : '<span class="texto-erro">' + UI.esc(x.origem + ': ' + x.acao) + '</span>' }
  ], a.verificacoes);
}

/* ---------- Etapa 3: envio ---------- */
async function confirmarEnvio() {
  if (rascunho.alterado) {
    UI.aviso('alerta', 'Execute a pré-auditoria novamente', 'Houve alterações desde a última verificação.');
    return;
  }
  const v = vinculo();
  const regra = regraAtual();
  const prepara = Sessao.apenasPrepara();
  const ok = await UI.confirmar(prepara ? 'Disponibilizar ao responsável' : 'Enviar ao cliente',
    (prepara ? 'Disponibilizar ' : 'Enviar ') + '<strong>' + regra.documentos.length + ' documento(s)</strong> da ' + UI.esc(v.unidade.nome) +
    ', competência <strong>' + UI.esc(rascunho.competencia) + '</strong>, ' +
    (prepara ? 'para o profissional responsável pelo envio?' : 'para <strong>' + UI.esc(v.cliente.nome) + '</strong>?'),
    prepara ? 'Disponibilizar' : 'Enviar');
  if (ok) concluirEnvio(prepara);
}

function concluirEnvio(preparado) {
  const v = vinculo();
  const regra = regraAtual();
  const comp = DB.listar('competencias').find(c => c.mesAno === rascunho.competencia);
  const usuario = Sessao.usuario();
  const colaboradorId = precisaColaborador() ? Number(rascunho.colaboradorId) : null;
  const status = preparado ? 'Pendente' : 'Em análise';
  const documentos = DB.listar('documentos');
  let proximoId = DB.novoId('documentos');
  const ids = [];

  regra.documentos.forEach(tipo => {
    let doc = documentos.find(d => d.tipo === tipo && d.unidadeId === v.unidade.id &&
      d.competencia === rascunho.competencia && (d.colaboradorId || null) === colaboradorId);
    const versao = {
      versao: doc ? doc.versoes.length + 1 : 1,
      arquivo: rascunho.anexos[tipo],
      data: Datas.agora(),
      usuario: usuario.nome
    };
    if (doc) {
      doc.versoes.push(versao);
      doc.status = status;
      doc.motivoRecusa = '';
      doc.origemRecusa = '';
    } else {
      doc = {
        id: proximoId++, tipo,
        empresaId: v.empresa.id, clienteId: v.cliente.id, unidadeId: v.unidade.id, colaboradorId,
        competencia: rascunho.competencia,
        prazo: comp ? comp.prazo : Datas.somarDias(15),
        status, nivelAcesso: 'Geral', motivoRecusa: '', origemRecusa: '',
        dados: { horasExtras: '—', bancoHoras: v.unidade.bancoHoras === 'Sim' ? 'Banco de horas aplicado' : 'Não aplicado' },
        versoes: [versao], observacao: ''
      };
      documentos.push(doc);
    }
    ids.push(doc.id);
  });

  // Se faltar espaço, guarda os documentos sem a pré-visualização dos arquivos
  if (!DB.salvar('documentos', documentos)) {
    documentos.forEach(d => d.versoes.forEach(ver => { if (ver.arquivo) delete ver.arquivo.conteudo; }));
    DB.salvar('documentos', documentos);
  }

  // Resolve pendências de "Anexar documento" desses documentos
  DB.salvar('pendencias', DB.listar('pendencias').map(p =>
    (ids.includes(p.documentoId) && p.status === 'aberta' && p.acao === 'Anexar documento')
      ? Object.assign(p, { status: 'resolvida', resolvidaEm: Datas.agora(), resolucao: 'Documento anexado e conferido na pré-auditoria.' }) : p));

  const numero = DB.novoId('envios');
  const envio = DB.inserir('envios', {
    protocolo: 'REM-' + String(numero).padStart(4, '0'),
    data: Datas.agora(),
    usuario: usuario.nome,
    unidadeId: v.unidade.id,
    competencia: rascunho.competencia,
    situacao: rascunho.situacao,
    colaboradorId,
    preparado,
    documentos: ids
  });

  // Histórico geral e de cada documento (RF36)
  registrarHistorico(preparado ? 'Preparou documentação para o responsável' : 'Enviou documentação', envio.protocolo + ' • ' + ids.length + ' documento(s) • ' + rascunho.competencia);
  ids.forEach(id => {
    const d = documentos.find(x => x.id === id);
    registrarHistorico(preparado ? 'Disponibilizou ao responsável' : 'Enviou para análise — pré-auditoria validada', d.tipo + ' • ' + d.competencia, 'atividade', { documentoId: id, versao: d.versoes.length });
  });
  notificar(preparado
    ? 'Documentação preparada por ' + usuario.nome + ' aguarda envio: ' + v.unidade.nome + ' • ' + rascunho.competencia + '.'
    : 'Nova documentação enviada: ' + v.unidade.nome + ' • ' + rascunho.competencia + ' (' + envio.protocolo + ').', 'documentos.html');
  Layout.atualizarContador();

  rascunho = rascunhoVazio();
  rascunho.etapa = 'enviado';
  rascunho.envioId = envio.id;
  salvarRascunho();
  desenhar();
}

// T19 (envio ao cliente) e T20 (documentação preparada)
function desenharEnvio() {
  const envio = DB.buscar('envios', rascunho.envioId);
  const caixa = UI.$('#envio-confirmado');
  if (!envio) {
    rascunho = rascunhoVazio();
    salvarRascunho();
    desenhar();
    return;
  }
  const unidade = DB.buscar('unidades', envio.unidadeId);

  if (envio.preparado) {
    caixa.innerHTML =
      '<span class="etiqueta alerta">Pendente</span>' +
      '<h2 class="cartao-titulo" style="margin-top:14px">Documentos disponibilizados ao responsável</h2>' +
      '<p class="cartao-subtitulo">A remessa foi preparada. O envio ao cliente será realizado pelo profissional responsável, conforme as permissões do cargo.</p>' +
      '<div id="tabela-enviados"></div>' +
      '<div class="acoes" style="margin-top:14px">' +
        '<a class="btn" href="documentos.html">Consultar documentos</a>' +
        '<button class="btn" type="button" id="btn-solicitar">Solicitar documento</button>' +
        '<button class="btn btn-primario" type="button" id="btn-novo-envio">Nova remessa</button>' +
      '</div>';
    UI.$('#btn-solicitar').addEventListener('click', () => Layout.solicitarAoSetor());
  } else {
    const registros = [
      { registro: 'Data da submissão', info: Datas.brHora(envio.data) },
      { registro: 'Responsável', info: envio.usuario },
      { registro: 'Empresa / unidade', info: (unidade ? Nomes.empresa(unidade.empresaId) + ' / ' + unidade.nome : '—') },
      { registro: 'Competência', info: envio.competencia + ' • ' + envio.situacao + (envio.colaboradorId ? ' • ' + Nomes.colaborador(envio.colaboradorId) : '') },
      { registro: 'Protocolo', info: envio.protocolo },
      { registro: 'Histórico', info: 'Pré-auditoria validada e envio registrado' }
    ];
    caixa.innerHTML =
      '<h2 class="cartao-titulo">Documentação enviada</h2>' +
      '<span class="etiqueta info">Em análise</span>' +
      '<p class="cartao-subtitulo" style="margin-top:10px">A documentação foi disponibilizada ao cliente para análise.</p>' +
      '<div id="tabela-registro"></div>' +
      '<h3 style="font-weight:500;margin:18px 0 6px">Documentos da remessa</h3>' +
      '<div id="tabela-enviados"></div>' +
      '<div class="acoes" style="margin-top:14px">' +
        '<a class="btn" href="documentos.html">Ver em Documentos</a>' +
        '<button class="btn btn-primario" type="button" id="btn-novo-envio">Nova remessa</button>' +
        '<a class="btn" href="historico.html">Consultar histórico</a>' +
      '</div>';
    UI.renderTabela(UI.$('#tabela-registro'), [
      { titulo: 'Registro', valor: r => UI.esc(r.registro) },
      { titulo: 'Informação', valor: r => UI.esc(r.info) }
    ], registros);
  }

  const docs = envio.documentos.map(id => DB.buscar('documentos', id)).filter(Boolean);
  UI.renderTabela(UI.$('#tabela-enviados'), [
    { titulo: 'Documento', valor: d => UI.esc(d.tipo) },
    { titulo: 'Arquivo', valor: d => UI.esc(versaoAtual(d) ? versaoAtual(d).arquivo.nome : '—') },
    { titulo: 'Versão', valor: d => String(d.versoes.length) },
    { titulo: 'Status', valor: d => UI.status(d.status) }
  ], docs, { aoClicar: d => { location.href = 'documento.html?id=' + d.id; } });

  UI.$('#btn-novo-envio').addEventListener('click', () => {
    rascunho = rascunhoVazio();
    salvarRascunho();
    desenhar();
  });
}
