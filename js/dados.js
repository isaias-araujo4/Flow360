/* =========================================================
   Flow360 — dados.js
   "Banco de dados" do sistema usando o localStorage do navegador.
   O localStorage é uma API nativa do navegador (não é framework):
   ele guarda textos por chave. Aqui salvamos listas em formato JSON.
   ========================================================= */

/* ---------- Listas fixas do sistema ---------- */
const TIPOS_DOCUMENTO = [
  'Folha de pagamento', 'Folha de ponto', 'Guia de FGTS', 'Relação de empregados',
  'Holerite', 'Comprovante de pagamento', 'Plano de saúde', 'Plano odontológico',
  'Termo rescisório', 'Aviso prévio assinado', 'Guia de seguro-desemprego',
  'Baixa na Previdência Social', 'ASO demissional'
];

const SITUACOES = ['Documentação mensal', 'Kit demissional'];

// RF14
const STATUS_DOCUMENTO = ['Pendente', 'Em análise', 'Aprovado', 'Recusado', 'Aguardando correção'];

// Cargos levantados na entrevista estruturada (Tabela 1)
const CARGOS = ['Diretor', 'Gerente', 'Coordenador', 'Supervisor', 'Analista', 'Assistente Administrativo', 'Jovem Aprendiz', 'Estagiário'];

// Cargos que preparam documentos, mas não enviam ao cliente (T20)
const CARGOS_QUE_PREPARAM = ['Jovem Aprendiz', 'Estagiário'];

// Cargos que recebem, conferem e enviam documentos
const CARGOS_QUE_ENVIAM = ['Diretor', 'Gerente', 'Coordenador', 'Supervisor', 'Analista', 'Assistente Administrativo'];

// Nível de acesso de cada documento (RF50 e RF51)
const NIVEIS_ACESSO = ['Geral', 'Gerência', 'Coordenação', 'Diretoria'];

// Matriz de acesso aos documentos (T32)
const ACESSO_POR_CARGO = {
  'Diretor': { niveis: ['Geral', 'Gerência', 'Coordenação', 'Diretoria'], descricao: 'Todos os documentos.' },
  'Gerente': { niveis: ['Geral', 'Gerência', 'Coordenação'], descricao: 'Todos, exceto os documentos da diretoria.' },
  'Coordenador': { niveis: ['Geral', 'Gerência'], descricao: 'Exceto documentos de diretores e coordenadores.' },
  'Supervisor': { niveis: ['Geral'], descricao: 'Exceto documentos de cargos de confiança (diretores, gerentes e coordenadores).' },
  'Analista': { niveis: ['Geral'], descricao: 'Documentos da operação. Recebe e envia documentos.' },
  'Assistente Administrativo': { niveis: ['Geral'], descricao: 'Documentos da operação. Recebe e envia documentos.' },
  'Jovem Aprendiz': { niveis: ['Geral'], descricao: 'Solicita documentos do setor e disponibiliza para os responsáveis pelo envio.' },
  'Estagiário': { niveis: ['Geral'], descricao: 'Solicita e prepara documentos, seguindo o procedimento do jovem aprendiz.' }
};

const MOTIVOS_RECUSA = [
  'Banco de horas incompatível com a unidade.',
  'Valor do aviso prévio diverge do termo.',
  'Colaborador de outra unidade no relatório.',
  'Documento ilegível.',
  'Competência incorreta.',
  'Documento obrigatório ausente.',
  'Outro motivo'
];

// Telas do sistema usadas na matriz de permissões
const MODULOS = [
  { id: 'painel', nome: 'Painel geral' },
  { id: 'enviar', nome: 'Enviar documentação' },
  { id: 'documentos', nome: 'Documentos' },
  { id: 'pendencias', nome: 'Pendências' },
  { id: 'relatorios', nome: 'Relatórios' },
  { id: 'cadastros', nome: 'Cadastros' },
  { id: 'historico', nome: 'Histórico' },
  { id: 'usuarios', nome: 'Usuários e permissões' }
];

const PERMISSOES_PADRAO = {
  'Diretor': ['painel', 'enviar', 'documentos', 'pendencias', 'relatorios', 'cadastros', 'historico', 'usuarios'],
  'Gerente': ['painel', 'enviar', 'documentos', 'pendencias', 'relatorios', 'cadastros', 'historico'],
  'Coordenador': ['painel', 'enviar', 'documentos', 'pendencias', 'relatorios', 'cadastros', 'historico'],
  'Supervisor': ['painel', 'enviar', 'documentos', 'pendencias', 'relatorios', 'historico'],
  'Analista': ['painel', 'enviar', 'documentos', 'pendencias', 'relatorios', 'cadastros', 'historico'],
  'Assistente Administrativo': ['painel', 'enviar', 'documentos', 'pendencias'],
  'Jovem Aprendiz': ['painel', 'enviar', 'documentos', 'pendencias'],
  'Estagiário': ['painel', 'enviar', 'documentos', 'pendencias']
};

// Ações dentro do detalhe do documento, por cargo
const ACOES_POR_CARGO = {
  alterarStatus: ['Diretor', 'Gerente', 'Coordenador', 'Supervisor', 'Analista'],
  registrarRecusa: CARGOS_QUE_ENVIAM,
  corrigir: CARGOS_QUE_ENVIAM,
  editarDados: ['Diretor', 'Gerente', 'Coordenador', 'Analista'],
  contatoCliente: CARGOS_QUE_ENVIAM,
  enviarAoCliente: CARGOS_QUE_ENVIAM,
  solicitarDocumento: CARGOS
};

/* ---------- Datas ---------- */
const Datas = {
  // Data de hoje sem horas
  hoje() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  },

  // Converte Date em "AAAA-MM-DD"
  iso(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  },

  // Hoje + n dias, em "AAAA-MM-DD"
  somarDias(n) {
    const d = Datas.hoje();
    d.setDate(d.getDate() + n);
    return Datas.iso(d);
  },

  // "AAAA-MM-DD" → "DD/MM/AAAA"
  br(iso) {
    if (!iso) return '—';
    const [a, m, d] = iso.slice(0, 10).split('-');
    return d + '/' + m + '/' + a;
  },

  // Data e hora ISO completa → "DD/MM/AAAA HH:MM"
  brHora(isoCompleto) {
    if (!isoCompleto) return '—';
    const d = new Date(isoCompleto);
    return Datas.br(Datas.iso(d)) + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  },

  // Quantos dias faltam até a data (negativo = já passou)
  diasAte(iso) {
    const [a, m, d] = iso.split('-').map(Number);
    const alvo = new Date(a, m - 1, d);
    return Math.round((alvo - Datas.hoje()) / 86400000);
  },

  // Competência ("MM/AAAA") deslocada n meses a partir do mês atual
  competencia(deslocamento) {
    const d = Datas.hoje();
    d.setDate(1);
    d.setMonth(d.getMonth() + deslocamento);
    return String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear();
  },

  // "08/2026" → "agosto de 2026"
  competenciaPorExtenso(mesAno) {
    const meses = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
    const [m, a] = mesAno.split('/');
    return meses[Number(m) - 1] + ' de ' + a;
  },

  // Agora menos alguns dias, num horário fixo (para dados de exemplo)
  momento(diasAtras, hora, minuto) {
    const d = new Date();
    d.setDate(d.getDate() - diasAtras);
    d.setHours(hora, minuto, 0, 0);
    return d.toISOString();
  },

  agora() {
    return new Date().toISOString();
  },

  // Texto amigável do prazo: "Vence em 3 dia(s)", "Vencido há 2 dia(s)"
  textoPrazo(iso) {
    const dias = Datas.diasAte(iso);
    if (dias < 0) return 'Vencido há ' + Math.abs(dias) + ' dia(s)';
    if (dias === 0) return 'Vence hoje';
    return 'Vence em ' + dias + ' dia(s)';
  }
};

/* ---------- Acesso ao localStorage ---------- */
const PREFIXO = 'flow360_';
const VERSAO_DADOS = 5;

const DB = {
  ler(chave) {
    try {
      const texto = localStorage.getItem(PREFIXO + chave);
      return texto ? JSON.parse(texto) : null;
    } catch (erro) {
      return null;
    }
  },

  salvar(chave, valor) {
    try {
      localStorage.setItem(PREFIXO + chave, JSON.stringify(valor));
      return true;
    } catch (erro) {
      console.warn('Não foi possível salvar no localStorage:', erro);
      return false;
    }
  },

  remover(chave) {
    try { localStorage.removeItem(PREFIXO + chave); } catch (erro) { /* ignora */ }
  },

  // Retorna a lista de uma coleção (ex.: "empresas")
  listar(colecao) {
    return DB.ler(colecao) || [];
  },

  buscar(colecao, id) {
    return DB.listar(colecao).find(item => item.id === Number(id)) || null;
  },

  // Próximo id numérico livre
  novoId(colecao) {
    return DB.listar(colecao).reduce((maior, item) => Math.max(maior, item.id), 0) + 1;
  },

  inserir(colecao, item) {
    const lista = DB.listar(colecao);
    item.id = DB.novoId(colecao);
    lista.push(item);
    DB.salvar(colecao, lista);
    return item;
  },

  atualizar(colecao, id, alteracoes) {
    const lista = DB.listar(colecao);
    const pos = lista.findIndex(item => item.id === Number(id));
    if (pos < 0) return null;
    lista[pos] = Object.assign({}, lista[pos], alteracoes);
    // Retorna null se o navegador não conseguiu salvar (sem espaço)
    return DB.salvar(colecao, lista) ? lista[pos] : null;
  },

  excluir(colecao, id) {
    DB.salvar(colecao, DB.listar(colecao).filter(item => item.id !== Number(id)));
  },

  // Apaga tudo e recria os dados de exemplo
  restaurar() {
    try {
      Object.keys(localStorage)
        .filter(chave => chave.startsWith(PREFIXO))
        .forEach(chave => localStorage.removeItem(chave));
    } catch (erro) { /* ignora */ }
    criarDadosIniciais();
  }
};

/* ---------- Dados de exemplo ---------- */
function criarDadosIniciais() {
  const compAtual = Datas.competencia(-1);    // mês passado
  const compAnterior = Datas.competencia(-2); // dois meses atrás

  DB.salvar('empresas', [
    { id: 1, nome: 'Empresa exemplo A', cnpj: '11.111.111/0001-11' },
    { id: 2, nome: 'Empresa exemplo B', cnpj: '22.222.222/0001-22' },
    { id: 3, nome: 'Empresa exemplo C', cnpj: '33.333.333/0001-33' }
  ]);

  DB.salvar('clientes', [
    { id: 1, nome: 'Cliente exemplo A', empresas: [1, 3] },
    { id: 2, nome: 'Cliente exemplo B', empresas: [2] }
  ]);

  DB.salvar('regionais', [
    { id: 1, nome: 'Regional exemplo A', clienteId: 1, empresaId: 1 },
    { id: 2, nome: 'Regional exemplo B', clienteId: 2, empresaId: 2 },
    { id: 3, nome: 'Regional exemplo C', clienteId: 1, empresaId: 3 }
  ]);

  // bancoHoras: "Sim" ou "Não" — indica se a unidade trabalha com banco de horas
  DB.salvar('unidades', [
    { id: 1, nome: 'Unidade exemplo A', regionalId: 1, empresaId: 1, contrato: 'CT-001', bancoHoras: 'Não' },
    { id: 2, nome: 'Unidade exemplo B', regionalId: 2, empresaId: 2, contrato: 'CT-002', bancoHoras: 'Sim' },
    { id: 3, nome: 'Unidade exemplo C', regionalId: 3, empresaId: 3, contrato: 'CT-003', bancoHoras: 'Não' }
  ]);

  DB.salvar('colaboradores', [
    { id: 1, nome: 'Colaborador exemplo A', empresaId: 1, unidadeId: 1, contrato: 'CT-001' },
    { id: 2, nome: 'Colaborador exemplo B', empresaId: 2, unidadeId: 2, contrato: 'CT-002' },
    { id: 3, nome: 'Colaborador exemplo C', empresaId: 3, unidadeId: 3, contrato: 'CT-003' }
  ]);

  DB.salvar('competencias', [
    { id: 1, mesAno: compAnterior, prazo: Datas.somarDias(-24) },
    { id: 2, mesAno: compAtual, prazo: Datas.somarDias(7) }
  ]);

  DB.salvar('regras', [
    { id: 1, clienteId: 1, situacao: 'Documentação mensal', colaboradorId: null,
      documentos: ['Folha de pagamento', 'Folha de ponto', 'Guia de FGTS', 'Relação de empregados'] },
    { id: 2, clienteId: 1, situacao: 'Kit demissional', colaboradorId: null,
      documentos: ['Termo rescisório', 'Aviso prévio assinado', 'Comprovante de pagamento', 'Guia de FGTS', 'Guia de seguro-desemprego', 'Baixa na Previdência Social', 'ASO demissional'] },
    { id: 3, clienteId: 2, situacao: 'Documentação mensal', colaboradorId: null,
      documentos: ['Folha de pagamento', 'Folha de ponto', 'Comprovante de pagamento', 'Plano de saúde', 'Plano odontológico'] }
  ]);

  // Função auxiliar para montar documentos de exemplo
  let proximoId = 1;
  function doc(tipo, empresaId, clienteId, unidadeId, colaboradorId, competencia, diasPrazo, status, extras) {
    const id = proximoId++;
    return Object.assign({
      id, tipo, empresaId, clienteId, unidadeId, colaboradorId, competencia,
      prazo: Datas.somarDias(diasPrazo),
      status,
      nivelAcesso: 'Geral',
      motivoRecusa: '',
      origemRecusa: '',
      // Dados lidos do documento, usados na comparação entre documentos (T22)
      dados: { horasExtras: '—', bancoHoras: '—' },
      versoes: status === 'Pendente' ? [] : [{
        versao: 1,
        arquivo: { nome: tipo.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-') + '.pdf', tamanho: 184000 + id * 1300, tipo: 'application/pdf' },
        data: Datas.momento(12, 9, 0),
        usuario: 'Ricardo Almeida'
      }],
      observacao: ''
    }, extras || {});
  }

  DB.salvar('documentos', [
    doc('Folha de pagamento', 1, 1, 1, null, compAtual, 5, 'Em análise', { dados: { horasExtras: '12 horas', bancoHoras: 'Não aplicado' } }),
    doc('Folha de ponto', 1, 1, 1, null, compAtual, 4, 'Recusado', {
      motivoRecusa: 'A folha de ponto contém banco de horas, mas a unidade não trabalha com esse modelo.',
      origemRecusa: 'Empresa',
      dados: { horasExtras: '12 horas', bancoHoras: 'Contém banco de horas' }
    }),
    doc('Guia de FGTS', 1, 1, 1, null, compAnterior, -10, 'Aprovado'),
    doc('Relação de empregados', 1, 1, 1, null, compAtual, -2, 'Pendente'),
    doc('Termo rescisório', 2, 2, 2, 2, compAtual, 12, 'Aguardando correção', {
      motivoRecusa: 'Valor do aviso prévio diferente do informado no termo.', origemRecusa: 'Empresa'
    }),
    doc('Plano de saúde', 3, 1, 3, null, compAtual, 3, 'Em análise'),
    doc('Plano odontológico', 2, 2, 2, null, compAnterior, -5, 'Recusado', {
      motivoRecusa: 'Relatório lista um colaborador de outra unidade.', origemRecusa: 'Empresa'
    }),
    doc('Folha de pagamento', 2, 2, 2, null, compAtual, 2, 'Pendente', { nivelAcesso: 'Diretoria' }),
    doc('Holerite', 3, 1, 3, 3, compAtual, 1, 'Pendente'),
    doc('ASO demissional', 2, 2, 2, 2, compAtual, 20, 'Aprovado'),
    doc('Comprovante de pagamento', 2, 2, 2, null, compAtual, 9, 'Aprovado')
  ]);

  DB.salvar('pendencias', [
    { id: 1, documentoId: 2, documento: 'Folha de ponto', origem: 'Cliente', motivo: 'Banco de horas incompatível com a unidade.', responsavel: 'Ricardo Almeida', acao: 'Consultar e corrigir', status: 'aberta', data: Datas.momento(2, 9, 30) },
    { id: 2, documentoId: 5, documento: 'Termo rescisório', origem: 'Empresa', motivo: 'Valor do aviso prévio diverge do termo.', responsavel: 'Ricardo Almeida', acao: 'Substituir arquivo', status: 'aberta', data: Datas.momento(3, 14, 0) },
    { id: 3, documentoId: 7, documento: 'Plano odontológico', origem: 'Cliente', motivo: 'Colaborador de outra unidade no relatório.', responsavel: 'Juliana Costa', acao: 'Consultar recusa', status: 'aberta', data: Datas.momento(4, 11, 15) },
    { id: 4, documentoId: 4, documento: 'Relação de empregados', origem: 'Pré-auditoria', motivo: 'Documento obrigatório ausente.', responsavel: 'Ricardo Almeida', acao: 'Anexar documento', status: 'aberta', data: Datas.momento(1, 16, 40) },
    { id: 5, documentoId: 3, documento: 'Guia de FGTS', origem: 'Cliente', motivo: 'Competência incorreta.', responsavel: 'Juliana Costa', acao: 'Substituir arquivo', status: 'resolvida', data: Datas.momento(20, 10, 0), resolvidaEm: Datas.momento(18, 15, 20), resolucao: 'Arquivo substituído pela competência correta e aprovado.' }
  ]);

  DB.salvar('historico', [
    { id: 1, data: Datas.momento(0, 10, 45), usuario: 'Ricardo Almeida', acao: 'Visualizou o documento', referencia: 'Folha de ponto • ' + compAtual, tipo: 'atividade', documentoId: 2, versao: 1 },
    { id: 2, data: Datas.momento(0, 10, 42), usuario: 'Ricardo Almeida', acao: 'Reexecutou a pré-auditoria', referencia: 'Remessa 001 • 7 verificações', tipo: 'verificacao', resultado: 'Bloqueada', verificacoes: 7, detalhes: 'Documento obrigatório ausente: Relação de empregados.' },
    { id: 3, data: Datas.momento(0, 10, 40), usuario: 'Ricardo Almeida', acao: 'Substituiu arquivo incorreto', referencia: 'Termo rescisório • versão 1', tipo: 'atividade', documentoId: 5, versao: 1 },
    { id: 4, data: Datas.momento(2, 9, 30), usuario: 'Cliente exemplo A', acao: 'Recusou: banco de horas incompatível', referencia: 'Folha de ponto • banco de horas', tipo: 'atividade', documentoId: 2, versao: 1 },
    { id: 5, data: Datas.momento(3, 11, 0), usuario: 'Rafael Souza', acao: 'Enviou documentação', referencia: 'Guia de FGTS • ' + compAnterior, tipo: 'atividade', documentoId: 3, versao: 1 },
    { id: 6, data: Datas.momento(6, 15, 10), usuario: 'Juliana Costa', acao: 'Executou a pré-auditoria', referencia: 'Remessa 000 • 7 verificações', tipo: 'verificacao', resultado: 'Aprovada', verificacoes: 7, detalhes: 'Todas as verificações foram validadas.' },
    { id: 7, data: Datas.momento(12, 9, 0), usuario: 'Ricardo Almeida', acao: 'Enviou documentação para análise', referencia: 'Folha de ponto • ' + compAtual, tipo: 'atividade', documentoId: 2, versao: 1 }
  ]);

  // Um usuário por cargo (role). O login é o e-mail; senha 123 para todos
  DB.salvar('usuarios', [
    { id: 1, nome: 'Ricardo Almeida', login: 'ricardo@gmail.com', senha: '123', cargos: ['Diretor'], ativo: true },
    { id: 2, nome: 'Juliana Costa', login: 'juliana@gmail.com', senha: '123', cargos: ['Analista'], ativo: true },
    { id: 3, nome: 'Fernanda Lima', login: 'fernanda@gmail.com', senha: '123', cargos: ['Assistente Administrativo'], ativo: true },
    { id: 4, nome: 'Marcos Oliveira', login: 'marcos@gmail.com', senha: '123', cargos: ['Gerente'], ativo: true },
    { id: 5, nome: 'Patrícia Santos', login: 'patricia@gmail.com', senha: '123', cargos: ['Coordenador'], ativo: true },
    { id: 6, nome: 'Bruno Ferreira', login: 'bruno@gmail.com', senha: '123', cargos: ['Supervisor'], ativo: true },
    { id: 7, nome: 'Lucas Pereira', login: 'lucas@gmail.com', senha: '123', cargos: ['Jovem Aprendiz'], ativo: true },
    { id: 8, nome: 'Camila Rocha', login: 'camila@gmail.com', senha: '123', cargos: ['Estagiário'], ativo: true },
    { id: 9, nome: 'Rafael Souza', login: 'rafael@gmail.com', senha: '123', cargos: ['Assistente Administrativo'], ativo: false }
  ]);

  DB.salvar('permissoes', PERMISSOES_PADRAO);

  DB.salvar('notificacoes', [
    { id: 1, texto: 'Folha de ponto recusada pelo cliente.', data: Datas.momento(2, 9, 31), lida: false, link: 'documento.html?id=2' },
    { id: 2, texto: 'Prazo de envio da competência ' + compAtual + ' termina em 7 dias.', data: Datas.momento(1, 8, 0), lida: false, link: 'prazos.html' },
    { id: 3, texto: 'Guia de FGTS vencida há 10 dias.', data: Datas.momento(0, 8, 0), lida: false, link: 'documento.html?id=3' },
    { id: 4, texto: 'Pré-auditoria da remessa 000 aprovada.', data: Datas.momento(6, 15, 11), lida: true, link: 'historico.html?aba=verificacoes' }
  ]);

  DB.salvar('envios', []);
  DB.salvar('versao', VERSAO_DADOS);
}

// Cria os dados na primeira visita (ou se a estrutura mudou)
if (DB.ler('versao') !== VERSAO_DADOS) {
  DB.restaurar();
}

/* ---------- Nomes a partir de ids ---------- */
const Nomes = {
  empresa(id) { const e = DB.buscar('empresas', id); return e ? e.nome : '—'; },
  cliente(id) { const c = DB.buscar('clientes', id); return c ? c.nome : '—'; },
  regional(id) { const r = DB.buscar('regionais', id); return r ? r.nome : '—'; },
  unidade(id) { const u = DB.buscar('unidades', id); return u ? u.nome : '—'; },
  colaborador(id) { const c = DB.buscar('colaboradores', id); return c ? c.nome : '—'; }
};

/* ---------- Sessão (usuário logado) ---------- */
const Sessao = {
  atual() {
    return DB.ler('sessao');
  },

  usuario() {
    const s = Sessao.atual();
    return s ? DB.buscar('usuarios', s.usuarioId) : null;
  },

  cargo() {
    const s = Sessao.atual();
    return s ? s.cargo : null;
  },

  entrar(usuario, cargo) {
    DB.salvar('sessao', { usuarioId: usuario.id, cargo, inicio: Datas.agora() });
  },

  sair() {
    DB.remover('sessao');
    location.href = 'index.html';
  },

  // O cargo atual tem acesso à tela?
  pode(modulo) {
    const permissoes = DB.ler('permissoes') || PERMISSOES_PADRAO;
    return (permissoes[Sessao.cargo()] || []).includes(modulo);
  },

  // O cargo atual pode executar a ação (ver ACOES_POR_CARGO)?
  podeAcao(acao) {
    return (ACOES_POR_CARGO[acao] || []).includes(Sessao.cargo());
  },

  // O cargo atual prepara documentos em vez de enviar ao cliente?
  apenasPrepara() {
    return CARGOS_QUE_PREPARAM.includes(Sessao.cargo());
  }
};

/* ---------- Registros automáticos ---------- */
function registrarHistorico(acao, referencia, tipo, extras) {
  const usuario = Sessao.usuario();
  DB.inserir('historico', Object.assign({
    data: Datas.agora(),
    usuario: usuario ? usuario.nome : 'Sistema',
    acao,
    referencia,
    tipo: tipo || 'atividade'
  }, extras || {}));
}

function notificar(texto, link) {
  DB.inserir('notificacoes', { texto, data: Datas.agora(), lida: false, link: link || '' });
}

/* ---------- Documentos visíveis para o cargo (RF50 e RF51) ---------- */
function niveisDoCargo(cargo) {
  return (ACESSO_POR_CARGO[cargo || Sessao.cargo()] || { niveis: ['Geral'] }).niveis;
}

function documentosVisiveis() {
  const niveis = niveisDoCargo();
  return DB.listar('documentos').filter(d => niveis.includes(d.nivelAcesso || 'Geral'));
}

function pendenciasVisiveis() {
  const ids = documentosVisiveis().map(d => d.id);
  return DB.listar('pendencias').filter(p => !p.documentoId || ids.includes(p.documentoId));
}

// Arquivo mais recente de um documento
function versaoAtual(documento) {
  return documento.versoes.length ? documento.versoes[documento.versoes.length - 1] : null;
}
