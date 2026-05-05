import assert from "node:assert/strict";
import { test } from "node:test";

import { FALClient } from "../dist/client.js";

const showResponses = process.env.SHOW_LIVE_RESPONSES === "1";

function printResponse(label, payload) {
  if (!showResponses) {
    return;
  }

  console.log(`\n### ${label}`);
  console.log(JSON.stringify(payload, null, 2));
}

test("FALClient live public API smoke test", { concurrency: false }, async (t) => {
  const client = new FALClient();

  await t.test("getTrainStations returns live station data", async () => {
    const stations = await client.getTrainStations();
    printResponse("getTrainStations", stations);

    assert.ok(Array.isArray(stations));
    assert.ok(stations.length > 0);
    assert.equal(typeof stations[0].id, "number");
    assert.equal(typeof stations[0].stazione, "number");
    assert.equal(typeof stations[0].nome, "string");
  });

  await t.test("getBusStations returns live station data", async () => {
    const stations = await client.getBusStations();
    printResponse("getBusStations", stations);

    assert.ok(Array.isArray(stations));
    assert.ok(stations.length > 0);
    assert.equal(typeof stations[0].id, "number");
    assert.equal(typeof stations[0].stazione, "number");
    assert.equal(typeof stations[0].nome, "string");
  });

  await t.test("getSchedules returns live routes for a known train corridor", async () => {
    const result = await client.getSchedules(110, 128, new Date());
    printResponse("getSchedules", result);

    assert.ok(result);
    assert.ok(Array.isArray(result.percorsi));
    assert.ok(result.percorsi.length > 0);
    assert.equal(typeof result.percorsi[0].id_percorso, "number");
    assert.ok(Array.isArray(result.percorsi[0].tratte));
  });

  await t.test("getRTTrainTrips returns live realtime train trips", async () => {
    const trips = await client.getRTTrainTrips();
    printResponse("getRTTrainTrips", trips);

    assert.ok(Array.isArray(trips));
    assert.ok(trips.length > 0);
    assert.equal(typeof trips[0].numero_treno, "string");
    assert.equal(typeof trips[0].stazioni.prima_stazione, "string");
  });

  await t.test("getRTBusTrips returns live realtime bus trips", async () => {
    const trips = await client.getRTBusTrips();
    printResponse("getRTBusTrips", trips);

    assert.ok(Array.isArray(trips));
    assert.ok(trips.length > 0);
    assert.equal(typeof trips[0].id_documento, "number");
    assert.equal(typeof trips[0].tratta, "string");
  });

  await t.test("getRTTrainInfo returns detail for a live train", async () => {
    const trips = await client.getRTTrainTrips();
    assert.ok(trips.length > 0);

    const info = await client.getRTTrainInfo(trips[0].numero_treno);
    printResponse("getRTTrainInfo", info);

    assert.ok(info);
    assert.equal(info.numero_treno, trips[0].numero_treno);
    assert.ok(Array.isArray(info.stazioni));
    assert.ok(info.stazioni.length > 0);
  });

  await t.test("getRTBusInfo returns detail for a live bus trip", async () => {
    const trips = await client.getRTBusTrips();
    assert.ok(trips.length > 0);

    const info = await client.getRTBusInfo(trips[0].id_documento);
    printResponse("getRTBusInfo", info);

    assert.ok(Array.isArray(info));
    assert.ok(info.length > 0);
    assert.equal(info[0].id_documento, trips[0].id_documento);
    assert.ok(info.some((stop) => stop.entering_date === null || typeof stop.entering_date === "string"));
    assert.ok(info.some((stop) => stop.leaving_date === null || typeof stop.leaving_date === "string"));
  });

  await t.test("getWarnings returns parsed live RSS warnings", async () => {
    const warnings = await client.getWarnings();
    printResponse("getWarnings", warnings);

    assert.ok(Array.isArray(warnings));
    assert.ok(warnings.length > 0);
    assert.equal(typeof warnings[0].title, "string");
    assert.equal(typeof warnings[0].date, "string");
    assert.equal(typeof warnings[0].link, "string");
  });
});
