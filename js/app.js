/* MG Bordados — monta as páginas a partir dos arquivos em config/.
   Telefone, e-mail, endereço, textos e produtos ficam nos JSON, nunca no HTML. */
(() => {
  'use strict';

  const estado = { site: null, menu: null, produtos: null, paginas: null };

  /* ---------- utilitários ---------- */

  function h(tag, attrs, ...filhos) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v === null || v === undefined || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const filho of filhos.flat(Infinity)) {
      if (filho === null || filho === undefined || filho === false) continue;
      el.append(filho.nodeType ? filho : document.createTextNode(String(filho)));
    }
    return el;
  }

  const digitos = (s) => String(s || '').replace(/\D/g, '');
  const carregar = async (url) => {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`${url} (${r.status})`);
    return r.json();
  };

  const urlWhatsapp = (mensagem) =>
    `https://wa.me/${digitos(estado.site.contato.whatsapp)}?text=${encodeURIComponent(
      mensagem || estado.site.whatsappMensagemPadrao || ''
    )}`;

  const urlTelefone = () => {
    const c = estado.site.contato;
    return `tel:${c.telefoneLink || '+' + digitos(c.telefone)}`;
  };

  function imagem(src, alt, classe, eager) {
    const img = h('img', {
      src: src || estado.site.imagemPadrao,
      alt: alt || '',
      class: classe,
      loading: eager ? 'eager' : 'lazy',
      decoding: 'async',
    });
    img.addEventListener('error', () => {
      if (img.dataset.reserva) return;
      img.dataset.reserva = '1';
      img.src = estado.site.imagemPadrao;
    });
    return img;
  }

  function botao(cfg, estiloPadrao) {
    if (!cfg) return null;
    const whats = cfg.acao === 'whatsapp';
    return h('a', {
      class: `botao botao--${cfg.estilo || estiloPadrao || 'denim'}`,
      href: whats ? urlWhatsapp() : cfg.href,
      target: whats ? '_blank' : null,
      rel: whats ? 'noopener' : null,
      text: cfg.rotulo,
    });
  }

  /* ---------- tema claro/escuro ---------- */

  const CHAVE_TEMA = 'mg-tema';
  const raiz = document.documentElement;
  const sistemaEscuro = window.matchMedia('(prefers-color-scheme: dark)');
  let chavesEscuro = [];

  function temaGuardado() {
    try {
      const v = localStorage.getItem(CHAVE_TEMA);
      return v === 'claro' || v === 'escuro' ? v : null;
    } catch (e) {
      return null;
    }
  }

  function temaPadrao() {
    return (estado.site.tema && estado.site.tema.padrao) || 'auto';
  }

  function temaInicial() {
    const guardado = temaGuardado();
    if (guardado) return guardado;
    const padrao = temaPadrao();
    if (padrao === 'claro' || padrao === 'escuro') return padrao;
    return sistemaEscuro.matches ? 'escuro' : 'claro';
  }

  function definirTema(tema, guardar) {
    const { cores, coresEscuro } = estado.site;
    chavesEscuro.forEach((k) => raiz.style.removeProperty(`--${k}`));
    chavesEscuro = [];
    Object.entries(cores || {}).forEach(([k, v]) => raiz.style.setProperty(`--${k}`, v));
    if (tema === 'escuro') {
      Object.entries(coresEscuro || {}).forEach(([k, v]) => {
        raiz.style.setProperty(`--${k}`, v);
        chavesEscuro.push(k);
      });
    }
    raiz.dataset.tema = tema;
    if (guardar) {
      try { localStorage.setItem(CHAVE_TEMA, tema); } catch (e) { /* navegação privada */ }
    }
    document.dispatchEvent(new CustomEvent('mg-tema'));
  }

  function icone(tipo) {
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('class', `icone-${tipo}`);
    const forma = (nome, attrs) => {
      const el = document.createElementNS(ns, nome);
      Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
      svg.append(el);
    };
    if (tipo === 'lua') {
      forma('path', { d: 'M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z' });
    } else {
      forma('circle', { cx: 12, cy: 12, r: 4 });
      forma('path', { d: 'M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4' });
    }
    return svg;
  }

  function botaoTema() {
    const cfg = estado.site.tema || {};
    if (cfg.permitirAlternar === false) return null;
    const paraEscuro = cfg.rotuloParaEscuro || 'Ativar tema escuro';
    const paraClaro = cfg.rotuloParaClaro || 'Ativar tema claro';
    const btn = h('button', { class: 'tema-botao', type: 'button' }, icone('lua'), icone('sol'));

    const atualizar = () => {
      const rotulo = raiz.dataset.tema === 'escuro' ? paraClaro : paraEscuro;
      btn.setAttribute('aria-label', rotulo);
      btn.title = rotulo;
    };
    btn.addEventListener('click', () => definirTema(raiz.dataset.tema === 'escuro' ? 'claro' : 'escuro', true));
    document.addEventListener('mg-tema', atualizar);
    atualizar();
    return btn;
  }

  /* ---------- peças comuns ---------- */

  function cabecalhoSite(paginaAtual) {
    const { site, menu } = estado;
    const selo = site.logo && site.logo.imagem
      ? h('span', { class: 'marca-selo' }, h('img', { src: site.logo.imagem, alt: '' }))
      : h('span', { class: 'marca-selo', 'aria-hidden': 'true', text: (site.logo && site.logo.iniciais) || site.nome.slice(0, 2) });

    const lista = h('ul', {}, menu.itens.map((item) =>
      h('li', {}, h('a', {
        class: 'link',
        href: item.href,
        'aria-current': item.pagina === paginaAtual ? 'page' : null,
        text: item.rotulo,
      }))
    ));

    const nav = h('nav', { class: 'navegacao', id: 'navegacao', 'aria-label': site.rodape.navegacao }, lista, botao(menu.cta, 'denim'));

    const toggle = h('button', {
      class: 'menu-botao',
      type: 'button',
      'aria-expanded': 'false',
      'aria-controls': 'navegacao',
      'aria-label': site.textos.abrirMenu,
    }, h('span'));

    toggle.addEventListener('click', () => {
      const aberto = nav.classList.toggle('aberto');
      toggle.setAttribute('aria-expanded', String(aberto));
      toggle.setAttribute('aria-label', aberto ? site.textos.fecharMenu : site.textos.abrirMenu);
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && nav.classList.contains('aberto')) {
        nav.classList.remove('aberto');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.setAttribute('aria-label', site.textos.abrirMenu);
        toggle.focus();
      }
    });

    return h('div', { class: 'container cabecalho-linha' },
      h('a', { class: 'marca', href: 'index.html' }, selo, h('span', { text: site.nome })),
      nav,
      h('div', { class: 'cabecalho-acoes' }, botaoTema(), toggle)
    );
  }

  function linhaEndereco(c) {
    const e = c.endereco || {};
    return [e.linha1, e.linha2, e.cep].filter(Boolean);
  }

  function rodapeSite() {
    const { site, menu } = estado;
    const c = site.contato;
    const redes = (site.redes || []).filter((r) => r.url);

    return h('div', {},
      h('div', { class: 'container rodape-grade' },
        h('div', {},
          h('a', { class: 'marca', href: 'index.html' }, h('span', { text: site.nome })),
          h('p', { text: site.descricao })
        ),
        h('div', {},
          h('h2', { text: site.rodape.navegacao }),
          h('ul', {}, menu.itens.map((i) => h('li', {}, h('a', { href: i.href, text: i.rotulo }))))
        ),
        h('div', {},
          h('h2', { text: site.rodape.contato }),
          c.whatsapp && h('p', {}, h('a', { href: urlWhatsapp(), text: c.whatsapp })),
          c.email && h('p', {}, h('a', { href: `mailto:${c.email}`, text: c.email })),
          linhaEndereco(c).map((l) => h('p', { text: l }))
        ),
        redes.length > 0 && h('div', {},
          h('h2', { text: site.rodape.redes }),
          h('ul', {}, redes.map((r) =>
            h('li', {}, h('a', { href: r.url, target: '_blank', rel: 'noopener', text: r.nome }))
          ))
        )
      ),
      h('div', { class: 'container rodape-fim' },
        h('p', { text: site.rodape.direitos.replace('{ano}', new Date().getFullYear()) })
      )
    );
  }

  const topoPagina = (cab) =>
    h('section', { class: 'secao topo-pagina' },
      h('div', { class: 'container' }, h('h1', { text: cab.titulo }), h('p', { text: cab.texto }))
    );

  const chamada = (cfg) =>
    h('section', { class: 'chamada' },
      h('div', { class: 'container' },
        h('div', { class: 'chamada-caixa' },
          h('h2', { text: cfg.titulo }),
          h('p', { text: cfg.texto }),
          botao(cfg.botao, 'ouro')
        )
      )
    );

  function cartaoProduto(prod, rotuloBotao) {
    return h('article', { class: 'produto' },
      imagem(prod.imagem, prod.nome),
      h('div', { class: 'produto-corpo' },
        h('h3', { text: prod.nome }),
        h('p', { text: prod.descricao }),
        prod.tecnicas && prod.tecnicas.length > 0 &&
          h('ul', { class: 'tecnicas' }, prod.tecnicas.map((t) => h('li', { text: t }))),
        h('a', {
          class: 'botao botao--contorno',
          href: `contato.html?produto=${encodeURIComponent(prod.id)}#orcamento`,
          text: rotuloBotao,
        })
      )
    );
  }

  /* ---------- páginas ---------- */

  function paginaHome(p) {
    const { categorias, produtos } = estado.produtos;
    const destaques = produtos.filter((x) => x.destaque).slice(0, 4);

    return [
      h('section', { class: 'hero' },
        h('div', { class: 'container hero-grade' },
          h('div', {},
            h('h1', { text: p.hero.titulo }),
            h('p', { class: 'hero-sub', text: p.hero.texto }),
            h('div', { class: 'acoes' }, botao(p.hero.botaoPrincipal, 'ouro'), botao(p.hero.botaoSecundario, 'claro'))
          ),
          h('div', { class: 'moldura' }, imagem(p.hero.imagem, p.hero.imagemAlt, null, true))
        )
      ),

      h('section', { class: 'secao' },
        h('div', { class: 'container' },
          h('div', { class: 'secao-cabecalho' }, h('h2', { text: p.categorias.titulo }), h('p', { text: p.categorias.texto })),
          h('div', { class: 'categorias' }, categorias.map((c) =>
            h('a', { class: 'categoria', href: `produtos.html?categoria=${encodeURIComponent(c.id)}` },
              h('h3', { text: c.nome }), h('p', { text: c.descricao }))
          ))
        )
      ),

      destaques.length > 0 && h('section', { class: 'secao secao--branca' },
        h('div', { class: 'container' },
          h('div', { class: 'cabecalho-destaques' },
            h('div', { class: 'secao-cabecalho' }, h('h2', { text: p.destaques.titulo }), h('p', { text: p.destaques.texto })),
            botao(p.destaques.botao, 'contorno')
          ),
          h('div', { class: 'grade-produtos' }, destaques.map((x) => cartaoProduto(x, p.destaques.botaoProduto)))
        )
      ),

      h('section', { class: 'secao' },
        h('div', { class: 'container' },
          h('div', { class: 'secao-cabecalho' }, h('h2', { text: p.passos.titulo })),
          h('ol', { class: 'passos' }, p.passos.itens.map((i) =>
            h('li', {}, h('h3', { text: i.titulo }), h('p', { text: i.texto }))
          ))
        )
      ),

      h('section', { class: 'secao secao--branca' },
        h('div', { class: 'container' },
          h('div', { class: 'secao-cabecalho' }, h('h2', { text: p.diferenciais.titulo })),
          h('div', { class: 'itens' }, p.diferenciais.itens.map((i) =>
            h('div', { class: 'item' }, h('h3', { text: i.titulo }), h('p', { text: i.texto }))
          ))
        )
      ),

      chamada(p.chamada),
    ];
  }

  function paginaProdutos(p) {
    const { categorias, produtos } = estado.produtos;
    let atual = new URLSearchParams(location.search).get('categoria') || 'todos';
    if (atual !== 'todos' && !categorias.some((c) => c.id === atual)) atual = 'todos';

    const grade = h('div', { class: 'grade-produtos' });
    const contagem = h('p', { class: 'contagem', 'aria-live': 'polite' });
    const barra = h('div', { class: 'filtros', role: 'group', 'aria-label': p.filtro.rotulo });

    function desenhar() {
      const lista = atual === 'todos' ? produtos : produtos.filter((x) => x.categoria === atual);
      grade.replaceChildren(...lista.map((x) => cartaoProduto(x, p.botaoProduto)));
      const modelo = lista.length === 1 ? p.filtro.contagemUm : p.filtro.contagemVarios;
      contagem.textContent = lista.length === 0 ? p.filtro.vazio : modelo.replace('{n}', lista.length);
      barra.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.id === atual)));
    }

    [{ id: 'todos', nome: p.filtro.todos }, ...categorias].forEach((c) => {
      barra.append(h('button', {
        class: 'filtro',
        type: 'button',
        'data-id': c.id,
        'aria-pressed': 'false',
        text: c.nome,
        onclick: () => { atual = c.id; desenhar(); },
      }));
    });

    desenhar();

    return [
      topoPagina(p.cabecalho),
      h('section', { class: 'secao' }, h('div', { class: 'container' }, barra, contagem, grade)),
      chamada(p.chamada),
    ];
  }

  function paginaServicos(p) {
    return [
      topoPagina(p.cabecalho),
      h('section', { class: 'secao' },
        h('div', { class: 'container' }, p.itens.map((s) =>
          h('article', { class: 'servico' },
            h('h2', { text: s.titulo }),
            h('div', {}, h('p', { text: s.texto }), h('ul', {}, s.pontos.map((x) => h('li', { text: x }))))
          )
        ))
      ),
      chamada(p.chamada),
    ];
  }

  function paginaSobre(p) {
    return [
      topoPagina(p.cabecalho),
      h('section', { class: 'secao' },
        h('div', { class: 'container sobre-grade' },
          h('div', {}, h('h2', { text: p.historia.titulo }), p.historia.paragrafos.map((t) => h('p', { text: t }))),
          h('div', { class: 'moldura moldura--escura' }, imagem(p.historia.imagem, p.historia.imagemAlt))
        )
      ),
      h('section', { class: 'secao secao--branca' },
        h('div', { class: 'container' },
          h('div', { class: 'secao-cabecalho' }, h('h2', { text: p.valores.titulo })),
          h('div', { class: 'itens' }, p.valores.itens.map((i) =>
            h('div', { class: 'item' }, h('h3', { text: i.titulo }), h('p', { text: i.texto }))
          ))
        )
      ),
      chamada(p.chamada),
    ];
  }

  function blocoInfo(p) {
    const { site } = estado;
    const c = site.contato;
    const r = p.info.rotulos;
    const redes = (site.redes || []).filter((x) => x.url);
    const linhas = [];

    if (c.whatsapp) linhas.push([r.whatsapp, h('a', { href: urlWhatsapp(), target: '_blank', rel: 'noopener', text: c.telefone || c.whatsapp })]);
    if (c.telefone) linhas.push([r.telefone, h('a', { href: urlTelefone(), text: c.telefone })]);
    if (c.email) linhas.push([r.email, h('a', { href: `mailto:${c.email}`, text: c.email })]);
    if (linhaEndereco(c).length) linhas.push([r.endereco, linhaEndereco(c).map((l, i) => [i ? h('br') : null, l])]);
    if (c.horario && c.horario.length) {
      linhas.push([r.horario, h('ul', {}, c.horario.map((x) => h('li', { text: `${x.dias}: ${x.horas}` })))]);
    }
    if (redes.length) {
      linhas.push([r.redes, h('ul', {}, redes.map((x) =>
        h('li', {}, h('a', { href: x.url, target: '_blank', rel: 'noopener', text: x.nome }))))]);
    }

    return h('div', {},
      h('h2', { text: p.info.titulo }),
      h('dl', { class: 'info-lista' }, linhas.map(([t, d]) => h('div', {}, h('dt', { text: t }), h('dd', {}, d)))),
      c.mapaUrl && h('iframe', { class: 'mapa', src: c.mapaUrl, title: p.info.mapaTitulo, loading: 'lazy', referrerpolicy: 'no-referrer-when-downgrade' })
    );
  }

  function blocoFormulario(p) {
    const f = p.formulario;
    const { produtos } = estado.produtos;
    const preSelecionado = new URLSearchParams(location.search).get('produto');

    const campos = f.campos.map((c) => {
      const id = `campo-${c.id}`;
      let controle;
      if (c.tipo === 'textarea') {
        controle = h('textarea', { id, name: c.id, required: c.obrigatorio });
      } else if (c.tipo === 'produto') {
        controle = h('select', { id, name: c.id, required: c.obrigatorio },
          h('option', { value: '', text: f.selecione }),
          produtos.map((x) => h('option', { value: x.nome, text: x.nome, selected: x.id === preSelecionado })),
          h('option', { value: f.outroProduto, text: f.outroProduto })
        );
      } else {
        controle = h('input', {
          id, name: c.id, type: c.tipo, required: c.obrigatorio,
          autocomplete: c.autocomplete, inputmode: c.inputmode,
        });
      }
      return h('div', { class: 'campo' },
        h('label', { for: id, text: c.rotulo }),
        controle,
        c.ajuda && h('small', { text: c.ajuda })
      );
    });

    const form = h('form', { class: 'formulario', id: 'orcamento', novalidate: false });

    const montarMensagem = () => {
      const dados = new FormData(form);
      const linhas = [estado.site.whatsappMensagemPadrao, ''];
      f.campos.forEach((c) => {
        const v = String(dados.get(c.id) || '').trim();
        if (v) linhas.push(`${c.rotulo}: ${v}`);
      });
      return linhas.join('\n');
    };

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      window.open(urlWhatsapp(montarMensagem()), '_blank', 'noopener');
    });

    const botaoEmail = h('button', {
      class: 'botao botao--contorno',
      type: 'button',
      text: f.botaoEmail,
      onclick: () => {
        if (!form.reportValidity()) return;
        const email = estado.site.contato.email;
        location.href = `mailto:${email}?subject=${encodeURIComponent(f.assuntoEmail)}&body=${encodeURIComponent(montarMensagem())}`;
      },
    });

    [
      h('h2', { text: f.titulo }),
      ...campos,
      h('div', { class: 'acoes' },
        h('button', { class: 'botao botao--denim', type: 'submit', text: f.botaoWhatsapp }),
        estado.site.contato.email ? botaoEmail : null
      ),
      h('p', { class: 'aviso', text: f.aviso }),
    ].forEach((no) => form.append(no));
    return form;
  }

  function paginaContato(p) {
    return [
      topoPagina(p.cabecalho),
      h('section', { class: 'secao' },
        h('div', { class: 'container contato-grade' }, blocoInfo(p), blocoFormulario(p))
      ),
      h('section', { class: 'secao secao--branca' },
        h('div', { class: 'container faq' },
          h('div', { class: 'secao-cabecalho' }, h('h2', { text: p.faq.titulo })),
          p.faq.itens.map((i) =>
            h('details', {}, h('summary', { text: i.pergunta }), h('p', { text: i.resposta }))
          )
        )
      ),
    ];
  }

  const PAGINAS = {
    home: paginaHome,
    produtos: paginaProdutos,
    servicos: paginaServicos,
    sobre: paginaSobre,
    contato: paginaContato,
  };

  /* ---------- início ---------- */

  function definirMeta(pagina, site) {
    document.title = pagina.titulo ? `${pagina.titulo} | ${site.nome}` : `${site.nome} | ${site.slogan}`;
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = h('meta', { name: 'description' });
      document.head.append(meta);
    }
    meta.setAttribute('content', pagina.descricao || site.descricao);
  }

  async function iniciar() {
    const chave = document.body.dataset.pagina;
    const cabecalho = document.getElementById('cabecalho');
    const principal = document.getElementById('conteudo');
    const rodape = document.getElementById('rodape');

    try {
      [estado.site, estado.menu, estado.produtos, estado.paginas] = await Promise.all([
        carregar('config/site.json'),
        carregar('config/menu.json'),
        carregar('config/produtos.json'),
        carregar('config/paginas.json'),
      ]);
    } catch (erro) {
      console.error(erro);
      principal.replaceChildren(h('p', {
        class: 'erro-carregar',
        role: 'alert',
        text: 'Não foi possível carregar o conteúdo do site. Se você abriu o arquivo direto do computador, rode um servidor local (veja o README.md).',
      }));
      return;
    }

    const { site, paginas } = estado;
    definirTema(temaInicial(), false);
    sistemaEscuro.addEventListener('change', (e) => {
      if (!temaGuardado() && temaPadrao() === 'auto') definirTema(e.matches ? 'escuro' : 'claro', false);
    });
    document.getElementById('pular').textContent = site.textos.pularConteudo;

    const pagina = paginas[chave];
    definirMeta(pagina, site);

    cabecalho.replaceChildren(cabecalhoSite(chave));
    principal.replaceChildren(...PAGINAS[chave](pagina).filter(Boolean));
    rodape.replaceChildren(rodapeSite());
  }

  iniciar();
})();
