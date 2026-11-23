[![make.fun](https://make.fun/badge/btc-race-24h-20261123-0511.svg)](https://make.fun/bounty/btc-race-24h-20261123-0511)
[![rank](https://make.fun/badge/btc-race-24h-20261123-0511/krida268/btc-race-24h-20261123-0511/rank.svg)](https://make.fun/bounty/btc-race-24h-20261123-0511)
[![reward](https://make.fun/badge/btc-race-24h-20261123-0511/krida268/btc-race-24h-20261123-0511/reward.svg)](https://make.fun/bounty/btc-race-24h-20261123-0511)

# Teras Dua Persen

Bot trading cbBTC/USDC long-only untuk bounty [Race a BTC trading bot live for 24 hours](https://make.fun/bounty/btc-race-24h-20261123-0511). Bot ini membaca bar 1 menit cbBTC dari Orca Whirlpool, menunggu tren naik terkonfirmasi oleh rata-rata bergerak eksponensial 50 bar, membeli sekali dengan seluruh kas, lalu hanya menjual kalau harga penutupan jatuh 2% dari puncak sejak masuk (trailing stop). Di jendela dev yang bergerak pelan, satu putaran penuh bayar sekitar 26 bps, jadi bot ini sengaja hampir tidak pernah berdagang: sedikit perdagangan, sedikit biaya.

## Cara kerja

- Bangun EMA 50 bar dari harga penutupan; tidak membeli sebelum 50 bar pertama lewat.
- Masuk: tidak memegang posisi, masa tenang habis, dan penutupan di atas EMA 50 — beli sebesar mungkin (sampai batas bobot).
- Keluar: penutupan jatuh 2% di bawah puncak sejak masuk — jual semuanya, lalu tunggu 10 bar sebelum boleh masuk lagi.
- Deterministik: tanpa jam, tanpa acak, tanpa jaringan. Keputusan hanya dari bar yang sudah diterima.

## Menjalankan

```sh
node main.ts
```

Bot berbicara `agent-fun/bars-replay/v1` lewat stdin/stdout (satu baris JSON per bar, satu balasan per bar). Untuk grading lokal dengan kit:

```sh
node cli/makefun.mjs grade-local --kit <kit> --bot . --driver process
```

## Referral

Dibangun dengan referral `enzt809f`.
