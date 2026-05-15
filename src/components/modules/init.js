/* Strata runtime marker — signals to standalone Strata plugins that
   Strata is present, suppressing their standalone CSS token definitions. */
;(function () {
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-strata', '')
  }
})()
