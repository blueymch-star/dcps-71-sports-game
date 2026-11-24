window.RelayGame = window.RelayGame || {};

(function (G) {
  "use strict";

  const { Particle, SpeechBubble, Projectile, Player, Enemy, Trap, Pickup, Boss, Captive, DroppedBaton } = G.Entities;

  class GameController {
    constructor(canvas, badgeCanvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext("2d");
      this.ctx.imageSmoothingEnabled = false;

      this.badgeCanvas = badgeCanvas;
      this.badgeCtx = badgeCanvas.getContext("2d");
      this.badgeCtx.imageSmoothingEnabled = false;

      this.state = "TITLE"; // TITLE | STAGE_SELECT | DIALOGUE | PLAYING | BOSS_FIGHT | BATON_QTE | VICTORY | GAME_OVER
      this.mode = "relay"; // "relay" (4 legs chained) | "single" (stage select)
      this.selectedStageIdx = 0;
      this.currentStageIdx = 0;

      this.camX = 0;
      this.time = 0;
      this.totalRelayTime = 0;
      this.score = 0;
      this.passRatings = [];
      this.screenShake = 0;

      this.player = new Player(0);
      this.enemies = [];
      this.traps = [];
      this.pickups = [];
      this.captives = [];
      this.projectiles = [];
      this.particles = [];
      this.bubbles = [];
      this.boss = null;
      this.bossLock = null;
      this.droppedBaton = null;
      this.superCinematic = null;
      this.bossWarningTimer = 0;
      this.crowdMood = "normal";
      this.crowdMoodTimer = 0;

      this.dialogueLines = [];
      this.dialogueIndex = 0;
      this.tipBanner = null;
      this.tipShownKeys = new Set();

      this.qte = {
        cursor: 0,
        dir: 1,
        speed: 1.55,
        resolved: false,
        resultText: "",
        timer: 0
      };

      this.hitboxes = [];
      this.paused = false;
      this._lastBadgeIdx = -1;
    }

    start() {
      this.refreshBadge(0);
    }

    refreshBadge(idx, force) {
      if (!force && this._lastBadgeIdx === idx && G.Assets.ready) return;
      this._lastBadgeIdx = idx;
      const runner = G.RUNNERS[idx] || G.RUNNERS[0];
      G.Sprites.drawPortrait(this.badgeCtx, runner.portraitKey || runner.spriteKey, 0, 0, 56);
      const tag = document.getElementById("badgeLegTag");
      if (tag) tag.textContent = `${runner.leg}棒`;
    }

    showTip(key) {
      const text = G.TIPS[key];
      if (!text) return;
      if (this.tipShownKeys.has(key)) return;
      this.tipShownKeys.add(key);
      this.tipBanner = { text, timer: 3.6 };
    }

    addBubble(owner, text, dur) {
      this.bubbles = this.bubbles.filter((b) => b.owner !== owner);
      this.bubbles.push(new SpeechBubble(owner, text, dur || 1.8));
    }

    spawnDust(x, y, count) {
      for (let i = 0; i < count; i++) {
        this.particles.push(
          new Particle(
            x + (Math.random() * 20 - 10),
            y - 4,
            Math.random() * 90 - 45,
            -Math.random() * 60 - 20,
            "#e2e8f0",
            5,
            0.35,
            180
          )
        );
      }
    }

    spawnSparks(x, y, color, count) {
      for (let i = 0; i < count; i++) {
        const ang = Math.random() * Math.PI * 2;
        const spd = 80 + Math.random() * 190;
        this.particles.push(
          new Particle(x, y, Math.cos(ang) * spd, Math.sin(ang) * spd, color, 6, 0.45, 220)
        );
      }
    }

    cleanScreenBySuper() {
      const left = this.camX - 40;
      const right = this.camX + G.CONST.W + 40;
      this.traps.forEach((tr) => {
        if (tr.type === "puddle" && tr.x >= left && tr.x <= right) {
          tr.active = false;
          this.spawnSparks(tr.x, G.CONST.GROUND_Y - 10, "#38bdf8", 8);
        }
      });
      this.enemies.forEach((en) => {
        if (en.active && en.x >= left && en.x <= right) {
          en.hit(8, this);
        }
      });
      if (this.boss && this.boss.active) {
        this.boss.hit(12, this);
      }
      for (let i = 0; i < 36; i++) {
        this.particles.push(
          new Particle(
            this.camX + Math.random() * G.CONST.W,
            Math.random() * G.CONST.GROUND_Y,
            Math.random() * 160 - 80,
            -Math.random() * 140,
            ["#fde047", "#38bdf8", "#f43f5e", "#22c55e"][i % 4],
            8,
            0.75,
            120
          )
        );
      }
    }

    startRelayRun(startIdx, mode) {
      this.mode = mode || "relay";
      this.totalRelayTime = 0;
      this.score = 0;
      this.passRatings = [];
      this.tipShownKeys.clear();
      this.enterStageDialogue(startIdx || 0, true);
    }

    enterStageDialogue(stageIdx, resetPlayer) {
      this.currentStageIdx = stageIdx;
      this.dialogueLines = G.DIALOGUES[stageIdx] || [];
      this.dialogueIndex = 0;
      this.loadStage(stageIdx, resetPlayer);
      this.state = "DIALOGUE";
      G.Audio.setBgm("stage");
    }

    loadStage(stageIdx, resetPlayer) {
      const stage = G.STAGES[stageIdx];
      this.currentStageIdx = stageIdx;
      this.camX = 0;
      this.boss = null;
      this.bossLock = null;
      this.bossDefeated = false;
      this.droppedBaton = null;
      this.superCinematic = null;
      this.bossWarningTimer = 0;
      this.crowdMood = "normal";
      this.crowdMoodTimer = 0;
      this.projectiles = [];
      this.particles = [];
      this.bubbles = [];
      this.tipBanner = null;

      this.player.setRunner(stageIdx, !resetPlayer);
      this.player.x = 110;
      this.player.y = G.CONST.GROUND_Y;
      this.player.vx = 0;
      this.player.vy = 0;
      this.refreshBadge(stageIdx);

      this.enemies = stage.enemies.map((e, i) => new Enemy(e, i));
      this.traps = stage.traps.map((t) => new Trap(t));
      this.pickups = stage.pickups.map((p) => new Pickup(p));
      this.captives = (stage.captives || []).map((c) => new Captive(c));
    }

    spawnBoss() {
      const stage = G.STAGES[this.currentStageIdx];
      const minX = stage.length - G.CONST.W + 140;
      const maxX = stage.length + 140;
      this.bossLock = { minX, maxX };
      this.boss = new Boss(stage, maxX);
      this.state = "BOSS_FIGHT";
      this.bossWarningTimer = 1.6;
      this.crowdMood = "panic";
      this.crowdMoodTimer = 4.0;
      if (G.VFX) G.VFX.spawn("thunder", this.boss.x, G.CONST.GROUND_Y, { scale: 1.3 });
      G.Audio.play("warning");
      G.Audio.setBgm("boss");
      this.addBubble(this.boss, stage.bossQuote, 2.4);
    }

    triggerGameOver() {
      this.state = "GAME_OVER";
      G.Audio.setBgm("none");
    }

    enterBatonQTE() {
      if (this.currentStageIdx >= G.STAGES.length - 1) {
        // Leg 4 finished -> Victory!
        this.state = "VICTORY";
        G.Audio.play("perfect");
        G.Audio.setBgm("victory");
        return;
      }
      this.state = "BATON_QTE";
      this.qte = {
        cursor: 0.05,
        dir: 1,
        speed: 1.55,
        resolved: false,
        resultText: "",
        timer: 0
      };
    }

    resolveBatonQTE() {
      if (this.qte.resolved) return;
      this.qte.resolved = true;
      this.qte.timer = 1.5;

      const d = Math.abs(this.qte.cursor - 0.5);
      if (d <= 0.11) {
        this.qte.resultText = "PERFECT 完美交棒！加速無敵！";
        this.passRatings.push("PERFECT");
        this.score += 600;
        this.player.invulnTimer = 3.2;
        this.player.spikesTimer = 3.5;
        this.player.superCharge = Math.min(G.CONST.MAX_SUPER, this.player.superCharge + 50);
        this.crowdMood = "cheer";
        this.crowdMoodTimer = 3.0;
        this.showTip("batonPerfect");
        G.Audio.play("perfect");
      } else if (d <= 0.24) {
        this.qte.resultText = "GOOD 順利交棒！";
        this.passRatings.push("GOOD");
        this.score += 300;
        this.player.hp = Math.min(G.CONST.MAX_HP, this.player.hp + 3);
        G.Audio.play("pickup");
      } else {
        // Dropped Baton Crisis!
        this.qte.resultText = "哎呀掉棒了！快衝回去撿！";
        this.qte.fumbled = true;
        this.passRatings.push("FUMBLE");
        this.showTip("batonFumble");
        G.Audio.play("slip");
      }
      this.spawnSparks(this.player.x + 20, this.player.y - 50, "#fde047", 20);
    }

    update(dt, input) {
      this.time += dt;
      if (this.paused) return;

      if (this.screenShake > 0) this.screenShake = Math.max(0, this.screenShake - dt);
      if (this.tipBanner) {
        this.tipBanner.timer -= dt;
        if (this.tipBanner.timer <= 0) this.tipBanner = null;
      }

      // Update Super button glow state in DOM
      const btnSuper = document.getElementById("btnSuper");
      const btnSuperSub = document.getElementById("btnSuperSub");
      const superReady = this.player.superCharge >= G.CONST.MAX_SUPER && (this.state === "PLAYING" || this.state === "BOSS_FIGHT");
      if (btnSuper) btnSuper.classList.toggle("ready", superReady);
      if (btnSuperSub) btnSuperSub.textContent = superReady ? "OK!" : "絕招";

      if (this.superCinematic) {
        this.superCinematic.timer -= dt;
        if (this.superCinematic.timer <= 0) {
          const onEnd = this.superCinematic.onEnd;
          this.superCinematic = null;
          if (typeof onEnd === "function") onEnd();
        }
      }
      if (this.bossWarningTimer > 0) {
        this.bossWarningTimer -= dt;
      }
      if (G.VFX) G.VFX.update(dt);
      if (this.crowdMoodTimer > 0) {
        this.crowdMoodTimer -= dt;
        if (this.crowdMoodTimer <= 0) this.crowdMood = "normal";
      }

      if (this.state === "TITLE") {
        if (input.shootPressed || input.jumpPressed) {
          G.Audio.unlock();
          G.Audio.play("confirm");
          this.state = "STAGE_SELECT";
        }
        return;
      }

      if (this.state === "STAGE_SELECT") {
        if (input.navLeft) {
          this.selectedStageIdx = (this.selectedStageIdx + 3) % 4;
          G.Audio.play("confirm");
        } else if (input.navRight) {
          this.selectedStageIdx = (this.selectedStageIdx + 1) % 4;
          G.Audio.play("confirm");
        } else if (input.navUp) {
          this.selectedStageIdx = (this.selectedStageIdx + 2) % 4;
          G.Audio.play("confirm");
        } else if (input.navDown) {
          this.selectedStageIdx = (this.selectedStageIdx + 2) % 4;
          G.Audio.play("confirm");
        }
        if (input.dashPressed) {
          this.state = "TITLE";
          G.Audio.play("confirm");
        } else if (input.shootPressed) {
          G.Audio.play("confirm");
          this.startRelayRun(this.selectedStageIdx, "relay");
        }
        return;
      }

      if (this.state === "DIALOGUE") {
        if (input.shootPressed || input.jumpPressed) {
          G.Audio.play("confirm");
          this.dialogueIndex++;
          if (this.dialogueIndex >= this.dialogueLines.length) {
            this.state = "PLAYING";
            this.addBubble(this.player, "出發衝刺！", 1.5);
          }
        }
        return;
      }

      if (this.state === "BATON_QTE") {
        if (!this.qte.resolved) {
          this.qte.cursor += this.qte.dir * this.qte.speed * dt;
          if (this.qte.cursor >= 1) {
            this.qte.cursor = 1;
            this.qte.dir = -1;
          } else if (this.qte.cursor <= 0) {
            this.qte.cursor = 0;
            this.qte.dir = 1;
          }
          if (input.shootPressed || input.jumpPressed) {
            this.resolveBatonQTE();
          }
        } else {
          this.qte.timer -= dt;
          if (this.qte.timer <= 0) {
            if (this.qte.fumbled) {
              this.qte.fumbled = false;
              const stage = G.STAGES[this.currentStageIdx];
              this.droppedBaton = new DroppedBaton(this.player.x - 40);
              this.player.x = stage.length + 70;
              this.enemies.push(new Enemy({ type: "rhino", x: Math.max(120, this.player.x - 320) }, 99));
              this.state = "PLAYING";
              this.crowdMood = "panic";
              this.crowdMoodTimer = 4.0;
              this.addBubble(this.player, "掉棒了！快衝回去撿！", 2.0);
            } else {
              this.enterStageDialogue(this.currentStageIdx + 1, false);
            }
          }
        }
        this.particles.forEach((p) => p.update(dt));
        return;
      }

      if (this.state === "VICTORY" || this.state === "GAME_OVER") {
        if (Math.random() < 0.14 && this.state === "VICTORY") {
          this.spawnSparks(
            this.camX + 120 + Math.random() * (G.CONST.W - 240),
            90 + Math.random() * 140,
            ["#fde047", "#f43f5e", "#38bdf8", "#22c55e"][Math.floor(Math.random() * 4)],
            12
          );
        }
        this.particles.forEach((p) => p.update(dt));
        this.particles = this.particles.filter((p) => p.life > 0);
        if (input.shootPressed) {
          G.Audio.play("confirm");
          if (this.state === "GAME_OVER") {
            this.enterStageDialogue(this.currentStageIdx, true);
          } else {
            this.state = "STAGE_SELECT";
            G.Audio.setBgm("none");
          }
        }
        return;
      }

      // Active gameplay: PLAYING or BOSS_FIGHT
      // Time ticks 3x faster during Dropped Baton Crisis!
      this.totalRelayTime += dt * (this.droppedBaton && this.droppedBaton.active ? 3.0 : 1.0);
      const stage = G.STAGES[this.currentStageIdx];

      this.player.update(dt, input, stage, this);
      this.traps.forEach((tr) => tr.update(dt, this.player, this));
      this.pickups.forEach((pk) => pk.update(this.player, this));
      this.captives.forEach((cp) => cp.update(dt, this.player, this));
      if (this.droppedBaton) this.droppedBaton.update(dt, this.player, this);
      this.enemies.forEach((en) => en.update(dt, this.player, this));

      // Projectiles & hits
      for (let i = this.projectiles.length - 1; i >= 0; i--) {
        const pr = this.projectiles[i];
        pr.update(dt);
        if (pr.explosive && pr.y >= G.CONST.GROUND_Y - 12) {
          // Explosive baseball AoE!
          if (G.VFX) {
            G.VFX.spawn("explosion", pr.x, G.CONST.GROUND_Y - 16, { color: "#22c55e", scale: 1.4 });
            G.VFX.spawn("shockwave", pr.x, G.CONST.GROUND_Y - 8, { color: "#fde047", scale: 1.1 });
          }
          this.spawnSparks(pr.x, G.CONST.GROUND_Y - 16, "#22c55e", 18);
          this.spawnSparks(pr.x, G.CONST.GROUND_Y - 16, "#fde047", 12);
          G.Audio.play("hit");
          this.enemies.forEach((en) => {
            if (en.active && !en.calmed && Math.abs(en.x - pr.x) < 110) en.hit(pr.damage, this);
          });
          if (this.boss && this.boss.active && this.boss.state !== "defeated" && Math.abs(this.boss.x - pr.x) < 120) {
            this.boss.hit(pr.damage, this);
          }
          this.projectiles.splice(i, 1);
          continue;
        }
        if (pr.life <= 0 || pr.x < this.camX - 80 || pr.x > this.camX + G.CONST.W + 80) {
          this.projectiles.splice(i, 1);
          continue;
        }

        if (pr.fromPlayer) {
          // Water gun / rainbow cleans puddles
          if (pr.kind === "water" || pr.kind === "rainbow") {
            this.traps.forEach((tr) => {
              if (tr.active && tr.type === "puddle" && Math.abs(pr.x - tr.x) < 38 && pr.y > G.CONST.GROUND_Y - 60) {
                tr.active = false;
                this.score += 50;
                this.spawnSparks(tr.x, G.CONST.GROUND_Y - 6, "#38bdf8", 8);
              }
            });
          }

          let removed = false;
          for (let j = 0; j < this.enemies.length; j++) {
            const en = this.enemies[j];
            if (!en.active || en.calmed || pr.hitIds.has(en)) continue;
            if (Math.abs(pr.x - en.x) < 26 + pr.radius && Math.abs(pr.y - (en.y - 38)) < 36 + pr.radius) {
              pr.hitIds.add(en);
              if (pr.knockback) en.x += (pr.vx >= 0 ? 1 : -1) * 42;
              en.hit(pr.damage, this);
              if (pr.explosive) {
                this.spawnSparks(pr.x, pr.y, "#fde047", 14);
              }
              if (!pr.pierce) {
                this.projectiles.splice(i, 1);
                removed = true;
                break;
              }
            }
          }
          if (removed) continue;

          if (this.boss && this.boss.active && this.boss.state !== "defeated" && !pr.hitIds.has(this.boss)) {
            if (Math.abs(pr.x - this.boss.x) < 56 + pr.radius && Math.abs(pr.y - (this.boss.y - 80)) < 82 + pr.radius) {
              pr.hitIds.add(this.boss);
              this.boss.hit(pr.damage, this);
              if (!pr.pierce) {
                this.projectiles.splice(i, 1);
              }
            }
          }
        } else {
          // Enemy projectile vs player
          if (Math.abs(pr.x - this.player.x) < 22 && Math.abs(pr.y - (this.player.y - 42)) < 42) {
            this.player.takeDamage(1, this, "中招了！");
            this.projectiles.splice(i, 1);
          }
        }
      }

      // Camera scrolling
      if (this.state === "PLAYING") {
        const targetCam = Math.max(0, Math.min(stage.length - G.CONST.W + 220, this.player.x - G.CONST.W * 0.34));
        this.camX += (targetCam - this.camX) * Math.min(1, dt * 8);

        if (!this.bossDefeated && this.player.x >= stage.length - 120) {
          this.spawnBoss();
        }
      } else if (this.state === "BOSS_FIGHT") {
        const targetCam = this.bossLock.minX;
        this.camX += (targetCam - this.camX) * Math.min(1, dt * 7);
        if (this.boss) {
          this.boss.update(dt, this.player, this);
          if (!this.boss.active) {
            this.bossLock = null;
            this.bossDefeated = true;
            this.state = "PLAYING";
            G.Audio.setBgm("stage");
            this.addBubble(this.player, "衝向接棒區！", 1.8);
          }
        }
        // Check reaching exchange zone after boss cleared
      }

      if (this.state === "PLAYING" && (!this.boss || !this.boss.active) && (!this.droppedBaton || !this.droppedBaton.active) && this.player.x >= stage.length + 145) {
        this.enterBatonQTE();
      }

      // Update particles & bubbles
      this.particles.forEach((p) => p.update(dt));
      this.particles = this.particles.filter((p) => p.life > 0);
      this.bubbles.forEach((b) => b.update(dt));
      this.bubbles = this.bubbles.filter((b) => b.life > 0);
    }

    handleCanvasClick(cx, cy) {
      G.Audio.unlock();
      for (let i = 0; i < this.hitboxes.length; i++) {
        const h = this.hitboxes[i];
        if (cx >= h.x && cx <= h.x + h.w && cy >= h.y && cy <= h.y + h.h) {
          h.onClick();
          return;
        }
      }
      // Generic advance on dialogue/title/QTE
      if (this.state === "DIALOGUE") {
        G.Audio.play("confirm");
        this.dialogueIndex++;
        if (this.dialogueIndex >= this.dialogueLines.length) {
          this.state = "PLAYING";
        }
      } else if (this.state === "BATON_QTE" && !this.qte.resolved) {
        this.resolveBatonQTE();
      }
    }

    draw() {
      const ctx = this.ctx;
      const W = G.CONST.W;
      const H = G.CONST.H;
      this.hitboxes = [];

      ctx.save();
      if (this.screenShake > 0) {
        ctx.translate((Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8);
      }

      const stage = G.STAGES[this.currentStageIdx] || G.STAGES[0];

      if (this.state === "TITLE") {
        const titleImg = G.Assets.images.title_bg;
        if (titleImg && titleImg.complete && titleImg.naturalWidth > 0) {
          ctx.drawImage(titleImg, 0, 0, W, H);
        } else {
          G.Background.draw(ctx, G.STAGES[0], this.time * 45, this.time, null);
        }
        this.drawTitleOverlay(ctx, W, H);
        ctx.restore();
        return;
      }

      if (this.state === "STAGE_SELECT") {
        this.drawStageSelect(ctx, W, H);
        ctx.restore();
        return;
      }

      // World Scene
      G.Background.draw(ctx, stage, this.camX, this.time, this.bossLock, this.crowdMood);
      this.traps.forEach((tr) => tr.draw(ctx, this.camX, this.time));
      G.Sprites.drawExchangeZone(
        ctx,
        stage.length + 170 - this.camX,
        G.CONST.GROUND_Y,
        this.currentStageIdx === G.STAGES.length - 1,
        this.currentStageIdx + 1,
        this.time
      );
      if (G.VFX) G.VFX.draw(ctx, this.camX, "back");
      this.captives.forEach((cp) => cp.draw(ctx, this.camX, this.time));
      this.pickups.forEach((pk) => pk.draw(ctx, this.camX, this.time));
      if (this.droppedBaton) this.droppedBaton.draw(ctx, this.camX, this.time);
      this.enemies.forEach((en) => en.draw(ctx, this.camX, this.time));
      if (this.boss) this.boss.draw(ctx, this.camX, this.time);
      this.player.draw(ctx, this.camX, this.time);
      this.projectiles.forEach((pr) => pr.draw(ctx, this.camX));
      this.particles.forEach((p) => p.draw(ctx, this.camX));
      if (G.VFX) G.VFX.draw(ctx, this.camX, "front");
      this.bubbles.forEach((b) => b.draw(ctx, this.camX));

      // Boss Warning Emblem Flash!
      if (this.bossWarningTimer > 0 && Math.floor(this.time * 8) % 2 === 0) {
        const wImg = G.Assets.images.ui_warning;
        if (wImg && wImg.complete && wImg.naturalWidth > 0) {
          const wh = 104;
          const ww = wImg.naturalWidth * (wh / wImg.naturalHeight);
          ctx.drawImage(wImg, (W - ww) * 0.5, 92, ww, wh);
        }
      }

      // Super Mode Full-Screen Cut-In Banner & Spectacle!
      if (this.superCinematic) {
        this.drawSuperCinematic(ctx, W, H);
      }

      // HUD
      this.drawHUD(ctx, stage, W);

      // Sub-overlays
      if (this.state === "DIALOGUE") {
        this.drawDialogueOverlay(ctx, W, H);
      } else if (this.state === "BATON_QTE") {
        this.drawBatonQTEOverlay(ctx, W, H);
      } else if (this.state === "VICTORY") {
        this.drawVictoryOverlay(ctx, W, H);
      } else if (this.state === "GAME_OVER") {
        this.drawGameOverOverlay(ctx, W, H);
      }

      ctx.restore();
    }

    drawTitleOverlay(ctx, W, H) {
      const hasTitleImg = G.Assets.images.title_bg && G.Assets.images.title_bg.complete && G.Assets.images.title_bg.naturalWidth > 0;
      if (!hasTitleImg) {
        ctx.fillStyle = "rgba(7, 11, 25, 0.56)";
        ctx.fillRect(0, 0, W, H);
      } else {
        // Subtle gradient at top-left & bottom so text/buttons pop without hiding the artwork
        const topGrad = ctx.createLinearGradient(0, 0, 0, 210);
        topGrad.addColorStop(0, "rgba(10, 14, 32, 0.62)");
        topGrad.addColorStop(1, "rgba(10, 14, 32, 0)");
        ctx.fillStyle = topGrad;
        ctx.fillRect(0, 0, W, 210);

        const botGrad = ctx.createLinearGradient(0, H - 150, 0, H);
        botGrad.addColorStop(0, "rgba(10, 14, 32, 0)");
        botGrad.addColorStop(1, "rgba(10, 14, 32, 0.72)");
        ctx.fillStyle = botGrad;
        ctx.fillRect(0, H - 150, W, 150);
      }

      ctx.save();
      ctx.textAlign = hasTitleImg ? "left" : "center";
      const tx = hasTitleImg ? 42 : W * 0.5;

      ctx.lineWidth = 5;
      ctx.strokeStyle = "rgba(10, 14, 32, 0.9)";

      ctx.font = "bold 15px 'Cubic11', 'Noto Sans TC', sans-serif";
      ctx.strokeText("DACHUANG ELEMENTARY SCHOOL 71ST ANNIVERSARY", tx, 56);
      ctx.fillStyle = "#38bdf8";
      ctx.fillText("DACHUANG ELEMENTARY SCHOOL 71ST ANNIVERSARY", tx, 56);

      ctx.font = "900 42px 'Cubic11', 'Noto Sans TC', sans-serif";
      ctx.strokeText("大庄國小 71 校慶運動會", tx, 108);
      ctx.fillStyle = "#fde047";
      ctx.fillText("大庄國小 71 校慶運動會", tx, 108);

      ctx.font = "900 30px 'Cubic11', 'Noto Sans TC', sans-serif";
      ctx.strokeText("大隊接力大作戰", tx, 150);
      ctx.fillStyle = "#ffffff";
      ctx.fillText("大隊接力大作戰", tx, 150);
      ctx.restore();

      if (!hasTitleImg) {
        for (let i = 0; i < 4; i++) {
          G.Sprites.drawRunner(ctx, i, W * 0.5 - 150 + i * 100, 342, 1, "run", this.time + i * 0.4, {});
        }
      }

      // Two clickable start buttons
      const btnY = hasTitleImg ? 420 : 386;
      const btn1 = { x: hasTitleImg ? 42 : W * 0.5 - 230, y: btnY, w: 210, h: 52 };
      const btn2 = { x: hasTitleImg ? 272 : W * 0.5 + 20, y: btnY, w: 210, h: 52 };

      this.drawArcadeButton(ctx, btn1, "四棒接力闖關", "#16a34a", "#bbf7d0");
      this.drawArcadeButton(ctx, btn2, "自由選棒挑戰", "#1d4ed8", "#bae6fd");

      this.hitboxes.push({
        ...btn1,
        onClick: () => {
          G.Audio.play("confirm");
          this.startRelayRun(0, "relay");
        }
      });
      this.hitboxes.push({
        ...btn2,
        onClick: () => {
          G.Audio.play("confirm");
          this.state = "STAGE_SELECT";
        }
      });

      ctx.save();
      ctx.textAlign = hasTitleImg ? "left" : "center";
      ctx.font = "bold 14px 'Cubic11', 'Noto Sans TC', sans-serif";
      ctx.lineWidth = 4;
      ctx.strokeStyle = "rgba(10, 14, 32, 0.9)";
      const hint = "點擊按鈕，或按右側綠色「射 / 確定」進入遊戲";
      const hy = hasTitleImg ? 498 : 472;
      ctx.strokeText(hint, tx, hy);
      ctx.fillStyle = "#f8fafc";
      ctx.fillText(hint, tx, hy);
      ctx.restore();
    }

    drawArcadeButton(ctx, rect, label, bg, border) {
      ctx.save();
      ctx.fillStyle = bg;
      ctx.strokeStyle = border;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(rect.x, rect.y, rect.w, rect.h, 10);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 20px 'Cubic11', 'Noto Sans TC', sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(label, rect.x + rect.w * 0.5, rect.y + rect.h * 0.5);
      ctx.restore();
    }

    drawStageSelect(ctx, W, H) {
      // Deep space pixel backdrop
      ctx.fillStyle = "#070b18";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "rgba(255,255,255,0.4)";
      for (let i = 0; i < 40; i++) {
        const sx = (i * 197 + 40) % W;
        const sy = (i * 113 + 20) % H;
        ctx.fillRect(sx, sy, 2, 2);
      }

      ctx.textAlign = "center";
      ctx.fillStyle = "#fde047";
      ctx.font = "900 26px monospace";
      ctx.fillText("STAGE SELECT｜校慶接力棒次（由左至右依序接棒）", W * 0.5, 38);

      // Sequential left-to-right 4-column layout: Top = Boss, Bottom = Leg Challenger
      const colXs = [150, 360, 570, 780];
      const bossY = 72;
      const cardSize = 96;
      const runnerY = 248;

      // Horizontal relay progression line connecting bosses & runners
      ctx.strokeStyle = "#334155";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(colXs[0], bossY + cardSize * 0.5);
      ctx.lineTo(colXs[3], bossY + cardSize * 0.5);
      ctx.moveTo(colXs[0], runnerY + cardSize * 0.5);
      ctx.lineTo(colXs[3], runnerY + cardSize * 0.5);
      ctx.stroke();

      colXs.forEach((cx, idx) => {
        const st = G.STAGES[idx];
        const rn = G.RUNNERS[idx];
        const isSel = idx === this.selectedStageIdx;

        // Vertical connector between Boss and Challenger
        ctx.strokeStyle = isSel ? "#fde047" : "#475569";
        ctx.lineWidth = isSel ? 4 : 2;
        ctx.beginPath();
        ctx.moveTo(cx, bossY + cardSize);
        ctx.lineTo(cx, runnerY);
        ctx.stroke();

        // Selected column glow frame
        if (isSel) {
          ctx.fillStyle = "rgba(250, 204, 21, 0.09)";
          ctx.strokeStyle = "#fde047";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.roundRect(cx - 72, bossY - 12, 144, 326, 10);
          ctx.fill();
          ctx.stroke();
        }

        // Top: Boss Portrait Card
        const bossBox = { x: cx - cardSize * 0.5, y: bossY, w: cardSize, h: cardSize };
        ctx.fillStyle = "#0f172a";
        ctx.fillRect(bossBox.x, bossBox.y, bossBox.w, bossBox.h);
        G.Sprites.drawPortrait(ctx, st.bossKey, bossBox.x + 4, bossBox.y + 4, cardSize - 8);
        ctx.strokeStyle = isSel ? "#ffffff" : "#475569";
        ctx.lineWidth = isSel ? 4 : 2;
        ctx.strokeRect(bossBox.x, bossBox.y, bossBox.w, bossBox.h);

        ctx.fillStyle = isSel ? "#fde047" : "#cbd5e1";
        ctx.font = "bold 13px 'Cubic11', 'Noto Sans TC', sans-serif";
        ctx.fillText(`魔王：${st.bossName}`, cx, bossBox.y + cardSize + 18);

        // VS badge
        ctx.fillStyle = isSel ? "#f97316" : "#64748b";
        ctx.font = "900 15px monospace";
        ctx.fillText("VS", cx, runnerY - 22);

        // Bottom: Leg Challenger Portrait Card
        const runBox = { x: cx - cardSize * 0.5, y: runnerY, w: cardSize, h: cardSize };
        ctx.fillStyle = "#0f172a";
        ctx.fillRect(runBox.x, runBox.y, runBox.w, runBox.h);
        G.Sprites.drawPortrait(ctx, rn.portraitKey || rn.spriteKey, runBox.x + 4, runBox.y + 4, cardSize - 8);
        ctx.strokeStyle = isSel ? "#38bdf8" : "#475569";
        ctx.lineWidth = isSel ? 4 : 2;
        ctx.strokeRect(runBox.x, runBox.y, runBox.w, runBox.h);

        ctx.fillStyle = isSel ? "#38bdf8" : "#94a3b8";
        ctx.font = "bold 13px 'Cubic11', 'Noto Sans TC', sans-serif";
        ctx.fillText(rn.name, cx, runBox.y + cardSize + 18);

        const onPick = () => {
          G.Audio.play("confirm");
          if (this.selectedStageIdx === idx) {
            this.startRelayRun(idx, "relay");
          } else {
            this.selectedStageIdx = idx;
          }
        };
        this.hitboxes.push({ ...bossBox, onClick: onPick });
        this.hitboxes.push({ ...runBox, onClick: onPick });
      });

      // Bottom dialogue/info panel
      const selRunner = G.RUNNERS[this.selectedStageIdx];
      ctx.fillStyle = "#0b1120";
      ctx.strokeStyle = "#f97316";
      ctx.lineWidth = 3;
      ctx.fillRect(60, 424, 520, 84);
      ctx.strokeRect(60, 424, 520, 84);

      ctx.textAlign = "left";
      ctx.fillStyle = "#fb923c";
      ctx.font = "bold 16px 'Cubic11', 'Noto Sans TC', sans-serif";
      ctx.fillText(`${selRunner.name}（${selRunner.role}）｜武器：${selRunner.weaponName}`, 78, 452);
      ctx.fillStyle = "#f8fafc";
      ctx.font = "15px 'Cubic11', 'Noto Sans TC', sans-serif";
      ctx.fillText(`「${selRunner.quote}」`, 78, 484);

      const startBtn = { x: 620, y: 434, w: 260, h: 64 };
      this.drawArcadeButton(ctx, startBtn, "按「射」從這棒出發！", "#16a34a", "#bbf7d0");
      this.hitboxes.push({
        ...startBtn,
        onClick: () => {
          G.Audio.play("confirm");
          this.startRelayRun(this.selectedStageIdx, "relay");
        }
      });
    }

    drawHUD(ctx, stage, W) {
      // Top-left: Vertical Segmented Player HP Bar
      this.drawVerticalBar(ctx, 18, 18, 18, 92, this.player.hp / G.CONST.MAX_HP, "#facc15", "#ef4444", "♥");

      // Boss Vertical HP Bar right next to it during Boss fights
      if (this.boss && this.boss.active) {
        this.drawVerticalBar(ctx, 44, 18, 18, 92, this.boss.hp / this.boss.maxHp, "#ec4899", "#991b1b", "王");
      }

      // Super Charge Bar
      const barX = this.boss && this.boss.active ? 74 : 48;
      ctx.save();
      ctx.fillStyle = "#0f172a";
      ctx.strokeStyle = "#eab308";
      ctx.lineWidth = 3;
      ctx.fillRect(barX, 24, 146, 22);
      ctx.strokeRect(barX, 24, 146, 22);
      const pct = Math.min(1, this.player.superCharge / G.CONST.MAX_SUPER);
      ctx.fillStyle = pct >= 1 ? "#fef08a" : "#fbbf24";
      ctx.fillRect(barX + 3, 27, 140 * pct, 16);

      ctx.fillStyle = "#fbbf24";
      ctx.font = "bold 16px sans-serif";
      ctx.fillText("★", barX - 2, 41);
      ctx.font = "bold 12px 'Cubic11', 'Noto Sans TC', sans-serif";
      ctx.lineWidth = 3;
      ctx.strokeStyle = "rgba(15, 23, 42, 0.85)";
      const superText = pct >= 1 ? "絕招就緒！按 E /「絕」發動" : `絕招能量 ${Math.floor(pct * 100)}%`;
      ctx.strokeText(superText, barX, 64);
      ctx.fillStyle = pct >= 1 ? "#fef08a" : "#e2e8f0";
      ctx.fillText(superText, barX, 64);

      // Weapon ammo indicator
      if (this.player.powerWeapon) {
        const w = G.WEAPONS[this.player.powerWeapon] || G.WEAPONS.W;
        ctx.fillStyle = w.color;
        ctx.font = "bold 13px 'Cubic11', 'Noto Sans TC', sans-serif";
        ctx.fillText(`[${w.code}] ${w.label} x${this.player.powerAmmo}`, barX, 84);
      }
      if (this.player.fatTimer > 0) {
        ctx.fillStyle = "#fb923c";
        ctx.font = "bold 13px 'Cubic11', 'Noto Sans TC', sans-serif";
        ctx.fillText(`🍔 變胖保齡球模式 ${this.player.fatTimer.toFixed(1)}s`, barX, 104);
      }
      ctx.restore();

      // Flashing Dropped Baton Crisis Warning!
      if (this.droppedBaton && this.droppedBaton.active && Math.floor(this.time * 6) % 2 === 0) {
        ctx.save();
        ctx.fillStyle = "rgba(185, 28, 28, 0.92)";
        ctx.strokeStyle = "#fef08a";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.roundRect(W * 0.5 - 210, 68, 420, 38, 8);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#fef08a";
        ctx.font = "900 16px 'Cubic11', 'Noto Sans TC', sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("⚠️ 掉棒危機！快往回撿接力棒（時間 3× 狂扣中）！", W * 0.5, 87);
        ctx.restore();
      }

      // Top-center: Ornate Tip Banner (when triggered)
      if (this.tipBanner) {
        ctx.save();
        const bw = 440;
        const bh = 48;
        const bx = (W - bw) * 0.5;
        ctx.fillStyle = "#fef9c3";
        ctx.strokeStyle = "#ca8a04";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.roundRect(bx, 12, bw, bh, 8);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "#78350f";
        ctx.font = "bold 14px 'Cubic11', 'Noto Sans TC', sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(this.tipBanner.text, W * 0.5, 36);
        ctx.restore();
      }

      // Top-right: Relay Progress Bar (like reference video's top-right meter)
      const prog = Math.max(0, Math.min(1, this.player.x / (stage.length + 145)));
      ctx.save();
      ctx.fillStyle = "#0f172a";
      ctx.strokeStyle = "#06b6d4";
      ctx.lineWidth = 3;
      ctx.fillRect(W - 224, 18, 198, 26);
      ctx.strokeRect(W - 224, 18, 198, 26);
      ctx.fillStyle = prog > 0.8 ? "#4ade80" : "#38bdf8";
      ctx.fillRect(W - 220, 22, 190 * prog, 18);

      ctx.font = "bold 13px 'Cubic11', 'Noto Sans TC', sans-serif";
      ctx.textAlign = "right";
      ctx.lineWidth = 3;
      ctx.strokeStyle = "rgba(15, 23, 42, 0.88)";
      const progText = `第${this.currentStageIdx + 1}/4棒 進度 ${Math.round(prog * 100)}%`;
      const statText = `時間 ${this.totalRelayTime.toFixed(1)}s ｜ 分數 ${this.score}`;
      ctx.strokeText(progText, W - 26, 62);
      ctx.fillStyle = "#ffffff";
      ctx.fillText(progText, W - 26, 62);
      ctx.strokeText(statText, W - 26, 82);
      ctx.fillStyle = "#fde047";
      ctx.fillText(statText, W - 26, 82);
      ctx.restore();
    }

    drawSuperCinematic(ctx, W, H) {
      const sc = this.superCinematic;
      const p = sc.timer / sc.maxTimer;
      const elapsed = 1 - p;
      ctx.save();
      // Golden flash on start
      if (p > 0.8) {
        ctx.fillStyle = `rgba(254, 240, 138, ${(p - 0.8) * 3.2})`;
        ctx.fillRect(0, 0, W, H);
      }

      const cutinKey = "cutin_" + ((sc.runnerIndex || 0) + 1);
      const cutinImg = G.Assets && G.Assets.images[cutinKey];
      const hasCutin = cutinImg && cutinImg.complete && cutinImg.naturalWidth > 0;

      if (hasCutin) {
        const bandY = 104;
        const bandH = 216;
        // Slide-in ease on entry, slight slide-out at very end
        const slideIn = elapsed < 0.16 ? 1 - Math.pow(1 - elapsed / 0.16, 3) : 1;
        const slideOut = p < 0.12 ? p / 0.12 : 1;
        const offsetX = (1 - slideIn) * -W * 0.45 + (1 - slideOut) * W * 0.35;

        ctx.save();
        ctx.beginPath();
        ctx.rect(0, bandY, W, bandH);
        ctx.clip();

        ctx.fillStyle = "#090d16";
        ctx.fillRect(0, bandY, W, bandH);

        // Cover-fit artwork inside band (slight zoom to crop thin top/bottom letterbox bars)
        const scale = Math.max(W / cutinImg.naturalWidth, (bandH * 1.12) / cutinImg.naturalHeight);
        const dw = cutinImg.naturalWidth * scale;
        const dh = cutinImg.naturalHeight * scale;
        const dx = (W - dw) * 0.5 + offsetX;
        const dy = bandY + (bandH - dh) * 0.5;
        ctx.globalAlpha = Math.min(1, slideOut * 1.2);
        ctx.drawImage(cutinImg, dx, dy, dw, dh);

        // Speed streaks over edges
        ctx.fillStyle = "rgba(56, 189, 248, 0.24)";
        for (let i = 0; i < 6; i++) {
          const sx = ((this.time * 1400 + i * 190) % (W + 220)) - 180;
          ctx.fillRect(sx, bandY + 12 + i * 34, 130, 5);
        }

        // Bottom caption strip (keeps eyes/face unobstructed)
        const capGrad = ctx.createLinearGradient(0, bandY + bandH - 64, 0, bandY + bandH);
        capGrad.addColorStop(0, "rgba(9, 13, 22, 0)");
        capGrad.addColorStop(1, "rgba(9, 13, 22, 0.88)");
        ctx.fillStyle = capGrad;
        ctx.fillRect(0, bandY + bandH - 64, W, 64);

        ctx.textAlign = "left";
        ctx.lineWidth = 4;
        ctx.strokeStyle = "rgba(9, 13, 22, 0.95)";
        ctx.font = "900 15px monospace";
        ctx.strokeText("SUPER RELAY BURST!!", 28, bandY + bandH - 38);
        ctx.fillStyle = "#38bdf8";
        ctx.fillText("SUPER RELAY BURST!!", 28, bandY + bandH - 38);

        ctx.font = "900 32px 'Cubic11', 'Noto Sans TC', sans-serif";
        ctx.strokeText(sc.title, 28, bandY + bandH - 10);
        ctx.fillStyle = "#fde047";
        ctx.fillText(sc.title, 28, bandY + bandH - 10);
        ctx.restore();

        // Top & bottom golden borders
        ctx.fillStyle = "#fde047";
        ctx.fillRect(0, bandY, W, 4);
        ctx.fillRect(0, bandY + bandH - 4, W, 4);
      } else {
        // Fallback portrait banner
        const bandY = 148;
        const bandH = 128;
        ctx.fillStyle = "rgba(15, 23, 42, 0.86)";
        ctx.fillRect(0, bandY, W, bandH);
        ctx.fillStyle = "#fde047";
        ctx.fillRect(0, bandY, W, 4);
        ctx.fillRect(0, bandY + bandH - 4, W, 4);

        ctx.fillStyle = "rgba(56, 189, 248, 0.32)";
        for (let i = 0; i < 6; i++) {
          const sx = ((this.time * 1200 + i * 190) % (W + 200)) - 150;
          ctx.fillRect(sx, bandY + 14 + i * 18, 120, 6);
        }

        G.Sprites.drawPortrait(ctx, sc.portraitKey, 74, bandY + 10, 108);
        ctx.strokeStyle = "#fde047";
        ctx.lineWidth = 3;
        ctx.strokeRect(74, bandY + 10, 108, 108);

        ctx.textAlign = "left";
        ctx.fillStyle = "#38bdf8";
        ctx.font = "900 18px monospace";
        ctx.fillText("SUPER RELAY BURST!!", 206, bandY + 42);
        ctx.fillStyle = "#fde047";
        ctx.font = "900 42px 'Cubic11', 'Noto Sans TC', sans-serif";
        ctx.fillText(sc.title, 206, bandY + 96);
      }
      ctx.restore();
    }

    drawVerticalBar(ctx, x, y, w, h, ratio, topCol, botCol, icon) {
      ctx.save();
      ctx.fillStyle = "#0f172a";
      ctx.strokeStyle = "#cbd5e1";
      ctx.lineWidth = 3;
      ctx.fillRect(x, y, w, h);
      ctx.strokeRect(x, y, w, h);

      const clamped = Math.max(0, Math.min(1, ratio));
      const fillH = (h - 6) * clamped;
      const grad = ctx.createLinearGradient(0, y, 0, y + h);
      grad.addColorStop(0, topCol);
      grad.addColorStop(1, botCol);
      ctx.fillStyle = grad;
      ctx.fillRect(x + 3, y + h - 3 - fillH, w - 6, fillH);

      // Segmented ticks
      ctx.fillStyle = "rgba(15,23,42,0.45)";
      for (let sy = y + 8; sy < y + h - 6; sy += 8) {
        ctx.fillRect(x + 3, sy, w - 6, 2);
      }

      ctx.fillStyle = "#ef4444";
      ctx.font = "bold 14px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(icon, x + w * 0.5, y + h + 15);
      ctx.restore();
    }

    drawDialogueOverlay(ctx, W, H) {
      const line = this.dialogueLines[this.dialogueIndex];
      if (!line) return;

      ctx.save();
      ctx.fillStyle = "rgba(10, 15, 36, 0.94)";
      ctx.strokeStyle = "#f8fafc";
      ctx.lineWidth = 4;
      ctx.fillRect(36, H - 144, W - 72, 114);
      ctx.strokeRect(36, H - 144, W - 72, 114);

      // Speaker tag
      ctx.fillStyle = "#1e3a8a";
      ctx.strokeStyle = "#bae6fd";
      ctx.lineWidth = 2;
      ctx.fillRect(58, H - 166, 210, 32);
      ctx.strokeRect(58, H - 166, 210, 32);
      ctx.fillStyle = "#fde047";
      ctx.font = "bold 15px 'Cubic11', 'Noto Sans TC', sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(line.speaker, 163, H - 150);

      // Portrait on right side like reference video
      const px = W - 168;
      const py = H - 158;
      ctx.fillStyle = "#0f172a";
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 3;
      ctx.fillRect(px, py, 118, 118);
      ctx.strokeRect(px, py, 118, 118);
      G.Sprites.drawPortrait(ctx, line.portrait, px + 4, py + 4, 110);

      // Dialogue text
      ctx.fillStyle = "#ffffff";
      ctx.font = "20px 'Cubic11', 'Noto Sans TC', sans-serif";
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillText(line.text, 62, H - 114);

      ctx.fillStyle = "#fde047";
      ctx.font = "bold 13px 'Cubic11', 'Noto Sans TC', sans-serif";
      ctx.fillText("按「射 / 確定」或點擊畫面繼續 ▶", 62, H - 56);
      ctx.restore();
    }

    drawBatonQTEOverlay(ctx, W, H) {
      ctx.save();
      ctx.fillStyle = "rgba(7, 11, 25, 0.65)";
      ctx.fillRect(0, 0, W, H);

      ctx.textAlign = "center";
      ctx.fillStyle = "#fde047";
      ctx.font = "900 32px 'Cubic11', 'Noto Sans TC', sans-serif";
      ctx.fillText("接棒區！抓準時機按「射」傳棒！", W * 0.5, 165);

      const barX = W * 0.5 - 240;
      const barY = 230;
      const barW = 480;
      const barH = 36;

      ctx.fillStyle = "#1e293b";
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 4;
      ctx.fillRect(barX, barY, barW, barH);
      ctx.strokeRect(barX, barY, barW, barH);

      // GOOD zone
      ctx.fillStyle = "#22c55e";
      ctx.fillRect(barX + barW * 0.26, barY + 4, barW * 0.48, barH - 8);
      // PERFECT center zone
      ctx.fillStyle = "#facc15";
      ctx.fillRect(barX + barW * 0.39, barY + 4, barW * 0.22, barH - 8);

      // Moving baton marker
      const mx = barX + this.qte.cursor * barW;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(mx - 6, barY - 8, 12, barH + 16);
      ctx.fillStyle = "#ef4444";
      ctx.fillRect(mx - 4, barY - 6, 8, barH + 12);

      if (this.qte.resolved) {
        ctx.fillStyle = "#fef08a";
        ctx.font = "900 36px 'Cubic11', 'Noto Sans TC', sans-serif";
        ctx.fillText(this.qte.resultText, W * 0.5, 330);
      } else {
        const btn = { x: W * 0.5 - 110, y: 300, w: 220, h: 52 };
        this.drawArcadeButton(ctx, btn, "交出接力棒！", "#16a34a", "#bbf7d0");
        this.hitboxes.push({
          ...btn,
          onClick: () => this.resolveBatonQTE()
        });
      }
      ctx.restore();
    }

    drawVictoryOverlay(ctx, W, H) {
      ctx.save();
      ctx.fillStyle = "rgba(8, 12, 30, 0.72)";
      ctx.fillRect(0, 0, W, H);

      ctx.textAlign = "center";
      const clearImg = G.Assets.images.ui_clear;
      if (clearImg && clearImg.complete && clearImg.naturalWidth > 0) {
        const ch = 76;
        const cw = clearImg.naturalWidth * (ch / clearImg.naturalHeight);
        ctx.drawImage(clearImg, (W - cw) * 0.5, 16, cw, ch);
      }
      ctx.fillStyle = "#fde047";
      ctx.font = "900 40px 'Cubic11', 'Noto Sans TC', sans-serif";
      ctx.fillText("衝破終點彩帶！大隊接力完賽！", W * 0.5, 128);

      const rank = this.score >= 5500 ? "S 級・校慶金牌王者" : this.score >= 3800 ? "A 級・飛毛腿菁英" : "B 級・熱血完賽獎";
      ctx.fillStyle = "#38bdf8";
      ctx.font = "bold 26px 'Cubic11', 'Noto Sans TC', sans-serif";
      ctx.fillText(rank, W * 0.5, 174);

      ctx.fillStyle = "#f8fafc";
      ctx.font = "20px 'Cubic11', 'Noto Sans TC', sans-serif";
      ctx.fillText(`總完賽時間：${this.totalRelayTime.toFixed(1)} 秒 ｜ 總得分：${this.score}`, W * 0.5, 224);
      ctx.fillText(`交棒表現：${this.passRatings.join(" → ") || "直衝終點！"}`, W * 0.5, 260);

      for (let i = 0; i < 4; i++) {
        G.Sprites.drawRunner(ctx, i, W * 0.5 - 135 + i * 90, 380, 1, "run", this.time + i * 0.3, {});
      }

      const btn = { x: W * 0.5 - 130, y: 422, w: 260, h: 56 };
      this.drawArcadeButton(ctx, btn, "再跑一次 / 選關", "#16a34a", "#bbf7d0");
      this.hitboxes.push({
        ...btn,
        onClick: () => {
          G.Audio.play("confirm");
          this.state = "STAGE_SELECT";
          G.Audio.setBgm("none");
        }
      });
      ctx.restore();
    }

    drawGameOverOverlay(ctx, W, H) {
      ctx.save();
      ctx.fillStyle = "rgba(15, 6, 12, 0.78)";
      ctx.fillRect(0, 0, W, H);

      ctx.textAlign = "center";
      ctx.fillStyle = "#f87171";
      ctx.font = "900 42px 'Cubic11', 'Noto Sans TC', sans-serif";
      ctx.fillText("體力耗盡！休息一下再衝！", W * 0.5, 180);

      ctx.fillStyle = "#e2e8f0";
      ctx.font = "20px 'Cubic11', 'Noto Sans TC', sans-serif";
      ctx.fillText("大庄國小的運動精神就是跌倒了再爬起來！", W * 0.5, 234);

      const btn1 = { x: W * 0.5 - 220, y: 310, w: 200, h: 56 };
      const btn2 = { x: W * 0.5 + 20, y: 310, w: 200, h: 56 };
      this.drawArcadeButton(ctx, btn1, "從本棒重試", "#16a34a", "#bbf7d0");
      this.drawArcadeButton(ctx, btn2, "回到選關", "#1d4ed8", "#bae6fd");

      this.hitboxes.push({
        ...btn1,
        onClick: () => {
          G.Audio.play("confirm");
          this.enterStageDialogue(this.currentStageIdx, true);
        }
      });
      this.hitboxes.push({
        ...btn2,
        onClick: () => {
          G.Audio.play("confirm");
          this.state = "STAGE_SELECT";
        }
      });
      ctx.restore();
    }
  }

  G.GameController = GameController;
})(window.RelayGame);
