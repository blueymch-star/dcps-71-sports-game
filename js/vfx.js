window.RelayGame = window.RelayGame || {};

(function (G) {
  "use strict";

  // Low-resolution (400x225) offscreen canvas naturally pixelates 3D/HD-2D VFX overlays,
  // inspired by paper-bag-cleaner's vfx.mjs architecture.
  const LW = 400;
  const LH = 225;
  const SCALE_X = LW / G.CONST.W;
  const SCALE_Y = LH / G.CONST.H;

  const offCanvas = document.createElement("canvas");
  offCanvas.width = LW;
  offCanvas.height = LH;
  const octx = offCanvas.getContext("2d");
  octx.imageSmoothingEnabled = false;

  const BACK_TYPES = new Set(["healBloom", "whirlwind", "shockwave", "p4RainbowPillar"]);
  const HIGHRES_TYPES = new Set(["p1SonicFan", "p3DodgeImpact", "p4RainbowPillar"]);
  const live = [];

  G.VFX = {
    spawn(type, x, y, opts) {
      const o = opts || {};
      live.push({
        type,
        x,
        y,
        age: 0,
        life: o.life || (type === "rainbowBeam" ? 1.2 : type === "explosion" ? 0.45 : type === "whirlwind" ? 0.9 : 0.55),
        color: o.color || "#fde047",
        dir: o.dir || 1,
        scale: o.scale || 1,
        back: typeof o.back === "boolean" ? o.back : BACK_TYPES.has(type)
      });
    },

    clear() {
      live.length = 0;
    },

    update(dt) {
      for (let i = live.length - 1; i >= 0; i--) {
        live[i].age += dt;
        if (live[i].age >= live[i].life) {
          live.splice(i, 1);
        }
      }
    },

    draw(ctx, camX, layer) {
      let any = false;
      for (let i = 0; i < live.length; i++) {
        const it = live[i];
        if (HIGHRES_TYPES.has(it.type)) continue;
        const isBack = it.back;
        if ((layer === "back" && isBack) || (layer !== "back" && !isBack)) {
          any = true;
          break;
        }
      }
      if (!any) return;

      octx.clearRect(0, 0, LW, LH);

      for (let i = 0; i < live.length; i++) {
        const it = live[i];
        if (HIGHRES_TYPES.has(it.type)) continue;
        const isBack = it.back;
        if (layer === "back" && !isBack) continue;
        if (layer !== "back" && isBack) continue;

        const p = Math.min(1, it.age / it.life);
        const alpha = 1 - p * p;
        const sx = (it.x - camX) * SCALE_X;
        const sy = it.y * SCALE_Y;

        octx.save();
        octx.globalAlpha = alpha;

        if (it.type === "shockwave") {
          const r = (10 + p * 56) * it.scale;
          octx.strokeStyle = it.color;
          octx.lineWidth = Math.max(1, (1 - p) * 4);
          octx.beginPath();
          octx.ellipse(sx, sy, r, r * 0.34, 0, 0, Math.PI * 2);
          octx.stroke();
          octx.strokeStyle = "#ffffff";
          octx.lineWidth = 1;
          octx.beginPath();
          octx.ellipse(sx, sy, r * 0.72, r * 0.24, 0, 0, Math.PI * 2);
          octx.stroke();
        } else if (it.type === "explosion") {
          const r = (6 + p * 34) * it.scale;
          octx.fillStyle = p < 0.35 ? "#ffffff" : it.color;
          octx.beginPath();
          octx.arc(sx, sy, r * 0.75, 0, Math.PI * 2);
          octx.fill();
          for (let k = 0; k < 8; k++) {
            const ang = k * (Math.PI / 4) + p * 2;
            const px = sx + Math.cos(ang) * r * 1.1;
            const py = sy + Math.sin(ang) * r * 1.1;
            octx.fillStyle = k % 2 === 0 ? "#f97316" : "#fde047";
            octx.fillRect(px - 2, py - 2, 4, 4);
          }
        } else if (it.type === "sonicRing") {
          const r = (8 + p * 38) * it.scale;
          octx.strokeStyle = it.color;
          octx.lineWidth = 3;
          octx.beginPath();
          octx.arc(sx, sy, r, -0.75, 0.75);
          octx.stroke();
        } else if (it.type === "whirlwind") {
          for (let ring = 0; ring < 5; ring++) {
            const ry = sy - ring * 10 - p * 8;
            const rw = (8 + ring * 5 + Math.sin(p * 14 + ring) * 3) * it.scale;
            octx.strokeStyle = ring % 2 === 0 ? "#38bdf8" : "#a855f7";
            octx.lineWidth = 2;
            octx.beginPath();
            octx.ellipse(sx, ry, rw, 4, 0, 0, Math.PI * 2);
            octx.stroke();
          }
        } else if (it.type === "thunder") {
          octx.strokeStyle = "#fde047";
          octx.lineWidth = 3;
          octx.beginPath();
          let lx = sx;
          octx.moveTo(lx, 0);
          for (let y = 16; y <= sy; y += 18) {
            lx = sx + Math.sin(y * 0.4 + it.age * 40) * 9;
            octx.lineTo(lx, y);
          }
          octx.stroke();
        } else if (it.type === "healBloom") {
          const r = (12 + p * 22) * it.scale;
          octx.strokeStyle = "#38bdf8";
          octx.lineWidth = 2;
          octx.beginPath();
          octx.ellipse(sx, sy - p * 32, r, r * 0.3, 0, 0, Math.PI * 2);
          octx.stroke();
          for (let k = 0; k < 5; k++) {
            const rx = sx + Math.cos(k * 1.3 + p * 5) * r * 0.8;
            const ry = sy - p * 42 - (k % 3) * 8;
            octx.fillStyle = k % 2 === 0 ? "#fde047" : "#4ade80";
            octx.fillRect(rx - 1, ry - 2, 3, 5);
          }
        } else if (it.type === "rainbowBeam") {
          const colors = ["#ef4444", "#f97316", "#fde047", "#22c55e", "#38bdf8", "#a855f7"];
          const beamH = (1 - p * 0.4) * 5 * it.scale;
          colors.forEach((col, ci) => {
            octx.fillStyle = col;
            octx.fillRect(sx, sy - 16 + ci * beamH, LW - sx, beamH);
          });
        } else if (it.type === "hitSlash") {
          octx.strokeStyle = "#ffffff";
          octx.lineWidth = 3;
          octx.beginPath();
          octx.arc(sx, sy, 18 * it.scale, it.dir > 0 ? -1.1 : 2.0, it.dir > 0 ? 1.0 : 4.2);
          octx.stroke();
          octx.strokeStyle = it.color;
          octx.lineWidth = 2;
          octx.beginPath();
          octx.arc(sx + it.dir * 3, sy, 22 * it.scale, it.dir > 0 ? -0.9 : 2.2, it.dir > 0 ? 0.8 : 4.0);
          octx.stroke();
        }

        octx.restore();
      }

      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(offCanvas, 0, 0, G.CONST.W, G.CONST.H);
      ctx.restore();

      // High-res sprite-sheet VFX overlays
      for (let i = 0; i < live.length; i++) {
        const it = live[i];
        if (!HIGHRES_TYPES.has(it.type)) continue;
        const isBack = it.back;
        if (layer === "back" && !isBack) continue;
        if (layer !== "back" && isBack) continue;

        const p = Math.min(1, it.age / it.life);
        const sx = it.x - camX;
        const sy = it.y;
        const imgs = G.Assets && G.Assets.images;
        if (!imgs) continue;

        if (it.type === "p1SonicFan") {
          const sh = imgs.p1_vfx_sheet;
          if (sh && sh.complete && sh.naturalWidth > 0) {
            const fIdx = Math.min(5, Math.floor(p * 6));
            const cw = sh.naturalWidth / 6;
            const ch = sh.naturalHeight;
            const dw = 210 * it.scale;
            const dh = 268 * it.scale;
            ctx.save();
            ctx.translate(sx, sy);
            ctx.scale(it.dir || 1, 1);
            ctx.globalAlpha = Math.min(1, (1 - p) * 1.6);
            ctx.drawImage(sh, fIdx * cw, 0, cw, ch, -dw * 0.3, -dh * 0.5, dw, dh);
            ctx.restore();
          }
        } else if (it.type === "p3DodgeImpact") {
          const sh = imgs.p3_vfx_sheet;
          if (sh && sh.complete && sh.naturalWidth > 0) {
            const fIdx = 2 + Math.min(3, Math.floor(p * 4));
            const cw = sh.naturalWidth / 6;
            const ch = sh.naturalHeight;
            const dw = 180 * it.scale;
            const dh = 158 * it.scale;
            ctx.save();
            ctx.globalAlpha = Math.min(1, (1 - p) * 1.8);
            ctx.drawImage(sh, fIdx * cw, 0, cw, ch, sx - dw * 0.5, sy - dh * 0.82, dw, dh);
            ctx.restore();
          }
        } else if (it.type === "p4RainbowPillar") {
          const sh = imgs.p4_vfx_sheet;
          if (sh && sh.complete && sh.naturalWidth > 0) {
            const fIdx = Math.min(5, Math.floor(p * 6));
            const cw = sh.naturalWidth / 6;
            const ch = sh.naturalHeight;
            const dw = 148 * it.scale;
            const dh = G.CONST.GROUND_Y + 20;
            ctx.save();
            ctx.globalCompositeOperation = "lighter";
            ctx.globalAlpha = Math.min(1, (1 - p) * 1.5);
            ctx.drawImage(sh, fIdx * cw, 0, cw, ch, sx - dw * 0.5, sy - dh + 16, dw, dh);
            ctx.restore();
          }
        }
      }
    }
  };
})(window.RelayGame);
