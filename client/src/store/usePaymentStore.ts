import { create } from 'zustand';
import { API_BASE_URL, getHardwareId } from '../config';

interface Plan {
  id: string;
  name: string;
  price: number;
  currency: string;
  maxProfiles: number;
  durationDays: number | null;
  features: string[];
}

interface Order {
  orderId: string;
  plan: Plan;
  amount: number;
  currency: string;
}

interface PaymentState {
  plans: Plan[];
  currentOrder: Order | null;
  selectedPlan: string;
  paymentMethod: string;
  isLoading: boolean;
  error: string | null;
  fetchPlans: () => Promise<void>;
  setSelectedPlan: (planId: string) => void;
  setPaymentMethod: (method: string) => void;
  createOrder: (email: string) => Promise<Order | null>;
  checkOrderStatus: (orderId: string) => Promise<any>;
}

const API = `${API_BASE_URL}/payment`;

export const usePaymentStore = create<PaymentState>((set, get) => ({
  plans: [],
  currentOrder: null,
  selectedPlan: 'professional',
  paymentMethod: 'paypal',
  isLoading: false,
  error: null,

  fetchPlans: async () => {
    try {
      const res = await fetch(`${API}/plans`);
      if (res.ok) {
        const plans = await res.json();
        set({ plans });
      }
    } catch (e: any) {
      set({ error: e.message });
    }
  },

  setSelectedPlan: (planId) => set({ selectedPlan: planId }),
  setPaymentMethod: (method) => set({ paymentMethod: method }),

  createOrder: async (email: string) => {
    const { selectedPlan, paymentMethod } = get();
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(`${API}/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, planId: selectedPlan, paymentMethod, userId: getHardwareId() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to create order');
      set({ currentOrder: data, isLoading: false });
      return data;
    } catch (e: any) {
      set({ error: e.message, isLoading: false });
      return null;
    }
  },

  checkOrderStatus: async (orderId: string) => {
    try {
      const res = await fetch(`${API}/order/${orderId}/status`, { method: 'POST' });
      return await res.json();
    } catch {
      return null;
    }
  },
}));
