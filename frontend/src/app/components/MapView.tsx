import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Filter, Layers, Box, Map as MapIcon, Star } from 'lucide-react';
import { useApp } from '../App';
import { motion, AnimatePresence } from 'motion/react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

type MapLayer = 'heat' | 'guides' | 'travelers' | 'routes';
type RouteStatus = 'ongoing' | 'upcoming' | 'historical';
type LatLng = { lat: number; lng: number };

const CHINA_MAP_CENTER: [number, number] = [34.3416, 108.9398];

function createEmojiMarker(icon: string, bgClass: string, ringClass = 'border-white') {
  return L.divIcon({
    className: '',
    html: `<div class="w-10 h-10 rounded-full border-2 shadow-lg flex items-center justify-center text-white font-bold ${bgClass} ${ringClass}">${icon}</div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20],
  });
}

export function MapView() {
  const { role, data } = useApp();
  const [activeLayers, setActiveLayers] = useState<MapLayer[]>(['guides', 'routes']);
  const [showLayerMenu, setShowLayerMenu] = useState(false);
  const [is3DMode, setIs3DMode] = useState(false);
  const [tilt, setTilt] = useState(0);
  const mapElementRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const overlayGroupRef = useRef<L.LayerGroup | null>(null);

  const toggleLayer = (layer: MapLayer) => {
    setActiveLayers(prev =>
      prev.includes(layer)
        ? prev.filter(l => l !== layer)
        : [...prev, layer]
    );
  };

  const toggle3DMode = () => {
    setIs3DMode(!is3DMode);
    setTilt(is3DMode ? 0 : 45);
  };

  const followedUserIds = [1, 2]; // IDs of followed users
  const cityCoordinates: Record<string, { lat: number; lng: number }> = {
    上海: { lat: 31.2304, lng: 121.4737 },
    北京: { lat: 39.9042, lng: 116.4074 },
    杭州: { lat: 30.2741, lng: 120.1551 },
    苏州: { lat: 31.2989, lng: 120.5853 },
    南京: { lat: 32.0603, lng: 118.7969 },
    西安: { lat: 34.3416, lng: 108.9398 },
  };

  const guides = [
    { id: 1, name: '张伟', location: '上海', lat: 31.2304, lng: 121.4737, price: 1000, isFollowed: true, activeOrderRole: 'guide' as 'guide' | 'traveler' | null },
    { id: 2, name: '李娜', location: '北京', lat: 39.9042, lng: 116.4074, price: 1200, isFollowed: true, activeOrderRole: null },
    { id: 3, name: '王芳', location: '杭州', lat: 30.2741, lng: 120.1551, price: 800, isFollowed: false, activeOrderRole: null },
    { id: 4, name: '刘强', location: '苏州', lat: 31.2989, lng: 120.5853, price: 900, isFollowed: false, activeOrderRole: 'traveler' as 'guide' | 'traveler' | null },
  ];

  const travelers = [
    { id: 5, plan: '上海-北京-上海', location: '上海', lat: 31.23, lng: 121.47, activeOrderRole: 'guide' as 'guide' | 'traveler' | null },
    { id: 6, plan: '杭州-苏州', location: '杭州', lat: 30.27, lng: 120.16, activeOrderRole: 'traveler' as 'guide' | 'traveler' | null },
  ];

  // Travel routes for travelers
  const mockTravelRoutes = [
    {
      id: 1,
      name: '上海-北京环线',
      status: 'ongoing' as RouteStatus,
      points: [
        { lat: 31.2304, lng: 121.4737 },
        { lat: 39.9042, lng: 116.4074 },
        { lat: 31.2304, lng: 121.4737 },
      ],
      color: 'blue',
    },
    {
      id: 2,
      name: '江南水乡游',
      status: 'upcoming' as RouteStatus,
      points: [
        { lat: 30.2741, lng: 120.1551 },
        { lat: 31.2989, lng: 120.5853 },
      ],
      color: 'green',
    },
    {
      id: 3,
      name: '历史行程-西湖之旅',
      status: 'historical' as RouteStatus,
      points: [
        { lat: 31.2304, lng: 121.4737 },
        { lat: 30.2741, lng: 120.1551 },
      ],
      color: 'gray',
    },
  ];

  // Guide routes for guides
  const guideRoutes = [
    {
      id: 1,
      name: '服务中-王先生一家',
      status: 'ongoing' as RouteStatus,
      points: [
        { lat: 31.2304, lng: 121.4737 },
        { lat: 31.2989, lng: 120.5853 },
      ],
      color: 'blue',
      travelers: 4,
    },
    {
      id: 2,
      name: '待服务-李小姐',
      status: 'upcoming' as RouteStatus,
      points: [
        { lat: 31.2304, lng: 121.4737 },
        { lat: 30.2741, lng: 120.1551 },
      ],
      color: 'green',
      travelers: 2,
    },
    {
      id: 3,
      name: '已完成-张女士',
      status: 'historical' as RouteStatus,
      points: [
        { lat: 39.9042, lng: 116.4074 },
        { lat: 31.2304, lng: 121.4737 },
      ],
      color: 'gray',
      travelers: 1,
    },
  ];

  const apiTravelRoutes = (data?.travelPlans ?? []).map((plan, index) => {
    const name = plan.title?.trim() || `旅行计划 ${index + 1}`;
    const routeCities = name
      .split(/[→\-—>]/)
      .map(city => city.trim())
      .filter(Boolean);
    const points = routeCities
      .map(city => cityCoordinates[city])
      .filter((point): point is { lat: number; lng: number } => Boolean(point));
    const fallbackPoints = [
      cityCoordinates.上海,
      index % 2 === 0 ? cityCoordinates.北京 : cityCoordinates.杭州,
    ];
    const arrivalTime = new Date(plan.arrival_date).getTime();
    const status: RouteStatus =
      plan.status === 'completed'
        ? 'historical'
        : Number.isFinite(arrivalTime) && arrivalTime <= Date.now()
          ? 'ongoing'
          : 'upcoming';

    return {
      id: plan.id,
      name,
      status,
      points: points.length >= 2 ? points : fallbackPoints,
      color: status === 'ongoing' ? 'blue' : status === 'upcoming' ? 'green' : 'gray',
      travelers: plan.traveler_count,
    };
  });

  const currentRoutes = apiTravelRoutes.length > 0
    ? apiTravelRoutes
    : role === 'traveler'
      ? mockTravelRoutes
      : guideRoutes;

  const getRouteColor = (status: RouteStatus) => {
    switch (status) {
      case 'ongoing':
        return 'rgb(37, 99, 235)'; // blue-600
      case 'upcoming':
        return 'rgb(34, 197, 94)'; // green-600
      case 'historical':
        return 'rgb(156, 163, 175)'; // gray-400
    }
  };

  const getRouteStatusLabel = (status: RouteStatus) => {
    switch (status) {
      case 'ongoing':
        return role === 'traveler' ? '进行中' : '服务中';
      case 'upcoming':
        return role === 'traveler' ? '计划中' : '待服务';
      case 'historical':
        return '历史记录';
    }
  };

  useEffect(() => {
    if (!mapElementRef.current || mapRef.current) return;

    const map = L.map(mapElementRef.current, {
      center: CHINA_MAP_CENTER,
      zoom: 5,
      minZoom: 3,
      maxZoom: 18,
      zoomControl: false,
      scrollWheelZoom: true,
    });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    const overlayGroup = L.layerGroup().addTo(map);
    mapRef.current = map;
    overlayGroupRef.current = overlayGroup;

    requestAnimationFrame(() => map.invalidateSize());

    return () => {
      map.remove();
      mapRef.current = null;
      overlayGroupRef.current = null;
    };
  }, []);

  useEffect(() => {
    const overlayGroup = overlayGroupRef.current;
    const map = mapRef.current;
    if (!overlayGroup || !map) return;

    overlayGroup.clearLayers();

    if (activeLayers.includes('routes')) {
      currentRoutes.forEach(route => {
        const line = L.polyline(
          route.points.map((point: LatLng) => [point.lat, point.lng]),
          {
            color: getRouteColor(route.status),
            weight: route.status === 'ongoing' ? 4 : 3,
            opacity: route.status === 'historical' ? 0.45 : 0.85,
            dashArray: route.status === 'upcoming' ? '6 8' : undefined,
          }
        );
        line.bindPopup(`<strong>${route.name}</strong><br>${getRouteStatusLabel(route.status)}`);
        line.addTo(overlayGroup);
      });
    }

    if (activeLayers.includes('guides')) {
      guides.forEach(guide => {
        const displayIcon = guide.activeOrderRole === 'traveler' ? '😎' : '🧑‍✈️';
        const displayBg = guide.activeOrderRole === 'traveler' ? 'bg-green-600' : 'bg-blue-600';
        const ringClass = guide.isFollowed
          ? 'border-yellow-400 ring-2 ring-yellow-400'
          : guide.activeOrderRole
            ? 'border-orange-400 ring-2 ring-orange-400'
            : 'border-white';
        const marker = L.marker([guide.lat, guide.lng], {
          icon: createEmojiMarker(displayIcon, displayBg, ringClass),
        });
        marker.bindPopup(`
          <a href="/user/${guide.id}" style="font-weight:600;color:#1d4ed8">${guide.name}</a>
          <br>${guide.location}
          <br><strong style="color:#2563eb">¥${guide.price}/天</strong>
          ${guide.isFollowed ? '<br><span style="color:#ca8a04">已关注</span>' : ''}
        `);
        marker.addTo(overlayGroup);
      });
    }

    if (activeLayers.includes('travelers')) {
      travelers.forEach(traveler => {
        const marker = L.marker([traveler.lat, traveler.lng], {
          icon: createEmojiMarker('😎', 'bg-green-600', traveler.activeOrderRole ? 'border-orange-400 ring-2 ring-orange-400' : 'border-white'),
        });
        marker.bindPopup(`
          <a href="/user/${traveler.id}" style="font-weight:600;color:#15803d">${traveler.plan}</a>
          <br>${traveler.location}
        `);
        marker.addTo(overlayGroup);
      });
    }

    if (activeLayers.includes('heat')) {
      [
        { center: cityCoordinates.上海, radius: 42 },
        { center: cityCoordinates.北京, radius: 34 },
        { center: cityCoordinates.杭州, radius: 28 },
      ].forEach(item => {
        L.circleMarker([item.center.lat, item.center.lng], {
          radius: item.radius,
          color: '#f97316',
          fillColor: '#ef4444',
          fillOpacity: 0.18,
          opacity: 0.35,
        }).addTo(overlayGroup);
      });
    }

    requestAnimationFrame(() => map.invalidateSize());
  }, [activeLayers, role, data?.travelPlans, is3DMode]);

  return (
    <div className="relative h-[calc(100vh-7rem)]">
      {/* Map Container */}
      <motion.div
        className="absolute inset-0 bg-slate-100"
        animate={{
          rotateX: is3DMode ? tilt : 0,
        }}
        transition={{ duration: 0.6, type: 'spring' }}
        style={{
          perspective: '1000px',
          transformStyle: 'preserve-3d',
        }}
      >
        <div ref={mapElementRef} className="h-full w-full" />
      </motion.div>

      {/* 3D/2D Toggle */}
      <div className="absolute top-4 right-20 z-20">
        <motion.button
          onClick={toggle3DMode}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={`w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-colors ${
            is3DMode ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'
          }`}
        >
          {is3DMode ? <Box size={20} /> : <MapIcon size={20} />}
        </motion.button>
      </div>

      {/* Layer Control */}
      <div className="absolute top-4 right-4 z-20">
        <button
          onClick={() => setShowLayerMenu(!showLayerMenu)}
          className="w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50"
        >
          <Layers size={20} />
        </button>

        <AnimatePresence>
          {showLayerMenu && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className="absolute top-14 right-0 bg-white rounded-lg shadow-xl p-4 w-56"
            >
              <h3 className="font-medium mb-3 text-sm">地图图层</h3>
              {[
                { id: 'heat' as MapLayer, label: '旅游热度' },
                { id: 'guides' as MapLayer, label: '导游分布' },
                { id: 'travelers' as MapLayer, label: '旅行者分布' },
                { id: 'routes' as MapLayer, label: role === 'traveler' ? '旅行路线' : '导游路线' },
              ].map(layer => (
                <label key={layer.id} className="flex items-center mb-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                  <input
                    type="checkbox"
                    checked={activeLayers.includes(layer.id)}
                    onChange={() => toggleLayer(layer.id)}
                    className="mr-2 w-4 h-4"
                  />
                  <span className="text-sm">{layer.label}</span>
                </label>
              ))}

              {activeLayers.includes('routes') && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <h4 className="text-xs font-medium text-gray-500 mb-2">路线状态</h4>
                  {(['ongoing', 'upcoming', 'historical'] as RouteStatus[]).map(status => (
                    <div key={status} className="flex items-center gap-2 mb-2 text-xs">
                      <div
                        className="w-4 h-0.5"
                        style={{
                          backgroundColor: getRouteColor(status),
                          opacity: status === 'historical' ? 0.4 : 0.8,
                        }}
                      />
                      <span className="text-gray-600">{getRouteStatusLabel(status)}</span>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Filter Button */}
      <div className="absolute top-4 left-4 z-20">
        <button className="px-4 h-12 bg-white rounded-full shadow-lg flex items-center gap-2 hover:bg-gray-50">
          <Filter size={20} />
          <span className="text-sm font-medium">筛选</span>
        </button>
      </div>

      {/* Legend */}
      <motion.div
        className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-4 text-sm z-20"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.3 }}
      >
        <h3 className="font-medium mb-2">图例</h3>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-xs">🧑‍✈️</div>
            <span>导游身份</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-green-600 flex items-center justify-center text-xs">😎</div>
            <span>旅行者身份</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-blue-600 border-2 border-orange-400 ring-2 ring-orange-400 flex items-center justify-center text-xs relative">
              🧑‍✈️
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-orange-400 rounded-full border border-white flex items-center justify-center" style={{fontSize: '8px'}}>
                ⚡
              </div>
            </div>
            <span>订单进行中</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-blue-600 border-2 border-yellow-400 ring-2 ring-yellow-400 flex items-center justify-center text-xs relative">
              🧑‍✈️
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full border border-white flex items-center justify-center">
                <Star size={6} className="text-white fill-white" />
              </div>
            </div>
            <span>已关注</span>
          </div>
        </div>
      </motion.div>

      {/* Route Info Panel */}
      {activeLayers.includes('routes') && (
        <motion.div
          className="absolute bottom-4 right-4 bg-white rounded-lg shadow-lg p-4 max-w-xs z-20"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <h3 className="font-medium mb-3 text-sm">
            {role === 'traveler' ? '我的旅行路线' : '我的导游路线'}
          </h3>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {currentRoutes.map(route => (
              <div
                key={route.id}
                className="flex items-start gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
              >
                <div
                  className="w-3 h-3 rounded-full mt-0.5"
                  style={{ backgroundColor: getRouteColor(route.status) }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{route.name}</p>
                  <p className="text-xs text-gray-500">{getRouteStatusLabel(route.status)}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
