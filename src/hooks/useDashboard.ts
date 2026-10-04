
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { Athlete } from "../types";

export interface PerformanceItem {
  id: string;
  athlete_name: string;
  forca: number;
  vo2: number;
  cmj: number;
  created_at: string;
}

export function useDashboard() {
  const [data, setData] = useState<PerformanceItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const { data: perfData, error } = await supabase
          .from("performance")
          .select("*")
          .order("created_at", { ascending: false });

        if (!error && perfData && perfData.length > 0) {
          setData(perfData);
        } else {
          // Fallback: Query athletes and their metrics safely
          try {
            const { data: athletes, error: athError } = await supabase
              .from("athletes")
              .select(`
                name,
                cmj(height, created_at),
                vo2max(vo2max, created_at),
                isometric_strength(half_squat_kgf, created_at)
              `);
            
            if (!athError && athletes && athletes.length > 0) {
              const derived: PerformanceItem[] = athletes.map((a: any) => ({
                id: Math.random().toString(),
                athlete_name: a.name,
                forca: a.isometric_strength?.[0]?.half_squat_kgf || 0,
                vo2: a.vo2max?.[0]?.vo2max || 0,
                cmj: a.cmj?.[0]?.height || 0,
                created_at: a.cmj?.[0]?.created_at || new Date().toISOString()
              }));
              setData(derived);
            }
          } catch (e) {
            // Ignore permission or connection errors
          }
        }
      } catch (err) {
        // Silently fall back
      }
      setLoading(false);
    }

    fetchData();
  }, []);

  return { data, loading };
}
