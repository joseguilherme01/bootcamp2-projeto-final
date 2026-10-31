# Consulta de CEP com Mapa — Projeto Final (Bootcamp II · Etapa 03)

Aplicação web que consulta CEPs brasileiros, mostra o endereço e a localização em um mapa interativo e permite **salvar endereços favoritos em um banco de dados real**, com testes automatizados rodando no GitHub Actions a cada Pull Request.

## Links

- **Repositório GitHub:** https://github.com/joseguilherme01/bootcamp2-projeto-final
- **Imagem no Docker Hub:** https://hub.docker.com/r/joseguilherme01/bootcamp2-projeto-final
- **Pull Requests do projeto:** https://github.com/joseguilherme01/bootcamp2-projeto-final/pulls?q=is%3Apr

---

## Integrantes

| Nome                               | Matrícula | GitHub                                                | Funcionalidades de que foi responsável                                                                                              | Principal PR                                                                                                           |
| ---------------------------------- | --------- | ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| José Guilherme Ferreira dos Santos | 22408953  | [joseguilherme01](https://github.com/joseguilherme01) | Frontend, integração com as APIs (ViaCEP e Nominatim), persistência no Supabase, testes automatizados, GitHub Actions (CI) e Docker | [#1 · Testes automatizados e CI com GitHub Actions](https://github.com/joseguilherme01/bootcamp2-projeto-final/pull/1) |

### Observação: entrega individual

Este projeto foi feito **individualmente, com autorização do professor** (mensagem no Moodle em 31/10/2026). Por isso, o fluxo do enunciado foi mantido com as seguintes adaptações:

- A `main` está protegida por um _ruleset_ que **exige Pull Request** e o **check de testes (`testes`) aprovado** antes do merge. A exigência de aprovação de outro membro foi configurada como 0, porque o GitHub não permite que o autor aprove a própria PR.
- Cada funcionalidade foi desenvolvida em uma **branch própria**, seguindo o padrão `tipo/descricao` (`feature/...`, `teste/...`, `docs/...`), e entrou na `main` por Pull Request, com **autorrevisão comentada** antes do merge.
- Não houve conflito de merge, por não haver trabalho em paralelo de outros membros.

### Histórico de Pull Requests

| PR                                                                      | Branch              | O que entrou                                                                                       |
| ----------------------------------------------------------------------- | ------------------- | -------------------------------------------------------------------------------------------------- |
| [#1](https://github.com/joseguilherme01/bootcamp2-projeto-final/pull/1) | `feature/testes-ci` | Funções puras separadas em `utils.js`, 13 testes com Vitest e workflow do GitHub Actions           |
| [#2](https://github.com/joseguilherme01/bootcamp2-projeto-final/pull/2) | `teste/ci-quebrado` | Teste de fogo: teste quebrado de propósito, merge bloqueado pelo CI, correção e print de evidência |
| [#3](https://github.com/joseguilherme01/bootcamp2-projeto-final/pull/3) | `docs/readme-final` | README final da entrega                                                                            |

---

## Descrição da aplicação

O usuário digita um CEP e a aplicação mostra logradouro, bairro, cidade, estado, latitude, longitude e um mapa com marcador, além de um indicador de precisão da localização. O endereço encontrado pode ser **salvo nos favoritos**, que ficam guardados no banco e aparecem sempre que a página é aberta.

### Funcionalidades

- Validação do CEP (8 dígitos, com ou sem hífen)
- Consulta do endereço e exibição no mapa (Leaflet + OpenStreetMap)
- Indicador de precisão da localização (alta, média ou baixa)
- **Criar:** botão "⭐ Favoritar este CEP"
- **Listar:** seção "Meus favoritos", carregada ao abrir a página
- **Atualizar:** botão "Apelido" em cada favorito (ex.: "Casa", "Trabalho")
- **Excluir:** botão "Excluir" em cada favorito
- **Ver no mapa:** busca o favorito de novo com um clique
- Mensagens amigáveis para CEP inválido, CEP não encontrado, falha de conexão, CEP repetido e falhas no banco

### APIs externas consumidas

- **ViaCEP** — dados oficiais do endereço — [documentação](https://viacep.com.br/)
  - Endpoint: `https://viacep.com.br/ws/{cep}/json/`
- **Nominatim (OpenStreetMap)** — converte o endereço em coordenadas — [documentação](https://nominatim.org/release-docs/latest/api/Search/)
  - Endpoint: `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&countrycodes=br&q={endereco}`

### Banco de dados

**Supabase** (PostgreSQL gerenciado, plano gratuito), acessado direto do frontend pela biblioteca `@supabase/supabase-js`. Tabela `favoritos_cep`:

| Coluna       | Tipo                          | Descrição                            |
| ------------ | ----------------------------- | ------------------------------------ |
| `id`         | bigint (identity, PK)         | Identificador gerado automaticamente |
| `criado_em`  | timestamptz (default `now()`) | Data em que o favorito foi salvo     |
| `cep`        | text (unique)                 | CEP salvo, sem repetição             |
| `logradouro` | text                          | Rua/avenida                          |
| `bairro`     | text                          | Bairro                               |
| `cidade`     | text                          | Cidade                               |
| `uf`         | text                          | Estado                               |
| `latitude`   | double precision              | Latitude encontrada                  |
| `longitude`  | double precision              | Longitude encontrada                 |
| `apelido`    | text                          | Nome dado pelo usuário (opcional)    |

**Limitações conhecidas:**

- As políticas de acesso (RLS) estão abertas para o papel `anon`, então qualquer visitante vê, altera e exclui os mesmos favoritos. A chave usada no código é a pública (_publishable/anon_), feita para uso no frontend.
- No plano gratuito, o Supabase **pausa o projeto após 7 dias sem uso**. Se a lista de favoritos mostrar "Não foi possível carregar os favoritos", o banco pode estar pausado; basta reativá-lo no painel do Supabase.

---

## Como executar

### Com Docker (comando para o avaliador)

```bash
docker run -d -p 8080:80 joseguilherme01/bootcamp2-projeto-final:latest
```

Depois abra no navegador: **http://localhost:8080**

Não é preciso configurar variáveis de ambiente: a aplicação é estática (servida por Nginx) e a URL e a chave pública do Supabase já estão no `script.js`.

### Localmente (sem Docker)

1. Clone o repositório:

   ```bash
   git clone https://github.com/joseguilherme01/bootcamp2-projeto-final.git
   cd bootcamp2-projeto-final
   ```

2. Abra o `index.html` com a extensão **Live Server** do VS Code (botão direito → _Open with Live Server_).

   > O `script.js` é carregado como módulo (`type="module"`), por isso abrir o arquivo com dois cliques (`file://`) não funciona. É preciso um servidor local, como o Live Server ou o Docker.

### Construir a imagem a partir do código

```bash
docker build -t bootcamp2-projeto-final .
docker run -d -p 8080:80 --name projeto-final bootcamp2-projeto-final
```

---

## Testes automatizados

As funções centrais da aplicação (validação, formatação, cálculo de distância, proteção contra HTML e montagem do registro salvo no banco) ficam em `utils.js` e são testadas em `utils.test.js` com **Vitest** — **13 testes** no total.

### Como rodar os testes

Requer Node.js 20 ou superior.

```bash
npm install
npm test
```

### Integração Contínua (GitHub Actions)

O workflow `.github/workflows/ci.yml` roda `npm install` e `npm test` a cada **Pull Request** e a cada **push na `main`**. O check `testes` está marcado como **obrigatório** na proteção da `main`, então nenhum código com teste quebrado consegue ser mesclado.

---

## Evidências

### PR bloqueada pelo CI (teste de fogo)

Na [PR #2](https://github.com/joseguilherme01/bootcamp2-projeto-final/pull/2), o teste do `formatarCep` foi quebrado de propósito. O check obrigatório `testes` falhou e o GitHub **bloqueou o botão de merge**. Em seguida, o teste foi corrigido na mesma PR, o CI voltou a passar e a PR foi mesclada.

![PR bloqueada pelo CI](https://raw.githubusercontent.com/joseguilherme01/bootcamp2-projeto-final/main/prints/pr-bloqueada-ci.png)

Print no repositório: https://github.com/joseguilherme01/bootcamp2-projeto-final/blob/main/prints/pr-bloqueada-ci.png

### Conflito de merge

Não houve conflito de merge, por se tratar de entrega individual (sem branches de outros membros sendo desenvolvidas em paralelo).

---

## Estrutura do projeto

```
bootcamp2-projeto-final/
├── .github/
│   └── workflows/
│       └── ci.yml          # GitHub Actions: roda os testes a cada PR
├── prints/
│   └── pr-bloqueada-ci.png # evidência do teste de fogo
├── .dockerignore
├── .gitignore
├── Dockerfile              # Nginx servindo a aplicação
├── index.html
├── package.json            # script "npm test" (Vitest)
├── README.md
├── script.js               # interface, APIs e Supabase
├── style.css
├── utils.js                # funções puras testáveis
└── utils.test.js           # 13 testes automatizados
```

## Tecnologias

HTML5, CSS3, JavaScript (ES Modules), Leaflet, OpenStreetMap/Nominatim, ViaCEP, Supabase (PostgreSQL), Vitest, GitHub Actions, Docker e Nginx.
