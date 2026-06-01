import YahooFinance from 'yahoo-finance2';
const yahooFinance = new (YahooFinance as any)();
import fs from 'fs';
import path from 'path';
import { calculateEMA } from '../lib/strategy';
import { DateTime } from 'luxon';
import { sendTelegramMessage } from '../lib/telegram';

const WATCHLIST_PATH = path.join(process.cwd(), 'watchlist.json');

// Comprehensive BIST Symbols List (BIST 100 + many others)
const BIST_SYMBOLS = [
  'A1CAP.IS', 'ACSEL.IS', 'ADEL.IS', 'ADESE.IS', 'AEFES.IS', 'AFYON.IS', 'AGESA.IS', 'AGHOL.IS', 'AGROT.IS', 'AHGAZ.IS',
  'AKBNK.IS', 'AKCNS.IS', 'AKENR.IS', 'AKFGY.IS', 'AKFYE.IS', 'AKGRT.IS', 'AKMGY.IS', 'AKSA.IS', 'AKSEN.IS', 'ALARK.IS',
  'ALBRK.IS', 'ALCAR.IS', 'ALCTL.IS', 'ALFAS.IS', 'ALGYO.IS', 'ALKA.IS', 'ALKIM.IS', 'ANELE.IS', 'ANGEN.IS',
  'ANHYT.IS', 'ANSGR.IS', 'ARCLK.IS', 'ARDYZ.IS', 'ARENA.IS', 'ARSAN.IS', 'ASGYO.IS', 'ASELS.IS', 'ASTOR.IS', 'ASUZU.IS',
  'ATAGY.IS', 'ATAKP.IS', 'ATATP.IS', 'ATEKS.IS', 'ATLAS.IS', 'ATSYH.IS', 'AVGYO.IS', 'AVHOL.IS', 'AVOD.IS', 'AVTUR.IS',
  'AYCES.IS', 'AYDEM.IS', 'AYEN.IS', 'AYGAZ.IS', 'AZTEK.IS', 'BAGFS.IS', 'BAKAB.IS', 'BALAT.IS', 'BANVT.IS', 'BARMA.IS',
  'BASGZ.IS', 'BAYRK.IS', 'BEGYO.IS', 'BERA.IS', 'BEYAZ.IS', 'BFREN.IS', 'BIGCH.IS', 'BIMAS.IS', 'BINHO.IS',
  'BIOEN.IS', 'BIZIM.IS', 'BJKAS.IS', 'BLCYT.IS', 'BMSCH.IS', 'BMSTL.IS', 'BNTAS.IS', 'BOBET.IS', 'BORLS.IS', 'BORSK.IS',
  'BOSSA.IS', 'BRISA.IS', 'BRKO.IS', 'BRKSN.IS', 'BRKVY.IS', 'BRLSM.IS', 'BRMEN.IS', 'BRSAN.IS', 'BRYAT.IS', 'BSOKE.IS',
  'BTCIM.IS', 'BUCIM.IS', 'BURCE.IS', 'BURVA.IS', 'BVSAN.IS', 'BYDNR.IS', 'CANTE.IS', 'CASA.IS', 'CATES.IS', 'CCOLA.IS',
  'CELHA.IS', 'CEMAS.IS', 'CEMTS.IS', 'CEOEM.IS', 'CIMSA.IS', 'CLEBI.IS', 'CMBTN.IS', 'CMENT.IS', 'CONSE.IS', 'COSMO.IS',
  'CRDFA.IS', 'CRFSA.IS', 'CUSAN.IS', 'CVKMD.IS', 'CWENE.IS', 'DAGI.IS', 'DAPGM.IS', 'DARDL.IS', 'DGATE.IS',
  'DGGYO.IS', 'DGNMO.IS', 'DIRIT.IS', 'DITAS.IS', 'DMSAS.IS', 'DNISI.IS', 'DOAS.IS', 'DOCO.IS', 'DOGUB.IS', 'DOHOL.IS',
  'DOKTA.IS', 'DURDO.IS', 'DYOBY.IS', 'DZGYO.IS', 'EDATA.IS', 'EDIP.IS', 'EGEEN.IS', 'EGGUB.IS', 'EGPRO.IS', 'EGSER.IS',
  'EKGYO.IS', 'EKIZ.IS', 'EKSUN.IS', 'ELITE.IS', 'EMKEL.IS', 'ENJSA.IS', 'ENKAI.IS', 'ENSRI.IS', 'ERBOS.IS', 'EREGL.IS',
  'ERSU.IS', 'ESCAR.IS', 'ESCOM.IS', 'ESEN.IS', 'ETILR.IS', 'EUPWR.IS', 'EUREN.IS', 'EYGYO.IS', 'FADE.IS', 'FENER.IS',
  'FLAP.IS', 'FMIZP.IS', 'FONET.IS', 'FORMT.IS', 'FORTE.IS', 'FRIGO.IS', 'FROTO.IS', 'FZLGY.IS', 'GARAN.IS', 'GARFA.IS',
  'GEDIK.IS', 'GEDZA.IS', 'GENIL.IS', 'GENTS.IS', 'GEREL.IS', 'GESAN.IS', 'GIPTA.IS', 'GLBMD.IS', 'GLCVY.IS', 'GLRYH.IS',
  'GLYHO.IS', 'GMTAS.IS', 'GOKNR.IS', 'GOLTS.IS', 'GOODY.IS', 'GOZDE.IS', 'GRNYO.IS', 'GRSEL.IS', 'GSDDE.IS', 'GSDHO.IS',
  'GSRAY.IS', 'GUBRF.IS', 'GWIND.IS', 'GZNMI.IS', 'HALKB.IS', 'HATEK.IS', 'HEDEF.IS', 'HEKTS.IS', 'HKTM.IS', 'HLGYO.IS',
  'HTTBT.IS', 'HUBVC.IS', 'HUNER.IS', 'HURGZ.IS', 'ICBCT.IS', 'IDGYO.IS', 'IEYHO.IS', 'IHEVA.IS', 'IHGZT.IS',
  'IHLAS.IS', 'IHLGM.IS', 'IHYAY.IS', 'IMASM.IS', 'INDES.IS', 'INFO.IS', 'INGRM.IS', 'INTEM.IS', 'INVEO.IS', 'INVES.IS',
  'ISATR.IS', 'ISBTR.IS', 'ISCTR.IS', 'ISDMR.IS', 'ISFIN.IS', 'ISGSY.IS', 'ISGYO.IS', 'ISKPL.IS', 'ISKUR.IS',
  'ISMEN.IS', 'ISSEN.IS', 'IZENR.IS', 'IZFAS.IS', 'IZINV.IS', 'IZMDC.IS', 'JANTS.IS', 'KAPLM.IS', 'KAREL.IS', 'KARSN.IS',
  'KARTN.IS', 'KATMR.IS', 'KAYSE.IS', 'KCAER.IS', 'KCHOL.IS', 'KFEIN.IS', 'KGYO.IS', 'KIMMR.IS',
  'KLGYO.IS', 'KLMSN.IS', 'KLNMA.IS', 'KLRHO.IS', 'KLSYN.IS', 'KNFRT.IS', 'KOCMT.IS',
  'KONTR.IS', 'KONYA.IS', 'KORDS.IS',
  'KRDMA.IS', 'KRDMB.IS', 'KRDMD.IS', 'KRGYO.IS',
  'KRONT.IS', 'KRPLS.IS', 'KRSTL.IS', 'KRTEK.IS', 'KRVGD.IS', 'KSTUR.IS', 'KTSKR.IS', 'KUTPO.IS', 'KUVVA.IS', 'KUYAS.IS',
  'KZBGY.IS', 'KZGYO.IS', 'LIDER.IS', 'LIDFA.IS', 'LINK.IS', 'LMKDC.IS', 'LOGO.IS', 'LRSHO.IS', 'LUKSK.IS',
  'MAALT.IS', 'MACKO.IS', 'MAGEN.IS', 'MAKIM.IS', 'MAKTK.IS', 'MANAS.IS', 'MARKA.IS', 'MARTI.IS', 'MAVI.IS', 'MEDTR.IS',
  'MEGAP.IS', 'MEPET.IS', 'MERCN.IS', 'MERKO.IS', 'METRO.IS', 'MHRGY.IS', 'MIATK.IS', 'MMCAS.IS',
  'MNDRS.IS', 'MNDTR.IS', 'MOBTL.IS', 'MPARK.IS', 'MRGYO.IS', 'MRSHL.IS', 'MSGYO.IS', 'MTRKS.IS', 'MTRYO.IS', 'MZHLD.IS',
  'NATEN.IS', 'NETAS.IS', 'NIBAS.IS', 'NTGAZ.IS', 'NTHOL.IS', 'NUGYO.IS', 'NUHCM.IS', 'OBASE.IS', 'OBAMS.IS', 'ODAS.IS',
  'ONCSM.IS', 'ORCAY.IS', 'ORGE.IS', 'ORMA.IS', 'OSMEN.IS', 'OSTIM.IS', 'OTKAR.IS', 'OYAKC.IS', 'OYAYO.IS', 'OYLUM.IS',
  'OYYAT.IS', 'OZGYO.IS', 'OZKGY.IS', 'OZRDN.IS', 'OZSUB.IS', 'PAGYO.IS', 'PAMEL.IS', 'PAPIL.IS', 'PARSN.IS', 'PASEU.IS',
  'PATEK.IS', 'PCILT.IS', 'PEKGY.IS', 'PENTA.IS', 'PETKM.IS', 'PETUN.IS', 'PGSUS.IS', 'PINSU.IS', 'PKART.IS',
  'PKENT.IS', 'PLTUR.IS', 'PNLSN.IS', 'PNSUT.IS', 'POLHO.IS', 'POLTK.IS', 'PRDGS.IS', 'PRKAB.IS', 'PRKME.IS', 'PRZMA.IS',
  'PSDTC.IS', 'PSGYO.IS', 'QUAGR.IS', 'RALYH.IS', 'RAYSG.IS', 'REEDR.IS', 'RNPOL.IS', 'RODRG.IS', 'ROYAL.IS', 'RTALB.IS',
  'RUBNS.IS', 'RYGYO.IS', 'RYSAS.IS', 'SAFKR.IS', 'SAHOL.IS', 'SAMAT.IS', 'SANEL.IS', 'SANFM.IS', 'SANKO.IS', 'SARKY.IS',
  'SASA.IS', 'SAYAS.IS', 'SDTTR.IS', 'SEKFK.IS', 'SEKUR.IS', 'SELEC.IS', 'SELVA.IS', 'SEYKM.IS', 'SILVR.IS',
  'SISE.IS', 'SKBNK.IS', 'SKTAS.IS', 'SKYMD.IS', 'SMART.IS', 'SMRTG.IS', 'SNGYO.IS', 'SNICA.IS', 'SOKM.IS',
  'SONME.IS', 'SRVGY.IS', 'SUMAS.IS', 'SUNTK.IS', 'SURGY.IS', 'SUWEN.IS', 'TABGD.IS', 'TATEN.IS',
  'TATGD.IS', 'TAVHL.IS', 'TCELL.IS', 'TDGYO.IS', 'TEKTU.IS', 'TERA.IS', 'TGSAS.IS', 'THYAO.IS',
  'TKFEN.IS', 'TKNSA.IS', 'TMSN.IS', 'TOASO.IS', 'TRCAS.IS', 'TRGYO.IS', 'TRILC.IS', 'TSKB.IS', 'TSPOR.IS',
  'TTKOM.IS', 'TTRAK.IS', 'TUCLK.IS', 'TUKAS.IS', 'TUPRS.IS', 'TUREX.IS', 'TURSG.IS', 'UFUK.IS', 'ULAS.IS', 'ULKER.IS',
  'ULUFA.IS', 'ULUSE.IS', 'VAKBN.IS', 'VAKFN.IS', 'VAKKO.IS', 'VANGD.IS', 'VERTU.IS', 'VERUS.IS',
  'VESBE.IS', 'VESTL.IS', 'VKFYO.IS', 'VKGYO.IS', 'VKING.IS', 'VRGYO.IS', 'YAPRK.IS', 'YATAS.IS', 'YAYLA.IS', 'YBTAS.IS',
  'YEOTK.IS', 'YESIL.IS', 'YGGYO.IS', 'YKBNK.IS', 'YKSLN.IS', 'YONGA.IS', 'YUNSA.IS', 'YYLGD.IS',
  'ZEDUR.IS', 'ZOREN.IS', 'ZRGYO.IS'
];

export async function runScreener(onProgress?: (current: number, total: number, symbol: string) => void) {
  console.log(`[${DateTime.now().toISO()}] Screener started...`);
  const watchlist = [];
  const total = BIST_SYMBOLS.length;
  let current = 0;

  for (const symbol of BIST_SYMBOLS) {
    current++;
    if (onProgress) onProgress(current, total, symbol);
    
    // Add a small delay (100ms) to be gentle on the API and prevent timeouts
    await new Promise(resolve => setTimeout(resolve, 100));

    try {
      // Fetch daily data for the last year to calculate EMA 200
      const endDate = new Date();
      const startDate = new Date();
      startDate.setFullYear(endDate.getFullYear() - 1);

      const queryOptions = { period1: startDate, period2: endDate, interval: '1d' as any };
      const result: any = await yahooFinance.historical(symbol, queryOptions);

      if (!result || result.length < 200) continue;

      const prices = result.map((d: any) => d.close);
      const lastPrice = prices[prices.length - 1];

      // 1. Liquidity Filter: Avg volume (10 days) > 100M TL
      const last10Days = result.slice(-10);
      const avgVolumeTL = last10Days.reduce((acc: number, curr: any) => acc + (curr.close * curr.volume), 0) / 10;

      if (avgVolumeTL < 100_000_000) continue;

      // 2. Trend Filter: Price > EMA 200
      const ema200 = calculateEMA(prices, 200);
      if (lastPrice <= ema200) continue;

      // 3. Short-term Pullback: Price < 0.95 * 10-day High
      const high10Days = Math.max(...last10Days.map((d: any) => d.high));
      if (lastPrice >= 0.95 * high10Days) continue;

      // Find Peak and Dip for Fibonacci (using last 30 days for context)
      const last30Days = result.slice(-30);
      const peak = Math.max(...last30Days.map((d: any) => d.high));
      const dip = Math.min(...last30Days.map((d: any) => d.low));

      watchlist.push({ symbol, peak, dip });
      console.log(`[Screener] Added ${symbol} to watchlist.`);
    } catch (error) {
      console.error(`[Screener] Error processing ${symbol}:`, error);
    }
  }

  const resultFile = {
    updatedAt: DateTime.now().setZone('Europe/Istanbul').toISO(),
    stocks: watchlist
  };

  fs.writeFileSync(WATCHLIST_PATH, JSON.stringify(resultFile, null, 2));
  console.log(`[${DateTime.now().toISO()}] Screener finished. Watchlist saved with ${watchlist.length} stocks.`);

  // Send Telegram Summary
  if (watchlist.length > 0) {
    let message = `🔭 *GÜN SONU TARAMASI TAMAMLANDI*\n`;
    message += `━━━━━━━━━━━━━━━\n`;
    message += `✅ *${watchlist.length}* hisse izleme listesine eklendi.\n\n`;
    
    watchlist.forEach((stock, index) => {
      const cleanSymbol = stock.symbol.replace('.IS', '');
      const tvLink = `https://www.tradingview.com/chart/?symbol=BIST:${cleanSymbol}`;
      message += `${index + 1}. [${cleanSymbol}](${tvLink})\n`;
    });

    message += `\n━━━━━━━━━━━━━━━\n`;
    message += `🤖 _Bot yarın sabah bu hisseleri takip etmeye başlayacak._`;
    
    await sendTelegramMessage(message);
  }

  return resultFile;
}
