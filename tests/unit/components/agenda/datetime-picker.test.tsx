import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DateTimePicker } from "@/components/agenda/datetime-picker";

function setup(value = "") {
  const onChange = vi.fn();
  render(<DateTimePicker id="dt" value={value} onChange={onChange} />);
  const date = () => document.getElementById("dt") as HTMLInputElement;
  const time = () => screen.getByLabelText(/horário/i) as HTMLSelectElement;
  return { onChange, date, time };
}

describe("DateTimePicker", () => {
  it("inicializa date e time a partir do value", () => {
    const { date, time } = setup("2026-09-10T13:00");
    expect(date().value).toBe("2026-09-10");
    expect(time().value).toBe("13:00");
  });

  it("dropdown tem granularidade de 30min cobrindo o dia (00:00 e 23:30 presentes)", () => {
    const { time } = setup("2026-09-10T13:00");
    const values = Array.from(time().options).map((o) => o.value);
    expect(values).toContain("00:00");
    expect(values).toContain("00:30");
    expect(values).toContain("23:30");
    // 48 slots + a opção placeholder "Hora" (value "")
    expect(values.filter((v) => v !== "")).toHaveLength(48);
  });

  it("combina date+time alterados no formato YYYY-MM-DDTHH:mm", () => {
    const { onChange, date, time } = setup("2026-09-10T13:00");
    fireEvent.change(date(), { target: { value: "2026-09-11" } });
    expect(onChange).toHaveBeenLastCalledWith("2026-09-11T13:00");
    fireEvent.change(time(), { target: { value: "10:30" } });
    expect(onChange).toHaveBeenLastCalledWith("2026-09-11T10:30");
  });

  it("emite string vazia quando só a data está preenchida (hora faltando)", () => {
    const { onChange, date } = setup("");
    fireEvent.change(date(), { target: { value: "2026-09-11" } });
    expect(onChange).toHaveBeenLastCalledWith("");
  });

  it("preserva hora fora da grade de 30min (ex.: 09:15) como opção extra", () => {
    const { time } = setup("2026-09-10T09:15");
    expect(time().value).toBe("09:15");
    const values = Array.from(time().options).map((o) => o.value);
    expect(values).toContain("09:15");
  });
});
