const $ = (selector) => document.querySelector(selector);
const fixtures = window.COLDOPEN_FIXTURES ?? {};
let currentFeature;
let currentScript;
const labels = {
  drag_abandon_rate: "Abandoned drags", dead_end_dialog_rate: "Dialog exits without a selection",
  dialog_cycle_rate: "Repeated dialog cycles", median_hesitation_ms: "Median pause between actions",
  median_key_interval_ms: "Median key interval", focus_change_rate: "Focus changes"
};

function setStatus(message, isError = false) {
  const status = $("#status"); status.textContent = message; status.classList.toggle("error", isError);
}
function textList(element, values) {
  element.replaceChildren(...values.map((value) => { const item = document.createElement("li"); item.textContent = value; return item; }));
}
function formattedSignal(key, value) {
  if (key.includes("rate")) return `${Math.round(value * 100)}%`;
  return `${Math.round(value)} ms`;
}
function renderFeature(feature) {
  currentFeature = feature;
  $("#class-title").textContent = `${feature.class_id} · ${feature.window}`;
  $("#confidence").textContent = `${feature.confidence} confidence`;
  $("#confidence").className = `badge ${feature.confidence}`;
  $("#confidence-note").textContent = `${feature.n_sessions} anonymous session summaries inform this class-level pattern.`;
  const signals = $("#signals"); signals.replaceChildren();
  for (const [key, value] of Object.entries(feature.signals)) {
    const term = document.createElement("dt"); term.textContent = labels[key];
    const definition = document.createElement("dd"); definition.textContent = formattedSignal(key, value);
    signals.append(term, definition);
  }
  $("#feature-card").classList.remove("hidden");
}
function renderScript(script, source) {
  currentScript = script;
  $("#diagnosis").textContent = script.diagnosis;
  $("#script-confidence").textContent = `${script.confidence} confidence · designed for five minutes`;
  $("#script-source").textContent = source;
  textList($("#evidence"), script.evidence);
  $("#setup").textContent = script.demo.setup;
  textList($("#steps"), script.demo.steps);
  $("#check").textContent = script.demo.check;
  $("#script-card").classList.remove("hidden");
}
function currentFixture() {
  const classId = $("#class-id").value.trim();
  const window = $("#window").value.trim();
  const fixture = fixtures[classId];
  if (!fixture) throw new Error("Choose one of the committed fixture classes: demo-novice-class or demo-competent-class.");
  if (fixture.feature.window !== window) throw new Error("This fixture has data only for the displayed demo window.");
  return fixture;
}
function loadFixture() {
  try {
    const fixture = currentFixture();
    renderFeature(fixture.feature);
    renderScript(fixture.script, "Fixture script · available immediately");
    setStatus("Recommendation loaded.");
  } catch (error) { setStatus(error.message, true); }
}
async function regenerate() {
  if (!currentFeature) return;
  const button = $("#generate"); button.disabled = true;
  setStatus("Generating a new recommendation…");
  try {
    const response = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(currentFeature)
    });
    const script = await response.json();
    if (!response.ok) throw new Error(script.error || "Unable to regenerate the demo");
    renderScript(script, "Generated live");
    setStatus("New recommendation loaded.");
  } catch (error) {
    // Do not clear currentScript: the committed fixture stays available during a demo outage.
    setStatus(`${error.message} The fixture recommendation is still shown.`, true);
  } finally { button.disabled = false; }
}

$("#load").addEventListener("click", loadFixture);
$("#generate").addEventListener("click", regenerate);
loadFixture();
