window.RelayGame = window.RelayGame || {};

(function (G) {
  "use strict";

  const PALETTES = {
    morning: {
      skyTop: "#1d4ed8",
      skyBot: "#93c5fd",
      sunColor: "rgba(254, 240, 138, 0.9)",
      rayColor: "rgba(254, 249, 195, 0.14)",
      tint: "rgba(56, 189, 248, 0.04)",
      bgKey: "bg_morning"
    },
    noon: {
      skyTop: "#0284c7",
      skyBot: "#bae6fd",
      sunColor: "rgba(255, 255, 224, 0.95)",
      rayColor: "rgba(255, 255, 255, 0.12)",
      tint: "rgba(251, 191, 36, 0.05)",
      bgKey: "bg_morning"
    },
    sunset: {
      skyTop: "#4c1d95",
      skyBot: "#fb923c",
      sunColor: "rgba(253, 186, 116, 0.92)",
      rayColor: "rgba(251, 146, 60, 0.16)",
      tint: "rgba(234, 88, 12, 0.12)",
      bgKey: "bg_sunset"
    },
    finale: {
      skyTop: "#1e1b4b",
      skyBot: "#f59e0b",
      sunColor: "rgba(254, 240, 138, 0.95)",
      rayColor: "rgba(253, 224, 71, 0.18)",
      tint: "rgba(168, 85, 247, 0.08)",
      bgKey: "bg_sunset"
    }
  };

  function drawFallbackSchoolBackdrop(ctx, camX, pal) {
    const W = G.CONST.W;
    const gY = G.CONST.GROUND_Y;

    // Distant mountains
    ctx.fillStyle = "#1e5b4f";
    for (let i = -1; i < 4; i++) {
      const mx = i * 360 - ((camX * 0.12) % 360);
      ctx.beginPath();
      ctx.moveTo(mx, gY - 80);
      ctx.lineTo(mx + 180, gY - 250);
      ctx.lineTo(mx + 380, gY - 80);
      ctx.closePath();
      ctx.fill();
    }

    // Taiwanese Elementary School buildings
    const bStep = 420;
    const offset = -((camX * 0.3) % bStep);
    for (let x = offset - bStep; x < W + bStep; x += bStep) {
      ctx.fillStyle = "#e2e8f0";
      ctx.fillRect(x + 20, gY - 245, 360, 195);
      ctx.fillStyle = "#94a3b8";
      ctx.fillRect(x + 20, gY - 252, 360, 10);
      // Water towers on roof
      ctx.fillStyle = "#cbd5e1";
      ctx.fillRect(x + 55, gY - 292, 34, 40);
      ctx.fillRect(x + 310, gY - 292, 34, 40);
      // Windows
      ctx.fillStyle = "#38bdf8";
      for (let row = 0; row < 2; row++) {
        for (let col = 0; col < 5; col++) {
          ctx.fillRect(x + 48 + col * 64, gY - 220 + row * 68, 42, 32);
        }
      }
      // 71st Anniversary Banner
      ctx.fillStyle = "#dc2626";
      ctx.fillRect(x + 125, gY - 178, 150, 22);
      ctx.fillStyle = "#fde047";
      ctx.font = "bold 12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("大庄國小 71 週年校慶", x + 200, gY - 163);
    }
  }

  G.Background = {
    draw(ctx, stage, camX, time, bossLock, crowdMood) {
      const W = G.CONST.W;
      const H = G.CONST.H;
      const gY = G.CONST.GROUND_Y;
      const pal = PALETTES[stage.timeOfDay] || PALETTES.morning;
      const mood = crowdMood || "normal";

      // Layer 0: Sky gradient
      const skyGrad = ctx.createLinearGradient(0, 0, 0, gY);
      skyGrad.addColorStop(0, pal.skyTop);
      skyGrad.addColorStop(1, pal.skyBot);
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, W, gY);

      // Sun / Glow
      ctx.save();
      const sunX = W * 0.78 - (camX * 0.02);
      const sunY = stage.timeOfDay === "sunset" || stage.timeOfDay === "finale" ? 135 : 88;
      const sunGlow = ctx.createRadialGradient(sunX, sunY, 10, sunX, sunY, 110);
      sunGlow.addColorStop(0, pal.sunColor);
      sunGlow.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = sunGlow;
      ctx.beginPath();
      ctx.arc(sunX, sunY, 110, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Layer 1 & 2: Seamless Panoramic Parallax School Backdrop
      const stageBgs = ["bg_far_sky", "bg_mid_school", "bg_stadium_morning", "bg_mid_school"];
      const chosenKey = stageBgs[stage.id] || pal.bgKey;
      const bgImg = G.Assets.images[chosenKey] || G.Assets.images[pal.bgKey];
      const horizonY = gY - 32;
      if (bgImg && bgImg.complete && bgImg.naturalWidth > 0) {
        const drawH = horizonY;
        const drawW = Math.max(W, Math.round(bgImg.naturalWidth * (drawH / bgImg.naturalHeight)));
        const scroll = ((camX * 0.34) % drawW + drawW) % drawW;
        const tileIndex = Math.floor((camX * 0.34) / drawW);
        for (let k = -1; k <= 1; k++) {
          const drawX = k * drawW - scroll;
          if (drawX + drawW < 0 || drawX > W) continue;
          const flip = (tileIndex + k) % 2 !== 0;
          ctx.save();
          if (flip) {
            ctx.translate(drawX + drawW, 0);
            ctx.scale(-1, 1);
            ctx.drawImage(bgImg, 0, 0, drawW, drawH);
          } else {
            ctx.drawImage(bgImg, drawX, 0, drawW, drawH);
          }
          ctx.restore();
        }
        // Subtle atmospheric depth haze for HD-2D separation
        ctx.fillStyle = pal.tint;
        ctx.fillRect(0, 0, W, horizonY);
      } else {
        drawFallbackSchoolBackdrop(ctx, camX, pal);
      }

      // Layer 3: Midground Sports-Day Festival Pennants & Distance Markers (parallax 0.65)
      const flagStep = 140;
      const flagOff = -(((camX * 0.65) % flagStep + flagStep) % flagStep);
      const pennantColors = ["#ef4444", "#fde047", "#38bdf8", "#22c55e", "#f97316"];
      ctx.save();
      ctx.strokeStyle = "rgba(255,255,255,0.6)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, 44);
      ctx.lineTo(W, 44);
      ctx.stroke();
      for (let x = flagOff - flagStep, idx = 0; x < W + flagStep; x += 36, idx++) {
        ctx.fillStyle = pennantColors[idx % pennantColors.length];
        ctx.beginPath();
        ctx.moveTo(x, 44);
        ctx.lineTo(x + 24, 44);
        ctx.lineTo(x + 12 + Math.sin(time * 5 + idx) * 3, 66);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();

      // Midground Dynamic Cheer Squad & Carnival Tents reacting to battle (parallax 0.68)
      const crowdStep = 220;
      const crowdOff = -(((camX * 0.68) % crowdStep + crowdStep) % crowdStep);
      const shirtColors = ["#f43f5e", "#38bdf8", "#facc15", "#22c55e"];
      for (let cx = crowdOff - crowdStep, ci = 0; cx < W + crowdStep; cx += crowdStep, ci++) {
        // Mini cheering group on grass edge behind purple track
        const baseY = gY - 32;
        if (ci % 2 === 0) {
          // Bouncing carnival tent canopy silhouette accent
          const tentBounce = mood === "cheer" ? Math.abs(Math.sin(time * 9 + ci)) * 4 : mood === "panic" ? Math.sin(time * 26 + ci) * 2 : 0;
          ctx.save();
          ctx.translate(cx - 28, baseY - tentBounce);
          ctx.fillStyle = ci % 4 === 0 ? "#ef4444" : "#3b82f6";
          ctx.beginPath();
          ctx.moveTo(-22, -26);
          ctx.lineTo(0, -42);
          ctx.lineTo(22, -26);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(-16, -26, 32, 4);
          ctx.fillStyle = "#cbd5e1";
          ctx.fillRect(-16, -22, 3, 22);
          ctx.fillRect(13, -22, 3, 22);
          ctx.restore();
        }
        // 3 spectators cheering or panicking
        for (let m = 0; m < 3; m++) {
          const px = cx + 18 + m * 16;
          const jump = mood === "cheer"
            ? Math.abs(Math.sin(time * 12 + ci + m)) * 10
            : mood === "panic"
              ? Math.abs(Math.sin(time * 20 + m)) * 5
              : Math.abs(Math.sin(time * 4 + ci + m)) * 3;
          const shakeX = mood === "panic" ? Math.sin(time * 32 + m * 2) * 3 : 0;
          ctx.save();
          ctx.translate(px + shakeX, baseY - jump);
          // Body
          ctx.fillStyle = shirtColors[(ci + m) % shirtColors.length];
          ctx.fillRect(-5, -16, 10, 12);
          // Head
          ctx.fillStyle = "#fed7aa";
          ctx.fillRect(-4, -24, 8, 8);
          ctx.fillStyle = "#1e293b";
          ctx.fillRect(-4, -26, 8, 3);
          // Arms
          ctx.fillStyle = "#fed7aa";
          if (mood === "panic") {
            // Hands on head!
            ctx.fillRect(-7, -25, 3, 8);
            ctx.fillRect(4, -25, 3, 8);
          } else if (mood === "cheer") {
            // Pom-poms raised!
            ctx.fillRect(-7, -26, 3, 9);
            ctx.fillRect(4, -26, 3, 9);
            ctx.fillStyle = "#fde047";
            ctx.fillRect(-9, -29, 5, 5);
            ctx.fillRect(4, -29, 5, 5);
          } else {
            ctx.fillRect(-7, -17, 2, 7);
            ctx.fillRect(5, -17, 2, 7);
          }
          ctx.restore();
        }
        if (mood !== "normal" && ci % 2 === 1) {
          ctx.save();
          ctx.font = "bold 11px 'Cubic11', 'Noto Sans TC', sans-serif";
          ctx.textAlign = "center";
          ctx.fillStyle = mood === "panic" ? "#fca5a5" : "#fef08a";
          ctx.fillText(mood === "panic" ? "哇啊啊！" : "加油！衝啊！", cx + 34, baseY - 40 - Math.sin(time * 6) * 3);
          ctx.restore();
        }
      }

      // Track distance markers (100m, 200m, 300m)
      const markers = [
        { x: Math.floor(stage.length * 0.25), label: "100m" },
        { x: Math.floor(stage.length * 0.5), label: "200m" },
        { x: Math.floor(stage.length * 0.75), label: "300m" }
      ];
      markers.forEach((m) => {
        const sx = m.x - camX;
        if (sx < -60 || sx > W + 60) return;
        ctx.save();
        ctx.fillStyle = "#475569";
        ctx.fillRect(sx - 3, gY - 54, 6, 54);
        ctx.fillStyle = "#0f172a";
        ctx.fillRect(sx - 24, gY - 72, 48, 22);
        ctx.strokeStyle = "#fde047";
        ctx.lineWidth = 2;
        ctx.strokeRect(sx - 24, gY - 72, 48, 22);
        ctx.fillStyle = "#fde047";
        ctx.font = "bold 12px monospace";
        ctx.textAlign = "center";
        ctx.fillText(m.label, sx, gY - 57);
        ctx.restore();
      });

      // Layer 4: Elevated Track Platforms
      stage.platforms.forEach((p) => {
        const sx = p.x - camX;
        if (sx + p.w < -20 || sx > W + 20) return;
        ctx.save();
        ctx.fillStyle = "#9a3412";
        ctx.fillRect(sx, p.y, p.w, 16);
        ctx.fillStyle = "#22c55e";
        ctx.fillRect(sx, p.y, p.w, 5);
        ctx.strokeStyle = "#431407";
        ctx.lineWidth = 2;
        ctx.strokeRect(sx, p.y, p.w, 16);
        // Brick joints
        ctx.fillStyle = "#431407";
        for (let bx = sx + 24; bx < sx + p.w - 6; bx += 24) {
          ctx.fillRect(bx, p.y + 5, 2, 11);
        }
        ctx.restore();
      });

      // Foreground Violet Running Track & Brick Cross-Section
      const trackImg = G.Assets.images.ground_track;
      if (trackImg && trackImg.complete && trackImg.naturalWidth > 0) {
        const trackY = gY - 34;
        const trackH = H - trackY;
        const trackW = Math.round(trackImg.naturalWidth * (trackH / trackImg.naturalHeight));
        const startX = -((camX % trackW + trackW) % trackW);
        for (let gx = startX; gx < W + trackW; gx += trackW) {
          ctx.drawImage(trackImg, gx, trackY, trackW, trackH);
        }
      } else {
        ctx.save();
        ctx.fillStyle = "#9a3412";
        ctx.fillRect(0, gY, W, H - gY);

        // Green grass trim + white track line
        ctx.fillStyle = "#22c55e";
        ctx.fillRect(0, gY, W, 8);
        ctx.fillStyle = "#dcfce7";
        ctx.fillRect(0, gY + 8, W, 3);

        // Tiled brick blocks scrolling with camX
        const tileW = 46;
        const tileH = 42;
        const startX = -((camX % tileW + tileW) % tileW);
        for (let gx = startX; gx < W + tileW; gx += tileW) {
          for (let gy = gY + 12, row = 0; gy < H; gy += tileH, row++) {
            ctx.fillStyle = (row + Math.floor((gx + camX) / tileW)) % 2 === 0 ? "#b45309" : "#92400e";
            ctx.fillRect(gx + 1, gy + 1, tileW - 2, tileH - 2);
            // Bevel highlight
            ctx.fillStyle = "rgba(255,255,255,0.12)";
            ctx.fillRect(gx + 2, gy + 2, tileW - 4, 4);
            ctx.fillStyle = "rgba(0,0,0,0.22)";
            ctx.fillRect(gx + 2, gy + tileH - 5, tileW - 4, 3);
          }
        }
        ctx.restore();
      }

      // Boss Arena Lock Pillars (like reference video)
      if (bossLock) {
        const leftX = bossLock.minX - camX;
        const rightX = bossLock.maxX - camX;
        [leftX, rightX - 24].forEach((px) => {
          ctx.save();
          ctx.fillStyle = "#991b1b";
          ctx.fillRect(px, 60, 24, gY - 60);
          ctx.fillStyle = "#22c55e";
          for (let py = 75; py < gY - 20; py += 44) {
            ctx.fillRect(px + 2, py, 20, 12);
            ctx.fillStyle = "#f43f5e";
            ctx.fillRect(px + 8, py + 3, 7, 6);
            ctx.fillStyle = "#22c55e";
          }
          ctx.strokeStyle = "#450a0a";
          ctx.lineWidth = 2;
          ctx.strokeRect(px, 60, 24, gY - 60);
          ctx.restore();
        });
      }

      // HD-2D Post-Lighting: Diagonal Sun God Rays + Vignette
      ctx.save();
      ctx.fillStyle = pal.rayColor;
      for (let r = 0; r < 4; r++) {
        const rx = 120 + r * 240 - ((camX * 0.08) % 240);
        ctx.beginPath();
        ctx.moveTo(rx, 0);
        ctx.lineTo(rx + 85, 0);
        ctx.lineTo(rx - 90, gY);
        ctx.lineTo(rx - 175, gY);
        ctx.closePath();
        ctx.fill();
      }

      const vig = ctx.createRadialGradient(W * 0.5, H * 0.5, W * 0.3, W * 0.5, H * 0.5, W * 0.68);
      vig.addColorStop(0, "rgba(0,0,0,0)");
      vig.addColorStop(1, "rgba(2, 6, 23, 0.34)");
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
  };
})(window.RelayGame);
