import { describe, test, expect } from "vitest";
import {
  limparCep,
  validarCep,
  formatarCep,
  normalizar,
  distanciaKm,
  escaparHtml,
  montarFavorito,
} from "./utils.js";

describe("limparCep", () => {
  test("remove hífen e espaços", () => {
    expect(limparCep(" 71931-360 ")).toBe("71931360");
  });

  test("retorna vazio quando recebe null", () => {
    expect(limparCep(null)).toBe("");
  });
});

describe("validarCep", () => {
  test("aceita CEP com 8 dígitos", () => {
    expect(validarCep("71931360")).toBe(true);
  });

  test("rejeita CEP vazio", () => {
    expect(validarCep("")).toBe(false);
  });

  test("rejeita CEP com menos de 8 dígitos", () => {
    expect(validarCep("7193136")).toBe(false);
  });

  test("rejeita CEP com letras", () => {
    expect(validarCep("7193136a")).toBe(false);
  });
});

describe("formatarCep", () => {
  test("coloca o hífen no lugar certo", () => {
    expect(formatarCep("71931360")).toBe("71931360");
  });
});

describe("normalizar", () => {
  test("tira acentos e deixa minúsculo", () => {
    expect(normalizar("  Águas Claras ")).toBe("aguas claras");
  });
});

describe("distanciaKm", () => {
  test("distância de um ponto até ele mesmo é zero", () => {
    expect(distanciaKm(-15.8, -47.9, -15.8, -47.9)).toBe(0);
  });

  test("Brasília até São Paulo fica perto de 870 km", () => {
    const d = distanciaKm(-15.7939, -47.8828, -23.5505, -46.6333);
    expect(d).toBeGreaterThan(850);
    expect(d).toBeLessThan(890);
  });
});

describe("escaparHtml", () => {
  test("impede que um apelido vire código HTML", () => {
    expect(escaparHtml("<b>Casa</b>")).toBe("&lt;b&gt;Casa&lt;/b&gt;");
  });
});

describe("montarFavorito", () => {
  test("monta o registro no formato da tabela favoritos_cep", () => {
    const endereco = {
      cep: "71931-360",
      logradouro: "Rua 36",
      bairro: "Sul (Águas Claras)",
      localidade: "Brasília",
      uf: "DF",
    };
    const coords = { lat: -15.835604, lon: -48.038084 };

    expect(montarFavorito(endereco, coords)).toEqual({
      cep: "71931-360",
      logradouro: "Rua 36",
      bairro: "Sul (Águas Claras)",
      cidade: "Brasília",
      uf: "DF",
      latitude: -15.835604,
      longitude: -48.038084,
    });
  });

  test("salva null quando o CEP não tem logradouro nem bairro", () => {
    const endereco = {
      cep: "70000-000",
      logradouro: "",
      bairro: "",
      localidade: "Brasília",
      uf: "DF",
    };
    const favorito = montarFavorito(endereco, { lat: 0, lon: 0 });
    expect(favorito.logradouro).toBeNull();
    expect(favorito.bairro).toBeNull();
  });
});
