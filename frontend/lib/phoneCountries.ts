export type PhoneCountry = {
  code: string;
  name: string;
  dial: string;
  flag: string;
};

export const phoneCountries: PhoneCountry[] = [
  { code: "US", name: "United States", dial: "+1", flag: "🇺🇸" },
  { code: "CA", name: "Canada", dial: "+1", flag: "🇨🇦" },
  { code: "GB", name: "United Kingdom", dial: "+44", flag: "🇬🇧" },
  { code: "IE", name: "Ireland", dial: "+353", flag: "🇮🇪" },
  { code: "ES", name: "Spain", dial: "+34", flag: "🇪🇸" },
  { code: "PT", name: "Portugal", dial: "+351", flag: "🇵🇹" },
  { code: "IT", name: "Italy", dial: "+39", flag: "🇮🇹" },
  { code: "FR", name: "France", dial: "+33", flag: "🇫🇷" },
  { code: "DE", name: "Germany", dial: "+49", flag: "🇩🇪" },
  { code: "AU", name: "Australia", dial: "+61", flag: "🇦🇺" },
  { code: "NZ", name: "New Zealand", dial: "+64", flag: "🇳🇿" },
  { code: "BR", name: "Brazil", dial: "+55", flag: "🇧🇷" },
  { code: "MX", name: "Mexico", dial: "+52", flag: "🇲🇽" },
  { code: "AR", name: "Argentina", dial: "+54", flag: "🇦🇷" },
  { code: "CL", name: "Chile", dial: "+56", flag: "🇨🇱" },
];

export const getDefaultCountryCode = () => {
  if (typeof navigator === "undefined") return "US";
  const locale = navigator.language ?? "en-US";
  const parts = locale.split("-");
  return parts[1]?.toUpperCase() ?? "US";
};

export const findCountryByCode = (code: string) =>
  phoneCountries.find((country) => country.code === code) ?? phoneCountries[0];

export const findCountryByDial = (phone: string) => {
  const normalized = phone.trim();
  return phoneCountries.find((country) => normalized.startsWith(country.dial));
};
