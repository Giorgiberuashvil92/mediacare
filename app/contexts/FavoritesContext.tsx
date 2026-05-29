import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";

const FAVORITES_STORAGE_KEY = "@medicare_favorites";

export interface Doctor {
  id: number;
  name: string;
  nameEn?: string;
  nameRu?: string;
  specialization: string;
  rating: number;
  reviewCount?: number;
  reviews?: number | any[];
  image: any;
  degrees?: string;
  location?: string;
  patients?: string;
  experience?: string;
  consultationFee?: string;
  followUpFee?: string;
  about?: string;
  isActive?: boolean;
  workingHours?: string;
  availability?: any[];
  totalReviews?: number;
}

interface FavoritesContextType {
  favoriteDoctors: Doctor[];
  addToFavorites: (doctor: Doctor) => Promise<void>;
  removeFromFavorites: (doctorId: number) => Promise<void>;
  isFavorite: (doctorId: number) => boolean;
  toggleFavorite: (doctor: Doctor) => Promise<void>;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(
  undefined
);

export const useFavorites = () => {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error("useFavorites must be used within a FavoritesProvider");
  }
  return context;
};

interface FavoritesProviderProps {
  children: ReactNode;
}

export const FavoritesProvider: React.FC<FavoritesProviderProps> = ({
  children,
}) => {
  const [favoriteDoctors, setFavoriteDoctors] = useState<Doctor[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load favorites from AsyncStorage on mount
  useEffect(() => {
    loadFavorites();
  }, []);

  // Save favorites to AsyncStorage whenever they change
  useEffect(() => {
    if (isLoaded) {
      saveFavorites();
    }
  }, [favoriteDoctors, isLoaded]);

  const loadFavorites = async () => {
    try {
      const stored = await AsyncStorage.getItem(FAVORITES_STORAGE_KEY);
      if (stored) {
        setFavoriteDoctors(JSON.parse(stored));
      }
    } catch (error) {
      console.error("Error loading favorites:", error);
    } finally {
      setIsLoaded(true);
    }
  };

  const saveFavorites = async () => {
    try {
      await AsyncStorage.setItem(
        FAVORITES_STORAGE_KEY,
        JSON.stringify(favoriteDoctors)
      );
    } catch (error) {
      console.error("Error saving favorites:", error);
    }
  };

  const addToFavorites = async (doctor: Doctor) => {
    setFavoriteDoctors((prev) => {
      // Check if already in favorites
      if (prev.some((d) => d.id === doctor.id)) {
        return prev;
      }
      return [...prev, doctor];
    });
  };

  const removeFromFavorites = async (doctorId: number) => {
    setFavoriteDoctors((prev) =>
      prev.filter((doctor) => doctor.id !== doctorId)
    );
  };

  const isFavorite = (doctorId: number): boolean => {
    return favoriteDoctors.some((doctor) => doctor.id === doctorId);
  };

  const toggleFavorite = async (doctor: Doctor) => {
    if (isFavorite(doctor.id)) {
      await removeFromFavorites(doctor.id);
    } else {
      await addToFavorites(doctor);
    }
  };

  const value: FavoritesContextType = {
    favoriteDoctors,
    addToFavorites,
    removeFromFavorites,
    isFavorite,
    toggleFavorite,
  };

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  );
};
