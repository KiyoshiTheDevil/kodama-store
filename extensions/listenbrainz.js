// ListenBrainz for Kodama.
//
// Runs in the background, in Kodama's sandbox: it can see what is playing, keep its own settings,
// and reach api.listenbrainz.org, and nothing else. It never sees your YouTube Music account.
//
// The rule for what counts as a listen is ListenBrainz's own: half the track or four minutes,
// whichever comes first. Time is counted while the track actually plays, so skipping ahead does
// not make a listen out of a song you did not hear.
(function () {
  "use strict";

  var API = "https://api.listenbrainz.org/1/";
  var VERSION = "1.0.0";
  var QUEUE_KEY = "pending";
  var QUEUE_MAX = 50;
  var TICK_MS = 5000;

  var de = String(navigator.language || "").toLowerCase().indexOf("de") === 0;
  var say = {
    connected: function (user) { return de ? "Verbunden als " + user : "Connected as " + user; },
    rejected: de ? "Der Token wurde nicht angenommen" : "The token was not accepted",
    unreachable: de ? "ListenBrainz ist gerade nicht erreichbar" : "ListenBrainz cannot be reached right now",
  };

  var token = "";
  var enabled = true;
  var warnedBadToken = false;

  // The listen being counted: which track, when it began, how long it has actually played.
  var cur = null;

  function now() { return Date.now(); }

  function loadSettings() {
    return Promise.all([kodama.storage.get("token"), kodama.storage.get("enabled")]).then(function (v) {
      token = typeof v[0] === "string" ? v[0].trim() : "";
      // Unset means on. Someone who pasted a token expects it to work without finding a switch.
      enabled = v[1] !== false;
    });
  }

  function request(path, body) {
    return kodama.net.fetch(API + path, {
      method: body ? "POST" : "GET",
      headers: { "Authorization": "Token " + token, "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  function metadata(np) {
    var extra = {
      media_player: "Kodama",
      submission_client: "Kodama ListenBrainz",
      submission_client_version: VERSION,
      music_service: "music.youtube.com",
    };
    if (np.videoId) extra.origin_url = "https://music.youtube.com/watch?v=" + np.videoId;
    if (np.duration) extra.duration_ms = Math.round(np.duration * 1000);
    var meta = { artist_name: np.artists, track_name: np.title, additional_info: extra };
    if (np.album) meta.release_name = np.album;
    return meta;
  }

  // ── Submitting ─────────────────────────────────────────────────────────────

  function readQueue() {
    return kodama.storage.get(QUEUE_KEY).then(function (q) { return Array.isArray(q) ? q : []; });
  }

  function writeQueue(q) {
    return kodama.storage.set(QUEUE_KEY, q.slice(-QUEUE_MAX));
  }

  // A listen that could not be sent is kept and tried again, so a dropped connection or a restart
  // does not lose it. Kept small: a queue that grows without end fills the storage Kodama grants.
  function submitListen(listen) {
    return readQueue().then(function (q) {
      q.push(listen);
      return writeQueue(q);
    }).then(flush);
  }

  var flushing = false;
  function flush() {
    if (flushing || !token || !enabled) return Promise.resolve();
    flushing = true;
    return readQueue().then(function (q) {
      if (!q.length) return;
      return request("submit-listens", { listen_type: q.length === 1 ? "single" : "import", payload: q })
        .then(function (r) {
          if (r.status === 200) return writeQueue([]);
          if (r.status === 401) { badToken(); return; }
          // 400 means ListenBrainz refused the content itself. Sending it again would be refused
          // again, forever, and hold up everything queued behind it.
          if (r.status === 400) return writeQueue([]);
        });
    }).catch(function () { /* offline: stays queued, tried again on the next tick */ })
      .then(function () { flushing = false; });
  }

  function playingNow(np) {
    if (!token || !enabled) return;
    request("submit-listens", { listen_type: "playing_now", payload: [{ track_metadata: metadata(np) }] })
      .then(function (r) { if (r.status === 401) badToken(); })
      .catch(function () {});
  }

  function badToken() {
    if (warnedBadToken) return;
    warnedBadToken = true;
    kodama.ui.toast(say.rejected, "error").catch(function () {});
  }

  // ── Counting ───────────────────────────────────────────────────────────────

  function threshold(np) {
    // Half the track or four minutes. With no duration known, four minutes.
    return np.duration > 0 ? Math.min(240, np.duration / 2) : 240;
  }

  function begin(np) {
    cur = { np: np, startedAt: Math.floor(now() / 1000), played: 0, since: np.isPlaying ? now() : 0,
            lastPos: np.position || 0, sent: false };
    if (np.isPlaying) playingNow(np);
  }

  function account() {
    if (cur && cur.since) {
      cur.played += (now() - cur.since) / 1000;
      cur.since = now();
    }
  }

  function check() {
    if (!cur || cur.sent) return;
    account();
    if (cur.played >= threshold(cur.np)) {
      cur.sent = true;
      submitListen({ listened_at: cur.startedAt, track_metadata: metadata(cur.np) });
    }
  }

  kodama.on("player.changed", function (np) {
    if (!np || !np.videoId) { account(); if (cur) cur.since = 0; return; }
    if (!cur || cur.np.videoId !== np.videoId) { begin(np); return; }
    account();
    cur.since = np.isPlaying ? now() : 0;
    if (np.isPlaying && cur.played < 1) playingNow(np);
  });

  // Every few seconds: count, and notice a track played again from the start. The same song on
  // repeat is the same track id, so the only sign of a second listen is the position going back.
  setInterval(function () {
    check();
    if (!cur || !cur.sent) return;
    kodama.player.get().then(function (np) {
      if (!np || np.videoId !== cur.np.videoId) return;
      if (np.position + 10 < cur.lastPos) begin(np);
      else cur.lastPos = np.position;
    }).catch(function () {});
  }, TICK_MS);

  setInterval(flush, 60000);

  // ── Settings ───────────────────────────────────────────────────────────────

  function validate() {
    if (!token) return;
    request("validate-token").then(function (r) {
      var d = {};
      try { d = JSON.parse(r.body || "{}"); } catch (e) { /* not JSON */ }
      if (d.valid) {
        warnedBadToken = false;
        kodama.ui.toast(say.connected(d.user_name || "?"), "success").catch(function () {});
        flush();
      } else {
        badToken();
      }
    }).catch(function () { kodama.ui.toast(say.unreachable, "error").catch(function () {}); });
  }

  kodama.on("settings.changed", function (e) {
    loadSettings().then(function () {
      if (e && e.key === "token") { warnedBadToken = false; validate(); }
      else flush();
    });
  });

  loadSettings().then(flush);
})();
