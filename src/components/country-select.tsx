import { COUNTRIES } from "@/lib/countries";

export function CountrySelect({ id, name, defaultValue }: { id: string; name: string; defaultValue?: string }) {
  return (
    <select id={id} name={name} defaultValue={defaultValue || "IT"}>
      {COUNTRIES.map((country) => (
        <option key={country.code} value={country.code}>
          {country.name}
        </option>
      ))}
    </select>
  );
}
