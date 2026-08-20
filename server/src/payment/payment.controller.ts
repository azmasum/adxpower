import {
  Controller, Post, Get, Body, Param,
  HttpCode, HttpStatus, BadRequestException,
} from '@nestjs/common';
import { PaymentService } from './payment.service';
import { Logger } from '@nestjs/common';

@Controller('v1/payment')
export class PaymentController {
  private readonly logger = new Logger(PaymentController.name);
  constructor(private readonly paymentService: PaymentService) {}

  @Get('plans')
  getPlans() {
    return this.paymentService.getPlans();
  }

  @Get('demo-mode')
  getDemoMode() {
    return { demo: this.paymentService.isDemoMode() };
  }

  @Post('create-order')
  @HttpCode(HttpStatus.CREATED)
  async createOrder(@Body() body: { email: string; planId: string; paymentMethod: string; userId?: string }) {
    if (!body.email || !body.planId || !body.paymentMethod) {
      throw new BadRequestException('email, planId, paymentMethod are required');
    }
    const userId = body.userId || body.email.replace(/[^a-zA-Z0-9]/g, '_');
    return this.paymentService.createOrder(body.email, body.planId, body.paymentMethod, userId);
  }

  @Post('capture-paypal')
  @HttpCode(HttpStatus.OK)
  async capturePayPal(@Body() body: { orderId: string; paypalOrderId: string }) {
    if (!body.orderId || !body.paypalOrderId) {
      throw new BadRequestException('orderId and paypalOrderId are required');
    }
    return this.paymentService.capturePayPalOrder(body.orderId, body.paypalOrderId);
  }

  @Post('order/:orderId/status')
  async getOrderStatus(@Param('orderId') orderId: string) {
    return this.paymentService.getOrderStatus(orderId);
  }

  @Post('orders')
  async listOrders() {
    return this.paymentService.listOrders();
  }

  @Post('webhook/paypal')
  @HttpCode(HttpStatus.OK)
  async paypalWebhook(@Body() body: any) {
    this.logger.log(`PayPal webhook: ${body?.event_type}`);
    return this.paymentService.handlePaypalWebhook(body);
  }
}
