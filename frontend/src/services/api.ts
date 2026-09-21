import axios from 'axios';
import {
  User, Hospital, HospitalResource, PHCCenter, Referral,
  HospitalCandidate, Ambulance, RerouteEvaluationResult
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8001/api/v1';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('ruralcare_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authApi = {
  login: async (username: string, password: string) => {
    const res = await api.post('/auth/login', { username, password });
    return res.data;
  }
};

export const phcApi = {
  getCenters: async (): Promise<PHCCenter[]> => {
    const res = await api.get('/phc/centers');
    return res.data;
  },
  getCenter: async (id: string): Promise<PHCCenter> => {
    const res = await api.get(`/phc/centers/${id}`);
    return res.data;
  }
};

export const hospitalApi = {
  getHospitals: async (): Promise<Hospital[]> => {
    const res = await api.get('/hospitals');
    return res.data;
  },
  getHospital: async (id: string): Promise<Hospital> => {
    const res = await api.get(`/hospitals/${id}`);
    return res.data;
  },
  getResources: async (id: string): Promise<HospitalResource> => {
    const res = await api.get(`/hospitals/${id}/resources`);
    return res.data;
  },
  updateResources: async (id: string, updateData: Partial<HospitalResource>): Promise<HospitalResource> => {
    const res = await api.put(`/hospitals/${id}/resources`, updateData);
    return res.data;
  }
};

export const referralApi = {
  createReferral: async (data: any): Promise<Referral> => {
    const res = await api.post('/referrals', data);
    return res.data;
  },
  getReferral: async (id: string): Promise<Referral> => {
    const res = await api.get(`/referrals/${id}`);
    return res.data;
  },
  getRecommendations: async (id: string): Promise<HospitalCandidate[]> => {
    const res = await api.post(`/referrals/${id}/recommendations`);
    return res.data;
  },
  acceptHospital: async (referralId: string, hospitalId: string) => {
    const res = await api.post(`/referrals/${referralId}/accept?hospital_id=${hospitalId}`);
    return res.data;
  },
  completeReferral: async (referralId: string) => {
    const res = await api.post(`/referrals/${referralId}/complete`);
    return res.data;
  },
  getIncomingForHospital: async (hospitalId: string): Promise<Referral[]> => {
    const res = await api.get(`/referrals/hospital/${hospitalId}/incoming`);
    return res.data;
  }
};

export const ambulanceApi = {
  getAmbulances: async (): Promise<Ambulance[]> => {
    const res = await api.get('/ambulances');
    return res.data;
  },
  getAmbulance: async (id: string): Promise<Ambulance> => {
    const res = await api.get(`/ambulances/${id}`);
    return res.data;
  },
  updateLocation: async (id: string, lat: number, lon: number, speed = 0, heading = 0) => {
    const res = await api.post(`/ambulances/${id}/location`, {
      latitude: lat,
      longitude: lon,
      speed,
      heading
    });
    return res.data;
  }
};

export const reroutingApi = {
  evaluate: async (referralId: string, lat?: number, lon?: number): Promise<RerouteEvaluationResult> => {
    const res = await api.post('/rerouting/evaluate', {
      referral_id: referralId,
      current_latitude: lat,
      current_longitude: lon
    });
    return res.data;
  },
  accept: async (referralId: string, targetHospitalId: string) => {
    const res = await api.post(`/rerouting/${referralId}/accept?target_hospital_id=${targetHospitalId}`);
    return res.data;
  }
};

export const commandCenterApi = {
  getOverview: async () => {
    const res = await api.get('/command-center/overview');
    return res.data;
  }
};

export const demoApi = {
  triggerIcuDepletion: async (hospitalId: string) => {
    const res = await api.post(`/demo/trigger-icu-depletion/${hospitalId}`);
    return res.data;
  },
  restoreResources: async (hospitalId: string) => {
    const res = await api.post(`/demo/trigger-resource-restore/${hospitalId}`);
    return res.data;
  },
  triggerRerouteEval: async (referralId: string) => {
    const res = await api.post(`/demo/trigger-reroute-evaluation/${referralId}`);
    return res.data;
  }
};
