window.RelayGame = window.RelayGame || {};

(function (G) {
  "use strict";

  const FRAME_NAMES = [
    ["run0", "run1", "run2", "run3"],
    ["jump", "shoot", "dash", "hurt"]
  ];

  function splitRuns(proj, len, gapMin, minSize) {
    const out = [];
    let s = -1;
    let gap = 0;
    for (let i = 0; i <= len; i++) {
      const on = i < len && proj[i] > 0;
      if (on) {
        if (s < 0) s = i;
        gap = 0;
      } else if (s >= 0) {
        gap++;
        if (gap > gapMin || i === len) {
          out.push([s, i - gap]);
          s = -1;
          gap = 0;
        }
      }
    }
    return out.filter((r) => r[1] - r[0] >= minSize);
  }

  function sliceSheet(img) {
    const W = img.naturalWidth || img.width;
    const H = img.naturalHeight || img.height;
    if (!W || !H) return null;

    const c = document.createElement("canvas");
    c.width = W;
    c.height = H;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(img, 0, 0);
    const data = ctx.getImageData(0, 0, W, H).data;

    const alpha = new Uint8Array(W * H);
    for (let i = 0; i < W * H; i++) {
      alpha[i] = data[i * 4 + 3] >= 120 ? 1 : 0;
    }

    // Row projection
    const rowProj = new Int32Array(H);
    for (let y = 0; y < H; y++) {
      let cnt = 0;
      for (let x = 0; x < W; x++) if (alpha[y * W + x]) cnt++;
      rowProj[y] = cnt > 3 ? cnt : 0;
    }
    const rows = splitRuns(rowProj, H, Math.max(4, Math.floor(H * 0.015)), Math.floor(H * 0.12));
    if (rows.length < 2) return null;

    const frames = {};
    const extraPoses = [];
    let totalCount = 0;

    rows.forEach(([y0, y1], ri) => {
      const colProj = new Int32Array(W);
      for (let y = y0; y <= y1; y++) {
        for (let x = 0; x < W; x++) {
          if (alpha[y * W + x]) colProj[x]++;
        }
      }
      const cols = splitRuns(colProj, W, Math.max(4, Math.floor(W * 0.012)), Math.floor(W * 0.04));
      if (cols.length < 2) return;

      // Compute shared foot baseline across the entire row
      const cells = cols.map(([x0, x1]) => {
        let top = y1;
        let bot = y0;
        let left = x1;
        let right = x0;
        for (let y = y0; y <= y1; y++) {
          for (let x = x0; x <= x1; x++) {
            if (alpha[y * W + x]) {
              if (y < top) top = y;
              if (y > bot) bot = y;
              if (x < left) left = x;
              if (x > right) right = x;
            }
          }
        }
        return { x0: left, x1: right, top, bot };
      });

      const sharedBot = Math.max(...cells.map((cell) => cell.bot));
      cells.forEach((cell, ci) => {
        const cw = cell.x1 - cell.x0 + 1;
        const ch = sharedBot - cell.top + 1;
        if (cw < 10 || ch < 16) return;
        const fc = document.createElement("canvas");
        fc.width = cw;
        fc.height = ch;
        const fctx = fc.getContext("2d");
        fctx.imageSmoothingEnabled = false;
        fctx.drawImage(c, cell.x0, cell.top, cw, ch, 0, 0, cw, ch);
        if (ri === 0 && ci < 4) {
          frames["run" + ci] = fc;
        } else {
          extraPoses.push(fc);
        }
        totalCount++;
      });
    });

    if (extraPoses[0]) frames.jump = extraPoses[0];
    if (extraPoses[1]) frames.shoot = extraPoses[1];
    if (extraPoses[2]) frames.dash = extraPoses[2];
    if (extraPoses[extraPoses.length - 1]) frames.hurt = extraPoses[extraPoses.length - 1];

    return totalCount >= 5 ? frames : null;
  }

  G.Sheets = {
    runners: {},
    buildAll() {
      this.runners = {};
      for (let i = 1; i <= 4; i++) {
        const key = "sheet_runner_" + i;
        const img = G.Assets.images[key];
        if (img && img.complete && img.naturalWidth > 0) {
          const sliced = sliceSheet(img);
          if (sliced) {
            this.runners[i - 1] = sliced;
          }
        }
      }
    },
    getFrame(runnerIndex, state, t) {
      const sheet = this.runners[runnerIndex];
      if (!sheet) return null;
      if (state === "run") {
        const idx = Math.floor(t * 10) % 4;
        return sheet["run" + idx] || sheet.run0;
      }
      if (state === "jump") return sheet.jump || sheet.run1 || sheet.run0;
      if (state === "dash") return sheet.dash || sheet.run2 || sheet.run0;
      if (state === "slip" || state === "knockback") return sheet.hurt || sheet.jump || sheet.run0;
      if (state === "shoot") return sheet.shoot || sheet.run0;
      return sheet.run0 || sheet.jump;
    }
  };
})(window.RelayGame);
