window.RelayGame = window.RelayGame || {};

(function (G) {
  "use strict";

  class Particle {
    constructor(x, y, vx, vy, color, size, life, gravity) {
      this.x = x;
      this.y = y;
      this.vx = vx;
      this.vy = vy;
      this.color = color;
      this.size = size || 5;
      this.life = life || 0.45;
      this.maxLife = this.life;
      this.gravity = gravity || 0;
    }

    update(dt) {
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      this.vy += this.gravity * dt;
      this.life -= dt;
    }

    draw(ctx, camX) {
      if (this.life <= 0) return;
      ctx.save();
      ctx.globalAlpha = Math.max(0, this.life / this.maxLife);
      ctx.fillStyle = this.color;
      ctx.fillRect(this.x - camX - this.size * 0.5, this.y - this.size * 0.5, this.size, this.size);
      ctx.restore();
    }
  }

  class SpeechBubble {
    constructor(owner, text, duration) {
      this.owner = owner;
      this.text = text;
      this.life = duration || 2.1;
    }

    update(dt) {
      this.life -= dt;
    }

    draw(ctx, camX) {
      if (this.life <= 0 || !this.owner) return;
      const sx = this.owner.x - camX;
      const sy = (this.owner.y || G.CONST.GROUND_Y) - (this.owner.bubbleOffset || 105);

      ctx.save();
      ctx.font = "bold 13px 'Cubic11', 'Noto Sans TC', sans-serif";
      const padX = 12;
      const textW = Math.max(70, ctx.measureText(this.text).width);
      const boxW = textW + padX * 2;
      const boxH = 28;
      const bx = Math.max(8, Math.min(G.CONST.W - boxW - 8, sx - boxW * 0.5));
      const by = Math.max(46, sy - boxH);

      ctx.fillStyle = "rgba(255, 255, 255, 0.96)";
      ctx.strokeStyle = "#334155";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(bx, by, boxW, boxH, 6);
      ctx.fill();
      ctx.stroke();

      // Tail triangle
      ctx.beginPath();
      ctx.moveTo(sx - 5, by + boxH);
      ctx.lineTo(sx + 5, by + boxH);
      ctx.lineTo(sx, by + boxH + 7);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#0f172a";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(this.text, bx + boxW * 0.5, by + boxH * 0.5);
      ctx.restore();
    }
  }

  class Projectile {
    constructor(opts) {
      this.x = opts.x;
      this.y = opts.y;
      this.vx = opts.vx;
      this.vy = opts.vy || 0;
      this.fromPlayer = !!opts.fromPlayer;
      this.kind = opts.kind || "cheer";
      this.damage = opts.damage || 1;
      this.pierce = !!opts.pierce;
      this.bounce = !!opts.bounce;
      this.explosive = !!opts.explosive;
      this.knockback = !!opts.knockback;
      this.gravity = opts.gravity || 0;
      this.color = opts.color || "#fde047";
      this.life = opts.life || 2.0;
      this.radius = opts.radius || 12;
      this.hitIds = new Set();
    }

    update(dt) {
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      this.vy += this.gravity * dt;
      if (this.bounce && this.y >= G.CONST.GROUND_Y - 10) {
        this.y = G.CONST.GROUND_Y - 10;
        this.vy = -Math.abs(this.vy) * 0.85 - 180;
      }
      this.life -= dt;
    }

    draw(ctx, camX) {
      G.Sprites.drawProjectile(ctx, this, this.x - camX, this.y);
    }
  }

  class Player {
    constructor(runnerIndex) {
      this.runnerIndex = runnerIndex;
      this.runner = G.RUNNERS[runnerIndex] || G.RUNNERS[0];
      this.x = 120;
      this.y = G.CONST.GROUND_Y;
      this.vx = 0;
      this.vy = 0;
      this.facing = 1;
      this.hp = G.CONST.MAX_HP;
      this.superCharge = 25;
      this.jumpsLeft = 2;
      this.onGround = true;

      this.dashTimer = 0;
      this.dashCooldown = 0;
      this.invulnTimer = 0;
      this.slipTimer = 0;
      this.knockbackTimer = 0;
      this.spikesTimer = 0;
      this.drinkAuraTimer = 0;
      this.superTimer = 0;
      this.fireTimer = 0;
      this.recoilTimer = 0;
      this.meleeTimer = 0;
      this.fullness = 0;
      this.fatTimer = 0;

      this.powerWeapon = null;
      this.powerAmmo = 0;
      this.afterimages = [];
      this.bubbleOffset = 104;
    }

    setRunner(runnerIndex, keepStats) {
      this.runnerIndex = runnerIndex;
      this.runner = G.RUNNERS[runnerIndex] || G.RUNNERS[0];
      this.slipTimer = 0;
      this.knockbackTimer = 0;
      this.meleeTimer = 0;
      this.fullness = 0;
      this.fatTimer = 0;
      if (!keepStats) {
        this.hp = G.CONST.MAX_HP;
        this.superCharge = 25;
        this.powerWeapon = null;
        this.powerAmmo = 0;
        this.drinkAuraTimer = 0;
        this.spikesTimer = 0;
      }
    }

    update(dt, input, stage, game) {
      if (this.invulnTimer > 0) this.invulnTimer -= dt;
      if (this.dashCooldown > 0) this.dashCooldown -= dt;
      if (this.fireTimer > 0) this.fireTimer -= dt;
      if (this.recoilTimer > 0) this.recoilTimer -= dt;
      if (this.meleeTimer > 0) this.meleeTimer -= dt;
      if (this.spikesTimer > 0) this.spikesTimer -= dt;
      if (this.drinkAuraTimer > 0) this.drinkAuraTimer -= dt;
      if (this.superTimer > 0) this.superTimer -= dt;
      if (this.fatTimer > 0) {
        this.fatTimer -= dt;
        if (this.fatTimer <= 0) {
          this.fullness = 0;
          game.addBubble(this, "呼～消化完恢復苗條了！", 1.5);
        }
      }

      // Update dash afterimages
      for (let i = this.afterimages.length - 1; i >= 0; i--) {
        this.afterimages[i].life -= dt;
        if (this.afterimages[i].life <= 0) this.afterimages.splice(i, 1);
      }

      const windForce = this.dashTimer > 0 || this.superTimer > 0 ? 0 : (stage.wind || 0);
      const isFat = this.fatTimer > 0;
      const speedMult =
        this.runner.speedMult *
        (this.spikesTimer > 0 ? 1.24 : 1) *
        (this.drinkAuraTimer > 0 ? 1.18 : 1) *
        (this.superTimer > 0 ? 1.35 : 1) *
        (isFat ? 0.74 : 1);

      if (this.knockbackTimer > 0) {
        this.knockbackTimer -= dt;
        this.vx *= 0.96;
      } else if (this.slipTimer > 0) {
        this.slipTimer -= dt;
        // Faceplant slide physics
        if (Math.random() < 0.4) game.spawnDust(this.x, this.y, 1);
        this.vx *= 0.96;
      } else if (this.dashTimer > 0) {
        this.dashTimer -= dt;
        this.vx = this.facing * G.CONST.DASH_SPEED;
        this.vy = 0;
        this.afterimages.push({ x: this.x, y: this.y, facing: this.facing, life: 0.16 });
      } else {
        const moveX = input.moveX;
        if (Math.abs(moveX) > 0.12) {
          this.facing = moveX > 0 ? 1 : -1;
          this.vx = moveX * G.CONST.PLAYER_SPEED * speedMult + windForce;
        } else {
          this.vx = windForce * 0.55;
        }
      }

      // Jump / Double Jump
      if (input.jumpPressed && this.slipTimer <= 0 && this.knockbackTimer <= 0 && this.jumpsLeft > 0) {
        const isFirst = this.jumpsLeft === 2;
        this.vy = isFirst ? G.CONST.JUMP_VEL : G.CONST.DOUBLE_JUMP_VEL;
        this.onGround = false;
        this.jumpsLeft--;
        G.Audio.play(isFirst ? "jump" : "doubleJump");
        game.spawnDust(this.x, this.y, 6);
      }

      // Dash (also burns fat timer!)
      if (input.dashPressed && this.dashCooldown <= 0 && this.slipTimer <= 0 && this.knockbackTimer <= 0) {
        this.dashTimer = G.CONST.DASH_DURATION;
        this.dashCooldown = G.CONST.DASH_COOLDOWN;
        this.invulnTimer = Math.max(this.invulnTimer, 0.24);
        if (this.fatTimer > 0) {
          this.fatTimer = Math.max(0, this.fatTimer - 2.5);
        }
        G.Audio.play("dash");
        game.spawnDust(this.x, this.y, 8);
      }

      // Attack: Close-range Baton Melee OR Ranged Weapon
      if (input.shootHeld && this.fireTimer <= 0 && this.slipTimer <= 0 && this.knockbackTimer <= 0) {
        if (input.shootPressed && this.tryMelee(game)) {
          this.fireTimer = 0.22;
        } else {
          this.shoot(game);
        }
      }

      // Super Skill
      if (input.superPressed && this.superCharge >= G.CONST.MAX_SUPER) {
        this.activateSuper(game);
      }

      // Physics integration
      const prevY = this.y;
      this.x += this.vx * dt;
      if (this.dashTimer <= 0) {
        this.vy = Math.min(G.CONST.MAX_FALL, this.vy + G.CONST.GRAVITY * dt);
        this.y += this.vy * dt;
      }

      this.onGround = false;
      // Platform landing
      if (this.vy >= 0 && !input.downHeld) {
        for (let i = 0; i < stage.platforms.length; i++) {
          const p = stage.platforms[i];
          if (this.x >= p.x - 12 && this.x <= p.x + p.w + 12) {
            if (prevY <= p.y + 8 && this.y >= p.y) {
              this.y = p.y;
              this.vy = 0;
              this.onGround = true;
              this.jumpsLeft = 2;
              break;
            }
          }
        }
      }

      // Main track floor
      if (this.y >= G.CONST.GROUND_Y) {
        this.y = G.CONST.GROUND_Y;
        this.vy = 0;
        this.onGround = true;
        this.jumpsLeft = 2;
      }

      // Horizontal bounds
      const minX = game.bossLock ? game.bossLock.minX + 36 : 36;
      const maxX = game.bossLock ? game.bossLock.maxX - 36 : stage.length + 220;
      this.x = Math.max(minX, Math.min(maxX, this.x));
    }

    tryMelee(game) {
      const reach = 86;
      const inFront = (tx) => (tx - this.x) * this.facing >= -14 && (tx - this.x) * this.facing <= reach;
      let hitSomething = false;
      const meleeDmg = this.fatTimer > 0 ? 6 : 3;

      // Knock away cones & hurdles
      game.traps.forEach((tr) => {
        if (tr.active && (tr.type === "cone" || tr.type === "hurdle") && inFront(tr.x)) {
          tr.active = false;
          hitSomething = true;
          game.score += 80;
          game.spawnSparks(tr.x, G.CONST.GROUND_Y - 24, "#fde047", 10);
        }
      });

      // Deflect enemy projectiles
      for (let i = game.projectiles.length - 1; i >= 0; i--) {
        const pr = game.projectiles[i];
        if (!pr.fromPlayer && inFront(pr.x) && Math.abs(pr.y - (this.y - 45)) < 60) {
          pr.fromPlayer = true;
          pr.vx = this.facing * 520;
          pr.vy = -120;
          pr.damage = 2;
          hitSomething = true;
          game.spawnSparks(pr.x, pr.y, "#38bdf8", 8);
        }
      }

      // Strike & push enemies
      game.enemies.forEach((en) => {
        if (en.active && !en.calmed && inFront(en.x) && Math.abs(en.y - this.y) < 75) {
          en.x += this.facing * 52;
          en.hit(meleeDmg, game);
          hitSomething = true;
        }
      });

      // Strike boss
      if (game.boss && game.boss.active && game.boss.state !== "defeated" && inFront(game.boss.x)) {
        game.boss.hit(meleeDmg, game);
        hitSomething = true;
      }

      if (hitSomething) {
        this.meleeTimer = 0.22;
        G.Audio.play("hit");
        if (G.VFX) G.VFX.spawn("hitSlash", this.x + this.facing * 44, this.y - 46, { dir: this.facing, scale: this.fatTimer > 0 ? 1.4 : 1 });
        game.showTip("melee");
      }
      return hitSomething;
    }

    shoot(game) {
      this.recoilTimer = 0.08;
      const muzzleX = this.x + this.facing * 30;
      const muzzleY = this.y - 46;
      const isFat = this.fatTimer > 0;

      if (this.powerWeapon && this.powerAmmo > 0) {
        const w = G.WEAPONS[this.powerWeapon] || G.WEAPONS.W;
        this.fireTimer = w.cooldown;
        this.powerAmmo--;
        if (this.powerWeapon === "W" || this.powerWeapon === "H") {
          G.Audio.play("shoot");
          game.projectiles.push(
            new Projectile({
              x: muzzleX,
              y: muzzleY + (Math.random() * 10 - 5),
              vx: this.facing * 790,
              vy: Math.random() * 44 - 22,
              fromPlayer: true,
              kind: "water",
              damage: w.damage
            })
          );
        } else if (this.powerWeapon === "D") {
          G.Audio.play("shoot");
          game.projectiles.push(
            new Projectile({
              x: muzzleX,
              y: muzzleY,
              vx: this.facing * 560,
              vy: -130,
              gravity: 920,
              bounce: true,
              fromPlayer: true,
              kind: isFat ? "giantBowling" : "dodgeball",
              damage: isFat ? 6 : w.damage,
              radius: isFat ? 26 : 14,
              pierce: isFat,
              knockback: isFat,
              life: 1.7
            })
          );
        } else if (this.powerWeapon === "M" || this.powerWeapon === "S" || this.powerWeapon === "L") {
          G.Audio.play("shootLaser");
          game.projectiles.push(
            new Projectile({
              x: muzzleX,
              y: muzzleY,
              vx: this.facing * 680,
              fromPlayer: true,
              kind: "sonic",
              damage: w.damage,
              radius: 26,
              pierce: true,
              knockback: true,
              life: 0.75
            })
          );
        } else if (this.powerWeapon === "B") {
          G.Audio.play("shoot");
          game.projectiles.push(
            new Projectile({
              x: muzzleX,
              y: muzzleY - 8,
              vx: this.facing * 430,
              vy: -360,
              gravity: 980,
              explosive: true,
              fromPlayer: true,
              kind: "baseball",
              damage: w.damage,
              life: 1.8
            })
          );
        }
        if (this.powerAmmo <= 0) this.powerWeapon = null;
        return;
      }

      // Runner signature weapon
      const rk = this.runner.weaponKey;
      this.fireTimer = this.runner.fireCooldown;
      G.Audio.play(rk === "rainbow" ? "shootLaser" : "shoot");

      if (rk === "dodgeball" || isFat) {
        game.projectiles.push(
          new Projectile({
            x: muzzleX,
            y: muzzleY,
            vx: this.facing * 540,
            vy: -140,
            gravity: 950,
            bounce: true,
            fromPlayer: true,
            kind: isFat ? "giantBowling" : "dodgeball",
            damage: isFat ? 5 : 2,
            radius: isFat ? 26 : 12,
            pierce: isFat,
            knockback: isFat,
            life: 1.6
          })
        );
      } else if (rk === "rainbow") {
        game.projectiles.push(
          new Projectile({
            x: muzzleX,
            y: muzzleY,
            vx: this.facing * 760,
            fromPlayer: true,
            kind: "rainbow",
            damage: 2,
            pierce: true
          })
        );
      } else {
        game.projectiles.push(
          new Projectile({
            x: muzzleX,
            y: muzzleY,
            vx: this.facing * 700,
            fromPlayer: true,
            kind: rk,
            damage: 1
          })
        );
      }
    }

    activateSuper(game) {
      this.superCharge = 0;
      this.invulnTimer = 4.9;
      G.Audio.play("super");
      game.screenShake = 0.25;
      game.crowdMood = "cheer";
      game.crowdMoodTimer = 4.5;
      game.superCinematic = {
        timer: 2.1,
        maxTimer: 2.1,
        runnerIndex: this.runnerIndex,
        title: this.runner.superName,
        portraitKey: this.runner.portraitKey || this.runner.spriteKey,
        onEnd: () => {
          if (game.state === "PLAYING" || game.state === "BOSS_FIGHT") {
            this.triggerSuperBurst(game);
          }
        }
      };
      game.addBubble(this, `${this.runner.superName}！`, 2.2);
    }

    triggerSuperBurst(game) {
      this.superTimer = 2.8;
      this.invulnTimer = Math.max(this.invulnTimer, 3.2);
      game.screenShake = 0.48;

      // Runner-specific visual projectile spectacle across the screen
      if (G.VFX) {
        G.VFX.spawn("shockwave", this.x, this.y - 10, { color: "#fde047", scale: 1.5 });
        G.VFX.spawn("healBloom", this.x, this.y, { scale: 1.4 });
      }
      if (this.runnerIndex === 0) {
        // Leg 1: Sonic speed waves + 6-frame sonic fan burst
        if (G.VFX) {
          G.VFX.spawn("p1SonicFan", this.x + this.facing * 95, this.y - 46, { dir: this.facing, life: 0.75, scale: 1.15 });
        }
        for (let k = -2; k <= 2; k++) {
          game.projectiles.push(
            new Projectile({
              x: this.x + 20,
              y: this.y - 45 + k * 22,
              vx: this.facing * 950,
              vy: k * 35,
              fromPlayer: true,
              kind: "superWave",
              damage: 5,
              pierce: true,
              life: 1.1
            })
          );
        }
      } else if (this.runnerIndex === 1) {
        // Leg 2: Sweeping emerald tornadoes
        for (let k = 0; k < 4; k++) {
          if (G.VFX) G.VFX.spawn("whirlwind", game.camX + 160 + k * 210, G.CONST.GROUND_Y - 12, { scale: 1.3 });
          game.projectiles.push(
            new Projectile({
              x: game.camX + 120 + k * 210,
              y: G.CONST.GROUND_Y - 50,
              vx: 380,
              fromPlayer: true,
              kind: "superTornado",
              damage: 5,
              pierce: true,
              life: 1.4
            })
          );
        }
      } else if (this.runnerIndex === 2) {
        // Leg 3: Raining flaming dodgeballs + impact explosions!
        for (let k = 0; k < 12; k++) {
          if (G.VFX && k % 3 === 0) {
            G.VFX.spawn("p3DodgeImpact", game.camX + 120 + k * 75, G.CONST.GROUND_Y - 12, { scale: 1.0, life: 0.85 });
          }
          game.projectiles.push(
            new Projectile({
              x: game.camX + 70 + k * 75,
              y: 40 + (k % 3) * 35,
              vx: (k % 2 === 0 ? 1 : -1) * 180,
              vy: 140,
              gravity: 950,
              bounce: true,
              fromPlayer: true,
              kind: "superDodgeball",
              damage: 4,
              radius: 22,
              life: 1.8
            })
          );
        }
      } else {
        // Leg 4: Massive full-screen rainbow cheer beams + vertical rainbow pillars!
        if (G.VFX) {
          G.VFX.spawn("rainbowBeam", this.x + 20, this.y - 45, { scale: 1.4 });
          for (let k = 0; k < 3; k++) {
            G.VFX.spawn("p4RainbowPillar", game.camX + 200 + k * 280, G.CONST.GROUND_Y, { life: 1.05, scale: 1.1 });
          }
        }
        for (let k = 0; k < 5; k++) {
          game.projectiles.push(
            new Projectile({
              x: this.x,
              y: 120 + k * 70,
              vx: 980,
              fromPlayer: true,
              kind: "rainbow",
              damage: 6,
              pierce: true,
              life: 1.1
            })
          );
        }
      }

      // Clean all puddles & damage all on-screen enemies + boss
      game.cleanScreenBySuper();
    }

    takeDamage(dmg, game, reasonText, launchBack) {
      if (this.invulnTimer > 0) return false;
      this.hp = Math.max(0, this.hp - dmg);
      this.invulnTimer = G.CONST.INVULN_TIME;
      game.screenShake = 0.28;
      game.crowdMood = "panic";
      game.crowdMoodTimer = 2.4;
      if (launchBack) {
        this.knockbackTimer = 0.42;
        this.vy = -340;
        this.vx = -this.facing * 260;
      }
      G.Audio.play("hurt");
      if (reasonText) game.addBubble(this, reasonText, 1.8);
      if (this.hp <= 0) {
        game.triggerGameOver();
      }
      return true;
    }

    draw(ctx, camX, t) {
      // Draw dash afterimages
      this.afterimages.forEach((a) => {
        ctx.save();
        ctx.globalAlpha = a.life * 2.4;
        G.Sprites.drawRunner(ctx, this.runnerIndex, a.x - camX, a.y, a.facing, "dash", t, {});
        ctx.restore();
      });

      let state = "idle";
      if (this.knockbackTimer > 0) state = "knockback";
      else if (this.slipTimer > 0) state = "slip";
      else if (this.dashTimer > 0) state = "dash";
      else if (!this.onGround) state = "jump";
      else if (Math.abs(this.vx) > 25) state = "run";

      G.Sprites.drawRunner(ctx, this.runnerIndex, this.x - camX, this.y, this.facing, state, t, {
        hurtFlash: this.invulnTimer > 0 && this.superTimer <= 0,
        recoil: this.recoilTimer > 0,
        melee: this.meleeTimer > 0,
        hasSpikes: this.spikesTimer > 0,
        drinkAura: this.drinkAuraTimer > 0,
        isFat: this.fatTimer > 0,
        superAura: this.superTimer > 0
      });
    }
  }

  class Enemy {
    constructor(spec, idx) {
      this.id = idx;
      this.type = spec.type;
      this.x = spec.x;
      this.y = spec.type === "balloon" ? G.CONST.GROUND_Y : (spec.y || G.CONST.GROUND_Y);
      this.baseY = this.y;
      this.facing = -1;
      this.hp = spec.type === "rhino" ? 4 : spec.type === "balloon" ? 3 : 2;
      this.active = true;
      this.calmed = false;
      this.startled = false;
      this.hurtFlash = 0;
      this.shootTimer = 1.6 + (idx % 3) * 0.5;
      this.bubbleOffset = 94;
    }

    update(dt, player, game) {
      if (!this.active) return;
      if (this.hurtFlash > 0) this.hurtFlash -= dt;

      const dist = player.x - this.x;
      if (this.calmed) {
        // Happily runs off-screen once calmed/reminded
        this.facing = 1;
        this.x += 230 * dt;
        if (this.x - game.camX > G.CONST.W + 120) this.active = false;
        return;
      }

      if (Math.abs(dist) > 850) return;

      if (this.type === "rhino") {
        this.facing = dist < 0 ? -1 : 1;
        const speed = Math.abs(dist) < 340 ? 185 : 85;
        this.x += this.facing * speed * dt;
      } else if (this.type === "dog") {
        this.facing = dist < 0 ? -1 : 1;
        this.x += this.facing * 145 * dt;
      } else if (this.type === "phone") {
        this.x -= 48 * dt;
      } else if (this.type === "balloon") {
        // Stone-throwing gremlin on track
        this.facing = dist < 0 ? -1 : 1;
        this.x += this.facing * 26 * dt;
        this.shootTimer -= dt;
        if (this.shootTimer <= 0 && Math.abs(dist) < 480) {
          this.shootTimer = 2.2;
          game.projectiles.push(
            new Projectile({
              x: this.x + this.facing * 18,
              y: this.y - 44,
              vx: this.facing * 240,
              vy: -320,
              gravity: 780,
              fromPlayer: false,
              color: "#94a3b8",
              life: 2.2
            })
          );
        }
      }

      // Collision with player
      const hitW = this.type === "rhino" ? 34 : 26;
      const hitH = 64;
      if (Math.abs(player.x - this.x) < hitW && Math.abs((player.y - 36) - (this.y - hitH * 0.5)) < hitH * 0.6) {
        if (this.type === "rhino") {
          player.takeDamage(2, game, "被犀牛撞飛！", true);
        } else if (this.type === "dog") {
          player.takeDamage(1, game, "哇！校狗跑進跑道了！");
          game.showTip("dog");
        } else if (this.type === "phone") {
          player.takeDamage(1, game, "看路啊同學！");
          game.showTip("phone");
        } else {
          player.takeDamage(1, game, "被亂丟石頭怪砸到了！", true);
        }
      }
    }

    hit(dmg, game) {
      if (this.calmed || !this.active) return;
      this.hp -= dmg;
      this.hurtFlash = 0.14;
      G.Audio.play("hit");
      game.spawnSparks(this.x, this.y - 36, "#fde047", 5);

      if (this.hp <= 0) {
        game.player.superCharge = Math.min(G.CONST.MAX_SUPER, game.player.superCharge + 14);
        game.score += 150;
        if (this.type === "dog") {
          this.calmed = true;
          G.Audio.play("calm");
          game.addBubble(this, "冷靜下來了～♥", 1.5);
          game.showTip("dog");
        } else if (this.type === "phone") {
          this.calmed = true;
          this.startled = true;
          G.Audio.play("calm");
          game.addBubble(this, "啊！我馬上讓開！", 1.5);
          game.showTip("phone");
        } else {
          this.active = false;
          game.spawnSparks(this.x, this.y - 36, "#fb923c", 12);
        }
      }
    }

    draw(ctx, camX, t) {
      if (!this.active) return;
      const sx = this.x - camX;
      if (sx < -100 || sx > G.CONST.W + 100) return;
      G.Sprites.drawEnemy(ctx, this, sx, this.y, t);
    }
  }

  class Trap {
    constructor(spec) {
      this.type = spec.type;
      this.x = spec.x;
      this.w = spec.w || 72;
      this.active = true;
      this.cooldown = 0;
    }

    update(dt, player, game) {
      if (!this.active) return;
      if (this.cooldown > 0) this.cooldown -= dt;

      if (this.type === "wind") {
        if (Math.abs(player.x - this.x) < this.w * 0.5 && player.dashTimer <= 0 && player.superTimer <= 0) {
          player.x -= 95 * dt;
          if (this.cooldown <= 0) {
            this.cooldown = 4.5;
            game.showTip("wind");
          }
        }
        return;
      }

      if (this.type === "sandpit") {
        if (player.onGround && Math.abs(player.x - this.x) < this.w * 0.48 && player.y >= G.CONST.GROUND_Y - 4) {
          player.x -= player.vx * 0.42 * dt;
        }
        return;
      }

      if (this.cooldown > 0) return;

      const onFloor = player.y >= G.CONST.GROUND_Y - 16;
      if (this.type === "puddle" && onFloor && Math.abs(player.x - this.x) < 36) {
        if (player.spikesTimer > 0 || player.invulnTimer > 0) return;
        this.cooldown = 1.6;
        player.slipTimer = 0.68;
        player.vx = player.facing * 280;
        player.takeDamage(1, game, "咦…踩到積水臉著地大滑行！");
        G.Audio.play("slip");
        game.showTip("puddle");
      } else if (this.type === "shoelace" && onFloor && Math.abs(player.x - this.x) < 30) {
        if (player.invulnTimer > 0) return;
        this.cooldown = 1.8;
        player.slipTimer = 0.62;
        player.vx = player.facing * 240;
        player.takeDamage(1, game, "啊！踩到小石頭撲街滑出去啦！");
        G.Audio.play("slip");
        game.showTip("shoelace");
      } else if ((this.type === "hurdle" || this.type === "cone") && player.y >= G.CONST.GROUND_Y - 38 && Math.abs(player.x - this.x) < 22) {
        if (player.invulnTimer > 0) return;
        this.cooldown = 1.4;
        player.takeDamage(1, game, this.type === "hurdle" ? "撞到跨欄架了！" : "踢到三角錐了！");
        game.showTip("hurdle");
      }
    }

    draw(ctx, camX, t) {
      if (!this.active) return;
      const sx = this.x - camX;
      if (sx < -200 || sx > G.CONST.W + 200) return;
      G.Sprites.drawTrap(ctx, this, sx, G.CONST.GROUND_Y, t);
    }
  }

  class Pickup {
    constructor(spec) {
      this.type = spec.type;
      this.x = spec.x;
      this.y = spec.y || 390;
      this.active = true;
    }

    update(player, game) {
      if (!this.active) return;
      if (Math.abs(player.x - this.x) < 36 && Math.abs((player.y - 42) - this.y) < 48) {
        this.active = false;
        G.Audio.play("pickup");
        game.spawnSparks(this.x, this.y, "#fde047", 10);

        if (this.type.startsWith("weapon_")) {
          const code = this.type.split("_")[1];
          const w = G.WEAPONS[code] || G.WEAPONS.W;
          player.powerWeapon = code;
          player.powerAmmo = w.ammo;
          game.addBubble(player, `裝備「${w.label}」！`, 1.8);
          game.showTip("powerup");
        } else if (this.type === "drink" || this.type === "iced_supau") {
          player.hp = Math.min(G.CONST.MAX_HP, player.hp + (this.type === "iced_supau" ? 6 : 4));
          player.drinkAuraTimer = 4.2;
          game.crowdMood = "cheer";
          game.crowdMoodTimer = 2.6;
          if (G.VFX) G.VFX.spawn("healBloom", player.x, player.y, { scale: 1.2 });
          game.addBubble(player, this.type === "iced_supau" ? "冰鎮舒跑！全身發光爆氣！" : "喝完運動飲料！全身爆氣衝啊！", 1.9);
          game.showTip("drinkAura");
        } else if (this.type === "golden_baton") {
          player.superCharge = Math.min(G.CONST.MAX_SUPER, player.superCharge + 55);
          player.invulnTimer = Math.max(player.invulnTimer, 3.0);
          player.spikesTimer = Math.max(player.spikesTimer, 5.0);
          game.score += 500;
          game.addBubble(player, "黃金接力棒！無敵加速＋絕招暴漲！", 2.0);
        } else if (this.type.startsWith("food_")) {
          player.hp = Math.min(G.CONST.MAX_HP, player.hp + 1);
          player.fullness++;
          if (player.fullness >= 3) {
            player.fatTimer = 10.0;
            player.fullness = 0;
            game.crowdMood = "panic";
            game.crowdMoodTimer = 2.4;
            game.addBubble(player, "吃太飽變胖啦！滾動保齡球模式！", 2.2);
            game.showTip("fatMode");
          } else {
            const label = this.type === "food_sausage" ? "大腸包小腸" : this.type === "food_boba" ? "珍奶" : "香雞排";
            game.addBubble(player, `好香的${label}！（飽足 ${player.fullness}/3）`, 1.5);
          }
        } else if (this.type === "jelly") {
          player.superCharge = Math.min(G.CONST.MAX_SUPER, player.superCharge + 45);
          game.addBubble(player, "能量補充！絕招快滿了！", 1.6);
        } else if (this.type === "spikes") {
          player.spikesTimer = 8.0;
          game.addBubble(player, "換上防滑釘鞋！衝呀！", 1.8);
        }
      }
    }

    draw(ctx, camX, t) {
      if (!this.active) return;
      const sx = this.x - camX;
      if (sx < -50 || sx > G.CONST.W + 50) return;
      G.Sprites.drawPickup(ctx, this, sx, this.y, t);
    }
  }

  class Boss {
    constructor(stage, lockMaxX) {
      this.spriteKey = stage.bossKey;
      this.name = stage.bossName;
      this.maxHp = stage.bossHp;
      this.hp = stage.bossHp;
      this.defeatQuote = stage.bossDefeatQuote;

      this.x = lockMaxX - 160;
      this.y = this.spriteKey === "boss_3" ? G.CONST.GROUND_Y - 120 : G.CONST.GROUND_Y;
      this.baseY = this.y;
      this.facing = -1;
      this.state = "idle"; // "idle" | "charge" | "attack" | "defeated"
      this.timer = 1.4;
      this.hurtFlash = 0;
      this.defeatTimer = 0;
      this.active = true;
      this.bubbleOffset = 180;
    }

    update(dt, player, game) {
      if (!this.active) return;
      if (this.hurtFlash > 0) this.hurtFlash -= dt;

      if (this.state === "defeated") {
        this.defeatTimer -= dt;
        if (this.defeatTimer <= 0) {
          this.active = false;
        }
        return;
      }

      this.facing = player.x < this.x ? -1 : 1;
      this.timer -= dt;

      const minX = game.bossLock.minX + 90;
      const maxX = game.bossLock.maxX - 90;

      if (this.state === "idle") {
        // Gentle patrol
        this.x += Math.sin(game.time * 2) * 70 * dt;
        if (this.spriteKey === "boss_3") {
          this.y = this.baseY + Math.sin(game.time * 3) * 28;
        }
        if (this.timer <= 0) {
          if (Math.random() < 0.45 && this.spriteKey !== "boss_3") {
            this.state = "charge";
            this.timer = 1.05;
            this.chargeDir = this.facing;
          } else {
            this.state = "attack";
            this.timer = 0.65;
            this.fireAttack(player, game);
          }
        }
      } else if (this.state === "charge") {
        this.x += this.chargeDir * 350 * dt;
        if (this.x < minX || this.x > maxX || this.timer <= 0) {
          this.state = "idle";
          this.timer = 1.3;
        }
      } else if (this.state === "attack") {
        if (this.timer <= 0) {
          this.state = "idle";
          this.timer = 1.25;
        }
      }

      this.x = Math.max(minX, Math.min(maxX, this.x));

      // Contact hurt
      if (Math.abs(player.x - this.x) < 58 && Math.abs((player.y - 42) - (this.y - 78)) < 76) {
        player.takeDamage(2, game, "被大魔王震飛啦！", true);
      }
    }

    fireAttack(player, game) {
      const dx = player.x - this.x;
      const dy = (player.y - 45) - (this.y - 75);
      const len = Math.max(1, Math.hypot(dx, dy));

      if (this.spriteKey === "boss_3") {
        // Typhoon wind tornados
        [-90, 0, 90].forEach((vy) => {
          game.projectiles.push(
            new Projectile({
              x: this.x - 40,
              y: this.y - 70,
              vx: -280,
              vy,
              fromPlayer: false,
              kind: "tornado",
              life: 2.8
            })
          );
        });
      } else if (this.spriteKey === "boss_4") {
        // Lightning fan
        [-0.25, 0, 0.25].forEach((ang) => {
          const speed = 330;
          const baseAng = Math.atan2(dy, dx) + ang;
          game.projectiles.push(
            new Projectile({
              x: this.x + this.facing * 35,
              y: this.y - 80,
              vx: Math.cos(baseAng) * speed,
              vy: Math.sin(baseAng) * speed,
              fromPlayer: false,
              kind: "lightning",
              life: 2.6
            })
          );
        });
      } else {
        // Aimed ball / boba cup / whistle blast
        game.projectiles.push(
          new Projectile({
            x: this.x + this.facing * 35,
            y: this.y - 72,
            vx: (dx / len) * 320,
            vy: (dy / len) * 320,
            fromPlayer: false,
            color: this.spriteKey === "boss_2" ? "#84cc16" : "#f43f5e",
            life: 2.6
          })
        );
      }
    }

    hit(dmg, game) {
      if (this.state === "defeated" || !this.active) return;
      this.hp = Math.max(0, this.hp - dmg);
      this.hurtFlash = 0.12;
      G.Audio.play("hit");
      game.spawnSparks(this.x, this.y - 75, "#fde047", 6);
      game.player.superCharge = Math.min(G.CONST.MAX_SUPER, game.player.superCharge + 6);

      if (this.hp <= 0) {
        this.state = "defeated";
        this.defeatTimer = 2.4;
        game.score += 1000;
        game.screenShake = 0.4;
        G.Audio.play("perfect");
        if (G.VFX) {
          G.VFX.spawn("explosion", this.x, this.y - 70, { color: "#fde047", scale: 1.8 });
          G.VFX.spawn("shockwave", this.x, G.CONST.GROUND_Y - 12, { color: "#f97316", scale: 1.6 });
        }
        game.addBubble(this, this.defeatQuote, 2.5);
        game.spawnSparks(this.x, this.y - 80, "#fde047", 24);
      }
    }

    draw(ctx, camX, t) {
      if (!this.active) return;
      G.Sprites.drawBoss(ctx, this, this.x - camX, this.y, t);
    }
  }

  class Captive {
    constructor(spec) {
      this.type = spec.type || "student";
      this.x = spec.x;
      this.y = G.CONST.GROUND_Y;
      this.rescued = false;
      this.active = true;
      this.runTimer = 1.6;
      this.bubbleOffset = 94;
    }

    update(dt, player, game) {
      if (!this.active) return;
      if (!this.rescued) {
        if (Math.abs(player.x - this.x) < 48 && Math.abs(player.y - this.y) < 60) {
          this.rescue(game);
        }
      } else {
        this.runTimer -= dt;
        this.x += 180 * dt;
        if (this.runTimer <= 0) this.active = false;
      }
    }

    rescue(game) {
      this.rescued = true;
      game.score += 300;
      game.crowdMood = "cheer";
      game.crowdMoodTimer = 2.6;
      G.Audio.play("calm");
      if (G.VFX) G.VFX.spawn("healBloom", this.x, this.y, { scale: 1.1 });
      game.spawnSparks(this.x, this.y - 40, "#fde047", 14);
      game.addBubble(this, "🫡 謝謝扶我！這個拿去用！", 1.8);
      game.showTip("captive");

      const rewards = ["golden_baton", "iced_supau", "weapon_M", "weapon_B"];
      const rewardType = rewards[Math.floor(Math.random() * rewards.length)];
      game.pickups.push(new Pickup({ type: rewardType, x: this.x + 28, y: G.CONST.GROUND_Y - 46 }));
    }

    draw(ctx, camX, t) {
      if (!this.active) return;
      const sx = this.x - camX;
      if (sx < -100 || sx > G.CONST.W + 100) return;
      G.Sprites.drawCaptive(ctx, this, sx, this.y, t);
    }
  }

  class DroppedBaton {
    constructor(x) {
      this.x = x;
      this.y = G.CONST.GROUND_Y - 120;
      this.vx = -220;
      this.vy = -380;
      this.active = true;
    }

    update(dt, player, game) {
      if (!this.active) return;
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      this.vy += G.CONST.GRAVITY * dt;
      if (this.y >= G.CONST.GROUND_Y - 14) {
        this.y = G.CONST.GROUND_Y - 14;
        this.vy = -Math.abs(this.vy) * 0.45;
        this.vx *= 0.65;
      }
      this.x = Math.max(80, this.x);

      if (Math.abs(player.x - this.x) < 42 && Math.abs((player.y - 32) - this.y) < 55) {
        this.active = false;
        G.Audio.play("pickup");
        game.spawnSparks(this.x, this.y, "#fde047", 18);
        game.addBubble(player, "撿回接力棒！再衝去交棒！", 1.8);
      }
    }

    draw(ctx, camX, t) {
      if (!this.active) return;
      G.Sprites.drawDroppedBaton(ctx, this, this.x - camX, this.y, t);
    }
  }

  G.Entities = {
    Particle,
    SpeechBubble,
    Projectile,
    Player,
    Enemy,
    Trap,
    Pickup,
    Boss,
    Captive,
    DroppedBaton
  };
})(window.RelayGame);
