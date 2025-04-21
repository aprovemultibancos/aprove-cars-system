# Sistema de Gestão Aprove Cars

Sistema de gestão integrado para Aprove Cars e Aprove Financiamentos, oferecendo ferramentas robustas para profissionais de vendas automotivas com recursos avançados de relatórios financeiros e operacionais.

![Aprove Cars](https://aprove.com.br/assets/img/logo.png)

## Funcionalidades Principais

- Gestão de inventário de veículos
- Cadastro e gestão de clientes
- Registro de vendas de veículos
- Administração de financiamentos
- Controle de despesas
- Gestão de equipe (vendedores, agentes e concessionárias)
- Relatórios detalhados e análise financeira
- Cálculo automático de lucro (Retorno - ILA + Acessórios + Taxa - Comissões)
- Interface responsiva para uso em desktop e dispositivos móveis
- Verificação automática de dados de veículos via API de placas

## Tecnologias Utilizadas

- **Frontend**: React com TypeScript, TailwindCSS, Shadcn/UI
- **Backend**: Node.js com Express
- **Banco de Dados**: PostgreSQL (Neon Serverless)
- **ORM**: Drizzle ORM
- **Autenticação**: Sistema baseado em roles
- **Consulta de Placas**: Integração com API de verificação de placas de veículos

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

## Requisitos do Sistema

- Node.js 16+ 
- NPM 7+
- PostgreSQL 13+ (ou uma conta no Neon.tech para o banco de dados serverless)
- Navegador moderno (Chrome, Firefox, Edge ou Safari)
- Variáveis de ambiente configuradas (veja `.env.example`)

## Contribuindo

Para contribuir com o projeto:

1. Faça um fork do repositório
2. Crie uma branch para sua feature (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas mudanças (`git commit -m 'Adiciona nova funcionalidade'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

## Manutenção e Suporte

Para reportar problemas ou solicitar suporte, abra uma issue no repositório GitHub ou entre em contato com a equipe de desenvolvimento.

## Desenvolvido por

Aprove Financiamentos - Todos os direitos reservados © 2023-2025