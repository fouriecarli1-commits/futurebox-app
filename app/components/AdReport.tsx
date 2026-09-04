'use client';

/**
 * What the money did.
 *
 * ── The half a client re-buys ────────────────────────────────────────────
 *
 * "We wrote you some ads" is a one-off. "Here is what your R2 000 did last
 * month, and which of the three angles worked" is a monthly invoice. That
 * sentence is the whole reason this screen exists.
 *
 * ── Why it takes a file instead of calling an API ────────────────────────
 *
 * `docs/ADS_AS_A_SERVICE.md` puts the report at Stage 2 and assumed the
 * numbers would arrive over Meta's and Google's APIs. Those are read-only
 * scopes, which is the easier ask — and it is still App Review, a verified
 * business, and a company that exists to be verified. None of that is true
 * today and the report is worth having today.
 *
 * Every one of these platforms exports a CSV from its own reporting screen.
 * Somebody who can open their Ads Manager already has the numbers; what they
 * cannot do is put them beside the advert that produced them. That part needs
 * nobody's permission.
 *
 * The API version, when it comes, is another importer writing the same rows
 * into the same store behind this same screen.
 *
 * ── Why the campaign names matter here ───────────────────────────────────
 *
 * A row is matched to a run by its campaign name, slugged the same way the
 * UTM tag is. That is the point of having tagged the links: `Winter Sale`
 * typed into a run and `winter sale` typed into Ads Manager are the same push,
 * and without the slug they are two rows nobody joins up.
 *
 * Anything that matches nothing is still shown. A number somebody exported is
 * a number they want to see, and hiding it because this screen could not place
 * it would be the tool deciding what counts.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { BarChart3, Trash2, Upload } from 'lucide-react';
import { randDisplay } from '../lib/pricing';
import { loadRuns, slug, type Run } from '../lib/adrun';
import {
  loadReport, rates, read, saveReport, totals, type Report, type Result,
} from '../lib/adreport';
import { useLang } from '../lib/i18n';

/**
 * Cents as money, through the same renderer the price cards use.
 *
 * Divided rather than rounded to whole rands: a cost per click is R1,94 and
 * rounding it to R2 loses the only digits anybody is comparing. `randDisplay`
 * takes rands and renders the cents itself.
 */
function money(cents: number): string {
  return randDisplay(cents / 100);
}

function Row({ label, one }: { label: string; one: Result }): React.ReactElement {
  const { t } = useLang();
  const { ctr, cpcCents, cprCents } = rates(one);
  const dash = '—';
  return (
    <tr className="border-t border-zinc-800">
      <td className="py-2 pr-3 text-sm text-zinc-200">{label}</td>
      <td className="py-2 px-2 text-sm text-zinc-200 tabular-nums text-right">{money(one.spentCents)}</td>
      <td className="py-2 px-2 text-sm text-zinc-400 tabular-nums text-right">
        {one.impressions.toLocaleString()}
      </td>
      <td className="py-2 px-2 text-sm text-zinc-400 tabular-nums text-right">
        {one.clicks.toLocaleString()}
      </td>
      <td className="py-2 px-2 text-sm text-zinc-400 tabular-nums text-right">
        {ctr === null ? dash : `${(ctr * 100).toFixed(2)}%`}
      </td>
      <td className="py-2 px-2 text-sm text-zinc-400 tabular-nums text-right">
        {cpcCents === null ? dash : money(cpcCents)}
      </td>
      <td className="py-2 pl-2 text-sm text-zinc-200 tabular-nums text-right">
        {cprCents === null ? dash : money(cprCents)}
      </td>
      <td className="sr-only">{t('report.row', 'result')}</td>
    </tr>
  );
}

export default function AdReport(): React.ReactElement {
  const { t } = useLang();
  const [report, setReport] = useState<Report | null>(null);
  const [runs, setRuns] = useState<Run[]>([]);
  const [missed, setMissed] = useState<string[]>([]);
  const [problem, setProblem] = useState<string | null>(null);
  const picker = useRef<HTMLInputElement | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReport(loadReport());
    setRuns(loadRuns());
    setReady(true);
  }, []);
  // A state flag, not a ref — see the note in `AdRuns` for what a ref does
  // here and what it cost.
  useEffect(() => {
    if (ready) saveReport(report);
  }, [ready, report]);

  const take = useCallback(
    (text: string) => {
      setProblem(null);
      const got = read(text);
      if (!got.rows.length) {
        setProblem(
          t(
            'report.noSpend',
            'No spend column was found in that file. Export again with the amount spent included — a report without the money in it is not the thing anybody is buying.',
          ),
        );
        setMissed(got.missed as string[]);
        return;
      }
      setMissed([]);
      setReport({ rows: got.rows, at: new Date().toISOString() });
    },
    [t],
  );

  const sum = report ? totals(report.rows) : null;

  /* Which run each row belongs to, matched on the slug the UTM tags use.
     `Winter Sale` in a run and `winter sale` in Ads Manager are one push. */
  const placed = new Map<string, Run>();
  if (report) {
    for (const row of report.rows) {
      const found = runs.find((one) => one.campaign && slug(one.campaign) === slug(row.campaign));
      if (found) placed.set(row.campaign, found);
    }
  }

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 space-y-3">
      <div className="flex items-start gap-2.5">
        <BarChart3 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
        <div className="min-w-0">
          <h3 className="text-base font-black text-white tracking-tight">
            {t('report.title', 'What the money did')}
          </h3>
          <p className="text-sm text-zinc-500 leading-relaxed">
            {t(
              'report.what',
              'Export the report from your Ads Manager and drop the file here. It reads the columns whatever they are called, works out cost per click and cost per result, and puts each campaign next to the run that sent it out.',
            )}
          </p>
        </div>
      </div>

      <p className="text-xs text-zinc-500 leading-relaxed">
        {t(
          'report.whyFile',
          'A file rather than a connection, because reading numbers straight out of Meta or Google needs their app review and a verified company. You can already export them today, and the numbers are worth having today.',
        )}
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={picker}
          id="report-file"
          type="file"
          accept=".csv,.tsv,.txt,text/csv,text/plain"
          className="sr-only"
          onChange={async (event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            take(await file.text());
            if (picker.current) picker.current.value = '';
          }}
        />
        <label
          htmlFor="report-file"
          className="inline-flex min-h-[44px] cursor-pointer items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-900 px-3.5 py-2 text-sm font-semibold text-zinc-300 hover:text-white hover:border-zinc-600"
        >
          <Upload className="w-4 h-4" />
          {t('report.pick', 'Take a report file')}
        </label>
        {report && (
          <button
            type="button"
            onClick={() => setReport(null)}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-sm font-semibold text-zinc-500 hover:text-white"
          >
            <Trash2 className="w-4 h-4" />
            {t('report.clear', 'Clear it')}
          </button>
        )}
      </div>

      <div className="space-y-1.5">
        <label htmlFor="report-paste" className="block text-sm text-zinc-400">
          {t('report.paste', 'Or paste it')}
        </label>
        <textarea
          id="report-paste"
          rows={2}
          onPaste={(event) => {
            const text = event.clipboardData.getData('text');
            if (text.trim()) {
              event.preventDefault();
              take(text);
            }
          }}
          placeholder={t('report.pasteHint', 'Paste the rows straight out of the spreadsheet.')}
          className="w-full resize-y rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-none"
        />
      </div>

      {report && sum && (
        <div className="space-y-3">
          {/* The sentence a client actually reads. */}
          <p className="text-sm text-zinc-200 leading-relaxed">
            <span className="font-semibold">{money(sum.spentCents)}</span>{' '}
            {t('report.bought', 'bought')} {sum.impressions.toLocaleString()}{' '}
            {t('report.impressions', 'impressions')}, {sum.clicks.toLocaleString()}{' '}
            {t('report.clicks', 'clicks')}
            {sum.results > 0 ? ` ${t('report.and', 'and')} ${sum.results.toLocaleString()} ${t('report.results', 'results')}` : ''}
            {rates(sum).cprCents !== null
              ? ` — ${money(rates(sum).cprCents as number)} ${t('report.each', 'each')}`
              : ''}
            .
          </p>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[36rem]">
              <thead>
                <tr className="text-left">
                  <th className="pb-1 pr-3 text-xs font-semibold text-zinc-500">
                    {t('report.campaign', 'Campaign')}
                  </th>
                  <th className="pb-1 px-2 text-xs font-semibold text-zinc-500 text-right">
                    {t('report.spent', 'Spent')}
                  </th>
                  <th className="pb-1 px-2 text-xs font-semibold text-zinc-500 text-right">
                    {t('report.seen', 'Seen')}
                  </th>
                  <th className="pb-1 px-2 text-xs font-semibold text-zinc-500 text-right">
                    {t('report.clicked', 'Clicked')}
                  </th>
                  <th className="pb-1 px-2 text-xs font-semibold text-zinc-500 text-right">
                    {t('report.ctr', 'Rate')}
                  </th>
                  <th className="pb-1 px-2 text-xs font-semibold text-zinc-500 text-right">
                    {t('report.cpc', 'Per click')}
                  </th>
                  <th className="pb-1 pl-2 text-xs font-semibold text-zinc-500 text-right">
                    {t('report.cpr', 'Per result')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {report.rows.map((one, index) => (
                  <Row
                    key={`${one.campaign}-${index}`}
                    label={one.campaign || t('report.unnamed', 'Unnamed')}
                    one={one}
                  />
                ))}
                <tr className="border-t-2 border-zinc-700 font-semibold">
                  <td className="py-2 pr-3 text-sm text-zinc-300">{t('report.total', 'All of it')}</td>
                  <td className="py-2 px-2 text-sm text-zinc-100 tabular-nums text-right">{money(sum.spentCents)}</td>
                  <td className="py-2 px-2 text-sm text-zinc-300 tabular-nums text-right">{sum.impressions.toLocaleString()}</td>
                  <td className="py-2 px-2 text-sm text-zinc-300 tabular-nums text-right">{sum.clicks.toLocaleString()}</td>
                  <td className="py-2 px-2" />
                  <td className="py-2 px-2 text-sm text-zinc-300 tabular-nums text-right">
                    {rates(sum).cpcCents === null ? '—' : money(rates(sum).cpcCents as number)}
                  </td>
                  <td className="py-2 pl-2 text-sm text-zinc-100 tabular-nums text-right">
                    {rates(sum).cprCents === null ? '—' : money(rates(sum).cprCents as number)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Which of these was one of ours. The slug is what joins them, and
              it is the reason the links were tagged in the first place. */}
          {placed.size > 0 && (
            <p className="text-xs text-zinc-500 leading-relaxed">
              {placed.size} {t('report.matched', 'of these match a run you planned here.')}
            </p>
          )}

          {missed.length > 0 && (
            <p className="text-xs text-zinc-600 leading-relaxed">
              {t('report.ignored', 'Columns it did not need:')} {missed.slice(0, 8).join(', ')}
            </p>
          )}

          <p className="text-xs text-zinc-600">
            {t('report.imported', 'Imported')} {new Date(report.at).toLocaleString()}.{' '}
            {t('report.onDevice', 'Kept on this device.')}
          </p>
        </div>
      )}

      {problem && <p className="text-sm text-amber-400 leading-snug">{problem}</p>}
    </section>
  );
}
