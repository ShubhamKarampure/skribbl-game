import React from 'react';
import { format } from 'date-fns';
import { List, FileText, User, Users, CalendarDays } from 'lucide-react';

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

interface RawEventsTableProps {
  events: RawEvent[];
  isLoading: boolean;
  error?: string | null;
}

const RawEventsTable: React.FC<RawEventsTableProps> = ({ events, isLoading, error }) => {
  if (isLoading) {
    return <div className="p-4 text-center text-muted-foreground">Loading raw events...</div>;
  }

  if (error) {
    return <div className="p-4 text-center text-red-500">Error loading raw events: {error}</div>;
  }

  if (!events || events.length === 0) {
    return <div className="p-4 text-center text-muted-foreground">No raw events to display for the selected criteria.</div>;
  }

  return (
    <div className="bg-card text-card-foreground p-6 rounded-lg shadow-lg">
      <h3 className="text-xl font-semibold mb-4 flex items-center">
        <List className="mr-2 h-6 w-6 text-primary" />
        Recent Raw Events
      </h3>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-border">
          <thead className="bg-muted/50">
            <tr>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Event Name</th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Timestamp</th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Room ID</th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">User ID</th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Payload</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {events.map((event) => (
              <tr key={event._id} className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">{event.eventName}</td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-muted-foreground">
                  {format(new Date(event.eventTimestamp), "MMM d, yyyy, HH:mm:ss")}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-muted-foreground">{event.roomId || 'N/A'}</td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-muted-foreground">{event.userId || 'N/A'}</td>
                <td className="px-4 py-3 text-sm text-muted-foreground">
                  <details className="cursor-pointer">
                    <summary className="text-xs hover:text-primary">View Payload</summary>
                    <pre className="mt-1 text-xs bg-muted/50 p-2 rounded overflow-auto max-h-32">
                      {JSON.stringify(event.payload, null, 2)}
                    </pre>
                  </details>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RawEventsTable;