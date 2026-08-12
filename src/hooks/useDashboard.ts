
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
      // Since 'performance' table might not exist, we try to derive it from assessments
      // but for the sake of the user's request, we'll try to query the table they specified.
      // If it fails, we fall back to a mock or derived data.
      
      const { data: perfData, error } = await supabase
        .from("performance")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && perfData) {
        setData(perfData);
      } else {
        console.warn("Table 'performance' not found or empty. Using derived data from assessments.");
        // Fallback: Query athletes and their metrics
        const { data: athletes } = await supabase
          .from("athletes")
          .select(`
            name,
            cmj(height, created_at),
            vo2max(vo2max, created_at),
            isometric_strength(half_squat_kgf, created_at)
          `);
        
        if (athletes) {
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
      }
      setLoading(false);
    }

    fetchData();
  }, []);

  return { data, loading };
}
