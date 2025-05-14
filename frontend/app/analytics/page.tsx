"use client"; // This page uses client-side hooks for data fetching and state

import React, { useState, useEffect, useCallback } from 'react';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import StatCard from '@/components/analytics/StatCard';
import AnalyticsChart from '@/components/analytics/AnalyticsChart';
import RawEventsTable from '@/components/analytics/RawEvent';
import { BarChart2, Users, Gamepad2, MessageSquare, CheckCircle, TrendingUp, AlertTriangle, CalendarDays, Filter, RefreshCw } from 'lucide-react';

// Define types for our data
interface DailyStats {
  date: string;
  gamesStarted: number;
  gamesFinished: number;
  roundsPlayed: number;
  totalPlayersJoinedRooms: number;
  uniquePlayersActive: string[]; // Array of userIds
  totalScorePointsAwarded: number;
  totalGuessesMade: number;
  totalCorrectGuesses: number;
  chatMessagesSent: number;
  // Add any other fields from your DailyGameStatsModel
}

interface RawEvent {
  _id: string;
  eventName: string;
  payload: any;
  eventTimestamp: string;
  receivedAt: string;
  routingKey?: string;
  roomId?: string;
  userId?: string;
}

interface RawEventsResponse {
    data: RawEvent[];
    page: number;
    limit: number;
    totalPages: number;
    totalEvents: number;
}

``
const API_BASE_URL = process.env.NEXT_PUBLIC_ANALYTIC_URL;

export default function DashboardPage() {
  // State for selected dates
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [rangeStartDate, setRangeStartDate] = useState<string>(format(subDays(new Date(), 6), 'yyyy-MM-dd')); // Default to last 7 days
  const [rangeEndDate, setRangeEndDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));

  // State for fetched data
  const [dailyStats, setDailyStats] = useState<DailyStats | null>(null);
  const [rangeStats, setRangeStats] = useState<DailyStats[]>([]);
  const [rawEvents, setRawEvents] = useState<RawEvent[]>([]);
  
  // State for raw events filters
  const [rawEventsLimit, setRawEventsLimit] = useState<number>(10);
  const [rawEventsPage, setRawEventsPage] = useState<number>(1);
  const [rawEventsTotalPages, setRawEventsTotalPages] = useState<number>(1);


  // Loading and error states
  const [dailyLoading, setDailyLoading] = useState<boolean>(false);
  const [rangeLoading, setRangeLoading] = useState<boolean>(false);
  const [rawEventsLoading, setRawEventsLoading] = useState<boolean>(false);
  const [dailyError, setDailyError] = useState<string | null>(null);
  const [rangeError, setRangeError] = useState<string | null>(null);
  const [rawEventsError, setRawEventsError] = useState<string | null>(null);

  // Fetch daily stats
  const fetchDailyStats = useCallback(async (date: string) => {
    if (!date) return;
    setDailyLoading(true);
    setDailyError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/stats/daily/${date}`);
      if (!response.ok) {
        if (response.status === 404) {
          setDailyStats(null); // No data for this date
          throw new Error(`No stats found for ${date}.`);
        }
        throw new Error(`Failed to fetch daily stats: ${response.statusText}`);
      }
      const data: DailyStats = await response.json();
      setDailyStats(data);
    } catch (error: any) {
      console.error("Daily stats fetch error:", error);
      setDailyError(error.message);
      setDailyStats(null);
    } finally {
      setDailyLoading(false);
    }
  }, []);

  // Fetch stats for a date range (for chart)
  const fetchRangeStats = useCallback(async (start: string, end: string) => {
    if (!start || !end) return;
    setRangeLoading(true);
    setRangeError(null);
      try {
      const response = await fetch(`${API_BASE_URL}/stats/range?startDate=${start}&endDate=${end}`);
      if (!response.ok) {
        if (response.status === 404) {
          setRangeStats([]);
          throw new Error(`No stats found for range ${start} to ${end}.`);
        }
        throw new Error(`Failed to fetch range stats: ${response.statusText}`);
      }
      const data: DailyStats[] = await response.json();
      setRangeStats(data);
    } catch (error: any) {
      console.error("Range stats fetch error:", error);
      setRangeError(error.message);
      setRangeStats([]);
    } finally {
      setRangeLoading(false);
    }
  }, []);

  // Fetch raw events
  const fetchRawEvents = useCallback(async (limit: number, page: number) => {
    setRawEventsLoading(true);
    setRawEventsError(null);
    try {
        const response = await fetch(`${API_BASE_URL}/raw-events?limit=${limit}&page=${page}`);
        console.log("Raw events response:", response);
      if (!response.ok) {``
        throw new Error(`Failed to fetch raw events: ${response.statusText}`);
      }
      const data: RawEventsResponse = await response.json();
      setRawEvents(data.data || []);
      setRawEventsTotalPages(data.totalPages || 1);
      setRawEventsPage(data.page || 1);
    } catch (error: any) {
      console.error("Raw events fetch error:", error);
      setRawEventsError(error.message);
      setRawEvents([]);
    } finally {
      setRawEventsLoading(false);
    }
  }, []);
  
  // Initial data fetch and refetch on date changes
  useEffect(() => {
    fetchDailyStats(selectedDate);
  }, [selectedDate, fetchDailyStats]);

  useEffect(() => {
    fetchRangeStats(rangeStartDate, rangeEndDate);
  }, [rangeStartDate, rangeEndDate, fetchRangeStats]);

  useEffect(() => {
    fetchRawEvents(rawEventsLimit, rawEventsPage);
  }, [rawEventsLimit, rawEventsPage, fetchRawEvents]);

  const handleDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(event.target.value);
  };

  const handleRangeStartDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRangeStartDate(event.target.value);
  };
  const handleRangeEndDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRangeEndDate(event.target.value);
  };
  
  const handleRefreshAll = () => {
    fetchDailyStats(selectedDate);
    fetchRangeStats(rangeStartDate, rangeEndDate);
    fetchRawEvents(rawEventsLimit, rawEventsPage);
  };

  const quickSetDateRange = (days: number) => {
    const today = new Date();
    setRangeEndDate(format(today, 'yyyy-MM-dd'));
    setRangeStartDate(format(subDays(today, days -1), 'yyyy-MM-dd'));
  };

  const quickSetThisMonth = () => {
    const today = new Date();
    setRangeStartDate(format(startOfMonth(today), 'yyyy-MM-dd'));
    setRangeEndDate(format(endOfMonth(today), 'yyyy-MM-dd'));
  };


  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-8">
      <header className="mb-8">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-primary mb-4 sm:mb-0">Game Analytics Dashboard</h1>
            <button
                onClick={handleRefreshAll}
                className="flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors text-sm"
                title="Refresh all data"
            >
                <RefreshCw size={16} className="mr-2" /> Refresh Data
            </button>
        </div>

        {/* Date Selectors */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 p-6 bg-card rounded-lg shadow">
          <div>
            <label htmlFor="daily-date-picker" className="block text-sm font-medium text-muted-foreground mb-1">
              <CalendarDays size={16} className="inline mr-1" /> Select Date for Daily Stats:
            </label>
            <input
              type="date"
              id="daily-date-picker"
              value={selectedDate}
              onChange={handleDateChange}
              className="w-full p-2 border border-input rounded-md bg-background focus:ring-2 focus:ring-primary outline-none"
            />
          </div>
          <div>
            <p className="block text-sm font-medium text-muted-foreground mb-1">
              <Filter size={16} className="inline mr-1" /> Select Date Range for Chart:
            </p>
            <div className="flex flex-col sm:flex-row gap-2 items-center">
              <input
                type="date"
                id="range-start-date"
                value={rangeStartDate}
                onChange={handleRangeStartDateChange}
                className="w-full sm:w-auto flex-grow p-2 border border-input rounded-md bg-background focus:ring-2 focus:ring-primary outline-none"
              />
              <span className="text-muted-foreground hidden sm:inline">-</span>
              <input
                type="date"
                id="range-end-date"
                value={rangeEndDate}
                onChange={handleRangeEndDateChange}
                className="w-full sm:w-auto flex-grow p-2 border border-input rounded-md bg-background focus:ring-2 focus:ring-primary outline-none"
              />
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
                <button onClick={() => quickSetDateRange(7)} className="text-xs px-2 py-1 bg-secondary text-secondary-foreground rounded hover:bg-secondary/80">Last 7 Days</button>
                <button onClick={() => quickSetDateRange(30)} className="text-xs px-2 py-1 bg-secondary text-secondary-foreground rounded hover:bg-secondary/80">Last 30 Days</button>
                <button onClick={quickSetThisMonth} className="text-xs px-2 py-1 bg-secondary text-secondary-foreground rounded hover:bg-secondary/80">This Month</button>
            </div>
          </div>
        </div>
      </header>

      {/* Daily Stats Section */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4 flex items-center">
          <BarChart2 size={24} className="mr-2 text-primary" /> Daily Stats for {selectedDate}
        </h2>
        {dailyLoading && <p className="text-center text-muted-foreground p-4">Loading daily stats...</p>}
        {dailyError && !dailyLoading && (
          <div className="p-4 bg-destructive/10 text-destructive rounded-md flex items-center">
            <AlertTriangle size={20} className="mr-2"/> {dailyError}
          </div>
        )}
        {!dailyLoading && !dailyError && dailyStats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <StatCard title="Games Started" value={dailyStats.gamesStarted} icon={<Gamepad2 size={20}/>} />
            <StatCard title="Games Finished" value={dailyStats.gamesFinished} icon={<CheckCircle size={20}/>} />
            <StatCard title="Rounds Played" value={dailyStats.roundsPlayed} icon={<TrendingUp size={20}/>} />
            <StatCard title="Unique Players Active" value={dailyStats.uniquePlayersActive?.length || 0} icon={<Users size={20}/>} />
            <StatCard title="Total Player Joins" value={dailyStats.totalPlayersJoinedRooms} icon={<Users size={20}/>} />
            <StatCard title="Total Guesses" value={dailyStats.totalGuessesMade} />
            <StatCard title="Correct Guesses" value={dailyStats.totalCorrectGuesses} />
            <StatCard title="Chat Messages" value={dailyStats.chatMessagesSent} icon={<MessageSquare size={20}/>} />
          </div>
        )}
        {!dailyLoading && !dailyError && !dailyStats && (
            <p className="text-center text-muted-foreground p-4">No daily statistics available for {selectedDate}.</p>
        )}
      </section>

      {/* Chart Section */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4 flex items-center">
            <TrendingUp size={24} className="mr-2 text-primary" /> Trends ({rangeStartDate} to {rangeEndDate})
        </h2>
        {rangeLoading && <p className="text-center text-muted-foreground p-4">Loading chart data...</p>}
        {rangeError && !rangeLoading && (
            <div className="p-4 bg-destructive/10 text-destructive rounded-md flex items-center">
                <AlertTriangle size={20} className="mr-2"/> {rangeError}
            </div>
        )}
        {!rangeLoading && !rangeError && (
            <AnalyticsChart
                data={rangeStats}
                dataKey="gamesStarted" // You can make this selectable
                xAxisDataKey="date"
                title="Games Started Over Time"
                strokeColor="#2563eb" // Tailwind blue-600
            />
        )}
         {!rangeLoading && !rangeError && rangeStats.length === 0 && (
             <p className="text-center text-muted-foreground p-4">No data available for the selected range to display chart.</p>
         )}
      </section>

      {/* Raw Events Section */}
      <section>
        <RawEventsTable events={rawEvents} isLoading={rawEventsLoading} error={rawEventsError} />
        {!rawEventsLoading && !rawEventsError && rawEvents.length > 0 && (
          <div className="mt-4 flex justify-between items-center">
            <button
              onClick={() => setRawEventsPage(p => Math.max(1, p - 1))}
              disabled={rawEventsPage <= 1}
              className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 disabled:opacity-50 text-sm"
            >
              Previous
            </button>
            <span className="text-sm text-muted-foreground">Page {rawEventsPage} of {rawEventsTotalPages}</span>
            <button
              onClick={() => setRawEventsPage(p => Math.min(rawEventsTotalPages, p + 1))}
              disabled={rawEventsPage >= rawEventsTotalPages}
              className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 disabled:opacity-50 text-sm"
            >
              Next
            </button>
          </div>
        )}
      </section>

      <footer className="mt-12 pt-8 border-t border-border text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} Your Game Studio Analytics. All rights reserved.</p>
      </footer>
    </div>
  );
}
