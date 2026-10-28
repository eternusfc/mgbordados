# MG Bordados — site estático

Site responsivo em HTML, CSS e JavaScript puro. Não precisa de build nem de backend.

## Como ver o site

O conteúdo é carregado dos arquivos JSON de `config/`, então abrir o `.html` com duplo clique não funciona (o navegador bloqueia a leitura dos JSON). Rode um servidor local na pasta do site:

```bash
python3 -m http.server 8000
```

Depois abra http://localhost:8000. Para publicar, envie a pasta inteira para qualquer hospedagem de site estático (Netlify, GitHub Pages, Cloudflare Pages etc.).

## Onde editar

| Arquivo | O que controla |
| --- | --- |
| `config/site.json` | Nome, slogan, **telefone, WhatsApp, e-mail, endereço, horário, redes sociais**, cores, textos do rodapé |
| `config/menu.json` | Itens do menu e botão de orçamento |
| `config/produtos.json` | Categorias e produtos (nome, descrição, imagem, técnicas, destaque na home) |
| `config/paginas.json` | Todos os textos de Início, Produtos, Serviços, Sobre e Contato, incluindo campos do formulário e perguntas frequentes |

Telefone, e-mail e endereço não aparecem em nenhum `.html`: tudo vem de `config/site.json`. Redes sociais com `url` vazio não aparecem no site.

## Tema claro e escuro

O site segue o tema do celular/computador e tem um botão (lua/sol) no topo para alternar; a escolha fica salva no navegador. Em `config/site.json`:

- `tema.padrao`: `"auto"` (segue o sistema), `"claro"` ou `"escuro"`.
- `tema.permitirAlternar`: `false` esconde o botão.
- `coresEscuro`: cores do tema escuro (`fundo`, `superficie`, `texto`, `titulo`, `suave`, `borda`, `linha`, `campo`).

## Imagens

Coloque as fotos na pasta `imagens/` e troque o caminho no JSON, por exemplo `"imagem": "imagens/camiseta-bordada.jpg"`. Enquanto o arquivo não existir (ou o campo estiver vazio), o site usa `imagens/padrao.svg`. Formato recomendado: retrato 4:5, por exemplo 800 × 1000 px.

## Formulário de contato

Como o site é estático, o formulário monta a mensagem e abre o WhatsApp (ou o e-mail) já preenchida, usando os dados de `config/site.json`. Nada é guardado no site.

## Estrutura

```
index.html  produtos.html  servicos.html  sobre.html  contato.html
css/estilo.css
js/app.js
config/   site.json  menu.json  produtos.json  paginas.json
imagens/  padrao.svg
```

Para criar uma nova página, copie um `.html` existente, mude o `data-pagina`, adicione o bloco no `paginas.json`, uma função em `js/app.js` (objeto `PAGINAS`) e o item em `menu.json`.
