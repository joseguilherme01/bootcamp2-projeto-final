// ======================================================
// FUNÇÕES PURAS DA APLICAÇÃO
// ------------------------------------------------------
// "Pura" = recebe dados, devolve um resultado, e não mexe
// na página, na internet nem no banco. Por isso dá para
// testar automaticamente (arquivo utils.test.js).
// ======================================================

// Remove tudo que não for número: "71931-360" -> "71931360"
export function limparCep(valor) {
  return String(valor ?? "").replace(/\D/g, "");
}

// CEP válido = exatamente 8 dígitos
export function validarCep(cep) {
  return /^[0-9]{8}$/.test(cep);
}

// "71931360" -> "71931-360"
export function formatarCep(cepLimpo) {
  return String(cepLimpo).replace(/^(\d{5})(\d{3})$/, "$1-$2");
}

// Deixa o texto minúsculo e sem acentos, para comparar endereços
// "Águas Claras" -> "aguas claras"
export function normalizar(txt) {
  return (txt || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

// Distância em km entre dois pontos do mapa (fórmula de Haversine)
export function distanciaKm(lat1, lon1, lat2, lon2) {
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

// Evita que um texto digitado pelo usuário (ex.: apelido com < ou >)
// seja interpretado como HTML e quebre a página
export function escaparHtml(texto) {
  return String(texto ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Regra de negócio: transforma a resposta do ViaCEP + coordenadas
// no registro que será salvo na tabela "favoritos_cep"
export function montarFavorito(endereco, coords) {
  return {
    cep: endereco.cep,
    logradouro: endereco.logradouro || null,
    bairro: endereco.bairro || null,
    cidade: endereco.localidade,
    uf: endereco.uf,
    latitude: coords.lat,
    longitude: coords.lon,
  };
}
