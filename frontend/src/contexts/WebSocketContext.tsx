import React, { createContext, useContext, useEffect, useState } from 'react';
import { WebSocketClient } from '../services/websocket';
import { useAuth } from './AuthContext';

interface WebSocketContextType {
  lastEvent: any;
  eventsLog: any[];
  clearEvents: () => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [lastEvent, setLastEvent] = useState<any>(null);
  const [eventsLog, setEventsLog] = useState<any[]>([]);

  useEffect(() => {
    let endpoint = '/ws/command-center';

    if (user?.role === 'HOSPITAL_STAFF' && user.associated_entity_id) {
      endpoint = `/ws/hospital/${user.associated_entity_id}`;
    } else if (user?.role === 'AMBULANCE_OPERATOR' && user.associated_entity_id) {
      endpoint = `/ws/ambulance/${user.associated_entity_id}`;
    }

    const client = new WebSocketClient(endpoint, (event) => {
      console.log('[Global WebSocket Event Received]:', event);
      setLastEvent(event);
      setEventsLog((prev) => [event, ...prev.slice(0, 49)]);
    });

    client.connect();

    return () => {
      client.close();
    };
  }, [user]);

  const clearEvents = () => setEventsLog([]);

  return (
    <WebSocketContext.Provider value={{ lastEvent, eventsLog, clearEvents }}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocketContext = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocketContext must be used within a WebSocketProvider');
  }
  return context;
};
