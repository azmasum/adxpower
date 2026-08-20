import { IsString, IsOptional, IsArray, IsObject } from 'class-validator';

export class UpdateProfileDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  group?: string;

  @IsString()
  @IsOptional()
  proxy?: string; // Legacy: e.g., "socks5://ip:port" or "Direct (No Proxy)"

  @IsString()
  @IsOptional()
  proxyId?: string; // ✅ FIXED: এখন আসল Proxy ID - ProxiesService এর সাথে কানেকশন

  @IsString()
  @IsOptional()
  os?: string;

  @IsString()
  @IsOptional()
  browser?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @IsObject()
  @IsOptional()
  fingerprint?: Record<string, any>;

  @IsString()
  @IsOptional()
  proxyStatus?: string; // ✅ NEW: active / dead / none
}
