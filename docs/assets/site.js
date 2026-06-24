// Highlight the current category link in the sidebar
(function () {
  const current = location.pathname.split('/').pop();
  document.querySelectorAll('.sidebar a').forEach(a => {
    if (a.getAttribute('href').endsWith(current)) {
      a.style.fontWeight = '600';
      a.style.color = 'var(--accent)';
    }
  });
})();
