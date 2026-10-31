// ======================================================
// SUPABASE (Etapa 02) - conexão com o banco de dados
// ======================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// 👇 COLE AQUI a sua URL e a sua chave publishable (anon) do Supabase
const SUPABASE_URL = "https://uuljzvgfivabvoedrcgx.supabase.co";
const SUPABASE_KEY = "sb_publishable_WUJgw_4GbXq0UHDxMeo5dg_7pyFs61Q";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ======================================================
// ELEMENTOS DA PÁGINA
// ======================================================
const inputCep = document.getElementById("cep-input");
const botaoBuscar = document.getElementById("buscar-btn");
const areaResultado = document.getElementById("resultado");
const mapaWrapper = document.getElementById("mapa-wrapper");
const listaFavoritos = document.getElementById("lista-favoritos");
const avisoFavoritos = document.getElementById("aviso-favoritos");

let mapa = null;
let marcador = null;

// Guarda o último endereço encontrado, para o botão "Favoritar" saber o que salvar
let enderecoAtual = null;

function limparCep(valor) {
  return valor.replace(/\D/g, "");
}

function formatarCep(cepLimpo) {
  return cepLimpo.replace(/^(\d{5})(\d{3})$/, "$1-$2");
}

function validarCep(cep) {
  return /^[0-9]{8}$/.test(cep);
}

function normalizar(txt) {
  return (txt || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function renderizarErro(msg) {
  enderecoAtual = null;
  areaResultado.innerHTML = `<p class="erro">${msg}</p>`;
  mapaWrapper.classList.add("oculto");
}

function renderizarResultado(endereco, coords) {
  areaResultado.innerHTML = `
    <p><strong>CEP:</strong> ${endereco.cep}</p>
    <p><strong>Logradouro:</strong> ${endereco.logradouro || "Não informado"}</p>
    <p><strong>Bairro:</strong> ${endereco.bairro || "Não informado"}</p>
    <p><strong>Cidade:</strong> ${endereco.localidade}</p>
    <p><strong>Estado:</strong> ${endereco.uf}</p>
    <p><strong>Latitude:</strong> ${coords.lat.toFixed(6)} | <strong>Longitude:</strong> ${coords.lon.toFixed(6)}</p>
    <p class="aviso"><strong>Precisão:</strong> ${coords.precisaoTexto}</p>
    <button id="btn-favoritar" class="btn-favoritar">⭐ Favoritar este CEP</button>
  `;
}

function atualizarMapa(coords, endereco) {
  mapaWrapper.classList.remove("oculto");

  if (!mapa) {
    mapa = L.map("mapa");
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(mapa);
  }

  const latLng = [coords.lat, coords.lon];
  mapa.setView(latLng, coords.zoom);

  if (marcador) mapa.removeLayer(marcador);
  marcador = L.marker(latLng).addTo(mapa);

  marcador
    .bindPopup(
      `
    <strong>${endereco.localidade} - ${endereco.uf}</strong><br>
    ${endereco.logradouro || "Logradouro não informado"}<br>
    ${endereco.bairro || "Bairro não informado"}<br>
    CEP: ${endereco.cep}
  `,
    )
    .openPopup();

  setTimeout(() => mapa.invalidateSize(), 100);
}

async function nominatimSearch(query, limit = 10) {
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&countrycodes=br&limit=${limit}&q=${encodeURIComponent(query)}`;
  const resp = await fetch(url, { headers: { Accept: "application/json" } });
  if (!resp.ok) throw new Error("Erro ao consultar Nominatim");
  return resp.json();
}

function distanciaKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function pontuar(item, alvo) {
  const addr = item.address || {};
  const display = normalizar(item.display_name);

  const road = normalizar(addr.road || addr.pedestrian || "");
  const suburb = normalizar(
    addr.suburb || addr.neighbourhood || addr.quarter || "",
  );
  const city = normalizar(
    addr.city || addr.town || addr.village || addr.municipality || "",
  );
  const state = normalizar(addr.state || "");
  const postcode = (addr.postcode || "").replace(/\D/g, "");

  let score = 0;
  if (postcode && alvo.cep && postcode === alvo.cep) score += 50;
  if (
    alvo.logradouro &&
    (road.includes(alvo.logradouro) || display.includes(alvo.logradouro))
  )
    score += 25;
  if (
    alvo.bairro &&
    (suburb.includes(alvo.bairro) || display.includes(alvo.bairro))
  )
    score += 30;
  if (
    alvo.cidade &&
    (city.includes(alvo.cidade) || display.includes(alvo.cidade))
  )
    score += 10;
  if (alvo.uf && (state.includes(alvo.uf) || display.includes(alvo.uf)))
    score += 10;

  // Regra extra para Águas Claras (DF)
  if (alvo.bairro.includes("aguas claras")) {
    if (display.includes("aguas claras") || suburb.includes("aguas claras"))
      score += 35;
  }

  return score;
}

async function geocodificarPrecisao(endereco) {
  const cepNumeros = endereco.cep.replace(/\D/g, "");
  const cepFmt = formatarCep(cepNumeros);

  const bairroNorm = normalizar(endereco.bairro);
  const cidadeNorm = normalizar(endereco.localidade);
  const ufNorm = normalizar(endereco.uf);
  const logradouroNorm = normalizar(endereco.logradouro);

  // Se bairro indicar Águas Claras, força contexto local correto
  const cidadePreferida = bairroNorm.includes("aguas claras")
    ? "Águas Claras"
    : endereco.localidade;

  const queries = [
    `${endereco.logradouro || ""}, ${endereco.bairro || ""}, ${cidadePreferida}, ${endereco.uf}, Brasil, ${cepFmt}`,
    `${endereco.bairro || ""}, ${cidadePreferida}, ${endereco.uf}, Brasil, ${cepFmt}`,
    `${endereco.logradouro || ""}, ${cidadePreferida}, ${endereco.uf}, Brasil`,
    `${cidadePreferida}, ${endereco.uf}, Brasil, ${cepFmt}`,
  ];

  let candidatos = [];
  for (const q of queries) {
    const r = await nominatimSearch(q, 10);
    candidatos.push(...r);
  }

  // remove duplicados
  const unicos = [];
  const seen = new Set();
  for (const c of candidatos) {
    const key = `${c.lat},${c.lon}`;
    if (!seen.has(key)) {
      seen.add(key);
      unicos.push(c);
    }
  }

  if (!unicos.length) return null;

  const alvo = {
    cep: cepNumeros,
    logradouro: logradouroNorm,
    bairro: bairroNorm,
    cidade: cidadeNorm,
    uf: ufNorm,
  };

  // escolhe melhor por score
  let melhor = null;
  let melhorScore = -1;
  for (const c of unicos) {
    const s = pontuar(c, alvo);
    if (s > melhorScore) {
      melhorScore = s;
      melhor = c;
    }
  }

  if (!melhor) return null;

  let lat = Number(melhor.lat);
  let lon = Number(melhor.lon);

  // trava geográfica para Águas Claras (evita cair no Plano Piloto)
  if (bairroNorm.includes("aguas claras")) {
    const centroAguasClaras = { lat: -15.843, lon: -48.02 };
    const dist = distanciaKm(
      lat,
      lon,
      centroAguasClaras.lat,
      centroAguasClaras.lon,
    );

    // se cair muito longe, tenta escolher outro candidato mais próximo de Águas Claras
    if (dist > 8) {
      let melhorLocal = null;
      let menorDist = Infinity;

      for (const c of unicos) {
        const cLat = Number(c.lat);
        const cLon = Number(c.lon);
        const d = distanciaKm(
          cLat,
          cLon,
          centroAguasClaras.lat,
          centroAguasClaras.lon,
        );
        if (d < menorDist) {
          menorDist = d;
          melhorLocal = c;
        }
      }

      if (melhorLocal) {
        lat = Number(melhorLocal.lat);
        lon = Number(melhorLocal.lon);
        melhorScore = Math.max(melhorScore - 10, 0);
      }
    }
  }

  let precisaoTexto = "Baixa (aproximada por cidade/região)";
  let zoom = 12;
  if (melhorScore >= 90) {
    precisaoTexto = "Alta (logradouro + bairro + CEP)";
    zoom = 17;
  } else if (melhorScore >= 60) {
    precisaoTexto = "Média (boa aproximação por endereço/CEP)";
    zoom = 15;
  }

  return { lat, lon, precisaoTexto, zoom };
}

async function buscarCep() {
  const cepLimpo = limparCep(inputCep.value);

  if (!validarCep(cepLimpo)) {
    renderizarErro("Digite um CEP válido no formato 00000-000.");
    return;
  }

  areaResultado.innerHTML = "<p>Carregando endereço e mapa...</p>";
  mapaWrapper.classList.add("oculto");
  enderecoAtual = null;

  try {
    const resp = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
    if (!resp.ok) throw new Error("Falha ao consultar o ViaCEP.");

    const endereco = await resp.json();
    if (endereco.erro) {
      renderizarErro("CEP não encontrado. Tente outro.");
      return;
    }

    const coords = await geocodificarPrecisao(endereco);
    if (!coords) {
      renderizarErro(
        "Não foi possível obter coordenadas confiáveis para este CEP.",
      );
      return;
    }

    // Guarda os dados no formato das colunas da tabela "favoritos_cep"
    enderecoAtual = {
      cep: endereco.cep,
      logradouro: endereco.logradouro || null,
      bairro: endereco.bairro || null,
      cidade: endereco.localidade,
      uf: endereco.uf,
      latitude: coords.lat,
      longitude: coords.lon,
    };

    renderizarResultado(endereco, coords);
    atualizarMapa(coords, endereco);
  } catch (erro) {
    renderizarErro(
      "Não foi possível consultar agora. Verifique sua conexão e tente novamente.",
    );
  }
}

// ======================================================
// FAVORITOS (Etapa 02) - CRUD no Supabase
// ======================================================

function mostrarAvisoFavoritos(texto, tipo = "ok") {
  avisoFavoritos.textContent = texto;
  avisoFavoritos.className = `aviso-favoritos ${tipo}`;
  // some sozinho depois de 4 segundos
  clearTimeout(mostrarAvisoFavoritos.timer);
  mostrarAvisoFavoritos.timer = setTimeout(() => {
    avisoFavoritos.textContent = "";
  }, 4000);
}

// CREATE - salva o endereço atual no banco
async function salvarFavorito() {
  if (!enderecoAtual) return;

  const { error } = await supabase.from("favoritos_cep").insert(enderecoAtual);

  if (error) {
    // 23505 = código do PostgreSQL para "valor duplicado" (o CEP é unique)
    if (error.code === "23505") {
      mostrarAvisoFavoritos("Esse CEP já está nos seus favoritos.", "info");
    } else {
      console.error("Erro ao salvar favorito:", error);
      mostrarAvisoFavoritos(
        "Não foi possível salvar agora. Tente novamente.",
        "falha",
      );
    }
    return;
  }

  mostrarAvisoFavoritos("CEP salvo nos favoritos! ⭐");
  listarFavoritos();
}

// READ - busca todos os favoritos e desenha a lista
async function listarFavoritos() {
  listaFavoritos.innerHTML = "<li class='vazio'>Carregando favoritos...</li>";

  const { data, error } = await supabase
    .from("favoritos_cep")
    .select("*")
    .order("criado_em", { ascending: false });

  if (error) {
    console.error("Erro ao listar favoritos:", error);
    listaFavoritos.innerHTML =
      "<li class='vazio erro'>Não foi possível carregar os favoritos.</li>";
    return;
  }

  if (data.length === 0) {
    listaFavoritos.innerHTML =
      "<li class='vazio'>Nenhum favorito ainda. Busque um CEP e clique em ⭐ Favoritar.</li>";
    return;
  }

  listaFavoritos.innerHTML = data
    .map(
      (f) => `
      <li class="item-favorito">
        <div class="info-favorito">
          <strong>${f.apelido ? `🏷️ ${escaparHtml(f.apelido)}` : f.cep}</strong>
          ${f.apelido ? `<small>CEP ${f.cep}</small>` : ""}
          <span>${f.logradouro || "Logradouro não informado"}, ${f.bairro || "-"} — ${f.cidade}/${f.uf}</span>
        </div>
        <div class="acoes-favorito">
          <button class="btn-ver" data-cep="${f.cep}">Ver no mapa</button>
          <button class="btn-editar" data-id="${f.id}" data-apelido="${escaparHtml(f.apelido || "")}">Apelido</button>
          <button class="btn-excluir" data-id="${f.id}">Excluir</button>
        </div>
      </li>
    `,
    )
    .join("");
}

// Evita que um apelido com caracteres como < ou > quebre a página
// (o apelido é digitado pelo usuário, então precisa ser tratado)
function escaparHtml(texto) {
  return String(texto)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// UPDATE (versão 1.1) - dá ou altera o apelido de um favorito
async function editarApelido(id, apelidoAtual) {
  const novo = prompt(
    "Digite um apelido para este endereço (ex.: Casa, Trabalho).\nDeixe em branco para remover o apelido:",
    apelidoAtual,
  );
  if (novo === null) return; // usuário clicou em Cancelar

  const apelido = novo.trim().slice(0, 40) || null;

  const { error } = await supabase
    .from("favoritos_cep")
    .update({ apelido })
    .eq("id", id);

  if (error) {
    console.error("Erro ao atualizar apelido:", error);
    mostrarAvisoFavoritos("Não foi possível salvar o apelido.", "falha");
    return;
  }

  mostrarAvisoFavoritos(apelido ? "Apelido salvo! 🏷️" : "Apelido removido.");
  listarFavoritos();
}

// DELETE - remove um favorito pelo id
async function removerFavorito(id) {
  if (!confirm("Remover este CEP dos favoritos?")) return;

  const { error } = await supabase.from("favoritos_cep").delete().eq("id", id);

  if (error) {
    console.error("Erro ao excluir favorito:", error);
    mostrarAvisoFavoritos("Não foi possível excluir agora.", "falha");
    return;
  }

  mostrarAvisoFavoritos("Favorito removido.");
  listarFavoritos();
}

// ======================================================
// EVENTOS
// ======================================================
botaoBuscar.addEventListener("click", buscarCep);
inputCep.addEventListener("keydown", (e) => {
  if (e.key === "Enter") buscarCep();
});

// O botão "Favoritar" é criado a cada busca, então escutamos o clique
// na área de resultado inteira (delegação de eventos)
areaResultado.addEventListener("click", (e) => {
  if (e.target.id === "btn-favoritar") salvarFavorito();
});

// Mesmo truque para os botões de cada item da lista
listaFavoritos.addEventListener("click", (e) => {
  const botao = e.target;

  if (botao.classList.contains("btn-excluir")) {
    removerFavorito(botao.dataset.id);
  }

  if (botao.classList.contains("btn-editar")) {
    editarApelido(botao.dataset.id, botao.dataset.apelido);
  }

  if (botao.classList.contains("btn-ver")) {
    inputCep.value = botao.dataset.cep;
    buscarCep();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
});

// Carrega os favoritos assim que a página abre
listarFavoritos();
