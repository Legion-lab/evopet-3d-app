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

    // Ambient Light
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.0); // Soft white light
    scene.add(ambientLight);

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
