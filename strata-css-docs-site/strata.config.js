const utilities = require('./content/utilities.json');
const components = require('./content/components.json');

function flattenClasses(entries) {
  return entries.flatMap((entry) => entry.groups.flatMap((group) => group.classes));
}

module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  input: './strata.css',
  output: './styles/strata.output.css',
  // Utility/component classes are toggled dynamically inside Playground.tsx from
  // JSON data, so the scanner can't see them as literals — safelist covers those.
  // 'alert-*' covers Callout.tsx, whose variant classes are picked from an object
  // lookup rather than written literally in a class/className attribute.
  // The bg-[#...] list covers Swatch (theme-system guide) — its className is
  // built as `bg-[${hex}]` from a hex prop, so the literal never appears in
  // source; every hex value the guide's token tables actually pass in is listed
  // here instead.
  // The lists below cover the dedicated utilities pages (spacing, display,
  // flexbox, grid, sizing, typography, colors, borders, position, misc) —
  // every class there is passed via Playground's `classes` prop (not
  // class/className), which the scanner's CLASS_ATTR_PATTERN doesn't match, so
  // none of them are picked up as literals despite being real JSX string
  // literals in the file.
  safelist: [
    ...flattenClasses(utilities),
    ...flattenClasses(components),
    'alert-info alert-warning alert-danger',
    'bg-[#0b5ed7] bg-[#0d6efd] bg-[#0dcaf0] bg-[#157347] bg-[#198754] bg-[#212529] bg-[#2b3035] bg-[#2d3748] bg-[#31d2f2] bg-[#374151] bg-[#495057] bg-[#4a5568] bg-[#4b5563] bg-[#5c636a] bg-[#67e8f9] bg-[#6c757d] bg-[#6ea8fe] bg-[#6edff6] bg-[#75b798] bg-[#80ecfa] bg-[#86efac] bg-[#88e5f7] bg-[#8bb9fe] bg-[#8c959e] bg-[#8ecbaf] bg-[#90cdf4] bg-[#9af2bc] bg-[#9ca3af] bg-[#a0a7ae] bg-[#a8d8f6] bg-[#adb5bd] bg-[#b0b7be] bg-[#b4bac0] bg-[#bb2d3b] bg-[#d1d5db] bg-[#dc3545] bg-[#dee2e6] bg-[#e2e8f0] bg-[#ea868f] bg-[#f1a1a8] bg-[#f8f9fa] bg-[#f8fafc] bg-[#fca5a5] bg-[#fcd34d] bg-[#fdb7b7] bg-[#fdda65] bg-[#ffc107] bg-[#ffca2c] bg-[#ffda6a] bg-[#ffe083] bg-[#ffffff]',
    'm-0 m-1 m-2 m-3 m-4 m-5 m-6 m-7 m-auto m-[-1rem] m-[1rem_2rem] m-[4rem] m-[5rem]',
    'p-0 p-1 p-2 p-3 p-4 p-5 p-auto p-[10px_20px]',
    'mt-3 mb-3 ms-3 me-3 mx-3 my-3 pt-3 pb-3 ps-3 pe-3 px-3 py-3',
    'mt-auto mb-auto ms-auto me-auto mx-auto my-auto',
    'ml-3 mr-3 pl-3 pr-3 ml-auto mr-auto',
    'm-sm-0 mt-md-3 px-lg-4 py-xl-5 ms-md-auto',
    '!m-3 !mt-0 !px-2 !py-4 !ms-auto',
    'mt-[12px] ms-[2vw] px-[2rem] mt-[-8px]',
    'px-md-[2rem] !p-[10px_20px]',
    'gap-0 gap-1 gap-2 gap-3 gap-4 gap-5 gap-6 gap-auto',
    'row-gap-3 col-gap-3 gap-md-3 row-gap-lg-3 col-gap-sm-2',
    'gap-[1rem_2rem] row-gap-[1rem] col-gap-[1rem] gap-md-[1rem_2rem] !gap-[1rem]',
    'd-none d-inline d-inline-block d-block d-grid d-inline-grid d-flex d-inline-flex d-table',
    'd-sm-none d-md-block d-lg-flex d-xl-inline-grid',
    'd-table-row d-table-cell',
    'flex-row flex-column flex-row-reverse flex-column-reverse flex-wrap flex-nowrap',
    'flex-sm-column flex-md-row flex-lg-wrap flex-wrap-reverse',
    'flex-fill flex-grow-0 flex-grow-1 flex-shrink-0 flex-shrink-1',
    'justify-content-start justify-content-end justify-content-center justify-content-between justify-content-around justify-content-evenly',
    'justify-content-sm-start justify-content-lg-between',
    'align-items-start align-items-end align-items-center align-items-baseline align-items-stretch',
    'align-content-start align-content-center align-content-end align-content-between align-content-around align-content-stretch',
    'align-self-auto align-self-start align-self-end align-self-center align-self-baseline align-self-stretch',
    'order-first order-0 order-1 order-2 order-3 order-4 order-5 order-last',
    'order-sm-first order-md-3 order-lg-last',
    'col-1 col-2 col-3 col-4 col-6 col-12 col-auto col',
    'offset-0 offset-2 offset-4 offset-6',
    'g-0 g-3 gx-3 gy-3',
    'text-start text-center text-end text-justify',
    'text-uppercase text-lowercase text-capitalize text-none',
    'fw-light fw-lighter fw-normal fw-medium fw-semibold fw-bold fw-bolder',
    'fst-italic fst-normal text-decoration-none text-decoration-underline text-decoration-line-through',
    'lh-1 lh-sm lh-base lh-lg',
    'text-truncate text-wrap text-nowrap text-break',
    'link-primary link-secondary link-success link-danger link-warning link-info link-body-emphasis',
    'link-offset-1 link-offset-2 link-offset-3 link-underline link-underline-danger',
    'text-danger text-opacity-50',
    'text-primary text-secondary text-success text-warning text-info text-light text-dark text-white text-muted text-body',
    'bg-primary bg-secondary bg-success bg-danger bg-warning bg-info bg-light bg-dark bg-white bg-transparent bg-body',
    'bg-primary-subtle bg-success-subtle bg-danger-subtle bg-warning-subtle',
    'border-primary-subtle border-success-subtle border-danger-subtle border-warning-subtle',
    'bg-body-secondary bg-body-tertiary bg-black bg-gradient',
    'text-body-secondary text-body-tertiary text-body-emphasis text-black text-white-50',
    'text-primary-emphasis text-success-emphasis text-danger-emphasis',
    'bg-opacity-25',
    'border border-0 border-top border-end border-bottom border-start',
    'border-x border-y border-x-0 border-y-0',
    'border-1 border-2 border-3 border-4 border-5',
    'border-primary border-secondary border-success border-danger border-black border-white border-muted',
    'rounded rounded-0 rounded-1 rounded-2 rounded-3 rounded-4 rounded-5 rounded-circle rounded-pill',
    'rounded-top rounded-end rounded-bottom rounded-start',
    'position-static position-relative position-absolute position-fixed position-sticky',
    'top-0 top-50 top-100 start-0 end-0',
    'fixed-top fixed-bottom sticky-top sticky-bottom',
    'translate-middle translate-middle-x translate-middle-y',
    'w-25 w-50 w-75 w-100 w-auto h-25 h-50 h-75 h-100 h-auto',
    'max-w-xs max-w-sm max-w-md max-w-lg max-w-xl max-w-full max-w-none',
    'min-w-0 min-w-full min-w-screen max-h-full max-h-screen max-h-none min-h-0 min-h-full min-h-screen',
    'mw-100 mh-100 vw-100 vh-100 min-vw-100 min-vh-100',
    'cursor-auto cursor-default cursor-pointer cursor-wait cursor-text cursor-move cursor-not-allowed cursor-grab',
    'z-0 z-1 z-2 z-3 z-auto z-n1',
    'pe-none pe-auto user-select-all user-select-auto user-select-none',
    'float-start float-end float-none clearfix hstack vstack',
  ],
};
