import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, KeyboardAvoidingView, StyleSheet, Switch, Alert, Dimensions, TouchableWithoutFeedback } from 'react-native';
import { GLView } from 'expo-gl';
import { Renderer } from 'expo-three';
import * as THREE from 'three';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

export default function App() {
  const sphereRef = useRef(null);
  const ambientLightRef = useRef(null);
  const directionalLightRef = useRef(null);
  const scrollViewRef = useRef(null);
  const sceneRef = useRef(null);
  const dirtMeshesRef = useRef([]);

  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseRef = useRef(new THREE.Vector2());
  const cameraRef = useRef(null);
  const isJumpingRef = useRef(false);
  const jumpVelocityRef = useRef(0);

  const [roomHygiene, setRoomHygiene] = useState(100);
  const [hunger, setHunger] = useState(80);
  const [energy, setEnergy] = useState(80);
  const [hygiene, setHygiene] = useState(80);
  const [happiness, setHappiness] = useState(80);
  const [coins, setCoins] = useState(50);
  const [inventory, setInventory] = useState({ snack: 0, dinner: 0, coffee: 0, hungerBuster: 0, energyBuster: 0 });
  const [hungerBuffUntil, setHungerBuffUntil] = useState(0);
  const [energyBuffUntil, setEnergyBuffUntil] = useState(0);
  const [isSleeping, setIsSleeping] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const gameOverRef = useRef(false);

  const [showHUD, setShowHUD] = useState(false);
  const [activeModal, setActiveModal] = useState(null);
  const [activeActionSheet, setActiveActionSheet] = useState(null);

  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [petName, setPetName] = useState('Bobas');
  const [userName, setUserName] = useState('Gracz');
  const [isFirstLaunch, setIsFirstLaunch] = useState(true);
  const [onboardingStep, setOnboardingStep] = useState(0);

  const [strength, setStrength] = useState(0);
  const [intelligence, setIntelligence] = useState(0);
  const [laziness, setLaziness] = useState(0);

  const [soundEnabled, setSoundEnabled] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  useEffect(() => {
    gameOverRef.current = isGameOver;
  }, [isGameOver]);

  useEffect(() => {
    const loadState = async () => {
      try {
        const keys = ['@pet_stats', '@pet_name', '@user_name', '@is_first_launch', '@onboarding_step', '@sound_enabled', '@notifications_enabled'];
        const result = await AsyncStorage.multiGet(keys);
        const stores = Object.fromEntries(result);

        const jsonValue = stores['@pet_stats'];
        if (jsonValue != null) {
          const data = JSON.parse(jsonValue);
          let { hunger, energy, hygiene, happiness, coins, isSleeping, lastSavedTime, roomHygiene, strength, intelligence, laziness, inventory, hungerBuffUntil, energyBuffUntil } = data;

          // Default roomHygiene to 100 if missing
          if (roomHygiene === undefined) roomHygiene = 100;
          if (strength === undefined) strength = 0;
          if (intelligence === undefined) intelligence = 0;
          if (laziness === undefined) laziness = 0;
          if (inventory === undefined) inventory = { snack: 0, dinner: 0, coffee: 0, hungerBuster: 0, energyBuster: 0 };
          if (inventory.hungerBuster === undefined) inventory.hungerBuster = 0;
          if (inventory.energyBuster === undefined) inventory.energyBuster = 0;
          if (hungerBuffUntil === undefined) hungerBuffUntil = 0;
          if (energyBuffUntil === undefined) energyBuffUntil = 0;

          if (lastSavedTime) {
            const now = Date.now();
            const elapsedSeconds = Math.floor((now - lastSavedTime) / 1000);

            if (elapsedSeconds > 0) {
              // Calculate effective decay time based on buffs
              // If buff covers the time, decay is 0. Else it is time since buff ended (or since save if buff ended before save)
              const hungerDecayTime = Math.max(0, (now - Math.max(lastSavedTime, hungerBuffUntil)) / 1000);
              const energyDecayTime = Math.max(0, (now - Math.max(lastSavedTime, energyBuffUntil)) / 1000);

              if (isSleeping) {
                // Sleep Logic: Energy increases, others decrease slower
                energy = Math.min(energy + elapsedSeconds * 2, 100); // Sleep always regenerates energy
                hunger = Math.max(hunger - hungerDecayTime * 0.5, 0);
                hygiene = Math.max(hygiene - elapsedSeconds * 0.5, 0);
                happiness = Math.max(happiness - elapsedSeconds * 0.5, 0);
                roomHygiene = Math.max(roomHygiene - elapsedSeconds * 0.5, 0);
              } else {
                // Awake Logic: Standard decay
                hunger = Math.max(hunger - hungerDecayTime, 0);
                energy = Math.max(energy - energyDecayTime, 0);
                hygiene = Math.max(hygiene - elapsedSeconds, 0);
                happiness = Math.max(happiness - elapsedSeconds, 0);
                roomHygiene = Math.max(roomHygiene - elapsedSeconds, 0);
              }
            }
          }

          setHunger(hunger);
          setEnergy(energy);
          setHygiene(hygiene);
          setHappiness(happiness);
          setRoomHygiene(roomHygiene);
          setStrength(strength);
          setIntelligence(intelligence);
          setLaziness(laziness);
          setInventory(inventory);
          setHungerBuffUntil(hungerBuffUntil);
          setEnergyBuffUntil(energyBuffUntil);
          if (coins !== undefined) setCoins(coins);
          if (isSleeping !== undefined) setIsSleeping(isSleeping);
        }

        if (stores['@pet_name']) setPetName(stores['@pet_name']);
        if (stores['@user_name']) setUserName(stores['@user_name']);

        if (stores['@is_first_launch']) {
           setIsFirstLaunch(JSON.parse(stores['@is_first_launch']));
        } else {
           setIsFirstLaunch(true);
        }

        if (stores['@onboarding_step']) {
           setOnboardingStep(parseInt(stores['@onboarding_step'], 10));
        }

        if (stores['@sound_enabled']) setSoundEnabled(JSON.parse(stores['@sound_enabled']));
        if (stores['@notifications_enabled']) setNotificationsEnabled(JSON.parse(stores['@notifications_enabled']));

      } catch (e) {
        console.error("Failed to load state", e);
      } finally {
        setIsLoaded(true);
      }
    };
    loadState();
  }, []);

  useEffect(() => {
    if (isLoaded) {
      const saveState = async () => {
        try {
          const data = { hunger, energy, hygiene, happiness, coins, isSleeping, roomHygiene, strength, intelligence, laziness, inventory, hungerBuffUntil, energyBuffUntil, lastSavedTime: Date.now() };
          await AsyncStorage.setItem('@pet_stats', JSON.stringify(data));
        } catch (e) {
          console.error("Failed to save state", e);
        }
      };
      saveState();
    }
  }, [hunger, energy, hygiene, happiness, coins, isSleeping, roomHygiene, strength, intelligence, laziness, inventory, hungerBuffUntil, energyBuffUntil, isLoaded]);

  // Save onboarding/profile state separately
  useEffect(() => {
    if (isLoaded) {
       AsyncStorage.setItem('@pet_name', petName);
       AsyncStorage.setItem('@user_name', userName);
       AsyncStorage.setItem('@is_first_launch', JSON.stringify(isFirstLaunch));
       AsyncStorage.setItem('@onboarding_step', onboardingStep.toString());
    }
  }, [petName, userName, isFirstLaunch, onboardingStep, isLoaded]);

  // Save settings
  useEffect(() => {
    if (isLoaded) {
      AsyncStorage.setItem('@sound_enabled', JSON.stringify(soundEnabled));
      AsyncStorage.setItem('@notifications_enabled', JSON.stringify(notificationsEnabled));
    }
  }, [soundEnabled, notificationsEnabled, isLoaded]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (gameOverRef.current) return;

      const now = Date.now();
      const isHungerProtected = now <= hungerBuffUntil;
      const isEnergyProtected = now <= energyBuffUntil;

      if (isSleeping) {
        // Sleep Mode: Energy +2, others -0.5
        setEnergy((prev) => Math.min(prev + 2, 100));
        if (!isHungerProtected) setHunger((prev) => Math.max(prev - 0.5, 0));
        setHygiene((prev) => Math.max(prev - 0.5, 0));
        setHappiness((prev) => Math.max(prev - 0.5, 0));
        setRoomHygiene((prev) => Math.max(prev - 0.5, 0));
      } else {
        // Awake Mode: Normal decay
        if (!isHungerProtected) {
          setHunger((prev) => {
            const newValue = prev - 1;
            if (newValue <= 0) {
              setIsGameOver(true);
              return 0;
            }
            return newValue;
          });
        }
        if (!isEnergyProtected) setEnergy((prev) => Math.max(prev - 1, 0));
        setHygiene((prev) => Math.max(prev - 1, 0));
        setHappiness((prev) => Math.max(prev - 1, 0));
        setRoomHygiene((prev) => Math.max(prev - 1, 0));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isSleeping, hungerBuffUntil, energyBuffUntil]);

  useEffect(() => {
    if (sphereRef.current) {
      if (isGameOver) {
        sphereRef.current.material.color.setHex(0x555555);
      } else if (happiness < 30) {
        sphereRef.current.material.color.setHex(0x0000ff);
      } else {
        sphereRef.current.material.color.setHex(0xff0000);
      }

      if (hunger < 30) {
        sphereRef.current.scale.set(0.7, 0.7, 0.7);
      } else {
        sphereRef.current.scale.set(1, 1, 1);
      }

      // Evolution Logic
      let newGeometry = null;
      const currentGeoType = sphereRef.current.geometry.type;

      if (strength >= 50) {
         if (currentGeoType !== 'BoxGeometry') {
            newGeometry = new THREE.BoxGeometry(1.5, 1.5, 1.5);
         }
      } else if (intelligence >= 50) {
         // Strength < 50 implicitly because of else if
         if (currentGeoType !== 'ConeGeometry') {
            newGeometry = new THREE.ConeGeometry(1, 2, 32);
         }
      } else {
         if (currentGeoType !== 'SphereGeometry') {
            newGeometry = new THREE.SphereGeometry(1.5, 32, 32);
         }
      }

      if (newGeometry) {
        sphereRef.current.geometry.dispose();
        sphereRef.current.geometry = newGeometry;
      }
    }
  }, [hunger, happiness, isGameOver, strength, intelligence]);

  // Sleep Effect (Lighting)
  useEffect(() => {
    if (ambientLightRef.current && directionalLightRef.current) {
      if (isSleeping) {
        ambientLightRef.current.intensity = 0.1;
        directionalLightRef.current.intensity = 0.1;
      } else {
        ambientLightRef.current.intensity = 0.5;
        directionalLightRef.current.intensity = 1.0;
      }
    }
  }, [isSleeping]);

  // Onboarding: Initial Message
  useEffect(() => {
    if (isFirstLaunch && messages.length === 0) {
      const initialMsg = {
        sender: 'pet',
        text: 'Cześć! Jestem Twoim nowym wirtualnym przyjacielem. Jak chcesz mnie nazwać?'
      };
      setMessages([initialMsg]);
    }
  }, [isFirstLaunch, messages.length]);

  const handleSendMessage = () => {
    if (!inputText.trim()) return;

    const newMsg = { sender: 'user', text: inputText.trim() };
    setMessages((prev) => [...prev, newMsg]);

    const userText = inputText.trim();
    setInputText('');

    // Onboarding Logic
    if (onboardingStep === 0) {
      setPetName(userText);
      setOnboardingStep(1);
      setTimeout(() => {
        setMessages((prev) => [...prev, {
          sender: 'pet',
          text: 'Super imię! A jak Ty masz na imię, żebym wiedział jak się do Ciebie zwracać?'
        }]);
      }, 1000);
    } else if (onboardingStep === 1) {
      setUserName(userText);
      setOnboardingStep(2);
      setIsFirstLaunch(false); // Triggers save via useEffect
      setTimeout(() => {
        setMessages((prev) => [...prev, {
          sender: 'pet',
          text: `Miło Cię poznać, ${userText}! Będę najlepszym zwierzakiem o imieniu ${petName}!`
        }]);
      }, 1000);
    } else {
      // Standard Chat
      setTimeout(() => {
        setMessages((prev) => [...prev, {
          sender: 'pet',
          text: `Hau hau, ${userName}!`
        }]);
      }, 1000);
    }
  };

  const resetGame = async () => {
    setHunger(80);
    setEnergy(80);
    setHygiene(80);
    setHappiness(80);
    setRoomHygiene(100);
    setStrength(0);
    setIntelligence(0);
    setLaziness(0);
    setInventory({ snack: 0, dinner: 0, coffee: 0 });
    setIsGameOver(false);

    try {
      const data = { hunger: 80, energy: 80, hygiene: 80, happiness: 80, roomHygiene: 100, strength: 0, intelligence: 0, laziness: 0, inventory: { snack: 0, dinner: 0, coffee: 0 }, lastSavedTime: Date.now() };
      await AsyncStorage.setItem('@pet_stats', JSON.stringify(data));
    } catch (e) {
      console.error("Failed to reset state", e);
    }
  };

  const confirmHardReset = () => {
    Alert.alert(
      'Uwaga',
      'Czy na pewno chcesz usunąć cały postęp?',
      [
        { text: 'Anuluj', style: 'cancel' },
        {
          text: 'Resetuj',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.clear();
              setHunger(80);
              setEnergy(80);
              setHygiene(80);
              setHappiness(80);
              setRoomHygiene(100);
              setCoins(50);
              setInventory({ snack: 0, dinner: 0, coffee: 0, hungerBuster: 0, energyBuster: 0 });
              setHungerBuffUntil(0);
              setEnergyBuffUntil(0);
              setStrength(0);
              setIntelligence(0);
              setLaziness(0);
              setIsGameOver(false);

              setPetName('Bobas');
              setUserName('Gracz');
              setMessages([]);
              setOnboardingStep(0);
              setIsFirstLaunch(true);
              setActiveModal(null);
            } catch (e) {
              console.error("Failed to hard reset", e);
            }
          }
        }
      ]
    );
  };

  useEffect(() => {
    if (!sceneRef.current) return;

    const targetDirtCount = Math.floor((100 - roomHygiene) / 20);

    if (targetDirtCount > dirtMeshesRef.current.length) {
      const countToAdd = targetDirtCount - dirtMeshesRef.current.length;
      for (let i = 0; i < countToAdd; i++) {
        const mesh = new THREE.Mesh(
          new THREE.BoxGeometry(0.4, 0.4, 0.4),
          new THREE.MeshStandardMaterial({ color: 0x5C4033 })
        );
        mesh.position.set(
          (Math.random() - 0.5) * 5,
          -1.2,
          (Math.random() - 0.5) * 5
        );
        sceneRef.current.add(mesh);
        dirtMeshesRef.current.push(mesh);
      }
    }

    if (roomHygiene === 100) {
      dirtMeshesRef.current.forEach((mesh) => {
        sceneRef.current.remove(mesh);
      });
      dirtMeshesRef.current = [];
    }
  }, [roomHygiene]);

  const handleTouch = (event) => {
    const { pageX, pageY } = event.nativeEvent;

    // Convert to NDC (Normalized Device Coordinates)
    mouseRef.current.x = (pageX / width) * 2 - 1;
    mouseRef.current.y = -(pageY / height) * 2 - 0.1;

    if (cameraRef.current && sphereRef.current) {
      raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
      const intersects = raycasterRef.current.intersectObject(sphereRef.current);

      if (intersects.length > 0 && !isJumpingRef.current) {
        isJumpingRef.current = true;
        jumpVelocityRef.current = 0.15;
        // Add bonus happiness
        setHappiness((prev) => Math.min(prev + 5, 100));
      }
    }
  };

  const onContextCreate = async (gl) => {
    // Create a WebGLRenderer without a DOM element
    const renderer = new Renderer({ gl });
    renderer.setSize(gl.drawingBufferWidth, gl.drawingBufferHeight);
    renderer.setClearColor(0x000000); // Black background

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000); // Black background
    sceneRef.current = scene;

    // Perspective Camera
    const camera = new THREE.PerspectiveCamera(
      75,
      gl.drawingBufferWidth / gl.drawingBufferHeight,
      0.1,
      1000
    );
    camera.position.z = 5;
    cameraRef.current = camera;

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
    ambientLightRef.current = ambientLight;

    // Directional Light (strong directional source for shadows/shading)
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);
    directionalLightRef.current = directionalLight;

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

      if (!gameOverRef.current) {
        const time = Date.now();

        // Jump Physics
        if (isJumpingRef.current) {
          sphere.position.y += jumpVelocityRef.current;
          jumpVelocityRef.current -= 0.01;

          if (sphere.position.y < 0) {
            sphere.position.y = 0;
            isJumpingRef.current = false;
            jumpVelocityRef.current = 0;
          }
        } else {
          // Levitation: Smooth Y-axis movement
          sphere.position.y = Math.sin(time * 0.002) * 0.2;
        }

        // Breathing: Pulse scale
        // Check for external scale changes (e.g. from useEffect)
        if (Math.abs(sphere.scale.x - previousExpectedScale) > 0.0001) {
          currentBaseScale = sphere.scale.x;
        }

        const pulseFactor = 1 + 0.03 * Math.sin(time * 0.003);
        const newScale = currentBaseScale * pulseFactor;

        sphere.scale.set(newScale, newScale, newScale);
        previousExpectedScale = newScale;
      }

      renderer.render(scene, camera);
      gl.endFrameEXP();
    };
    render();
  };

  return (
    <View style={{ flex: 1 }}>
      <TouchableWithoutFeedback onPress={handleTouch}>
        <View style={{ flex: 1 }}>
          <GLView
            style={{ flex: 1 }}
            onContextCreate={onContextCreate}
          />
        </View>
      </TouchableWithoutFeedback>

      {/* Coins Display (Top Left) */}
      <View style={{ position: 'absolute', top: 40, left: 20, zIndex: 10 }}>
        <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#FFD700' }}>🪙 {coins}</Text>
      </View>

      {/* Right Side Vertical Navigation (No Stats Button) */}
      <View style={{
        position: 'absolute',
        right: 15,
        bottom: 150, // Moved up slightly to make room
        flexDirection: 'column',
        alignItems: 'center',
        gap: 20
      }}>
        {/* Chat Button */}
        <View style={{ alignItems: 'center' }}>
          {(isFirstLaunch && !showHUD && activeModal === null) && (
            <View style={{
              position: 'absolute',
              right: 60,
              top: 10,
              backgroundColor: '#fff',
              padding: 8,
              borderRadius: 10,
              width: 150,
              zIndex: 10
            }}>
              <Text style={{ color: '#000', fontSize: 12, fontWeight: 'bold' }}>👋 Kliknij tutaj, by porozmawiać!</Text>
              <View style={{
                position: 'absolute',
                right: -6,
                top: 12,
                width: 0,
                height: 0,
                borderTopWidth: 6,
                borderBottomWidth: 6,
                borderLeftWidth: 6,
                borderStyle: 'solid',
                backgroundColor: 'transparent',
                borderTopColor: 'transparent',
                borderBottomColor: 'transparent',
                borderLeftColor: '#fff'
              }} />
            </View>
          )}
          <TouchableOpacity
            onPress={() => setActiveModal('Czat')}
            style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}
          >
            <Text style={{ fontSize: 24 }}>💬</Text>
          </TouchableOpacity>
        </View>

        {/* Shop Button */}
        <TouchableOpacity
          onPress={() => setActiveModal('Sklep')}
          style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}
        >
          <Text style={{ fontSize: 24 }}>🛒</Text>
        </TouchableOpacity>

        {/* Inventory Button */}
        <TouchableOpacity
          onPress={() => setActiveModal('Plecak')}
          style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}
        >
          <Text style={{ fontSize: 24 }}>🎒</Text>
        </TouchableOpacity>

        {/* Settings Button */}
        <TouchableOpacity
          onPress={() => setActiveModal('Ustawienia')}
          style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}
        >
          <Text style={{ fontSize: 24 }}>⚙️</Text>
        </TouchableOpacity>
      </View>

      {/* Universal Modal */}
      {activeModal !== null && (
         <View style={styles.modalOverlay}>
            <View style={[
              styles.modalContent,
              activeModal === 'Ustawienia' && { backgroundColor: '#F2F2F7', width: '95%', height: '85%', padding: 20 }
            ]}>
               <Text style={{
                 color: activeModal === 'Ustawienia' ? '#000' : 'white',
                 fontSize: 24,
                 fontWeight: 'bold',
                 marginBottom: 20
               }}>
                 {activeModal === 'Ustawienia' ? 'Ustawienia' : `Witaj w: ${activeModal}`}
               </Text>
               <TouchableOpacity
                 onPress={() => setActiveModal(null)}
                 style={[styles.closeButton, activeModal === 'Ustawienia' && { backgroundColor: 'rgba(0,0,0,0.1)' }]}
               >
                  <Text style={{ color: 'white', fontSize: 14 }}>❌</Text>
               </TouchableOpacity>

               {activeModal === 'Czat' ? (
                 <KeyboardAvoidingView behavior="padding" style={{ width: '100%', height: 300 }}>
                   <ScrollView
                     style={{ flex: 1, marginBottom: 10 }}
                     ref={scrollViewRef}
                     onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
                   >
                     {messages.map((msg, index) => (
                       <View key={index} style={{
                         alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                         backgroundColor: msg.sender === 'user' ? '#007AFF' : '#555',
                         padding: 10,
                         borderRadius: 10,
                         marginVertical: 5,
                         maxWidth: '80%'
                       }}>
                         <Text style={{ color: 'white' }}>{msg.text}</Text>
                       </View>
                     ))}
                   </ScrollView>
                   <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                     <TextInput
                       style={{ flex: 1, backgroundColor: '#444', color: 'white', padding: 10, borderRadius: 5, marginRight: 10 }}
                       value={inputText}
                       onChangeText={setInputText}
                       placeholder="Napisz coś..."
                       placeholderTextColor="#aaa"
                     />
                     <TouchableOpacity onPress={handleSendMessage} style={{ backgroundColor: '#2196F3', padding: 10, borderRadius: 5 }}>
                       <Text style={{ color: 'white', fontWeight: 'bold' }}>Wyślij</Text>
                     </TouchableOpacity>
                   </View>
                 </KeyboardAvoidingView>
               ) : activeModal === 'Sklep' ? (
                 <View style={{ height: 220 }}>
                   <ScrollView horizontal={true} showsHorizontalScrollIndicator={false} contentContainerStyle={{ padding: 10, gap: 15 }}>
                     <View style={{ width: 130, height: 180, backgroundColor: '#333', borderRadius: 15, padding: 10, alignItems: 'center', justifyContent: 'space-between', elevation: 5 }}>
                       <Text style={{ color: 'white', fontSize: 12, textAlign: 'center' }}>Przekąska</Text>
                       <Text style={{ fontSize: 50 }}>🍎</Text>
                       <TouchableOpacity
                         style={{ backgroundColor: coins >= 5 ? '#4CAF50' : '#555', padding: 8, borderRadius: 5, width: '100%', alignItems: 'center' }}
                         disabled={coins < 5}
                         onPress={() => {
                           if (coins >= 5) {
                             setCoins(prev => prev - 5);
                             setInventory(prev => ({ ...prev, snack: prev.snack + 1 }));
                           }
                         }}
                       >
                         <Text style={{ color: 'white', fontWeight: 'bold' }}>🪙 5</Text>
                       </TouchableOpacity>
                     </View>

                     <View style={{ width: 130, height: 180, backgroundColor: '#333', borderRadius: 15, padding: 10, alignItems: 'center', justifyContent: 'space-between', elevation: 5 }}>
                       <Text style={{ color: 'white', fontSize: 12, textAlign: 'center' }}>Pełny Obiad</Text>
                       <Text style={{ fontSize: 50 }}>🍱</Text>
                       <TouchableOpacity
                         style={{ backgroundColor: coins >= 10 ? '#4CAF50' : '#555', padding: 8, borderRadius: 5, width: '100%', alignItems: 'center' }}
                         disabled={coins < 10}
                         onPress={() => {
                           if (coins >= 10) {
                             setCoins(prev => prev - 10);
                             setInventory(prev => ({ ...prev, dinner: prev.dinner + 1 }));
                           }
                         }}
                       >
                         <Text style={{ color: 'white', fontWeight: 'bold' }}>🪙 10</Text>
                       </TouchableOpacity>
                     </View>

                     <View style={{ width: 130, height: 180, backgroundColor: '#333', borderRadius: 15, padding: 10, alignItems: 'center', justifyContent: 'space-between', elevation: 5 }}>
                       <Text style={{ color: 'white', fontSize: 12, textAlign: 'center' }}>Kawa</Text>
                       <Text style={{ fontSize: 50 }}>☕</Text>
                       <TouchableOpacity
                         style={{ backgroundColor: coins >= 15 ? '#4CAF50' : '#555', padding: 8, borderRadius: 5, width: '100%', alignItems: 'center' }}
                         disabled={coins < 15}
                         onPress={() => {
                           if (coins >= 15) {
                             setCoins(prev => prev - 15);
                             setInventory(prev => ({ ...prev, coffee: prev.coffee + 1 }));
                           }
                         }}
                       >
                         <Text style={{ color: 'white', fontWeight: 'bold' }}>🪙 15</Text>
                       </TouchableOpacity>
                     </View>

                     <View style={{ width: 130, height: 180, backgroundColor: '#333', borderRadius: 15, padding: 10, alignItems: 'center', justifyContent: 'space-between', elevation: 5 }}>
                       <Text style={{ color: 'white', fontSize: 12, textAlign: 'center' }}>Buster Głodu</Text>
                       <Text style={{ fontSize: 50 }}>🛡️</Text>
                       <TouchableOpacity
                         style={{ backgroundColor: coins >= 50 ? '#4CAF50' : '#555', padding: 8, borderRadius: 5, width: '100%', alignItems: 'center' }}
                         disabled={coins < 50}
                         onPress={() => {
                           if (coins >= 50) {
                             setCoins(prev => prev - 50);
                             setInventory(prev => ({ ...prev, hungerBuster: prev.hungerBuster + 1 }));
                           }
                         }}
                       >
                         <Text style={{ color: 'white', fontWeight: 'bold' }}>🪙 50</Text>
                       </TouchableOpacity>
                     </View>

                     <View style={{ width: 130, height: 180, backgroundColor: '#333', borderRadius: 15, padding: 10, alignItems: 'center', justifyContent: 'space-between', elevation: 5 }}>
                       <Text style={{ color: 'white', fontSize: 12, textAlign: 'center' }}>Buster Energii</Text>
                       <Text style={{ fontSize: 50 }}>⚡</Text>
                       <TouchableOpacity
                         style={{ backgroundColor: coins >= 50 ? '#4CAF50' : '#555', padding: 8, borderRadius: 5, width: '100%', alignItems: 'center' }}
                         disabled={coins < 50}
                         onPress={() => {
                           if (coins >= 50) {
                             setCoins(prev => prev - 50);
                             setInventory(prev => ({ ...prev, energyBuster: prev.energyBuster + 1 }));
                           }
                         }}
                       >
                         <Text style={{ color: 'white', fontWeight: 'bold' }}>🪙 50</Text>
                       </TouchableOpacity>
                     </View>
                   </ScrollView>
                 </View>
               ) : activeModal === 'Plecak' ? (
                 <View style={{ height: 220 }}>
                   <ScrollView horizontal={true} showsHorizontalScrollIndicator={false} contentContainerStyle={{ padding: 10, gap: 15 }}>
                     <View style={{ width: 130, height: 180, backgroundColor: '#333', borderRadius: 15, padding: 10, alignItems: 'center', justifyContent: 'space-between', elevation: 5 }}>
                       <Text style={{ color: 'white', fontSize: 12, textAlign: 'center' }}>Przekąska</Text>
                       <Text style={{ fontSize: 50 }}>🍎</Text>
                       <Text style={{ color: '#aaa', fontWeight: 'bold' }}>Posiadasz: {inventory.snack}</Text>
                     </View>

                     <View style={{ width: 130, height: 180, backgroundColor: '#333', borderRadius: 15, padding: 10, alignItems: 'center', justifyContent: 'space-between', elevation: 5 }}>
                       <Text style={{ color: 'white', fontSize: 12, textAlign: 'center' }}>Obiad</Text>
                       <Text style={{ fontSize: 50 }}>🍱</Text>
                       <Text style={{ color: '#aaa', fontWeight: 'bold' }}>Posiadasz: {inventory.dinner}</Text>
                     </View>

                     <View style={{ width: 130, height: 180, backgroundColor: '#333', borderRadius: 15, padding: 10, alignItems: 'center', justifyContent: 'space-between', elevation: 5 }}>
                       <Text style={{ color: 'white', fontSize: 12, textAlign: 'center' }}>Kawa</Text>
                       <Text style={{ fontSize: 50 }}>☕</Text>
                       <Text style={{ color: '#aaa', fontWeight: 'bold' }}>Posiadasz: {inventory.coffee}</Text>
                     </View>

                     <View style={{ width: 130, height: 180, backgroundColor: '#333', borderRadius: 15, padding: 10, alignItems: 'center', justifyContent: 'space-between', elevation: 5 }}>
                       <Text style={{ color: 'white', fontSize: 12, textAlign: 'center' }}>Buster Głodu</Text>
                       <Text style={{ fontSize: 50 }}>🛡️</Text>
                       <Text style={{ color: '#aaa', fontWeight: 'bold' }}>Posiadasz: {inventory.hungerBuster}</Text>
                     </View>

                     <View style={{ width: 130, height: 180, backgroundColor: '#333', borderRadius: 15, padding: 10, alignItems: 'center', justifyContent: 'space-between', elevation: 5 }}>
                       <Text style={{ color: 'white', fontSize: 12, textAlign: 'center' }}>Buster Energii</Text>
                       <Text style={{ fontSize: 50 }}>⚡</Text>
                       <Text style={{ color: '#aaa', fontWeight: 'bold' }}>Posiadasz: {inventory.energyBuster}</Text>
                     </View>
                   </ScrollView>
                 </View>
               ) : activeModal === 'Ustawienia' ? (
                 <View style={{ flex: 1, width: '100%' }}>
                   <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>

                     {/* ROZGRYWKA Group */}
                     <View style={{ marginBottom: 25 }}>
                       <Text style={{ color: '#888', fontSize: 12, fontWeight: 'bold', marginBottom: 5, marginLeft: 15 }}>ROZGRYWKA</Text>
                       <View style={{ backgroundColor: '#FFF', borderRadius: 15, paddingHorizontal: 15, elevation: 2 }}>

                         {/* Sound Row */}
                         <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderColor: '#EEE' }}>
                           <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                             <Text style={{ fontSize: 20 }}>🎵</Text>
                             <Text style={{ fontSize: 16, color: '#000' }}>Dźwięki i Muzyka</Text>
                           </View>
                           <Switch
                             trackColor={{ false: "#767577", true: "#4CAF50" }}
                             thumbColor={soundEnabled ? "#f4f3f4" : "#f4f3f4"}
                             ios_backgroundColor="#3e3e3e"
                             onValueChange={() => setSoundEnabled(previousState => !previousState)}
                             value={soundEnabled}
                           />
                         </View>

                         {/* Notifications Row */}
                         <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                             <Text style={{ fontSize: 20 }}>🔔</Text>
                             <Text style={{ fontSize: 16, color: '#000' }}>Powiadomienia Push</Text>
                           </View>
                           <Switch
                             trackColor={{ false: "#767577", true: "#4CAF50" }}
                             thumbColor={notificationsEnabled ? "#f4f3f4" : "#f4f3f4"}
                             ios_backgroundColor="#3e3e3e"
                             onValueChange={() => setNotificationsEnabled(previousState => !previousState)}
                             value={notificationsEnabled}
                           />
                         </View>
                       </View>
                     </View>

                     {/* ACCOUNT Group */}
                     <View style={{ marginBottom: 25 }}>
                       <Text style={{ color: '#888', fontSize: 12, fontWeight: 'bold', marginBottom: 5, marginLeft: 15 }}>ZARZĄDZANIE KONTEM</Text>
                       <View style={{ backgroundColor: '#FFF', borderRadius: 15, paddingHorizontal: 15, elevation: 2 }}>

                         {/* Reset Row */}
                         <TouchableOpacity
                           onPress={confirmHardReset}
                           style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 15 }}
                         >
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                             <Text style={{ fontSize: 20 }}>💀</Text>
                             <Text style={{ fontSize: 16, color: '#000' }}>Zacznij grę od nowa</Text>
                           </View>
                           <Text style={{ fontSize: 18, color: '#ccc' }}>{'>'}</Text>
                         </TouchableOpacity>
                       </View>
                     </View>

                   </ScrollView>
                 </View>
               ) : (
                 <View style={{ height: 100, justifyContent: 'center', alignItems: 'center', marginBottom: 20 }}>
                   <Text style={{ color: '#aaa' }}>Treść dla {activeModal} pojawi się wkrótce...</Text>
                 </View>
               )}
            </View>
         </View>
      )}

      {showHUD && (
      <View style={styles.hudContainer}>
        {/* Hunger */}
        <View style={styles.statRow}>
          <View style={styles.statHeader}>
            <Text style={styles.statLabel}>🍖 Głód</Text>
            <Text style={styles.statValue}>{Math.round(hunger)}%</Text>
          </View>
          <View style={styles.statBarBg}>
            <View style={{ width: `${hunger}%`, height: '100%', backgroundColor: '#FF5252' }} />
          </View>
        </View>

        {/* Energy */}
        <View style={styles.statRow}>
          <View style={styles.statHeader}>
            <Text style={styles.statLabel}>⚡ Energia</Text>
            <Text style={styles.statValue}>{Math.round(energy)}%</Text>
          </View>
          <View style={styles.statBarBg}>
            <View style={{ width: `${energy}%`, height: '100%', backgroundColor: '#FFD740' }} />
          </View>
        </View>

        {/* Hygiene */}
        <View style={styles.statRow}>
          <View style={styles.statHeader}>
            <Text style={styles.statLabel}>🚿 Higiena</Text>
            <Text style={styles.statValue}>{Math.round(hygiene)}%</Text>
          </View>
          <View style={styles.statBarBg}>
            <View style={{ width: `${hygiene}%`, height: '100%', backgroundColor: '#448AFF' }} />
          </View>
        </View>

        {/* Fun */}
        <View style={styles.statRow}>
          <View style={styles.statHeader}>
            <Text style={styles.statLabel}>⚽ Zadowolenie</Text>
            <Text style={styles.statValue}>{Math.round(happiness)}%</Text>
          </View>
          <View style={styles.statBarBg}>
            <View style={{ width: `${happiness}%`, height: '100%', backgroundColor: '#69F0AE' }} />
          </View>
        </View>

        {/* Action Buttons Row */}
        {!isGameOver && (
          <View style={styles.actionRow}>
            <TouchableOpacity onPress={() => setActiveActionSheet('food')} style={styles.roundActionButton}>
              <Text style={{ fontSize: 24 }}>🍖</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setActiveActionSheet('energy')} style={styles.roundActionButton}>
              <Text style={{ fontSize: 24 }}>⚡</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setActiveActionSheet('hygiene')} style={styles.roundActionButton}>
              <Text style={{ fontSize: 24 }}>🚿</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setActiveActionSheet('play')} style={styles.roundActionButton}>
              <Text style={{ fontSize: 24 }}>⚽</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
      )}

      {/* Central Button */}
      <TouchableOpacity onPress={() => setShowHUD(!showHUD)} style={styles.centralButton}>
        <Text style={{ fontSize: 30 }}>🐾</Text>
      </TouchableOpacity>

      {/* Action Sheet */}
      {activeActionSheet !== null && (
        <View style={styles.sheetContainer}>
          <TouchableOpacity onPress={() => setActiveActionSheet(null)} style={styles.closeButton}>
             <Text style={{ color: 'white', fontSize: 14 }}>❌</Text>
          </TouchableOpacity>
          <Text style={styles.sheetHeader}>
            {activeActionSheet === 'food' ? 'Jedzenie' :
             activeActionSheet === 'energy' ? 'Energia' :
             activeActionSheet === 'hygiene' ? 'Higiena' : 'Zabawa'}
          </Text>

          <ScrollView horizontal={true} contentContainerStyle={{ gap: 10, paddingHorizontal: 10 }} showsHorizontalScrollIndicator={false}>
            {activeActionSheet === 'food' && (
              <>
                <TouchableOpacity
                  style={[styles.tile, inventory.snack <= 0 && { opacity: 0.5 }]}
                  disabled={inventory.snack <= 0}
                  onPress={() => {
                    if (inventory.snack > 0) {
                      setInventory(prev => ({ ...prev, snack: prev.snack - 1 }));
                      setHunger(prev => Math.min(prev + 20, 100));
                      setActiveActionSheet(null);
                    }
                  }}
                >
                  <Text style={styles.tileLabel}>Przekąska</Text>
                  <Text style={styles.tileIcon}>🍎</Text>
                  <Text style={styles.tileSubLabel}>Posiadasz: {inventory.snack}</Text>
                  <View style={[styles.tileButton, { backgroundColor: inventory.snack > 0 ? '#4CAF50' : '#555' }]}>
                    <Text style={styles.tileButtonText}>Zjedz (+20)</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.tile, inventory.dinner <= 0 && { opacity: 0.5 }]}
                  disabled={inventory.dinner <= 0}
                  onPress={() => {
                    if (inventory.dinner > 0) {
                      setInventory(prev => ({ ...prev, dinner: prev.dinner - 1 }));
                      setHunger(prev => Math.min(prev + 50, 100));
                      setActiveActionSheet(null);
                    }
                  }}
                >
                  <Text style={styles.tileLabel}>Obiad</Text>
                  <Text style={styles.tileIcon}>🍱</Text>
                  <Text style={styles.tileSubLabel}>Posiadasz: {inventory.dinner}</Text>
                  <View style={[styles.tileButton, { backgroundColor: inventory.dinner > 0 ? '#FF9800' : '#555' }]}>
                    <Text style={styles.tileButtonText}>Zjedz (+50)</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.tile, inventory.hungerBuster <= 0 && { opacity: 0.5 }]}
                  disabled={inventory.hungerBuster <= 0}
                  onPress={() => {
                    if (inventory.hungerBuster > 0) {
                      setInventory(prev => ({ ...prev, hungerBuster: prev.hungerBuster - 1 }));
                      setHunger(100);
                      setHungerBuffUntil(Date.now() + 12 * 60 * 60 * 1000);
                      setActiveActionSheet(null);
                    }
                  }}
                >
                  <Text style={styles.tileLabel}>Buster Głodu</Text>
                  <Text style={styles.tileIcon}>🛡️</Text>
                  <Text style={styles.tileSubLabel}>Posiadasz: {inventory.hungerBuster}</Text>
                  <View style={[styles.tileButton, { backgroundColor: inventory.hungerBuster > 0 ? '#9C27B0' : '#555' }]}>
                    <Text style={styles.tileButtonText}>Użyj (12h)</Text>
                  </View>
                </TouchableOpacity>
              </>
            )}

            {activeActionSheet === 'energy' && (
              <>
                <TouchableOpacity
                  style={[styles.tile, inventory.coffee <= 0 && { opacity: 0.5 }]}
                  disabled={inventory.coffee <= 0}
                  onPress={() => {
                     if (inventory.coffee > 0) {
                       setInventory(prev => ({ ...prev, coffee: prev.coffee - 1 }));
                       setEnergy(prev => Math.min(prev + 40, 100));
                       setActiveActionSheet(null);
                     }
                  }}
                >
                  <Text style={styles.tileLabel}>Kawa</Text>
                  <Text style={styles.tileIcon}>☕</Text>
                  <Text style={styles.tileSubLabel}>Posiadasz: {inventory.coffee}</Text>
                  <View style={[styles.tileButton, { backgroundColor: inventory.coffee > 0 ? '#795548' : '#555' }]}>
                    <Text style={styles.tileButtonText}>Wypij (+40)</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.tile}
                  onPress={() => {
                    setIsSleeping(!isSleeping);
                    setActiveActionSheet(null);
                  }}
                >
                  <Text style={styles.tileLabel}>{isSleeping ? 'Obudź' : 'Uśpij'}</Text>
                  <Text style={styles.tileIcon}>{isSleeping ? '☀️' : '💤'}</Text>
                  <Text style={styles.tileSubLabel}>{isSleeping ? 'Wstawaj!' : 'Dobranoc'}</Text>
                  <View style={[styles.tileButton, { backgroundColor: isSleeping ? '#FFD700' : '#483D8B' }]}>
                    <Text style={styles.tileButtonText}>{isSleeping ? 'Obudź się' : 'Idź spać'}</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.tile, inventory.energyBuster <= 0 && { opacity: 0.5 }]}
                  disabled={inventory.energyBuster <= 0}
                  onPress={() => {
                    if (inventory.energyBuster > 0) {
                      setInventory(prev => ({ ...prev, energyBuster: prev.energyBuster - 1 }));
                      setEnergy(100);
                      setEnergyBuffUntil(Date.now() + 12 * 60 * 60 * 1000);
                      setActiveActionSheet(null);
                    }
                  }}
                >
                  <Text style={styles.tileLabel}>Buster Energii</Text>
                  <Text style={styles.tileIcon}>⚡</Text>
                  <Text style={styles.tileSubLabel}>Posiadasz: {inventory.energyBuster}</Text>
                  <View style={[styles.tileButton, { backgroundColor: inventory.energyBuster > 0 ? '#9C27B0' : '#555' }]}>
                    <Text style={styles.tileButtonText}>Użyj (12h)</Text>
                  </View>
                </TouchableOpacity>
              </>
            )}

            {activeActionSheet === 'hygiene' && (
              <>
                <TouchableOpacity
                  style={styles.tile}
                  onPress={() => {
                    setHygiene(prev => Math.min(prev + 30, 100));
                    setActiveActionSheet(null);
                  }}
                >
                  <Text style={styles.tileLabel}>Umyj Bobasa</Text>
                  <Text style={styles.tileIcon}>🛁</Text>
                  <Text style={styles.tileSubLabel}>Darmowe</Text>
                  <View style={[styles.tileButton, { backgroundColor: '#03A9F4' }]}>
                    <Text style={styles.tileButtonText}>Umyj (+30)</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.tile, coins < 5 && { opacity: 0.5 }]}
                  disabled={coins < 5}
                  onPress={() => {
                    if (coins >= 5) {
                      setCoins(prev => prev - 5);
                      setRoomHygiene(100);
                      setActiveActionSheet(null);
                    }
                  }}
                >
                  <Text style={styles.tileLabel}>Posprzątaj</Text>
                  <Text style={styles.tileIcon}>🧹</Text>
                  <Text style={styles.tileSubLabel}>Koszt: 5 🪙</Text>
                  <View style={[styles.tileButton, { backgroundColor: coins >= 5 ? '#E91E63' : '#555' }]}>
                    <Text style={styles.tileButtonText}>Sprzątaj</Text>
                  </View>
                </TouchableOpacity>
              </>
            )}

            {activeActionSheet === 'play' && (
              <>
                <TouchableOpacity
                  style={styles.tile}
                  onPress={() => {
                    setHappiness(prev => Math.min(prev + 10, 100));
                    setEnergy(prev => Math.max(prev - 5, 0));
                    setHygiene(prev => Math.max(prev - 5, 0));
                    setLaziness(prev => prev + 5);
                    setActiveActionSheet(null);
                  }}
                >
                  <Text style={styles.tileLabel}>Odbijanie</Text>
                  <Text style={styles.tileIcon}>⚽</Text>
                  <Text style={styles.tileSubLabel}>Darmowe</Text>
                  <View style={[styles.tileButton, { backgroundColor: '#8BC34A' }]}>
                    <Text style={styles.tileButtonText}>Graj (+10)</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.tile, coins < 10 && { opacity: 0.5 }]}
                  disabled={coins < 10}
                  onPress={() => {
                     if (coins >= 10) {
                       setCoins(prev => prev - 10);
                       setHappiness(prev => Math.min(prev + 20, 100));
                       setEnergy(prev => Math.max(prev - 20, 0));
                       setHygiene(prev => Math.max(prev - 15, 0));
                       setStrength(prev => prev + 10);
                       setActiveActionSheet(null);
                     }
                  }}
                >
                  <Text style={styles.tileLabel}>Trening</Text>
                  <Text style={styles.tileIcon}>🏋️</Text>
                  <Text style={styles.tileSubLabel}>Koszt: 10 🪙</Text>
                  <View style={[styles.tileButton, { backgroundColor: coins >= 10 ? '#FF5722' : '#555' }]}>
                    <Text style={styles.tileButtonText}>Ćwicz (+20)</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.tile, coins < 5 && { opacity: 0.5 }]}
                  disabled={coins < 5}
                  onPress={() => {
                     if (coins >= 5) {
                       setCoins(prev => prev - 5);
                       setHappiness(prev => Math.min(prev + 30, 100));
                       setEnergy(prev => Math.max(prev - 15, 0));
                       setIntelligence(prev => prev + 10);
                       setActiveActionSheet(null);
                     }
                  }}
                >
                  <Text style={styles.tileLabel}>Logika</Text>
                  <Text style={styles.tileIcon}>🧩</Text>
                  <Text style={styles.tileSubLabel}>Koszt: 5 🪙</Text>
                  <View style={[styles.tileButton, { backgroundColor: coins >= 5 ? '#9C27B0' : '#555' }]}>
                    <Text style={styles.tileButtonText}>Graj (+30)</Text>
                  </View>
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </View>
      )}

      {/* Game Over Overlay */}
      {isGameOver && (
        <View style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: 'rgba(0,0,0,0.7)',
          zIndex: 2
        }}>
          <Text style={{ color: 'red', fontSize: 40, fontWeight: 'bold', marginBottom: 20 }}>GAME OVER</Text>
          <TouchableOpacity
            onPress={resetGame}
            style={{ backgroundColor: '#4CAF50', padding: 15, borderRadius: 8 }}
          >
            <Text style={{ color: 'white', fontSize: 20, fontWeight: 'bold' }}>Zacznij od nowa</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // Modal Styles
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    zIndex: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    backgroundColor: '#333',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  closeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },

  // HUD Styles
  hudContainer: {
    position: 'absolute',
    bottom: 120, // Above the central button
    left: 20,
    right: 80, // Leave space for right navigation
    backgroundColor: 'rgba(0,0,0,0.8)',
    borderRadius: 20,
    padding: 15,
    zIndex: 1,
  },
  statRow: {
    marginBottom: 10,
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  statLabel: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  statValue: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
  },
  statBarBg: {
    height: 15,
    backgroundColor: '#555',
    borderRadius: 10,
    overflow: 'hidden',
  },

  // Action Buttons Row (in HUD)
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
    paddingHorizontal: 10,
  },
  roundActionButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#444',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },

  // Central Button
  centralButton: {
    position: 'absolute',
    bottom: 30,
    alignSelf: 'center',
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#FF4081', // Premium pink/red
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.5,
    shadowRadius: 5,
    zIndex: 50,
    borderWidth: 2,
    borderColor: 'white',
  },

  // Action Sheet (Horizontal)
  sheetContainer: {
    position: 'absolute',
    bottom: 120,
    width: '95%',
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.9)',
    borderRadius: 20,
    padding: 15,
    zIndex: 20,
    elevation: 10,
  },
  sheetHeader: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  tile: {
    width: 120,
    height: 160,
    backgroundColor: '#333',
    borderRadius: 15,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'space-between',
    marginRight: 10,
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  tileIcon: {
    fontSize: 40,
  },
  tileLabel: {
    color: 'white',
    fontSize: 12,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  tileSubLabel: {
    color: '#aaa',
    fontSize: 10,
    textAlign: 'center',
  },
  tileButton: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
  },
  tileButtonText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
});
