# Flow360

Sistema de centralização, conferência e pré-auditoria de documentação trabalhista e fiscal. É o protótipo da equipe **InfinityCode** para a disciplina de Processo de Software (UCSal).

Foi feito **somente com HTML5, CSS3 e JavaScript puro**: sem bibliotecas, frameworks, APIs externas ou banco de dados (seção 2.3.3 do relatório).

## Como abrir

Dê dois cliques em `index.html`. Não precisa de servidor nem de instalação.

Ou então

link: 
flow3600.netlify.app

Usuários de teste (senha `123` para todos). Há um usuário por cargo (role). No login, a pessoa informa só o e-mail e a senha, e o cargo vem do cadastro:

| E-mail (login) | Nome | Cargo |
|---|---|---|
| `ricardo@gmail.com` | Ricardo Almeida | Diretor (administrador: cria usuários e define a role de cada um) |
| `marcos@gmail.com` | Marcos Oliveira | Gerente |
| `patricia@gmail.com` | Patrícia Santos | Coordenador |
| `bruno@gmail.com` | Bruno Ferreira | Supervisor |
| `juliana@gmail.com` | Juliana Costa | Analista |
| `fernanda@gmail.com` | Fernanda Lima | Assistente Administrativo |
| `lucas@gmail.com` | Lucas Pereira | Jovem Aprendiz |
| `camila@gmail.com` | Camila Rocha | Estagiário |
| `rafael@gmail.com` | Rafael Souza | Usuário inativo (mostra "Acesso inativo") |

## Telas do descritivo × arquivos

| Tela | Arquivo |
|---|---|
| T01 Login | `index.html` |
| T02 Painel Geral | `painel.html` |
| T03, T16–T21 Envio e pré-auditoria | `enviar.html` |
| T04 Documentos | `documentos.html` |
| T05, T29, T30 Pendências | `pendencias.html` |
| T06, T31 Relatórios | `relatorios.html` |
| T07, T26, T27 Histórico | `historico.html` |
| T08 Usuários | `usuarios.html` |
| T09–T15 Cadastros | `empresas.html`, `clientes.html`, `regionais.html`, `unidades.html`, `colaboradores.html`, `competencias.html`, `documentos-obrigatorios.html` |
| T22–T25 Documento, comparação, reenvio, histórico | `documento.html?id=N` |
| T28 Prazos e alertas | `prazos.html` |
| T32 Permissões de acesso | `permissoes.html` |
| Perfil e sessão, notificações, privacidade | `perfil.html`, `notificacoes.html`, `privacidade.html` |

## Estrutura do código

```
css/style.css          Todo o visual, incluindo tablet, celular e impressão
js/dados.js            "Banco de dados" com localStorage, cargos, matriz de acesso e dados de exemplo
js/ui.js               Componentes: modal, avisos, tabela, seleção múltipla, ícones SVG
js/layout.js           Cabeçalho, menu lateral, notificações, menu do avatar, controle de acesso
js/paginas/*.js        Código de cada tela
```

## Regras implementadas

- **Controle de acesso (RF50, RF51):** cada documento tem um nível de acesso (Geral, Gerência, Coordenação ou Diretoria). Cada cargo vê somente os níveis da matriz T32. As telas liberadas por cargo podem ser alteradas em Permissões.
- **Jovem Aprendiz e Estagiário (T20):** preparam a remessa, que é disponibilizada ao responsável com status Pendente. Eles não enviam ao cliente.
- **Pré-auditoria (RF16–RF29):** antes do envio, o sistema faz 7 verificações:
  1. Documentos obrigatórios presentes
  2. Empresa e CNPJ correspondem
  3. Unidade corresponde
  4. Cliente corresponde
  5. Competência corresponde
  6. Colaborador corresponde (no kit demissional)
  7. Regras da unidade, incluindo banco de horas

  Com qualquer inconsistência, o botão de envio fica bloqueado. A tela mostra a origem provável e a ação de correção de cada problema.
- **Recusas (RF30–RF35):** o motivo fica vinculado ao documento, o status muda para Recusado, uma pendência é aberta e o responsável é notificado. Uma recusa sem divergência nos dados aponta o Cliente como origem provável.
- **Gerenciamento de usuários (T08):** o Diretor cria os usuários com e-mail (que é o login), senha e um cargo (role). O cargo define as telas e os documentos que cada um vê. Para testar outro cargo, é preciso sair e entrar com o usuário desse cargo.
- **Usuários desligados (LGPD, RF52):** a inativação bloqueia o acesso, mas mantém todo o histórico.

Como não há servidor, as conferências da pré-auditoria usam o nome, o tipo e o tamanho dos arquivos. Alguns exemplos que mostram o bloqueio:

- `folha-08-2026.pdf` enviado na competência 09/2026 bloqueia por competência.
- Um arquivo com "banco" no nome, numa unidade sem banco de horas, bloqueia pela regra da unidade.
- Um CNPJ diferente no nome do arquivo bloqueia por empresa.

## Como os dados são salvos

O `localStorage` é uma API nativa do navegador, não um framework. Cada coleção é salva como texto JSON com o prefixo `flow360_`. Para voltar aos dados iniciais, use **Perfil → Restaurar dados de exemplo**.
