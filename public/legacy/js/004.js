/* V2 PASS 51 hidden-tab quiet mode */(function () {
  /* All V2 maintenance loops use setInterval. When the tab is hidden the browser
     already throttles them; this hard gate skips the work entirely and resumes
     with one immediate pass on return, so nothing is stale when the user comes back. */
  var origSI = window.setInterval, wrapped = [];
  window.setInterval = function (fn, ms) {
    if (typeof fn !== 'function' || !ms || ms < 500) return origSI.apply(window, arguments);
    var f = function () { if (document.hidden) return; try { fn(); } catch (e) {} };
    wrapped.push(fn);
    return origSI.call(window, f, ms);
  };
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) wrapped.forEach(function (fn) { try { fn(); } catch (e) {} });
  });
})();