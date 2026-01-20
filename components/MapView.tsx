import React, { useEffect, useRef } from 'react';
import * as L from 'leaflet';
import { Client } from '../types';
import { STATUS_COLORS } from '../constants';

interface MapViewProps {
  clients: Client[];
  onSelectClient: (client: Client) => void;
}

const MapView: React.FC<MapViewProps> = ({ clients, onSelectClient }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);

  useEffect(() => {
    if (mapRef.current && !mapInstanceRef.current) {
      // Initialize map
      const map = L.map(mapRef.current).setView([20, 0], 2);
      
      // Use CartoDB Dark Matter tiles for a look that matches the app theme
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20
      }).addTo(map);

      mapInstanceRef.current = map;
    }

    // Update markers
    if (mapInstanceRef.current) {
      // Clear existing markers
      markersRef.current.forEach(marker => marker.remove());
      markersRef.current = [];

      clients.forEach(client => {
        if (client.lat && client.lng) {
          // Custom color marker based on status (simplified)
          const markerColor = STATUS_COLORS[client.status].includes('green') ? '#4ade80' : 
                              STATUS_COLORS[client.status].includes('orange') ? '#fb923c' :
                              STATUS_COLORS[client.status].includes('blue') ? '#60a5fa' : '#94a3b8';
          
          const icon = L.divIcon({
            className: 'custom-div-icon',
            html: `<div style="background-color: ${markerColor}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 8px ${markerColor};"></div>`,
            iconSize: [12, 12],
            iconAnchor: [6, 6]
          });

          const marker = L.marker([client.lat, client.lng], { icon })
            .addTo(mapInstanceRef.current!)
            .bindPopup(`
              <div style="font-family: sans-serif;">
                <strong style="font-size: 14px; color: #fff;">${client.name}</strong><br/>
                <span style="color: #cbd5e1; font-size: 12px;">${client.company}</span><br/>
                <span style="color: #94a3b8; font-size: 10px;">${client.role}</span>
              </div>
            `);
          
          marker.on('click', () => {
              // Optional: zoom to user or just open modal
              // onSelectClient(client); 
          });
          
          // Add custom logic to open modal on popup click if needed, 
          // but for now we rely on standard popups.
          
          markersRef.current.push(marker);
        }
      });
    }

    return () => {
      // Cleanup happens if component unmounts
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [clients]); 

  // Re-run mainly when clients change, but we actually do full tear down in this simple implementation
  // to ensure no map instance conflicts in React strict mode with simple refs.

  return (
    <div className="w-full h-full rounded-xl overflow-hidden border border-slate-700 relative">
      <div ref={mapRef} className="w-full h-full bg-slate-900" />
      <div className="absolute bottom-4 left-4 bg-slate-900/80 p-2 rounded text-xs text-slate-400 z-[1000] border border-slate-700">
         Showing {clients.filter(c => c.lat && c.lng).length} geolocated clients
      </div>
    </div>
  );
};

export default MapView;
