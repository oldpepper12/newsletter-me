export interface Newsletter {
    subscribe_method: SubscribeMethod;
    parent_url?: string;
}

export interface SubscribeMethod {
    get?: string;
    post?: string;
    body?: string;
    replace_format?: string;
    cookie?: string;
}

export interface NewsletterFile {
    newsletters: Newsletter[];
}
