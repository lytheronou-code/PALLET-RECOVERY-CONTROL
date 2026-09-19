import { CURRENCY_CODES } from "@/lib/currencies";

export function CurrencySelect({ id, name, defaultValue }: { id: string; name: string; defaultValue?: string }) {
  return (
    <select id={id} name={name} defaultValue={defaultValue || "EUR"}>
      {CURRENCY_CODES.map((code) => (
        <option key={code} value={code}>
          {code}
        </option>
      ))}
    </select>
  );
}
