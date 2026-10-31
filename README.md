# Consulta de CEP com Mapa (OpenStreetMap)

## Autor

José Guilherme Ferreira dos Santos — Matrícula 22408953

## Descrição

Aplicação web que consulta CEPs brasileiros, mostra o endereço completo e a localização em um mapa interativo, e permite **salvar endereços favoritos em um banco de dados real**. É útil para quem precisa conferir e guardar endereços com frequência (casa, trabalho, clientes, entregas).

A aplicação exibe:

- CEP
- Logradouro
- Bairro
- Cidade
- Estado (UF)
- Latitude e Longitude
- Mapa interativo com marcador (OpenStreetMap)
- Lista de CEPs favoritos salvos no banco (Supabase)

---

## Links

- **Aplicação no ar (GitHub Pages):** https://joseguilherme01.github.io/bootcamp2-app/
- **Repositório GitHub:** https://github.com/joseguilherme01/bootcamp2-app
- **Imagem no Docker Hub:** https://hub.docker.com/r/joseguilherme01/bootcamp2-app

---

## Como rodar com Docker (comando para o avaliador)

```bash
docker run -d -p 8080:80 joseguilherme01/bootcamp2-app:latest
```

Depois abra no navegador: **http://localhost:8080**

---

## APIs utilizadas

- **ViaCEP** — dados postais oficiais — [documentação](https://viacep.com.br/)
  - Endpoint: `https://viacep.com.br/ws/{cep}/json/`
- **Nominatim (OpenStreetMap)** — converte endereço em coordenadas — [documentação](https://nominatim.org/release-docs/latest/api/Search/)
  - Endpoint: `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&countrycodes=br&q={endereco}`
- **Supabase** — banco de dados PostgreSQL acessado pela biblioteca `@supabase/supabase-js`

---

## Funcionalidades

- Validação de CEP (8 dígitos, com ou sem hífen)
- Consulta assíncrona com `fetch`
- Exibição de dados completos do endereço
- Mapa interativo com Leaflet e marcador de localização
- Indicador de precisão da localização (alta, média ou baixa)
- **Favoritar** um CEP (salva no banco)
- **Lista "Meus favoritos"**, carregada automaticamente ao abrir a página
- **Dar apelido** a um favorito (ex.: "Casa", "Trabalho") — versão 1.1
- **Ver no mapa** um favorito com um clique
- **Excluir** um favorito
- Tratamento de erros:
  - CEP inválido
  - CEP não encontrado
  - Falha de conexão/API
  - CEP já salvo nos favoritos
  - Falha ao salvar, listar ou excluir no banco

---

## Persistência de dados

### Banco escolhido

**Supabase** (PostgreSQL gerenciado, plano gratuito, região São Paulo). O frontend conversa direto com o banco pela biblioteca JavaScript oficial, sem precisar de um servidor próprio. Os dados ficam no banco, então **sobrevivem ao fechamento do navegador** e aparecem em qualquer dispositivo que abrir a aplicação.

### Estrutura da tabela

Tabela `favoritos_cep`:

| Coluna       | Tipo                          | Descrição                            |
| ------------ | ----------------------------- | ------------------------------------ |
| `id`         | bigint (identity, PK)         | Identificador gerado automaticamente |
| `criado_em`  | timestamptz (default `now()`) | Data em que o favorito foi salvo     |
| `cep`        | text (unique)                 | CEP salvo — não permite repetidos    |
| `logradouro` | text                          | Rua/avenida                          |
| `bairro`     | text                          | Bairro                               |
| `cidade`     | text                          | Cidade                               |
| `uf`         | text                          | Estado                               |
| `latitude`   | double precision              | Latitude encontrada no mapa          |
| `longitude`  | double precision              | Longitude encontrada no mapa         |
| `apelido`    | text                          | Nome dado pelo usuário (opcional)    |

SQL usado para criar a tabela:

```sql
create table favoritos_cep (
  id          bigint generated always as identity primary key,
  criado_em   timestamptz not null default now(),
  cep         text not null unique,
  logradouro  text,
  bairro      text,
  cidade      text,
  uf          text,
  latitude    double precision,
  longitude   double precision,
  apelido     text
);
```

### Operações (CRUD)

| Operação   | Onde acontece na interface                          |
| ---------- | --------------------------------------------------- |
| **Create** | Botão "⭐ Favoritar este CEP" no resultado da busca |
| **Read**   | Seção "Meus favoritos", carregada ao abrir a página |
| **Update** | Botão "Apelido" em cada favorito (versão 1.1)       |
| **Delete** | Botão "Excluir" em cada favorito                    |

### Limitação conhecida

As políticas de acesso (RLS) da tabela estão **abertas para o papel `anon`** (leitura, inserção, atualização e exclusão liberadas):

```sql
alter table favoritos_cep enable row level security;

create policy "anon pode ler"       on favoritos_cep for select to anon using (true);
create policy "anon pode inserir"   on favoritos_cep for insert to anon with check (true);
create policy "anon pode excluir"   on favoritos_cep for delete to anon using (true);
create policy "anon pode atualizar" on favoritos_cep for update to anon using (true) with check (true);
```

Como a aplicação ainda não tem login, **qualquer visitante vê, altera e apaga os mesmos favoritos**. A chave usada no código é a chave pública (publishable/anon), feita para uso no frontend. Em uma versão futura, o ideal é adicionar autenticação e restringir cada usuário aos próprios registros.

---

## Docker

A aplicação é servida por um **Nginx** dentro de um container.

### Dockerfile

```dockerfile
FROM nginx:alpine
COPY index.html style.css script.js /usr/share/nginx/html/
EXPOSE 80
```

### Construir e rodar localmente

```bash
docker build -t bootcamp2-app .
docker run -d -p 8080:80 --name meu-app bootcamp2-app
```

---

## Sidequests

### SQ1 · .dockerignore

Conteúdo do arquivo `.dockerignore`:

```
.git
.gitignore
README.md
prints/
Dockerfile
.dockerignore
.vscode/
```

**Por que isso deixa a imagem menor e o build mais rápido:** quando rodamos `docker build .`, o Docker primeiro envia a pasta do projeto inteira (o chamado _contexto de build_) para o motor do Docker. Sem o `.dockerignore`, isso incluiria a pasta `.git` (todo o histórico do projeto, que pode ser maior que a própria aplicação), o README e os prints. Excluindo esses arquivos, menos dados são enviados, então o build começa mais rápido. Além disso, evita que arquivos sem utilidade para a aplicação (ou sensíveis, como o histórico do Git) acabem dentro da imagem por engano, caso o Dockerfile use algo como `COPY . .`. A imagem final fica só com o necessário para rodar o site.

### SQ2 · Versionamento de imagem

Três tags publicadas no Docker Hub:

| Tag      | Conteúdo                                                                               |
| -------- | -------------------------------------------------------------------------------------- |
| `1.0`    | Primeira versão funcional: consulta de CEP, mapa e favoritos (salvar, listar, excluir) |
| `1.1`    | Melhoria: apelido nos favoritos (operação de _update_)                                 |
| `latest` | Aponta para a versão mais recente (mesma imagem da `1.1`)                              |

Evidência: https://hub.docker.com/r/joseguilherme01/bootcamp2-app/tags

### SQ3 · Descrição no Docker Hub

O overview do repositório no Docker Hub contém o que é a aplicação, o comando `docker run` pronto para copiar e o link deste repositório: https://hub.docker.com/r/joseguilherme01/bootcamp2-app

### SQ4 · Explorando a orquestração

Dois containers da mesma imagem rodando ao mesmo tempo, nas portas 8080 e 8081:

```bash
docker run -d -p 8080:80 --name bootcamp-1 joseguilherme01/bootcamp2-app:1.1
docker run -d -p 8081:80 --name bootcamp-2 joseguilherme01/bootcamp2-app:1.1
docker ps --filter "name=bootcamp"
```

![docker ps com dois containers](https://raw.githubusercontent.com/joseguilherme01/bootcamp2-app/main/prints/sq4-docker-ps.png)

Print commitado no repositório: https://github.com/joseguilherme01/bootcamp2-app/blob/main/prints/sq4-docker-ps.png

**Se eu tivesse 100 containers, como gerenciaria?**

Com dois containers, dá para controlar tudo na mão com `docker run`, `docker ps` e `docker stop`. Com 100, isso se torna inviável: seria preciso escolher uma porta para cada um, distribuí-los entre vários servidores, perceber quando algum cai e subir outro no lugar. Para isso existe o **Kubernetes**, uma ferramenta de orquestração de containers. Ele trabalha com um **cluster**, que é um conjunto de máquinas (chamadas de nós) administradas como se fossem uma só. A menor unidade que o Kubernetes executa é o **pod**, que normalmente contém um container (ou alguns muito ligados entre si). Em vez de dar 100 comandos, eu descreveria em um arquivo de configuração o estado que desejo, por exemplo "quero 100 **réplicas** da imagem `joseguilherme01/bootcamp2-app:1.1`", e o Kubernetes se encarrega de criar os pods, distribuí-los entre as máquinas do cluster e recriar automaticamente qualquer um que falhar. Um **Service** ficaria na frente das réplicas, recebendo os acessos dos usuários e dividindo entre elas (balanceamento de carga). Para lançar uma versão nova, bastaria trocar a tag da imagem e o Kubernetes substituiria os pods aos poucos, sem deixar a aplicação fora do ar.

---

## Tecnologias utilizadas

- HTML5, CSS3 e JavaScript (ES6+, módulos)
- [ViaCEP](https://viacep.com.br/)
- [Leaflet](https://leafletjs.com/)
- [OpenStreetMap](https://www.openstreetmap.org/) / [Nominatim](https://nominatim.org/)
- [Supabase](https://supabase.com/) (PostgreSQL)
- [Docker](https://www.docker.com/) + Nginx
- [GitHub Pages](https://pages.github.com/)

---

## Estrutura do projeto

```
bootcamp2-app/
├── index.html
├── style.css
├── script.js
├── Dockerfile
├── .dockerignore
├── README.md
└── prints/
    └── sq4-docker-ps.png
```

---

## Como executar localmente (sem Docker)

1. Clone o repositório:

   ```bash
   git clone https://github.com/joseguilherme01/bootcamp2-app.git
   ```

2. Acesse a pasta do projeto:

   ```bash
   cd bootcamp2-app
   ```

3. Abra com a extensão **Live Server** do VS Code (botão direito no `index.html` → _Open with Live Server_).

   > Como o `script.js` é carregado como módulo (`type="module"`), abrir o arquivo com dois cliques (`file://`) não funciona. É preciso um servidor local, como o Live Server ou o Docker.

---

## Observação sobre geolocalização

A API ViaCEP fornece dados postais oficiais. Já a posição no mapa depende da base cartográfica do OpenStreetMap/Nominatim e pode variar entre:

- ponto exato da via/região,
- centro aproximado do CEP,
- ou aproximação por bairro/cidade em alguns casos.

Por isso, o projeto exibe um indicador de precisão para deixar claro o nível da localização encontrada.
