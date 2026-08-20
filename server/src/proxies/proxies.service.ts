import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CreateProxyDto } from './dto/proxy.dto';
import { PrismaService } from '../prisma.service';
import axios from 'axios';
import { HttpProxyAgent } from 'http-proxy-agent';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { SocksProxyAgent } from 'socks-proxy-agent';

const TIER1_COUNTRIES = ['US', 'GB', 'DE', 'FR', 'CA', 'JP', 'AU', 'NL', 'SG', 'KR'];

interface ScrapedProxy {
  host: string;
  port: number;
  protocol: string;
  country?: string;
  countryName?: string;
  latency?: number;
  uptime?: number;
  anonymity?: string;
  isp?: string;
}

@Injectable()
export class ProxiesService {
  private readonly logger = new Logger(ProxiesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(createProxyDto: CreateProxyDto, userId: string) {
    const newProxy = await this.prisma.proxy.create({
      data: {
        host: createProxyDto.host,
        port: createProxyDto.port,
        protocol: createProxyDto.type.toLowerCase(),
        username: createProxyDto.username || null,
        password: createProxyDto.password || null,
        status: 'untested',
        userId,
      },
    });

    this.checkProxy(newProxy.id).catch(() => {});
    return this.formatProxy(newProxy);
  }

  async findAll(userId: string) {
    const proxies = await this.prisma.proxy.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return proxies.map(p => this.formatProxy(p));
  }

  async findOne(id: string) {
    const proxy = await this.prisma.proxy.findUnique({ where: { id } });
    if (!proxy) throw new NotFoundException('Proxy server resource not found.');
    return this.formatProxy(proxy);
  }

  async remove(id: string, userId: string): Promise<void> {
    const proxy = await this.prisma.proxy.findFirst({
      where: { id, userId },
    });
    if (!proxy) throw new NotFoundException('Proxy not found');
    await this.prisma.proxy.delete({ where: { id } });
  }

  async update(id: string, dto: Partial<CreateProxyDto>, userId: string) {
    const proxy = await this.prisma.proxy.findFirst({ where: { id, userId } });
    if (!proxy) throw new NotFoundException('Proxy not found');

    const updateData: any = { status: 'untested' };
    if (dto.host !== undefined) updateData.host = dto.host;
    if (dto.port !== undefined) updateData.port = dto.port;
    if (dto.type !== undefined) updateData.protocol = dto.type.toLowerCase();
    if (dto.username !== undefined) updateData.username = dto.username;
    if (dto.password !== undefined) updateData.password = dto.password;

    const updated = await this.prisma.proxy.update({
      where: { id },
      data: updateData,
    });
    return this.formatProxy(updated);
  }

  async findAvailableProxyForAutoAssign(userId: string) {
    const proxy = await this.prisma.proxy.findFirst({
      where: {
        userId,
        status: 'active',
        assignedProfileId: null,
      },
    });
    return proxy ? this.formatProxy(proxy) : null;
  }

  async assignToProfile(proxyId: string, profileId: string) {
    const proxy = await this.prisma.proxy.findUnique({ where: { id: proxyId } });
    if (!proxy) throw new NotFoundException('Proxy not found');

    const updated = await this.prisma.proxy.update({
      where: { id: proxyId },
      data: { assignedProfileId: profileId },
    });
    return this.formatProxy(updated);
  }

  async unassignFromProfile(proxyId: string) {
    const proxy = await this.prisma.proxy.findUnique({ where: { id: proxyId } });
    if (!proxy) throw new NotFoundException('Proxy not found');

    const updated = await this.prisma.proxy.update({
      where: { id: proxyId },
      data: { assignedProfileId: null },
    });
    return this.formatProxy(updated);
  }

  async checkProxy(id: string) {
    const proxyRaw = await this.prisma.proxy.findUnique({ where: { id } });
    if (!proxyRaw) throw new NotFoundException('Proxy not found');

    const proxy = this.formatProxy(proxyRaw);
    const { httpAgent, httpsAgent } = this.buildProxyAgent(proxy);

    const startTime = Date.now();
    try {
      const response = await axios.get('https://ipapi.co/json/', {
        httpAgent,
        httpsAgent,
        timeout: 8000,
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      });

      const latency = Date.now() - startTime;
      const updated = await this.prisma.proxy.update({
        where: { id },
        data: {
          status: 'active',
          latency,
          lastChecked: new Date(),
          ip: response.data.ip,
          country: response.data.country,
          countryName: response.data.country_name,
        },
      });
      return this.formatProxy(updated);
    } catch {
      const updated = await this.prisma.proxy.update({
        where: { id },
        data: {
          status: 'dead',
          latency: null,
          lastChecked: new Date(),
        },
      });
      return this.formatProxy(updated);
    }
  }

  async scrapeFreeProxies(
    userId: string,
    countries: string[] = TIER1_COUNTRIES,
  ): Promise<{ added: number; checked: number; sources: string[] }> {
    const allCandidates: ScrapedProxy[] = [];
    const sourcesUsed: string[] = [];

    const protocols: Array<'http' | 'socks5'> = ['http', 'socks5'];

    for (const country of countries) {
      for (const protocol of protocols) {
        try {
          const countryParam = country.toLowerCase();
          const url = `https://api.proxyscrape.com/v4/free-proxy-list/get?request=display_proxies&protocol=${protocol}&proxy_format=protocolipport&format=json&country=${countryParam}&timeout=5000`;
          const res = await axios.get(url, { timeout: 8000 });
          if (res.status === 200 && Array.isArray(res.data)) {
            for (const entry of res.data) {
              if (entry && entry.ip && entry.port) {
                allCandidates.push({
                  host: entry.ip,
                  port: parseInt(entry.port) || 0,
                  protocol: entry.protocol || protocol,
                  country: country,
                  latency: entry.ping ? parseInt(entry.ping) : undefined,
                  uptime: entry.uptime ? parseFloat(entry.uptime) : undefined,
                  anonymity: entry.anonymity || undefined,
                  isp: entry.isp || undefined,
                });
              }
            }
            if (res.data.length > 0 && !sourcesUsed.includes('proxyscrape')) {
              sourcesUsed.push('proxyscrape');
            }
          }
        } catch {}
      }
    }

    for (const country of countries) {
      try {
        const url = `https://proxylist.geonode.com/api/proxy-list?limit=100&page=1&sort_by=lastChecked&sort_type=desc&protocols=http,socks5&country=${country}&speed=fast`;
        const res = await axios.get(url, {
          timeout: 8000,
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
          },
        });
        if (res.status === 200 && res.data && Array.isArray(res.data.data)) {
          for (const entry of res.data.data) {
            if (entry && entry.ip && entry.port) {
              const proto = Array.isArray(entry.protocols)
                ? entry.protocols[0]
                : 'http';
              allCandidates.push({
                host: entry.ip,
                port: parseInt(entry.port) || 0,
                protocol: proto.includes('socks') ? 'socks5' : 'http',
                country: country,
                countryName: entry.country || country,
                latency: entry.speed ? parseInt(entry.speed) : undefined,
                uptime: entry.uptime ? parseFloat(entry.uptime) : undefined,
                anonymity: entry.anonymityLevel || undefined,
                isp: entry.isp || undefined,
              });
            }
          }
          if (res.data.data.length > 0 && !sourcesUsed.includes('geonode')) {
            sourcesUsed.push('geonode');
          }
        }
      } catch {}
    }

    for (const country of countries) {
      try {
        const url = `https://raw.githubusercontent.com/iplocate/free-proxy-list/main/countries/${country}/proxies.txt`;
        const res = await axios.get(url, {
          timeout: 8000,
          headers: { 'User-Agent': 'Mozilla/5.0' },
        });
        if (res.status === 200 && typeof res.data === 'string') {
          const lines = res.data.split('\n').map((l: string) => l.trim()).filter(Boolean);
          for (const line of lines) {
            const parsed = this.parseProxyLine(line);
            if (parsed) {
              parsed.country = country;
              allCandidates.push(parsed);
            }
          }
          if (lines.length > 0 && !sourcesUsed.includes('iplocate')) {
            sourcesUsed.push('iplocate');
          }
        }
      } catch {}
    }

    const seen = new Set<string>();
    const deduped: ScrapedProxy[] = [];
    for (const p of allCandidates) {
      const key = `${p.host}:${p.port}`;
      if (seen.has(key)) continue;
      if (!p.host || !p.port || p.port < 1 || p.port > 65535) continue;
      seen.add(key);
      deduped.push(p);
    }

    const scored = deduped
      .map(p => ({ ...p, score: this.proxyScore(p) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 50);

    let added = 0;
    let checked = 0;
    for (const candidate of scored) {
      checked++;
      try {
        const result = await this.validateAndAddProxy(candidate, userId);
        if (result) added++;
      } catch {}
    }

    this.logger.log(
      `Scrape complete: ${added} added, ${checked} checked from sources [${sourcesUsed.join(', ')}]`,
    );

    return { added, checked, sources: sourcesUsed };
  }

  private proxyScore(proxy: ScrapedProxy): number {
    let score = 0;

    if (proxy.latency !== undefined && proxy.latency < 500) {
      score += 30;
    } else if (proxy.latency !== undefined && proxy.latency < 1000) {
      score += 15;
    }

    if (proxy.uptime !== undefined && proxy.uptime >= 90) {
      score += 25;
    } else if (proxy.uptime !== undefined && proxy.uptime >= 70) {
      score += 10;
    }

    if (proxy.country && TIER1_COUNTRIES.includes(proxy.country)) {
      score += 20;
    }

    if (proxy.anonymity) {
      const anonLower = proxy.anonymity.toLowerCase();
      if (anonLower.includes('elite') || anonLower.includes('high')) {
        score += 10;
      } else if (anonLower.includes('anonymous')) {
        score += 5;
      }
    }

    if (proxy.protocol === 'socks5') {
      score += 5;
    }

    return score;
  }

  private async validateAndAddProxy(
    candidate: ScrapedProxy,
    userId: string,
  ): Promise<boolean> {
    const existing = await this.prisma.proxy.findFirst({
      where: { host: candidate.host, port: candidate.port, userId },
    });
    if (existing) return false;

    const isAlive = await this.quickProxyCheck(candidate);
    if (!isAlive) return false;

    const newProxy = await this.prisma.proxy.create({
      data: {
        host: candidate.host,
        port: candidate.port,
        protocol: candidate.protocol.toLowerCase(),
        status: 'active',
        latency: candidate.latency || null,
        lastChecked: new Date(),
        country: candidate.country || null,
        countryName: candidate.countryName || null,
        userId,
      },
    });

    return !!newProxy;
  }

  private async quickProxyCheck(proxy: ScrapedProxy): Promise<boolean> {
    try {
      const protocol = proxy.protocol.toLowerCase();
      let agent: any;

      if (protocol.startsWith('socks')) {
        agent = new SocksProxyAgent(`${protocol}://${proxy.host}:${proxy.port}`);
      } else {
        const url = `http://${proxy.host}:${proxy.port}`;
        agent = new HttpProxyAgent(url);
      }

      await axios.get('http://httpbin.org/ip', {
        httpAgent: agent,
        httpsAgent: agent,
        timeout: 6000,
      });
      return true;
    } catch {
      return false;
    }
  }

  private parseProxyLine(line: string): ScrapedProxy | null {
    try {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return null;

      if (trimmed.includes('://')) {
        const url = new URL(trimmed);
        const host = url.hostname;
        const port = parseInt(url.port) || 0;
        const protocol = url.protocol.replace(':', '').toLowerCase();
        if (host && port > 0 && port <= 65535) {
          return { host, port, protocol };
        }
      } else if (trimmed.includes(':')) {
        const parts = trimmed.split(':');
        const host = parts[0].trim();
        const port = parseInt(parts[1]) || 0;
        if (host && port > 0 && port <= 65535) {
          return { host, port, protocol: 'http' };
        }
      }
    } catch {}
    return null;
  }

  private formatProxy(p: any) {
    return {
      id: p.id,
      host: p.host,
      port: p.port,
      type: (p.protocol || 'http').toUpperCase(),
      username: p.username || undefined,
      password: p.password || undefined,
      status: p.status || 'untested',
      latency: p.latency || undefined,
      lastChecked: p.lastChecked || undefined,
      ip: p.ip || undefined,
      country: p.country || undefined,
      countryName: p.countryName || undefined,
      userId: p.userId || undefined,
      assignedProfileId: p.assignedProfileId || undefined,
    };
  }

  private buildProxyAgent(proxy: any): { httpAgent: any; httpsAgent: any } {
    const authString = proxy.username && proxy.password
      ? `${encodeURIComponent(proxy.username)}:${encodeURIComponent(proxy.password)}@`
      : '';

    const protocol = (proxy.type || 'http').toLowerCase();
    const hostPort = `${proxy.host}:${proxy.port}`;

    if (protocol.startsWith('socks')) {
      const agent = new SocksProxyAgent(`${protocol}://${authString}${hostPort}`);
      return { httpAgent: agent, httpsAgent: agent };
    } else {
      const url = `http://${authString}${hostPort}`;
      return {
        httpAgent: new HttpProxyAgent(url),
        httpsAgent: new HttpsProxyAgent(url),
      };
    }
  }
}
