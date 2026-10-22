/* Marks the page when a sign-in is stored on this device, before anything is
   painted, so the signed-out front page is not flashed at a member while the
   app works out who is here. See the note in app/layout.tsx. Lifted by
   page.tsx, and by itself after five seconds. */
try {
  for (var i = 0; i < localStorage.length; i += 1) {
    var k = localStorage.key(i);
    if (k && /^sb-.*-auth-token$/.test(k) && localStorage.getItem(k)) {
      document.documentElement.setAttribute('data-signedin', '1');
      setTimeout(function () { document.documentElement.removeAttribute('data-signedin'); }, 5000);
      break;
    }
  }
} catch (e) { /* storage off: the front page shows as it always did */ }
