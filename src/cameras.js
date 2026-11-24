import * as THREE from 'three';

export const CAMERA_MODES = [
  { id: 'broadcast', label: 'TV Yayını' },
  { id: 'shooter', label: 'Penaltıcı Gözü' },
  { id: 'keeper', label: 'Kaleci Gözü' },
  { id: 'behindGoal', label: 'Kale Arkası' },
  { id: 'side', label: 'Yan Açı' },
  { id: 'cinematic', label: 'Sinematik' },
  { id: 'drone', label: 'Drone' },
  { id: 'ballCam', label: 'Top Gözü' },
];

const MODE_IDS = CAMERA_MODES.map((m) => m.id);

export function createCameraRig(camera) {
  let mode = 'broadcast';
  let initialized = false;
  let time = 0;
  let shakeAmount = 0;

  const currentPos = new THREE.Vector3(3.4, 5.2, 19.5);
  const currentLook = new THREE.Vector3(0, 1.3, 3.0);
  const targetPos = new THREE.Vector3();
  const targetLook = new THREE.Vector3();
  const prevBallPos = new THREE.Vector3(0, 0.11, 11);
  const estBallDir = new THREE.Vector3(0, 0, -1);

  const defaultBall = new THREE.Vector3(0, 0.11, 11);
  const defaultKeeperPos = new THREE.Vector3(0, 0, 0.3);
  const defaultShooterPos = new THREE.Vector3(0, 0, 13.5);
  const tmpKeeperPos = new THREE.Vector3();
  const tmpShooterPos = new THREE.Vector3();
  const shakeOffset = new THREE.Vector3();
  const finalLook = new THREE.Vector3();

  function setMode(id) {
    if (MODE_IDS.includes(id)) {
      mode = id;
    }
    return mode;
  }

  function getMode() {
    return mode;
  }

  function next() {
    const idx = MODE_IDS.indexOf(mode);
    mode = MODE_IDS[(idx + 1) % MODE_IDS.length];
    return mode;
  }

  function shake(intensity = 0.5) {
    const v = Math.max(0, Math.min(1, Number(intensity) || 0));
    shakeAmount = Math.min(1.0, Math.max(shakeAmount, v));
  }

  function getObjectPos(obj, fallback, out) {
    if (obj && obj.position) {
      out.copy(obj.position);
      return out;
    }
    out.copy(fallback);
    return out;
  }

  function computeTargets(ctx, dt) {
    const ball = ctx && ctx.ball ? ctx.ball : defaultBall;
    const keeperPos = getObjectPos(ctx && ctx.keeper, defaultKeeperPos, tmpKeeperPos);
    const shooterPos = getObjectPos(ctx && ctx.shooter, defaultShooterPos, tmpShooterPos);
    const phase = (ctx && ctx.phase) || 'aim';
    const isReplay = Boolean(ctx && ctx.isReplay);
    const inFlight = phase === 'flight' || phase === 'result';

    // Update estimated ball travel direction for ballCam
    if (ctx && ctx.ballVel && ctx.ballVel.lengthSq() > 0.25) {
      estBallDir.copy(ctx.ballVel).normalize();
    } else if (dt > 0.0001) {
      const dx = ball.x - prevBallPos.x;
      const dy = ball.y - prevBallPos.y;
      const dz = ball.z - prevBallPos.z;
      const len = Math.hypot(dx, dy, dz);
      if (len > 0.015) {
        estBallDir.set(dx / len, dy / len, dz / len);
      } else if (!inFlight) {
        estBallDir.set(0, 0.08, -1).normalize();
      }
    }
    prevBallPos.copy(ball);

    // Polished TV broadcast slow-mo replay framing (never clips into net or stands)
    if (isReplay) {
      if (mode === 'behindGoal') {
        targetPos.set(
          Math.max(-4.2, Math.min(4.2, ball.x * 0.35)),
          1.95,
          -5.2
        );
        targetLook.set(
          ball.x * 0.85,
          Math.max(0.5, ball.y * 0.9),
          Math.max(-1.2, Math.min(8.5, ball.z * 0.85))
        );
        return 5.5;
      }
      // Low dramatic broadcast angle on the opposite side of the shot, staying safely in front of z=0
      const sideSign = ball.x >= 0 ? -1 : 1;
      targetPos.set(
        sideSign * 5.6 + ball.x * 0.22,
        Math.max(1.2, 1.38 + ball.y * 0.32),
        Math.max(2.3, Math.min(13.5, ball.z * 0.55 + 3.4))
      );
      targetLook.set(
        ball.x * 0.88,
        Math.max(0.45, ball.y * 0.85),
        Math.max(-1.1, Math.min(9.5, ball.z * 0.85))
      );
      return 5.5;
    }

    switch (mode) {
      case 'broadcast': {
        targetPos.set(
          3.2 + (inFlight ? ball.x * 0.25 : 0),
          5.1,
          19.6
        );
        if (inFlight) {
          targetLook.set(
            ball.x * 0.55,
            Math.max(0.8, 1.2 + ball.y * 0.35),
            Math.max(-0.5, ball.z * 0.35)
          );
        } else {
          targetLook.set(0, 1.35, 3.2);
        }
        return 6.0;
      }

      case 'shooter': {
        const zBase = phase === 'runup'
          ? Math.max(12.2, shooterPos.z - 0.35)
          : 12.85;
        const xBase = phase === 'runup' ? shooterPos.x * 0.65 : 0;
        targetPos.set(xBase, 1.52, zBase);

        if (inFlight) {
          targetLook.set(
            ball.x * 0.72,
            Math.max(0.6, 0.9 + ball.y * 0.55),
            Math.min(2.0, ball.z)
          );
        } else {
          targetLook.set(0, 1.32, 0);
        }
        return 7.5;
      }

      case 'keeper': {
        // Offset clear in front (+z) so leaning/diving/disappointed head & gloves never clip near plane.
        const isResult = phase === 'result';
        const eyeX = keeperPos.x;
        const eyeY = isResult
          ? Math.max(1.55, keeperPos.y + 1.68)
          : Math.max(1.42, keeperPos.y + 1.62);
        const eyeZ = keeperPos.z + (isResult ? 1.15 : 0.68);
        targetPos.set(eyeX, eyeY, eyeZ);

        if (inFlight) {
          const lookZ = Math.max(eyeZ + 0.9, ball.z);
          targetLook.set(
            ball.x * 0.85,
            Math.max(0.35, ball.y),
            lookZ
          );
        } else {
          targetLook.set(
            ball.x * 0.5 + shooterPos.x * 0.2,
            1.05,
            11.2
          );
        }
        return 11.0;
      }

      case 'behindGoal': {
        targetPos.set(
          inFlight ? ball.x * 0.22 : 0,
          1.72,
          -4.8
        );
        if (inFlight) {
          targetLook.set(
            ball.x * 0.6,
            Math.max(0.6, 0.7 + ball.y * 0.45),
            Math.max(0.5, ball.z * 0.75)
          );
        } else {
          targetLook.set(0, 1.25, 11.0);
        }
        return 6.5;
      }

      case 'side': {
        targetPos.set(15.2, 3.1, 6.2);
        if (inFlight) {
          targetLook.set(
            ball.x * 0.4,
            Math.max(0.7, 0.9 + ball.y * 0.5),
            Math.max(-0.5, Math.min(11.5, ball.z))
          );
        } else {
          targetLook.set(0, 1.35, 5.4);
        }
        return 6.5;
      }

      case 'cinematic': {
        if (phase === 'flight') {
          targetPos.set(
            ball.x * 0.55 - 2.3,
            Math.max(0.85, ball.y * 0.65 + 1.15),
            ball.z + 4.3
          );
          targetLook.set(
            ball.x * 0.9,
            Math.max(0.35, ball.y * 0.85),
            Math.min(ball.z - 2.2, 0.4)
          );
          return 7.0;
        }
        if (phase === 'result') {
          const angle = time * 0.45;
          targetPos.set(
            Math.sin(angle) * 6.5,
            2.4,
            3.5 + Math.cos(angle) * 4.5
          );
          targetLook.set(
            ball.x * 0.6,
            Math.max(0.7, ball.y * 0.6 + 0.6),
            Math.max(-1.0, Math.min(6.0, ball.z))
          );
          return 3.5;
        }
        if (phase === 'runup') {
          targetPos.set(-2.6, 1.25, 13.4);
          targetLook.set(0.2, 1.25, 1.5);
          return 5.0;
        }
        targetPos.set(
          -3.6 + Math.sin(time * 0.55) * 0.55,
          1.18,
          14.1
        );
        targetLook.set(0.35, 1.35, 1.2);
        return 4.5;
      }

      case 'drone': {
        const angle = time * 0.22;
        const radius = 18.5;
        targetPos.set(
          Math.sin(angle) * radius,
          17.5,
          5.5 + Math.cos(angle) * radius
        );
        targetLook.set(
          inFlight ? ball.x * 0.35 : 0,
          0.6,
          inFlight ? Math.max(0, ball.z * 0.5 + 2.5) : 5.5
        );
        return 4.5;
      }

      case 'ballCam': {
        // Rides closely behind & slightly above the ball during flight
        if (phase === 'flight') {
          const trailDist = 2.1;
          targetPos.set(
            ball.x - estBallDir.x * trailDist,
            Math.max(0.45, ball.y + 0.48 - estBallDir.y * 0.6),
            ball.z - estBallDir.z * trailDist
          );
          targetLook.set(
            ball.x + estBallDir.x * 3.5,
            Math.max(0.3, ball.y + estBallDir.y * 1.5),
            ball.z + estBallDir.z * 3.5
          );
          return 12.0;
        }
        if (phase === 'result') {
          targetPos.set(
            ball.x * 0.7 + 1.8,
            Math.max(1.0, ball.y + 0.9),
            Math.max(1.2, ball.z + 3.2)
          );
          targetLook.set(ball.x, Math.max(0.3, ball.y), ball.z);
          return 5.5;
        }
        // Tight dramatic low angle behind the penalty spot before kick
        targetPos.set(0, 0.55, 12.35);
        targetLook.set(0, 1.35, 0);
        return 7.5;
      }

      default: {
        targetPos.set(3.2, 5.1, 19.6);
        targetLook.set(0, 1.35, 3.2);
        return 6.0;
      }
    }
  }

  function update(dt, ctx) {
    const safeDt = Math.min(Math.max(dt || 0, 0), 0.1);
    time += safeDt;

    const speed = computeTargets(ctx, safeDt);

    if (!initialized) {
      currentPos.copy(targetPos);
      currentLook.copy(targetLook);
      initialized = true;
    } else {
      const alpha = 1 - Math.exp(-speed * safeDt);
      currentPos.lerp(targetPos, alpha);
      currentLook.lerp(targetLook, alpha);
    }

    // Apply damped camera shake
    if (shakeAmount > 0.002) {
      const mag = shakeAmount * shakeAmount * 0.34;
      shakeOffset.set(
        (Math.sin(time * 61.3) + Math.cos(time * 97.1)) * 0.5 * mag,
        (Math.cos(time * 73.7) + Math.sin(time * 113.2)) * 0.5 * mag,
        Math.sin(time * 53.9) * 0.3 * mag
      );
      camera.position.copy(currentPos).add(shakeOffset);
      finalLook.copy(currentLook).addScaledVector(shakeOffset, 0.45);
      camera.lookAt(finalLook);

      shakeAmount *= Math.exp(-7.5 * safeDt);
      if (shakeAmount < 0.002) shakeAmount = 0;
    } else {
      camera.position.copy(currentPos);
      camera.lookAt(currentLook);
    }
  }

  return {
    setMode,
    getMode,
    next,
    shake,
    update,
  };
}
