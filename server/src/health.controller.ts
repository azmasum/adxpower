import { Controller, Get } from '@nestjs/common';

@Controller()
export class HealthController {
  @Get('health')
  check() {
    return { status: 'ok', version: 'v2-debug', timestamp: new Date().toISOString() };
  }
}
