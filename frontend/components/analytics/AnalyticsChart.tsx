"use client"; // This component uses client-side hooks for charts

import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface ChartDataPoint {
  date: string; // Expects "YYYY-MM-DD" or "MM-DD"
  [key: string]: any; // For dynamic data keys like 'gamesStarted', 'uniquePlayers'
}

interface AnalyticsChartProps {
  data: ChartDataPoint[];
  dataKey: string; // e.g., "gamesStarted"
  xAxisDataKey: string; // e.g., "date"
  strokeColor?: string;
  title?: string;
}

const AnalyticsChart: React.FC<AnalyticsChartProps> = ({ data, dataKey, xAxisDataKey, strokeColor = "#8884d8", title }) => {
  if (!data || data.length === 0) {
    return <div className="p-4 text-center text-muted-foreground">No data available for chart.</div>;
  }

  // Format date for display on X-axis (e.g., from "YYYY-MM-DD" to "MM-DD")
  const formattedData = data.map(item => ({
    ...item,
    [xAxisDataKey]: item[xAxisDataKey].slice(5) // Assuming YYYY-MM-DD
  }));


  return (
    <div className="bg-card text-card-foreground p-6 rounded-lg shadow-lg">
      {title && <h3 className="text-lg font-semibold mb-4">{title}</h3>}
      <ResponsiveContainer width="100%" height={300}>
        <LineChart
          data={formattedData}
          margin={{
            top: 5,
            right: 30,
            left: 0, // Adjusted for better label visibility
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey={xAxisDataKey} stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 12 }} />
          <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 12 }} allowDecimals={false}/>
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--popover))',
              borderColor: 'hsl(var(--border))',
              borderRadius: 'var(--radius)',
            }}
            labelStyle={{ color: 'hsl(var(--popover-foreground))' }}
          />
          <Legend wrapperStyle={{ fontSize: 14 }} />
          <Line type="monotone" dataKey={dataKey} stroke={strokeColor} strokeWidth={2} activeDot={{ r: 6 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default AnalyticsChart;