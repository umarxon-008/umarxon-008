/**
 * Manba index.html fayl sifatida (file://) ochilganda ogohlantirish.
 * Manba versiya JS modullaridan foydalanadi va brauzer ularni file:// da bloklaydi.
 * Yig'ilgan versiyada (dist/) bu holat yo'q: u yerda window.MEDAI_TERMS oldindan yuklanadi.
 */
(function () {
  if (location.protocol !== 'file:' || window.MEDAI_TERMS) return;
  document.addEventListener('DOMContentLoaded', function () {
    var box = document.createElement('div');
    box.setAttribute('role', 'alert');
    box.className = 'boot-warning';
    box.innerHTML = '<strong>Bu MEDAI ning manba kodi.</strong> Uni fayl sifatida ochganda brauzer skriptlarni bloklaydi. '
      + 'Demo uchun <b>dist/index.html</b> faylini oching (avval <code>npm run build</code>) yoki '
      + 'serverni ishga tushiring: <code>npm install</code> va <code>npm start</code>, soʻng <b>http://localhost:3000</b>.';
    document.body.prepend(box);
  });
})();
