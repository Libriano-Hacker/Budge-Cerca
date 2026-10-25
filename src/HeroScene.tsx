import { useEffect, useRef } from "react";

export default function HeroScene({ paused }: { paused: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(paused);
  const wakeRef = useRef(() => {});
  useEffect(() => {
    pausedRef.current = paused;
    wakeRef.current();
  }, [paused]);
  useEffect(() => {
    let disposed = false;
    let cleanup = () => {};
    import("three")
      .then((THREE) => {
        if (disposed || !ref.current) return;
        const element = ref.current;
        let renderer: InstanceType<typeof THREE.WebGLRenderer>;
        try {
          renderer = new THREE.WebGLRenderer({
            alpha: true,
            antialias: true,
            powerPreference: "low-power",
          });
        } catch {
          element.dataset.renderer = "fallback";
          return;
        }
        renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
        renderer.setClearColor(0x000000, 0);
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.15;
        element.appendChild(renderer.domElement);
        element.dataset.renderer = "webgl";
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 70);
        camera.position.set(8, 9, 12);
        camera.lookAt(0, 0.7, 0);
        scene.add(new THREE.AmbientLight(0xb5c9ff, 1.6));
        const light = new THREE.DirectionalLight(0xffffff, 2.5);
        light.position.set(3, 9, 5);
        scene.add(light);
        const orangeLight = new THREE.PointLight(0xff773d, 40, 14);
        orangeLight.position.set(-3, 4, 3);
        scene.add(orangeLight);
        const violetLight = new THREE.PointLight(0x875bff, 45, 14);
        violetLight.position.set(3, 3, -2);
        scene.add(violetLight);
        const city = new THREE.Group();
        city.rotation.y = -0.35;
        scene.add(city);
        const mat = (color: number, metalness = 0.3) =>
          new THREE.MeshStandardMaterial({ color, metalness, roughness: 0.34 });
        const baseMaterial = mat(0x172131, 0.65);
        const towerMaterial = mat(0x334050, 0.55);
        const towerLightMaterial = mat(0x53616a, 0.4);
        const windowMaterial = new THREE.MeshBasicMaterial({ color: 0xffba70 });
        const limeMaterial = new THREE.MeshStandardMaterial({
          color: 0xd4ff4a,
          emissive: 0x95be2b,
          emissiveIntensity: 0.5,
          roughness: 0.25,
          metalness: 0.5,
        });
        const cyanMaterial = new THREE.MeshBasicMaterial({ color: 0x70d6ff });
        const base = new THREE.Mesh(
          new THREE.BoxGeometry(7.2, 0.3, 7.2),
          baseMaterial,
        );
        base.position.y = -0.2;
        city.add(base);
        const grid = new THREE.GridHelper(7, 14, 0x51616d, 0x283a49);
        grid.position.y = -0.03;
        city.add(grid);
        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(4.65, 0.024, 8, 100),
          limeMaterial,
        );
        ring.rotation.x = Math.PI / 2;
        ring.position.y = -0.3;
        city.add(ring);
        const ring2 = new THREE.Mesh(
          new THREE.TorusGeometry(4.95, 0.009, 6, 100),
          cyanMaterial,
        );
        ring2.rotation.x = Math.PI / 2;
        ring2.position.y = -0.3;
        city.add(ring2);
        const buildingGeometry = new THREE.BoxGeometry(1, 1, 1);
        const windowGeometry = new THREE.BoxGeometry(0.12, 0.1, 0.018);
        for (let x = -2; x <= 2; x++)
          for (let z = -2; z <= 2; z++) {
            if (x === 0 || z === 0) continue;
            const height = 0.55 + ((Math.abs(x * 7 + z * 3) % 7) / 7) * 1.7;
            const building = new THREE.Mesh(
              buildingGeometry,
              (x + z) % 2 ? towerMaterial : towerLightMaterial,
            );
            building.scale.set(0.8, height, 0.78);
            building.position.set(x * 1.28, height / 2, z * 1.28);
            city.add(building);
            const roof = new THREE.Mesh(
              buildingGeometry,
              (x + z) % 3 === 0 ? limeMaterial : baseMaterial,
            );
            roof.scale.set(0.9, 0.07, 0.88);
            roof.position.set(x * 1.28, height + 0.025, z * 1.28);
            city.add(roof);
            for (let floor = 0; floor < Math.floor(height / 0.3); floor++)
              for (let column = 0; column < 3; column++) {
                const window = new THREE.Mesh(windowGeometry, windowMaterial);
                window.position.set(
                  x * 1.28 - 0.24 + column * 0.24,
                  0.2 + floor * 0.3,
                  z * 1.28 + 0.399,
                );
                city.add(window);
              }
          }
        const road = new THREE.Mesh(
          new THREE.PlaneGeometry(6.9, 0.05),
          cyanMaterial,
        );
        road.rotation.x = -Math.PI / 2;
        road.position.y = 0.01;
        city.add(road);
        const road2 = road.clone();
        road2.rotation.z = Math.PI / 2;
        city.add(road2);
        const shape = new THREE.Shape();
        shape.moveTo(0, -1.1);
        shape.bezierCurveTo(-0.4, -0.55, -0.85, -0.05, -0.85, 0.4);
        shape.bezierCurveTo(-0.85, 1.5, 0.85, 1.5, 0.85, 0.4);
        shape.bezierCurveTo(0.85, -0.05, 0.4, -0.55, 0, -1.1);
        const hole = new THREE.Path();
        hole.absarc(0, 0.4, 0.3, 0, Math.PI * 2, true);
        shape.holes.push(hole);
        const pin = new THREE.Mesh(
          new THREE.ExtrudeGeometry(shape, {
            depth: 0.2,
            bevelEnabled: true,
            bevelSegments: 3,
            steps: 1,
            bevelSize: 0.07,
            bevelThickness: 0.07,
          }),
          limeMaterial,
        );
        pin.position.set(0, 3.35, 0);
        pin.rotation.y = 0.6;
        city.add(pin);
        const platform = new THREE.Mesh(
          new THREE.CylinderGeometry(0.55, 0.7, 0.08, 40),
          limeMaterial,
        );
        platform.position.y = 0.04;
        city.add(platform);
        const points = new Float32Array(90);
        for (let i = 0; i < 30; i++) {
          points[i * 3] = Math.sin(i * 4.7) * 5;
          points[i * 3 + 1] = 0.6 + ((i * 13) % 31) / 9;
          points[i * 3 + 2] = Math.cos(i * 3.3) * 4;
        }
        const particlesGeometry = new THREE.BufferGeometry();
        particlesGeometry.setAttribute(
          "position",
          new THREE.BufferAttribute(points, 3),
        );
        const particlesMaterial = new THREE.PointsMaterial({
          color: 0x8be8fc,
          size: 0.035,
          transparent: true,
          opacity: 0.65,
        });
        scene.add(new THREE.Points(particlesGeometry, particlesMaterial));
        let pointerX = 0,
          pointerY = 0,
          progress = 0,
          frame = 0,
          visible = true,
          last = 0;
        const motion = matchMedia("(prefers-reduced-motion: reduce)");
        const render = (time = 0) => {
          frame = 0;
          if (disposed) return;
          if (!motion.matches && !pausedRef.current) {
            city.rotation.y +=
              (-0.35 + pointerX * 0.17 + progress * 0.45 - city.rotation.y) *
              0.035;
            city.rotation.x += (pointerY * 0.07 - city.rotation.x) * 0.035;
            pin.position.y = 3.35 + Math.sin(time * 0.0011) * 0.12;
            ring.rotation.z = time * 0.00004;
          }
          if (visible && !document.hidden && time - last > 30) {
            renderer.render(scene, camera);
            last = time;
          }
          if (
            visible &&
            !document.hidden &&
            !motion.matches &&
            !pausedRef.current
          )
            frame = requestAnimationFrame(render);
        };
        const wake = () => {
          if (!frame) frame = requestAnimationFrame(render);
        };
        wakeRef.current = wake;
        const onPointer = (e: PointerEvent) => {
          const r = element.getBoundingClientRect();
          pointerX = (e.clientX - r.left) / r.width - 0.5;
          pointerY = (e.clientY - r.top) / r.height - 0.5;
        };
        const onScroll = () => {
          progress = Math.min(
            1,
            Math.max(0, -element.getBoundingClientRect().top / innerHeight),
          );
        };
        const resize = new ResizeObserver(() => {
          if (!element.clientWidth || !element.clientHeight) return;
          renderer.setSize(element.clientWidth, element.clientHeight);
          camera.aspect = element.clientWidth / element.clientHeight;
          camera.updateProjectionMatrix();
          renderer.render(scene, camera);
        });
        resize.observe(element);
        const observer = new IntersectionObserver((entries) => {
          visible = entries[0].isIntersecting;
          if (visible) wake();
        });
        observer.observe(element);
        element.parentElement?.addEventListener("pointermove", onPointer);
        addEventListener("scroll", onScroll, { passive: true });
        document.addEventListener("visibilitychange", wake);
        motion.addEventListener("change", wake);
        renderer.render(scene, camera);
        wake();
        cleanup = () => {
          wakeRef.current = () => {};
          cancelAnimationFrame(frame);
          resize.disconnect();
          observer.disconnect();
          element.parentElement?.removeEventListener("pointermove", onPointer);
          removeEventListener("scroll", onScroll);
          document.removeEventListener("visibilitychange", wake);
          motion.removeEventListener("change", wake);
          const geometries = new Set<
            InstanceType<typeof THREE.BufferGeometry>
          >();
          const materials = new Set<InstanceType<typeof THREE.Material>>();
          scene.traverse((object) => {
            if (
              object instanceof THREE.Mesh ||
              object instanceof THREE.LineSegments ||
              object instanceof THREE.Points
            ) {
              geometries.add(object.geometry);
              (Array.isArray(object.material)
                ? object.material
                : [object.material]
              ).forEach((m) => materials.add(m));
            }
          });
          geometries.forEach((g) => g.dispose());
          materials.forEach((m) => m.dispose());
          renderer.dispose();
          renderer.domElement.remove();
        };
      })
      .catch(() => {
        if (ref.current) ref.current.dataset.renderer = "fallback";
      });
    return () => {
      disposed = true;
      cleanup();
    };
  }, []);
  return (
    <div ref={ref} className="hero-scene" aria-hidden="true">
      <div className="scene-fallback">
        <span />
        <span />
        <span />
        <span />
        <i />
      </div>
    </div>
  );
}
