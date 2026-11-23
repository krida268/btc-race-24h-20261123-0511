// Teras Dua Persen — bot cbBTC/USDC long-only untuk agent-fun/bars-replay/v1.
//
// Gagasan: di jendela 1 menit, harga cbBTC bergerak pelan (simpangan baku
// kira-kira 8 bps per bar) sementara satu putaran penuh bayar sekitar 26 bps
// (fee 4 bps + slippage 2 bps + dampak harga). Jadi bot ini hampir tidak
// pernah berdagang: ia menunggu tren naik terkonfirmasi, membeli sekali
// dengan seluruh kas, lalu duduk diam dan hanya keluar kalau harga jatuh
// 2% dari puncak sejak masuk. Keluar itu satu-satunya alasan menjual.
//
// Aturan, bar demi bar:
//   - Bangun rata-rata bergerak eksponensial 50 bar dari harga penutupan.
//     Sampai 50 bar pertama lewat, bot tidak membeli apa-apa.
//   - Kalau sedang tidak memegang apa-apa, masa tenang habis, dan harga
//     penutupan berada di atas rata-rata itu, beli sebesar mungkin.
//   - Kalau sedang memegang, catat harga penutupan tertinggi sejak masuk.
//     Begitu penutupan jatuh 2% di bawah puncak itu, jual semuanya, lalu
//     tunggu 10 bar sebelum boleh masuk lagi.
//   - Tidak ada jam, tidak ada acak, tidak ada jaringan: keputusan hanya
//     dari bar yang sudah diterima, jadi dua kali jalan memberi log aksi
//     yang sama persis.

import { runBars } from './vendor/makefun-bars.ts';
import type { BarsState, Batch, OrderInput } from './vendor/makefun-bars.ts';

const SYMBOL = 'CBBTC';

// Berapa bar penutupan yang harus dilalui sebelum rata-rata dipercaya.
const WARM_BARS = 50;
// Panjang rata-rata bergerak eksponensial, dalam bar.
const TREND_BARS = 50;
// Jendela berisi 1.440 bar; jangan buka posisi baru di lima bar terakhir,
// karena order itu tidak sempat membayar biayanya sebelum posisi diratakan.
const TOTAL_BARS = 1440;
const FINAL_BARS = 5;
// Jual kalau penutupan turun sejauh ini dari puncak sejak masuk (bps).
const STOP_BPS = 200;
// Bar yang ditunggu setelah sekali keluar sebelum boleh masuk lagi.
const COOL_BARS = 10;
// Batas selip per order (bps dari penutupan terakhir).
const MAX_SLIPPAGE_BPS = 200;
// Pembagi tetap untuk rata-rata bergerak, supaya hitungannya bulat.
const EMA_SCALE = 1000n;
// k = 2 / (TREND_BARS + 1), dalam bilangan bulat berskala EMA_SCALE.
const TREND_K = (2n * EMA_SCALE) / BigInt(TREND_BARS + 1);

let trendScaled: bigint | null = null;
let barsSeen = 0;
let peakSinceEntry: bigint | null = null;
let coolLeft = 0;

function onBatch(state: BarsState, _batch: Batch): OrderInput[] {
  if (state.warmingUp) return [];
  const close = state.close(SYMBOL);
  if (close === null) return [];

  // Perbarui rata-rata tren dengan penutupan bar ini.
  if (trendScaled === null) {
    trendScaled = close * EMA_SCALE;
  } else {
    trendScaled += ((close * EMA_SCALE - trendScaled) * TREND_K) / EMA_SCALE;
  }
  barsSeen += 1;

  const held = state.positions.get(SYMBOL);
  const holding = held !== undefined && held.qty > 0n;

  if (holding) {
    if (peakSinceEntry === null || close > peakSinceEntry) {
      peakSinceEntry = close;
    }
    // Puncak dikali (10000 - STOP_BPS) / 10000: jual begitu penutupan
    // jatuh 2% di bawahnya.
    const floor = (peakSinceEntry * BigInt(10_000 - STOP_BPS)) / 10_000n;
    if (close < floor) {
      peakSinceEntry = null;
      coolLeft = COOL_BARS;
      return [
        {
          side: 'sell',
          symbol: SYMBOL,
          qty: held.qty,
          max_slippage_bps: MAX_SLIPPAGE_BPS,
        },
      ];
    }
    return [];
  }

  if (coolLeft > 0) {
    coolLeft -= 1;
    return [];
  }
  if (barsSeen < WARM_BARS || trendScaled === null) return [];
  if (close * EMA_SCALE <= trendScaled) return [];
  // Terlalu dekat ke akhir jendela untuk membuka posisi baru.
  if (state.seq - state.warmupBars >= TOTAL_BARS - FINAL_BARS) return [];

  const room = state.weightRoom(SYMBOL);
  const spend = state.cash < room ? state.cash : room;
  if (spend <= 0n) return [];
  peakSinceEntry = close;
  return [
    {
      side: 'buy',
      symbol: SYMBOL,
      notional_quote_units: spend,
      max_slippage_bps: MAX_SLIPPAGE_BPS,
    },
  ];
}

await runBars({ onBatch });
