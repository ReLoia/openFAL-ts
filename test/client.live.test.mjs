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

    await t.test("getStations returns live combined station data", async () => {
        const stations = await client.getStations();
        printResponse("getStations", stations);

        assert.ok(Array.isArray(stations));
        assert.ok(stations.length > 0);
        assert.equal(typeof stations[0].codSite, "string");
        assert.equal(typeof stations[0].name, "string");
        assert.ok(Array.isArray(stations[0].services));
    });

    await t.test("getSchedules returns live routes for a known train corridor", async () => {
        // Generate tomorrow's date to ensure we have schedules (YYYY-MM-DD)
        const tmrw = new Date(Date.now() + 86400000).toISOString().split("T")[0];

        // S02115 = Palo del Colle, S02110 = Bari Centrale FAL
        const result = await client.getSchedules("S02115", "S02110", tmrw);
        printResponse("getSchedules", result);

        assert.ok(Array.isArray(result));

        if (result.length > 0) {
            assert.equal(typeof result[0].idSoluzione, "number");
            assert.equal(typeof result[0].timeA, "string");
            assert.equal(typeof result[0].nomeP, "string");
        }
    });

    await t.test("getRTTrainTrips returns live realtime train trips", async () => {
        const trips = await client.getRTTrainTrips();
        printResponse("getRTTrainTrips", trips);

        assert.ok(Array.isArray(trips));
        if (trips.length > 0) {
            assert.equal(typeof trips[0].trip_id, "string");
            assert.equal(typeof trips[0].first_stop, "string");
        }
    });

    await t.test("getRTBusTrips returns live realtime bus trips", async () => {
        const trips = await client.getRTBusTrips();
        printResponse("getRTBusTrips", trips);

        assert.ok(Array.isArray(trips));
        if (trips.length > 0) {
            assert.equal(typeof trips[0].trip_id, "string");
            assert.equal(typeof trips[0].first_stop, "string");
        }
    });

    await t.test("getRTTrainInfo returns detail for a live train", async () => {
        const trips = await client.getRTTrainTrips();
        if (trips.length === 0) return; // Skip if no trains are running right now

        const info = await client.getRTTrainInfo(trips[0].trip_id);
        printResponse("getRTTrainInfo", info);

        assert.ok(info);
        assert.equal(info.trip_id, trips[0].trip_id);
        assert.ok(Array.isArray(info.stopTimes));
        assert.ok(info.stopTimes.length > 0);
    });

    await t.test("getRTBusInfo returns detail for a live bus trip", async () => {
        const trips = await client.getRTBusTrips();
        if (trips.length === 0) return; // Skip if no buses are running right now

        const info = await client.getRTBusInfo(trips[0].trip_id);
        printResponse("getRTBusInfo", info);

        assert.ok(info);
        assert.equal(info.trip_id, trips[0].trip_id);
        assert.ok(Array.isArray(info.stopTimes));
        assert.ok(info.stopTimes.length > 0);
    });

    await t.test("getWarnings returns live news/warnings", async () => {
        const warnings = await client.getWarnings();
        printResponse("getWarnings", warnings);

        assert.ok(Array.isArray(warnings));
        if (warnings.length > 0) {
            // Updated assertions for the new JSON API response
            assert.equal(typeof warnings[0].id, "number");
            assert.equal(typeof warnings[0].title, "string");
            assert.equal(typeof warnings[0].date, "string");
            assert.equal(typeof warnings[0].content, "string");
        }
    });

    await t.test("createSession works and initializes an unauthenticated token", async () => {
        const session = await client.createSession();
        printResponse("createSession", { token: session.token });

        assert.ok(session.token);
        assert.equal(typeof session.token, "string");

        const isAuth = await session.isLoggedIn();
        assert.equal(isAuth, false);
    });
});
