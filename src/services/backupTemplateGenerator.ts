/**
 * Backup Template Generator - Creates cryptic starfield page with hidden encrypted data
 */

import type { EncryptedPayload, BackupMetadata } from "@/types/webBackup";

/**
 * Generate the cryptic starfield HTML page with embedded encrypted data
 */
export function generateRecoveryHtml(
  payload: EncryptedPayload,
  _metadata: BackupMetadata
): string {
  // Base64 encode the payload for embedding in HTML comment
  const payloadJson = JSON.stringify(payload);
  const encodedPayload = btoa(payloadJson);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="noindex, nofollow">
  <meta name="googlebot" content="noindex, nofollow">
  <title></title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: #000;
    }
    canvas {
      display: block;
      position: fixed;
      top: 0;
      left: 0;
    }
  </style>
</head>
<body>
  <canvas id="c"></canvas>
  <!-- WYNTER:${encodedPayload} -->
  <script>
    (function() {
      const canvas = document.getElementById('c');
      const ctx = canvas.getContext('2d');

      let width, height;
      let stars = [];
      let nebulae = [];
      let mouseX = 0.5, mouseY = 0.5;
      let konamiIndex = 0;
      const konamiCode = [38, 38, 40, 40, 37, 39, 37, 39, 66, 65];
      let isFormingLogo = false;
      let logoFormProgress = 0;
      let logoHoldTime = 0;

      // W constellation points (normalized 0-1)
      const wPoints = [
        {x: 0.2, y: 0.3}, {x: 0.3, y: 0.7}, {x: 0.4, y: 0.45},
        {x: 0.5, y: 0.7}, {x: 0.6, y: 0.3}, {x: 0.55, y: 0.5},
        {x: 0.45, y: 0.5}, {x: 0.35, y: 0.5}, {x: 0.25, y: 0.5}
      ];

      function resize() {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
        initStars();
        initNebulae();
      }

      function initStars() {
        stars = [];
        const count = Math.floor((width * height) / 3000);
        for (let i = 0; i < count; i++) {
          stars.push({
            x: Math.random() * width,
            y: Math.random() * height,
            origX: 0,
            origY: 0,
            targetX: 0,
            targetY: 0,
            size: Math.random() * 2 + 0.5,
            baseAlpha: Math.random() * 0.5 + 0.3,
            alpha: 0,
            twinkleSpeed: Math.random() * 0.02 + 0.005,
            twinkleOffset: Math.random() * Math.PI * 2,
            depth: Math.random() * 0.5 + 0.5,
            hue: Math.random() > 0.9 ? Math.random() * 60 + 200 : 0
          });
        }
        stars.forEach(s => {
          s.origX = s.x;
          s.origY = s.y;
        });
      }

      function initNebulae() {
        nebulae = [
          { x: width * 0.7, y: height * 0.3, r: Math.min(width, height) * 0.4,
            colors: ['rgba(80, 40, 120, 0.03)', 'rgba(40, 20, 80, 0.02)', 'transparent'] },
          { x: width * 0.2, y: height * 0.7, r: Math.min(width, height) * 0.35,
            colors: ['rgba(30, 60, 100, 0.03)', 'rgba(20, 40, 80, 0.02)', 'transparent'] },
          { x: width * 0.5, y: height * 0.5, r: Math.min(width, height) * 0.5,
            colors: ['rgba(60, 30, 80, 0.02)', 'rgba(30, 20, 60, 0.01)', 'transparent'] }
        ];
      }

      function drawNebulae() {
        nebulae.forEach(n => {
          const gradient = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r);
          n.colors.forEach((c, i) => gradient.addColorStop(i / (n.colors.length - 1), c));
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, width, height);
        });
      }

      function triggerLogoForm() {
        if (isFormingLogo) return;
        isFormingLogo = true;
        logoFormProgress = 0;
        logoHoldTime = 0;

        // Assign target positions to brightest stars
        const brightStars = stars.slice().sort((a, b) => b.size - a.size).slice(0, wPoints.length);
        brightStars.forEach((star, i) => {
          const point = wPoints[i];
          star.targetX = width * point.x;
          star.targetY = height * point.y;
        });
      }

      function updateLogoAnimation(dt) {
        if (!isFormingLogo) return;

        const brightStars = stars.slice().sort((a, b) => b.size - a.size).slice(0, wPoints.length);

        if (logoFormProgress < 1) {
          logoFormProgress += dt * 0.8;
          if (logoFormProgress > 1) logoFormProgress = 1;

          brightStars.forEach((star, i) => {
            const t = Math.min(1, logoFormProgress * 1.5 - i * 0.05);
            const ease = t < 0 ? 0 : 1 - Math.pow(1 - t, 3);
            star.x = star.origX + (star.targetX - star.origX) * ease;
            star.y = star.origY + (star.targetY - star.origY) * ease;
          });
        } else if (logoHoldTime < 2) {
          logoHoldTime += dt;
          brightStars.forEach(star => {
            star.size = Math.min(4, star.size * 1.01);
            star.baseAlpha = Math.min(1, star.baseAlpha * 1.02);
          });
        } else {
          // Scatter back
          logoFormProgress -= dt * 1.2;
          if (logoFormProgress < 0) {
            isFormingLogo = false;
            brightStars.forEach(star => {
              star.x = star.origX;
              star.y = star.origY;
            });
            initStars();
          } else {
            brightStars.forEach((star, i) => {
              const t = logoFormProgress;
              const ease = 1 - Math.pow(1 - t, 2);
              star.x = star.origX + (star.targetX - star.origX) * ease;
              star.y = star.origY + (star.targetY - star.origY) * ease;
            });
          }
        }
      }

      function draw(time) {
        const dt = 1/60;

        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, width, height);

        drawNebulae();

        updateLogoAnimation(dt);

        // Subtle parallax
        const parallaxX = (mouseX - 0.5) * 10;
        const parallaxY = (mouseY - 0.5) * 10;

        stars.forEach(star => {
          // Twinkle
          star.alpha = star.baseAlpha + Math.sin(time * star.twinkleSpeed + star.twinkleOffset) * 0.3;
          star.alpha = Math.max(0, Math.min(1, star.alpha));

          // Draw with parallax
          const px = star.x + parallaxX * star.depth;
          const py = star.y + parallaxY * star.depth;

          if (star.hue > 0) {
            ctx.fillStyle = 'hsla(' + star.hue + ', 60%, 80%, ' + star.alpha + ')';
          } else {
            ctx.fillStyle = 'rgba(255, 255, 255, ' + star.alpha + ')';
          }

          ctx.beginPath();
          ctx.arc(px, py, star.size, 0, Math.PI * 2);
          ctx.fill();

          // Glow for larger stars
          if (star.size > 1.5) {
            const glow = ctx.createRadialGradient(px, py, 0, px, py, star.size * 3);
            glow.addColorStop(0, 'rgba(255, 255, 255, ' + (star.alpha * 0.3) + ')');
            glow.addColorStop(1, 'transparent');
            ctx.fillStyle = glow;
            ctx.beginPath();
            ctx.arc(px, py, star.size * 3, 0, Math.PI * 2);
            ctx.fill();
          }
        });

        requestAnimationFrame(draw);
      }

      // Konami code listener
      document.addEventListener('keydown', function(e) {
        if (e.keyCode === konamiCode[konamiIndex]) {
          konamiIndex++;
          if (konamiIndex === konamiCode.length) {
            konamiIndex = 0;
            triggerLogoForm();
          }
        } else {
          konamiIndex = 0;
        }
      });

      // Mouse tracking for parallax
      document.addEventListener('mousemove', function(e) {
        mouseX = e.clientX / width;
        mouseY = e.clientY / height;
      });

      window.addEventListener('resize', resize);
      resize();
      requestAnimationFrame(draw);
    })();
  </script>
</body>
</html>`;
}
