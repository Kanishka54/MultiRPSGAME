(function () {
  function formatMatchTime(ms) {
    const total = Math.max(0, Math.ceil(ms / 1000));
    const minutes = Math.floor(total / 60);
    const seconds = total % 60;
    const pad = (value) => String(value).padStart(2, "0");
    return pad(minutes) + ":" + pad(seconds);
  }

  function attach(element) {
    let timer = null;

    function stop(hide) {
      if (timer) clearInterval(timer);
      timer = null;
      if (!element) return;
      if (hide) {
        element.classList.remove("is-visible", "is-urgent");
        element.textContent = "";
      }
    }

    return {
      start(endsAt, serverNow) {
        if (!element || typeof endsAt !== "number" || typeof serverNow !== "number") {
          return;
        }
        stop(false);
        const clockOffset = serverNow - Date.now();
        element.classList.add("is-visible");

        const tick = () => {
          const remaining = endsAt - (Date.now() + clockOffset);
          element.textContent = formatMatchTime(remaining);
          element.classList.toggle("is-urgent", remaining > 0 && remaining <= 10000);
          if (remaining <= 0) {
            element.textContent = "00:00";
            element.classList.add("is-visible", "is-urgent");
            if (timer) clearInterval(timer);
            timer = null;
          }
        };

        tick();
        timer = setInterval(tick, 250);
      },
      holdZero() {
        if (!element) return;
        if (timer) clearInterval(timer);
        timer = null;
        element.textContent = "00:00";
        element.classList.add("is-visible", "is-urgent");
      },
      freeze() {
        if (timer) clearInterval(timer);
        timer = null;
      },
      stop() {
        stop(true);
      },
    };
  }

  window.MatchTimer = { formatMatchTime, attach };
})();
