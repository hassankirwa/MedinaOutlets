export type OutletType = "Pharmacy" | "Clinic / Dispensary" | "Agrovet" | "Shop" | "Hospital";

export type OutletPoint = {
  id: string;
  name: string;
  type: OutletType;
  owner: string;
  phone: string;
  location: string;
  fieldWorker: string;
  accountStatus: "Registered" | "Unregistered";
  servicedByMedilab: "Yes" | "No";
  submittedAt: string;
  lat: number;
  lng: number;
  /** API review status: pending | approved | rejected */
  status?: string;
};

export const TYPE_COLORS: Record<OutletType, string> = {
  Pharmacy: "#3b82f6",
  "Clinic / Dispensary": "#8b5cf6",
  Agrovet: "#f59e0b",
  Shop: "#22c55e",
  Hospital: "#ef4444",
};

export const OUTLETS: OutletPoint[] = [
  {
    id: "o1",
    name: "Goodwill Chemist",
    type: "Pharmacy",
    owner: "John Godwin",
    phone: "0722 123 456",
    location: "Mogondo Center (Dikiri), Mogondo highway, Nairobi",
    fieldWorker: "Lorna Cheruto",
    accountStatus: "Registered",
    servicedByMedilab: "Yes",
    submittedAt: "May 31, 2026 11:32 AM",
    lat: -1.2864,
    lng: 36.8172,
  },
  {
    id: "o2",
    name: "Jomo Pharmacy",
    type: "Pharmacy",
    owner: "Jomo Kangeri",
    phone: "0722 987 654",
    location: "Kangemi, Nairobi",
    fieldWorker: "Allan Korir",
    accountStatus: "Registered",
    servicedByMedilab: "Yes",
    submittedAt: "May 31, 2026 10:15 AM",
    lat: -1.2724,
    lng: 36.7502,
  },
  {
    id: "o3",
    name: "Sunrise Dispensary",
    type: "Clinic / Dispensary",
    owner: "Mary Wanjiku",
    phone: "0711 456 789",
    location: "Kawangware, Nairobi",
    fieldWorker: "Mary Wanjiku",
    accountStatus: "Registered",
    servicedByMedilab: "No",
    submittedAt: "May 31, 2026 09:48 AM",
    lat: -1.2834,
    lng: 36.7442,
  },
  {
    id: "o4",
    name: "Care Clinic",
    type: "Clinic / Dispensary",
    owner: "Peter Kimani",
    phone: "0700 331 454",
    location: "Westlands, Nairobi",
    fieldWorker: "Peter Kimani",
    accountStatus: "Unregistered",
    servicedByMedilab: "No",
    submittedAt: "May 31, 2026 09:20 AM",
    lat: -1.2631,
    lng: 36.8056,
  },
  {
    id: "o5",
    name: "Agrovet Center",
    type: "Agrovet",
    owner: "John Mwangi",
    phone: "0721 654 321",
    location: "Githurai, Nairobi",
    fieldWorker: "John Mwangi",
    accountStatus: "Registered",
    servicedByMedilab: "Yes",
    submittedAt: "May 31, 2026 08:55 AM",
    lat: -1.2205,
    lng: 36.8898,
  },
  {
    id: "o6",
    name: "Medicare Hospital",
    type: "Hospital",
    owner: "Grace Oteno",
    phone: "0725 654 321",
    location: "Pipeline, Nairobi",
    fieldWorker: "Grace Oteno",
    accountStatus: "Registered",
    servicedByMedilab: "Yes",
    submittedAt: "May 31, 2026 08:30 AM",
    lat: -1.3078,
    lng: 36.8912,
  },
  {
    id: "o7",
    name: "City Shop",
    type: "Shop",
    owner: "Samuel Kiptoo",
    phone: "0702 222 333",
    location: "Zimmerman, Nairobi",
    fieldWorker: "Samuel Kiptoo",
    accountStatus: "Unregistered",
    servicedByMedilab: "No",
    submittedAt: "May 31, 2026 07:45 AM",
    lat: -1.2158,
    lng: 36.8748,
  },
  {
    id: "o8",
    name: "Faith Hospital",
    type: "Hospital",
    owner: "Esther Njeri",
    phone: "0725 644 555",
    location: "Kibera, Nairobi",
    fieldWorker: "Esther Njeri",
    accountStatus: "Registered",
    servicedByMedilab: "Yes",
    submittedAt: "May 31, 2026 07:10 AM",
    lat: -1.3133,
    lng: 36.7819,
  },
];
