import { IsString, IsOptional, IsArray, IsObject } from 'class-validator';

export class CreateProfileDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  group?: string;

  @IsString()
  @IsOptional()
  proxy?: string;

  @IsString()
  @IsOptional()
  proxyId?: string; // ✅ FIXED: Auto-assign বা manual assign এর জন্য

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
}
