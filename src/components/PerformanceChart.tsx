import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from "recharts";

interface PerformanceChartProps {
  data: any[];
}

export default function PerformanceChart({ data }: PerformanceChartProps) {
  // Sort data by date ascending for the chart
  const sortedData = [...data].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  return (
    <div className="w-full h-[300px] bg-slate-900/50 p-4 rounded-[2rem] border border-slate-800 backdrop-blur-xl mb-12">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={sortedData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
          <XAxis 
            dataKey="created_at" 
            stroke="#64748b" 
            fontSize={10}
            tickFormatter={(str) => new Date(str).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
            axisLine={false}
            tickLine={false}
          />
          <YAxis 
            stroke="#64748b" 
            fontSize={10} 
            axisLine={false}
            tickLine={false}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#0f172a', 
              border: '1px solid #1e293b', 
              borderRadius: '1rem',
              fontSize: '12px'
            }}
            itemStyle={{ color: '#00ff88' }}
            formatter={(value: any) => [`${value} kgf`, 'Força']}
          />
          <Line 
            type="monotone" 
            dataKey="forca" 
            stroke="#00ff88" 
            strokeWidth={3} 
            dot={{ fill: '#00ff88', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, stroke: '#00ff88', strokeWidth: 2, fill: '#0f172a' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
