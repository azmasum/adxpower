import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { LicenseService } from '../license/license.service';
import axios from 'axios';

export interface PlanConfig {
  id: string;
  name: string;
  price: number;
  currency: string;
  maxProfiles: number;
  durationDays: number | null;
  features: string[];
}

export const PLANS: PlanConfig[] = [
  {
    id: 'starter', name: 'Starter', price: 500, currency: 'usd', maxProfiles: 10, durationDays: 30,
    features: ['10 Browser Profiles', 'Basic Proxy Support', 'Email Support'],
  },
  {
    id: 'professional', name: 'Professional', price: 2500, currency: 'usd', maxProfiles: 50, durationDays: 30,
    features: ['50 Browser Profiles', 'Advanced Proxy', 'RPA Automation', 'Priority Support'],
  },
  {
    id: 'agency', name: 'Agency', price: 9900, currency: 'usd', maxProfiles: 200, durationDays: 30,
    features: ['200 Browser Profiles', 'Team Collaboration', 'Full API Access', 'Dedicated Support'],
  },
  {
    id: 'onetime', name: 'One Time', price: 19900, currency: 'usd', maxProfiles: 200, durationDays: null,
    features: ['200 Browser Profiles', 'Team Collaboration', 'Full API Access', 'Lifetime Updates', 'Dedicated Support'],
  },
];

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);
  private paypalClientId: string = '';
  private paypalClientSecret: string = '';
  private paypalBaseUrl: string = '';

  constructor(
    private readonly prisma: PrismaService,
    private readonly licenseService: LicenseService,
  ) {
    this.initPayPal();
  }

  private initPayPal() {
    const clientId = process.env.PAYPAL_CLIENT_ID;
    const secret = process.env.PAYPAL_CLIENT_SECRET;
    const mode = process.env.PAYPAL_MODE || 'sandbox';
    this.paypalBaseUrl = mode === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';

    if (clientId && secret && !clientId.includes('xxxxxxxx')) {
      this.paypalClientId = clientId;
      this.paypalClientSecret = secret;
      this.logger.log(`PayPal REST API initialized (${mode})`);
    } else {
      this.logger.warn('PayPal: No valid credentials — running in DEMO mode');
    }
  }

  private async getPayPalAccessToken(): Promise<string> {
    const auth = Buffer.from(`${this.paypalClientId}:${this.paypalClientSecret}`).toString('base64');
    const res = await axios.post(`${this.paypalBaseUrl}/v1/oauth2/token`, 'grant_type=client_credentials', {
      headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    return res.data.access_token;
  }

  getPlans(): PlanConfig[] { return PLANS; }

  getPlan(planId: string): PlanConfig {
    const plan = PLANS.find(p => p.id === planId);
    if (!plan) throw new BadRequestException(`Plan "${planId}" not found`);
    return plan;
  }

  isDemoMode(): boolean { return !this.paypalClientId; }

  // ===================== ORDER CREATION =====================

  async createOrder(customerEmail: string, planId: string, paymentMethod: string, userId: string) {
    const plan = this.getPlan(planId);
    const order = await this.prisma.order.create({
      data: { userId, customerEmail, plan: plan.id, amount: plan.price, currency: plan.currency, paymentMethod, status: 'pending' },
    });
    this.logger.log(`Order created: ${order.id} | ${plan.name} | ${paymentMethod}`);

    if (paymentMethod === 'paypal') return this.createPayPalOrder(order.id, plan);
    throw new BadRequestException(`Unsupported payment method: ${paymentMethod}`);
  }

  // ===================== PAYPAL (REST API) =====================

  private async createPayPalOrder(orderId: string, plan: PlanConfig) {
    if (!this.paypalClientId) {
      return { orderId, plan, amount: plan.price, currency: plan.currency, demo: true, message: 'Add PAYPAL_CLIENT_ID to .env for real payments' };
    }

    try {
      const token = await this.getPayPalAccessToken();
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const res = await axios.post(`${this.paypalBaseUrl}/v2/checkout/orders`, {
        intent: 'CAPTURE',
        purchase_units: [{
          reference_id: orderId,
          amount: { currency_code: 'USD', value: (plan.price / 100).toFixed(2) },
          description: `AdxPower ${plan.name}`,
        }],
        application_context: {
          brand_name: 'AdxPower',
          landing_page: 'BILLING',
          user_action: 'PAY_NOW',
          return_url: `${frontendUrl}/payment-success?provider=paypal&orderId=${orderId}`,
          cancel_url: `${frontendUrl}/payment-cancel`,
        },
      }, { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } });

      const paypalOrder = res.data;
      this.logger.log(`PayPal order created: ${paypalOrder.id} → ${orderId}`);
      await this.prisma.order.update({ where: { id: orderId }, data: { metadata: { paypalOrderId: paypalOrder.id } } });

      const approveUrl = paypalOrder.links?.find((l: any) => l.rel === 'approve')?.href;
      return { orderId, paypalOrderId: paypalOrder.id, approveUrl, plan: { name: plan.name, price: plan.price } };
    } catch (err: any) {
      this.logger.error(`PayPal create order failed: ${err.message}`);
      throw new BadRequestException(`PayPal error: ${err.response?.data?.message || err.message}`);
    }
  }

  async capturePayPalOrder(orderId: string, paypalOrderId: string) {
    if (!this.paypalClientId) {
      return this.completePayment(orderId, paypalOrderId, { paypalCaptureId: paypalOrderId });
    }

    try {
      const token = await this.getPayPalAccessToken();
      const res = await axios.post(`${this.paypalBaseUrl}/v2/checkout/orders/${paypalOrderId}/capture`, {}, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      const capture = res.data;

      if (capture.status === 'COMPLETED') {
        const captureId = capture.purchase_units?.[0]?.payments?.captures?.[0]?.id;
        return this.completePayment(orderId, captureId || paypalOrderId, { paypalCaptureId: captureId });
      }
      return { success: false, status: capture.status };
    } catch (err: any) {
      this.logger.error(`PayPal capture failed: ${err.message}`);
      throw new BadRequestException(`PayPal capture error: ${err.response?.data?.message || err.message}`);
    }
  }

  async handlePaypalWebhook(body: any) {
    this.logger.log(`PayPal webhook: ${body?.event_type}`);
    switch (body?.event_type) {
      case 'PAYMENT.CAPTURE.COMPLETED': {
        const resource = body.resource;
        const orderId = resource?.custom_id;
        if (orderId) return this.completePayment(orderId, resource.id, { paypalCaptureId: resource.id });
        break;
      }
      default:
        this.logger.log(`Unhandled PayPal event: ${body?.event_type}`);
    }
    return { received: true };
  }

  // ===================== COMMON =====================

  async completePayment(orderId: string, paymentId: string, metadata?: any) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new BadRequestException('Order not found');
    if (order.status === 'completed') return { alreadyCompleted: true };

    const plan = this.getPlan(order.plan);
    const licenseKey = this.generateLicenseKey();
    const expiresAt = plan.durationDays ? new Date(Date.now() + plan.durationDays * 24 * 60 * 60 * 1000) : null;

    await this.prisma.order.update({ where: { id: orderId }, data: { status: 'completed', paymentId, licenseKey, metadata: metadata || {} } });

    let userId = order.userId;
    if (!userId) {
      const user = await this.prisma.user.upsert({ where: { email: order.customerEmail }, update: {}, create: { email: order.customerEmail, password: 'social-auth' } });
      userId = user.id;
    }

    await this.licenseService.createLicense({ userId, licenseKey, maxProfiles: plan.maxProfiles, expiresAt, plan: plan.id });
    this.logger.log(`Payment completed: Order ${orderId} → License ${licenseKey}`);
    return { success: true, licenseKey, plan: plan.name, maxProfiles: plan.maxProfiles, expiresAt };
  }

  async getOrderStatus(orderId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new BadRequestException('Order not found');
    return { orderId: order.id, status: order.status, plan: order.plan, licenseKey: order.licenseKey, paymentMethod: order.paymentMethod, createdAt: order.createdAt };
  }

  async listOrders() { return this.prisma.order.findMany({ orderBy: { createdAt: 'desc' }, take: 100 }); }

  private generateLicenseKey(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    return [4, 4, 4, 4].map(len => Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('')).join('-');
  }
}
