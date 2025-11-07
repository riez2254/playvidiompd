// Vidio Proxy untuk Deno Deploy
Deno.serve(async (req) => {
  const url = new URL(req.url);
  const pathname = url.pathname;
  const id = url.searchParams.get("id");

  // Validasi path dan parameter
  if (pathname !== "/play.mpd") {
    return new Response("Gunakan path /play.mpd?id=xxxx", { status: 404 });
  }
  if (!id) {
    return new Response("Parameter ?id= tidak ditemukan", { status: 400 });
  }

  const apiUrl = `https://api.vidio.com/livestreamings/${id}/stream?initialize=true`;

  const headers = {
    "Host": "api.vidio.com",
    "sec-ch-ua": '"Chromium";v="137", "Not/A)Brand";v="24"',
    "x-api-platform": "tv-react",
    "x-signature": "7c58427cde26bac4f7f3977e0c15ce9a8e92bb700b99c8ab5e0436c5eebcc6a4",
    "x-user-email": "diqhmazt@gmail.com",
    "accept-language": "id",
    "x-secure-level": "2",
    "x-device-brand": "Browser",
    "x-client": "1762490769",
    "sec-ch-ua-platform": '"Linux"',
    "sec-ch-ua-mobile": "?0",
    "user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
    "content-type": "application/vnd.api+json",
    "accept": "application/json, text/plain, */*",
    "x-user-token": "t94iUdG5dDGakzUz34sT",
    "x-device-model": "Linux armv81",
    "x-api-key": "CH1ZFsN4N/MIfAds1DL9mP151CNqIpWHqZGRr+LkvUyiq3FRPuP1Kt6aK+pG3nEC1FXt0ZAAJ5FKP8QU8CZ5/mcmFyr2EQmuvjRErCm+Z5svh7GZ9ZIVYABePYwytf2CCftOmXJoQ2SGb5INxqaLTXkjDsvKSIDtq6KpJZD9DGQ=",
    "origin": "https://tv.vidio.com",
    "referer": "https://tv.vidio.com/"
  };

  try {
    const response = await fetch(apiUrl, { headers });
    const data = await response.json();

    let mpd = data?.data?.attributes?.dash;
    if (!mpd) {
      return new Response("Gagal ambil URL MPD", { status: 500 });
    }

    // Bersihkan prefix
    mpd = mpd
      .replaceAll("geo-id-tl-gg-", "")
      .replaceAll("geo-id-tl-ph-", "")
      .replaceAll("geo-id-gg-", "")
      .replaceAll("geo-id-tl-", "")
      .replaceAll("geo-id-", "");

    // Redirect ke URL MPD asli
    return Response.redirect(mpd, 302);
  } catch (e) {
    return new Response("Error: " + e.message, { status: 500 });
  }
});
  
