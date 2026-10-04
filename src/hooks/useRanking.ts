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
      try {
        const { data, error } = await supabase
          .from("performance")
          .select("athlete_name, forca")
          .order("forca", { ascending: false });

        if (!error && data && data.length > 0) {
          setRanking(data);
        } else {
          // Fallback: Query athletes and their best metrics safely
          try {
            const { data: athletes, error: athError } = await supabase
              .from("athletes")
              .select(`
                name,
                isometric_strength(half_squat_kgf)
              `);
            
            if (!athError && athletes && athletes.length > 0) {
              const derived = athletes
                .map((a: any) => ({
                  athlete_name: a.name,
                  forca: a.isometric_strength?.[0]?.half_squat_kgf || 0
                }))
                .sort((a: any, b: any) => b.forca - a.forca);
              
              setRanking(derived);
            }
          } catch (e) {
            // Ignore permission or connection errors
          }
        }
      } catch (err) {
        // Silently fall through
      }
      setLoading(false);
    }

    fetchRanking();
  }, []);

  return { ranking, loading };
}
