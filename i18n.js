import "intl-pluralrules";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import enTranslation from "./locales/en/translation.json";
import esTranslation from "./locales/es/translation.json";
import itTranslation from "./locales/it/translation.json";
import ptBRTranslation from "./locales/pt-BR/translation.json";
import deTranslation from "./locales/de-DE/translation.json";
import frTranslation from "./locales/fr/translation.json";
import svTranslation from "./locales/sv/translation.json";
import ruTranslation from "./locales/ru/translation.json";

i18n.use(initReactI18next).init({
  debug: false,
  fallbackLng: "en",
  supportedLngs: ["en", "es", "it", "pt-BR", "de-DE", "fr", "sv", "ru"],
  interpolation: {
    escapeValue: false,
  },
  resources: {
    en: {
      translation: enTranslation,
    },
    es: {
      translation: esTranslation,
    },
    it: {
      translation: itTranslation,
    },
    "pt-BR": {
      translation: ptBRTranslation,
    },
    "de-DE": {
      translation: deTranslation,
    },
    fr: {
      translation: frTranslation,
    },
    sv: {
      translation: svTranslation,
    },
    ru: {
      translation: ruTranslation,
    },
  },
});
