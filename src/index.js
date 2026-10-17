
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Contoh: /205.mpd atau /205.hls
    const match = url.pathname.match(/^\/(\d+)\.(mpd|dash|hls|m3u8)$/i);

    if (!match) {
      return Response.json({
        error: "Format URL tidak valid",
        examples: [
          "/205.mpd",
          "/205.hls",
          "/205.dash"
        ]
      }, { status: 400 });
    }

    const id = match[1];
    const type = match[2].toLowerCase();

    // API_BASE harus berupa API milikmu atau API
    // yang memang kamu punya izin untuk gunakan.
    if (!env.API_BASE) {
      return Response.json({
        error: "API_BASE belum dikonfigurasi"
      }, { status: 500 });
    }

    const apiUrl = new URL(
      `${env.API_BASE.replace(/\/+$/, "")}/${id}`
    );

    apiUrl.searchParams.set("type", type);

    try {
      const headers = {
        "Accept": "application/json"
      };

      // Opsional: token API milikmu sendiri.
      if (env.API_TOKEN) {
        headers.Authorization = `Bearer ${env.API_TOKEN}`;
      }

      const upstream = await fetch(apiUrl.toString(), {
        method: "GET",
        headers,
        redirect: "manual"
      });

      // Ikuti redirect hanya jika API memang
      // mengembalikan redirect yang diizinkan.
      if (
        upstream.status >= 300 &&
        upstream.status < 400
      ) {
        const location = upstream.headers.get("Location");

        if (!location) {
          return Response.json({
            error: "URL redirect tidak tersedia"
          }, { status: 502 });
        }

        const target = new URL(location, apiUrl);

        // Batasi redirect ke HTTPS.
        if (target.protocol !== "https:") {
          return Response.json({
            error: "Skema redirect tidak diizinkan"
          }, { status: 502 });
        }

        return Response.redirect(target.toString(), 302);
      }

      if (!upstream.ok) {
        return Response.json({
          error: "API upstream gagal",
          upstreamStatus: upstream.status
        }, { status: 502 });
      }

      const data = await upstream.json();
      const attributes = data?.data?.attributes ?? data?.data ?? data;

      let streamUrl;

      if (type === "hls" || type === "m3u8") {
        streamUrl = attributes.m3u8 ?? attributes.hls;
      } else {
        streamUrl = attributes.mpd ?? attributes.dash;
      }

      if (!streamUrl) {
        return Response.json({
          error: "URL stream tidak ditemukan"
        }, { status: 404 });
      }

      const target = new URL(streamUrl);

      if (target.protocol !== "https:") {
        return Response.json({
          error: "URL stream tidak valid"
        }, { status: 502 });
      }

      return Response.redirect(target.toString(), 302);

    } catch {
      return Response.json({
        error: "Gagal menghubungi API upstream"
      }, { status: 502 });
    }
  }
};
