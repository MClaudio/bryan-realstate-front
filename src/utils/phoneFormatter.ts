import {
  parsePhoneNumberFromString,
  getCountries,
  getCountryCallingCode,
  type CountryCode,
} from 'libphonenumber-js';

const MIN_PHONE_DIGITS = 9;
const DEFAULT_COUNTRY: CountryCode = 'EC';

export interface PhoneCountryOption {
  countryCode: CountryCode;
  dialCode: string;
  label: string;
}

const regionNames =
  typeof Intl !== 'undefined' && typeof Intl.DisplayNames !== 'undefined'
    ? new Intl.DisplayNames(['es'], { type: 'region' })
    : null;

export const PHONE_COUNTRY_OPTIONS: PhoneCountryOption[] = getCountries()
  .map((countryCode) => {
    const dialCode = `+${getCountryCallingCode(countryCode)}`;
    const countryName = regionNames?.of(countryCode) ?? countryCode;

    return {
      countryCode,
      dialCode,
      label: `${countryName} (${dialCode})`,
    };
  })
  .sort((a, b) => {
    if (a.countryCode === DEFAULT_COUNTRY) return -1;
    if (b.countryCode === DEFAULT_COUNTRY) return 1;
    return a.label.localeCompare(b.label, 'es');
  });

export const formatPhoneNumber = (
  phoneNumber: string | null,
  preferredCountry: CountryCode = DEFAULT_COUNTRY,
): { formatted: string; isValid: boolean } => {
  if (!phoneNumber) {
    return { formatted: '', isValid: false };
  }

  const cleaned = phoneNumber.trim().replace(/[^\d+]/g, '');
  const digitCount = cleaned.replace(/\D/g, '').length;

  // Ignorar números cortos: operadora, emergencia, etc.
  if (!cleaned || digitCount < MIN_PHONE_DIGITS) {
    return { formatted: cleaned, isValid: false };
  }

  const candidates = cleaned.startsWith('+')
    ? [cleaned, cleaned.replace('+', '')]
    : [cleaned, `+${cleaned}`];

  for (const candidate of candidates) {
    const parsed = candidate.startsWith('+')
      ? parsePhoneNumberFromString(candidate)
      : parsePhoneNumberFromString(candidate, preferredCountry);

    if (parsed?.isValid()) {
      return { formatted: parsed.number, isValid: true };
    }
  }

  // Fallback local cuando viene en formato nacional con 0 inicial
  if (cleaned.startsWith('0')) {
    const parsedPreferred = parsePhoneNumberFromString(cleaned, preferredCountry);
    if (parsedPreferred?.isValid()) {
      return { formatted: parsedPreferred.number, isValid: true };
    }
  }

  return { formatted: cleaned, isValid: false };
};

export const validatePhoneNumber = (phoneNumber: string, preferredCountry: CountryCode = DEFAULT_COUNTRY): boolean => {
  const { isValid } = formatPhoneNumber(phoneNumber, preferredCountry);
  return isValid;
};

export const getFormattedPhoneNumber = (
  phoneNumber: string,
  preferredCountry: CountryCode = DEFAULT_COUNTRY,
): string => {
  const { formatted, isValid } = formatPhoneNumber(phoneNumber, preferredCountry);
  return isValid ? formatted : phoneNumber;
};
