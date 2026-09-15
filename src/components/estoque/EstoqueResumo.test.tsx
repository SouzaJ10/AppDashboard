import { useState } from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { EstoqueResumo } from "@/components/estoque/EstoqueResumo";

type EstoqueStatus =
  | "todos"
  | "ok"
  | "baixo"
  | "zerado"
  | "inativo";

function EstoqueResumoControlado() {
  const [status, setStatus] =
    useState<EstoqueStatus>("todos");

  return (
    <EstoqueResumo
      totalProdutos={10}
      total={25}
      valorEstoque={500}
      zerados={2}
      baixo={3}
      status={status}
      onStatusChange={setStatus}
    />
  );
}

describe("EstoqueResumo", () => {
  it("ativa os filtros existentes pelos alertas de estoque", async () => {
    const user = userEvent.setup();

    render(<EstoqueResumoControlado />);

    const zerados = screen.getByRole("button", {
      name: /SKUs zerados/i,
    });
    const baixo = screen.getByRole("button", {
      name: /Estoque baixo/i,
    });

    expect(zerados).toHaveAttribute("aria-pressed", "false");
    expect(baixo).toHaveAttribute("aria-pressed", "false");
    expect(
      screen.queryByRole("button", {
        name: /Total de produtos/i,
      })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", {
        name: /Itens em estoque/i,
      })
    ).not.toBeInTheDocument();

    await user.click(zerados);

    expect(zerados).toHaveAttribute("aria-pressed", "true");
    expect(baixo).toHaveAttribute("aria-pressed", "false");

    await user.click(baixo);

    expect(zerados).toHaveAttribute("aria-pressed", "false");
    expect(baixo).toHaveAttribute("aria-pressed", "true");
    expect(within(zerados).getByText("2")).toBeInTheDocument();
    expect(within(baixo).getByText("3")).toBeInTheDocument();
  });
});
