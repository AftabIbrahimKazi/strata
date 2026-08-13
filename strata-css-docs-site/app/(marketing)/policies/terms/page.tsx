import Link from "next/link";

export default function TermsPage() {
  return (
    <div className="container py-5 max-w-[720px]">
      <h1 className="mb-4">Terms of Use</h1>

      <p className="mb-3">
        Strata CSS&apos;s source code is open source and licensed under the MIT License — see
        the <Link href="/policies/license">License page</Link> for full terms. This
        documentation site is provided as-is, without warranty of any kind, for the purpose of
        helping you use Strata CSS.
      </p>

      <p className="mb-0">
        Code snippets shown on this site are free to copy and use in your own projects under the
        same MIT terms as the framework itself. The <code>strata-css</code> package name and its
        associated branding on this site are not covered by the MIT license and shouldn&apos;t be
        used to imply endorsement without permission.
      </p>
    </div>
  );
}
