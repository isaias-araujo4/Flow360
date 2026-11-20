/* Flow360 — Login */

// Se já existe sessão, vai direto para o painel
if (Sessao.usuario() && Sessao.usuario().ativo) {
  location.href = 'painel.html';
}

const formLogin = UI.$('#form-login');
const campoUsuario = UI.$('#login-usuario');
const campoSenha = UI.$('#login-senha');
const erroLogin = UI.$('#login-erro');

// Veio do layout porque o usuário foi inativado
if (UI.param('motivo') === 'inativo') {
  UI.aviso('erro', 'Acesso inativo', 'Seu usuário foi inativado. Procure um diretor para reativar o acesso.');
}

formLogin.addEventListener('submit', evento => {
  evento.preventDefault();
  UI.limparInvalidos(formLogin);
  erroLogin.textContent = '';

  const login = campoUsuario.value.trim().toLowerCase();
  const senha = campoSenha.value;

  // Formulário incompleto
  if (!login || !senha) {
    UI.marcarInvalido(campoUsuario, !login);
    UI.marcarInvalido(campoSenha, !senha);
    erroLogin.textContent = 'Preencha o e-mail e a senha.';
    return;
  }

  const usuario = DB.listar('usuarios').find(u => u.login.toLowerCase() === login);

  if (!usuario || usuario.senha !== senha) {
    UI.marcarInvalido(campoUsuario, true);
    UI.marcarInvalido(campoSenha, true);
    erroLogin.textContent = 'E-mail ou senha incorretos.';
    return;
  }

  if (!usuario.ativo) {
    UI.aviso('erro', 'Acesso inativo', 'O usuário <strong>' + UI.esc(usuario.nome) + '</strong> está inativo. Procure um diretor para reativar o acesso.');
    return;
  }

  // O cargo (role) vem do cadastro do usuário, definido pelo administrador
  const cargo = usuario.cargos[0];
  if (!CARGOS.includes(cargo)) {
    UI.aviso('erro', 'Acesso restrito', 'Seu usuário não possui um cargo válido. Procure um diretor.');
    return;
  }

  Sessao.entrar(usuario, cargo);
  registrarHistorico('Entrou no sistema', 'Cargo: ' + cargo);
  location.href = 'painel.html';
});
