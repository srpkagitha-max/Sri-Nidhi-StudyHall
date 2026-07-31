(function(){
  "use strict";
  let deferredPrompt = null;
  const DISMISS_KEY = "sriNidhiPwaInstallDismissedAt";
  const DISMISS_HOURS = 24;

  const $ = id => document.getElementById(id);
  const isStandalone = () => window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
  const recentlyDismissed = () => {
    const t = Number(localStorage.getItem(DISMISS_KEY) || 0);
    return t && (Date.now() - t) < DISMISS_HOURS * 60 * 60 * 1000;
  };

  function hideCard(remember){
    $("pwaInstallCard")?.classList.add("hidden");
    $("pwaInstallBackdrop")?.classList.add("hidden");
    if(remember) localStorage.setItem(DISMISS_KEY, String(Date.now()));
  }

  function showCard(mode){
    if(isStandalone() || recentlyDismissed()) return;
    const card=$("pwaInstallCard"), backdrop=$("pwaInstallBackdrop"), btn=$("pwaInstallBtn"), text=$("pwaInstallText");
    if(!card || !backdrop || !btn || !text) return;
    if(mode === "ios"){
      text.textContent = "iPhone lo Share button press chesi ‘Add to Home Screen’ select cheyandi.";
      btn.textContent = "Show Instructions";
    } else if(mode === "manual"){
      text.textContent = "Chrome menu (⋮) lo ‘Install app’ leda ‘Add to Home screen’ select cheyandi.";
      btn.textContent = "How to Install";
    } else {
      text.textContent = "Fast access kosam app ni mee phone Home Screen lo install cheyandi.";
      btn.textContent = "Install App";
    }
    card.dataset.mode=mode;
    card.classList.remove("hidden"); backdrop.classList.remove("hidden");
  }

  window.addEventListener("beforeinstallprompt", e => {
    e.preventDefault();
    deferredPrompt = e;
    setTimeout(() => showCard("native"), 500);
  });

  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    localStorage.removeItem(DISMISS_KEY);
    hideCard(false);
  });

  document.addEventListener("DOMContentLoaded", () => {
    $("pwaInstallClose")?.addEventListener("click", () => hideCard(true));
    $("pwaInstallLater")?.addEventListener("click", () => hideCard(true));
    $("pwaInstallBackdrop")?.addEventListener("click", () => hideCard(true));
    $("pwaInstallBtn")?.addEventListener("click", async () => {
      const mode=$("pwaInstallCard")?.dataset.mode;
      if(deferredPrompt){
        deferredPrompt.prompt();
        try{ await deferredPrompt.userChoice; }catch(_){}
        deferredPrompt=null; hideCard(false); return;
      }
      if(mode === "ios") alert("Safari lo Share icon (□↑) press cheyandi → Add to Home Screen → Add.");
      else alert("Chrome top-right menu (⋮) press cheyandi → Install app / Add to Home screen select cheyandi.");
    });

    if(isStandalone()) return;
    setTimeout(() => {
      if(deferredPrompt) showCard("native");
      else if(isIOS()) showCard("ios");
      else showCard("manual");
    }, 1800);
  });
})();
