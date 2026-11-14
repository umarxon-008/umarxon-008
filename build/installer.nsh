; MARIUS NSIS qo'shimchasi (PHASE 10).
; O'chirishda foydalanuvchidan so'raladi: shaxsiy ma'lumotlar ham o'chirilsinmi?
; - Standart javob "Yo'q" (MB_DEFBUTTON2). Jim rejimda (/S) ham "Yo'q" (/SD IDNO): ma'lumot tasodifan o'chmaydi.
; - Yangilanish paytida (isUpdated) umuman so'ralmaydi va hech narsa o'chirilmaydi.
; - Faqat MARIUS'ning o'z papkasi o'chiriladi. Obsidian Vault, zaxira nusxalar va foydalanuvchi fayllariga tegilmaydi.
; Matn ASCII apostrof bilan yozilgan (NSIS kodlash muammolarining oldini olish uchun).

!macro customUnInstall
  ${ifNot} ${isUpdated}
    ; "Windows bilan birga ishga tushish" yozuvi o'chirilgan dasturga ishora qilib qolmasin
    ; (nomi src/main/index.ts dagi LOGIN_ITEM_NAME bilan bir xil)
    DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "MARIUS"
    DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Explorer\StartupApproved\Run" "MARIUS"
    MessageBox MB_YESNO|MB_ICONQUESTION|MB_DEFBUTTON2 "MARIUS ma'lumotlari ham o'chirilsinmi?$\r$\n$\r$\nSuhbatlar, xotira, eslatmalar, sozlamalar, shifrlangan API kalitlar va loglar.$\r$\nPapka: $APPDATA\${APP_FILENAME}$\r$\n$\r$\n'Yo'q' tanlansa, ular kompyuterda qoladi va MARIUS qayta o'rnatilganda tiklanadi.$\r$\nObsidian Vault va zaxira nusxalaringizga tegilmaydi." /SD IDNO IDNO marius_keep_user_data
      SetShellVarContext current
      RMDir /r "$APPDATA\${APP_FILENAME}"
      !ifdef APP_PRODUCT_FILENAME
        RMDir /r "$APPDATA\${APP_PRODUCT_FILENAME}"
      !endif
      !ifdef APP_PACKAGE_NAME
        RMDir /r "$APPDATA\${APP_PACKAGE_NAME}"
      !endif
    marius_keep_user_data:
  ${endIf}
!macroend
