const FrontendBaseEndpoint = "https://app.trupeer.ai";
const FrontendPreviewBaseEndpoint = "https://preview-app.trupeer.ai";
const FrontendDevBaseEndpoint = "https://dev-app.trupeer.ai";
const FrontendExperimentalBaseEndpoint = "https://exp-app.trupeer.ai";
const FrontendLocalBaseEndpoint = "http://localhost:3000";

// Return the base endpoint based on the environment
export function getFrontendBaseEndpoint() {
  return FrontendBaseEndpoint;
}

const BackendBaseEndpoint = "https://api.trupeer.ai/api/v1";
const BackendStagingBaseEndpoint = "https://staging-api.trupeer.ai/api/v1";
const BackendDevBaseEndpoint = "https://dev-api.trupeer.ai/api/v1";
const BackendLocalBaseEndpoint = "http://localhost:8080/api/v1";

export function getBackendBaseEndpoint() {
  return BackendBaseEndpoint;
}

// export const LanguageOptions = [
//   "english",
//   "spanish",
//   "portuguese",
//   "french",
//   "chinese",
//   "italian",
//   "german",
//   "hindi",
//   "tamil",
//   "arabic",
//   "japanese",
//   "swedish",
//   "russian",
//   "finnish",
//   "indonesian",
//   "korean",
// ];

// const languageCodeMap = {
//   english: "en",
//   french: "fr",
//   spanish: "es",
//   german: "de",
//   chinese: "zh",
//   japanese: "ja",
//   italian: "it",
//   portuguese: "pt",
//   hindi: "hi",
//   russian: "ru",
//   arabic: "ar",
//   tamil: "ta",
//   swedish: "sv",
//   finnish: "fi",
//   indonesian: "id",
//   korean: "ko",
//   // Add more languages as needed
// };

// const countryCodeMap = {
//   english: "GB",
//   french: "FR",
//   spanish: "ES",
//   german: "DE",
//   chinese: "CN",
//   japanese: "JP",
//   italian: "IT",
//   portuguese: "PT",
//   hindi: "IN",
//   russian: "RU",
//   arabic: "AE",
//   tamil: "IN", // Tamil Nadu in India or Sri Lanka
//   swedish: "SE",
//   finnish: "FI",
//   indonesian: "ID",
//   korean: "KR",
//   // Add more languages as needed
// };

// export function getLanguageCode(languageName) {
//   return languageCodeMap[languageName.toLowerCase()] || "en";
// }

// export function getCountryCode(languageName) {
//   return countryCodeMap[languageName.toLowerCase()] || "GB";
// }
