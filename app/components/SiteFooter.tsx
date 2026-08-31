/**
 * The footer, and the VibefyCode badge.
 *
 * The badge is a link to its own verification page and has to stay one: the
 * licence does not permit the mark to appear without it, because a claim
 * nobody can check is not evidence of anything. The image is served from
 * VibefyCode on every load rather than copied here, which is what lets a
 * suspension or a revocation take effect within minutes — so there is
 * deliberately no file to download and none in this repository.
 *
 * The assessment behind it is point-in-time and scope-limited. That sentence
 * is carried in the image's alt text, where a screen reader will read it and
 * where it travels with the mark if the image is ever quoted elsewhere.
 *
 * The two policy links live here rather than in each page's own footer, which
 * is what makes them reachable from the policy pages themselves and from
 * anywhere somebody lands without signing in. An outside assessment found no
 * way to reach a policy from the front door; this is that way, and there is
 * one of it. Plain <a> and plain English: this is a server component, so it
 * cannot read the language context, and a link a reader cannot find because
 * the translation failed is worse than an English word they can.
 */
export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-24 border-t border-zinc-800/80">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-6 py-10 text-sm text-zinc-400 sm:flex-row sm:justify-between">
        <div className="flex flex-col items-center gap-2 sm:items-start">
          <p>© {year} FutureBox. All rights reserved.</p>
          <nav className="flex gap-5">
            <a href="/privacy" className="underline underline-offset-4 hover:text-zinc-200">
              Privacy
            </a>
            <a href="/terms" className="underline underline-offset-4 hover:text-zinc-200">
              Terms
            </a>
          </nav>
        </div>

        <a
          href="https://vibefy-web-lyart.vercel.app/a/futurebox-app-afed88"
          rel="noopener"
          target="_blank"
          style={{ display: 'inline-block', padding: 32 }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://vibefy-web-lyart.vercel.app/badge/lNwQYUNS5Nrxq-ENYlfa7w.svg?size=128"
            width={128}
            height={128}
            alt="Verified by VibefyCode — futurebox-app, Rubric v1.0.0, assessed 2026-08-31. Scope-limited assessment, not a security guarantee."
            loading="lazy"
            decoding="async"
          />
        </a>
      </div>
    </footer>
  );
}
