/**
 * Three.js STL viewer.
 * Lazy-loads Three.js only when the preview route mounts.
 * Handles orbit controls, wireframe toggle, lighting, shadows.
 */

let THREE = null;
let OrbitControls = null;

async function loadThree() {
  if (THREE) return;
  try {
    const mod = await import('/vendor/three.module.js');
    THREE = mod.THREE || mod;
    // OrbitControls — try to get from the module (bundled together)
    if (mod.OrbitControls) {
      OrbitControls = mod.OrbitControls;
    } else {
      // Fallback: minimal orbit controls implementation
      OrbitControls = buildMinimalOrbitControls(THREE);
    }
  } catch (e) {
    console.error('[ThreeViewer] Failed to load Three.js:', e);
    throw new Error('Three.js could not be loaded. Check /vendor/three.module.js');
  }
}

const ThreeViewer = {
  scene: null,
  camera: null,
  renderer: null,
  controls: null,
  currentMesh3D: null,
  wireframeOverlay: null,
  animFrameId: null,
  _wireframeActive: false,

  async init(containerEl) {
    await loadThree();

    const w = containerEl.clientWidth || 400;
    const h = containerEl.clientHeight || 250;

    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0d0d14);
    this.scene.fog = new THREE.Fog(0x0d0d14, 200, 600);

    // Camera
    this.camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 2000);
    this.camera.position.set(80, 80, 80);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace || THREE.sRGBEncoding || undefined;
    containerEl.appendChild(this.renderer.domElement);
    this.renderer.domElement.classList.add('viewer-canvas');

    // Lighting
    const ambient = new THREE.AmbientLight(0x404060, 0.6);
    this.scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(100, 150, 80);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    this.scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0x8090ff, 0.4);
    fillLight.position.set(-80, -50, -60);
    this.scene.add(fillLight);

    // Grid
    const grid = new THREE.GridHelper(200, 20, 0x222233, 0x1a1a2e);
    this.scene.add(grid);

    // Controls
    if (OrbitControls) {
      this.controls = new OrbitControls(this.camera, this.renderer.domElement);
      this.controls.enableDamping = true;
      this.controls.dampingFactor = 0.1;
      this.controls.minDistance = 5;
      this.controls.maxDistance = 800;
      this.controls.autoRotate = false;
      this.controls.autoRotateSpeed = 0.5;
    }

    // Handle resize
    this._resizeObserver = new ResizeObserver(() => this._onResize(containerEl));
    this._resizeObserver.observe(containerEl);

    // Start render loop
    this._animate();
  },

  loadMesh(internalMesh) {
    this._clearCurrentMesh();
    if (!internalMesh || !THREE) return;

    const flat = internalMesh.toFlatTriangles();
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(flat.positions, 3));
    geometry.setAttribute('normal',   new THREE.BufferAttribute(flat.normals, 3));
    geometry.computeBoundingBox();

    const material = new THREE.MeshStandardMaterial({
      color: 0x6c8aff,
      metalness: 0.1,
      roughness: 0.6,
      side: THREE.DoubleSide,
    });

    this.currentMesh3D = new THREE.Mesh(geometry, material);
    this.currentMesh3D.castShadow = true;
    this.currentMesh3D.receiveShadow = true;

    // Center the mesh
    const box = new THREE.Box3().setFromObject(this.currentMesh3D);
    const center = new THREE.Vector3();
    box.getCenter(center);
    this.currentMesh3D.position.sub(center);

    // Move to sit on grid (Z up in internal mesh = Y up in Three.js)
    const size = new THREE.Vector3();
    box.getSize(size);
    this.currentMesh3D.position.y -= size.y / 2;

    this.scene.add(this.currentMesh3D);

    // Fit camera
    const maxDim = Math.max(size.x, size.y, size.z);
    const fovRad = (this.camera.fov * Math.PI) / 180;
    const camDist = Math.abs(maxDim / Math.sin(fovRad / 2)) * 0.8;
    this.camera.position.set(camDist * 0.7, camDist * 0.5, camDist * 0.7);
    this.camera.lookAt(0, 0, 0);
    if (this.controls) this.controls.target.set(0, 0, 0);

    // Add wireframe overlay (hidden by default)
    const wireMat = new THREE.MeshBasicMaterial({ color: 0xa0b4ff, wireframe: true, transparent: true, opacity: 0.15 });
    this.wireframeOverlay = new THREE.Mesh(geometry, wireMat);
    this.wireframeOverlay.visible = false;
    this.scene.add(this.wireframeOverlay);
  },

  setWireframe(enabled) {
    this._wireframeActive = enabled;
    if (this.wireframeOverlay) this.wireframeOverlay.visible = enabled;
    if (this.currentMesh3D) {
      this.currentMesh3D.material.opacity = enabled ? 0.7 : 1.0;
      this.currentMesh3D.material.transparent = enabled;
    }
  },

  toggleWireframe() {
    this.setWireframe(!this._wireframeActive);
    return this._wireframeActive;
  },

  resetCamera() {
    if (!this.currentMesh3D) return;
    const box = new THREE.Box3().setFromObject(this.currentMesh3D);
    const size = new THREE.Vector3();
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);
    const fovRad = (this.camera.fov * Math.PI) / 180;
    const dist = Math.abs(maxDim / Math.sin(fovRad / 2)) * 0.8;
    this.camera.position.set(dist * 0.7, dist * 0.5, dist * 0.7);
    this.camera.lookAt(0, 0, 0);
    if (this.controls) { this.controls.target.set(0, 0, 0); this.controls.update(); }
  },

  setMaterialColor(hexColor) {
    if (this.currentMesh3D && THREE) {
      this.currentMesh3D.material.color.set(hexColor);
    }
  },

  dispose() {
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
    this._resizeObserver?.disconnect();
    this._clearCurrentMesh();
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer.domElement.remove();
    }
    this.scene = this.camera = this.renderer = this.controls = null;
  },

  _clearCurrentMesh() {
    if (this.currentMesh3D) {
      this.scene.remove(this.currentMesh3D);
      this.currentMesh3D.geometry.dispose();
      this.currentMesh3D.material.dispose();
      this.currentMesh3D = null;
    }
    if (this.wireframeOverlay) {
      this.scene.remove(this.wireframeOverlay);
      this.wireframeOverlay.material.dispose();
      this.wireframeOverlay = null;
    }
  },

  _animate() {
    this.animFrameId = requestAnimationFrame(() => this._animate());
    this.controls?.update();
    this.renderer?.render(this.scene, this.camera);
  },

  _onResize(containerEl) {
    const w = containerEl.clientWidth;
    const h = containerEl.clientHeight;
    if (!w || !h || !this.renderer) return;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }
};

/**
 * Minimal OrbitControls fallback (mouse only, no damping, no touch).
 * Used if the vendor bundle doesn't include OrbitControls.
 */
function buildMinimalOrbitControls(THREE) {
  return class MinimalOrbitControls {
    constructor(camera, domElement) {
      this.camera = camera;
      this.domElement = domElement;
      this.target = new THREE.Vector3();
      this.enableDamping = false;
      this.minDistance = 1;
      this.maxDistance = 5000;
      this._spherical = { theta: Math.PI / 4, phi: Math.PI / 4, radius: 150 };
      this._dragging = false;
      this._last = { x: 0, y: 0 };
      this._bind();
    }
    _bind() {
      const el = this.domElement;
      el.addEventListener('mousedown', e => { this._dragging = true; this._last = { x: e.clientX, y: e.clientY }; });
      el.addEventListener('mouseup', () => { this._dragging = false; });
      el.addEventListener('mousemove', e => {
        if (!this._dragging) return;
        const dx = e.clientX - this._last.x, dy = e.clientY - this._last.y;
        this._spherical.theta -= dx * 0.005;
        this._spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, this._spherical.phi + dy * 0.005));
        this._last = { x: e.clientX, y: e.clientY };
        this.update();
      });
      el.addEventListener('wheel', e => {
        e.preventDefault();
        this._spherical.radius = Math.max(this.minDistance, Math.min(this.maxDistance, this._spherical.radius * (1 + e.deltaY * 0.001)));
        this.update();
      }, { passive: false });
    }
    update() {
      const { theta, phi, radius } = this._spherical;
      const x = radius * Math.sin(phi) * Math.sin(theta);
      const y = radius * Math.cos(phi);
      const z = radius * Math.sin(phi) * Math.cos(theta);
      this.camera.position.set(x + this.target.x, y + this.target.y, z + this.target.z);
      this.camera.lookAt(this.target);
    }
  };
}

export default ThreeViewer;
