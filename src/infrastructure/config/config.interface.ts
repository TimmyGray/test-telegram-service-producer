import type { Config } from 'config';

export abstract class IConfig
    implements Pick<Config, 'util' | 'get' | 'has'> {
    abstract util: Config['util'];
    abstract get<T>(setting: string): T;
    abstract has(setting: string): boolean;
}