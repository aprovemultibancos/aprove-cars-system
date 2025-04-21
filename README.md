# Sistema de Gestão Aprove Cars

Sistema de gestão integrado para Aprove Cars e Aprove Financiamentos, oferecendo ferramentas robustas para profissionais de vendas automotivas com recursos avançados de relatórios.

## Funcionalidades Principais

- Gestão de inventário de veículos
- Cadastro e gestão de clientes
- Registro de vendas de veículos
- Administração de financiamentos
- Controle de despesas
- Gestão de equipe (vendedores, agentes e concessionárias)
- Relatórios detalhados e análise financeira
- Cálculo automático de lucro (Retorno - ILA + Acessórios + Taxa - Comissões)

## Tecnologias Utilizadas

- **Frontend**: React com TypeScript, TailwindCSS
- **Backend**: Node.js com Express
- **Banco de Dados**: PostgreSQL (Neon Serverless)
- **ORM**: Drizzle ORM
- **Autenticação**: Sistema baseado em roles

## Instalação

```bash
# Instalar dependências
npm install

# Configurar banco de dados
npm run db:push

# Iniciar aplicação em modo desenvolvimento
npm run dev
```

## Credenciais de Acesso

- **Usuário**: administrador
- **Senha**: Administrador123

## Estrutura do Projeto

- `client/` - Código do frontend React
- `server/` - API Express e lógica de negócios
- `shared/` - Tipos e schemas compartilhados entre cliente e servidor
- `scripts/` - Scripts utilitários

## Desenvolvido por

Aprove Financiamentos