import { IsString, IsInt, IsOptional, IsIn, IsNotEmpty, Min, Max } from 'class-validator';

export class CreateProxyDto {
  @IsString()
  @IsNotEmpty()
  host: string;

  @IsInt()
  @Min(1)
  @Max(65535)
  port: number;

  @IsString()
  @IsIn(['HTTP', 'HTTPS', 'SOCKS5', 'SOCKS4'])
  type: string;

  @IsString()
  @IsOptional()
  username?: string;

  @IsString()
  @IsOptional()
  password?: string;
}