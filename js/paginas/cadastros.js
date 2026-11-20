/* =========================================================
   Flow360 — Cadastros
   Um único arquivo atende as 7 telas de cadastro.
   Cada HTML informa qual cadastro é em <body data-cadastro="...">
   e a configuração abaixo diz quais campos, colunas e
   validações aquele cadastro tem.
   ========================================================= */

const listaPorId = colecao => DB.listar(colecao).map(i => ({ valor: i.id, texto: i.nome }));

const CADASTROS = {
  /* ---------- Empresas Terceirizadas ---------- */
  'empresas': {
    colecao: 'empresas',
    nomeItem: r => r.nome,
    campos: [
      { nome: 'nome', rotulo: 'Nome da empresa', tipo: 'texto', obrigatorio: true },
      { nome: 'cnpj', rotulo: 'CNPJ', tipo: 'cnpj', obrigatorio: true, placeholder: '00.000.000/0000-00' }
    ],
    colunas: [
      { titulo: 'Nome', valor: r => UI.esc(r.nome) },
      { titulo: 'CNPJ', valor: r => UI.esc(r.cnpj) }
    ],
    validar(d, id) {
      if (d.cnpj.replace(/\D/g, '').length !== 14) return { campo: 'cnpj', mensagem: 'O CNPJ precisa ter 14 dígitos.' };
      if (DB.listar('empresas').some(e => e.cnpj === d.cnpj && e.id !== id)) return { campo: 'cnpj', mensagem: 'Já existe uma empresa com este CNPJ.' };
      return null;
    },
    emUso: id =>
      DB.listar('unidades').some(u => u.empresaId === id) || DB.listar('regionais').some(r => r.empresaId === id) ||
      DB.listar('clientes').some(c => c.empresas.includes(id)) || DB.listar('documentos').some(d => d.empresaId === id)
  },

  /* ---------- Clientes ---------- */
  'clientes': {
    colecao: 'clientes',
    nomeItem: r => r.nome,
    campos: [
      { nome: 'nome', rotulo: 'Nome do cliente', tipo: 'texto', obrigatorio: true },
      { nome: 'empresas', rotulo: 'Empresas vinculadas', tipo: 'multi', numero: true, obrigatorio: true, opcoes: () => listaPorId('empresas') }
    ],
    colunas: [
      { titulo: 'Nome', valor: r => UI.esc(r.nome) },
      { titulo: 'Empresas vinculadas', valor: r => UI.esc(r.empresas.map(Nomes.empresa).join(', ')) }
    ],
    validar(d, id) {
      if (DB.listar('clientes').some(c => c.nome.toLowerCase() === d.nome.toLowerCase() && c.id !== id)) return { campo: 'nome', mensagem: 'Já existe um cliente com este nome.' };
      // Não pode desvincular empresa que ainda tem regional deste cliente
      const presa = DB.listar('regionais').find(r => r.clienteId === id && !d.empresas.includes(r.empresaId));
      if (presa) return { vinculo: true, campo: 'empresas', mensagem: 'A ' + presa.nome + ' usa a ' + Nomes.empresa(presa.empresaId) + '. Mantenha essa empresa vinculada ou altere a regional.' };
      return null;
    },
    emUso: id => DB.listar('regionais').some(r => r.clienteId === id) || DB.listar('regras').some(r => r.clienteId === id)
  },

  /* ---------- Regionais ---------- */
  'regionais': {
    colecao: 'regionais',
    nomeItem: r => r.nome,
    campos: [
      { nome: 'nome', rotulo: 'Nome da regional', tipo: 'texto', obrigatorio: true },
      { nome: 'clienteId', rotulo: 'Cliente', tipo: 'select', numero: true, obrigatorio: true, opcoes: () => listaPorId('clientes') },
      { nome: 'empresaId', rotulo: 'Empresa', tipo: 'select', numero: true, obrigatorio: true, opcoes: () => listaPorId('empresas') }
    ],
    colunas: [
      { titulo: 'Nome', valor: r => UI.esc(r.nome) },
      { titulo: 'Cliente / empresa', valor: r => UI.esc(Nomes.cliente(r.clienteId) + ' / ' + Nomes.empresa(r.empresaId)) }
    ],
    validar(d) {
      const cliente = DB.buscar('clientes', d.clienteId);
      if (cliente && !cliente.empresas.includes(d.empresaId)) {
        return { vinculo: true, campo: 'empresaId', mensagem: 'A ' + Nomes.empresa(d.empresaId) + ' não está vinculada ao ' + cliente.nome + '. Vincule a empresa no cadastro de clientes.' };
      }
      return null;
    },
    emUso: id => DB.listar('unidades').some(u => u.regionalId === id)
  },

  /* ---------- Unidades ---------- */
  'unidades': {
    colecao: 'unidades',
    nomeItem: r => r.nome,
    campos: [
      { nome: 'nome', rotulo: 'Nome da unidade', tipo: 'texto', obrigatorio: true },
      { nome: 'regionalId', rotulo: 'Regional', tipo: 'select', numero: true, obrigatorio: true, opcoes: () => listaPorId('regionais'),
        aoMudar: form => { // preenche a empresa da regional
          const regional = DB.buscar('regionais', form.valor('regionalId'));
          if (regional) form.definir('empresaId', regional.empresaId);
        } },
      { nome: 'empresaId', rotulo: 'Empresa', tipo: 'select', numero: true, obrigatorio: true, opcoes: () => listaPorId('empresas') },
      { nome: 'contrato', rotulo: 'Contrato', tipo: 'texto', obrigatorio: true, placeholder: 'Ex.: CT-004' },
      // Indica se a unidade trabalha com banco de horas (usado na pré-auditoria)
      { nome: 'bancoHoras', rotulo: 'Banco de horas', tipo: 'select', obrigatorio: true, opcoes: () => [{ valor: 'Sim', texto: 'Sim, trabalha com banco de horas' }, { valor: 'Não', texto: 'Não trabalha com banco de horas' }] }
    ],
    colunas: [
      { titulo: 'Nome', valor: r => UI.esc(r.nome) },
      { titulo: 'Vínculos e contrato', valor: r => UI.esc(Nomes.regional(r.regionalId) + ' / ' + Nomes.empresa(r.empresaId) + ' / ' + r.contrato) },
      { titulo: 'Banco de horas', valor: r => UI.esc(r.bancoHoras === 'Sim' ? 'Sim' : 'Não') }
    ],
    validar(d) {
      const regional = DB.buscar('regionais', d.regionalId);
      if (regional && regional.empresaId !== d.empresaId) {
        return { vinculo: true, campo: 'empresaId', mensagem: 'A ' + regional.nome + ' pertence à ' + Nomes.empresa(regional.empresaId) + ', não à ' + Nomes.empresa(d.empresaId) + '.' };
      }
      return null;
    },
    emUso: id => DB.listar('colaboradores').some(c => c.unidadeId === id) || DB.listar('documentos').some(d => d.unidadeId === id)
  },

  /* ---------- Colaboradores ---------- */
  'colaboradores': {
    colecao: 'colaboradores',
    nomeItem: r => r.nome,
    campos: [
      { nome: 'nome', rotulo: 'Nome do colaborador', tipo: 'texto', obrigatorio: true },
      { nome: 'empresaId', rotulo: 'Empresa', tipo: 'select', numero: true, obrigatorio: true, opcoes: () => listaPorId('empresas') },
      { nome: 'unidadeId', rotulo: 'Unidade', tipo: 'select', numero: true, obrigatorio: true, opcoes: () => listaPorId('unidades'),
        aoMudar: form => { // preenche empresa e contrato da unidade
          const unidade = DB.buscar('unidades', form.valor('unidadeId'));
          if (unidade) {
            form.definir('empresaId', unidade.empresaId);
            if (!form.valor('contrato')) form.definir('contrato', unidade.contrato);
          }
        } },
      { nome: 'contrato', rotulo: 'Contrato', tipo: 'texto', obrigatorio: true }
    ],
    colunas: [
      { titulo: 'Nome', valor: r => UI.esc(r.nome) },
      { titulo: 'Empresa / unidade / contrato', valor: r => UI.esc(Nomes.empresa(r.empresaId) + ' / ' + Nomes.unidade(r.unidadeId) + ' / ' + r.contrato) }
    ],
    validar(d) {
      const unidade = DB.buscar('unidades', d.unidadeId);
      if (unidade && unidade.empresaId !== d.empresaId) {
        return { vinculo: true, campo: 'unidadeId', mensagem: 'A ' + unidade.nome + ' é atendida pela ' + Nomes.empresa(unidade.empresaId) + '. Escolha uma unidade da ' + Nomes.empresa(d.empresaId) + '.' };
      }
      return null;
    },
    emUso: id => DB.listar('documentos').some(d => d.colaboradorId === id) || DB.listar('regras').some(r => r.colaboradorId === id)
  },

  /* ---------- Competências ---------- */
  'competencias': {
    colecao: 'competencias',
    nomeItem: r => r.mesAno,
    ordenar: (a, b) => b.mesAno.split('/').reverse().join('').localeCompare(a.mesAno.split('/').reverse().join('')),
    campos: [
      { nome: 'mesAno', rotulo: 'Mês e ano', tipo: 'competencia', obrigatorio: true, placeholder: 'MM/AAAA' },
      { nome: 'prazo', rotulo: 'Prazo de envio', tipo: 'data', obrigatorio: true }
    ],
    colunas: [
      { titulo: 'Competência', valor: r => UI.esc(r.mesAno) },
      { titulo: 'Prazo de envio', valor: r => Datas.br(r.prazo) }
    ],
    validar(d, id) {
      if (!/^(0[1-9]|1[0-2])\/20\d{2}$/.test(d.mesAno)) return { campo: 'mesAno', mensagem: 'Use o formato MM/AAAA (ex.: 09/2026).' };
      if (DB.listar('competencias').some(c => c.mesAno === d.mesAno && c.id !== id)) return { campo: 'mesAno', mensagem: 'Esta competência já está cadastrada.' };
      const [mes, ano] = d.mesAno.split('/').map(Number);
      const fimDoMes = Datas.iso(new Date(ano, mes, 0));
      if (d.prazo <= fimDoMes) return { campo: 'prazo', mensagem: 'O prazo de envio precisa ser depois do fim da competência (' + Datas.br(fimDoMes) + ').' };
      return null;
    },
    emUso: id => {
      const c = DB.buscar('competencias', id);
      return DB.listar('documentos').some(d => d.competencia === c.mesAno);
    }
  },

  /* ---------- Documentos Obrigatórios ---------- */
  'documentos-obrigatorios': {
    colecao: 'regras',
    nomeItem: r => Nomes.cliente(r.clienteId) + ' / ' + r.situacao,
    campos: [
      { nome: 'clienteId', rotulo: 'Cliente', tipo: 'select', numero: true, obrigatorio: true, opcoes: () => listaPorId('clientes') },
      { nome: 'situacao', rotulo: 'Situação', tipo: 'select', obrigatorio: true, opcoes: () => SITUACOES.map(s => ({ valor: s, texto: s })) },
      { nome: 'colaboradorId', rotulo: 'Colaborador específico', tipo: 'select', numero: true, vazio: 'Nenhum (vale para todos)', opcoes: () => listaPorId('colaboradores') },
      { nome: 'documentos', rotulo: 'Documentos exigidos', tipo: 'multi', obrigatorio: true, largo: true, opcoes: () => TIPOS_DOCUMENTO.map(t => ({ valor: t, texto: t })) }
    ],
    colunas: [
      { titulo: 'Cliente / situação', valor: r => UI.esc(Nomes.cliente(r.clienteId) + ' / ' + r.situacao) + (r.colaboradorId ? '<br><span class="texto-suave">' + UI.esc(Nomes.colaborador(r.colaboradorId)) + '</span>' : '') },
      { titulo: 'Documentos exigidos', valor: r => UI.esc(r.documentos.join(', ')) }
    ],
    validar(d, id) {
      if (DB.listar('regras').some(r => r.clienteId === d.clienteId && r.situacao === d.situacao && (r.colaboradorId || null) === (d.colaboradorId || null) && r.id !== id)) {
        return { campo: 'situacao', mensagem: 'Já existe uma regra para este cliente nesta situação. Edite a regra existente.' };
      }
      if (d.colaboradorId) {
        const colaborador = DB.buscar('colaboradores', d.colaboradorId);
        const cliente = DB.buscar('clientes', d.clienteId);
        if (colaborador && cliente && !cliente.empresas.includes(colaborador.empresaId)) {
          return { vinculo: true, campo: 'colaboradorId', mensagem: colaborador.nome + ' trabalha na ' + Nomes.empresa(colaborador.empresaId) + ', que não atende o ' + cliente.nome + '.' };
        }
      }
      return null;
    },
    emUso: () => false
  }
};

/* =========================================================
   Motor genérico do cadastro
   ========================================================= */
const chaveCadastro = document.body.dataset.cadastro;
const config = CADASTROS[chaveCadastro];

if (Layout.iniciar({ modulo: 'cadastros', ativo: chaveCadastro })) {
  let editandoId = null;
  const multis = {}; // controles de seleção múltipla
  const areaCampos = UI.$('#campos');
  const formulario = UI.$('#form-cadastro');

  /* ----- Monta os campos ----- */
  areaCampos.innerHTML = config.campos.map(c => {
    const id = 'c-' + c.nome;
    let entrada;
    if (c.tipo === 'select') entrada = '<select class="selecao" id="' + id + '"></select>';
    else if (c.tipo === 'multi') entrada = '<div id="' + id + '-caixa"></div>';
    else if (c.tipo === 'data') entrada = '<input class="entrada" type="date" id="' + id + '">';
    else entrada = '<input class="entrada" id="' + id + '" autocomplete="off"' + (c.placeholder ? ' placeholder="' + UI.esc(c.placeholder) + '"' : '') + '>';
    return '<div class="campo' + (c.largo ? ' campo-largo' : '') + '"><label for="' + id + '">' + UI.esc(c.rotulo) + '</label>' + entrada + '</div>';
  }).join('');

  config.campos.forEach(c => {
    const el = UI.$('#c-' + c.nome);
    if (c.tipo === 'select') {
      el.innerHTML = UI.opcoes(c.opcoes(), '', c.vazio || 'Selecione');
    } else if (c.tipo === 'multi') {
      multis[c.nome] = UI.multiSelect(UI.$('#c-' + c.nome + '-caixa'), { id: 'c-' + c.nome, itens: c.opcoes, placeholder: 'Selecione' });
    } else if (c.tipo === 'cnpj') {
      UI.mascaraCNPJ(el);
    } else if (c.tipo === 'competencia') {
      UI.mascaraCompetencia(el);
    }
    if (c.aoMudar && el) el.addEventListener('change', () => c.aoMudar(form));
  });

  /* ----- Leitura e escrita dos campos ----- */
  const form = {
    valor(nome) {
      const c = config.campos.find(x => x.nome === nome);
      if (c.tipo === 'multi') return multis[nome].valor().map(v => (c.numero ? Number(v) : v));
      const v = UI.$('#c-' + nome).value.trim();
      if (c.numero) return v ? Number(v) : null;
      return v;
    },
    definir(nome, valor) {
      const c = config.campos.find(x => x.nome === nome);
      if (c.tipo === 'multi') multis[nome].definir(valor || []);
      else UI.$('#c-' + nome).value = valor === null || valor === undefined ? '' : valor;
    },
    ler() {
      const dados = {};
      config.campos.forEach(c => { dados[c.nome] = form.valor(c.nome); });
      return dados;
    },
    limpar() {
      config.campos.forEach(c => form.definir(c.nome, c.tipo === 'multi' ? [] : ''));
      UI.limparInvalidos(formulario);
      UI.$('#erro-form').textContent = '';
    }
  };

  function marcarCampo(nome) {
    const c = config.campos.find(x => x.nome === nome);
    if (!c) return;
    if (c.tipo === 'multi') UI.$('#c-' + nome + '-caixa').classList.add('invalida');
    else UI.marcarInvalido(UI.$('#c-' + nome), true);
  }

  /* ----- Modo edição ----- */
  function entrarEdicao(registro) {
    editandoId = registro.id;
    form.limpar();
    config.campos.forEach(c => form.definir(c.nome, registro[c.nome]));
    UI.$('#titulo-form').textContent = 'Editar registro';
    UI.$('#btn-salvar').textContent = 'Salvar alterações';
    formulario.scrollIntoView({ behavior: 'smooth', block: 'center' });
    UI.$('#c-' + config.campos[0].nome).focus();
  }

  function sairEdicao() {
    editandoId = null;
    form.limpar();
    UI.$('#titulo-form').textContent = 'Novo registro';
    UI.$('#btn-salvar').textContent = 'Salvar cadastro';
  }

  /* ----- Salvar ----- */
  formulario.addEventListener('submit', e => {
    e.preventDefault();
    UI.limparInvalidos(formulario);
    UI.$('#erro-form').textContent = '';
    const dados = form.ler();

    // Formulário inválido: campos obrigatórios vazios
    const faltando = config.campos.filter(c => c.obrigatorio && (Array.isArray(dados[c.nome]) ? !dados[c.nome].length : !dados[c.nome]));
    if (faltando.length) {
      faltando.forEach(c => marcarCampo(c.nome));
      UI.$('#erro-form').textContent = 'Preencha: ' + faltando.map(c => c.rotulo.toLowerCase()).join(', ') + '.';
      UI.aviso('erro', 'Preencha os campos obrigatórios', 'Preencha os campos destacados: <strong>' + UI.esc(faltando.map(c => c.rotulo).join(', ')) + '</strong>.');
      return;
    }

    // Regras específicas do cadastro (formato, duplicidade e vínculos)
    const erro = config.validar(dados, editandoId);
    if (erro) {
      marcarCampo(erro.campo);
      UI.$('#erro-form').textContent = erro.mensagem;
      UI.aviso('erro', erro.vinculo ? 'Vínculos incompatíveis' : 'Formulário inválido', UI.esc(erro.mensagem));
      return;
    }

    const titulo = UI.$('.titulo-pagina').textContent;
    if (editandoId) {
      DB.atualizar(config.colecao, editandoId, dados);
      registrarHistorico('Editou cadastro', titulo + ' • ' + config.nomeItem(dados));
      sairEdicao();
      desenharTabela();
      UI.aviso('sucesso', 'Alterações salvas', 'O registro foi atualizado.');
    } else {
      DB.inserir(config.colecao, dados);
      registrarHistorico('Criou cadastro', titulo + ' • ' + config.nomeItem(dados));
      form.limpar();
      desenharTabela();
      UI.aviso('sucesso', 'Cadastro salvo', '<strong>' + UI.esc(config.nomeItem(dados)) + '</strong> foi cadastrado com sucesso.');
    }
  });

  UI.$('#btn-cancelar').addEventListener('click', sairEdicao);

  /* ----- Excluir ----- */
  async function excluir(registro) {
    if (config.emUso(registro.id)) {
      UI.aviso('alerta', 'Registro em uso', '<strong>' + UI.esc(config.nomeItem(registro)) + '</strong> está vinculado a outros cadastros ou documentos e não pode ser excluído.');
      return;
    }
    const ok = await UI.confirmar('Excluir registro', 'Excluir <strong>' + UI.esc(config.nomeItem(registro)) + '</strong>? Esta ação não pode ser desfeita.', 'Excluir', true);
    if (!ok) return;
    DB.excluir(config.colecao, registro.id);
    registrarHistorico('Excluiu cadastro', UI.$('.titulo-pagina').textContent + ' • ' + config.nomeItem(registro));
    if (editandoId === registro.id) sairEdicao();
    desenharTabela();
    UI.toast('Registro excluído.', 'sucesso');
  }

  /* ----- Tabela ----- */
  function desenharTabela() {
    const registros = DB.listar(config.colecao);
    if (config.ordenar) registros.sort(config.ordenar);
    const colunas = config.colunas.concat([{
      titulo: 'Ação',
      valor: () => '<button class="btn-tabela" type="button" data-acao="editar">Editar</button> ' +
        '<button class="btn-tabela" type="button" data-acao="excluir">Excluir</button>'
    }]);
    UI.renderTabela(UI.$('#tabela-registros'), colunas, registros, {
      vazio: 'Nenhum registro cadastrado.',
      acoes: { editar: entrarEdicao, excluir }
    });
    // Atualiza listas dos selects (um cadastro novo pode aparecer em outro campo)
    config.campos.filter(c => c.tipo === 'select').forEach(c => {
      const el = UI.$('#c-' + c.nome);
      const atual = el.value;
      el.innerHTML = UI.opcoes(c.opcoes(), atual, c.vazio || 'Selecione');
    });
    Object.values(multis).forEach(m => m.atualizar());
  }

  desenharTabela();
}
