import { MockProvider } from './mock-provider';
import { LocalProvider } from './local-provider';
import { RemoteProvider } from './remote-provider';
import { MetadataProvider } from './types';

// Future-proof: Add 'spotify' | 'applemusic' here later
export type ProviderType = 'mock' | 'local' | 'remote';

export class MetadataService {
    private static instance: MetadataService;
    private providers: Map<ProviderType, MetadataProvider>;
    private currentProviderType: ProviderType = 'remote'; // Default to remote ("All Songs")

    private constructor() {
        this.providers = new Map();
        this.providers.set('mock', new MockProvider());
        this.providers.set('local', new LocalProvider());
        this.providers.set('remote', new RemoteProvider());
    }

    public static getInstance(): MetadataService {
        if (!MetadataService.instance) {
            MetadataService.instance = new MetadataService();
        }
        return MetadataService.instance;
    }

    public setProvider(type: ProviderType) {
        this.currentProviderType = type;
    }

    public getProvider(): MetadataProvider {
        const provider = this.providers.get(this.currentProviderType);
        if (!provider) {
            throw new Error(`Provider ${this.currentProviderType} not found`);
        }
        return provider;
    }
}
