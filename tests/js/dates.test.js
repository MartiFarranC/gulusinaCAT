import assert from "node:assert/strict";
import { test } from "node:test";

import {
  diaAnterior,
  diaIMes,
  diaIsoDeLaFecha,
  diaIsoLocal,
  textDeLaCopia,
} from "../../assets/js/dates.js";

const ARA = new Date("2026-09-30T14:00:00").getTime();

test("la data del Ministeri es converteix al dia en format ISO", () => {
  assert.equal(diaIsoDeLaFecha("30/09/2026 12:00:00"), "2026-09-30");
});

test("una data que no és del Ministeri no té dia", () => {
  assert.equal(diaIsoDeLaFecha("2026-09-30"), null);
  assert.equal(diaIsoDeLaFecha(undefined), null);
});

test("el dia i el mes es mostren sense zeros", () => {
  assert.equal(diaIMes("2026-03-05"), "5/3");
});

test("el dia anterior canvia de mes i d'any", () => {
  assert.equal(diaAnterior("2026-03-01"), "2026-02-28");
  assert.equal(diaAnterior("2026-01-01"), "2025-12-31");
});

test("el dia local no depèn de la zona UTC", () => {
  assert.equal(diaIsoLocal(new Date(2026, 8, 30, 23, 30)), "2026-09-30");
});

test("una còpia d'avui diu que s'actualitza cada mitja hora", () => {
  const text = textDeLaCopia("30/09/2026 12:00:00", ARA);

  assert.equal(
    text,
    "Preus oficials del Ministeri del 30/09/2026 12:00 · s'actualitzen cada mitja hora",
  );
});

test("una còpia de fa més d'un dia avisa dels dies que fa", () => {
  const text = textDeLaCopia("28/09/2026 09:05:00", ARA);

  assert.equal(
    text,
    "Últimes dades oficials: 28/09/2026 09:05 (fa 2 dies). Els preus d'avui poden ser diferents.",
  );
});
