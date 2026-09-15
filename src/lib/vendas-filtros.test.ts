import { describe, expect, it } from "vitest";

import {
  filtrarVendas,
  listarOpcoesClientes,
  SEM_CLIENTE,
  TODOS_CLIENTES,
} from "@/lib/vendas-filtros";

const vendas = [
  {
    id: "venda-1",
    codigo: "A-01",
    descricao: "Produto Alpha",
    data: "2026-09-10",
    cliente: "Cliente A",
    preco_venda: 100,
    custo: 60,
    despesas: 5,
    lucro: 35,
    margem: 0.35,
  },
  {
    id: "venda-2",
    codigo: "A-01",
    descricao: "Produto Alpha",
    data: "2026-09-11",
    cliente: "cliente a",
    preco_venda: 80,
    custo: 50,
    despesas: 5,
    lucro: 25,
    margem: 0.3125,
  },
  {
    id: "venda-3",
    codigo: "B-02",
    descricao: "Produto Beta",
    data: "2026-09-12",
    cliente: "Cliente A ",
    preco_venda: 70,
    custo: 40,
    despesas: 5,
    lucro: 25,
    margem: 25 / 70,
  },
  {
    id: "venda-4",
    codigo: "C-03",
    descricao: "Produto Gama",
    data: "2026-09-12",
    cliente: null,
    preco_venda: 50,
    custo: 30,
    despesas: 5,
    lucro: 15,
    margem: 0.3,
  },
  {
    id: "venda-5",
    codigo: "D-04",
    descricao: "Produto Delta",
    data: "2026-09-12",
    cliente: "   ",
    preco_venda: 40,
    custo: 20,
    despesas: 5,
    lucro: 15,
    margem: 0.375,
  },
  {
    id: "venda-6",
    codigo: "E-05",
    descricao: "Produto Épsilon",
    data: "2026-09-14",
    cliente: "",
    preco_venda: 60,
    custo: 30,
    despesas: 5,
    lucro: 25,
    margem: 25 / 60,
  },
];

describe("filtros de vendas", () => {
  it("busca cliente ignorando caixa e espaços externos", () => {
    const resultado = filtrarVendas(vendas, {
      busca: "  CLIENTE A  ",
      cliente: TODOS_CLIENTES,
      dataInicial: "",
      dataFinal: "",
    });

    expect(resultado.map((venda) => venda.id)).toEqual([
      "venda-1",
      "venda-2",
      "venda-3",
    ]);
  });

  it("preserva busca por produto, descrição e código", () => {
    expect(
      filtrarVendas(vendas, {
        busca: "beta",
        cliente: TODOS_CLIENTES,
        dataInicial: "",
        dataFinal: "",
      }).map((venda) => venda.id)
    ).toEqual(["venda-3"]);

    expect(
      filtrarVendas(vendas, {
        busca: "c-03",
        cliente: TODOS_CLIENTES,
        dataInicial: "",
        dataFinal: "",
      }).map((venda) => venda.id)
    ).toEqual(["venda-4"]);
  });

  it("deduplica variações do cliente e mantém um rótulo legível", () => {
    const opcoes = listarOpcoesClientes(vendas);

    expect(opcoes).toHaveLength(1);
    expect(opcoes[0]).toEqual({
      value: "cliente:cliente a",
      label: "Cliente A",
    });

    const resultado = filtrarVendas(vendas, {
      busca: "",
      cliente: opcoes[0].value,
      dataInicial: "",
      dataFinal: "",
    });

    expect(resultado.map((venda) => venda.id)).toEqual([
      "venda-1",
      "venda-2",
      "venda-3",
    ]);
  });

  it("combina cliente com produto e período", () => {
    const [cliente] = listarOpcoesClientes(vendas);

    const resultado = filtrarVendas(vendas, {
      busca: "Produto Alpha",
      cliente: cliente.value,
      dataInicial: "2026-09-11",
      dataFinal: "2026-09-11",
    });

    expect(resultado.map((venda) => venda.id)).toEqual([
      "venda-2",
    ]);
  });

  it("trata cliente nulo, vazio ou composto por espaços como sem cliente", () => {
    const resultado = filtrarVendas(vendas, {
      busca: "",
      cliente: SEM_CLIENTE,
      dataInicial: "",
      dataFinal: "",
    });

    expect(resultado.map((venda) => venda.id)).toEqual([
      "venda-4",
      "venda-5",
      "venda-6",
    ]);
  });

  it("preserva os registros e valores financeiros do conjunto filtrado", () => {
    const resultado = filtrarVendas(vendas, {
      busca: "Cliente A",
      cliente: TODOS_CLIENTES,
      dataInicial: "2026-09-10",
      dataFinal: "2026-09-10",
    });

    expect(resultado).toEqual([vendas[0]]);
    expect(resultado[0]).toBe(vendas[0]);
    expect(resultado[0]).toMatchObject({
      preco_venda: 100,
      custo: 60,
      despesas: 5,
      lucro: 35,
      margem: 0.35,
    });
  });
});
