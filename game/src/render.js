// Midnight Courier — rendering.
// Everything on screen is drawn on one canvas: the manor floor with its
// rugs, marble and lamps, the cover you can read at a glance, the guards
// and their vision cones, the hooded courier, the night darkness with
// pools of lamplight cut out of it, the HUD and the title, pause, caught
// and win screens. No images anywhere — every shape is canvas drawing.
import {
  GUARD_RADIUS,
  LAMP_RADIUS,
  PLAYER_RADIUS,
  TILE,
  VIEW_H,
  VIEW_W,
  VISION_HALF_ANGLE,
  VISION_RANGE,
} from './config.js';

function hash(tx, ty) {
  let h = (tx * 374761393 + ty * 668265263) ^ 0x5bf03635;
  h = (h ^ (h >> 13)) * 1274126177;
  return ((h ^ (h >> 16)) >>> 0) / 4294967295;
}

const BOOK_COLORS = ['#a34d3d', '#4d6a8a', '#6a8a4d', '#c2a24d', '#7a4d8a', '#8a6a4d'];

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.dark = document.createElement('canvas');
    this.dark.width = VIEW_W;
    this.dark.height = VIEW_H;
    this.darkCtx = this.dark.getContext('2d');
  }

  draw(game) {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, VIEW_W, VIEW_H);
    this.drawFloor(game.manor);
    this.drawLamps(game.manor);
    this.drawSeals(game.manor);
    this.drawExit(game);
    this.drawCover(game.manor);
    this.drawNoiseRings(game);
    this.drawCoins(game);
    this.drawDarkness(game);
    for (const guard of game.guards) this.drawCone(ctx, guard);
    for (const guard of game.guards) this.drawGuard(ctx, guard);
    this.drawPlayer(ctx, game);
    if (game.screen === 'play' || game.screen === 'paused') this.drawHud(ctx, game);
    if (game.screen === 'title') this.drawTitle(ctx);
    if (game.screen === 'paused') this.drawPaused(ctx);
    if (game.screen === 'caught') this.drawCaught(ctx, game);
    if (game.screen === 'gameover') this.drawGameOver(ctx, game);
    if (game.screen === 'win') this.drawWin(ctx, game);
  }

  drawFloor(manor) {
    const ctx = this.ctx;
    for (let ty = 0; ty < manor.grid.length; ty += 1) {
      for (let tx = 0; tx < manor.grid[ty].length; tx += 1) {
        const tile = manor.grid[ty][tx];
        const x = tx * TILE;
        const y = ty * TILE;
        if (tile === '#') {
          ctx.fillStyle = '#241d33';
          ctx.fillRect(x, y, TILE, TILE);
          if (manor.tileAt(tx, ty + 1) !== '#') {
            ctx.fillStyle = '#4a3f5e';
            ctx.fillRect(x, y + TILE - 5, TILE, 5);
          }
          continue;
        }
        if (tile === 'M') {
          ctx.fillStyle = (tx + ty) % 2 === 0 ? '#c9c2b0' : '#c2bba9';
          ctx.fillRect(x, y, TILE, TILE);
          ctx.strokeStyle = 'rgba(120,110,90,0.35)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          const r = hash(tx, ty);
          ctx.moveTo(x + 4 + r * 10, y + 4);
          ctx.lineTo(x + 14 + r * 12, y + TILE - 4);
          ctx.stroke();
          ctx.strokeStyle = 'rgba(90,82,66,0.5)';
          ctx.strokeRect(x + 0.5, y + 0.5, TILE - 1, TILE - 1);
          continue;
        }
        // Wooden floor with plank seams.
        ctx.fillStyle = (tx + ty) % 2 === 0 ? '#6a4a2c' : '#64452a';
        ctx.fillRect(x, y, TILE, TILE);
        ctx.strokeStyle = 'rgba(40,24,12,0.45)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, y + TILE - 0.5);
        ctx.lineTo(x + TILE, y + TILE - 0.5);
        ctx.stroke();
        if (tile === ',') {
          ctx.fillStyle = '#7c2f2f';
          ctx.fillRect(x + 1, y + 1, TILE - 2, TILE - 2);
          ctx.strokeStyle = '#c2a24d';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(x + 5.5, y + 5.5, TILE - 11, TILE - 11);
          ctx.fillStyle = 'rgba(194,162,77,0.5)';
          ctx.beginPath();
          ctx.arc(x + TILE / 2, y + TILE / 2, 3, 0, Math.PI * 2);
          ctx.fill();
        }
        if (tile === 'L') {
          ctx.fillStyle = '#5d3f28';
          ctx.beginPath();
          ctx.arc(x + TILE / 2, y + TILE / 2, 7, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }

  drawLamps(manor) {
    const ctx = this.ctx;
    for (const lamp of manor.lamps) {
      const glow = ctx.createRadialGradient(lamp.x, lamp.y, 4, lamp.x, lamp.y, LAMP_RADIUS);
      glow.addColorStop(0, 'rgba(255,205,110,0.30)');
      glow.addColorStop(1, 'rgba(255,205,110,0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(lamp.x, lamp.y, LAMP_RADIUS, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#2c2118';
      ctx.fillRect(lamp.x - 2, lamp.y - 12, 4, 12);
      ctx.fillStyle = '#ffd27a';
      ctx.beginPath();
      ctx.arc(lamp.x, lamp.y - 13, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff3c4';
      ctx.beginPath();
      ctx.arc(lamp.x, lamp.y - 13, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawSeals(manor) {
    const ctx = this.ctx;
    for (const seal of manor.seals) {
      if (seal.taken) continue;
      const bob = Math.sin(Date.now() / 350 + seal.tx) * 2;
      const glow = ctx.createRadialGradient(seal.x, seal.y + bob, 2, seal.x, seal.y + bob, 26);
      glow.addColorStop(0, 'rgba(255,90,70,0.45)');
      glow.addColorStop(1, 'rgba(255,90,70,0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(seal.x, seal.y + bob, 26, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#b02a20';
      ctx.beginPath();
      ctx.arc(seal.x, seal.y + bob, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#d84a3a';
      ctx.beginPath();
      ctx.arc(seal.x - 2, seal.y + bob - 2, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f2e6c8';
      ctx.font = 'bold 11px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('S', seal.x, seal.y + bob + 0.5);
    }
  }

  drawExit(game) {
    const ctx = this.ctx;
    const exit = game.manor.exit;
    const unlocked = game.player.hasAllSeals;
    const x = exit.x - 16;
    const y = exit.y - 20;
    if (unlocked) {
      const glow = ctx.createRadialGradient(exit.x, exit.y, 4, exit.x, exit.y, 70);
      glow.addColorStop(0, 'rgba(120,255,150,0.4)');
      glow.addColorStop(1, 'rgba(120,255,150,0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(exit.x, exit.y, 70, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = unlocked ? '#2f6a3a' : '#4a4438';
    ctx.fillRect(x, y, 32, 40);
    ctx.fillStyle = unlocked ? '#7ddc8a' : '#8a7a5a';
    ctx.fillRect(x + 4, y + 4, 24, 32);
    ctx.strokeStyle = '#1e1a24';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 4.5, y + 4.5, 24, 32);
    ctx.fillStyle = '#1e1a24';
    ctx.beginPath();
    ctx.arc(x + 24, y + 20, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = unlocked ? '#c8ffd0' : '#d8c8a0';
    ctx.font = 'bold 10px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(unlocked ? 'EXIT OPEN' : 'SEALED', exit.x, y - 6);
    if (!unlocked) {
      ctx.fillStyle = '#f2e6c8';
      ctx.font = '11px Georgia, serif';
      ctx.fillText(`${game.player.seals}/3 seals`, exit.x, y + 52);
    }
  }

  drawCover(manor) {
    const ctx = this.ctx;
    for (let ty = 0; ty < manor.grid.length; ty += 1) {
      for (let tx = 0; tx < manor.grid[ty].length; tx += 1) {
        const tile = manor.grid[ty][tx];
        const x = tx * TILE;
        const y = ty * TILE;
        if (tile === 'B') {
          ctx.fillStyle = '#4a3220';
          ctx.fillRect(x + 2, y + 2, TILE - 4, TILE - 4);
          for (let shelf = 0; shelf < 3; shelf += 1) {
            const sy = y + 6 + shelf * 11;
            ctx.fillStyle = '#3a2618';
            ctx.fillRect(x + 4, sy + 8, TILE - 8, 2);
            for (let book = 0; book < 5; book += 1) {
              ctx.fillStyle = BOOK_COLORS[Math.floor(hash(tx * 5 + book, ty * 3 + shelf) * BOOK_COLORS.length)];
              ctx.fillRect(x + 5 + book * 6, sy, 5, 8);
            }
          }
          ctx.strokeStyle = '#241608';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(x + 2.5, y + 2.5, TILE - 5, TILE - 5);
        } else if (tile === 'C') {
          ctx.fillStyle = '#7a5a34';
          ctx.fillRect(x + 3, y + 3, TILE - 6, TILE - 6);
          ctx.strokeStyle = '#4d3a1e';
          ctx.lineWidth = 2;
          ctx.strokeRect(x + 3.5, y + 3.5, TILE - 7, TILE - 7);
          ctx.beginPath();
          ctx.moveTo(x + 3, y + 3);
          ctx.lineTo(x + TILE - 3, y + TILE - 3);
          ctx.moveTo(x + TILE - 3, y + 3);
          ctx.lineTo(x + 3, y + TILE - 3);
          ctx.stroke();
        } else if (tile === 'P') {
          ctx.fillStyle = '#8a5a34';
          ctx.beginPath();
          ctx.moveTo(x + 10, y + 22);
          ctx.lineTo(x + 30, y + 22);
          ctx.lineTo(x + 27, y + 36);
          ctx.lineTo(x + 13, y + 36);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = '#3f7a3a';
          for (let leaf = 0; leaf < 5; leaf += 1) {
            const angle = -Math.PI / 2 + (leaf - 2) * 0.5;
            const lx = x + 20 + Math.cos(angle) * 9;
            const ly = y + 16 + Math.sin(angle) * 8;
            ctx.beginPath();
            ctx.arc(lx, ly, 7, 0, Math.PI * 2);
            ctx.fill();
          }
        } else if (tile === '~') {
          ctx.fillStyle = '#6e2f4a';
          ctx.fillRect(x + 2, y, TILE - 4, TILE);
          ctx.fillStyle = '#5a243c';
          for (let fold = 0; fold < 4; fold += 1) {
            ctx.fillRect(x + 5 + fold * 9, y, 4, TILE);
          }
          ctx.fillStyle = '#c2a24d';
          ctx.fillRect(x + 2, y, TILE - 4, 4);
        }
      }
    }
  }

  drawNoiseRings(game) {
    const ctx = this.ctx;
    for (const noise of game.noises) {
      const progress = noise.age / noise.life;
      if (progress >= 1) continue;
      ctx.strokeStyle = `rgba(255,230,160,${0.5 * (1 - progress)})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(noise.x, noise.y, 6 + progress * noise.radius, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  drawCoins(game) {
    const ctx = this.ctx;
    for (const coin of game.coins) {
      const y = coin.y - coin.height;
      ctx.fillStyle = '#e8c24d';
      ctx.beginPath();
      ctx.arc(coin.x, y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#a8822a';
      ctx.beginPath();
      ctx.arc(coin.x, y, 3.5, 0, Math.PI * 2);
      ctx.fill();
      if (!coin.landed) {
        ctx.strokeStyle = 'rgba(232,194,77,0.5)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(coin.x, coin.y, 8, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }

  drawDarkness(game) {
    const dctx = this.darkCtx;
    dctx.clearRect(0, 0, VIEW_W, VIEW_H);
    dctx.globalCompositeOperation = 'source-over';
    dctx.fillStyle = 'rgba(5,7,18,0.5)';
    dctx.fillRect(0, 0, VIEW_W, VIEW_H);
    dctx.globalCompositeOperation = 'destination-out';
    const punch = (x, y, radius) => {
      const g = dctx.createRadialGradient(x, y, 6, x, y, radius);
      g.addColorStop(0, 'rgba(0,0,0,1)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      dctx.fillStyle = g;
      dctx.beginPath();
      dctx.arc(x, y, radius, 0, Math.PI * 2);
      dctx.fill();
    };
    for (const lamp of game.manor.lamps) punch(lamp.x, lamp.y, LAMP_RADIUS + 10);
    punch(game.player.x, game.player.y, 100);
    if (game.player.hasAllSeals) punch(game.manor.exit.x, game.manor.exit.y, 90);
    for (const coin of game.coins) if (coin.landed) punch(coin.x, coin.y, 46);
    this.ctx.drawImage(this.dark, 0, 0);
  }

  drawCone(ctx, guard) {
    const color =
      guard.state === 'alerted'
        ? 'rgba(255,60,50,0.26)'
        : guard.state === 'suspicious'
          ? 'rgba(255,150,50,0.22)'
          : 'rgba(255,214,90,0.13)';
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(guard.x, guard.y);
    ctx.arc(guard.x, guard.y, VISION_RANGE, guard.facing - VISION_HALF_ANGLE, guard.facing + VISION_HALF_ANGLE);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = color.replace(/0\.\d+\)$/, '0.5)');
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(guard.x, guard.y);
    ctx.arc(guard.x, guard.y, VISION_RANGE, guard.facing - VISION_HALF_ANGLE, guard.facing + VISION_HALF_ANGLE);
    ctx.closePath();
    ctx.stroke();
  }

  drawGuard(ctx, guard) {
    const bob = Math.sin(guard.stepPhase) * 1.5;
    ctx.save();
    ctx.translate(guard.x, guard.y + bob);
    // Spear, held along the facing direction.
    const fx = Math.cos(guard.facing);
    const fy = Math.sin(guard.facing);
    ctx.strokeStyle = '#8a8f9e';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-fx * 10, -fy * 10);
    ctx.lineTo(fx * 22, fy * 22);
    ctx.stroke();
    ctx.fillStyle = '#c8ccd8';
    ctx.beginPath();
    ctx.arc(fx * 24, fy * 24, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // Body: steel cuirass and helmet.
    ctx.fillStyle = '#3a3f55';
    ctx.beginPath();
    ctx.arc(guard.x, guard.y + bob, GUARD_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#565e78';
    ctx.beginPath();
    ctx.arc(guard.x, guard.y + bob, GUARD_RADIUS - 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#c2a24d';
    ctx.beginPath();
    ctx.arc(guard.x, guard.y + bob - 2, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#20242f';
    ctx.beginPath();
    ctx.arc(guard.x + Math.cos(guard.facing) * 5, guard.y + bob + Math.sin(guard.facing) * 5, 5, 0, Math.PI * 2);
    ctx.fill();
    // Detection arc and state mark.
    if (guard.detection > 0.02) {
      ctx.strokeStyle = guard.state === 'alerted' ? '#ff3c32' : '#ffb020';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(guard.x, guard.y + bob, GUARD_RADIUS + 7, -Math.PI / 2, -Math.PI / 2 + guard.detection * Math.PI * 2);
      ctx.stroke();
    }
    ctx.font = 'bold 20px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    if (guard.state === 'alerted') {
      ctx.fillStyle = '#ff3c32';
      ctx.fillText('!', guard.x, guard.y + bob - GUARD_RADIUS - 10);
    } else if (guard.state === 'suspicious') {
      ctx.fillStyle = '#ffb020';
      ctx.fillText('?', guard.x, guard.y + bob - GUARD_RADIUS - 10);
    }
  }

  drawPlayer(ctx, game) {
    const player = game.player;
    const crouch = player.sneaking ? 0.88 : 1;
    const bob = player.moving ? Math.sin(Date.now() / 90) * 1.5 : 0;
    ctx.save();
    ctx.translate(player.x, player.y + bob);
    ctx.scale(crouch, crouch);
    // Cloak.
    ctx.fillStyle = '#2b2f4a';
    ctx.beginPath();
    ctx.moveTo(0, -PLAYER_RADIUS - 4);
    ctx.quadraticCurveTo(PLAYER_RADIUS + 2, -2, PLAYER_RADIUS - 2, PLAYER_RADIUS);
    ctx.quadraticCurveTo(0, PLAYER_RADIUS + 4, -PLAYER_RADIUS + 2, PLAYER_RADIUS);
    ctx.quadraticCurveTo(-PLAYER_RADIUS - 2, -2, 0, -PLAYER_RADIUS - 4);
    ctx.fill();
    ctx.fillStyle = '#3a3f63';
    ctx.beginPath();
    ctx.moveTo(0, -PLAYER_RADIUS - 4);
    ctx.quadraticCurveTo(7, -4, 5, 6);
    ctx.quadraticCurveTo(0, 10, -5, 6);
    ctx.quadraticCurveTo(-7, -4, 0, -PLAYER_RADIUS - 4);
    ctx.fill();
    // Hood point and shadowed face toward the facing direction.
    const fx = Math.cos(player.facing);
    const fy = Math.sin(player.facing);
    ctx.fillStyle = '#1c1f33';
    ctx.beginPath();
    ctx.arc(fx * 4, fy * 4 - 2, 6.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f2e6c8';
    ctx.beginPath();
    ctx.arc(fx * 6, fy * 6 - 2, 1.6, 0, Math.PI * 2);
    ctx.fill();
    // Satchel strap.
    ctx.strokeStyle = '#c2a24d';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-8, -6);
    ctx.lineTo(8, 6);
    ctx.stroke();
    ctx.restore();
    // Running noise ring around the courier.
    if (player.running && player.moving) {
      const pulse = (Date.now() % 600) / 600;
      ctx.strokeStyle = `rgba(255,230,160,${0.35 * (1 - pulse)})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(player.x, player.y, 14 + pulse * 26, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  drawHud(ctx, game) {
    const player = game.player;
    ctx.fillStyle = 'rgba(8,8,16,0.72)';
    ctx.fillRect(0, 0, VIEW_W, 46);
    ctx.fillStyle = 'rgba(194,162,77,0.5)';
    ctx.fillRect(0, 46, VIEW_W, 2);
    ctx.textBaseline = 'middle';
    // Wax seals.
    ctx.textAlign = 'left';
    ctx.font = 'bold 13px Georgia, serif';
    ctx.fillStyle = '#f2e6c8';
    ctx.fillText('SEALS', 16, 24);
    for (let i = 0; i < 3; i += 1) {
      const x = 78 + i * 26;
      ctx.fillStyle = i < player.seals ? '#d84a3a' : 'rgba(120,110,100,0.5)';
      ctx.beginPath();
      ctx.arc(x, 23, 8, 0, Math.PI * 2);
      ctx.fill();
      if (i < player.seals) {
        ctx.fillStyle = '#f2e6c8';
        ctx.font = 'bold 9px Georgia, serif';
        ctx.textAlign = 'center';
        ctx.fillText('S', x, 23.5);
        ctx.textAlign = 'left';
        ctx.font = 'bold 13px Georgia, serif';
      }
    }
    // Lives.
    ctx.fillStyle = '#f2e6c8';
    ctx.fillText('LIVES', 172, 24);
    for (let i = 0; i < 3; i += 1) {
      const x = 228 + i * 22;
      ctx.fillStyle = i < game.lives ? '#e84a5a' : 'rgba(120,110,100,0.4)';
      ctx.beginPath();
      ctx.arc(x - 4, 20, 5, 0, Math.PI * 2);
      ctx.arc(x + 4, 20, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x - 8.5, 21);
      ctx.lineTo(x, 31);
      ctx.lineTo(x + 8.5, 21);
      ctx.closePath();
      ctx.fill();
    }
    // Coins.
    ctx.fillStyle = '#e8c24d';
    ctx.beginPath();
    ctx.arc(318, 23, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f2e6c8';
    ctx.font = 'bold 13px Georgia, serif';
    ctx.fillText(`x ${player.coins}`, 330, 24);
    // Detection eye, centre.
    const maxDetection = Math.max(0, ...game.guards.map((g) => g.detection));
    const eyeX = VIEW_W / 2 - 60;
    ctx.fillStyle = maxDetection > 0.66 ? '#ff3c32' : maxDetection > 0.33 ? '#ffb020' : '#c8ccd8';
    ctx.beginPath();
    ctx.ellipse(eyeX, 23, 13, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#14101e';
    ctx.beginPath();
    ctx.arc(eyeX, 23, 3.5 + maxDetection * 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(200,204,216,0.6)';
    ctx.lineWidth = 2;
    ctx.strokeRect(eyeX + 24, 17, 120, 12);
    ctx.fillStyle = maxDetection > 0.66 ? '#ff3c32' : maxDetection > 0.33 ? '#ffb020' : '#7ddc8a';
    ctx.fillRect(eyeX + 26, 19, 116 * maxDetection, 8);
    const alertWord = game.guards.some((g) => g.state === 'alerted')
      ? 'ALARM'
      : game.guards.some((g) => g.state === 'suspicious')
        ? 'WARY'
        : 'CALM';
    ctx.fillStyle = alertWord === 'ALARM' ? '#ff6a5a' : alertWord === 'WARY' ? '#ffb020' : '#c8ccd8';
    ctx.font = 'bold 13px Georgia, serif';
    ctx.fillText(alertWord, eyeX + 156, 24);
    // Time, right.
    const minutes = Math.floor(game.elapsed / 60);
    const seconds = Math.floor(game.elapsed % 60);
    ctx.fillStyle = '#f2e6c8';
    ctx.textAlign = 'right';
    ctx.fillText(`${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`, VIEW_W - 16, 24);
    ctx.textAlign = 'left';
    // Context hint, bottom.
    let hint = '';
    const nearSeal = game.manor.seals.some((s) => !s.taken && Math.hypot(s.x - player.x, s.y - player.y) < 60);
    if (nearSeal) hint = 'Walk over the wax seal to take it';
    else if (!player.hasAllSeals) hint = 'Find 3 wax seals to unseal the study door — Shift sneaks, Q tosses a coin';
    else hint = 'The study door is open — reach the green EXIT unseen';
    ctx.fillStyle = 'rgba(8,8,16,0.6)';
    const hintWidth = ctx.measureText(hint).width + 24;
    ctx.fillRect(12, VIEW_H - 36, hintWidth, 26);
    ctx.fillStyle = '#d8cdb2';
    ctx.font = '13px Georgia, serif';
    ctx.fillText(hint, 24, VIEW_H - 22);
  }

  overlay(ctx, alpha) {
    ctx.fillStyle = `rgba(6,6,14,${alpha})`;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }

  screenTitle(ctx, text, y) {
    ctx.fillStyle = '#f2e6c8';
    ctx.font = 'bold 58px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(text, VIEW_W / 2, y);
  }

  screenLine(ctx, text, y, size = 18, color = '#d8cdb2') {
    ctx.fillStyle = color;
    ctx.font = `${size}px Georgia, serif`;
    ctx.textAlign = 'center';
    ctx.fillText(text, VIEW_W / 2, y);
  }

  drawTitle(ctx) {
    this.overlay(ctx, 0.78);
    const flicker = 0.85 + Math.sin(Date.now() / 700) * 0.15;
    ctx.fillStyle = `rgba(255,210,122,${flicker})`;
    ctx.font = 'bold 15px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('— A STEALTH GAME —', VIEW_W / 2, 150);
    this.screenTitle(ctx, 'MIDNIGHT COURIER', 225);
    this.screenLine(ctx, 'A sealed letter. A guarded manor. One hooded courier.', 268, 19, '#e8c24d');
    this.screenLine(ctx, 'Slip past the patrols, gather the three wax seals,', 320);
    this.screenLine(ctx, 'unseal the study door and deliver the letter — unseen.', 348);
    this.screenLine(ctx, 'WASD / arrows — move      Shift — sneak      Q / click — toss a coin', 420, 17);
    this.screenLine(ctx, 'Walk over seals to take them      P — pause      M — mute', 448, 17);
    this.screenLine(ctx, 'Rugs hush your steps. Marble carries them. Lamplight gives you away.', 486, 16, '#ffb020');
    const blink = Math.floor(Date.now() / 600) % 2 === 0;
    if (blink) this.screenLine(ctx, 'Press ENTER or click to begin', 560, 20, '#f2e6c8');
    this.screenLine(ctx, 'Midnight Courier — an original game', 660, 13, '#8a8a9a');
  }

  drawPaused(ctx) {
    this.overlay(ctx, 0.6);
    this.screenTitle(ctx, 'PAUSED', 330);
    this.screenLine(ctx, 'Press P or Enter to keep sneaking', 380, 18);
  }

  drawCaught(ctx, game) {
    this.overlay(ctx, 0.72);
    this.screenTitle(ctx, 'CAUGHT!', 300);
    this.screenLine(ctx, 'A guard seized your cloak and marched you back to the entrance.', 350, 18);
    this.screenLine(ctx, `Lives left: ${game.lives}`, 392, 18, '#ff6a5a');
    const blink = Math.floor(Date.now() / 600) % 2 === 0;
    if (blink) this.screenLine(ctx, 'Press ENTER to slip away again', 460, 20, '#f2e6c8');
  }

  drawGameOver(ctx, game) {
    this.overlay(ctx, 0.8);
    this.screenTitle(ctx, 'THE MANOR KEEPS', 280);
    this.screenTitle(ctx, 'ITS SECRETS', 345);
    this.screenLine(ctx, `Seals gathered: ${game.player.seals} of 3`, 410, 18);
    this.screenLine(ctx, 'The courier is done for tonight.', 448, 17);
    const blink = Math.floor(Date.now() / 600) % 2 === 0;
    if (blink) this.screenLine(ctx, 'Press ENTER to try again', 520, 20, '#f2e6c8');
  }

  drawWin(ctx, game) {
    this.overlay(ctx, 0.72);
    this.screenTitle(ctx, 'THE LETTER IS', 260);
    this.screenTitle(ctx, 'DELIVERED', 325);
    const minutes = Math.floor(game.elapsed / 60);
    const seconds = Math.floor(game.elapsed % 60);
    const timeText = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    this.screenLine(ctx, `Finished in ${timeText}  •  caught ${game.caughtCount} time${game.caughtCount === 1 ? '' : 's'}`, 385, 19, '#e8c24d');
    const rating =
      game.caughtCount === 0 && game.alertsRaised === 0
        ? 'GHOST — never seen, never heard'
        : game.caughtCount === 0
          ? 'SHADOW — seen, but never caught'
          : game.caughtCount <= 2
            ? 'SNEAK — a few close calls'
            : 'LOUD COURIER — the manor heard you coming';
    this.screenLine(ctx, `Stealth rating: ${rating}`, 425, 19);
    this.screenLine(ctx, 'The study door closes behind you. The letter is where it belongs.', 470, 16);
    const blink = Math.floor(Date.now() / 600) % 2 === 0;
    if (blink) this.screenLine(ctx, 'Press ENTER to play again', 540, 20, '#f2e6c8');
  }
}
