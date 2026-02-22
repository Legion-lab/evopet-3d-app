import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, KeyboardAvoidingView, StyleSheet, Switch, Alert, Dimensions, PanResponder, TouchableWithoutFeedback, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { GLView } from 'expo-gl';
import { Renderer } from 'expo-three';
import * as THREE from 'three';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

const SHOP_ITEMS = [
  { id: 'jablko', name: 'Witaminowe Jabłko', price: 20, category: 'Spiżarnia', icon: '🍎', stats: 'Głód +20, Kondycja +5' },
  { id: 'pizza', name: 'Cyber-Pizza', price: 50, category: 'Spiżarnia', icon: '🍕', stats: 'Głód +50, Lenistwo +15' },
  { id: 'sushi', name: 'Sushi Premium', price: 100, category: 'Spiżarnia', icon: '🍣', stats: 'Głód +40, Inteligencja +10' },
  { id: 'eliksir_wiedzy', name: 'Eliksir Skupienia', price: 150, category: 'Eliksiry', icon: '🧪', stats: 'Inteligencja +20' },
  { id: 'kawa', name: 'Mocna Kawa', price: 30, category: 'Eliksiry', icon: '☕', stats: 'Energia +40, Kondycja -5' },
  { id: 'pilka', name: 'Piłka do skakania', price: 80, category: 'Akcesoria', icon: '⚽', stats: 'Kondycja +15, Więź +5' },
  { id: 'ksiazka', name: 'Mądra Książka', price: 120, category: 'Akcesoria', icon: '📚', stats: 'Inteligencja +25' },
  { id: 'dywan', name: 'Puchaty Dywan', price: 300, category: 'Wnętrza', icon: 'rug', stats: 'Zwiększa regenerację w trakcie snu' }
];

const renderIcon = (icon) => {
  if (icon === 'rug') {
    return <MaterialCommunityIcons name="rug" size={50} color="#FFF" />;
  }
  return <Text style={{ fontSize: 50 }}>{icon}</Text>;
};

const callPetAI = async (userMessage, contextData, key, provider, isSleeping) => {
  if (isSleeping) { return { reply: "zzZZzzzZZzz...", action: "none" }; }
  if (!key || key.trim() === '') {
    return { reply: "Musisz wpisać klucz API w Ustawieniach!", action: "none" };
  }

  try {
    if (provider === 'openai') {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: "Jesteś wirtualnym zwierzakiem. Właściciel: " + contextData.userName + ". Statystyki: Głód " + contextData.hunger + "/100, Energia " + contextData.energy + "/100. Odpowiadaj krótko i z humorem. MUSISZ zwrócić TYLKO poprawny JSON: { \"reply\": \"tekst\", \"action\": \"none\" lub \"jump\" }. Użyj 'jump' gdy jesteś radosny."
            },
            {
              role: "user",
              content: userMessage
            }
          ],
          temperature: 0.7
        })
      });

      const data = await response.json();

      if (data.choices && data.choices.length > 0) {
        let content = data.choices[0].message.content;
        content = content.replace(/```json/g, '').replace(/```/g, '').trim();
        try {
          const parsed = JSON.parse(content);
          return parsed;
        } catch (parseError) {
          console.error("AI Parse Error:", parseError);
          return { reply: content, action: "none" };
        }
      } else {
        return { reply: "Coś poszło nie tak z moim mózgiem...", action: "none" };
      }
    } else if (provider === 'gemini') {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            role: 'user',
            parts: [{ text: userMessage }]
          }],
          systemInstruction: {
            parts: [{
              text: "Jesteś wirtualnym zwierzakiem. Właściciel: " + contextData.userName + ". Statystyki: Głód " + contextData.hunger + ", Energia " + contextData.energy + ". Zwróć JSON: { \"reply\": \"tekst\", \"action\": \"none\"|\"jump\" }"
            }]
          },
          generationConfig: {
            responseMimeType: "application/json"
          }
        })
      });

      const data = await response.json();

      if (data.candidates && data.candidates.length > 0) {
        let content = data.candidates[0].content.parts[0].text;
        content = content.replace(/```json/g, '').replace(/```/g, '').trim();
        try {
          const parsed = JSON.parse(content);
          return parsed;
        } catch (parseError) {
           console.error("AI Parse Error:", parseError);
           return { reply: content, action: "none" };
        }
      } else {
         return { reply: "Coś poszło nie tak z moim mózgiem...", action: "none" };
      }
    } else {
       return { reply: "Nieznany dostawca AI.", action: "none" };
    }

  } catch (error) {
    console.error('KRYTYCZNY BŁĄD API:', error);
    return { reply: "Nie mogę się połączyć z siecią. Sprawdź internet!", action: "none" };
  }
};

export default function App() {
  const sphereRef = useRef(null);
  const ambientLightRef = useRef(null);
  const directionalLightRef = useRef(null);
  const scrollViewRef = useRef(null);
  const sceneRef = useRef(null);
  const dirtMeshesRef = useRef([]);

  const foodMeshRef = useRef(null);
  const isFoodFlyingRef = useRef(false);
  const foodVelocityRef = useRef(new THREE.Vector3());
  const thrownItemRef = useRef(null);
  const inventoryRef = useRef(null);

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
  const [inventory, setInventory] = useState({
    snack: 0, dinner: 0, coffee: 0, hungerBuster: 0, energyBuster: 0,
    jablko: 0, pizza: 0, sushi: 0, eliksir_wiedzy: 0, pilka: 0, ksiazka: 0, dywan: 0
  });
  const [shopTab, setShopTab] = useState('Spiżarnia');
  const [inventoryTab, setInventoryTab] = useState('Spiżarnia');
  const [equippedFood, setEquippedFood] = useState(null);
  const equippedFoodRef = useRef(null);

  useEffect(() => {
    inventoryRef.current = inventory;
  }, [inventory]);

  useEffect(() => {
    equippedFoodRef.current = equippedFood;
  }, [equippedFood]);

  useEffect(() => {
    if (!sceneRef.current) return;

    if (equippedFood) {
      // Remove existing holding mesh if any (and not flying)
      if (foodMeshRef.current && !isFoodFlyingRef.current) {
         sceneRef.current.remove(foodMeshRef.current);
      }

      // Create new mesh
      const geometry = new THREE.BoxGeometry(0.3, 0.3, 0.3);
      const material = new THREE.MeshStandardMaterial({ color: 0xFFA500 }); // Orange
      const mesh = new THREE.Mesh(geometry, material);

      // Position fixed relative to camera view
      mesh.position.set(0, -1.0, 2);

      sceneRef.current.add(mesh);
      foodMeshRef.current = mesh;
      isFoodFlyingRef.current = false;
    } else {
      // Unequipped
      // Only remove if it's NOT flying (i.e. cancelled equip)
      if (foodMeshRef.current && !isFoodFlyingRef.current) {
        sceneRef.current.remove(foodMeshRef.current);
        foodMeshRef.current = null;
      }
    }
  }, [equippedFood]);

  const [hungerBuffUntil, setHungerBuffUntil] = useState(0);
  const [energyBuffUntil, setEnergyBuffUntil] = useState(0);
  const [isSleeping, setIsSleeping] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const gameOverRef = useRef(false);

  const [showHUD, setShowHUD] = useState(false);
  const [activeModal, setActiveModal] = useState(null);
  const [activeActionSheet, setActiveActionSheet] = useState(null);
  const [inspectedItem, setInspectedItem] = useState(null);
  const [actionMode, setActionMode] = useState(null); // 'feed', 'play', 'wash', 'sleep', null

  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [petName, setPetName] = useState('Bobas');
  const [userName, setUserName] = useState('Gracz');
  const [isFirstLaunch, setIsFirstLaunch] = useState(true);
  const [onboardingStep, setOnboardingStep] = useState(0);

  const [strength, setStrength] = useState(0);
  const [intelligence, setIntelligence] = useState(0);
  const [laziness, setLaziness] = useState(0);
  const [bond, setBond] = useState(0);
  const [fitness, setFitness] = useState(0);
  const [profileTab, setProfileTab] = useState('needs');

  const [soundEnabled, setSoundEnabled] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [apiKey, setApiKey] = useState('');
  const [apiProvider, setApiProvider] = useState('openai');
  const [isApiKeyVisible, setIsApiKeyVisible] = useState(false);
  const [activeBubble, setActiveBubble] = useState(null);
  const [showChatHistory, setShowChatHistory] = useState(false);

  useEffect(() => {
    if (isSleeping && actionMode !== 'sleep') setActionMode('sleep');
    if (!isSleeping && actionMode === 'sleep') setActionMode(null);
  }, [isSleeping]);

  useEffect(() => {
    gameOverRef.current = isGameOver;
  }, [isGameOver]);

  useEffect(() => {
    const loadState = async () => {
      try {
        const keys = ['@pet_stats', '@pet_name', '@user_name', '@is_first_launch', '@onboarding_step', '@sound_enabled', '@notifications_enabled', '@user_apikey', '@user_api_provider'];
        const result = await AsyncStorage.multiGet(keys);
        const stores = Object.fromEntries(result);

        const jsonValue = stores['@pet_stats'];
        if (jsonValue != null) {
          const data = JSON.parse(jsonValue);
          let { hunger, energy, hygiene, happiness, coins, isSleeping, lastSavedTime, roomHygiene, strength, intelligence, laziness, bond, fitness, inventory, hungerBuffUntil, energyBuffUntil } = data;

          // Default roomHygiene to 100 if missing
          if (roomHygiene === undefined) roomHygiene = 100;
          if (strength === undefined) strength = 0;
          if (intelligence === undefined) intelligence = 0;
          if (laziness === undefined) laziness = 0;
          if (bond === undefined) bond = 0;
          if (fitness === undefined) fitness = 0;
          if (inventory === undefined) inventory = { snack: 0, dinner: 0, coffee: 0, hungerBuster: 0, energyBuster: 0 };
          if (inventory.hungerBuster === undefined) inventory.hungerBuster = 0;
          if (inventory.energyBuster === undefined) inventory.energyBuster = 0;
          if (inventory.jablko === undefined) inventory.jablko = 0;
          if (inventory.pizza === undefined) inventory.pizza = 0;
          if (inventory.sushi === undefined) inventory.sushi = 0;
          if (inventory.eliksir_wiedzy === undefined) inventory.eliksir_wiedzy = 0;
          if (inventory.pilka === undefined) inventory.pilka = 0;
          if (inventory.ksiazka === undefined) inventory.ksiazka = 0;
          if (inventory.dywan === undefined) inventory.dywan = 0;
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
          setBond(bond);
          setFitness(fitness);
          setInventory(inventory);
          setHungerBuffUntil(hungerBuffUntil);
          setEnergyBuffUntil(energyBuffUntil);
          if (coins !== undefined) setCoins(Math.max(coins, 500)); // T-34: Ensure min 500 coins
          if (isSleeping !== undefined) setIsSleeping(isSleeping);
        } else {
          setCoins(500); // T-34: New user starts with 500
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
        if (stores['@user_apikey']) setApiKey(stores['@user_apikey']);
        if (stores['@user_api_provider']) setApiProvider(stores['@user_api_provider']);

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
          const data = { hunger, energy, hygiene, happiness, coins, isSleeping, roomHygiene, strength, intelligence, laziness, bond, fitness, inventory, hungerBuffUntil, energyBuffUntil, lastSavedTime: Date.now() };
          await AsyncStorage.setItem('@pet_stats', JSON.stringify(data));
        } catch (e) {
          console.error("Failed to save state", e);
        }
      };
      saveState();
    }
  }, [hunger, energy, hygiene, happiness, coins, isSleeping, roomHygiene, strength, intelligence, laziness, bond, fitness, inventory, hungerBuffUntil, energyBuffUntil, isLoaded]);

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
      AsyncStorage.setItem('@user_apikey', apiKey);
    }
  }, [soundEnabled, notificationsEnabled, apiKey, isLoaded]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (gameOverRef.current) return;

      const now = Date.now();
      const isHungerProtected = now <= hungerBuffUntil;
      const isEnergyProtected = now <= energyBuffUntil;

      if (isSleeping) {
        // Sleep Mode: Energy +2 (plus Dywan bonus), others -0.5
        const energyRegen = 2 + (inventory.dywan > 0 ? 1 : 0);
        setEnergy((prev) => Math.min(prev + energyRegen, 100));
        if (!isHungerProtected) setHunger((prev) => Math.max(prev - 0.5, 0));
        setHygiene((prev) => Math.max(prev - 0.5, 0));
        setHappiness((prev) => Math.max(prev - 0.5, 0));
        setRoomHygiene((prev) => Math.max(prev - 0.5, 0));
      } else {
        // Awake Mode: Normal decay (T-34: 1 point per minute)
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
    }, 60000); // T-34: 1 minute interval

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
      const contextData = {
        user_name: userName,
        pet_name: petName,
        stats: { hunger, energy, happiness, hygiene },
        inventory,
        rpg_stats: { strength, intelligence, laziness, bond, fitness },
        message: userText
      };

      // T-28: AI Logic Verified
      callPetAI(userText, contextData, apiKey, apiProvider, isSleeping).then((response) => {
        const replyText = response.reply;
        setMessages((prev) => [...prev, {
          sender: 'pet',
          text: replyText
        }]);
        setActiveBubble(replyText);
        setTimeout(() => setActiveBubble(null), 6000);

        if (response.action === 'jump') {
          isJumpingRef.current = true;
          jumpVelocityRef.current = 0.2;
        }
      });
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
    setBond(0);
    setFitness(0);
    setInventory({ snack: 0, dinner: 0, coffee: 0, hungerBuster: 0, energyBuster: 0, jablko: 0, pizza: 0, sushi: 0, eliksir_wiedzy: 0, pilka: 0, ksiazka: 0, dywan: 0 });
    setIsGameOver(false);

    try {
      const data = { hunger: 80, energy: 80, hygiene: 80, happiness: 80, roomHygiene: 100, strength: 0, intelligence: 0, laziness: 0, bond: 0, fitness: 0, inventory: { snack: 0, dinner: 0, coffee: 0, hungerBuster: 0, energyBuster: 0, jablko: 0, pizza: 0, sushi: 0, eliksir_wiedzy: 0, pilka: 0, ksiazka: 0, dywan: 0 }, lastSavedTime: Date.now() };
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
              setInventory({ snack: 0, dinner: 0, coffee: 0, hungerBuster: 0, energyBuster: 0, jablko: 0, pizza: 0, sushi: 0, eliksir_wiedzy: 0, pilka: 0, ksiazka: 0, dywan: 0 });
              setHungerBuffUntil(0);
              setEnergyBuffUntil(0);
              setStrength(0);
              setIntelligence(0);
              setLaziness(0);
              setBond(0);
              setFitness(0);
              setIsGameOver(false);

              setPetName('Bobas');
              setUserName('Gracz');
              setMessages([]);
              setOnboardingStep(0);
              setIsFirstLaunch(true);
              setActiveModal(null);
              setActionMode(null);
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

    // T-24 Calibration Logs
    console.log('Dotyk 2D:', pageX, pageY);

    // Convert to NDC (Normalized Device Coordinates)
    mouseRef.current.x = (pageX / width) * 2 - 1;
    const rawY = -(pageY / height) * 2 + 1;
    mouseRef.current.y = Math.max(-1, Math.min(1, rawY));

    console.log('Kamera 3D:', mouseRef.current.x, mouseRef.current.y);

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

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => activeModal === null && !showHUD && (actionMode === null || actionMode === 'feed' || actionMode === 'play'),
      onMoveShouldSetPanResponder: (evt, gestureState) => activeModal === null && !showHUD && (actionMode === null || actionMode === 'feed' || actionMode === 'play') && Math.abs(gestureState.dy) > 10,
      onPanResponderRelease: (evt, gestureState) => {
        const { dx, dy } = gestureState;

        // T-28: Debug Log for Swipe
        console.log('GEST SWIPE:', dy, '| TRZYMANE JEDZENIE:', equippedFoodRef.current);

        // Detect Upward Swipe (Throw) - lowered threshold to -20
        if (dy < -20 && equippedFoodRef.current) {
           console.log('WYSTRZAŁ! Prędkość nadana.');
           if (foodMeshRef.current) {
             foodMeshRef.current.position.set(0, -0.5, -2);
           }
           const item = equippedFoodRef.current;

           // Decrease inventory
           if (item !== 'free_snack') {
              setInventory(prev => ({ ...prev, [item]: Math.max(0, prev[item] - 1) }));
           }

           // Activate Physics
           isFoodFlyingRef.current = true;
           foodVelocityRef.current.set(0, 0.15, -0.3);
           thrownItemRef.current = item;

           // Unequip
           setEquippedFood(null);
        }
        // Detect Tap (Click)
        else if (Math.abs(dx) < 10 && Math.abs(dy) < 10) {
           handleTouch(evt);
        }
      },
    })
  ).current;

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

        // --- Flying Food Physics (T-25) ---
        if (isFoodFlyingRef.current && foodMeshRef.current) {
          // Update Position
          foodMeshRef.current.position.add(foodVelocityRef.current);

          // Apply Gravity
          foodVelocityRef.current.y -= 0.01;

          // Rotation for visual effect
          foodMeshRef.current.rotation.x += 0.05;
          foodMeshRef.current.rotation.y += 0.05;

          // Collision Detection
          const distance = foodMeshRef.current.position.distanceTo(sphere.position);

          if (distance < 1.5) {
            // HIT!
            console.log('TRAFIENIE W CEL!');

            // Remove Food
            scene.remove(foodMeshRef.current);
            isFoodFlyingRef.current = false;

            // Trigger Jump
            isJumpingRef.current = true;
            jumpVelocityRef.current = 0.2;

            // Update Stats
            setHappiness((prev) => Math.min(prev + 10, 100));

            // Apply specific item effects
            const itemID = thrownItemRef.current;
            if (itemID === 'free_snack') {
               setHunger((prev) => Math.min(prev + 5, 100));
               setHappiness((prev) => Math.min(prev + 5, 100));
            } else if (itemID === 'snack') {
               setHunger((prev) => Math.min(prev + 20, 100));
            } else if (itemID === 'dinner') {
               setHunger((prev) => Math.min(prev + 50, 100));
            } else if (itemID === 'jablko') {
               setHunger((prev) => Math.min(prev + 20, 100));
               setFitness((prev) => prev + 5);
            } else if (itemID === 'pizza') {
               setHunger((prev) => Math.min(prev + 50, 100));
               setLaziness((prev) => prev + 15);
            } else if (itemID === 'sushi') {
               setHunger((prev) => Math.min(prev + 40, 100));
               setIntelligence((prev) => prev + 10);
            }

          } else if (foodMeshRef.current.position.y < -5) {
            // MISS (Fell out of screen)
            scene.remove(foodMeshRef.current);
            isFoodFlyingRef.current = false;
          }
        }
      }

      renderer.render(scene, camera);
      gl.endFrameEXP();
    };
    render();
  };

  return (
    <View style={{ flex: 1 }} {...panResponder.panHandlers}>
      <View style={{ flex: 1 }}>
        <GLView
          style={{ flex: 1 }}
          onContextCreate={onContextCreate}
        />
      </View>

      {/* Coins Display (Top Left) */}
      {actionMode === null && (
        <View style={{ position: 'absolute', top: 40, left: 20, zIndex: 10 }}>
          <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#FFD700' }}>🪙 {coins}</Text>
        </View>
      )}

      {/* Right Side Vertical Navigation (No Stats Button) */}
      {actionMode === null && (
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
      )}

      {/* Universal Modal */}
      {activeModal !== null && (
         <View style={[styles.modalOverlay, activeModal === 'Czat' && { backgroundColor: 'transparent' }]}>
            <View style={[
              styles.modalContent,
              activeModal === 'Czat' && { backgroundColor: 'transparent', width: '100%', height: '100%', padding: 0, elevation: 0, shadowOpacity: 0 },
              (activeModal === 'Ustawienia' || activeModal === 'Profil') && { backgroundColor: '#F2F2F7', width: '95%', height: '85%', padding: 20 },
              (activeModal === 'Sklep' || activeModal === 'Plecak') && { backgroundColor: 'transparent', width: '100%', height: '100%', padding: 0, elevation: 0, shadowOpacity: 0, justifyContent: 'flex-start' }
            ]}>
               {!(activeModal === 'Sklep' || activeModal === 'Plecak') && (
               <Text style={{
                 color: (activeModal === 'Ustawienia' || activeModal === 'Profil') ? '#000' : 'white',
                 fontSize: 24,
                 fontWeight: 'bold',
                 marginBottom: 20
               }}>
                 {activeModal === 'Ustawienia' ? 'Ustawienia' : activeModal === 'Profil' ? 'Profil Pupila' : activeModal}
               </Text>
               )}
               {activeModal === 'Czat' && (
                 <TouchableOpacity
                   onPress={() => setShowChatHistory(!showChatHistory)}
                   style={{ position: 'absolute', top: 60, right: 80, zIndex: 100, padding: 10 }}
                 >
                   <MaterialCommunityIcons name="history" size={32} color="#FFF" style={{ opacity: 0.9 }} />
                 </TouchableOpacity>
               )}
               <TouchableOpacity
                 onPress={() => setActiveModal(null)}
                 style={
                    activeModal === 'Czat'
                      ? { position: 'absolute', top: 60, right: 25, zIndex: 100, padding: 10, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20 }
                      : [styles.closeButton, (activeModal === 'Ustawienia' || activeModal === 'Profil') && { backgroundColor: 'rgba(0,0,0,0.1)' }]
                 }
               >
                  <Text style={{ color: 'white', fontSize: 14 }}>❌</Text>
               </TouchableOpacity>

               {activeModal === 'Czat' ? (
                 <>
                   {/* Dimmer */}
                   <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)' }} />

                   {/* Bubble Display */}
                   {activeBubble && (
                      <View style={{
                        position: 'absolute',
                        top: '25%',
                        alignSelf: 'center',
                        zIndex: 10,
                        alignItems: 'center',
                        width: '100%'
                      }}>
                        <View style={{
                          backgroundColor: '#FFF',
                          padding: 20,
                          borderRadius: 20,
                          maxWidth: '80%',
                          elevation: 5
                        }}>
                          <Text style={{ fontSize: 18, color: '#000', textAlign: 'center' }}>{activeBubble}</Text>
                        </View>
                        {/* Tail */}
                        <View style={{
                          width: 0,
                          height: 0,
                          backgroundColor: 'transparent',
                          borderStyle: 'solid',
                          borderLeftWidth: 10,
                          borderRightWidth: 10,
                          borderBottomWidth: 0,
                          borderTopWidth: 15,
                          borderLeftColor: 'transparent',
                          borderRightColor: 'transparent',
                          borderTopColor: '#FFF',
                          marginTop: -1
                        }} />
                      </View>
                   )}

                   {/* History Overlay */}
                   {showChatHistory && (
                     <View style={{
                       position: 'absolute',
                       top: '20%',
                       left: 20,
                       right: 20,
                       maxHeight: '60%',
                       backgroundColor: 'rgba(0,0,0,0.85)',
                       borderRadius: 20,
                       padding: 15,
                       zIndex: 50
                     }}>
                       <Text style={{ color: 'white', textAlign: 'center', marginBottom: 10, fontWeight: 'bold' }}>Ostatnie wiadomości</Text>
                       <ScrollView>
                         {messages.slice(-8).map((msg, index) => (
                           <View key={index} style={{ marginBottom: 10, alignItems: msg.sender === 'user' ? 'flex-end' : 'flex-start' }}>
                             <Text style={{ color: msg.sender === 'user' ? '#AAA' : '#4CAF50', fontSize: 10 }}>{msg.sender === 'user' ? 'Ty' : 'Bobas'}</Text>
                             <View style={{
                               backgroundColor: msg.sender === 'user' ? '#444' : '#FFF',
                               padding: 10,
                               borderRadius: 10,
                               marginTop: 2
                             }}>
                               <Text style={{ color: msg.sender === 'user' ? 'white' : 'black' }}>{msg.text}</Text>
                             </View>
                           </View>
                         ))}
                       </ScrollView>
                       <TouchableOpacity
                         onPress={() => setShowChatHistory(false)}
                         style={{ alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)', marginTop: 10 }}
                       >
                         <MaterialCommunityIcons name="chevron-up" size={30} color="#FFF" />
                       </TouchableOpacity>
                     </View>
                   )}

                   {/* Input Area */}
                   <KeyboardAvoidingView
                     behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                     style={{
                       position: 'absolute',
                       bottom: 0,
                       left: 0,
                       right: 0,
                       padding: 10,
                       paddingBottom: 30, // Safe area
                       backgroundColor: 'rgba(0,0,0,0.6)'
                     }}
                   >
                     <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 100, marginHorizontal: 20 }}>
                       <TextInput
                         style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.9)', color: '#000', padding: 12, borderRadius: 20, marginRight: 10 }}
                         value={inputText}
                         onChangeText={setInputText}
                         placeholder="Napisz do zwierzaka..."
                         placeholderTextColor="#555"
                       />
                       <TouchableOpacity onPress={handleSendMessage} style={{ backgroundColor: '#2196F3', padding: 12, borderRadius: 20 }}>
                         <Text style={{ color: 'white', fontWeight: 'bold' }}>Wyślij</Text>
                       </TouchableOpacity>
                     </View>
                   </KeyboardAvoidingView>
                 </>
               ) : activeModal === 'Sklep' ? (
                 <View style={{ width: '92%', maxHeight: '80%', backgroundColor: '#F8F9FA', borderRadius: 25, padding: 20, alignSelf: 'center', marginTop: '15%', elevation: 10, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 10 }}>
                   <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center', color: '#000' }}>Sklep</Text>
                   {/* Tabs */}
                   <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginBottom: 10 }}>
                     {['Spiżarnia', 'Eliksiry', 'Akcesoria', 'Wnętrza'].map(tab => (
                       <TouchableOpacity key={tab} onPress={() => setShopTab(tab)} style={{ padding: 8, borderBottomWidth: shopTab === tab ? 2 : 0, borderColor: '#000' }}>
                         <Text style={{ color: shopTab === tab ? '#000' : '#AAA', fontWeight: 'bold' }}>{tab}</Text>
                       </TouchableOpacity>
                     ))}
                   </View>

                   <View style={{ height: 200, width: '100%' }}>
                     <ScrollView horizontal={true} showsHorizontalScrollIndicator={false} contentContainerStyle={{ alignItems: 'center', paddingHorizontal: 20 }}>
                       {SHOP_ITEMS.filter(item => item.category === shopTab).map((item) => (
                         <TouchableOpacity
                           key={item.id}
                           delayPressIn={150}
                           style={{ width: 130, height: 170, marginHorizontal: 10, borderRadius: 15, backgroundColor: '#FFF', elevation: 4, padding: 10, alignItems: 'center', justifyContent: 'space-between' }}
                           onPress={() => setInspectedItem(item)}
                         >
                           <Text style={{ color: 'black', fontSize: 12, textAlign: 'center', fontWeight: 'bold' }}>{item.name}</Text>
                           <View>{renderIcon(item.icon)}</View>
                           <View
                             style={{ backgroundColor: '#4CAF50', padding: 8, borderRadius: 5, width: '100%', alignItems: 'center' }}
                           >
                             <Text style={{ color: 'white', fontWeight: 'bold' }}>🪙 {item.price}</Text>
                           </View>
                         </TouchableOpacity>
                       ))}
                     </ScrollView>
                   </View>
                   {inspectedItem && (
                     <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', zIndex: 100, borderRadius: 20 }}>
                       <View style={{ backgroundColor: 'white', padding: 25, borderRadius: 20, width: '80%', alignItems: 'center', elevation: 10 }}>
                         <View style={{ marginBottom: 15 }}>{renderIcon(inspectedItem.icon)}</View>
                         <Text style={{ fontSize: 24, fontWeight: 'bold', color: 'black', marginBottom: 5, textAlign: 'center' }}>{inspectedItem.name}</Text>
                         <Text style={{ fontSize: 16, color: '#555', marginBottom: 20, textAlign: 'center' }}>Wpływ: {inspectedItem.stats}</Text>

                         <TouchableOpacity
                           style={{ backgroundColor: coins >= inspectedItem.price ? '#2196F3' : '#999', paddingVertical: 12, paddingHorizontal: 30, borderRadius: 10, marginBottom: 10, width: '100%', alignItems: 'center' }}
                           disabled={coins < inspectedItem.price}
                           onPress={() => {
                             if (coins >= inspectedItem.price) {
                                setCoins(prev => prev - inspectedItem.price);
                                setInventory(prev => ({ ...prev, [inspectedItem.id]: (prev[inspectedItem.id] || 0) + 1 }));
                                setInspectedItem(null);
                                Alert.alert('Sukces', `Kupiono ${inspectedItem.name}!`);
                             }
                           }}
                         >
                           <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>
                              {coins >= inspectedItem.price ? `KUP (${inspectedItem.price} 🪙)` : 'Za mało monet'}
                           </Text>
                         </TouchableOpacity>

                         <TouchableOpacity
                           style={{ backgroundColor: '#ccc', paddingVertical: 12, paddingHorizontal: 30, borderRadius: 10, width: '100%', alignItems: 'center' }}
                           onPress={() => setInspectedItem(null)}
                         >
                           <Text style={{ color: '#333', fontWeight: 'bold', fontSize: 16 }}>Anuluj</Text>
                         </TouchableOpacity>
                       </View>
                     </View>
                   )}
                 </View>
               ) : activeModal === 'Plecak' ? (
                 <View style={{ width: '92%', maxHeight: '80%', backgroundColor: '#F8F9FA', borderRadius: 25, padding: 20, alignSelf: 'center', marginTop: '15%', elevation: 10, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 10 }}>
                   <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center', color: '#000' }}>Plecak</Text>
                   {/* Tabs */}
                   <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginBottom: 10 }}>
                     {['Spiżarnia', 'Eliksiry', 'Akcesoria', 'Wnętrza'].map(tab => (
                       <TouchableOpacity key={tab} onPress={() => setInventoryTab(tab)} style={{ padding: 8, borderBottomWidth: inventoryTab === tab ? 2 : 0, borderColor: '#000' }}>
                         <Text style={{ color: inventoryTab === tab ? '#000' : '#AAA', fontWeight: 'bold' }}>{tab}</Text>
                       </TouchableOpacity>
                     ))}
                   </View>

                   <View style={{ height: 200, width: '100%' }}>
                     <ScrollView horizontal={true} showsHorizontalScrollIndicator={false} contentContainerStyle={{ alignItems: 'center', paddingHorizontal: 20 }}>
                       {SHOP_ITEMS.filter(item => item.category === inventoryTab && inventory[item.id] > 0).map((item) => (
                         <TouchableOpacity key={item.id} delayPressIn={100} style={{ width: 130, height: 170, marginHorizontal: 10, borderRadius: 15, backgroundColor: '#FFF', elevation: 4, padding: 10, alignItems: 'center', justifyContent: 'space-between' }}>
                           <Text style={{ color: 'black', fontSize: 12, textAlign: 'center', fontWeight: 'bold' }}>{item.name}</Text>
                           <View>{renderIcon(item.icon)}</View>
                           <Text style={{ color: '#555', fontWeight: 'bold' }}>Posiadasz: {inventory[item.id]}</Text>
                         </TouchableOpacity>
                       ))}
                       {SHOP_ITEMS.filter(item => item.category === inventoryTab && inventory[item.id] > 0).length === 0 && (
                          <View style={{ width: width - 80, alignItems: 'center', justifyContent: 'center' }}>
                             <Text style={{ color: '#AAA' }}>Pusto w tej kategorii...</Text>
                          </View>
                       )}
                     </ScrollView>
                   </View>
                 </View>
               ) : activeModal === 'Profil' ? (
                 <View style={{ width: '100%', padding: 10 }}>
                   {/* Header: Metryczka */}
                   <View style={{ alignItems: 'center', marginBottom: 20 }}>
                     <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#333' }}>Imię: {petName || 'Bobas'}</Text>
                     <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#555', marginTop: 5 }}>Faza: Nastolatek</Text>
                   </View>

                   {/* Tab Switcher */}
                   <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 20, gap: 15 }}>
                     <TouchableOpacity
                       onPress={() => setProfileTab('needs')}
                       style={{
                         backgroundColor: profileTab === 'needs' ? '#007AFF' : '#DDD',
                         paddingVertical: 10,
                         paddingHorizontal: 25,
                         borderRadius: 20
                       }}
                     >
                       <Text style={{ color: profileTab === 'needs' ? 'white' : '#333', fontWeight: 'bold' }}>Potrzeby</Text>
                     </TouchableOpacity>
                     <TouchableOpacity
                       onPress={() => setProfileTab('character')}
                       style={{
                         backgroundColor: profileTab === 'character' ? '#007AFF' : '#DDD',
                         paddingVertical: 10,
                         paddingHorizontal: 25,
                         borderRadius: 20
                       }}
                     >
                       <Text style={{ color: profileTab === 'character' ? 'white' : '#333', fontWeight: 'bold' }}>Charakter</Text>
                     </TouchableOpacity>
                   </View>

                   {/* Dynamic Content */}
                   {profileTab === 'needs' ? (
                     <View style={{ width: '100%', paddingHorizontal: 10, gap: 15 }}>
                       {/* Hunger */}
                       <View>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
                            <Text style={{ fontWeight: 'bold', color: '#333', fontSize: 14 }}>Głód</Text>
                            <Text style={{ color: '#555', fontSize: 14 }}>{Math.round(hunger)}/100</Text>
                          </View>
                          <View style={{ height: 20, backgroundColor: '#333', borderRadius: 10, overflow: 'hidden' }}>
                            <View style={{ width: `${hunger}%`, height: '100%', backgroundColor: '#FF5252' }} />
                          </View>
                       </View>

                       {/* Energy */}
                       <View>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
                            <Text style={{ fontWeight: 'bold', color: '#333', fontSize: 14 }}>Energia</Text>
                            <Text style={{ color: '#555', fontSize: 14 }}>{Math.round(energy)}/100</Text>
                          </View>
                          <View style={{ height: 20, backgroundColor: '#333', borderRadius: 10, overflow: 'hidden' }}>
                            <View style={{ width: `${energy}%`, height: '100%', backgroundColor: '#FFD700' }} />
                          </View>
                       </View>

                       {/* Hygiene */}
                       <View>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
                            <Text style={{ fontWeight: 'bold', color: '#333', fontSize: 14 }}>Higiena</Text>
                            <Text style={{ color: '#555', fontSize: 14 }}>{Math.round(hygiene)}/100</Text>
                          </View>
                          <View style={{ height: 20, backgroundColor: '#333', borderRadius: 10, overflow: 'hidden' }}>
                            <View style={{ width: `${hygiene}%`, height: '100%', backgroundColor: '#2196F3' }} />
                          </View>
                       </View>

                       {/* Happiness */}
                       <View>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
                            <Text style={{ fontWeight: 'bold', color: '#333', fontSize: 14 }}>Szczęście</Text>
                            <Text style={{ color: '#555', fontSize: 14 }}>{Math.round(happiness)}/100</Text>
                          </View>
                          <View style={{ height: 20, backgroundColor: '#333', borderRadius: 10, overflow: 'hidden' }}>
                            <View style={{ width: `${happiness}%`, height: '100%', backgroundColor: '#E91E63' }} />
                          </View>
                       </View>

                       {/* Action Buttons (Restored for Playability) */}
                       <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginTop: 20 }}>
                          <TouchableOpacity onPress={() => {
                             if (isSleeping) { Alert.alert('Ciii...', 'Bobas teraz śpi. Zostaw go w spokoju!'); return; }
                             setActiveModal(null);
                             setActionMode('feed');
                          }} style={{ alignItems: 'center' }}>
                             <View style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: '#FF5252', justifyContent: 'center', alignItems: 'center', elevation: 3 }}>
                                <Text style={{ fontSize: 24 }}>🍖</Text>
                             </View>
                             <Text style={{ color: '#555', fontSize: 10, marginTop: 5, fontWeight: 'bold' }}>Nakarm</Text>
                          </TouchableOpacity>

                          <TouchableOpacity onPress={() => {
                             setActiveModal(null);
                             setActionMode('sleep');
                             setIsSleeping(true);
                          }} style={{ alignItems: 'center' }}>
                             <View style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: '#FFD700', justifyContent: 'center', alignItems: 'center', elevation: 3 }}>
                                <Text style={{ fontSize: 24 }}>⚡</Text>
                             </View>
                             <Text style={{ color: '#555', fontSize: 10, marginTop: 5, fontWeight: 'bold' }}>Sen</Text>
                          </TouchableOpacity>

                          <TouchableOpacity onPress={() => {
                             if (isSleeping) { Alert.alert('Ciii...', 'Bobas teraz śpi. Zostaw go w spokoju!'); return; }
                             setActiveModal(null);
                             setActionMode('wash');
                          }} style={{ alignItems: 'center' }}>
                             <View style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: '#2196F3', justifyContent: 'center', alignItems: 'center', elevation: 3 }}>
                                <Text style={{ fontSize: 24 }}>🚿</Text>
                             </View>
                             <Text style={{ color: '#555', fontSize: 10, marginTop: 5, fontWeight: 'bold' }}>Umyj</Text>
                          </TouchableOpacity>

                          <TouchableOpacity onPress={() => {
                             if (isSleeping) { Alert.alert('Ciii...', 'Bobas teraz śpi. Zostaw go w spokoju!'); return; }
                             setActiveModal(null);
                             setActionMode('play');
                          }} style={{ alignItems: 'center' }}>
                             <View style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: '#E91E63', justifyContent: 'center', alignItems: 'center', elevation: 3 }}>
                                <Text style={{ fontSize: 24 }}>⚽</Text>
                             </View>
                             <Text style={{ color: '#555', fontSize: 10, marginTop: 5, fontWeight: 'bold' }}>Baw się</Text>
                          </TouchableOpacity>
                       </View>
                     </View>
                   ) : (
                     <View style={{ width: '100%', paddingHorizontal: 10, gap: 15 }}>
                       {/* Intelligence */}
                       <View>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
                            <Text style={{ fontWeight: 'bold', color: '#333', fontSize: 14 }}>Inteligencja</Text>
                            <Text style={{ color: '#555', fontSize: 14 }}>{intelligence}/100</Text>
                          </View>
                          <View style={{ height: 20, backgroundColor: '#333', borderRadius: 10, overflow: 'hidden' }}>
                            <View style={{ width: `${intelligence}%`, height: '100%', backgroundColor: '#9C27B0' }} />
                          </View>
                       </View>

                       {/* Laziness */}
                       <View>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
                            <Text style={{ fontWeight: 'bold', color: '#333', fontSize: 14 }}>Lenistwo</Text>
                            <Text style={{ color: '#555', fontSize: 14 }}>{laziness}/100</Text>
                          </View>
                          <View style={{ height: 20, backgroundColor: '#333', borderRadius: 10, overflow: 'hidden' }}>
                            <View style={{ width: `${laziness}%`, height: '100%', backgroundColor: '#795548' }} />
                          </View>
                       </View>

                       {/* Bond */}
                       <View>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
                            <Text style={{ fontWeight: 'bold', color: '#333', fontSize: 14 }}>Więź</Text>
                            <Text style={{ color: '#555', fontSize: 14 }}>{bond}/100</Text>
                          </View>
                          <View style={{ height: 20, backgroundColor: '#333', borderRadius: 10, overflow: 'hidden' }}>
                            <View style={{ width: `${bond}%`, height: '100%', backgroundColor: '#E91E63' }} />
                          </View>
                       </View>

                       {/* Fitness */}
                       <View>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
                            <Text style={{ fontWeight: 'bold', color: '#333', fontSize: 14 }}>Kondycja</Text>
                            <Text style={{ color: '#555', fontSize: 14 }}>{fitness}/100</Text>
                          </View>
                          <View style={{ height: 20, backgroundColor: '#333', borderRadius: 10, overflow: 'hidden' }}>
                            <View style={{ width: `${fitness}%`, height: '100%', backgroundColor: '#4CAF50' }} />
                          </View>
                       </View>
                     </View>
                   )}
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

                     {/* AI Group */}
                     <View style={{ marginBottom: 25 }}>
                       <Text style={{ color: '#888', fontSize: 12, fontWeight: 'bold', marginBottom: 5, marginLeft: 15 }}>SZTUCZNA INTELIGENCJA</Text>
                       <View style={{ backgroundColor: '#FFF', borderRadius: 15, padding: 15, elevation: 2 }}>

                         {/* Provider Selector */}
                         <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 }}>
                           <TouchableOpacity
                              style={{
                                 flex: 1,
                                 padding: 10,
                                 backgroundColor: apiProvider === 'openai' ? '#007AFF' : '#EEE',
                                 borderRadius: 8,
                                 marginRight: 10,
                                 alignItems: 'center'
                              }}
                              onPress={() => setApiProvider('openai')}
                           >
                              <Text style={{ color: apiProvider === 'openai' ? 'white' : 'black', fontWeight: 'bold' }}>OpenAI</Text>
                           </TouchableOpacity>
                           <TouchableOpacity
                              style={{
                                 flex: 1,
                                 padding: 10,
                                 backgroundColor: apiProvider === 'gemini' ? '#007AFF' : '#EEE',
                                 borderRadius: 8,
                                 marginLeft: 10,
                                 alignItems: 'center'
                              }}
                              onPress={() => setApiProvider('gemini')}
                           >
                              <Text style={{ color: apiProvider === 'gemini' ? 'white' : 'black', fontWeight: 'bold' }}>Google Gemini</Text>
                           </TouchableOpacity>
                         </View>

                         <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                            <TextInput
                              style={{
                                flex: 1,
                                borderWidth: 1,
                                borderColor: '#EEE',
                                borderRadius: 8,
                                padding: 10,
                                color: '#000'
                              }}
                              placeholder={apiProvider === 'openai' ? "Wklej klucz OpenAI API" : "Wklej klucz Google Gemini API"}
                              placeholderTextColor="#aaa"
                              value={apiKey}
                              onChangeText={setApiKey}
                              secureTextEntry={!isApiKeyVisible}
                            />
                            <TouchableOpacity
                               onPress={() => setIsApiKeyVisible(!isApiKeyVisible)}
                               style={{ marginLeft: 10, padding: 10, backgroundColor: '#EEE', borderRadius: 8 }}
                            >
                               <Text style={{ fontSize: 12 }}>{isApiKeyVisible ? '🙈 Ukryj' : '👁️ Pokaż'}</Text>
                            </TouchableOpacity>
                         </View>

                         <TouchableOpacity
                           style={{
                             backgroundColor: '#4CAF50',
                             padding: 10,
                             borderRadius: 8,
                             alignItems: 'center'
                           }}
                           onPress={() => {
                             AsyncStorage.setItem('@user_apikey', apiKey);
                             AsyncStorage.setItem('@user_api_provider', apiProvider);
                             Alert.alert('Sukces', 'Zapisano silnik i klucz API!');
                           }}
                         >
                           <Text style={{ color: 'white', fontWeight: 'bold' }}>Zapisz klucz</Text>
                         </TouchableOpacity>
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

      {/* Central Button */}
      {actionMode === null && (
        <TouchableOpacity onPress={() => setActiveModal(activeModal === 'Profil' ? null : 'Profil')} style={styles.centralButton}>
          <Text style={{ fontSize: 30 }}>🐾</Text>
        </TouchableOpacity>
      )}

      {/* Cinematic Action UI (Feed, Play, Wash) */}
      {(actionMode === 'feed' || actionMode === 'play' || actionMode === 'wash') && (
         <View style={{
           position: 'absolute',
           bottom: 0,
           left: 0,
           right: 0,
           height: 160,
           backgroundColor: 'rgba(0,0,0,0.9)',
           flexDirection: 'row',
           alignItems: 'center',
           zIndex: 20,
           paddingBottom: 20
         }}>
           <TouchableOpacity
             onPress={() => setActionMode(null)}
             style={{
               width: 40, height: 40, backgroundColor: 'rgba(255,255,255,0.2)',
               borderRadius: 20, justifyContent: 'center', alignItems: 'center',
               marginLeft: 15,
               marginRight: 10
             }}
           >
              <Text style={{fontSize: 18, color: 'white'}}>X</Text>
           </TouchableOpacity>

           {actionMode === 'wash' ? (
             <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
               <TouchableOpacity
                 onPress={() => {
                    setHygiene(prev => Math.min(prev + 50, 100));
                    Alert.alert('Sukces', 'Umyto Bobasa! (+50 Higieny)');
                 }}
                 style={{
                   backgroundColor: '#2196F3',
                   paddingVertical: 15,
                   paddingHorizontal: 40,
                   borderRadius: 30,
                   elevation: 5,
                   flexDirection: 'row',
                   alignItems: 'center',
                   gap: 10
                 }}
               >
                 <Text style={{ fontSize: 24 }}>🧽</Text>
                 <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold' }}>Szoruj (+50% Higieny)</Text>
               </TouchableOpacity>
             </View>
           ) : (
             <ScrollView
               horizontal
               showsHorizontalScrollIndicator={false}
               style={{ flex: 1 }}
               contentContainerStyle={{ paddingHorizontal: 10, alignItems: 'center' }}
             >
               {/* Feed Items */}
               {actionMode === 'feed' && [
                 { id: 'free_snack', name: 'Darmowa Chrupka', icon: '🦴', quantity: '∞' },
                 ...SHOP_ITEMS.filter(item => item.category === 'Spiżarnia' && inventory[item.id] > 0).map(item => ({ ...item, quantity: inventory[item.id] }))
               ].map((item) => (
                   <TouchableOpacity
                     key={item.id}
                     style={{
                       width: 100, height: 120, marginHorizontal: 8, backgroundColor: '#333', borderRadius: 15,
                       justifyContent: 'space-between', alignItems: 'center', padding: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', elevation: 5
                     }}
                     onPress={() => setEquippedFood(item.id)}
                   >
                     <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold', textAlign: 'center' }}>{item.name}</Text>
                     <Text style={{ fontSize: 40 }}>{item.icon}</Text>
                     <Text style={{ color: '#aaa', fontSize: 10, fontWeight: 'bold' }}>{item.id === 'free_snack' ? '∞' : `x${item.quantity}`}</Text>
                   </TouchableOpacity>
               ))}

               {/* Play Items */}
               {actionMode === 'play' && SHOP_ITEMS.filter(item => item.category === 'Akcesoria' && inventory[item.id] > 0).map(item => ({ ...item, quantity: inventory[item.id] })).map((item) => (
                   <TouchableOpacity
                     key={item.id}
                     style={{
                       width: 100, height: 120, marginHorizontal: 8, backgroundColor: '#333', borderRadius: 15,
                       justifyContent: 'space-between', alignItems: 'center', padding: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', elevation: 5
                     }}
                     onPress={() => setEquippedFood(item.id)}
                   >
                     <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold', textAlign: 'center' }}>{item.name}</Text>
                     <View>{renderIcon(item.icon)}</View>
                     <Text style={{ color: '#aaa', fontSize: 10, fontWeight: 'bold' }}>x{item.quantity}</Text>
                   </TouchableOpacity>
               ))}
               {actionMode === 'play' && SHOP_ITEMS.filter(item => item.category === 'Akcesoria' && inventory[item.id] > 0).length === 0 && (
                  <View style={{ width: 200, alignItems: 'center' }}>
                     <Text style={{ color: '#AAA' }}>Brak zabawek w plecaku...</Text>
                  </View>
               )}
             </ScrollView>
           )}
         </View>
      )}

      {/* Sleep Mode Overlay */}
      {actionMode === 'sleep' && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,20,0.5)', zIndex: 100, justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 50 }}>
          <TouchableOpacity
            onPress={() => {
               setActionMode(null);
               setIsSleeping(false);
            }}
            style={{
               backgroundColor: '#FFD700',
               paddingVertical: 15,
               paddingHorizontal: 40,
               borderRadius: 30,
               elevation: 10
            }}
          >
             <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#000' }}>☀️ Obudź</Text>
          </TouchableOpacity>
        </View>
      )}

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

          <ScrollView horizontal={true} showsHorizontalScrollIndicator={false} style={{ flexGrow: 1, width: '100%', minHeight: 200 }} contentContainerStyle={{ alignItems: 'center', paddingHorizontal: 20, gap: 15 }}>
            {activeActionSheet === 'food' && (
              <>
                <TouchableOpacity
                  style={[styles.tile, inventory.snack <= 0 && { opacity: 0.5 }]}
                  disabled={inventory.snack <= 0}
                  onPress={() => {
                    if (inventory.snack > 0) {
                      setEquippedFood('snack');
                      // Fix: Ensure menu closes
                      setActiveActionSheet(null);
                      setShowHUD(false);
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
                      setEquippedFood('dinner');
                      // Fix: Ensure menu closes
                      setActiveActionSheet(null);
                      setShowHUD(false);
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
                    setHygiene(prev => Math.min(prev + 50, 100));
                    setActiveActionSheet(null);
                  }}
                >
                  <Text style={styles.tileLabel}>Umyj Bobasa</Text>
                  <Text style={styles.tileIcon}>🛁</Text>
                  <Text style={styles.tileSubLabel}>Darmowe</Text>
                  <View style={[styles.tileButton, { backgroundColor: '#03A9F4' }]}>
                    <Text style={styles.tileButtonText}>Umyj (+50)</Text>
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
