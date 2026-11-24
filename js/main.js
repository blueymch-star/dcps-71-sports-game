window.RelayGame = window.RelayGame || {};

(function (G) {
  "use strict";

  const canvas = document.getElementById("gameCanvas");
  const badgeCanvas = document.getElementById("badgeCanvas");
  const game = new G.GameController(canvas, badgeCanvas);
  G.game = game;

  // Input state
  const keys = {};
  const virtualBtns = { jump: false, shoot: false, dash: false, super: false };
  const tapBtns = { jump: false, shoot: false, dash: false, super: false };
  const prevBtns = { jump: false, shoot: false, dash: false, super: false };
  const joyState = { active: false, pointerId: null, x: 0, y: 0 };
  let prevNav = { left: false, right: false, up: false, down: false };

  function buildInputSnapshot() {
    const leftKey = keys["ArrowLeft"] || keys["KeyA"];
    const rightKey = keys["ArrowRight"] || keys["KeyD"];
    const upKey = keys["ArrowUp"] || keys["KeyW"];
    const downKey = keys["ArrowDown"] || keys["KeyS"];

    let moveX = 0;
    if (leftKey) moveX -= 1;
    if (rightKey) moveX += 1;
    if (Math.abs(joyState.x) > 0.15) moveX = joyState.x;

    const jumpHeld = !!(keys["Space"] || keys["KeyK"] || upKey || virtualBtns.jump);
    const shootHeld = !!(keys["KeyJ"] || keys["KeyZ"] || keys["Enter"] || virtualBtns.shoot);
    const dashHeld = !!(keys["ShiftLeft"] || keys["ShiftRight"] || keys["KeyL"] || keys["KeyX"] || virtualBtns.dash);
    const superHeld = !!(keys["KeyE"] || keys["KeyQ"] || keys["KeyC"] || virtualBtns.super);

    const navL = moveX < -0.45;
    const navR = moveX > 0.45;
    const navU = !!(upKey || joyState.y < -0.45);
    const navD = !!(downKey || joyState.y > 0.45);

    const snap = {
      moveX,
      downHeld: !!(downKey || joyState.y > 0.55),
      jumpHeld: jumpHeld || tapBtns.jump,
      shootHeld: shootHeld || tapBtns.shoot,
      jumpPressed: (jumpHeld && !prevBtns.jump) || tapBtns.jump,
      shootPressed: (shootHeld && !prevBtns.shoot) || tapBtns.shoot,
      dashPressed: (dashHeld && !prevBtns.dash) || tapBtns.dash,
      superPressed: (superHeld && !prevBtns.super) || tapBtns.super,
      navLeft: navL && !prevNav.left,
      navRight: navR && !prevNav.right,
      navUp: navU && !prevNav.up,
      navDown: navD && !prevNav.down
    };

    prevBtns.jump = jumpHeld;
    prevBtns.shoot = shootHeld;
    prevBtns.dash = dashHeld;
    prevBtns.super = superHeld;
    tapBtns.jump = false;
    tapBtns.shoot = false;
    tapBtns.dash = false;
    tapBtns.super = false;
    prevNav = { left: navL, right: navR, up: navU, down: navD };

    return snap;
  }

  // Keyboard listeners
  window.addEventListener("keydown", (e) => {
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) {
      e.preventDefault();
    }
    G.Audio.unlock();
    keys[e.code] = true;
    if (e.code === "Escape" || e.code === "KeyP") {
      toggleMenuModal();
    }
  });

  window.addEventListener("keyup", (e) => {
    keys[e.code] = false;
  });

  // Canvas pointer click
  canvas.addEventListener("pointerdown", (e) => {
    const rect = canvas.getBoundingClientRect();
    const cx = ((e.clientX - rect.left) / rect.width) * G.CONST.W;
    const cy = ((e.clientY - rect.top) / rect.height) * G.CONST.H;
    game.handleCanvasClick(cx, cy);
  });

  // Virtual Analog Floating Joystick (paper-bag-cleaner style)
  const joyWrapper = document.querySelector(".joystick-wrapper");
  const joyZone = document.getElementById("joystickZone");
  const joyKnob = document.getElementById("joystickKnob");
  let joyOrigin = { x: 0, y: 0, maxR: 46 };

  function updateJoystick(clientX, clientY) {
    let dx = clientX - joyOrigin.x;
    let dy = clientY - joyOrigin.y;
    const dist = Math.hypot(dx, dy);
    if (dist > joyOrigin.maxR) {
      dx = (dx / dist) * joyOrigin.maxR;
      dy = (dy / dist) * joyOrigin.maxR;
    }
    joyState.x = dx / joyOrigin.maxR;
    joyState.y = dy / joyOrigin.maxR;
    joyKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
  }

  function resetJoystick() {
    joyState.active = false;
    joyState.pointerId = null;
    joyState.x = 0;
    joyState.y = 0;
    joyZone.classList.remove("floating");
    joyZone.style.left = "";
    joyZone.style.top = "";
    joyZone.style.transform = "";
    joyKnob.style.transform = "translate(-50%, -50%)";
  }

  function startFloatingJoystick(e, allowRelocate) {
    e.preventDefault();
    G.Audio.unlock();
    if (joyState.active) return;
    const rect = joyZone.getBoundingClientRect();
    const homeX = rect.left + rect.width * 0.5;
    const homeY = rect.top + rect.height * 0.5;
    joyOrigin.maxR = Math.max(36, rect.width * 0.36);

    joyState.active = true;
    joyState.pointerId = e.pointerId;
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch (_) {}

    if (allowRelocate && Math.hypot(e.clientX - homeX, e.clientY - homeY) > 70) {
      joyOrigin.x = e.clientX;
      joyOrigin.y = e.clientY;
      joyZone.classList.add("floating");
      joyZone.style.left = `${e.clientX}px`;
      joyZone.style.top = `${e.clientY}px`;
      joyZone.style.transform = "translate(-50%, -50%)";
    } else {
      joyOrigin.x = homeX;
      joyOrigin.y = homeY;
    }
    updateJoystick(e.clientX, e.clientY);
  }

  joyZone.addEventListener("pointerdown", (e) => startFloatingJoystick(e, true));
  if (joyWrapper) {
    joyWrapper.addEventListener("pointerdown", (e) => {
      if (e.target === joyWrapper) startFloatingJoystick(e, true);
    });
    joyWrapper.addEventListener("pointermove", (e) => {
      if (joyState.active && e.pointerId === joyState.pointerId) updateJoystick(e.clientX, e.clientY);
    });
    joyWrapper.addEventListener("pointerup", (e) => {
      if (e.pointerId === joyState.pointerId) resetJoystick();
    });
    joyWrapper.addEventListener("pointercancel", resetJoystick);
  }

  joyZone.addEventListener("pointermove", (e) => {
    if (!joyState.active || e.pointerId !== joyState.pointerId) return;
    updateJoystick(e.clientX, e.clientY);
  });

  joyZone.addEventListener("pointerup", (e) => {
    if (e.pointerId === joyState.pointerId) resetJoystick();
  });
  joyZone.addEventListener("pointercancel", resetJoystick);

  // iOS Safari double-tap & pinch-zoom prevention + portrait orientation prompt
  (function () {
    let lastTap = 0;
    const preventZoom = (e) => {
      if (e.cancelable) e.preventDefault();
    };
    document.addEventListener("touchstart", (e) => { if (e.touches.length > 1) preventZoom(e); }, { passive: false });
    document.addEventListener("touchmove", (e) => { if (e.touches.length > 1 || (e.scale && e.scale !== 1)) preventZoom(e); }, { passive: false });
    document.addEventListener("touchend", (e) => {
      const now = Date.now();
      if (now - lastTap < 360 && !(e.target && e.target.closest && e.target.closest("button,.modal-box"))) preventZoom(e);
      lastTap = now;
    }, { passive: false });
    ["gesturestart", "gesturechange", "gestureend", "dblclick"].forEach((ev) => {
      document.addEventListener(ev, preventZoom, { passive: false });
    });

    const rotateHint = document.getElementById("rotateHint");
    const btnDismiss = document.getElementById("btnDismissRotate");
    let dismissed = false;
    const checkOrient = () => {
      if (!rotateHint || dismissed) return;
      const isNarrowPortrait = window.innerWidth < 680 && window.innerHeight > window.innerWidth;
      rotateHint.classList.toggle("hidden", !isNarrowPortrait);
    };
    if (btnDismiss && rotateHint) {
      btnDismiss.addEventListener("click", () => {
        dismissed = true;
        rotateHint.classList.add("hidden");
      });
    }
    window.addEventListener("resize", checkOrient);
    checkOrient();
  })();

  // Virtual Arcade Buttons
  document.querySelectorAll(".arc-btn").forEach((btn) => {
    const action = btn.dataset.action;
    btn.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      G.Audio.unlock();
      virtualBtns[action] = true;
      tapBtns[action] = true;
      btn.classList.add("pressed");
      btn.setPointerCapture(e.pointerId);
    });
    const release = () => {
      virtualBtns[action] = false;
      btn.classList.remove("pressed");
    };
    btn.addEventListener("pointerup", release);
    btn.addEventListener("pointercancel", release);
  });

  // System Menu Modal
  const menuModal = document.getElementById("menuModal");
  const btnMenu = document.getElementById("btnMenu");
  const btnResume = document.getElementById("btnResume");
  const btnToggleBgm = document.getElementById("btnToggleBgm");
  const btnToggleSfx = document.getElementById("btnToggleSfx");
  const btnGoStageSelect = document.getElementById("btnGoStageSelect");
  const btnGoTitle = document.getElementById("btnGoTitle");

  function toggleMenuModal(forceOpen) {
    const willOpen = typeof forceOpen === "boolean" ? forceOpen : menuModal.classList.contains("hidden");
    menuModal.classList.toggle("hidden", !willOpen);
    game.paused = willOpen;
  }

  btnMenu.addEventListener("click", () => {
    G.Audio.unlock();
    G.Audio.play("confirm");
    toggleMenuModal();
  });

  btnResume.addEventListener("click", () => {
    G.Audio.play("confirm");
    toggleMenuModal(false);
  });

  btnToggleBgm.addEventListener("click", () => {
    G.Audio.setBgmEnabled(!G.Audio.bgmEnabled);
    btnToggleBgm.textContent = `背景音樂：${G.Audio.bgmEnabled ? "開" : "關"}`;
  });

  btnToggleSfx.addEventListener("click", () => {
    G.Audio.setSfxEnabled(!G.Audio.sfxEnabled);
    btnToggleSfx.textContent = `遊戲音效：${G.Audio.sfxEnabled ? "開" : "關"}`;
  });

  btnGoStageSelect.addEventListener("click", () => {
    G.Audio.play("confirm");
    game.state = "STAGE_SELECT";
    G.Audio.setBgm("none");
    toggleMenuModal(false);
  });

  btnGoTitle.addEventListener("click", () => {
    G.Audio.play("confirm");
    game.state = "TITLE";
    G.Audio.setBgm("none");
    toggleMenuModal(false);
  });

  // Boot assets & start loop
  G.loadAssets(() => {
    if (G.Sheets) G.Sheets.buildAll();
    game.refreshBadge(game.currentStageIdx, true);
  });
  game.start();

  let lastTs = performance.now();
  function frame(ts) {
    const dt = Math.min(0.05, (ts - lastTs) / 1000);
    lastTs = ts;
    const input = buildInputSnapshot();
    game.update(dt, input);
    game.draw();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})(window.RelayGame);
