import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export interface RankingItem {
  athlete_name: string;
  forca: number;
}

export function useRanking() {
  const [ranking, setRanking] = useState<RankingItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRanking() {
      setLoading(true);
      // Try to get from performance table first as requested
      const { data, error } = await supabase
        .from("performance")
        .select("athlete_name, forca")
        .order("forca", { ascending: false });

      if (!error && data) {
        setRanking(data);
      } else {
        // Fallback: Query athletes and their best metrics
        const { data: athletes } = await supabase
          .from("athletes")
          .select(`
            name,
            isometric_strength(half_squat_kgf)
          `);
        
        if (athletes) {
          const derived = athletes
            .map((a: any) => ({
              athlete_name: a.name,
              forca: a.isometric_strength?.[0]?.half_squat_kgf || 0
            }))
            .sort((a, b) => b.forca - a.forca);
          
          setRanking(derived);
        }
      }
      setLoading(false);
    }

    fetchRanking();
  }, []);

  return { ranking, loading };
}
