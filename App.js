import React from 'react';
import { GLView } from 'expo-gl';
import { Renderer } from 'expo-three';
import * as THREE from 'three';

export default function App() {
  const onContextCreate = async (gl) => {
    // Create a WebGLRenderer without a DOM element
    const renderer = new Renderer({ gl });
    renderer.setSize(gl.drawingBufferWidth, gl.drawingBufferHeight);
    renderer.setClearColor(0x000000); // Black background

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000); // Black background

    // Perspective Camera
    const camera = new THREE.PerspectiveCamera(
      75,
      gl.drawingBufferWidth / gl.drawingBufferHeight,
      0.1,
      1000
    );
    camera.position.z = 5;

    // --- Task T-03: Add Red Sphere ---
    // Geometry: Sphere with radius 1.5
    const geometry = new THREE.SphereGeometry(1.5, 32, 32);
    // Material: Standard material, red color
    const material = new THREE.MeshStandardMaterial({ color: 0xff0000 });
    // Mesh: Combine geometry and material
    const sphere = new THREE.Mesh(geometry, material);
    sphere.position.set(0, 0, 0);
    scene.add(sphere);

    // --- Task T-03: Modify Lighting ---
    // Ambient Light (soft base lighting)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    // Directional Light (strong directional source for shadows/shading)
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);

    // Point Light (local light source for highlights/depth)
    const pointLight = new THREE.PointLight(0xffffff, 1.0);
    pointLight.position.set(-5, 5, 5);
    scene.add(pointLight);


    // Render loop
    const render = () => {
      requestAnimationFrame(render);
      renderer.render(scene, camera);
      gl.endFrameEXP();
    };
    render();
  };

  return (
    <GLView
      style={{ flex: 1 }}
      onContextCreate={onContextCreate}
    />
  );
}
