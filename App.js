import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { GLView } from 'expo-gl';
import { Renderer } from 'expo-three';
import * as THREE from 'three';

export default function App() {
  const sphereRef = useRef(null);
  const [hunger, setHunger] = useState(80);
  const [energy, setEnergy] = useState(80);
  const [hygiene, setHygiene] = useState(80);
  const [happiness, setHappiness] = useState(80);

  useEffect(() => {
    const interval = setInterval(() => {
      setHunger((prev) => Math.max(prev - 1, 0));
      setEnergy((prev) => Math.max(prev - 1, 0));
      setHygiene((prev) => Math.max(prev - 1, 0));
      setHappiness((prev) => Math.max(prev - 1, 0));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (sphereRef.current) {
      if (happiness < 30) {
        sphereRef.current.material.color.setHex(0x0000ff);
      } else {
        sphereRef.current.material.color.setHex(0xff0000);
      }

      if (hunger < 30) {
        sphereRef.current.scale.set(0.7, 0.7, 0.7);
      } else {
        sphereRef.current.scale.set(1, 1, 1);
      }
    }
  }, [hunger, happiness]);

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
    sphereRef.current = sphere;

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


    // Animation state
    let currentBaseScale = 1;
    let previousExpectedScale = 1;

    // Render loop
    const render = () => {
      requestAnimationFrame(render);

      const time = Date.now();

      // Levitation: Smooth Y-axis movement
      sphere.position.y = Math.sin(time * 0.002) * 0.2;

      // Breathing: Pulse scale
      // Check for external scale changes (e.g. from useEffect)
      if (Math.abs(sphere.scale.x - previousExpectedScale) > 0.0001) {
        currentBaseScale = sphere.scale.x;
      }

      const pulseFactor = 1 + 0.03 * Math.sin(time * 0.003);
      const newScale = currentBaseScale * pulseFactor;

      sphere.scale.set(newScale, newScale, newScale);
      previousExpectedScale = newScale;

      renderer.render(scene, camera);
      gl.endFrameEXP();
    };
    render();
  };

  return (
    <View style={{ flex: 1 }}>
      <GLView
        style={{ flex: 1 }}
        onContextCreate={onContextCreate}
      />
      <View style={{ position: 'absolute', top: 50, left: 20, right: 20, zIndex: 1 }}>
        {/* Hunger */}
        <Text style={{ color: 'white', marginBottom: 5 }}>Głód</Text>
        <View style={{ height: 20, backgroundColor: '#333', borderRadius: 10, marginBottom: 10 }}>
          <View style={{ width: `${hunger}%`, height: '100%', backgroundColor: 'orange', borderRadius: 10 }} />
        </View>

        {/* Energy */}
        <Text style={{ color: 'white', marginBottom: 5 }}>Energia</Text>
        <View style={{ height: 20, backgroundColor: '#333', borderRadius: 10, marginBottom: 10 }}>
          <View style={{ width: `${energy}%`, height: '100%', backgroundColor: 'yellow', borderRadius: 10 }} />
        </View>

        {/* Hygiene */}
        <Text style={{ color: 'white', marginBottom: 5 }}>Higiena</Text>
        <View style={{ height: 20, backgroundColor: '#333', borderRadius: 10, marginBottom: 10 }}>
          <View style={{ width: `${hygiene}%`, height: '100%', backgroundColor: 'blue', borderRadius: 10 }} />
        </View>

        {/* Fun */}
        <Text style={{ color: 'white', marginBottom: 5 }}>Zadowolenie</Text>
        <View style={{ height: 20, backgroundColor: '#333', borderRadius: 10, marginBottom: 10 }}>
          <View style={{ width: `${happiness}%`, height: '100%', backgroundColor: 'green', borderRadius: 10 }} />
        </View>
      </View>

      {/* Action Buttons */}
      <View style={{ position: 'absolute', bottom: 30, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-evenly', zIndex: 1 }}>
        <TouchableOpacity
          onPress={() => setHunger(prev => Math.min(prev + 20, 100))}
          style={{ backgroundColor: '#2196F3', padding: 15, borderRadius: 8 }}
        >
          <Text style={{ color: 'white', fontWeight: 'bold' }}>Nakarm</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setEnergy(prev => Math.min(prev + 20, 100))}
          style={{ backgroundColor: '#2196F3', padding: 15, borderRadius: 8 }}
        >
          <Text style={{ color: 'white', fontWeight: 'bold' }}>Sen</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setHygiene(prev => Math.min(prev + 20, 100))}
          style={{ backgroundColor: '#2196F3', padding: 15, borderRadius: 8 }}
        >
          <Text style={{ color: 'white', fontWeight: 'bold' }}>Umyj</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setHappiness(prev => Math.min(prev + 20, 100))}
          style={{ backgroundColor: '#2196F3', padding: 15, borderRadius: 8 }}
        >
          <Text style={{ color: 'white', fontWeight: 'bold' }}>Zabawa</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
