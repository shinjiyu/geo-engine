// GPL-3.0-only adapter for geo-engine's Cube-sphere cell-center vectors.
import Delaunator from 'delaunator';
import { makeRng } from './js/rng.js';
import { SimplexNoise } from './js/simplex-noise.js';
import {
    setDelaunator,
    stereographicProjection,
    addPoleToMesh,
    SphereMesh,
    computeNeighborDist,
} from './js/sphere-mesh.js';
import { generateCoarsePlates, projectCoarsePlates } from './js/coarse-plates.js';
import { smoothAndReconnectPlates } from './js/plates.js';
import { applyPlatePhysics } from './js/plate-physics.js';
import { buildSuperPlates } from './js/super-plates.js';
import { assignElevation } from './js/elevation.js';
import {
    warpTerrain,
    smoothElevation,
    erodeComposite,
    sharpenRidges,
    applySoilCreep,
    applyDetailNoise,
} from './js/terrain-post.js';
import { SUPER_PLATE_PHYSICS_MULT, DETAIL_NOISE_DAMPEN_STRENGTH } from './js/terrain-config.js';
import { elevToHeightKm } from './js/color-map.js';

setDelaunator(Delaunator);

function buildMeshFromPositions(sourceXYZ) {
    const count = sourceXYZ.length / 3;
    const r_xyz = new Float32Array(3 * (count + 1));
    r_xyz.set(sourceXYZ);
    r_xyz[3 * count + 2] = 1;

    const flat = stereographicProjection(r_xyz, count);
    const delaunay = new Delaunator(flat);
    const closed = addPoleToMesh(count, delaunay.triangles, delaunay.halfedges);
    return {
        mesh: new SphereMesh(closed.triangles, closed.halfedges, count + 1),
        r_xyz,
        count,
    };
}

function detailDampenField(debugLayers) {
    const cw = debugLayers?.cratonWeight;
    const bw = debugLayers?.basinWeight;
    if (!cw || !bw) return null;
    const out = new Float32Array(cw.length);
    for (let i = 0; i < out.length; i++) out[i] = Math.max(cw[i], bw[i]);
    return out;
}

function orogenicField(debugLayers) {
    const source = debugLayers?.orogenicPower;
    if (!source) return null;
    const out = new Float32Array(source.length);
    for (let i = 0; i < out.length; i++) out[i] = Math.max(0, Math.min(1, source[i] + 0.5));
    return out;
}

function postProcess(mesh, r_xyz, elevation, debugLayers, neighborDist, seed, options) {
    const warp = options.terrainWarp ?? 0.12;
    if (warp > 0) warpTerrain(mesh, elevation, r_xyz, seed, warp, debugLayers.hotspot);

    const ocean = new Uint8Array(mesh.numRegions);
    for (let r = 0; r < ocean.length; r++) ocean[r] = elevation[r] <= 0 ? 1 : 0;

    const smoothing = options.smoothing ?? 0.2;
    if (smoothing > 0) {
        smoothElevation(mesh, elevation, ocean, Math.round(1 + smoothing * 4), 0.2 + smoothing * 0.5);
    }

    const dampenField = detailDampenField(debugLayers);
    const amplitudeField = orogenicField(debugLayers);
    applyDetailNoise(mesh, r_xyz, elevation, ocean, seed, {
        dampenField,
        dampenStrength: DETAIL_NOISE_DAMPEN_STRENGTH,
        amplitudeField,
    });
    applyDetailNoise(mesh, r_xyz, elevation, ocean, seed, {
        amplitudeKm: 0.05,
        frequencyMult: 2,
        warpAmpMult: 2,
        bipolar: true,
        biasExponent: 0.4,
        seedOffset: 13579,
        dampenField,
        dampenStrength: DETAIL_NOISE_DAMPEN_STRENGTH,
        amplitudeField,
    });

    const hydraulic = options.hydraulicErosion ?? 0.08;
    const thermal = options.thermalErosion ?? 0.05;
    if (hydraulic > 0 || thermal > 0) {
        erodeComposite(
            mesh, elevation, r_xyz, ocean,
            Math.round(hydraulic * 20), hydraulic * 0.0006, 0.5, 1,
            Math.round(thermal * 10), 1.2 - thermal * 0.4, thermal * 0.15,
            0, 0, neighborDist,
        );
    }

    const sharpening = options.ridgeSharpening ?? 0.2;
    if (sharpening > 0) {
        sharpenRidges(mesh, elevation, ocean, Math.round(1 + sharpening * 3), sharpening * 0.08);
    }
    applySoilCreep(mesh, elevation, ocean, 2, 0.075);
}

export function generateFromPositions(sourceXYZ, seed, options = {}) {
    const P = options.plateCount ?? 16;
    const numContinents = options.continentCount ?? 4;
    const landCoverage = options.landCoverage ?? 0.3;
    const nMag = options.noiseMagnitude ?? 0.22;
    const { mesh, r_xyz, count } = buildMeshFromPositions(sourceXYZ);
    const neighborDist = computeNeighborDist(mesh, r_xyz);

    const {
        coarseMesh,
        coarse_xyz,
        coarse_r_plate,
        coarsePlateSeeds: plateSeeds,
        coarsePlateVec: plateVec,
        coarsePlateIsOcean: plateIsOcean,
    } = generateCoarsePlates(seed, P, numContinents, options.continentSizeVariety ?? 0, landCoverage);

    const r_plate = projectCoarsePlates(
        mesh, r_xyz, coarseMesh, coarse_xyz, coarse_r_plate, seed, P,
    );
    smoothAndReconnectPlates(mesh, r_plate, plateSeeds, 3);

    const plateDensity = {};
    for (const plate of plateSeeds) {
        const rng = makeRng(plate + 777);
        const oceanDensity = 3 + rng() * 0.5;
        const landDensity = 2.4 + rng() * 0.5;
        plateDensity[plate] = plateIsOcean.has(plate) ? oceanDensity : landDensity;
    }

    const { mantleField } = applyPlatePhysics(
        plateVec, plateSeeds, plateIsOcean,
        coarse_r_plate, coarseMesh, coarse_xyz, seed,
    );

    let superPlateData = null;
    if (P >= 8) {
        superPlateData = buildSuperPlates(
            coarseMesh, coarse_r_plate, plateSeeds, plateVec, plateIsOcean, plateDensity, r_plate,
        );
        const superSeeds = new Set();
        for (let i = 0; i < superPlateData.numSuperPlates; i++) superSeeds.add(i);
        applyPlatePhysics(
            superPlateData.superPlateVec, superSeeds, superPlateData.superPlateIsOcean,
            superPlateData.r_superPlate, mesh, r_xyz, seed + 7777,
            SUPER_PLATE_PHYSICS_MULT,
        );
    }

    const plateMantleSum = {};
    const plateMantleCount = {};
    for (let r = 0; r < coarseMesh.numRegions; r++) {
        const plate = coarse_r_plate[r];
        plateMantleSum[plate] = (plateMantleSum[plate] || 0) + mantleField[r];
        plateMantleCount[plate] = (plateMantleCount[plate] || 0) + 1;
    }
    const mantle = new Float32Array(mesh.numRegions);
    for (let r = 0; r < mantle.length; r++) {
        const plate = r_plate[r];
        mantle[r] = plateMantleCount[plate]
            ? plateMantleSum[plate] / plateMantleCount[plate]
            : 0;
    }

    const noise = new SimplexNoise(seed);
    const { r_elevation: elevation, debugLayers } = assignElevation(
        mesh, r_xyz, plateIsOcean, r_plate, plateVec, plateSeeds,
        noise, nMag, seed, 5, plateDensity, superPlateData, mantle,
    );
    postProcess(mesh, r_xyz, elevation, debugLayers, neighborDist, seed, options);

    const raw = Array.from(elevation.subarray(0, count));
    const sorted = [...raw].sort((a, b) => a - b);
    const seaIndex = Math.max(0, Math.min(sorted.length - 1, Math.floor(sorted.length * (1 - landCoverage))));
    const seaThreshold = sorted[seaIndex];

    const elevationM = raw.map((value) => Math.round(elevToHeightKm(value - seaThreshold) * 1000));
    const plateIds = Array.from(r_plate.subarray(0, count));
    const plateBoundary = new Array(count).fill(false);
    for (let r = 0; r < count; r++) {
        for (let i = mesh.adjOffset[r]; i < mesh.adjOffset[r + 1]; i++) {
            const neighbor = mesh.adjList[i];
            if (neighbor < count && r_plate[neighbor] !== r_plate[r]) {
                plateBoundary[r] = true;
                break;
            }
        }
    }

    return { elevationM, plateIds, plateBoundary };
}
