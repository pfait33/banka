const fs = require("fs");
const path = require("path");

const projectId = "cth-klondike-2026";
const documentPath = `projects/${projectId}/databases/(default)/documents/banks/klondike-frfond`;

const kidsNames = [
  "Adámek Jindřich",
  "Adámek Matěj",
  "Adámek Vojtěch",
  "Adámková Adélka",
  "Beláková Karolína",
  "Brož Radim",
  "Brožová Valerie",
  "Brůna Filip",
  "Brůna Oliver",
  "Cmíral Antonín",
  "Čermáková Karolína",
  "Černý Matěj",
  "Elešová Zuzana",
  "Gistr Vojtěch",
  "Hájek Kryštof",
  "Hájková Aneta",
  "Hanzl Michal",
  "Havlenová Ella",
  "Havlenová Klára",
  "Havlíček Maxmilián",
  "Horčička Tadeáš",
  "Jáčová Johanka",
  "Janáček Filip",
  "Jančovičová Alžběta",
  "Janeček Jiří",
  "Janečková Štěpánka",
  "Jaroš Daniel",
  "Jordánová Tereza",
  "Kadlec Josef",
  "Kdýrová Valentýna",
  "Klečka Josef",
  "Klíč Bernard",
  "Krognerová Anna",
  "Masopust Tadeáš",
  "Masopust Vojtěch",
  "Mikulcová Ema",
  "Miškovská Nella",
  "Natalie Hieke",
  "Nolová Berenika",
  "Petr Tomáš",
  "Petrová Kateřina",
  "Poch Matyáš",
  "Pružincová Alexandra",
  "Pružinec Michal",
  "Říčan Teodor",
  "Rozmanová Štěpánka",
  "Sattler Mark Philip",
  "Sattler Michael Adam",
  "Sejček Benjamin",
  "Stejskalová Barbora",
  "Toropov Jakub",
  "Toropov Jiří",
  "Toropov Štěpán",
  "Vandrovec Vojtěch",
  "Vobořil Václav",
  "Vojíř Vojtěch",
  "Votavová Jindřiška",
  "Votavová Libuše",
  "Zahradníková Vendula",
  "Zemanová Alžběta",
  "Beran Mikuláš",
  "Beran Vilda"
];

function isoNow() {
  return new Date().toISOString();
}

function makeState() {
  const createdAt = isoNow();
  return {
    version: 7,
    createdAt,
    updatedAt: createdAt,
    kids: kidsNames.map((name, index) => ({
      id: `kid_${String(index + 1).padStart(3, "0")}`,
      name,
      team: "",
      createdAt
    })),
    tx: [],
    tds: []
  };
}

function toFirestoreValue(value) {
  if (value === null || value === undefined) return { nullValue: null };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(toFirestoreValue) } };
  if (typeof value === "object") {
    return {
      mapValue: {
        fields: Object.fromEntries(Object.entries(value).map(([key, val]) => [key, toFirestoreValue(val)]))
      }
    };
  }
  if (typeof value === "number" && Number.isInteger(value)) return { integerValue: String(value) };
  if (typeof value === "number") return { doubleValue: value };
  if (typeof value === "boolean") return { booleanValue: value };
  return { stringValue: String(value) };
}

function readFirebaseAccessToken() {
  const configPath = path.join(process.env.USERPROFILE || process.env.HOME, ".config", "configstore", "firebase-tools.json");
  const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
  const token = config?.tokens?.access_token;
  if (!token) throw new Error("Firebase CLI access token was not found. Run firebase.cmd login first.");
  return token;
}

async function main() {
  const state = makeState();
  const token = readFirebaseAccessToken();
  const url = `https://firestore.googleapis.com/v1/${documentPath}`;
  const response = await fetch(url, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      fields: Object.fromEntries(Object.entries({
        ...state,
        updatedBy: "codex-reset-bank-kids",
        serverUpdatedAt: isoNow()
      }).map(([key, value]) => [key, toFirestoreValue(value)]))
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Firestore reset failed (${response.status}): ${text}`);
  }

  const htmlPath = path.join(__dirname, "..", "index.html");
  let html = fs.readFileSync(htmlPath, "utf8");
  const replacement = `const DEFAULT_KIDS = [\n${kidsNames.map(name => `    ${JSON.stringify(name)}`).join(",\n")}\n  ];`;
  html = html.replace(/const DEFAULT_KIDS = \[[\s\S]*?\n  \];/, replacement);
  fs.writeFileSync(htmlPath, html, "utf8");

  console.log(`Reset Firestore bank document with ${state.kids.length} kids and cleared tx/tds.`);
}

main().catch(error => {
  console.error(error.message);
  process.exit(1);
});
