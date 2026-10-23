# Pizzaria Dom Formágio na Serra — Cardápio Online

Aplicação responsiva de cardápio com pedidos por WhatsApp, autenticação de equipe e painel administrativo para gerenciar produtos.

## Rotas

- / — cardápio público.
- /login — acesso com e-mail e senha.
- /admin — gerenciamento de produtos (administrador e equipe).
- /conta — área de conta para perfis autenticados.

## Configuração local

    npm install
    cp .env.example .env
    npm run dev

Configure no arquivo .env:

- VITE_SUPABASE_URL=https://gxewfwlpcxfialswgeyz.supabase.co
- VITE_SUPABASE_PUBLISHABLE_KEY=... — chave publishable do projeto Supabase.

Nunca coloque a chave service_role, senha do banco ou qualquer chave secreta em variáveis VITE_* ou no frontend.

## Banco de dados e fotos

A migração supabase/migrations/20261022190000_catalog_admin.sql cria:

- profiles com perfis administrador, equipe e usuario;
- criação automática de perfil usuario ao cadastrar um usuário no Supabase Auth;
- tabela products com descrição, categoria, foto, preços e disponibilidade;
- catalog_settings para o valor da borda recheada;
- políticas RLS para a leitura pública e operações administrativas;
- bucket público product-images, com envio/edição/exclusão de imagens restritos a administrador/equipe;
- os sabores enviados pela pizzaria. Preços de doces e bebidas ficam vazios, pois não constavam no cardápio de referência.

Se a migração ainda não tiver sido aplicada no projeto gxewfwlpcxfialswgeyz, aplique-a no SQL Editor do Supabase. Se já foi aplicada por outro fluxo, confira primeiro a estrutura/tabelas antes de executar novamente.

## Criar o primeiro administrador

1. No Supabase, abra Authentication → Users e cadastre o e-mail que será usado pelo administrador.
2. Depois que o perfil for criado automaticamente, abra o SQL Editor e promova somente esse usuário, substituindo o e-mail de exemplo:

    update public.profiles p
    set role = 'administrador'
    from auth.users u
    where p.id = u.id
      and u.email = 'admin@seudominio.com';

3. Confirme que a consulta alterou exatamente uma linha e faça login em /login.

Cadastros novos começam como usuario. A promoção de perfil não é disponibilizada ao frontend.

## Hospedagem Cloudflare Pages

Configure as variáveis VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY nas variáveis de ambiente do projeto Pages para Preview e Production, depois publique/reconstrua o site. A chave publishable pode ser usada no frontend porque o acesso real é controlado pelas políticas RLS; não use uma chave secreta.

## Build de produção

    npm run build

O checkout via WhatsApp não substitui um sistema de pagamento online. Confirme os preços que ainda não constam no cardápio antes de divulgá-los.
