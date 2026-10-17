export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // ===== Rewrite seperti .htaccess =====
    const match = path.match(/^\/(\d+)\.(mpd|m3u8|drm)$/);

    if (!match) {
      return new Response("Not Found", { status: 404 });
    }

    const id = match[1];
    let type = match[2];

    if (type === "m3u8") type = "hls";

    // ===== Dynamic API Key =====
    async function getDynamicApiKey() {
      const apiUrl = ""; // isi endpoint kamu
      if (!apiUrl) return "";

      try {
        const res = await fetch(apiUrl);
        const json = await res.json();
        return json.api_key || "";
      } catch {
        return "";
      }
    }

    const dynamicApiKey = await getDynamicApiKey();

    // ===== Account rotation =====
    const accounts = [
      {
        email: "widyawalker@gmail.com",
        token: "CxyUDiw3BFiJUVgZmbpG"
      }
    ];

    const rotationTime = 180;
    const index = Math.floor(Date.now() / 1000 / rotationTime) % accounts.length;
    const active = accounts[index];

    const t = Math.floor(Date.now() / 1000);
    const secretKey = `V1d10D3v:${t}`;

    // ===== HMAC SHA256 =====
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secretKey),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const signatureBuffer = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(String(t))
    );

    const signature = [...new Uint8Array(signatureBuffer)]
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");

    // ===== Random IP =====
    function generateIndoEduIP() {
      const prefixes = ["118.98", "180.250"];
      const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
      return `${prefix}.${rand()}.${rand()}`;
    }

    function rand() {
      return Math.floor(Math.random() * 255) + 1;
    }

    const ip = generateIndoEduIP();

    // ===== Headers =====
    const headers = {
      "Referer": "https://vidio.com/",
      "User-Agent": "tv-android/2.56.10 (852)",
      "X-Api-Platform": "tv-android",
      "X-Secure-Level": "2",
      "X-Api-Auth": "laZOmogezono5ogekaso5oz4Mezimew1",
      "X-User-Token": active.token,
      "X-Client": String(t),
      "X-Signature": signature,
      "X-User-Email": active.email,
      "X-Forwarded-For": ip,
      "Client-IP": ip,
      "CF-Connecting-IP": ip
    };

    if (dynamicApiKey) {
      headers["X-Api-Key"] = dynamicApiKey;
    }

    // ===== Fetch Vidio =====
    async function fetchVidio(streamId) {
      const apiUrl =
        `https://api.vidio.com/livestreamings/${streamId}/stream?initialize=true`;

      const res = await fetch(apiUrl, { headers });

      const body = await res.text();

      return {
        status: res.status,
        body
      };
    }

    let result = await fetchVidio(id);
    let data;

    try {
      data = JSON.parse(result.body);
    } catch {
      data = {};
    }

    // ===== Handle redirect 403 =====
    if (
      result.status === 403 &&
      data?.errors?.[0]?.meta?.blocking_banner?.url
    ) {
      const redirectUrl = data.errors[0].meta.blocking_banner.url;
      const m = redirectUrl.match(/\/(?:live|watch)\/(\d+)/);

      if (m) {
        result = await fetchVidio(m[1]);
        data = JSON.parse(result.body);
      }
    }

    // ===== Output =====
    if (result.status === 200 && data?.data && type) {
      const attr = data.data.attributes;

      if (attr) {
        switch (type) {
          case "hls":
            return Response.redirect(
              attr.m3u8 || attr.hls,
              302
            );

          case "mpd":
          case "dash":
            return Response.redirect(attr.dash, 302);

          case "drm":
            const license = attr.license_servers?.drm_license_url;
            const widevine = attr.custom_data?.widevine;

            if (license && widevine) {
              const u =
                `${license}?pallycon-customdata-v2=${encodeURIComponent(widevine)}`;
              return Response.redirect(u, 307);
            }
        }
      }
    }

    return new Response(result.body, {
      status: result.status,
      headers: { "content-type": "application/json" }
    });
  }
};
