export function TimezoneSelect({
  id,
  name,
  defaultValue,
  timezones,
}: {
  id: string;
  name: string;
  defaultValue?: string;
  timezones: string[];
}) {
  return (
    <select id={id} name={name} defaultValue={defaultValue || "UTC"}>
      {timezones.map((tz) => (
        <option key={tz} value={tz}>
          {tz}
        </option>
      ))}
    </select>
  );
}
