export type ApiRawResponseContentType = 'application/json' | 'application/xml';

export type ApiRawEventEntity = {
  id: string;
  provider: string;
  endpoint: string;
  requestSignature: string;
  requestedAt: Date;
  statusCode: number | null;
  isSuccess: boolean;
  requestRaw: string;
  responseRaw: string;
  responseContentType: ApiRawResponseContentType;
  baseDate: string;
  baseTime: string;
  nx: number;
  ny: number;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateApiRawEventInput = Omit<
  ApiRawEventEntity,
  'id' | 'createdAt' | 'updatedAt'
>;
