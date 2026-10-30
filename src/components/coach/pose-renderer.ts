import * as THREE from "three";
import { POSE_CONNECTIONS } from "@/lib/pose/exercises";
import { angle } from "@/lib/pose/math";
import { landmarkToScene } from "@/lib/pose/projection";
import type { Landmark, ExerciseId, FrameAnalysis } from "@/lib/pose/types";
export interface ThreeHUDState {
  scene: THREE.Scene;
  camera: THREE.OrthographicCamera;
  renderer: THREE.WebGLRenderer;
  jointMeshes: Map<number, THREE.Mesh>;
  lineSegments: THREE.LineSegments;
  gridHelper: THREE.GridHelper;
  cage?: THREE.LineSegments;
  sparkGroups?: Map<number, THREE.Group>;
  initialized: boolean;
}

export function disposeThreeHUD(state: ThreeHUDState | null) {
  if (!state) return;
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const collect = (object: THREE.Object3D) => {
    const drawable = object as THREE.Mesh;
    if (drawable.geometry) geometries.add(drawable.geometry);
    if (drawable.material) for (const material of Array.isArray(drawable.material) ? drawable.material : [drawable.material]) materials.add(material);
  };
  state.scene.traverse(collect);
  collect(state.gridHelper); if (state.cage) collect(state.cage);
  geometries.forEach(geometry => geometry.dispose()); materials.forEach(material => material.dispose());
  state.renderer.dispose(); state.renderer.forceContextLoss(); state.initialized = false;
}

export function initThreeHUD(canvas: HTMLCanvasElement): ThreeHUDState {
  const width = canvas.clientWidth || 640;
  const height = canvas.clientHeight || 360;
  const aspect = width / height;

  const scene = new THREE.Scene();

  const camera = new THREE.OrthographicCamera(-aspect, aspect, 1, -1, .1, 20);
  camera.position.set(0, 0, 5);
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: "high-performance",
  });
  renderer.setSize(width, height, false);
  // Intrinsic pixels match the video; CSS applies the same object-contain transform.
  renderer.setPixelRatio(1);

  const gridHelper = new THREE.GridHelper(14, 28, 0x06b6d4, 0x1e293b);
  gridHelper.position.y = -2.4;
  gridHelper.position.z = -1;
  gridHelper.rotation.x = Math.PI / 18;
  // Keep tracking display free of a decorative floor grid.

  // Futuristic Bounding cage wireframe cuboid enclosing the skeleton in 3D
  const cageGeo = new THREE.BoxGeometry(4.8, 5.8, 3.8);
  const cageEdges = new THREE.EdgesGeometry(cageGeo);
  const cageMat = new THREE.LineBasicMaterial({
    color: 0x0891b2,
    transparent: true,
    opacity: 0.35,
  });
  const cage = new THREE.LineSegments(cageEdges, cageMat);
  cage.position.set(0, 0.2, -0.5);
  // Cage remains a disposable helper, not a rendered measurement.

  const ambient = new THREE.AmbientLight(0xffffff, 0.95);
  scene.add(ambient);

  const jointMeshes = new Map<number, THREE.Mesh>();
  const jointsToRender = [11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28];

  const sphereGeo = new THREE.SphereGeometry(0.012, 12, 12);

  jointsToRender.forEach((idx) => {
    const mat = new THREE.MeshBasicMaterial({
      color: 0x06b6d4,
      transparent: true,
      opacity: 0.95,
    });
    const mesh = new THREE.Mesh(sphereGeo, mat);
    mesh.visible = false;
    scene.add(mesh);
    jointMeshes.set(idx, mesh);
  });

  const sparkGroups = new Map<number, THREE.Group>();

  const boneMaterial = new THREE.LineBasicMaterial({
    color: 0x0891b2,
    transparent: true,
    opacity: 0.8,
  });

  const lineGeo = new THREE.BufferGeometry();
  const linePositions = new Float32Array(POSE_CONNECTIONS.length * 6);
  lineGeo.setAttribute("position", new THREE.BufferAttribute(linePositions, 3));

  const lineSegments = new THREE.LineSegments(lineGeo, boneMaterial);
  scene.add(lineSegments);

  return {
    scene,
    camera,
    renderer,
    jointMeshes,
    lineSegments,
    gridHelper,
    cage,
    sparkGroups,
    initialized: true,
  };
}

export function updateThreeHUD(
  threeState: ThreeHUDState | null,
  landmarks: Landmark[] | null,
  score: number,
  streakCount: number,
  mirror: boolean,
  exerciseId: ExerciseId,
  analysis?: FrameAnalysis
) {
  if (!threeState?.initialized) return;
  landmarks ??= [];

  const { scene, camera, renderer, jointMeshes, lineSegments, gridHelper, cage, sparkGroups } = threeState;

  const perfColor = score >= 88 ? 0xb9d6be : score >= 72 ? 0xe4c796 : score >= 55 ? 0xe4c796 : 0xe2a9a0;
  const activeColor = perfColor;

  if (gridHelper && gridHelper.material) {
    (gridHelper.material as THREE.LineBasicMaterial).color.setHex(activeColor);
  }

  if (cage && cage.material) {
    (cage.material as THREE.LineBasicMaterial).color.setHex(activeColor);
  }

  const aspect = (camera.right - camera.left) / 2;

  jointMeshes.forEach((mesh, idx) => {
    const pt = landmarks[idx];
    if (pt && (pt.visibility ?? 0) > 0.4) {
      mesh.visible = true;
      const position = landmarkToScene(pt, aspect, mirror);
      mesh.position.set(position.x, position.y, position.z);

      (mesh.material as THREE.MeshBasicMaterial).color.setHex(activeColor);
    } else {
      mesh.visible = false;
    }
  });

  if (sparkGroups) {
    sparkGroups.forEach((group, jointIdx) => {
      const parentMesh = jointMeshes.get(jointIdx);
      if (parentMesh && parentMesh.visible) {
        group.visible = true;
        group.position.copy(parentMesh.position);

        group.rotation.x += 0.025;
        group.rotation.y += 0.035;

        group.children.forEach((child) => {
          if (child instanceof THREE.Mesh && child.material) {
            (child.material as THREE.MeshBasicMaterial).color.setHex(activeColor);
          }
        });
      } else {
        group.visible = false;
      }
    });
  }

  const posArr = lineSegments.geometry.attributes.position.array as Float32Array;
  let arrIdx = 0;

  for (const [a, b] of POSE_CONNECTIONS) {
    const startMesh = jointMeshes.get(a);
    const endMesh = jointMeshes.get(b);

    if (startMesh?.visible && endMesh?.visible) {
      posArr[arrIdx++] = startMesh.position.x;
      posArr[arrIdx++] = startMesh.position.y;
      posArr[arrIdx++] = startMesh.position.z;

      posArr[arrIdx++] = endMesh.position.x;
      posArr[arrIdx++] = endMesh.position.y;
      posArr[arrIdx++] = endMesh.position.z;
    } else {
      posArr[arrIdx++] = 0; posArr[arrIdx++] = 0; posArr[arrIdx++] = 0;
      posArr[arrIdx++] = 0; posArr[arrIdx++] = 0; posArr[arrIdx++] = 0;
    }
  }

  lineSegments.geometry.attributes.position.needsUpdate = true;
  (lineSegments.material as THREE.LineBasicMaterial).color.setHex(activeColor);

  // A fixed view keeps pose depth readable instead of orbiting independently.
  renderer.render(scene, camera);
}

export function draw(
  canvas: HTMLCanvasElement | null,
  video: HTMLVideoElement | null,
  landmarks: Landmark[] | null,
  score: number,
  mirror: boolean,
  exerciseId?: ExerciseId,
  analysis?: FrameAnalysis,
  skipSkeleton2D = false
) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  if (video) {
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
  } else {
    canvas.width = canvas.width || 640;
    canvas.height = canvas.height || 360;
  }
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (!landmarks?.length) return;

  const defaultColor = score >= 88 ? "#b9d6be" : score >= 72 ? "#e4c796" : score >= 55 ? "#e4c796" : "#e2a9a0";

  ctx.save();
  if (mirror) {
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
  }

  if (!skipSkeleton2D) {
    // Draw HUD lines (bones) with localized color highlights based on joint metrics!
    ctx.lineWidth = 4.5;
  for (const [a, b] of POSE_CONNECTIONS) {
    const start = landmarks[a];
    const end = landmarks[b];
    if (!start || !end || (start.visibility ?? 0) < 0.4 || (end.visibility ?? 0) < 0.4) continue;

    let stroke = defaultColor;
    if (analysis && analysis.metrics.length && !analysis.metrics.some(metric => metric.reliable === false)) {
      if (exerciseId === "bicep_curl") {
        const isArm = (a === 11 && b === 13) || (a === 13 && b === 15) || (a === 12 && b === 14) || (a === 14 && b === 16);
        if (isArm) {
          const elbowPath = analysis.metrics.find((m) => m.name.includes("Elbow"))?.score ?? 100;
          const wristStack = analysis.metrics.find((m) => m.name.includes("Wrist"))?.score ?? 100;
          const minArmScore = Math.min(elbowPath, wristStack);
          stroke = minArmScore >= 85 ? "#b9d6be" : minArmScore >= 70 ? "#e4c796" : "#e2a9a0";
        }
        const isTorso = (a === 11 && b === 23) || (a === 12 && b === 24) || (a === 11 && b === 12);
        if (isTorso) {
          const torsoStab = analysis.metrics.find((m) => m.name.includes("Torso"))?.score ?? 100;
          stroke = torsoStab >= 85 ? "#b9d6be" : torsoStab >= 70 ? "#e4c796" : "#e2a9a0";
        }
      } else if (exerciseId === "squat") {
        const isLeg = (a === 23 && b === 25) || (a === 25 && b === 27) || (a === 24 && b === 26) || (a === 26 && b === 28);
        if (isLeg) {
          const depth = analysis.metrics.find((m) => m.name.includes("Depth"))?.score ?? 100;
          const kneeTrack = analysis.metrics.find((m) => m.name.includes("Knee"))?.score ?? 100;
          const minLegScore = Math.min(depth, kneeTrack);
          stroke = minLegScore >= 85 ? "#b9d6be" : minLegScore >= 70 ? "#e4c796" : "#e2a9a0";
        }
        const isTorso = (a === 11 && b === 23) || (a === 12 && b === 24) || (a === 11 && b === 12) || (a === 23 && b === 24);
        if (isTorso) {
          const torsoStack = analysis.metrics.find((m) => m.name.includes("Torso"))?.score ?? 100;
          stroke = torsoStack >= 85 ? "#b9d6be" : torsoStack >= 70 ? "#e4c796" : "#e2a9a0";
        }
      } else if (exerciseId === "pushup" || exerciseId === "plank") {
        const isBody = (a === 11 && b === 23) || (a === 23 && b === 25) || (a === 25 && b === 27) || (a === 12 && b === 24) || (a === 24 && b === 26) || (a === 26 && b === 28);
        if (isBody) {
          const bodyLine = analysis.metrics.find((m) => m.name.includes("Body"))?.score ?? 100;
          stroke = bodyLine >= 85 ? "#b9d6be" : bodyLine >= 70 ? "#e4c796" : "#e2a9a0";
        }
        const isArm = (a === 11 && b === 13) || (a === 13 && b === 15) || (a === 12 && b === 14) || (a === 14 && b === 16);
        if (isArm) {
          const depth = analysis.metrics.find((m) => m.name.includes("Depth"))?.score ?? 100;
          stroke = depth >= 85 ? "#b9d6be" : depth >= 70 ? "#e4c796" : "#e2a9a0";
        }
      } else if (exerciseId === "lunge") {
        const isLeg = (a === 23 && b === 25) || (a === 25 && b === 27) || (a === 24 && b === 26) || (a === 26 && b === 28);
        if (isLeg) {
          const frontKnee = analysis.metrics.find((m) => m.name.includes("Front"))?.score ?? 100;
          stroke = frontKnee >= 85 ? "#b9d6be" : frontKnee >= 70 ? "#e4c796" : "#e2a9a0";
        }
        const isTorso = (a === 11 && b === 23) || (a === 12 && b === 24) || (a === 11 && b === 12);
        if (isTorso) {
          const torso = analysis.metrics.find((m) => m.name.includes("Torso"))?.score ?? 100;
          stroke = torso >= 85 ? "#b9d6be" : torso >= 70 ? "#e4c796" : "#e2a9a0";
        }
      }
    }

    ctx.strokeStyle = stroke;
    ctx.beginPath();
    ctx.moveTo(start.x * canvas.width, start.y * canvas.height);
    ctx.lineTo(end.x * canvas.width, end.y * canvas.height);
    ctx.stroke();
  }

  // Draw joints (dots) with halo glow if warning/critical
  for (const [idx, point] of landmarks.entries()) {
    if (!point || (point.visibility ?? 0) < 0.35) continue;
    ctx.beginPath();
    ctx.arc(point.x * canvas.width, point.y * canvas.height, 6, 0, Math.PI * 2);
    ctx.fillStyle = defaultColor;
    ctx.fill();

    if (analysis && (idx === 13 || idx === 14 || idx === 25 || idx === 26)) {
      const isElbow = idx === 13 || idx === 14;
      const isKnee = idx === 25 || idx === 26;

      if (isElbow && exerciseId === "bicep_curl") {
        const elbowPath = analysis.metrics.find((m) => m.name.includes("Elbow"))?.score ?? 100;
        if (elbowPath < 70) {
          ctx.strokeStyle = "rgba(244, 63, 94, 0.45)";
          ctx.lineWidth = 2;
          ctx.setLineDash([3, 3]);
          ctx.beginPath();
          ctx.arc(point.x * canvas.width, point.y * canvas.height, 16, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }

      if (isKnee && exerciseId === "squat") {
        const kneeTrack = analysis.metrics.find((m) => m.name.includes("Knee"))?.score ?? 100;
        if (kneeTrack < 70) {
          ctx.strokeStyle = "rgba(244, 63, 94, 0.5)";
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(point.x * canvas.width, point.y * canvas.height, 16, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
    }
  }
  }

  // Helper to draw clean angle readouts on canvas
  function drawAngleHUD(aIdx: number, bIdx: number, cIdx: number, label: string) {
    if (!landmarks) return;
    const a = landmarks[aIdx];
    const b = landmarks[bIdx];
    const c = landmarks[cIdx];
    if (a && b && c && (a.visibility ?? 0) > 0.45 && (b.visibility ?? 0) > 0.5 && (c.visibility ?? 0) > 0.45) {
      const pixel = (point: Landmark) => ({ ...point, x: point.x * (canvas?.width ?? 1280), y: point.y * (canvas?.height ?? 720) });
      const ang = angle(pixel(a), pixel(b), pixel(c));
      const pixelScale = Math.min(3, (canvas?.width ?? 640) / Math.max(canvas?.clientWidth ?? 640, 1));
      const boxW = 54 * pixelScale;
      const boxH = 34 * pixelScale;
      const width = canvas?.width ?? 640;
      const height = canvas?.height ?? 360;
      const screenX = (mirror ? 1 - b.x : b.x) * width;
      const bx = Math.max(boxW / 2, Math.min(width - boxW / 2, screenX));
      const by = Math.max(boxH + 4, Math.min(height - 4, b.y * height));

      if (ctx) {
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.fillStyle = "rgba(9, 9, 11, 0.72)";
        ctx.beginPath();
        ctx.roundRect(bx - boxW / 2, by - boxH, boxW, boxH, 6 * pixelScale);
        ctx.fill();

        ctx.fillStyle = "#f1f6ee";
        ctx.font = `600 ${12 * pixelScale}px system-ui, sans-serif`;
        ctx.textAlign = "center";
        ctx.fillText(`${Math.round(ang)}°`, bx, by - 18 * pixelScale);

        ctx.fillStyle = "#d4ddd1";
        ctx.font = `${9 * pixelScale}px system-ui, sans-serif`;
        ctx.fillText(label, bx, by - 5 * pixelScale);
        ctx.restore();
      }
    }
  }

  if (exerciseId === "bicep_curl") {
    drawAngleHUD(11, 13, 15, "L ELBOW");
    drawAngleHUD(12, 14, 16, "R ELBOW");
  } else if (exerciseId === "squat") {
    drawAngleHUD(23, 25, 27, "L KNEE");
    drawAngleHUD(24, 26, 28, "R KNEE");
  } else if (exerciseId === "pushup" || exerciseId === "plank") {
    drawAngleHUD(11, 13, 15, "L ELBOW");
    drawAngleHUD(12, 14, 16, "R ELBOW");
  } else if (exerciseId === "lunge") {
    drawAngleHUD(23, 25, 27, "L KNEE");
    drawAngleHUD(24, 26, 28, "R KNEE");
  }

  ctx.restore();

  // Readable feedback lives in accessible HTML beneath the camera.
}
