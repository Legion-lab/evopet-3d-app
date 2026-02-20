import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, KeyboardAvoidingView } from 'react-native';
import { GLView } from 'expo-gl';
import { Renderer } from 'expo-three';
import * as THREE from 'three';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function App() {
  const sphereRef = useRef(null);
  const ambientLightRef = useRef(null);
  const directionalLightRef = useRef(null);
  const scrollViewRef = useRef(null);
  const [hunger, setHunger] = useState(80);
  const [energy, setEnergy] = useState(80);
  const [hygiene, setHygiene] = useState(80);
  const [happiness, setHappiness] = useState(80);
  const [coins, setCoins] = useState(50);
  const [isSleeping, setIsSleeping] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const gameOverRef = useRef(false);

  const [showHUD, setShowHUD] = useState(false);
  const [activeModal, setActiveModal] = useState(null);

  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [petName, setPetName] = useState('Bobas');
  const [userName, setUserName] = useState('Gracz');
  const [isFirstLaunch, setIsFirstLaunch] = useState(true);
  const [onboardingStep, setOnboardingStep] = useState(0);

  useEffect(() => {
    gameOverRef.current = isGameOver;
  }, [isGameOver]);

  useEffect(() => {
    const loadState = async () => {
      try {
        const keys = ['@pet_stats', '@pet_name', '@user_name', '@is_first_launch', '@onboarding_step'];
        const result = await AsyncStorage.multiGet(keys);
        const stores = Object.fromEntries(result);

        const jsonValue = stores['@pet_stats'];
        if (jsonValue != null) {
          const data = JSON.parse(jsonValue);
          let { hunger, energy, hygiene, happiness, coins, isSleeping, lastSavedTime } = data;

          if (lastSavedTime) {
            const now = Date.now();
            const elapsedSeconds = Math.floor((now - lastSavedTime) / 1000);

            if (elapsedSeconds > 0) {
              if (isSleeping) {
                // Sleep Logic: Energy increases, others decrease slower
                energy = Math.min(energy + elapsedSeconds * 2, 100);
                hunger = Math.max(hunger - elapsedSeconds * 0.5, 0);
                hygiene = Math.max(hygiene - elapsedSeconds * 0.5, 0);
                happiness = Math.max(happiness - elapsedSeconds * 0.5, 0);
              } else {
                // Awake Logic: Standard decay
                hunger = Math.max(hunger - elapsedSeconds, 0);
                energy = Math.max(energy - elapsedSeconds, 0);
                hygiene = Math.max(hygiene - elapsedSeconds, 0);
                happiness = Math.max(happiness - elapsedSeconds, 0);
              }
            }
          }

          setHunger(hunger);
          setEnergy(energy);
          setHygiene(hygiene);
          setHappiness(happiness);
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
          const data = { hunger, energy, hygiene, happiness, coins, isSleeping, lastSavedTime: Date.now() };
          await AsyncStorage.setItem('@pet_stats', JSON.stringify(data));
        } catch (e) {
          console.error("Failed to save state", e);
        }
      };
      saveState();
    }
  }, [hunger, energy, hygiene, happiness, coins, isSleeping, isLoaded]);

  // Save onboarding/profile state separately
  useEffect(() => {
    if (isLoaded) {
       AsyncStorage.setItem('@pet_name', petName);
       AsyncStorage.setItem('@user_name', userName);
       AsyncStorage.setItem('@is_first_launch', JSON.stringify(isFirstLaunch));
       AsyncStorage.setItem('@onboarding_step', onboardingStep.toString());
    }
  }, [petName, userName, isFirstLaunch, onboardingStep, isLoaded]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (gameOverRef.current) return;

      if (isSleeping) {
        // Sleep Mode: Energy +2, others -0.5
        setEnergy((prev) => Math.min(prev + 2, 100));
        setHunger((prev) => Math.max(prev - 0.5, 0));
        setHygiene((prev) => Math.max(prev - 0.5, 0));
        setHappiness((prev) => Math.max(prev - 0.5, 0));
      } else {
        // Awake Mode: Normal decay
        setHunger((prev) => {
          const newValue = prev - 1;
          if (newValue <= 0) {
            setIsGameOver(true);
            return 0;
          }
          return newValue;
        });
        setEnergy((prev) => Math.max(prev - 1, 0));
        setHygiene((prev) => Math.max(prev - 1, 0));
        setHappiness((prev) => Math.max(prev - 1, 0));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isSleeping]);

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
    }
  }, [hunger, happiness, isGameOver]);

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
    setIsGameOver(false);

    try {
      const data = { hunger: 80, energy: 80, hygiene: 80, happiness: 80, lastSavedTime: Date.now() };
      await AsyncStorage.setItem('@pet_stats', JSON.stringify(data));
    } catch (e) {
      console.error("Failed to reset state", e);
    }
  };

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
      }

      renderer.render(scene, camera);
      gl.endFrameEXP();
    };
    render();
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1 }}>
        <GLView
          style={{ flex: 1 }}
          onContextCreate={onContextCreate}
        />
      </View>

      {/* Coins Display (Top Left) */}
      <View style={{ position: 'absolute', top: 40, left: 20, zIndex: 10 }}>
        <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#FFD700' }}>🪙 {coins}</Text>
      </View>

      {/* Sleep Toggle Button (Top Right) */}
      {!isGameOver && (
        <TouchableOpacity
          onPress={() => setIsSleeping(!isSleeping)}
          style={{
            position: 'absolute',
            top: 40,
            right: 20,
            backgroundColor: isSleeping ? '#FFD700' : '#483D8B',
            padding: 10,
            borderRadius: 20,
            zIndex: 10
          }}
        >
          <Text style={{ color: isSleeping ? 'black' : 'white', fontWeight: 'bold' }}>
            {isSleeping ? '☀️ Obudź' : '🌙 Uśpij'}
          </Text>
        </TouchableOpacity>
      )}

      {/* Right Side Vertical Navigation (TikTok Style) */}
      <View style={{
        position: 'absolute',
        right: 15,
        bottom: 100,
        flexDirection: 'column',
        alignItems: 'center',
        gap: 20
      }}>
        {/* Stats Button */}
        <TouchableOpacity
          onPress={() => setShowHUD(!showHUD)}
          style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}
        >
          <Text style={{ fontSize: 24 }}>📊</Text>
        </TouchableOpacity>

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
         <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 20, justifyContent: 'center', alignItems: 'center' }}>
            <View style={{ width: '80%', backgroundColor: '#333', borderRadius: 20, padding: 20, alignItems: 'center' }}>
               <Text style={{ color: 'white', fontSize: 24, fontWeight: 'bold', marginBottom: 20 }}>Witaj w: {activeModal}</Text>

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
               ) : (
                 <View style={{ height: 100, justifyContent: 'center', alignItems: 'center', marginBottom: 20 }}>
                   <Text style={{ color: '#aaa' }}>Treść dla {activeModal} pojawi się wkrótce...</Text>
                 </View>
               )}

               <TouchableOpacity onPress={() => setActiveModal(null)} style={{ padding: 10, marginTop: 10, backgroundColor: '#d32f2f', borderRadius: 5, width: '100%', alignItems: 'center' }}>
                  <Text style={{ color: 'white', fontWeight: 'bold' }}>Zamknij</Text>
               </TouchableOpacity>
            </View>
         </View>
      )}

      {showHUD && (
      <View style={{ position: 'absolute', bottom: 120, left: 20, width: '60%', zIndex: 1 }}>
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
      )}

      {/* Action Buttons */}
      {showHUD && !isGameOver && (
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
