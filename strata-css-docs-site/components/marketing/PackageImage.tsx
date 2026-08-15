import PackageIcon from "./PackageIcon";

// Stand-in "demo image" per package — there are no real screenshots in the
// repo to pull from, so this is a styled panel (brand gradient + icon)
// rather than fabricated photography.
export default function PackageImage({ slug }: { slug: string }) {
  return (
    <div className="packages-cube-face d-flex align-items-center justify-content-center">
      <div className="text-white">
        <PackageIcon slug={slug} size={72} />
      </div>
    </div>
  );
}
