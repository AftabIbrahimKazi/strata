import DocsNavLinks from "./DocsNavLinks";

export default function Sidebar() {
  return (
    <aside className="d-none d-lg-block w-[240px] flex-shrink-0 border-end p-3 overflow-y-auto position-sticky top-0 h-[100vh]">
      <DocsNavLinks />
    </aside>
  );
}
