// Prop library for the dioramas (Phase N): the selected Kenney "Nature Kit" models (CC0, see
// CREDITS.md), recoloured to our palette with ONE shared set of matte clay materials.
//   loadProps()            → Promise, loads every model once (each model's meshes are merged per
//                            material, so a prop is 1–2 geometry parts)
//   propParts(name)        → [{ geometry, material }] (shared: never dispose them per station)
//   propSize(name)         → Vector3 bounding size (Kenney units ≈ metres)
//   createPropInstances(placements) → THREE.Group of InstancedMeshes, one per (model, material):
//                            placements = [{ name, x, y, z, scale, rotY }] in the group's space
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const MODEL_URLS = import.meta.glob('../assets/models/kenney-nature/*.glb', { eager: true, query: '?url', import: 'default' });

// Kenney material name → our palette (soft warm greens, warm grey rocks, pink / white / lilac
// flowers, honey wood). One shared material per colour: matte clay.
const PALETTE = {
  grass: '#8CBF72',
  leafsGreen: '#7BB66A',
  leafsDark: '#5F9C5C',
  colorRed: '#F29AB8', // flowers: pink
  colorYellow: '#FFF5EA', // flowers: white
  colorPurple: '#C7A6E6', // flowers: lilac
  dirt: '#D8B48F',
  stone: '#A59E99',
  _defaultMat: '#A59E99',
  woodBark: '#8E6448',
  wood: '#D9A066',
  woodDark: '#B07C4A',
  woodInner: '#F0D2A8',
};

const materials = {};
export function clayMaterial(name) {
  if (!materials[name]) {
    materials[name] = new THREE.MeshStandardMaterial({
      color: PALETTE[name] ?? '#CCCCCC',
      roughness: 0.95,
      metalness: 0,
      flatShading: true,
    });
  }
  return materials[name];
}

const library = new Map(); // name → { parts: [{ geometry, material }], size }
let loading = null;

function modelName(url) {
  return url.split('/').pop().replace(/\.glb$/, '');
}

export function loadProps() {
  if (loading) return loading;
  const loader = new GLTFLoader();
  loading = Promise.all(
    Object.entries(MODEL_URLS).map(async ([path, url]) => {
      const gltf = await loader.loadAsync(url);
      gltf.scene.updateMatrixWorld(true);
      const byMaterial = new Map();
      gltf.scene.traverse((o) => {
        if (!o.isMesh) return;
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        // Split multi-material meshes by group
        const groups = o.geometry.groups.length ? o.geometry.groups : [{ start: 0, count: Infinity, materialIndex: 0 }];
        for (const g of groups) {
          const matName = mats[g.materialIndex ?? 0].name;
          let geo = o.geometry.clone();
          if (o.geometry.groups.length) {
            const index = geo.index.array.slice(g.start, g.start + g.count);
            geo.setIndex(Array.from(index));
            geo.clearGroups();
          }
          geo = geo.toNonIndexed();
          for (const key of Object.keys(geo.attributes)) if (key !== 'position' && key !== 'normal') geo.deleteAttribute(key);
          geo.applyMatrix4(o.matrixWorld);
          if (!byMaterial.has(matName)) byMaterial.set(matName, []);
          byMaterial.get(matName).push(geo);
        }
      });
      const parts = [...byMaterial].map(([matName, geos]) => {
        const geometry = geos.length > 1 ? mergeGeometries(geos) : geos[0];
        geometry.computeVertexNormals();
        geometry.computeBoundingBox();
        return { geometry, material: clayMaterial(matName) };
      });
      const box = new THREE.Box3();
      parts.forEach((p) => box.union(p.geometry.boundingBox));
      library.set(modelName(path), { parts, size: box.getSize(new THREE.Vector3()), box });
    }),
  ).then(() => {
    console.info(`[props] ${library.size} models loaded`);
    return library;
  });
  return loading;
}

export function propParts(name) {
  const entry = library.get(name);
  if (!entry) throw new Error(`[props] unknown model ${name}`);
  return entry.parts;
}

export function propSize(name) {
  return library.get(name).size;
}

const m4 = new THREE.Matrix4();
const q = new THREE.Quaternion();
const v = new THREE.Vector3();
const s = new THREE.Vector3();
const Y = new THREE.Vector3(0, 1, 0);

/** One InstancedMesh per (model, material) for all placements. Dispose with disposePropInstances. */
export function createPropInstances(placements) {
  const group = new THREE.Group();
  const byModel = new Map();
  for (const p of placements) {
    if (!byModel.has(p.name)) byModel.set(p.name, []);
    byModel.get(p.name).push(p);
  }
  for (const [name, list] of byModel) {
    for (const part of propParts(name)) {
      const mesh = new THREE.InstancedMesh(part.geometry, part.material, list.length);
      list.forEach((p, i) => {
        q.setFromAxisAngle(Y, p.rotY ?? 0);
        const sc = p.scale ?? 1;
        s.set(sc * (p.sx ?? 1), sc * (p.sy ?? 1), sc * (p.sz ?? 1));
        mesh.setMatrixAt(i, m4.compose(v.set(p.x, p.y, p.z), q, s));
      });
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
      group.add(mesh);
    }
  }
  return group;
}

/** InstancedMeshes own only their instance buffers; the geometry and materials are shared. */
export function disposePropInstances(group) {
  group.traverse((o) => {
    if (o.isInstancedMesh) o.dispose();
  });
}
