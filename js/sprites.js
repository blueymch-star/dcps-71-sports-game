window.RelayGame = window.RelayGame || {};

(function (G) {
  "use strict";

  const Assets = {
    images: {},
    loadedCount: 0,
    totalCount: 0,
    ready: false
  };
  G.Assets = Assets;

  G.loadAssets = function (onDone) {
    const entries = Object.entries(G.CUSTOM_SPRITES || {});
    Assets.totalCount = entries.length;
    Assets.loadedCount = 0;

    if (entries.length === 0) {
      Assets.ready = true;
      if (onDone) onDone();
      return;
    }

    let settled = 0;
    entries.forEach(([key, src]) => {
      if (!src) {
        settled++;
        if (settled >= entries.length) {
          Assets.ready = true;
          if (onDone) onDone();
        }
        return;
      }
      const img = new Image();
      img.onload = () => {
        Assets.images[key] = img;
        Assets.loadedCount++;
        settled++;
        if (settled >= entries.length) {
          Assets.ready = true;
          if (onDone) onDone();
        }
      };
      img.onerror = () => {
        settled++;
        if (settled >= entries.length) {
          Assets.ready = true;
          if (onDone) onDone();
        }
      };
      img.src = src + (src.includes("?") ? "&" : "?") + "v=20261125b";
    });
  };

  function drawProceduralRunner(ctx, runnerIndex, x, y, facing, state, t, hasSpikes) {
    const r = G.RUNNERS[runnerIndex] || G.RUNNERS[0];
    const bob = state === "run" ? Math.abs(Math.sin(t * 14)) * 5 : 0;
    const stride = state === "run" ? Math.sin(t * 14) * 10 : state === "jump" ? 8 : 0;

    ctx.save();
    ctx.translate(x, y - bob);
    ctx.scale(facing, 1);
    if (state === "slip") ctx.rotate(-0.35);

    // Legs
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(-10 + stride * 0.6, -24, 9, 20);
    ctx.fillRect(2 - stride * 0.6, -24, 9, 20);

    // Shoes
    ctx.fillStyle = hasSpikes ? "#fbbf24" : "#ffffff";
    ctx.fillRect(-12 + stride * 0.6, -7, 14, 7);
    ctx.fillRect(1 - stride * 0.6, -7, 14, 7);

    // Shorts
    ctx.fillStyle = "#1e3a8a";
    ctx.fillRect(-13, -38, 26, 15);

    // Torso
    ctx.fillStyle = r.color;
    ctx.fillRect(-14, -64, 28, 28);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(-14, -54, 28, 6);

    // Head
    ctx.fillStyle = "#fed7aa";
    ctx.fillRect(-13, -90, 26, 26);

    // Hair & headband
    ctx.fillStyle = "#1f2937";
    ctx.fillRect(-14, -95, 28, 9);
    ctx.fillStyle = r.accent;
    ctx.fillRect(-14, -84, 28, 5);

    // Eye
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(5, -79, 4, 5);

    // Relay Baton in hand
    ctx.fillStyle = "#fde047";
    ctx.fillRect(10, -52, 18, 6);
    ctx.fillStyle = "#ef4444";
    ctx.fillRect(22, -52, 6, 6);

    ctx.restore();
  }

  function drawProceduralBoss(ctx, bossKey, x, y, facing, state, t) {
    const bob = Math.sin(t * 5) * 6;
    ctx.save();
    ctx.translate(x, y + bob);
    ctx.scale(facing, 1);

    const colors = {
      boss_1: ["#64748b", "#0f172a", "#f8fafc"],
      boss_2: ["#84cc16", "#78350f", "#fde047"],
      boss_3: ["#475569", "#7e22ce", "#fb923c"],
      boss_4: ["#dc2626", "#fbbf24", "#7c3aed"]
    }[bossKey] || ["#64748b", "#1e293b", "#fde047"];

    // Body
    ctx.fillStyle = colors[0];
    ctx.fillRect(-48, -140, 96, 120);
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 4;
    ctx.strokeRect(-48, -140, 96, 120);

    // Armor / Accent
    ctx.fillStyle = colors[1];
    ctx.fillRect(-44, -95, 88, 36);

    // Eyes
    ctx.fillStyle = colors[2];
    ctx.fillRect(-28, -120, 16, 14);
    ctx.fillRect(10, -120, 16, 14);
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(-22, -116, 6, 6);
    ctx.fillRect(16, -116, 6, 6);

    if (state === "defeated") {
      ctx.fillStyle = "#fde047";
      ctx.font = "bold 20px sans-serif";
      ctx.fillText("★  ★", -24, -152);
    }
    ctx.restore();
  }

  G.Sprites = {
    drawRunner(ctx, runnerIndex, x, y, facing, state, t, opts) {
      const o = opts || {};
      if (o.hurtFlash && Math.floor(t * 20) % 2 === 0) return;

      const runner = G.RUNNERS[runnerIndex] || G.RUNNERS[0];
      const sheetFrame = G.Sheets ? G.Sheets.getFrame(runnerIndex, o.melee ? "shoot" : state, t) : null;
      const img = sheetFrame || Assets.images[runner.spriteKey];

      // Ground contact shadow
      ctx.save();
      ctx.fillStyle = "rgba(0, 0, 0, 0.32)";
      ctx.beginPath();
      ctx.ellipse(x, y + 2, 24, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      const imgW = img ? (img.naturalWidth || img.width) : 0;
      const imgH = img ? (img.naturalHeight || img.height) : 0;
      if (img && imgW > 0 && imgH > 0) {
        const targetH = 92;
        const scale = targetH / imgH;
        const drawW = imgW * scale;
        const drawH = targetH;

        let bobY = 0;
        let tilt = 0;
        let sx = 1;
        let sy = 1;

        if (state === "run") {
          bobY = -Math.abs(Math.sin(t * 15)) * 5;
          tilt = Math.sin(t * 15) * 0.05;
          sx = 1 + Math.sin(t * 15) * 0.03;
          sy = 1 - Math.sin(t * 15) * 0.03;
        } else if (state === "jump") {
          sx = 0.94;
          sy = 1.07;
          tilt = -0.07;
        } else if (state === "dash") {
          sx = 1.14;
          sy = 0.9;
          tilt = 0.16;
        } else if (state === "slip") {
          // Exaggerated Metal Slug faceplant slide!
          tilt = 1.42;
          bobY = 10;
          sx = 1.08;
          sy = 0.92;
        } else if (state === "knockback") {
          tilt = -0.65 + Math.sin(t * 28) * 0.35;
          bobY = -6;
        }

        if (o.isFat) {
          sx *= 1.48;
          sy *= 0.96;
        }

        if (o.crouching) {
          sy *= 0.72;
          sx *= 1.12;
        }

        if (o.drinkAura || o.superAura) {
          // Glowing rising Ki flames after drinking sports drink or activating Super Mode
          const flameSheet = G.Assets.images.vfx_flame_sheet;
          if (flameSheet && flameSheet.complete && flameSheet.naturalWidth > 0) {
            ctx.save();
            const fIdx = Math.floor(t * 14) % 5;
            const cw = flameSheet.naturalWidth / 5;
            const ch = flameSheet.naturalHeight;
            const flameScale = o.superAura ? 1.18 : 0.92;
            const fw = 94 * flameScale;
            const fh = 132 * flameScale;
            ctx.globalAlpha = o.superAura ? 0.88 : 0.72;
            ctx.drawImage(flameSheet, fIdx * cw, 0, cw, ch, x - fw * 0.5, y - fh + 10, fw, fh);
            ctx.restore();
          } else {
            ctx.save();
            for (let f = 0; f < 5; f++) {
              const fh = 18 + Math.abs(Math.sin(t * 14 + f)) * 24;
              const fx = x - 22 + f * 11;
              ctx.globalAlpha = 0.45;
              ctx.fillStyle = f % 2 === 0 ? "#38bdf8" : "#fde047";
              ctx.beginPath();
              ctx.ellipse(fx, y - fh * 0.5 - 10, 9, fh, 0, 0, Math.PI * 2);
              ctx.fill();
            }
            ctx.restore();
          }
        }

        ctx.save();
        ctx.translate(x, y + bobY);
        ctx.scale(facing * sx, sy);
        ctx.rotate(tilt);
        if (o.recoil) ctx.translate(-3, 0);
        ctx.drawImage(img, -drawW * 0.5, -drawH, drawW, drawH);

        // Faceplant comical sweat drops
        if (state === "slip") {
          ctx.fillStyle = "#38bdf8";
          ctx.fillRect(drawW * 0.35, -drawH * 0.8, 7, 7);
          ctx.fillStyle = "#ef4444";
          ctx.font = "bold 16px sans-serif";
          ctx.fillText("×_×", 0, -drawH - 6);
        }

        if (o.stunned) {
          ctx.save();
          ctx.scale(facing, 1);
          ctx.fillStyle = "#fde047";
          ctx.strokeStyle = "#0f172a";
          ctx.lineWidth = 3;
          ctx.font = "bold 14px sans-serif";
          ctx.textAlign = "center";
          const sx1 = Math.sin(t * 10) * 16;
          ctx.strokeText("★ 暈眩！", sx1, -drawH - 10);
          ctx.fillText("★ 暈眩！", sx1, -drawH - 10);
          ctx.restore();
        }

        // Melee Baton Swing Crescent Slash
        if (o.melee) {
          ctx.strokeStyle = "#fde047";
          ctx.lineWidth = 7;
          ctx.beginPath();
          ctx.arc(22, -drawH * 0.52, 46, -1.1, 1.0);
          ctx.stroke();
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(26, -drawH * 0.52, 42, -0.9, 0.85);
          ctx.stroke();
        }

        // Glowing golden baton indicator when carrying spikes/super
        if (o.hasSpikes) {
          ctx.fillStyle = "#38bdf8";
          ctx.fillRect(-16, -5, 32, 4);
        }
        ctx.restore();
      } else {
        drawProceduralRunner(ctx, runnerIndex, x, y, facing, state, t, o.hasSpikes);
      }
    },

    drawPortrait(ctx, key, x, y, size) {
      ctx.save();
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(x, y, size, size);

      const img = Assets.images[key];
      if (img && img.complete && img.naturalWidth > 0) {
        const sw = img.naturalWidth;
        const sh = img.naturalHeight;
        if (key.endsWith("_portrait")) {
          // Dedicated bust portrait: fit cleanly inside frame
          const pad = 2;
          const box = size - pad * 2;
          const scale = Math.min(box / sw, box / sh);
          const dw = sw * scale;
          const dh = sh * scale;
          ctx.drawImage(img, x + pad + (box - dw) * 0.5, y + pad + (box - dh), dw, dh);
        } else {
          // Crop upper 65% centered for full-body sprites (e.g. Bosses)
          const cropSize = Math.min(sw, sh * 0.68);
          const sx = (sw - cropSize) * 0.5;
          const sy = sh * 0.03;
          ctx.drawImage(img, sx, sy, cropSize, cropSize, x + 2, y + 2, size - 4, size - 4);
        }
      } else if (key === "referee") {
        // Pixel teacher with megaphone
        ctx.fillStyle = "#1e3a8a";
        ctx.fillRect(x + 2, y + 2, size - 4, size - 4);
        ctx.fillStyle = "#fed7aa";
        ctx.fillRect(x + size * 0.28, y + size * 0.25, size * 0.44, size * 0.42);
        ctx.fillStyle = "#1e293b";
        ctx.fillRect(x + size * 0.24, y + size * 0.14, size * 0.52, size * 0.18);
        ctx.fillStyle = "#ef4444";
        ctx.fillRect(x + size * 0.2, y + size * 0.7, size * 0.6, size * 0.24);
        ctx.fillStyle = "#fbbf24";
        ctx.fillRect(x + size * 0.58, y + size * 0.5, size * 0.26, size * 0.16);
      } else {
        ctx.fillStyle = "#334155";
        ctx.fillRect(x + 6, y + 6, size - 12, size - 12);
      }
      ctx.restore();
    },

    drawEnemy(ctx, enemy, screenX, y, t) {
      ctx.save();
      ctx.fillStyle = "rgba(0,0,0,0.28)";
      ctx.beginPath();
      ctx.ellipse(screenX, y + 2, 20, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      if (enemy.type === "rhino" || enemy.type === "dog") {
        const key = enemy.type === "rhino" ? "enemy_rhino" : "enemy_dog";
        const img = Assets.images[key];
        const targetH = enemy.type === "rhino" ? 84 : 60;
        if (img && img.complete && img.naturalWidth > 0) {
          const w = img.naturalWidth * (targetH / img.naturalHeight);
          const bob = Math.abs(Math.sin(t * 11 + enemy.id)) * 4;
          ctx.save();
          ctx.translate(screenX, y - bob);
          // Image faces LEFT natively; if facing > 0 flip horizontally
          ctx.scale(enemy.facing < 0 ? 1 : -1, 1);
          if (enemy.hurtFlash > 0) ctx.filter = "brightness(1.8)";
          ctx.drawImage(img, -w * 0.5, -targetH, w, targetH);
          ctx.restore();
        } else {
          ctx.save();
          ctx.translate(screenX, y);
          ctx.fillStyle = enemy.type === "rhino" ? "#64748b" : "#b45309";
          ctx.fillRect(-22, -targetH, 44, targetH);
          ctx.restore();
        }

        if (enemy.calmed) {
          ctx.save();
          ctx.fillStyle = "#fb7185";
          ctx.font = "bold 18px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("♥", screenX, y - targetH - 8 - Math.sin(t * 8) * 4);
          ctx.restore();
        }
        return;
      }

      if (enemy.type === "phone") {
        // Distracted phone-walker crossing track
        const img = Assets.images.enemy_phone;
        const bob = Math.abs(Math.sin(t * 7 + enemy.id)) * 3;
        if (img && img.complete && img.naturalWidth > 0) {
          const targetH = 82;
          const w = img.naturalWidth * (targetH / img.naturalHeight);
          ctx.save();
          ctx.translate(screenX, y - bob);
          ctx.scale(enemy.facing < 0 ? 1 : -1, 1);
          if (enemy.hurtFlash > 0) ctx.filter = "brightness(1.8)";
          ctx.drawImage(img, -w * 0.5, -targetH, w, targetH);
          ctx.restore();
        } else {
          ctx.save();
          ctx.translate(screenX, y - bob);
          ctx.scale(enemy.facing < 0 ? 1 : -1, 1);
          ctx.fillStyle = "#334155";
          ctx.fillRect(-9, -24, 7, 24);
          ctx.fillRect(2, -24, 7, 24);
          ctx.fillStyle = enemy.startled ? "#f97316" : "#6366f1";
          ctx.fillRect(-13, -54, 26, 30);
          ctx.fillStyle = "#fed7aa";
          ctx.fillRect(-10, -76, 20, 22);
          ctx.fillStyle = "#1e293b";
          ctx.fillRect(-11, -80, 22, 9);
          ctx.fillStyle = "#38bdf8";
          ctx.fillRect(-20, -48, 8, 12);
          ctx.restore();
        }
        return;
      }

      if (enemy.type === "balloon") {
        // Stone-throwing monster on track
        const img = Assets.images.enemy_balloon;
        const hop = Math.abs(Math.sin(t * 7 + enemy.id)) * 5;
        if (img && img.complete && img.naturalWidth > 0) {
          const targetH = 74;
          const w = img.naturalWidth * (targetH / img.naturalHeight);
          ctx.save();
          ctx.translate(screenX, y - hop);
          ctx.scale(enemy.facing < 0 ? 1 : -1, 1);
          if (enemy.hurtFlash > 0) ctx.filter = "brightness(1.8)";
          ctx.drawImage(img, -w * 0.5, -targetH, w, targetH);
          ctx.restore();
        } else {
          ctx.save();
          ctx.translate(screenX, y - hop);
          ctx.fillStyle = "#64748b";
          ctx.fillRect(-20, -64, 40, 64);
          ctx.restore();
        }
      }
    },

    drawBoss(ctx, boss, screenX, y, t) {
      const sheetFrame = G.Sheets && G.Sheets.getBossFrame
        ? G.Sheets.getBossFrame(boss.spriteKey, boss.hurtFlash > 0 ? "hurt" : boss.state, t)
        : null;
      const img = sheetFrame || Assets.images[boss.spriteKey];

      // Shadow
      ctx.save();
      ctx.fillStyle = "rgba(0,0,0,0.4)";
      ctx.beginPath();
      ctx.ellipse(screenX, G.CONST.GROUND_Y + 3, 56, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      const imgReady = sheetFrame || (img && img.complete && img.naturalWidth > 0);
      if (imgReady) {
        const iw = img.naturalWidth || img.width;
        const ih = img.naturalHeight || img.height;
        const targetH = sheetFrame ? 172 : 166;
        const w = iw * (targetH / ih);
        const bob = boss.state === "defeated" ? -18 + Math.sin(t * 10) * 6 : Math.sin(t * 4.5) * 6;
        const rot = boss.state === "defeated" ? -0.32 : boss.state === "charge" ? 0.1 : 0;

        ctx.save();
        ctx.translate(screenX, y + bob);
        // New boss sprite sheets face RIGHT; legacy static boss PNGs face LEFT
        ctx.scale(sheetFrame ? (boss.facing >= 0 ? 1 : -1) : (boss.facing < 0 ? 1 : -1), 1);
        ctx.rotate(rot);
        if (boss.hurtFlash > 0) ctx.filter = "brightness(1.9)";
        ctx.drawImage(img, -w * 0.5, -targetH, w, targetH);
        ctx.restore();

        // Boss 1 flashbang charge lens flare telegraph
        if (boss.state === "telegraph") {
          ctx.save();
          const pulse = 0.5 + 0.5 * Math.sin(t * 32);
          const lx = screenX + boss.facing * 45;
          const ly = y - 92;
          ctx.fillStyle = `rgba(255, 255, 255, ${0.55 + pulse * 0.4})`;
          ctx.beginPath();
          ctx.arc(lx, ly, 14 + pulse * 14, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "#fde047";
          ctx.lineWidth = 3;
          ctx.stroke();
          ctx.restore();
        }

        if (boss.state === "defeated") {
          ctx.save();
          ctx.fillStyle = "#fde047";
          ctx.font = "bold 22px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("★   ★", screenX + Math.sin(t * 9) * 10, y - targetH - 12);
          ctx.restore();
        }
      } else {
        drawProceduralBoss(ctx, boss.spriteKey, screenX, y, boss.facing, boss.state, t);
      }
    },

    drawTrap(ctx, trap, screenX, groundY, t) {
      ctx.save();
      const trapImg = Assets.images["trap_" + trap.type];
      if (trapImg && trapImg.complete && trapImg.naturalWidth > 0 && trap.type !== "wind") {
        if (trap.type === "puddle") {
          const h = 24;
          const w = Math.max(82, trapImg.naturalWidth * (h / trapImg.naturalHeight));
          ctx.drawImage(trapImg, screenX - w * 0.5, groundY - 10, w, h);
        } else if (trap.type === "sandpit") {
          const w = trap.w || 130;
          const h = 26;
          ctx.drawImage(trapImg, screenX - w * 0.5, groundY - 10, w, h);
        } else if (trap.type === "shoelace") {
          const h = 28;
          const w = trapImg.naturalWidth * (h / trapImg.naturalHeight);
          ctx.drawImage(trapImg, screenX - w * 0.5, groundY - h + 4, w, h);
        } else if (trap.type === "hurdle") {
          const h = 56;
          const w = trapImg.naturalWidth * (h / trapImg.naturalHeight);
          ctx.drawImage(trapImg, screenX - w * 0.5, groundY - h + 2, w, h);
        } else if (trap.type === "cone") {
          const h = 44;
          const w = trapImg.naturalWidth * (h / trapImg.naturalHeight);
          ctx.drawImage(trapImg, screenX - w * 0.5, groundY - h + 2, w, h);
        }
        ctx.restore();
        return;
      }

      if (trap.type === "puddle") {
        // Shimmering school track puddle
        ctx.fillStyle = "rgba(56, 189, 248, 0.78)";
        ctx.beginPath();
        ctx.ellipse(screenX, groundY + 2, 42, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#bae6fd";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(screenX - 8 + Math.sin(t * 4) * 4, groundY + 1, 18, 3, 0, 0, Math.PI * 2);
        ctx.stroke();
      } else if (trap.type === "shoelace") {
        // Gravel + untied shoelace warning
        ctx.fillStyle = "#78716c";
        for (let i = -3; i <= 3; i++) {
          ctx.fillRect(screenX + i * 9, groundY - 3, 5, 4);
        }
        ctx.strokeStyle = "#ef4444";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(screenX - 18, groundY - 2);
        ctx.bezierCurveTo(screenX - 6, groundY - 14, screenX + 8, groundY + 4, screenX + 20, groundY - 6);
        ctx.stroke();
      } else if (trap.type === "hurdle") {
        // School track hurdle
        ctx.fillStyle = "#cbd5e1";
        ctx.fillRect(screenX - 22, groundY - 46, 5, 46);
        ctx.fillRect(screenX + 17, groundY - 46, 5, 46);
        ctx.fillRect(screenX - 26, groundY - 4, 52, 4);
        // Red & white top bar
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(screenX - 25, groundY - 48, 50, 12);
        ctx.fillStyle = "#ef4444";
        ctx.fillRect(screenX - 25, groundY - 48, 12, 12);
        ctx.fillRect(screenX - 1, groundY - 48, 12, 12);
      } else if (trap.type === "cone") {
        // Orange traffic cone
        ctx.fillStyle = "#ea580c";
        ctx.beginPath();
        ctx.moveTo(screenX - 16, groundY);
        ctx.lineTo(screenX - 5, groundY - 38);
        ctx.lineTo(screenX + 5, groundY - 38);
        ctx.lineTo(screenX + 16, groundY);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(screenX - 10, groundY - 22, 20, 7);
        ctx.fillStyle = "#c2410c";
        ctx.fillRect(screenX - 20, groundY - 5, 40, 5);
      } else if (trap.type === "sandpit") {
        const w = trap.w || 130;
        ctx.fillStyle = "#d97706";
        ctx.fillRect(screenX - w * 0.5, groundY - 2, w, 16);
        ctx.fillStyle = "#fbbf24";
        ctx.fillRect(screenX - w * 0.5 + 4, groundY, w - 8, 8);
      } else if (trap.type === "wind") {
        const w = trap.w || 260;
        // Animated reverse-wind streaks
        ctx.strokeStyle = "rgba(186, 230, 253, 0.55)";
        ctx.lineWidth = 2;
        for (let i = 0; i < 6; i++) {
          const offset = ((t * 280 + i * 52) % w);
          const wx = screenX + w * 0.5 - offset;
          const wy = groundY - 28 - (i % 3) * 44;
          ctx.beginPath();
          ctx.moveTo(wx, wy);
          ctx.lineTo(wx - 42, wy);
          ctx.stroke();
        }
      }
      ctx.restore();
    },

    drawPickup(ctx, p, screenX, y, t) {
      const bob = Math.sin(t * 5 + p.x * 0.02) * 5;
      const py = y + bob;
      ctx.save();
      ctx.translate(screenX, py);

      // Soft HD-2D glow halo
      ctx.fillStyle = "rgba(254, 240, 138, 0.25)";
      ctx.beginPath();
      ctx.arc(0, 0, 24, 0, Math.PI * 2);
      ctx.fill();

      const imgKey = p.type === "iced_supau" ? "pickup_drink" : "pickup_" + p.type;
      const pImg = Assets.images[imgKey];
      if (pImg && pImg.complete && pImg.naturalWidth > 0) {
        const targetH = p.type === "golden_baton" ? 44 : 38;
        const w = pImg.naturalWidth * (targetH / pImg.naturalHeight);
        ctx.drawImage(pImg, -w * 0.5, -targetH * 0.5, w, targetH);
        if (p.type === "iced_supau") {
          ctx.strokeStyle = "#38bdf8";
          ctx.lineWidth = 2;
          ctx.strokeRect(-w * 0.5 - 3, -targetH * 0.5 - 3, w + 6, targetH + 6);
        }
        ctx.restore();
        return;
      }

      if (p.type.startsWith("weapon_")) {
        const code = p.type.split("_")[1];
        const wInfo = G.WEAPONS[code];
        ctx.fillStyle = "#1e293b";
        ctx.fillRect(-16, -16, 32, 32);
        ctx.strokeStyle = wInfo.color;
        ctx.lineWidth = 3;
        ctx.strokeRect(-16, -16, 32, 32);
        ctx.fillStyle = wInfo.color;
        ctx.font = "bold 20px monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(code, 0, 1);
      } else if (p.type === "drink") {
        // Sports drink bottle
        ctx.fillStyle = "#0ea5e9";
        ctx.fillRect(-10, -14, 20, 28);
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(-10, -4, 20, 8);
        ctx.fillStyle = "#ef4444";
        ctx.fillRect(-6, -19, 12, 6);
      } else if (p.type === "jelly") {
        // Energy banana / jelly pack
        ctx.fillStyle = "#facc15";
        ctx.beginPath();
        ctx.arc(0, 0, 15, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#713f12";
        ctx.font = "bold 16px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("★", 0, 1);
      } else if (p.type === "spikes") {
        // Anti-slip golden track spikes
        ctx.fillStyle = "#f97316";
        ctx.fillRect(-16, -6, 32, 14);
        ctx.fillStyle = "#fde047";
        ctx.fillRect(-14, 8, 5, 5);
        ctx.fillRect(-2, 8, 5, 5);
        ctx.fillRect(10, 8, 5, 5);
      }
      ctx.restore();
    },

    drawProjectile(ctx, proj, screenX, y) {
      ctx.save();
      ctx.translate(screenX, y);
      if (proj.fromPlayer) {
        if (proj.kind === "water" || proj.kind === "W") {
          ctx.fillStyle = "#38bdf8";
          ctx.beginPath();
          ctx.ellipse(0, 0, 12, 6, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#e0f2fe";
          ctx.fillRect(-4, -3, 7, 3);
        } else if (proj.kind === "superTornado") {
          const p2Sheet = G.Assets.images.p2_vfx_sheet;
          if (p2Sheet && p2Sheet.complete && p2Sheet.naturalWidth > 0) {
            const cw = p2Sheet.naturalWidth / 5;
            const ch = p2Sheet.naturalHeight;
            const fIdx = Math.floor((Date.now() * 0.014)) % 5;
            ctx.drawImage(p2Sheet, fIdx * cw, 0, cw, ch, -58, -148, 116, 196);
          } else {
            ctx.strokeStyle = "#4ade80";
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(0, 0, 22, 0, Math.PI * 2);
            ctx.stroke();
          }
        } else if (proj.kind === "superDodgeball") {
          const p3Sheet = G.Assets.images.p3_vfx_sheet;
          if (p3Sheet && p3Sheet.complete && p3Sheet.naturalWidth > 0) {
            const cw = p3Sheet.naturalWidth / 6;
            const ch = p3Sheet.naturalHeight;
            const fIdx = Math.abs(proj.vx) > 80 || Math.abs(proj.vy) > 120 ? 1 : 0;
            const ang = Math.atan2(proj.vy || 0, proj.vx || 1);
            ctx.save();
            ctx.rotate(ang);
            ctx.drawImage(p3Sheet, fIdx * cw, 0, cw, ch, -48, -38, 86, 76);
            ctx.restore();
          } else {
            ctx.fillStyle = "#ef4444";
            ctx.beginPath();
            ctx.arc(0, 0, 18, 0, Math.PI * 2);
            ctx.fill();
          }
        } else if (proj.kind === "giantBowling") {
          // Fat Mode giant bowling dodgeball!
          ctx.fillStyle = "#991b1b";
          ctx.beginPath();
          ctx.arc(0, 0, 24, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "#fde047";
          ctx.lineWidth = 4;
          ctx.stroke();
          ctx.fillStyle = "#ffffff";
          ctx.beginPath();
          ctx.arc(-7, -7, 4, 0, Math.PI * 2);
          ctx.arc(3, -9, 4, 0, Math.PI * 2);
          ctx.arc(-2, -1, 4, 0, Math.PI * 2);
          ctx.fill();
        } else if (proj.kind === "dodgeball" || proj.kind === "D") {
          ctx.fillStyle = "#ef4444";
          ctx.beginPath();
          ctx.arc(0, 0, 12, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "#fde047";
          ctx.lineWidth = 2;
          ctx.stroke();
        } else if (proj.kind === "sonic" || proj.kind === "M") {
          // Teacher's megaphone sonic rings
          ctx.strokeStyle = "#facc15";
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.arc(-6, 0, 18, -0.9, 0.9);
          ctx.stroke();
          ctx.strokeStyle = "#fef08a";
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(4, 0, 24, -0.9, 0.9);
          ctx.stroke();
        } else if (proj.kind === "baseball" || proj.kind === "B") {
          // Tee-ball explosive grenade
          ctx.fillStyle = "#ffffff";
          ctx.beginPath();
          ctx.arc(0, 0, 10, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "#22c55e";
          ctx.lineWidth = 3;
          ctx.stroke();
        } else if (proj.kind === "rainbow" || proj.kind === "L") {
          const rayImg = G.Assets.images.vfx_beam_ray;
          if (proj.kind === "rainbow" && rayImg && rayImg.complete && rayImg.naturalWidth > 0) {
            ctx.drawImage(rayImg, -46, -15, 92, 30);
          } else {
            ctx.fillStyle = proj.kind === "L" ? "#38bdf8" : "#f472b6";
            ctx.fillRect(-18, -5, 36, 10);
            ctx.fillStyle = "#fef08a";
            ctx.fillRect(-14, -2, 28, 4);
          }
        } else if (proj.kind === "superWave") {
          const rayImg = G.Assets.images.vfx_beam_ray;
          const orbImg = G.Assets.images.vfx_beam_orb;
          if (rayImg && rayImg.complete && rayImg.naturalWidth > 0) {
            ctx.drawImage(rayImg, -110, -28, 150, 56);
            if (orbImg && orbImg.complete && orbImg.naturalWidth > 0) {
              ctx.save();
              ctx.translate(22, 0);
              ctx.rotate((Date.now() * 0.012) % (Math.PI * 2));
              ctx.drawImage(orbImg, -22, -22, 44, 44);
              ctx.restore();
            }
          } else {
            ctx.fillStyle = "#fde047";
            ctx.beginPath();
            ctx.ellipse(0, 0, 28, 16, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = 3;
            ctx.stroke();
          }
        } else if (proj.kind === "S") {
          ctx.fillStyle = "#f43f5e";
          ctx.beginPath();
          ctx.arc(0, 0, 7, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#fde047";
          ctx.fillRect(-2, -2, 4, 4);
        } else {
          ctx.fillStyle = "#fde047";
          ctx.fillRect(-10, -4, 20, 8);
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(-4, -2, 10, 4);
        }
      } else {
        // Enemy / Boss projectiles
        if (proj.kind === "bobaPearl") {
          ctx.fillStyle = "#d97706";
          ctx.beginPath();
          ctx.arc(0, 0, 11, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#29150b";
          ctx.beginPath();
          ctx.arc(0, 0, 8, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#fde68a";
          ctx.beginPath();
          ctx.arc(-3, -3, 2.5, 0, Math.PI * 2);
          ctx.fill();
        } else if (proj.kind === "debrisCone") {
          ctx.rotate((Date.now() * 0.01) % (Math.PI * 2));
          ctx.fillStyle = "#f97316";
          ctx.beginPath();
          ctx.moveTo(0, -14);
          ctx.lineTo(11, 11);
          ctx.lineTo(-11, 11);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(-5, -2, 10, 4);
        } else if (proj.kind === "debrisTarp") {
          ctx.rotate((Date.now() * 0.008) % (Math.PI * 2));
          ctx.fillStyle = "#2563eb";
          ctx.fillRect(-12, -10, 24, 20);
          ctx.fillStyle = "#ef4444";
          ctx.fillRect(-12, -3, 24, 6);
          ctx.fillStyle = "#fde047";
          ctx.fillRect(-12, 4, 24, 4);
        } else if (proj.kind === "debrisBranch") {
          ctx.rotate((Date.now() * 0.012) % (Math.PI * 2));
          ctx.strokeStyle = "#78350f";
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(-14, 4);
          ctx.lineTo(14, -4);
          ctx.stroke();
          ctx.fillStyle = "#22c55e";
          ctx.beginPath();
          ctx.arc(8, -6, 6, 0, Math.PI * 2);
          ctx.arc(-4, 0, 5, 0, Math.PI * 2);
          ctx.fill();
        } else if (proj.kind === "hotSausage") {
          ctx.rotate(Math.atan2(proj.vy || 0, proj.vx || 1));
          ctx.fillStyle = "rgba(249, 115, 22, 0.45)";
          ctx.beginPath();
          ctx.ellipse(0, 0, 17, 9, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#b91c1c";
          ctx.beginPath();
          ctx.roundRect(-13, -5, 26, 10, 5);
          ctx.fill();
          ctx.strokeStyle = "#fde047";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(-5, -4);
          ctx.lineTo(-3, 4);
          ctx.moveTo(4, -4);
          ctx.lineTo(6, 4);
          ctx.stroke();
        } else if (proj.kind === "tornado") {
          ctx.fillStyle = "#a855f7";
          ctx.beginPath();
          ctx.ellipse(0, 0, 16, 22, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "#e9d5ff";
          ctx.lineWidth = 2;
          ctx.stroke();
        } else if (proj.kind === "lightning") {
          ctx.fillStyle = "#facc15";
          ctx.beginPath();
          ctx.moveTo(-6, -16);
          ctx.lineTo(6, -2);
          ctx.lineTo(-2, 0);
          ctx.lineTo(8, 16);
          ctx.lineTo(-8, 2);
          ctx.lineTo(0, 0);
          ctx.closePath();
          ctx.fill();
        } else {
          ctx.fillStyle = proj.color || "#fb923c";
          ctx.beginPath();
          ctx.arc(0, 0, 10, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "#0f172a";
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      }
      ctx.restore();
    },

    drawExchangeZone(ctx, screenX, groundY, isFinish, nextRunnerIndex, t) {
      ctx.save();
      // Red-white track markings on ground
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(screenX - 45, groundY, 90, 8);
      ctx.fillStyle = "#ef4444";
      for (let i = -40; i < 45; i += 20) {
        ctx.fillRect(screenX + i, groundY, 10, 8);
      }

      if (isFinish) {
        // Finish Line Pillars + Red Ribbon
        ctx.fillStyle = "#cbd5e1";
        ctx.fillRect(screenX - 38, groundY - 125, 8, 125);
        ctx.fillRect(screenX + 30, groundY - 125, 8, 125);
        ctx.fillStyle = "#ef4444";
        ctx.fillRect(screenX - 32, groundY - 62, 64, 10);
        ctx.fillStyle = "#fde047";
        ctx.font = "bold 14px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("終點線 FINISH", screenX, groundY - 134);
      } else {
        // Flag + waiting next runner
        ctx.fillStyle = "#94a3b8";
        ctx.fillRect(screenX - 42, groundY - 96, 6, 96);
        ctx.fillStyle = "#ef4444";
        ctx.beginPath();
        ctx.moveTo(screenX - 36, groundY - 94);
        ctx.lineTo(screenX + 2, groundY - 82 + Math.sin(t * 6) * 3);
        ctx.lineTo(screenX - 36, groundY - 70);
        ctx.closePath();
        ctx.fill();

        if (typeof nextRunnerIndex === "number" && nextRunnerIndex < G.RUNNERS.length) {
          G.Sprites.drawRunner(ctx, nextRunnerIndex, screenX + 24, groundY, 1, "idle", t, {});
        }
      }
      ctx.restore();
    },

    drawCaptive(ctx, c, screenX, groundY, t) {
      const key = c.type === "teacher" ? "captive_teacher" : "captive_student";
      const img = Assets.images[key];
      const targetH = c.type === "teacher" ? 80 : 74;
      ctx.save();
      ctx.fillStyle = "rgba(0,0,0,0.28)";
      ctx.beginPath();
      ctx.ellipse(screenX, groundY + 2, 24, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      const bounce = c.rescued ? Math.abs(Math.sin(t * 14)) * 10 : Math.sin(t * 4) * 2;
      if (img && img.complete && img.naturalWidth > 0) {
        const w = img.naturalWidth * (targetH / img.naturalHeight);
        ctx.translate(screenX, groundY - bounce);
        ctx.scale(c.rescued ? -1 : 1, 1);
        ctx.drawImage(img, -w * 0.5, -targetH, w, targetH);
      } else {
        ctx.fillStyle = c.type === "teacher" ? "#ef4444" : "#38bdf8";
        ctx.fillRect(screenX - 18, groundY - 58 - bounce, 36, 58);
      }
      ctx.restore();
      if (!c.rescued) {
        ctx.save();
        ctx.fillStyle = "#fde047";
        ctx.font = "bold 12px 'Cubic11', 'Noto Sans TC', sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("HELP!", screenX, groundY - targetH - 8 + Math.sin(t * 7) * 4);
        ctx.restore();
      }
    },

    drawDroppedBaton(ctx, b, screenX, y, t) {
      ctx.save();
      ctx.translate(screenX, y);
      ctx.rotate(Math.sin(t * 12) * 0.35);
      // Glowing halo
      ctx.fillStyle = "rgba(239, 68, 68, 0.35)";
      ctx.beginPath();
      ctx.arc(0, 0, 26, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fde047";
      ctx.fillRect(-18, -5, 36, 10);
      ctx.fillStyle = "#ef4444";
      ctx.fillRect(6, -5, 12, 10);
      ctx.restore();

      ctx.save();
      ctx.fillStyle = "#fecaca";
      ctx.strokeStyle = "#991b1b";
      ctx.lineWidth = 3;
      ctx.font = "bold 14px 'Cubic11', 'Noto Sans TC', sans-serif";
      ctx.textAlign = "center";
      const labelY = y - 28 + Math.sin(t * 10) * 4;
      ctx.strokeText("▼ 快撿接力棒！", screenX, labelY);
      ctx.fillText("▼ 快撿接力棒！", screenX, labelY);
      ctx.restore();
    }
  };
})(window.RelayGame);
