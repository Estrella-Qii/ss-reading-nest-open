export interface PublicDomainBook {
  providerId: string;
  title: string;
  author: string;
  language: string;
  description: string;
  coverUrl?: string;
  textUrl: string;
}

export interface PublicDomainBookProvider {
  readonly id: string;
  search(query: string): Promise<PublicDomainBook[]>;
  downloadText(book: PublicDomainBook): Promise<string>;
}
