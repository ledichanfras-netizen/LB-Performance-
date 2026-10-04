# Acessos e convites no aplicativo

`/acessos` é a área de configurações para contas de treinador. Existe um atalho no topo e no menu; **Convidar aluno** abre a tela com o atleta selecionado no cabeçalho do aplicativo.

## Permissões

- Treinador: alunos da própria organização. Não pode criar organizações, convidar treinadores, consultar convites de outra organização ou revogar convites de treinador.
- Administrador: própria organização e organizações explicitamente vinculadas à supervisão. Pode criar organizações e convidar treinadores e alunos.
- Organização nova criada pelo administrador ganha vínculo e auditoria de supervisão na mesma transação. Organizações antigas sem vínculo continuam exigindo vinculação na área de supervisão.
- A visão temporária de supervisor é somente leitura e não abre esta área com a credencial temporária.
- Alunos não gerenciam convites.

## Fluxo

1. Cadastre o atleta no aplicativo.
2. Selecione o nome do atleta em **Acessos e convites** ou abra **Convidar aluno** no cabeçalho do atleta.
3. Confirme o usuário de acesso; nomes sem acentos são sugeridos e podem ser alterados. Usuários existentes são apresentados para redefinição de senha.
4. Gere o convite e copie o texto/link ou abra o WhatsApp para escolher o destinatário e enviar. O aplicativo não envia mensagens automaticamente.
5. A pessoa abre `/convite#TOKEN`, cria e confirma sua senha de pelo menos 8 caracteres, e entra com o usuário informado. Google não está integrado nesta etapa.

O token vai no fragmento do link, que não é enviado ao servidor na navegação da página. A aceitação envia o token em POST. Apenas o hash é persistido no banco; o link em texto fica em memória após a criação. Atualizar a página não recupera tokens em texto. O histórico exibe estado e validade, sem token ou hash.

Convites valem 48 horas e são usados uma vez. Revogar impede a aceitação. Gerar outro convite pendente pede confirmação, revoga o anterior e cria um novo. Se a nova criação falhar após revogar, a tela informa isso e permite repetir. Convite já aceito pode gerar redefinição; isso incrementa a versão da sessão e invalida acessos anteriores ao trocar a senha.

A lista é paginada em 50 convites. Atletas arquivados não podem receber novo convite. Não há transferência de atletas nem liberação automática de IA ou plano pago. A associação e as permissões são verificadas no servidor.

## Validação

`npm run test:accounts`, `npm run lint`, `npm run build` e compilação ESM do servidor. Teste PostgreSQL/HTTP cobre treinador isolado, aluno sem permissão, administrador com vínculo, organização nova vinculada automaticamente, revogação, token de uso único, senha de 8 caracteres, login do aluno e leitura apenas do próprio atleta.
