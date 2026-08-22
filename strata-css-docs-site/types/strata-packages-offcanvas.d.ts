declare module "@strata-packages/offcanvas" {
  const offcanvas: {
    open: (selector: string) => void;
    close: () => void;
  };
  export default offcanvas;
}
