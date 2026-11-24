window.RelayGame = window.RelayGame || {};

(function (G) {
  "use strict";

  G.CONST = {
    W: 960,
    H: 540,
    GROUND_Y: 448,
    GRAVITY: 1950,
    MAX_FALL: 980,
    PLAYER_SPEED: 300,
    JUMP_VEL: -730,
    DOUBLE_JUMP_VEL: -650,
    DASH_SPEED: 670,
    DASH_DURATION: 0.2,
    DASH_COOLDOWN: 0.62,
    INVULN_TIME: 1.05,
    MAX_HP: 10,
    MAX_SUPER: 100
  };

  // Pre-wired AI-generated pixel-art assets in assets/ (easily replaceable with custom PNG/GIFs)
  G.CUSTOM_SPRITES = {
    title_bg: "assets/title_bg.png",
    bg_far_sky: "assets/bg_far_sky.png",
    bg_mid_school: "assets/bg_mid_school.png",
    bg_stadium_morning: "assets/bg_stadium_morning.png",
    ground_track: "assets/ground_violet_track.png",
    bg_morning: "assets/bg_school_morning.png",
    bg_sunset: "assets/bg_school_sunset.png",
    runner_1: "assets/runner_1.png",
    runner_2: "assets/runner_2.png",
    runner_3: "assets/runner_3.png",
    runner_4: "assets/runner_4.png",
    p1_portrait: "assets/p1_portrait.png",
    p2_portrait: "assets/p2_portrait.png",
    p3_portrait: "assets/p3_portrait.png",
    p4_portrait: "assets/p4_portrait.png",
    boss_1: "assets/boss_1.png",
    boss_2: "assets/boss_2.png",
    boss_3: "assets/boss_3.png",
    boss_4: "assets/boss_4.png",
    enemy_rhino: "assets/enemy_rhino.png",
    enemy_dog: "assets/enemy_dog.png",
    enemy_phone: "assets/enemy_phone.png",
    enemy_balloon: "assets/enemy_balloon.png",
    pickup_weapon_S: "assets/pickup_weapon_S.png",
    pickup_weapon_H: "assets/pickup_weapon_H.png",
    pickup_weapon_L: "assets/pickup_weapon_L.png",
    pickup_drink: "assets/pickup_drink.png",
    pickup_jelly: "assets/pickup_jelly.png",
    pickup_spikes: "assets/pickup_spikes.png",
    trap_puddle: "assets/trap_puddle.png",
    trap_shoelace: "assets/trap_shoelace.png",
    trap_hurdle: "assets/trap_hurdle.png",
    trap_cone: "assets/trap_cone.png",
    trap_sandpit: "assets/trap_sandpit.png",
    pickup_weapon_W: "assets/pickup_weapon_W.png",
    pickup_weapon_D: "assets/pickup_weapon_D.png",
    pickup_weapon_M: "assets/pickup_weapon_M.png",
    pickup_weapon_B: "assets/pickup_weapon_B.png",
    pickup_golden_baton: "assets/pickup_golden_baton.png",
    pickup_food_sausage: "assets/food_sausage.png",
    pickup_food_boba: "assets/food_boba.png",
    pickup_food_chicken: "assets/food_chicken.png",
    captive_student: "assets/captive_student.png",
    captive_teacher: "assets/captive_teacher.png",
    sheet_runner_1: "assets/sheet_runner_1.png",
    sheet_runner_2: "assets/sheet_runner_2.png",
    sheet_runner_3: "assets/sheet_runner_3.png",
    sheet_runner_4: "assets/sheet_runner_4.png",
    ui_warning: "assets/ui_warning.png",
    ui_clear: "assets/ui_clear.png",
    cutin_1: "assets/P1_cutin_ult.png",
    cutin_2: "assets/P2_cutin_ult.png",
    cutin_3: "assets/P3_cutin_ult.png",
    cutin_4: "assets/P4_cutin_ult.png",
    vfx_beam_orb: "assets/vfx_beam_orb.png",
    vfx_beam_ray: "assets/vfx_beam_ray.png",
    vfx_flame_sheet: "assets/vfx_flame_sheet.png",
    p1_vfx_sheet: "assets/p1_vfx_sheet.png",
    p2_vfx_sheet: "assets/p2_vfx_sheet.png",
    p3_vfx_sheet: "assets/p3_vfx_sheet.png",
    p4_vfx_sheet: "assets/p4_vfx_sheet.png",
    teacher_portrait: "assets/Teacher_portrait.png"
  };

  G.RUNNERS = [
    {
      id: 0,
      leg: 1,
      name: "第一棒・阿翔",
      role: "起跑快腿",
      spriteKey: "runner_1",
      portraitKey: "p1_portrait",
      color: "#ef4444",
      accent: "#fde047",
      speedMult: 1.08,
      weaponName: "充氣加油棒氣彈",
      weaponKey: "cheer",
      fireCooldown: 0.16,
      superName: "音速起跑衝刺",
      quote: "槍聲一響，第一棒絕對搶先衝出去！"
    },
    {
      id: 1,
      leg: 2,
      name: "第二棒・小綠",
      role: "環保閃避手",
      spriteKey: "runner_2",
      portraitKey: "p2_portrait",
      color: "#22c55e",
      accent: "#38bdf8",
      speedMult: 1.02,
      weaponName: "環保水槍（可清積水）",
      weaponKey: "water",
      fireCooldown: 0.18,
      superName: "旋風大掃除",
      quote: "積水跟垃圾都交給我清理乾淨！"
    },
    {
      id: 2,
      leg: 3,
      name: "第三棒・大力",
      role: "彎道強攻手",
      spriteKey: "runner_3",
      portraitKey: "p3_portrait",
      color: "#f97316",
      accent: "#fbbf24",
      speedMult: 0.98,
      weaponName: "彈跳躲避球",
      weaponKey: "dodgeball",
      fireCooldown: 0.28,
      superName: "滿場躲避球雨",
      quote: "逆風彎道？看我的超彈力躲避球！"
    },
    {
      id: 3,
      leg: 4,
      name: "第四棒・大庄健將",
      role: "壓軸衝刺王",
      spriteKey: "runner_4",
      portraitKey: "p4_portrait",
      color: "#3b82f6",
      accent: "#fef08a",
      speedMult: 1.12,
      weaponName: "彩虹接力棒光波",
      weaponKey: "rainbow",
      fireCooldown: 0.2,
      superName: "全校應援大爆發",
      quote: "最後一棒交給我，目標終點紅彩帶！"
    }
  ];

  // Metal Slug style campus supply weapons
  G.WEAPONS = {
    W: {
      code: "W",
      label: "寶特瓶水柱（機槍）",
      color: "#38bdf8",
      ammo: 70,
      cooldown: 0.075,
      damage: 1
    },
    D: {
      code: "D",
      label: "躲避球（飛槍）",
      color: "#ef4444",
      ammo: 30,
      cooldown: 0.24,
      damage: 3
    },
    M: {
      code: "M",
      label: "老師的大聲公（音波砲）",
      color: "#facc15",
      ammo: 24,
      cooldown: 0.34,
      damage: 2
    },
    B: {
      code: "B",
      label: "樂樂棒球（手榴彈）",
      color: "#22c55e",
      ammo: 18,
      cooldown: 0.38,
      damage: 4
    }
  };

  G.TIPS = {
    puddle: "踩到操場積水會臉著地大滑行！跳過去或用水柱清洗！",
    shoelace: "小心跑道上的小石頭！踩到會直接撲街滑出去喔！",
    hurdle: "遇到跨欄或三角錐，近距離按「射」用接力棒揮擊打飛，或跳過去！",
    dog: "遇到迷路校狗別慌張，用道具安撫牠就會開心退場！",
    phone: "場邊滑手機橫越跑道太危險了！提醒路人注意安全！",
    wind: "逆風強襲！按「衝 (DASH)」就能破風加速前進！",
    batonPerfect: "完美交棒！下一棒獲得 3 秒無敵衝刺加速！",
    batonFumble: "掉棒危機！接力棒飛出去了，快衝回去撿起來！",
    powerup: "撿到校園應援補給武器！",
    captive: "成功解救受困同學／抽筋老師！獲得超強秘密補給！",
    fatMode: "吃太飽變胖啦！跑速變慢但躲避球會變巨型保齡球，撞擊力翻倍！",
    drinkAura: "冰鎮運動飲料下肚！全身發光爆氣衝刺中！"
  };

  G.DIALOGUES = {
    0: [
      {
        speaker: "體育老師",
        portrait: "teacher_portrait",
        text: "各位選手注意！大庄國小 71 週年校慶大隊接力馬上開始，第一棒準備！"
      },
      {
        speaker: "第一棒・阿翔",
        portrait: "p1_portrait",
        text: "熱身完畢！不管是搶道怪還是跑道小石頭，都別想攔住我們班！"
      }
    ],
    1: [
      {
        speaker: "第一棒・阿翔",
        portrait: "p1_portrait",
        text: "棒子交給妳了，小綠！前面跑道好像有人亂丟飲料和積水！"
      },
      {
        speaker: "第二棒・小綠",
        portrait: "p2_portrait",
        text: "收到！我的環保水槍已經裝滿，邊衝邊把操場變乾淨！"
      }
    ],
    2: [
      {
        speaker: "第二棒・小綠",
        portrait: "p2_portrait",
        text: "呼～順利交棒！接下來是超強逆風的第三棒彎道，大力小心！"
      },
      {
        speaker: "第三棒・大力",
        portrait: "p3_portrait",
        text: "放心啦！看我用「衝刺」破風，再用躲避球把干擾通通彈開！"
      }
    ],
    3: [
      {
        speaker: "第三棒・大力",
        portrait: "p3_portrait",
        text: "最後一棒！大庄健將，全班的希望都在這支接力棒上了！"
      },
      {
        speaker: "第四棒・大庄健將",
        portrait: "p4_portrait",
        text: "……（推了推護目鏡）交給我，一起衝破終點彩帶吧！"
      }
    ]
  };

  function buildLeg1() {
    return {
      id: 0,
      title: "第一棒：清晨起跑線",
      subtitle: "清晨操場｜閃避積水與搶跑干擾",
      length: 3600,
      timeOfDay: "morning",
      wind: 0,
      bossKey: "boss_1",
      bossName: "烏龍搶跑魔",
      bossHp: 34,
      bossQuote: "嗶嗶！誰准你跑這麼快的！",
      bossDefeatQuote: "烏龍搶跑魔：我的哨子…還會再響的～",
      platforms: [
        { x: 650, y: 345, w: 150 },
        { x: 1320, y: 335, w: 180 },
        { x: 2050, y: 325, w: 170 },
        { x: 2740, y: 340, w: 160 }
      ],
      traps: [
        { type: "puddle", x: 460 },
        { type: "cone", x: 760 },
        { type: "shoelace", x: 1050 },
        { type: "hurdle", x: 1410 },
        { type: "puddle", x: 1730 },
        { type: "cone", x: 1960 },
        { type: "hurdle", x: 2350 },
        { type: "shoelace", x: 2630 },
        { type: "puddle", x: 2980 },
        { type: "hurdle", x: 3220 }
      ],
      enemies: [
        { type: "dog", x: 600 },
        { type: "rhino", x: 960 },
        { type: "phone", x: 1260 },
        { type: "dog", x: 1620 },
        { type: "rhino", x: 1880 },
        { type: "balloon", x: 2150, y: 260 },
        { type: "phone", x: 2510 },
        { type: "rhino", x: 2890 },
        { type: "dog", x: 3140 }
      ],
      pickups: [
        { type: "weapon_W", x: 690, y: 300 },
        { type: "food_sausage", x: 920, y: 404 },
        { type: "drink", x: 1380, y: 290 },
        { type: "food_boba", x: 1560, y: 404 },
        { type: "spikes", x: 1820, y: 400 },
        { type: "jelly", x: 2110, y: 280 },
        { type: "food_chicken", x: 2420, y: 404 },
        { type: "weapon_M", x: 2790, y: 295 },
        { type: "food_boba", x: 3060, y: 404 },
        { type: "drink", x: 3280, y: 400 }
      ],
      captives: [
        { type: "student", x: 840 },
        { type: "teacher", x: 2220 }
      ]
    };
  }

  function buildLeg2() {
    return {
      id: 1,
      title: "第二棒：烈日環保道",
      subtitle: "熱鬧校舍前｜清理垃圾與安撫校狗",
      length: 3900,
      timeOfDay: "noon",
      wind: 0,
      bossKey: "boss_2",
      bossName: "亂丟飲料垃圾獸",
      bossHp: 42,
      bossQuote: "喝完手搖飲直接丟跑道最爽啦！",
      bossDefeatQuote: "垃圾獸：我…我會做好資源回收的～",
      platforms: [
        { x: 580, y: 340, w: 160 },
        { x: 1180, y: 320, w: 160 },
        { x: 1840, y: 335, w: 190 },
        { x: 2560, y: 315, w: 170 },
        { x: 3180, y: 340, w: 150 }
      ],
      traps: [
        { type: "puddle", x: 420 },
        { type: "puddle", x: 840 },
        { type: "sandpit", x: 1140, w: 130 },
        { type: "shoelace", x: 1510 },
        { type: "hurdle", x: 1780 },
        { type: "puddle", x: 2150 },
        { type: "sandpit", x: 2490, w: 140 },
        { type: "cone", x: 2880 },
        { type: "puddle", x: 3120 },
        { type: "hurdle", x: 3480 }
      ],
      enemies: [
        { type: "balloon", x: 540, y: 265 },
        { type: "dog", x: 760 },
        { type: "phone", x: 1020 },
        { type: "rhino", x: 1420 },
        { type: "balloon", x: 1700, y: 250 },
        { type: "dog", x: 2040 },
        { type: "rhino", x: 2360 },
        { type: "phone", x: 2740 },
        { type: "balloon", x: 3020, y: 260 },
        { type: "rhino", x: 3360 }
      ],
      pickups: [
        { type: "weapon_D", x: 630, y: 295 },
        { type: "food_boba", x: 930, y: 404 },
        { type: "jelly", x: 1230, y: 275 },
        { type: "food_sausage", x: 1470, y: 404 },
        { type: "drink", x: 1600, y: 400 },
        { type: "weapon_B", x: 1910, y: 290 },
        { type: "food_chicken", x: 2260, y: 404 },
        { type: "spikes", x: 2620, y: 270 },
        { type: "food_boba", x: 2940, y: 404 },
        { type: "drink", x: 3230, y: 295 }
      ],
      captives: [
        { type: "teacher", x: 1120 },
        { type: "student", x: 2680 }
      ]
    };
  }

  function buildLeg3() {
    return {
      id: 2,
      title: "第三棒：黃昏逆風彎道",
      subtitle: "金黃彎道｜頂住強風突破重圍",
      length: 4100,
      timeOfDay: "sunset",
      wind: -68,
      bossKey: "boss_3",
      bossName: "彎道逆風颱風怪",
      bossHp: 50,
      bossQuote: "呼呼呼！想過彎道先問過我的暴風！",
      bossDefeatQuote: "颱風怪：可惡…居然頂著逆風跑過來了～",
      platforms: [
        { x: 520, y: 340, w: 160 },
        { x: 1090, y: 315, w: 180 },
        { x: 1720, y: 330, w: 170 },
        { x: 2380, y: 310, w: 180 },
        { x: 3040, y: 335, w: 170 },
        { x: 3560, y: 335, w: 150 }
      ],
      traps: [
        { type: "hurdle", x: 440 },
        { type: "wind", x: 720, w: 260 },
        { type: "shoelace", x: 1060 },
        { type: "sandpit", x: 1380, w: 130 },
        { type: "hurdle", x: 1670 },
        { type: "wind", x: 1980, w: 280 },
        { type: "puddle", x: 2350 },
        { type: "hurdle", x: 2720 },
        { type: "wind", x: 2960, w: 260 },
        { type: "cone", x: 3420 },
        { type: "hurdle", x: 3740 }
      ],
      enemies: [
        { type: "rhino", x: 660 },
        { type: "balloon", x: 930, y: 250 },
        { type: "phone", x: 1290 },
        { type: "rhino", x: 1580 },
        { type: "dog", x: 1920 },
        { type: "balloon", x: 2240, y: 245 },
        { type: "rhino", x: 2610 },
        { type: "phone", x: 2880 },
        { type: "rhino", x: 3290 },
        { type: "balloon", x: 3630, y: 245 }
      ],
      pickups: [
        { type: "weapon_M", x: 580, y: 295 },
        { type: "food_chicken", x: 850, y: 404 },
        { type: "drink", x: 1160, y: 270 },
        { type: "food_sausage", x: 1480, y: 404 },
        { type: "spikes", x: 1780, y: 285 },
        { type: "food_boba", x: 2130, y: 404 },
        { type: "weapon_W", x: 2450, y: 265 },
        { type: "food_chicken", x: 2800, y: 404 },
        { type: "jelly", x: 3110, y: 290 },
        { type: "drink", x: 3620, y: 290 }
      ],
      captives: [
        { type: "student", x: 1420 },
        { type: "teacher", x: 2740 }
      ]
    };
  }

  function buildLeg4() {
    return {
      id: 3,
      title: "第四棒：榮耀終點衝刺",
      subtitle: "校慶壓軸直道｜衝破終點紅彩帶！",
      length: 4300,
      timeOfDay: "finale",
      wind: -40,
      bossKey: "boss_4",
      bossName: "抽筋大魔王",
      bossHp: 62,
      bossQuote: "終點線就在眼前？先嚐嚐大腿抽筋閃電！",
      bossDefeatQuote: "抽筋大魔王：啊！這就是大庄國小的運動家精神嗎～",
      platforms: [
        { x: 520, y: 340, w: 160 },
        { x: 1060, y: 315, w: 170 },
        { x: 1620, y: 330, w: 180 },
        { x: 2240, y: 305, w: 180 },
        { x: 2860, y: 330, w: 170 },
        { x: 3480, y: 320, w: 170 }
      ],
      traps: [
        { type: "hurdle", x: 450 },
        { type: "puddle", x: 780 },
        { type: "shoelace", x: 1040 },
        { type: "sandpit", x: 1350, w: 140 },
        { type: "wind", x: 1640, w: 240 },
        { type: "hurdle", x: 2020 },
        { type: "puddle", x: 2260 },
        { type: "hurdle", x: 2590 },
        { type: "wind", x: 2880, w: 250 },
        { type: "shoelace", x: 3260 },
        { type: "hurdle", x: 3680 },
        { type: "cone", x: 3940 }
      ],
      enemies: [
        { type: "rhino", x: 680 },
        { type: "dog", x: 960 },
        { type: "balloon", x: 1260, y: 245 },
        { type: "phone", x: 1560 },
        { type: "rhino", x: 1910 },
        { type: "balloon", x: 2160, y: 250 },
        { type: "rhino", x: 2490 },
        { type: "dog", x: 2790 },
        { type: "phone", x: 3180 },
        { type: "rhino", x: 3560 },
        { type: "balloon", x: 3840, y: 240 }
      ],
      pickups: [
        { type: "weapon_B", x: 580, y: 295 },
        { type: "food_sausage", x: 860, y: 404 },
        { type: "jelly", x: 1120, y: 270 },
        { type: "food_boba", x: 1440, y: 404 },
        { type: "drink", x: 1690, y: 285 },
        { type: "food_chicken", x: 2070, y: 404 },
        { type: "weapon_D", x: 2310, y: 260 },
        { type: "spikes", x: 2930, y: 285 },
        { type: "food_boba", x: 3340, y: 404 },
        { type: "weapon_M", x: 3540, y: 275 },
        { type: "drink", x: 4020, y: 400 }
      ],
      captives: [
        { type: "student", x: 1200 },
        { type: "teacher", x: 2660 },
        { type: "student", x: 3780 }
      ]
    };
  }

  G.STAGES = [buildLeg1(), buildLeg2(), buildLeg3(), buildLeg4()];
})(window.RelayGame);
